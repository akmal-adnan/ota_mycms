import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchBundles,
  fetchBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  uploadBundleFiles,
  releaseBundle,
} from '../api/bundles';
import type { CreateBundlePayload, UpdateBundlePayload } from '../api/bundles';
import { queryKeys } from '../lib/queryClient';
import type { Bundle } from '../types';

export function useBundles(projectId: string) {
  return useQuery({
    queryKey: queryKeys.bundles(projectId),
    queryFn: () => fetchBundles(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
    select: (bundles) =>
      bundles.toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
  });
}

export function useBundle(projectId: string, bundleId: string) {
  return useQuery({
    queryKey: queryKeys.bundle(projectId, bundleId),
    queryFn: () => fetchBundle(projectId, bundleId),
    enabled: Boolean(projectId) && Boolean(bundleId),
    staleTime: 60_000,
  });
}

export function useCreateBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBundlePayload) =>
      createBundle(projectId, payload),
    onSuccess: (created) => {
      qc.setQueryData<Bundle[]>(queryKeys.bundles(projectId), (bundles) => {
        if (!bundles) return [created];
        return [created, ...bundles.filter((b) => b._id !== created._id)];
      });
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
    },
  });
}

export function useUpdateBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bundleId,
      payload,
    }: {
      bundleId: string;
      payload: UpdateBundlePayload;
    }) => updateBundle(projectId, bundleId, payload),
    onMutate: async ({ bundleId, payload }) => {
      await qc.cancelQueries({ queryKey: queryKeys.bundles(projectId) });
      const previous = qc.getQueryData<Bundle[]>(queryKeys.bundles(projectId));
      qc.setQueryData<Bundle[]>(queryKeys.bundles(projectId), (bundles) => {
        if (!bundles) return bundles;
        return bundles.map((b) =>
          b._id === bundleId ? { ...b, ...payload } : b,
        );
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.bundles(projectId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
    },
  });
}

export function useDeleteBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => deleteBundle(projectId, bundleId),
    onMutate: async (bundleId) => {
      await qc.cancelQueries({ queryKey: queryKeys.bundles(projectId) });
      const previous = qc.getQueryData<Bundle[]>(queryKeys.bundles(projectId));
      qc.setQueryData<Bundle[]>(queryKeys.bundles(projectId), (bundles) => {
        if (!bundles) return bundles;
        return bundles.filter((b) => b._id !== bundleId);
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.bundles(projectId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
    },
  });
}

export function useUploadBundleFiles(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bundleId,
      formData,
    }: {
      bundleId: string;
      formData: FormData;
    }) => uploadBundleFiles(projectId, bundleId, formData),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.bundle(projectId, vars.bundleId),
      });
    },
  });
}

export function useReleaseBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => releaseBundle(projectId, bundleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.releases(projectId) });
    },
  });
}
