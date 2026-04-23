import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReleases, toggleReleaseBundle } from '../api/bundles';
import { queryKeys } from '../lib/queryClient';

export function useReleases(projectId: string) {
  return useQuery({
    queryKey: queryKeys.releases(projectId),
    queryFn: () => fetchReleases(projectId),
    enabled: Boolean(projectId),
  });
}

export function useToggleReleaseBundle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bundleId,
      isActive,
    }: {
      bundleId: string;
      isActive: boolean;
    }) => toggleReleaseBundle(projectId, bundleId, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.releases(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.bundles(projectId) });
    },
  });
}
