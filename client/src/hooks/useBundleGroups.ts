import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchBundleGroups,
  fetchBundleGroup,
  createBundleGroup,
  updateBundleGroup,
  deleteBundleGroup,
  uploadBundleFiles,
} from '../api/bundleGroups';
import { queryKeys } from '../lib/queryClient';
import type { BundleGroup } from '../types';

export function useBundleGroups() {
  return useQuery({
    queryKey: queryKeys.bundleGroups,
    queryFn: fetchBundleGroups,
    placeholderData: keepPreviousData,
    select: (groups) => groups.toSorted((a, b) => b.version - a.version),
  });
}

export function useBundleGroup(id: string) {
  return useQuery({
    queryKey: queryKeys.bundleGroup(id),
    queryFn: () => fetchBundleGroup(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateBundleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, version }: { name: string; version: number }) =>
      createBundleGroup(name, version),
    onSuccess: (createdGroup) => {
      qc.setQueryData<BundleGroup[]>(queryKeys.bundleGroups, (groups) => {
        if (!groups) return [createdGroup];
        return [
          createdGroup,
          ...groups.filter((g) => g._id !== createdGroup._id),
        ];
      });
      qc.invalidateQueries({ queryKey: queryKeys.bundleGroups });
    },
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
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.bundleGroups });
      const previousGroups = qc.getQueryData<BundleGroup[]>(
        queryKeys.bundleGroups,
      );

      qc.setQueryData<BundleGroup[]>(queryKeys.bundleGroups, (groups) => {
        if (!groups) return groups;
        return groups.map((group) =>
          group._id === id ? { ...group, ...updates } : group,
        );
      });

      return { previousGroups };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousGroups) {
        qc.setQueryData(queryKeys.bundleGroups, context.previousGroups);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bundleGroups });
    },
  });
}

export function useDeleteBundleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBundleGroup(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.bundleGroups });
      const previousGroups = qc.getQueryData<BundleGroup[]>(
        queryKeys.bundleGroups,
      );

      qc.setQueryData<BundleGroup[]>(queryKeys.bundleGroups, (groups) => {
        if (!groups) return groups;
        return groups.filter((group) => group._id !== id);
      });

      return { previousGroups };
    },
    onError: (_error, _id, context) => {
      if (context?.previousGroups) {
        qc.setQueryData(queryKeys.bundleGroups, context.previousGroups);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bundleGroups });
    },
  });
}

export function useUploadBundleFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      uploadBundleFiles(id, formData),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bundleGroups });
      qc.invalidateQueries({ queryKey: queryKeys.bundleGroup(variables.id) });
    },
  });
}
