// ── Project ──────────────────────────────────

export interface ApiKeyEntry {
  _id: string;
  key: string;
  label: string;
  createdAt: string;
}

export interface Project {
  _id: string;
  name: string;
  ownerId: string;
  apiKeys: ApiKeyEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Bundle ───────────────────────────────────

export type BundleStatus = 'draft' | 'released';

export interface Bundle {
  _id: string;
  projectId: string;
  name: string;
  title: string;
  description: string;
  targetAppVersion: string;
  bundleVersion: string;
  androidBundleUrl: string | null;
  iosBundleUrl: string | null;
  androidBundleSha256: string | null;
  iosBundleSha256: string | null;
  status: BundleStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Release ──────────────────────────────────

export interface ReleaseGroup {
  targetAppVersion: string;
  bundles: Bundle[];
}

// ── Auth ─────────────────────────────────────

export interface LoginResponse {
  email: string;
}

export interface SignupResponse {
  email: string;
}

export interface MeResponse {
  email: string;
  userId: string;
}

// ── API Key (per-project, returned on creation) ──

export interface ApiKeyCreateResponse {
  apiKey: ApiKeyEntry;
}

// ── Updates API (consumed by OTA clients) ────

export interface BundleItem {
  id: string;
  name: string;
  version: string;
  downloadAndroidUrl: string;
  downloadIosUrl: string;
  active: boolean;
}
