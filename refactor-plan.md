# Plan: Dashboard System Refactor

## TL;DR

Refactor the OTA CMS from a flat bundle-group system into a project-based architecture with collapsible sidebar navigation, per-project API keys, a bundle manager with draft/release workflow, and a release page with target-version grouping. Client-first, then backend.

## Decisions

- **Sidebar**: Collapsible (icon-only when collapsed), not a drawer
- **API keys**: Multiple per project, each with a custom label type; add/remove individually
- **Target ID**: = target app version string (e.g., "1.0.0")
- **In-project nav**: Side menu sub-items under active project (Bundles, Releases, API Keys)
- **Settings page**: Keeps account/profile info only; API key management moves to project scope
- **Architecture style**: Flat structure, CSS modules, same patterns as existing codebase (Zustand + TanStack Query + Axios + Radix primitives + lucide-react icons)
- **Breaking change**: `x-ota-key` will now scope to project instead of user; existing BundleGroup data needs migration

---

## Phase 1: Client UI/UX Refactor

### Step 1.1 — Types (client/src/types/index.ts)

Add new types, keep old ones until migration is complete:

- `Project { _id, name, ownerId, apiKeys: ApiKeyEntry[], createdAt, updatedAt }`
- `ApiKeyEntry { _id, key, label, createdAt }`
- `Bundle { _id, projectId, name, title, description, targetAppVersion, bundleVersion, androidBundleUrl, iosBundleUrl, androidBundleSha256, iosBundleSha256, status: 'draft' | 'released', isActive, createdAt, updatedAt }`
- `ReleaseGroup { targetAppVersion: string, bundles: Bundle[] }` (client-side grouping)
- Keep existing `LoginResponse`, `SignupResponse`, `MeResponse` unchanged
- Remove `otaApiKey` from `SignupResponse` (signup no longer returns a key)
- Remove `ApiKeyInfo`, `ApiKeyRegenerateResponse` (global key removed)

### Step 1.2 — API Layer

**New file** `client/src/api/projects.ts`:

- `fetchProjects()` → GET `/api/projects`
- `fetchProject(projectId)` → GET `/api/projects/:projectId`
- `createProject(name)` → POST `/api/projects`
- `updateProject(projectId, { name })` → PATCH `/api/projects/:projectId`
- `deleteProject(projectId)` → DELETE `/api/projects/:projectId`
- `addApiKey(projectId, label)` → POST `/api/projects/:projectId/api-keys`
- `removeApiKey(projectId, keyId)` → DELETE `/api/projects/:projectId/api-keys/:keyId`

**New file** `client/src/api/bundles.ts`:

- `fetchBundles(projectId)` → GET `/api/projects/:projectId/bundles`
- `fetchBundle(projectId, bundleId)` → GET `/api/projects/:projectId/bundles/:bundleId`
- `createBundle(projectId, data)` → POST `/api/projects/:projectId/bundles`
- `updateBundle(projectId, bundleId, data)` → PATCH `/api/projects/:projectId/bundles/:bundleId`
- `deleteBundle(projectId, bundleId)` → DELETE `/api/projects/:projectId/bundles/:bundleId`
- `uploadBundleFiles(projectId, bundleId, formData)` → POST `/api/projects/:projectId/bundles/:bundleId/upload`
- `releaseBundle(projectId, bundleId)` → POST `/api/projects/:projectId/bundles/:bundleId/release`
- `fetchReleases(projectId)` → GET `/api/projects/:projectId/releases`
- `toggleReleaseBundle(projectId, bundleId, isActive)` → PATCH `/api/projects/:projectId/releases/:bundleId/toggle`

**Modify** `client/src/api/auth.ts`:

- Remove `getApiKeyApi()` and `regenerateApiKeyApi()`
- Remove `otaApiKey` from signup response handling

**Remove** `client/src/api/bundleGroups.ts` (replaced by bundles.ts)

### Step 1.3 — Query Client & Hooks

**Modify** `client/src/lib/queryClient.ts` — new query keys:

