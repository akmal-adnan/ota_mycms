import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchProjects,
  createProject,
  deleteProject,
  fetchProjectBundles,
  createProjectBundle,
  updateProjectBundle,
  deleteProjectBundle,
  uploadProjectBundleFiles,
  releaseProjectBundle,
  fetchProjectReleases,
} from '../api/projects';
import { queryKeys } from '../lib/queryClient';
import type { Project, Bundle } from '../types';

// ── Projects ──────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: fetchProjects,
    placeholderData: keepPreviousData,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createProject(name),
    onSuccess: (created) => {
      qc.setQueryData<Project[]>(queryKeys.projects, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects });
      const previous = qc.getQueryData<Project[]>(queryKeys.projects);
      qc.setQueryData<Project[]>(queryKeys.projects, (prev) =>
        prev ? prev.filter((p) => p._id !== projectId) : prev,
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.projects, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

// ── Bundles ───────────────────────────────────────

export function useProjectBundles(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectBundles(projectId),
    queryFn: () => fetchProjectBundles(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProjectBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; targetVersion?: string }) =>
      createProjectBundle(projectId, payload),
    onSuccess: (created) => {
      qc.setQueryData<Bundle[]>(queryKeys.projectBundles(projectId), (prev) =>
        prev ? [created, ...prev] : [created],
      );
      qc.invalidateQueries({ queryKey: queryKeys.projectBundles(projectId) });
    },
  });
}

export function useUpdateProjectBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bundleId,
      updates,
    }: {
      bundleId: string;
      updates: Partial<Pick<Bundle, 'name' | 'targetVersion' | 'isActive'>>;
    }) => updateProjectBundle(projectId, bundleId, updates),
    onSuccess: (updated) => {
      qc.setQueryData<Bundle[]>(queryKeys.projectBundles(projectId), (prev) =>
        prev ? prev.map((b) => (b._id === updated._id ? updated : b)) : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.projectBundles(projectId) });
    },
  });
}

export function useDeleteProjectBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => deleteProjectBundle(projectId, bundleId),
    onMutate: async (bundleId) => {
      await qc.cancelQueries({
        queryKey: queryKeys.projectBundles(projectId),
      });
      const previous = qc.getQueryData<Bundle[]>(
        queryKeys.projectBundles(projectId),
      );
      qc.setQueryData<Bundle[]>(queryKeys.projectBundles(projectId), (prev) =>
        prev ? prev.filter((b) => b._id !== bundleId) : prev,
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.projectBundles(projectId), ctx.previous);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: queryKeys.projectBundles(projectId) }),
  });
}

export function useUploadProjectBundleFiles(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bundleId,
      formData,
    }: {
      bundleId: string;
      formData: FormData;
    }) => uploadProjectBundleFiles(projectId, bundleId, formData),
    onSuccess: (updated) => {
      qc.setQueryData<Bundle[]>(queryKeys.projectBundles(projectId), (prev) =>
        prev ? prev.map((b) => (b._id === updated._id ? updated : b)) : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.projectBundles(projectId) });
    },
  });
}

export function useReleaseProjectBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => releaseProjectBundle(projectId, bundleId),
    onSuccess: (updated) => {
      qc.setQueryData<Bundle[]>(queryKeys.projectBundles(projectId), (prev) =>
        prev ? prev.map((b) => (b._id === updated._id ? updated : b)) : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.projectBundles(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projectReleases(projectId) });
    },
  });
}

// ── Releases ──────────────────────────────────────

export function useProjectReleases(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectReleases(projectId),
    queryFn: () => fetchProjectReleases(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
