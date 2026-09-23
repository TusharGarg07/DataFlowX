import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getJobs, getJob, submitJob } from './api';
import type { JobListParams } from './types';
import { calculateListPollInterval, calculatePollInterval } from './lib/polling';

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (params: JobListParams) => [...jobKeys.lists(), params] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: number) => [...jobKeys.details(), id] as const,
};

export function useJobs(params: JobListParams) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => getJobs(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.content;
      if (!items || items.length === 0) {
        return false;
      }
      return calculateListPollInterval(items.map((j) => j.status));
    },
    refetchIntervalInBackground: false,
    staleTime: 5 * 1000,
  });
}

export function useJob(id: number, pollStartTime?: number) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => getJob(id),
    enabled: !isNaN(id) && id > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!pollStartTime) {
        return calculatePollInterval(status, 0);
      }
      const elapsed = Date.now() - pollStartTime;
      return calculatePollInterval(status, elapsed);
    },
    refetchIntervalInBackground: false,
    staleTime: 5 * 1000,
  });
}

export function useSubmitJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: number) => submitJob(datasetId),
    onSuccess: (data) => {
      queryClient.setQueryData(jobKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}