```
projects: ['projects']
project: (id) => ['projects', id]
bundles: (projectId) => ['projects', projectId, 'bundles']
bundle: (projectId, bundleId) => ['projects', projectId, 'bundles', bundleId]
releases: (projectId) => ['projects', projectId, 'releases']
apiKeys: (projectId) => ['projects', projectId, 'api-keys']
```

**New file** `client/src/hooks/useProjects.ts`:

- `useProjects()` — list query
- `useProject(id)` — single query
- `useCreateProject()` — mutation with optimistic update
- `useUpdateProject()` — mutation with optimistic update
- `useDeleteProject()` — mutation with optimistic update

**New file** `client/src/hooks/useBundles.ts`:

- `useBundles(projectId)` — list query
- `useBundle(projectId, bundleId)` — single query
- `useCreateBundle()` — mutation
- `useUpdateBundle()` — mutation
- `useDeleteBundle()` — mutation
- `useUploadBundleFiles()` — mutation
- `useReleaseBundle()` — mutation

**New file** `client/src/hooks/useApiKeys.ts`:

- `useApiKeys(projectId)` — derived from `useProject(id).data.apiKeys`
- `useAddApiKey()` — mutation
- `useRemoveApiKey()` — mutation

**New file** `client/src/hooks/useReleases.ts`:

- `useReleases(projectId)` — query
- `useToggleReleaseBundle()` — mutation

**Remove** `client/src/hooks/useBundleGroups.ts`

### Step 1.4 — Layout & Sidebar

**New file** `client/src/components/Sidebar/index.tsx` + `Sidebar.module.css`:

- Collapsible sidebar: expanded (icon + text) ↔ collapsed (icon only with tooltip)
- Collapse toggle button at bottom or top
- Top section: "Projects" link (always visible, navigates to `/`)
- Project section (visible when URL matches `/projects/:projectId/*`): extract `projectId` from `useParams`, show project name as section header, sub-items: Bundles, Releases, API Keys with active state from `useLocation`
- Bottom section: "Settings" link
- Icons: `FolderKanban` (projects), `Package` (bundles), `Rocket` (releases), `Key` (API keys), `Settings` (settings)
- Store collapsed state in `localStorage` via a small Zustand store or local state

**Modify** `client/src/components/Layout/index.tsx` + `Layout.module.css`:

- Remove nav links from header (moved to sidebar)
- Header becomes a thin top bar: left = sidebar collapse toggle + logo, right = user avatar (initials) + email/name + dropdown menu (Settings, Sign out)
- Body = sidebar (left) + main content area (right, scrollable, contains `<Outlet />`)
- Responsive: sidebar auto-collapses at ≤768px, overlay mode on mobile

### Step 1.5 — Routing

**Modify** `client/src/navigation/routes.tsx`:

```
/login → LoginPage
/ → ProjectsPage (inside ProtectedRoute > Layout)
/projects/:projectId → redirect to /projects/:projectId/bundles
/projects/:projectId/bundles → BundleListPage
/projects/:projectId/bundles/new → BundleManagerPage (create)
/projects/:projectId/bundles/:bundleId → BundleManagerPage (edit)
/projects/:projectId/releases → ReleasesPage
/projects/:projectId/releases/:targetVersion → ReleaseDetailPage
/projects/:projectId/api-keys → ApiKeysPage
/settings → SettingsPage
* → redirect to /
```

### Step 1.6 — Pages

**New** `client/src/pages/ProjectsPage/index.tsx` + `.module.css`:

- Replaces DashboardPage as the home page
- Header: "Projects" title + "New Project" button
- Project list as cards or table rows: project name, created date, bundle count summary
- Click project → navigate to `/projects/:projectId/bundles`
- Create project inline form or modal (just name field)
- Delete project via dropdown menu with confirmation modal

**New** `client/src/pages/BundleListPage/index.tsx` + `.module.css`:

- Shows inside project context (sidebar has project sub-nav)
- Header: project name + "New Bundle" button
- Table/list: name, bundle version, target app version, status badge (draft/released), isActive toggle (for released only)
- Click row → navigate to `/projects/:projectId/bundles/:bundleId`
- Inline actions: delete (draft only)

**New** `client/src/pages/BundleManagerPage/index.tsx` + `.module.css`:

