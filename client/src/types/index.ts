export interface BundleItem {
  id: string;
  name: string;
  version: number;
  downloadAndroidUrl: string;
  downloadIosUrl: string;
  active: boolean;
}

export interface BundleGroup {
  _id: string;
  name: string;
  version: number;
  androidBundleUrl: string | null;
  iosBundleUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  email: string;
}

export interface SignupResponse {
  email: string;
  otaApiKey: string;
}

export interface MeResponse {
  email: string;
  userId: string;
}

export interface ApiKeyInfo {
  keyPreview: string;
  createdAt: string;
}

export interface ApiKeyRegenerateResponse {
  otaApiKey: string;
  createdAt: string;
}
