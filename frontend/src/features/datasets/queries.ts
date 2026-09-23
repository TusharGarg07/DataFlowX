import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getDatasets, getDataset, createDataset, updateDataset, deleteDataset } from './api';
import type { CreateDatasetRequest, DatasetListParams, UpdateDatasetRequest } from './types';

export const datasetKeys = {
  all: ['datasets'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  list: (params: DatasetListParams) => [...datasetKeys.lists(), params] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (id: number) => [...datasetKeys.details(), id] as const,
};

export function useDatasets(params: DatasetListParams) {
  return useQuery({
    queryKey: datasetKeys.list(params),
    queryFn: () => getDatasets(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useDataset(id: number) {
  return useQuery({
    queryKey: datasetKeys.detail(id),
    queryFn: () => getDataset(id),
    enabled: !isNaN(id) && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDatasetRequest) => createDataset(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}

export function useUpdateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateDatasetRequest }) => updateDataset(id, body),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(datasetKeys.detail(id), data);
      void queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDataset(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: datasetKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}