- Replaces GroupDetailPage
- Breadcrumb: Project Name > Bundles > [Bundle Name or "New Bundle"]
- Form fields: name, title, description (textarea), target app version, bundle version
- File upload section (reuse drag-drop pattern from existing GroupDetailPage): Android + iOS zones
- Action buttons: "Save as Draft", "Release" (with confirmation modal)
- If editing existing released bundle: fields are read-only except file re-upload and description
- Delete button (draft only)

**New** `client/src/pages/ReleasesPage/index.tsx` + `.module.css`:

- Header: "Releases" title
- List of target app version groups as cards/rows: target version string, count of released bundles
- Click → navigate to `/projects/:projectId/releases/:targetVersion`
- Auto-grouped on client from released bundles (or server returns pre-grouped)

**New** `client/src/pages/ReleaseDetailPage/index.tsx` + `.module.css`:

- Breadcrumb: Releases > Target Version X.X.X
- List of released bundles for that target version: bundle version, title, status badge, isActive toggle
- Click to view bundle details (expandable row or modal, NOT navigate to manager)
- Detail view shows: description, title, bundle version, file status, created/updated dates
- Toggle activate/deactivate (no delete)

**New** `client/src/pages/ApiKeysPage/index.tsx` + `.module.css`:

- Header: "API Keys" title + "Add Key" button
- List of API keys: label, key preview (masked), created date
- Add key form: label input (free text, e.g., "staging", "production")
- On creation: show full key once (modal with copy button, same pattern as current SettingsPage key reveal)
- Remove key: confirmation modal, then delete

**Modify** `client/src/pages/SettingsPage/index.tsx`:

- Remove API key management section
- Keep/add: account info (email), potentially change password, sign out

**Remove** `client/src/pages/DashboardPage/` (replaced by ProjectsPage)
**Remove** `client/src/pages/GroupDetailPage/` (replaced by BundleManagerPage)

### Step 1.7 — Skeleton & Loading States

**Modify** `client/src/components/Skeleton/index.tsx`:

- Replace `DashboardTableSkeleton` with `ProjectsPageSkeleton`
- Replace `GroupDetailSkeleton` with `BundleManagerSkeleton`
- Add `BundleListSkeleton`, `ReleasesPageSkeleton`
- Remove `SettingsKeySkeleton` or repurpose for ApiKeysPage

### Step 1.8 — Auth Flow Update

**Modify** `client/src/hooks/useAuth.ts`:

- `handleSignup` no longer returns an API key (keys are now per-project, created after project creation)

**Modify** `client/src/pages/LoginPage/index.tsx`:

- Remove API key reveal screen on signup success — just log in and redirect to projects page

---

## Phase 2: Backend API Changes

### Step 2.1 — New Models

**New file** `server/src/models/Project.ts`:

- Schema: `name` (String, required, trim), `ownerId` (ObjectId, ref User, required), `apiKeys` (subdocument array: `key` String required, `label` String required trim, `createdAt` Date default now)
- Indexes: `(ownerId, 1)`, unique sparse on `apiKeys.key`

**New file** `server/src/models/Bundle.ts` (replaces BundleGroup.ts):

- Schema: `projectId` (ObjectId, ref Project, required), `ownerId` (ObjectId, ref User, required), `name` (String, required, trim), `title` (String, default ''), `description` (String, default ''), `targetAppVersion` (String, required, trim), `bundleVersion` (String, required, trim), `androidBundleUrl` (String, default null), `iosBundleUrl` (String, default null), `androidBundleSha256` (String, default null), `iosBundleSha256` (String, default null), `status` (String, enum ['draft', 'released'], default 'draft'), `isActive` (Boolean, default false)
- Indexes: `(projectId, bundleVersion)` unique, `(projectId, status)`, `(projectId, targetAppVersion)`

**Remove** `server/src/models/BundleGroup.ts`

### Step 2.2 — New Controllers & Routes

**New file** `server/src/controllers/project.controller.ts`:

- `createProject`, `listProjects`, `getProject`, `updateProject`, `deleteProject`
- `addApiKey` (generates `randomBytes(32).toString('hex')`, returns full key once)
- `removeApiKey`
- Delete project cascades: delete all bundles + R2 files

