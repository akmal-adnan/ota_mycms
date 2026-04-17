# OTA Manager - Project Overview and Team Runbook

## 1. Executive Summary

OTA Manager is an internal platform for managing Over-The-Air (OTA) mobile bundle releases.

It allows the admin team to upload Android/iOS bundle zip files, activate a target version, and serve update metadata to client apps through signed download URLs. This shortens release cycles compared to store-only release paths and gives the team controlled delivery of bundle updates.

## 2. Business Context

### Problem

- Releasing JavaScript bundles only through app stores slows down bug fixes and feature delivery.
- Teams need version visibility and rollback control.
- Delivery should be secure and isolated per owner.

### Goals

- Enable fast and controlled OTA bundle delivery.
- Keep admin operations simple (create, upload, activate).
- Ensure secure update delivery and payload integrity verification.
- Keep versions tenant-scoped (owner-based isolation).

### Success Criteria

- Admin can publish a new bundle in minutes.
- Client app can fetch current active bundle metadata reliably.
- Signed URLs and checksums are available for each platform.

### Success Criteria Table

| Metric              | Target Outcome                          | Why It Matters                      |
| ------------------- | --------------------------------------- | ----------------------------------- |
| Release lead time   | Minutes, not days                       | Faster bugfix and feature delivery  |
| Update availability | Latest active bundle always retrievable | Predictable app update behavior     |
| Payload trust       | SHA-256 available for each platform     | Integrity verification before apply |

## 3. Scope

### In Scope

- User signup/login/logout for admin dashboard.
- Bundle group CRUD per owner.
- Android/iOS zip upload to Cloudflare R2.
- Mark one bundle version active per owner.
- Update endpoints protected by OTA API key.
- Signed download URLs and SHA-256 hashes in update response.

### Out of Scope (Current)

- Progressive/staged rollout percentages.
- Channel-based release tracks (beta/internal/prod).
- Delta patching.
- Client telemetry and adoption analytics.

### Scope Table

| Area               | In Scope                          | Out of Scope (Current)         |
| ------------------ | --------------------------------- | ------------------------------ |
| Release control    | Create/upload/activate bundles    | Progressive rollout rules      |
| Distribution model | Latest active version per owner   | Multi-channel release strategy |
| Packaging          | Android and iOS zip bundle upload | Delta patch mechanism          |
| Visibility         | Version metadata + checksums      | Built-in adoption analytics    |

## 4. System Architecture

### Components

- Client Admin UI: React + TypeScript + Vite
- Backend API: Express + TypeScript
- Database: MongoDB (Mongoose)
- Object Storage: Cloudflare R2 (AWS SDK v3)

### Architecture Table

| Layer        | Technology                | Responsibility                            |
| ------------ | ------------------------- | ----------------------------------------- |
| Admin UI     | React + TypeScript + Vite | Dashboard for release operations          |
| API          | Express + TypeScript      | Auth, bundle lifecycle, update metadata   |
| Data store   | MongoDB + Mongoose        | Users, bundle groups, active state        |
| Object store | Cloudflare R2             | Bundle file storage and signed URL source |

### High-Level Flow

1. Admin authenticates in dashboard.
2. Admin creates a bundle group and uploads bundle files.
3. Backend stores metadata in MongoDB and files in R2.
4. Admin activates one bundle group version.
5. Mobile client calls update API using `x-ota-key`.
6. Backend returns signed URLs + SHA-256 hashes.

## 5. Authentication and Access Model

There are two different access models by design:

### Admin APIs (`/api/auth`, `/api/bundle-groups`)

- Authentication is JWT-based.
- Token is stored in an HTTP-only cookie (`jwt`).
- Middleware also accepts `Authorization: Bearer <token>`.

### Update Delivery APIs (`/api/updates/*`)

- Access uses `x-ota-key` request header.
- Key resolves the owner account before returning update data.
- Responses are owner-scoped.

## 6. OTA Lifecycle (End-to-End)

1. Sign up or log in from admin UI.
2. Create a new bundle group with `name` and `version`.
3. Upload one or both files:
   - `androidBundle` -> `index.android.bundle.zip`
   - `iosBundle` -> `main.jsbundle.zip`
