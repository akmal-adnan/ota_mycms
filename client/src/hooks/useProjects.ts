import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
} from '../api/projects';
import { queryKeys } from '../lib/queryClient';
import type { Project } from '../types';

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: fetchProjects,
    placeholderData: keepPreviousData,
    select: (projects) =>
      projects.toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => fetchProject(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createProject(name),
    onSuccess: (created) => {
      qc.setQueryData<Project[]>(queryKeys.projects, (projects) => {
        if (!projects) return [created];
        return [created, ...projects.filter((p) => p._id !== created._id)];
      });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string } }) =>
      updateProject(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects });
      const previous = qc.getQueryData<Project[]>(queryKeys.projects);
      qc.setQueryData<Project[]>(queryKeys.projects, (projects) => {
        if (!projects) return projects;
        return projects.map((p) => (p._id === id ? { ...p, ...updates } : p));
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.projects, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects });
      const previous = qc.getQueryData<Project[]>(queryKeys.projects);
      qc.setQueryData<Project[]>(queryKeys.projects, (projects) => {
        if (!projects) return projects;
        return projects.filter((p) => p._id !== id);
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.projects, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
