# OTA Manager — Client

A React-based dashboard for managing Over-The-Air (OTA) bundle updates. Upload, version, and distribute Android and iOS bundles through an intuitive dark-themed interface.

## Tech Stack

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Framework        | React 19, TypeScript 6                  |
| Build            | Vite                                    |
| Routing          | React Router 7                          |
| Server State     | TanStack React Query 5                  |
| Client State     | Zustand 5 (persisted auth store)        |
| HTTP             | Axios (cookie-based auth)               |
| UI Primitives    | Radix UI (Dialog, Dropdown, Toast, Tooltip) |
| Icons            | Lucide React                            |
| Styling          | CSS Modules + CSS custom properties     |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- The backend server running on `http://localhost:3001` (or set `API_TARGET`)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (proxies /api → backend)
npm run dev
```

The app starts at **http://localhost:5173** by default.

### Available Scripts

| Script          | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start Vite dev server with HMR     |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build      |
| `npm run lint`  | Run ESLint                         |

## Project Structure

```
src/
├── api/           # HTTP client + API endpoint functions
├── components/    # Reusable UI components
├── hooks/         # Custom hooks (auth, modal, bundle groups)
├── lib/           # Shared library setup (React Query client)
├── navigation/    # Router and route definitions
├── pages/         # Route-level pages
├── stores/        # Zustand state stores
├── styles/        # Global styles and design tokens
├── types/         # Shared TypeScript types
└── utils/         # Small utilities (error helpers)
```

## Routes

| Path              | Page              | Auth Required | Description                         |
| ----------------- | ----------------- | ------------- | ----------------------------------- |
| `/login`          | LoginPage         | No            | Login / Signup with API key reveal  |
| `/`               | DashboardPage     | Yes           | Bundle groups list & stats          |
| `/groups/:version`| GroupDetailPage    | Yes           | Upload & manage bundles for a group |
| `/settings`       | SettingsPage      | Yes           | View / regenerate API key           |

## Key Patterns

### Authentication

Cookie-based sessions managed by the backend. The Axios client is configured with `withCredentials: true` and a response interceptor that automatically logs the user out on `401` responses. Auth state is persisted to `localStorage` via Zustand so the UI survives page refreshes.

### Server State & Optimistic Updates

All data fetching uses TanStack React Query with centralized defaults:

- **Stale time:** 30s (queries), 60s (single group)
- **GC time:** 10 minutes
- **Retry:** 1 for queries, 0 for mutations
- **Optimistic updates:** Create, update, and delete mutations optimistically modify the cache and roll back on error.

### Toast Notifications

A global Zustand store powers the notification system:

- Up to **4** toasts on screen at once
- Variants: `success`, `error`, `info`, `loading`
- Deduplication within a 1200ms window prevents spam
- Loading toasts can be updated in-place (e.g., upload progress → success)

### Modal System

The `useModal` hook provides a declarative API for common dialogs:

```tsx
const modal = useModal();

modal.confirm('Delete this group?', handleDelete, { variant: 'warning' });
modal.success('API key regenerated');
modal.error('Upload failed');
```

### Design System

Dark theme with CSS custom properties defined in `global.css`:

- **Canvas:** `#0D1117` background, `#1C2128` surfaces
- **Accent:** `#8DC647` brand green, `#6188FF` primary blue
- **Semantic:** `#16C784` success, `#EA3943` danger, `#F5A623` warning
- **Platform colors:** `#3DDC84` Android, `#007AFF` iOS
- **Typography:** DM Sans (UI), JetBrains Mono (code)
- **Spacing:** 8px grid system
- **Motion:** 150–250ms transitions with cubic-bezier easing

## Environment Variables

| Variable      | Default                  | Description                          |
| ------------- | ------------------------ | ------------------------------------ |
| `API_TARGET`  | `http://localhost:3001`  | Backend server URL for the dev proxy |