4. Backend computes and stores SHA-256 for uploaded files.
5. Activate the target version (`isActive: true`).
6. Client app requests latest update using `x-ota-key`.
7. Client receives version, signed download URLs, and checksums.
8. Client downloads bundle and verifies integrity using SHA-256.

## 7. API Summary

Base URL (local): `http://localhost:3001`

### Health

- `GET /` -> basic status
- `GET /health/db` -> DB ping/connectivity status

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/api-key`
- `POST /api/auth/api-key/regenerate`

### Bundle Groups (JWT Required)

- `POST /api/bundle-groups`
- `GET /api/bundle-groups`
- `GET /api/bundle-groups/:id`
- `PATCH /api/bundle-groups/:id`
- `DELETE /api/bundle-groups/:id`
- `POST /api/bundle-groups/:id/upload`

### OTA Updates (`x-ota-key` Required)

- `GET /api/updates/list`
- `GET /api/updates/latest`
- `GET /api/updates/:id`

### API Endpoint Table

| Group         | Method | Endpoint                      | Auth       |
| ------------- | ------ | ----------------------------- | ---------- |
| Health        | GET    | /                             | None       |
| Health        | GET    | /health/db                    | None       |
| Auth          | POST   | /api/auth/signup              | None       |
| Auth          | POST   | /api/auth/login               | None       |
| Auth          | POST   | /api/auth/logout              | JWT cookie |
| Auth          | GET    | /api/auth/me                  | JWT cookie |
| Auth          | GET    | /api/auth/api-key             | JWT cookie |
| Auth          | POST   | /api/auth/api-key/regenerate  | JWT cookie |
| Bundle Groups | POST   | /api/bundle-groups            | JWT cookie |
| Bundle Groups | GET    | /api/bundle-groups            | JWT cookie |
| Bundle Groups | GET    | /api/bundle-groups/:id        | JWT cookie |
| Bundle Groups | PATCH  | /api/bundle-groups/:id        | JWT cookie |
| Bundle Groups | DELETE | /api/bundle-groups/:id        | JWT cookie |
| Bundle Groups | POST   | /api/bundle-groups/:id/upload | JWT cookie |
| Updates       | GET    | /api/updates/list             | x-ota-key  |
| Updates       | GET    | /api/updates/latest           | x-ota-key  |
| Updates       | GET    | /api/updates/:id              | x-ota-key  |

### Typical Update Response

```json
{
  "version": 103,
  "downloadAndroidUrl": "https://...signed-url...",
  "downloadIosUrl": "https://...signed-url...",
  "sha256Android": "...",
  "sha256Ios": "..."
}
```

## 8. Data Model Snapshot

### User

- `email`
- `password` (bcrypt hash)
- `otaApiKey`
- `otaApiKeyCreatedAt`

### BundleGroup

- `name`
- `version` (number)
- `ownerId`
- `androidBundleUrl` / `iosBundleUrl`
- `androidBundleSha256` / `iosBundleSha256`
- `isActive`
- timestamps

### Constraints

- Unique index: `(ownerId, version)`
- One owner can have multiple versions; only one should be active operationally.

### Data Model Table

| Entity           | Key Fields                                                           | Notes                                |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------ |
| User             | email, password hash, otaApiKey, otaApiKeyCreatedAt                  | Auth identity + OTA key ownership    |
| BundleGroup      | ownerId, name, version, isActive                                     | Release unit per owner               |
| Bundle artifacts | androidBundleUrl, iosBundleUrl, androidBundleSha256, iosBundleSha256 | Storage pointer + integrity metadata |

## 9. Security Controls

- `helmet` middleware enabled.
- Cookie-based admin auth with HTTP-only token.
- OTA delivery protected by API key header.
- Signed URLs reduce direct object exposure risk.
- SHA-256 hashes support payload integrity validation.
- CORS credentials enabled; production should define explicit allowed origins.

## 10. Environment Variables

### Server (`server/.env`)

Required and common values:

- `PORT` (default `3001`)
- `MONGO_URI`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` (optional)
- `ALLOWED_ORIGINS` (recommended in production)

Reference template: `server/.env.example`

### Client (`client/.env`)

- `API_TARGET` (Vite proxy target, default `http://localhost:3001`)
- `VITE_API_URL` (optional, for production builds)
- `VITE_DEBUG` (optional)

