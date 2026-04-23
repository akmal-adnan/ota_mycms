import apiClient from './client';
import type { Bundle, ReleaseGroup } from '../types';

export async function fetchBundles(projectId: string): Promise<Bundle[]> {
  const { data } = await apiClient.get<Bundle[]>(
    `/projects/${projectId}/bundles`,
  );
  return data;
}

export async function fetchBundle(
  projectId: string,
  bundleId: string,
): Promise<Bundle> {
  const { data } = await apiClient.get<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}`,
  );
  return data;
}

export interface CreateBundlePayload {
  name: string;
  title?: string;
  description?: string;
  targetAppVersion: string;
  bundleVersion: string;
}

export async function createBundle(
  projectId: string,
  payload: CreateBundlePayload,
): Promise<Bundle> {
  const { data } = await apiClient.post<Bundle>(
    `/projects/${projectId}/bundles`,
    payload,
  );
  return data;
}

export interface UpdateBundlePayload {
  name?: string;
  title?: string;
  description?: string;
  targetAppVersion?: string;
  bundleVersion?: string;
}

export async function updateBundle(
  projectId: string,
  bundleId: string,
  payload: UpdateBundlePayload,
): Promise<Bundle> {
  const { data } = await apiClient.patch<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}`,
    payload,
  );
  return data;
}

export async function deleteBundle(
  projectId: string,
  bundleId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/bundles/${bundleId}`);
}

export async function uploadBundleFiles(
  projectId: string,
  bundleId: string,
  formData: FormData,
): Promise<Bundle> {
  const { data } = await apiClient.post<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function releaseBundle(
  projectId: string,
  bundleId: string,
): Promise<Bundle> {
  const { data } = await apiClient.post<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}/release`,
  );
  return data;
}

export async function fetchReleases(
  projectId: string,
): Promise<ReleaseGroup[]> {
  const { data } = await apiClient.get<ReleaseGroup[]>(
    `/projects/${projectId}/releases`,
  );
  return data;
}

export async function toggleReleaseBundle(
  projectId: string,
  bundleId: string,
  isActive: boolean,
): Promise<Bundle> {
  const { data } = await apiClient.patch<Bundle>(
    `/projects/${projectId}/releases/${bundleId}/toggle`,
    { isActive },
  );
  return data;
}
