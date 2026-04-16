import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBundleGroups,
  fetchBundleGroup,
  createBundleGroup,
  updateBundleGroup,
  deleteBundleGroup,
  uploadBundleFiles,
} from '../api/bundleGroups';

export function useBundleGroups() {
  return useQuery({
    queryKey: ['bundleGroups'],
    queryFn: fetchBundleGroups,
  });
}

export function useBundleGroup(id: string) {
  return useQuery({
    queryKey: ['bundleGroup', id],
    queryFn: () => fetchBundleGroup(id),
    enabled: !!id,
  });
}

export function useCreateBundleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, version }: { name: string; version: number }) =>
      createBundleGroup(name, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundleGroups'] }),
  });
}

export function useUpdateBundleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; isActive?: boolean };
    }) => updateBundleGroup(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundleGroups'] }),
  });
}

export function useDeleteBundleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBundleGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundleGroups'] }),
  });
}

export function useUploadBundleFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      uploadBundleFiles(id, formData),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bundleGroups'] });
      qc.invalidateQueries({ queryKey: ['bundleGroup', variables.id] });
    },
  });
}