Reference template: `client/.env.example`

### Environment Variable Table

| Variable             | Location | Required  | Purpose                           |
| -------------------- | -------- | --------- | --------------------------------- |
| PORT                 | server   | No        | API listening port (default 3001) |
| MONGO_URI            | server   | Yes       | MongoDB connection string         |
| JWT_SECRET           | server   | Yes       | JWT signing secret                |
| R2_ACCOUNT_ID        | server   | Yes       | Cloudflare R2 account identifier  |
| R2_ACCESS_KEY_ID     | server   | Yes       | R2 access key                     |
| R2_SECRET_ACCESS_KEY | server   | Yes       | R2 secret key                     |
| R2_BUCKET_NAME       | server   | Yes       | Bucket for OTA bundles            |
| R2_PUBLIC_URL        | server   | No        | Optional public base URL          |
| ALLOWED_ORIGINS      | server   | No        | CORS allow-list for admin UI      |
| API_TARGET           | client   | Yes (dev) | Vite proxy target for /api        |
| VITE_API_URL         | client   | No        | Optional production API base      |
| VITE_DEBUG           | client   | No        | Optional debug flag               |

## 11. Local Development Setup

### Prerequisites

- Node.js >= 18
- Running MongoDB instance
- Cloudflare R2 credentials and bucket

### Start Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### Start Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Client default URL: `http://localhost:5173`

## 12. Operations Runbook

### Publish a New OTA Version

1. Log in to admin dashboard.
2. Create new bundle group with new version number.
3. Upload Android and/or iOS zip bundles.
4. Set target bundle group active.
5. Validate from `/api/updates/latest` using OTA key.

### Rotate OTA API Key

1. Open Settings page.
2. Regenerate API key.
3. Update mobile clients or secure config distribution process.
4. Verify update endpoints with new key.

### Rollback to Previous Version

1. Identify stable previous bundle group.
2. Set previous group `isActive: true`.
3. Confirm `/api/updates/latest` returns expected version.

### Runbook Table

| Operation      | Steps                                                   | Validation                                   |
| -------------- | ------------------------------------------------------- | -------------------------------------------- |
| Publish        | Create version -> Upload bundles -> Activate            | /api/updates/latest returns expected version |
| Rotate OTA key | Regenerate in Settings -> Distribute new key to clients | Update endpoint accepts new x-ota-key        |
| Rollback       | Reactivate previous stable version                      | Latest endpoint returns rollback version     |

## 13. Migration Notes

For legacy deployments, run:

```bash
cd server
npm run migrate:bundle-indexes
npm run migrate:bundle-keys:dry-run
npm run migrate:bundle-keys
```

Use dry-run first to validate migration impact.

## 14. Troubleshooting

### 401 Unauthorized (Admin APIs)

- Check cookie presence and expiry.
- Confirm JWT secret consistency.
- Verify frontend sends credentials (`withCredentials: true`).

### 401 Unauthorized (Update APIs)

- Ensure `x-ota-key` header is present.
- Verify key is valid and active for target owner.

### 404 Not Found on Latest

- No active bundle group exists for owner.
- Activate one bundle group and retry.

### Upload Issues

- Check file size limit (150 MB per file).
- Confirm multipart field names (`androidBundle`, `iosBundle`).
- Validate R2 credentials and bucket access.

## 15. Known Limitations and Risks

- No phased rollout or channel separation yet.
- API key leakage may expose update metadata for that owner.
- No built-in analytics for download/adoption tracking.
- Legacy R2 objects are not auto-cleaned after migration.

## 16. Suggested Next Enhancements

1. Add release channels (prod/beta/internal).
2. Add phased rollout controls.
3. Add audit logging for publish/activate/key rotation.
4. Add metrics dashboard (download counts, active version adoption).
5. Add signed manifest with expiry metadata.

## 17. Ownership and Contact

- Product Owner: (fill by team)
- Backend Owner: (fill by team)
- Frontend Owner: (fill by team)
- Ops/Platform Owner: (fill by team)

## 18. Revision History

- 2026-04-17: Initial Confluence-ready project README created.
- 2026-04-17: Added scan-friendly markdown tables across key sections.
