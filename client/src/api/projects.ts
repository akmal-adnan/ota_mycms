import apiClient from './client';
import type { Project, Bundle } from '../types';

// ── Projects ──────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
  return data;
}

export async function createProject(name: string): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', { name });
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}

// ── Bundles ───────────────────────────────────────

export async function fetchProjectBundles(
  projectId: string,
): Promise<Bundle[]> {
  const { data } = await apiClient.get<Bundle[]>(
    `/projects/${projectId}/bundles`,
  );
  return data;
}

export async function createProjectBundle(
  projectId: string,
  payload: { name: string; targetVersion?: string },
): Promise<Bundle> {
  const { data } = await apiClient.post<Bundle>(
    `/projects/${projectId}/bundles`,
    payload,
  );
  return data;
}

export async function updateProjectBundle(
  projectId: string,
  bundleId: string,
  updates: Partial<Pick<Bundle, 'name' | 'targetVersion' | 'isActive'>>,
): Promise<Bundle> {
  const { data } = await apiClient.patch<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}`,
    updates,
  );
  return data;
}

export async function deleteProjectBundle(
  projectId: string,
  bundleId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/bundles/${bundleId}`);
}

export async function uploadProjectBundleFiles(
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

export async function releaseProjectBundle(
  projectId: string,
  bundleId: string,
): Promise<Bundle> {
  const { data } = await apiClient.post<Bundle>(
    `/projects/${projectId}/bundles/${bundleId}/release`,
  );
  return data;
}

// ── Releases ──────────────────────────────────────

export async function fetchProjectReleases(
  projectId: string,
): Promise<Bundle[]> {
  const { data } = await apiClient.get<Bundle[]>(
    `/projects/${projectId}/releases`,
  );
  return data;
}