**New file** `server/src/routes/project.routes.ts`:

- All routes under `authMiddleware`
- `POST /` → createProject
- `GET /` → listProjects
- `GET /:projectId` → getProject
- `PATCH /:projectId` → updateProject
- `DELETE /:projectId` → deleteProject
- `POST /:projectId/api-keys` → addApiKey
- `DELETE /:projectId/api-keys/:keyId` → removeApiKey

**New file** `server/src/controllers/bundle.controller.ts` (replaces bundleGroup.controller.ts):

- `createBundle`, `listBundles`, `getBundle`, `updateBundle`, `deleteBundle` (draft only), `uploadFiles`, `releaseBundle`
- R2 key structure: `ota/<ownerId>/<projectId>/<bundleId>/filename`

**New file** `server/src/routes/bundle.routes.ts` (replaces bundleGroup.routes.ts):

- Nested under `/api/projects/:projectId/bundles`
- `POST /`, `GET /`, `GET /:bundleId`, `PATCH /:bundleId`, `DELETE /:bundleId`, `POST /:bundleId/upload`, `POST /:bundleId/release`

**New file** `server/src/controllers/release.controller.ts`:

- `listReleases(projectId)` — fetch released bundles, group by `targetAppVersion` server-side
- `toggleBundle(projectId, bundleId, isActive)` — toggle only (no delete)

**New file** `server/src/routes/release.routes.ts`:

- Nested under `/api/projects/:projectId/releases`
- `GET /` → listReleases
- `PATCH /:bundleId/toggle` → toggleBundle

### Step 2.3 — Updates Middleware & Controller

**Modify** `server/src/middleware/updatesAccess.ts`:

- `x-ota-key` lookup changes: search `Project` collection for matching `apiKeys.key` instead of `User.otaApiKey`
- Set `req.admin = { userId: project.ownerId, projectId: project._id, email: '' }`

**Modify** `server/src/types/express.d.ts`:

- Add `projectId?: string` to `req.admin` interface

**Modify** `server/src/controllers/updates.controller.ts`:

- Query `Bundle` (not BundleGroup) scoped to `req.admin.projectId`
- `getLatestUpdate` — find latest active released bundle in the project
- `listBundles` — list all active released bundles in the project

### Step 2.4 — Auth Controller Cleanup

**Modify** `server/src/controllers/auth.controller.ts`:

- `signup` — no longer generates `otaApiKey` on user (remove from User model or keep for backward compat)
- Remove `getApiKey` and `regenerateApiKey` endpoints

**Modify** `server/src/routes/auth.routes.ts`:

- Remove `/api-key` and `/api-key/regenerate` routes

**Modify** `server/src/models/User.ts`:

- Remove `otaApiKey` and `otaApiKeyCreatedAt` fields (or deprecate)

### Step 2.5 — Wire Up

**Modify** `server/src/index.ts`:

- Replace `bundleGroupRoutes` with `projectRoutes` mounted at `/api/projects`
- Bundle and release routes nested under project routes
- Keep updates routes as-is (path unchanged)

### Step 2.6 — Migration Script (optional, post-refactor)

- `server/src/scripts/migrate-to-projects.ts` — migrate existing BundleGroup data to new Project + Bundle structure
- For each user: create a default project, move bundle groups into it as bundles, migrate R2 keys

---

## Relevant Files

### Client — New

- `client/src/components/Sidebar/index.tsx` + `Sidebar.module.css` — collapsible sidebar component
- `client/src/pages/ProjectsPage/index.tsx` + `.module.css` — home page with project list
- `client/src/pages/BundleListPage/index.tsx` + `.module.css` — bundle list within project
- `client/src/pages/BundleManagerPage/index.tsx` + `.module.css` — bundle create/edit with file upload
- `client/src/pages/ReleasesPage/index.tsx` + `.module.css` — target version group list
- `client/src/pages/ReleaseDetailPage/index.tsx` + `.module.css` — released bundles for a target version
- `client/src/pages/ApiKeysPage/index.tsx` + `.module.css` — per-project API key management
- `client/src/api/projects.ts` — project API functions
- `client/src/api/bundles.ts` — bundle + release API functions
- `client/src/hooks/useProjects.ts` — project TanStack Query hooks
- `client/src/hooks/useBundles.ts` — bundle TanStack Query hooks
- `client/src/hooks/useApiKeys.ts` — API key hooks
- `client/src/hooks/useReleases.ts` — release hooks

