import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  apiKeys: (projectId: string) => ['projects', projectId, 'api-keys'] as const,
  bundles: (projectId: string) => ['projects', projectId, 'bundles'] as const,
  bundle: (projectId: string, bundleId: string) =>
    ['projects', projectId, 'bundles', bundleId] as const,
  releases: (projectId: string) => ['projects', projectId, 'releases'] as const,
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
