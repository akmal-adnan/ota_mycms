import apiClient from './client';
import type { Project, ApiKeyCreateResponse } from '../types';

export interface ApiKeyListItem {
  _id: string;
  label: string;
  key: string;
  keyPreview?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
  return data;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`);
  return data;
}

export async function createProject(name: string): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', { name });
  return data;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'name'>>,
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(
    `/projects/${projectId}`,
    updates,
  );
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}

export async function addApiKey(
  projectId: string,
  label: string,
): Promise<ApiKeyCreateResponse> {
  const { data } = await apiClient.post<ApiKeyCreateResponse>(
    `/projects/${projectId}/api-keys`,
    { label },
  );
  return data;
}

export async function fetchApiKeys(
  projectId: string,
): Promise<ApiKeyListItem[]> {
  const { data } = await apiClient.get<ApiKeyListItem[]>(
    `/projects/${projectId}/api-keys`,
  );
  return data.map((entry) => ({
    ...entry,
    key: entry.key ?? entry.keyPreview ?? '',
  }));
}

export async function removeApiKey(
  projectId: string,
  keyId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/api-keys/${keyId}`);
}
