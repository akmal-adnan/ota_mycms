# OTA Manager Sequence Diagram (Mermaid)

This file provides a copy-ready Mermaid sequence diagram for Confluence pages that support Mermaid rendering.

## Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin User
    participant UI as OTA Admin UI (React)
    participant API as OTA API Server (Express)
    participant DB as MongoDB
    participant R2 as Cloudflare R2
    participant App as Mobile App Client

    Admin->>UI: Login / Signup
    UI->>API: POST /api/auth/login or /signup
    API->>DB: Validate/Create user + issue JWT cookie
    API-->>UI: Auth success + session cookie

    Admin->>UI: Create bundle version
    UI->>API: POST /api/bundle-groups (JWT)
    API->>DB: Insert bundle group
    API-->>UI: Group created

    Admin->>UI: Upload Android/iOS zip files
    UI->>API: POST /api/bundle-groups/:id/upload (multipart)
    API->>R2: Upload bundle objects
    API->>DB: Save R2 keys + SHA-256 hashes
    API-->>UI: Upload result

    Admin->>UI: Activate version
    UI->>API: PATCH /api/bundle-groups/:id { isActive: true }
    API->>DB: Deactivate others + activate target
    API-->>UI: Active version updated

    App->>API: GET /api/updates/latest + x-ota-key
    API->>DB: Resolve owner by otaApiKey + active bundle
    API->>R2: Generate signed URLs
    API-->>App: version + signed URLs + sha256 hashes

    App->>R2: Download bundle via signed URL
    App->>App: Verify SHA-256 before apply
```

## Architecture Flowchart

```mermaid
flowchart LR
  A[Admin User] --> B[OTA Admin UI]
  B --> C[OTA API Server]
  C --> D[(MongoDB)]
  C --> E[(Cloudflare R2)]
  F[Mobile App] --> C
  C --> F
```

## Endpoint Ownership Table

| Endpoint Group     | Auth Mode  | Primary Consumer | Purpose                        |
| ------------------ | ---------- | ---------------- | ------------------------------ |
| /api/auth          | JWT cookie | Admin UI         | Account and session management |
| /api/bundle-groups | JWT cookie | Admin UI         | Version lifecycle and uploads  |
| /api/updates       | x-ota-key  | Mobile App       | OTA metadata and signed URLs   |

## Minimal Request/Response Example

### Request Header

```http
x-ota-key: <owner-ota-api-key>
```

### Response Example

```json
{
  "version": 103,
  "downloadAndroidUrl": "https://...signed-url...",
  "downloadIosUrl": "https://...signed-url...",
  "sha256Android": "...",
  "sha256Ios": "..."
}
```

## Confluence Usage Notes

- If Mermaid macro is available: paste the diagram block directly.
- If Mermaid is not available: export diagram image and embed it in the page.
- Keep endpoint names and auth notes visible near the diagram for cross-team clarity.

## Rollout Focus Chart

```mermaid
pie title Delivery Focus Areas
  "Release Flow" : 45
  "Security Controls" : 35
  "Observability" : 20
```

## Last Updated

- 2026-04-17
