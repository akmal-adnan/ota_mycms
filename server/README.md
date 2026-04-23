# OTA CMS Backend Server

Express + TypeScript backend for OTA bundle management.

This server provides:

- User account auth (signup/login/logout)
- Per-project bundle management with draft/released workflow
- Per-project OTA API keys (multiple keys per project)
- Release grouping by target app version
- Signed R2 download URLs for update delivery

## Refactor Status

The server has been refactored from a user-scoped bundle-group model to a project-based model:

- **Old model**: One OTA key per user, bundles owned at user level
- **New model**: Multiple OTA keys per project, bundles organized within projects with draft/released states
- **Breaking changes**: `/api/bundle-groups` removed; use `/api/projects` instead. Legacy `x-ota-key` format changes from user-level to project-level lookup
- **Migration required**: Run `npm run migrate:project-refactor:dry-run` then `npm run migrate:project-refactor` to convert existing users/bundles to projects

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- JWT + httpOnly cookie auth
- Multer
- Cloudflare R2 via AWS SDK v3

## Project Structure

```text
server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
```

## Quick Start

1. Install dependencies:

```bash
cd server
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start in development:

```bash
npm run dev
```

4. Build and run production:

```bash
npm run build
npm start
```

Default port is `3001`.

## NPM Scripts

| Script                                     | Description                                     |
| ------------------------------------------ | ----------------------------------------------- |
| `npm run dev`                              | Start server in watch mode using `tsx`.         |
| `npm run build`                            | Compile TypeScript to `dist/`.                  |
| `npm start`                                | Run compiled server from `dist/index.js`.       |
| `npm run migrate:bundle-indexes`           | Apply owner-scoped bundle index migration.      |
| `npm run migrate:bundle-keys:dry-run`      | Preview legacy R2 key migration changes.        |
| `npm run migrate:bundle-keys`              | Apply legacy R2 key migration changes.          |
| `npm run migrate:project-refactor:dry-run` | Preview project refactor migration (see below). |
| `npm run migrate:project-refactor`         | Apply project refactor migration.               |

## Environment Variables

| Variable               | Required | Description                                      |
| ---------------------- | -------- | ------------------------------------------------ |
| `PORT`                 | No       | HTTP port (default: `3001`).                     |
| `MONGO_URI`            | Yes      | MongoDB connection string.                       |
| `JWT_SECRET`           | Yes      | Secret used to sign JWT tokens.                  |
| `R2_ACCOUNT_ID`        | Yes      | Cloudflare R2 account ID.                        |
| `R2_ACCESS_KEY_ID`     | Yes      | R2 access key ID.                                |
| `R2_SECRET_ACCESS_KEY` | Yes      | R2 secret access key.                            |
| `R2_BUCKET_NAME`       | Yes      | Bucket name where bundles are stored.            |
| `R2_PUBLIC_URL`        | No       | Optional public URL (not required by this code). |
| `ALLOWED_ORIGINS`      | No       | Comma-separated CORS allow-list for admin UI.    |

Notes:

- If `ALLOWED_ORIGINS` is empty, CORS allows all origins (origin reflection mode).
- CORS credentials are enabled, so set `ALLOWED_ORIGINS` explicitly in production.

## Authentication Model

- `POST /api/auth/signup` creates a user account (no OTA key returned). First project and keys must be created via the admin panel.
- `POST /api/auth/login` validates credentials and sets an httpOnly `jwt` cookie.
- Admin routes: Auth middleware accepts token from either:
  - Cookie: `jwt`
  - Header: `Authorization: Bearer <token>`
- OTA routes: Use `x-ota-key` header with a project-scoped API key (not a user-level key).

## API Overview

Base URL in local development examples:

```text
http://localhost:3001
```

### Health

| Method | Path         | Auth | Description                    |
| ------ | ------------ | ---- | ------------------------------ |
| `GET`  | `/`          | No   | Basic server status            |
| `GET`  | `/health/db` | No   | Mongo connection + ping status |

### Auth

| Method | Path               | Auth | Description       |
| ------ | ------------------ | ---- | ----------------- |
| `POST` | `/api/auth/signup` | No   | Create account    |
| `POST` | `/api/auth/login`  | No   | Login, set cookie |
| `POST` | `/api/auth/logout` | No   | Clear auth cookie |
| `GET`  | `/api/auth/me`     | JWT  | Current user info |

### Projects (admin, JWT required)

| Method   | Path                       | Description                                   |
| -------- | -------------------------- | --------------------------------------------- |
| `GET`    | `/api/projects`            | List projects owned by user                   |
| `POST`   | `/api/projects`            | Create a new project                          |
| `GET`    | `/api/projects/:projectId` | Get one project                               |
| `PATCH`  | `/api/projects/:projectId` | Update project name                           |
| `DELETE` | `/api/projects/:projectId` | Delete project and all bundles (+ cleanup R2) |

### Project API Keys (admin, JWT required)

| Method   | Path                                       | Description                      |
| -------- | ------------------------------------------ | -------------------------------- |
| `GET`    | `/api/projects/:projectId/api-keys`        | List API keys for project        |
| `POST`   | `/api/projects/:projectId/api-keys`        | Create a new API key for project |
| `DELETE` | `/api/projects/:projectId/api-keys/:keyId` | Delete an API key                |

Create response includes the full key (shown once):

```json
{
  "_id": "...",
  "label": "staging",
  "key": "...",
  "createdAt": "2026-04-23T...",
  "updatedAt": "2026-04-23T..."
}
```

List response masks the key:

```json
[
  {
    "_id": "...",
    "label": "staging",
    "keyPreview": "****...abcd",
    "createdAt": "2026-04-23T...",
    "updatedAt": "2026-04-23T..."
  }
]
```

### Bundles (admin, JWT required)

| Method   | Path                                                 | Description                       |
| -------- | ---------------------------------------------------- | --------------------------------- |
| `GET`    | `/api/projects/:projectId/bundles`                   | List bundles (all statuses)       |
| `POST`   | `/api/projects/:projectId/bundles`                   | Create a new bundle (draft)       |
| `GET`    | `/api/projects/:projectId/bundles/:bundleId`         | Get one bundle                    |
| `PATCH`  | `/api/projects/:projectId/bundles/:bundleId`         | Update bundle metadata            |
| `DELETE` | `/api/projects/:projectId/bundles/:bundleId`         | Delete bundle (draft only)        |
| `POST`   | `/api/projects/:projectId/bundles/:bundleId/upload`  | Upload Android/iOS files          |
| `POST`   | `/api/projects/:projectId/bundles/:bundleId/release` | Release bundle (mark as released) |

Upload fields (form multipart):

- `androidBundle` → stored at `ota/<ownerId>/<projectId>/<bundleId>/index.android.bundle.zip`
- `iosBundle` → stored at `ota/<ownerId>/<projectId>/<bundleId>/main.jsbundle.zip`

Max upload size: `150 MB` per file.

Bundle status transitions:

- `draft` (default after create) → `released` (via release action)
- `released` bundles can only have metadata (title, description) updated
- Only `draft` bundles can be deleted
- Only `released` bundles appear in OTA endpoints

### Releases (admin, JWT required)

| Method  | Path                                                  | Description                                       |
| ------- | ----------------------------------------------------- | ------------------------------------------------- |
| `GET`   | `/api/projects/:projectId/releases`                   | List release groups (grouped by targetAppVersion) |
| `GET`   | `/api/projects/:projectId/releases/:targetAppVersion` | Get one release group                             |
| `PATCH` | `/api/projects/:projectId/releases/:bundleId/toggle`  | Activate/deactivate a released bundle             |

Release group response:

```json
{
  "targetAppVersion": "1.0.0",
  "bundles": [
    { "_id": "...", "name": "...", "bundleVersion": "100", "isActive": true, "status": "released", ... }
  ]
}
```

Active-release logic:

- Only one released bundle per project + targetAppVersion can be active at a time
- Activating a bundle deactivates others in the same (projectId, targetAppVersion)

### Updates (OTA client delivery, x-ota-key required)

Header:

```http
x-ota-key: <project-api-key>
```

| Method | Path                     | Description                                                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/updates/list`      | List released bundles (project-scoped) with signed URLs                                          |
| `GET`  | `/api/updates/latest`    | Active released bundle with signed URLs and hashes; optional `?targetAppVersion=X.X.X` to filter |
| `GET`  | `/api/updates/:bundleId` | Bundle metadata by ID with signed URLs and hashes (released only)                                |