### Client — Modify

- `client/src/components/Layout/index.tsx` + `Layout.module.css` — add sidebar, simplify header
- `client/src/navigation/routes.tsx` — new route structure
- `client/src/types/index.ts` — new types (Project, Bundle, ApiKeyEntry, ReleaseGroup)
- `client/src/lib/queryClient.ts` — new query keys
- `client/src/api/auth.ts` — remove API key endpoints
- `client/src/hooks/useAuth.ts` — remove API key return from signup
- `client/src/pages/LoginPage/index.tsx` — remove API key reveal on signup
- `client/src/pages/SettingsPage/index.tsx` — remove API key section
- `client/src/components/Skeleton/index.tsx` — new skeleton presets
- `client/src/styles/global.css` — add sidebar CSS variables, adjust layout grid

### Client — Remove

- `client/src/pages/DashboardPage/` — replaced by ProjectsPage
- `client/src/pages/GroupDetailPage/` — replaced by BundleManagerPage
- `client/src/api/bundleGroups.ts` — replaced by bundles.ts + projects.ts
- `client/src/hooks/useBundleGroups.ts` — replaced by useBundles.ts

### Server — New

- `server/src/models/Project.ts` — Project schema with embedded apiKeys
- `server/src/models/Bundle.ts` — Bundle schema (replaces BundleGroup)
- `server/src/controllers/project.controller.ts` — project + API key CRUD
- `server/src/controllers/bundle.controller.ts` — bundle CRUD + upload + release
- `server/src/controllers/release.controller.ts` — release listing + toggle
- `server/src/routes/project.routes.ts` — project routes
- `server/src/routes/bundle.routes.ts` — bundle routes (nested under project)
- `server/src/routes/release.routes.ts` — release routes (nested under project)

### Server — Modify

- `server/src/index.ts` — mount new routes, remove old bundleGroup routes
- `server/src/middleware/updatesAccess.ts` — lookup project by API key instead of user
- `server/src/controllers/updates.controller.ts` — query Bundle model scoped to projectId
- `server/src/controllers/auth.controller.ts` — remove getApiKey/regenerateApiKey
- `server/src/routes/auth.routes.ts` — remove api-key routes
- `server/src/models/User.ts` — remove otaApiKey fields
- `server/src/types/express.d.ts` — add projectId to req.admin

### Server — Remove

- `server/src/models/BundleGroup.ts` — replaced by Bundle.ts
- `server/src/controllers/bundleGroup.controller.ts` — replaced by bundle.controller.ts
- `server/src/routes/bundleGroup.routes.ts` — replaced by bundle.routes.ts + project.routes.ts

---

## Verification

1. **Client builds clean**: `cd client && npm run build` — no TS errors
2. **Server builds clean**: `cd server && npm run build` — no TS errors
3. **Sidebar behavior**: manually verify collapse/expand, active states, responsive breakpoint
4. **Project CRUD**: create, rename, delete projects; verify list updates
5. **API key flow**: add key → full key shown once → key masked in list → copy works → remove key with confirmation
6. **Bundle CRUD**: create bundle as draft → fill fields → upload files → save draft → release → verify appears in releases
7. **Release grouping**: create 2 bundles with different bundle versions but same target app version → verify single group in releases page → verify both bundles inside
8. **Release toggle**: activate/deactivate bundle in release detail → verify no delete option
9. **Updates API**: call `GET /api/updates/latest` with project API key → returns active released bundle from that project
10. **Auth flow**: signup no longer shows API key → redirects to projects page
11. **Backward compat**: run migration script to verify existing data migrates correctly

## Scope

- **Included**: Full client UI/UX refactor, backend API redesign, new data models, sidebar navigation, project-based architecture, draft/release workflow, target-version grouping
- **Excluded**: Real-time updates/websockets, role-based access control, project sharing between users, bundle diffing/rollback, analytics
