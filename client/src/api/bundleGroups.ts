import apiClient from './client';
import type { BundleGroup, BundleItem } from '../types';

export async function fetchBundleGroups(): Promise<BundleGroup[]> {
  const { data } = await apiClient.get<BundleGroup[]>('/bundle-groups');
  return data;
}

export async function fetchBundleGroup(id: string): Promise<BundleGroup> {
  const { data } = await apiClient.get<BundleGroup>(`/bundle-groups/${id}`);
  return data;
}

export async function createBundleGroup(
  name: string,
  version: number,
): Promise<BundleGroup> {
  const { data } = await apiClient.post<BundleGroup>('/bundle-groups', {
    name,
    version,
  });
  return data;
}

export async function updateBundleGroup(
  id: string,
  updates: Partial<Pick<BundleGroup, 'name' | 'isActive'>>,
): Promise<BundleGroup> {
  const { data } = await apiClient.patch<BundleGroup>(
    `/bundle-groups/${id}`,
    updates,
  );
  return data;
}

export async function deleteBundleGroup(id: string): Promise<void> {
  await apiClient.delete(`/bundle-groups/${id}`);
}

export async function uploadBundleFiles(
  id: string,
  formData: FormData,
): Promise<BundleGroup> {
  const { data } = await apiClient.post<BundleGroup>(
    `/bundle-groups/${id}/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data;
}

// --- Updates API ---

export async function fetchBundleList(): Promise<BundleItem[]> {
  const { data } = await apiClient.get<BundleItem[]>('/updates/list');
  return data;
}

export async function fetchLatestBundle(): Promise<BundleItem> {
  const { data } = await apiClient.get<BundleItem>('/updates/latest');
  return data;
}

export async function fetchBundleById(id: string): Promise<BundleItem> {
  const { data } = await apiClient.get<BundleItem>(`/updates/${id}`);
  return data;
}