Response shape for `latest`/`:bundleId`:

```json
{
  "version": "100",
  "targetAppVersion": "1.0.0",
  "downloadAndroidUrl": "https://...signed-url...",
  "downloadIosUrl": "https://...signed-url...",
  "sha256Android": "...",
  "sha256Ios": "..."
}
```

## Common Error Responses

Typical error body:

```json
{
  "error": "Message here"
}
```

Possible auth-related responses include:

- `401 {"error":"No token provided"}`
- `401 {"error":"Invalid token"}`
- `401 {"error":"Missing x-ota-key header"}`
- `401 {"error":"Invalid API key"}`
- `401 {"error":"Project scope missing for OTA request"}`
- `404 {"error":"Project not found"}`
- `404 {"error":"Bundle not found"}`
- `409 {"error":"Project name already exists"}`
- `409 {"error":"bundleVersion already exists in this project"}`

Unhandled server errors:

```json
{
  "error": "Internal server error"
}
```

## Operational Notes

- Security middleware is enabled via `helmet`.
- HTTP request logs are produced with `pino-http`.
- The server handles `SIGINT` and `SIGTERM` for graceful shutdown.

## Migration from Legacy Bundle Groups to Projects

**IMPORTANT**: Run the migration scripts in the correct order. The project refactor migration depends on existing bundle-group data and indexes.

