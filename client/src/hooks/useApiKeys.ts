import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addApiKey, fetchApiKeys, removeApiKey } from '../api/projects';
import { queryKeys } from '../lib/queryClient';

export function useApiKeys(projectId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys(projectId),
    queryFn: () => fetchApiKeys(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAddApiKey(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => addApiKey(projectId, label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(projectId) });
    },
  });
}

export function useRemoveApiKey(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => removeApiKey(projectId, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(projectId) });
    },
  });
}
