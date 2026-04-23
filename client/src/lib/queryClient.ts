import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  apiKey: ['api-key'] as const,
  bundleGroups: ['bundleGroups'] as const,
  bundleGroup: (id: string) => ['bundleGroup', id] as const,
  // Project domain
  projects: ['projects'] as const,
  projectBundles: (projectId: string) => ['projectBundles', projectId] as const,
  projectReleases: (projectId: string) =>
    ['projectReleases', projectId] as const,
};

const QUERY_STALE_TIME_MS = 30_000;
const QUERY_GC_TIME_MS = 10 * 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
