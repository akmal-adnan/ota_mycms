# OTA CMS Backend Server

Express + TypeScript backend for OTA bundle management.

This server provides:

- User account auth (signup/login/logout)
- Per-user bundle group CRUD and file uploads
- Per-user OTA API key management
- Signed R2 download URLs for update delivery

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

| Script                                | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `npm run dev`                         | Start server in watch mode using `tsx`.    |
| `npm run build`                       | Compile TypeScript to `dist/`.             |
| `npm start`                           | Run compiled server from `dist/index.js`.  |
| `npm run migrate:bundle-indexes`      | Apply owner-scoped bundle index migration. |
| `npm run migrate:bundle-keys:dry-run` | Preview legacy R2 key migration changes.   |
| `npm run migrate:bundle-keys`         | Apply legacy R2 key migration changes.     |

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

- `POST /api/auth/signup` creates a user and returns that user OTA API key.
- `POST /api/auth/login` validates credentials and sets an httpOnly `jwt` cookie.
- Auth middleware accepts token from either:
  - Cookie: `jwt`
  - Header: `Authorization: Bearer <token>`
- Protected admin routes are scoped to the authenticated user (`ownerId`).

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

| Method | Path                           | Auth | Description                                |
| ------ | ------------------------------ | ---- | ------------------------------------------ |
| `POST` | `/api/auth/signup`             | No   | Create account, set cookie, return API key |
| `POST` | `/api/auth/login`              | No   | Login, set cookie                          |
| `POST` | `/api/auth/logout`             | No   | Clear auth cookie                          |
| `GET`  | `/api/auth/me`                 | JWT  | Current user info                          |
| `GET`  | `/api/auth/api-key`            | JWT  | API key preview + creation timestamp       |
| `POST` | `/api/auth/api-key/regenerate` | JWT  | Rotate and return a new OTA API key        |

### Bundle Groups (owner-scoped)

All routes below require JWT auth.

| Method   | Path                            | Description                        |
| -------- | ------------------------------- | ---------------------------------- |
| `POST`   | `/api/bundle-groups`            | Create bundle group                |
| `GET`    | `/api/bundle-groups`            | List current user bundle groups    |
| `GET`    | `/api/bundle-groups/:id`        | Get one bundle group               |
| `PATCH`  | `/api/bundle-groups/:id`        | Update `name` and/or `isActive`    |
| `DELETE` | `/api/bundle-groups/:id`        | Delete bundle group and R2 objects |
| `POST`   | `/api/bundle-groups/:id/upload` | Upload Android/iOS zip files       |

Upload fields:

- `androidBundle` -> stored at `ota/<ownerId>/<version>/index.android.bundle.zip`
- `iosBundle` -> stored at `ota/<ownerId>/<version>/main.jsbundle.zip`

Notes:

- Max upload size is `150 MB` per file.
- Upload computes and stores SHA-256 checksums for each uploaded bundle.
- Setting `isActive: true` deactivates other groups owned by the same user.

### Updates (client delivery)

All update routes require the `x-ota-key` header.

```http
x-ota-key: <user-ota-api-key>
```

| Method | Path                  | Description                                        |
| ------ | --------------------- | -------------------------------------------------- |
| `GET`  | `/api/updates/list`   | List bundles (owner-scoped) with signed URLs       |
| `GET`  | `/api/updates/latest` | Active bundle metadata with signed URLs and hashes |
| `GET`  | `/api/updates/:id`    | Bundle metadata by ID with signed URLs and hashes  |

Response shape for `latest`/`:id`:

```json
{
  "version": 103,
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

## Example Flow

1. Sign up via `POST /api/auth/signup`.
2. Save returned `otaApiKey` securely.
3. Login via `POST /api/auth/login` (cookie session starts).
4. Create group via `POST /api/bundle-groups`.
5. Upload files via `POST /api/bundle-groups/:id/upload`.
6. Activate via `PATCH /api/bundle-groups/:id` with `{ "isActive": true }`.
7. Client checks `GET /api/updates/latest` with `x-ota-key`.

## Migration for Legacy Bundle Keys

For existing deployments, run index migration first, then key migration.

1. Align DB indexes with owner-scoped version uniqueness:

```bash
npm run migrate:bundle-indexes
```

2. If existing records still point to legacy keys in `ota/<version>/...`, run key migration
   to copy objects into owner-scoped keys and update DB records.

3. Dry-run key migration:

```bash
npm run migrate:bundle-keys:dry-run
```

4. Apply key migration:

```bash
npm run migrate:bundle-keys
```

Notes:

- Migration is idempotent for already-migrated records.
- Existing legacy objects are not deleted automatically.
