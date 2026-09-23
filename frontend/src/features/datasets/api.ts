import { http } from '../../shared/api/http';
import type { Page } from '../../shared/api/types';
import type {
  CreateDatasetRequest,
  DatasetListParams,
  DatasetResponse,
  UpdateDatasetRequest,
} from './types';

export async function getDatasets(params: DatasetListParams): Promise<Page<DatasetResponse>> {
  return http.get<Page<DatasetResponse>>('/datasets', {
    params: {
      page: params.page,
      size: params.size,
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });
}

export async function getDataset(id: number): Promise<DatasetResponse> {
  return http.get<DatasetResponse>(`/datasets/${id}`);
}

export async function createDataset(body: CreateDatasetRequest): Promise<DatasetResponse> {
  return http.post<DatasetResponse>('/datasets', body);
}

export async function updateDataset(id: number, body: UpdateDatasetRequest): Promise<DatasetResponse> {
  return http.put<DatasetResponse>(`/datasets/${id}`, body);
}

export async function deleteDataset(id: number): Promise<void> {
  return http.delete<void>(`/datasets/${id}`);
}