### Prerequisites

1. Ensure all users and bundle groups are created with the old system.
2. If you have not yet run `migrate:bundle-keys`, do so first:

```bash
npm run migrate:bundle-indexes
npm run migrate:bundle-keys:dry-run
npm run migrate:bundle-keys
```

### Project Refactor Migration

This migration converts each user into a project owner with:

- One default project named "Migrated Project" per user
- One OTA API key per project (using the user's legacy key if available)
- All bundle groups converted to released bundles within the project
- R2 objects re-keyed from `ota/<ownerId>/<bundleVersion>/...` to `ota/<ownerId>/<projectId>/<bundleId>/...`

1. Dry-run to see changes:

```bash
npm run migrate:project-refactor:dry-run
```

2. Review the output (projects created, bundles created, objects to be copied, etc.).

3. Apply the migration:

```bash
npm run migrate:project-refactor
```

4. Verify the migration:
   - Log in to the admin UI and confirm projects exist for each user.
   - Confirm API keys are visible under each project.
   - Confirm bundles appear in bundle lists within projects.
   - Test OTA endpoint with a migrated project's API key.

### Post-Migration

After a successful migration:

- Legacy `/api/bundle-groups` routes are no longer available; clients must use `/api/projects/*` instead.
- OTA keys are now project-scoped (previously user-scoped); mobile clients must be updated to use the new project API key format.
- Legacy bundle-group records remain in the database for audit purposes but are not used by the server.
- Legacy R2 objects in `ota/<version>/...` and `ota/<ownerId>/<version>/...` paths remain but are not referenced; you may delete them manually to save storage.

### Rollback

If the migration fails or you need to rollback:

1. Restore your database backup.
2. Restore your R2 objects from backup.
3. Clear the new `projects`, `bundles`, and `projectapikeys` collections if they were partially created.
4. Investigate the failure logs and retry.

## Operational Notes (Legacy)
