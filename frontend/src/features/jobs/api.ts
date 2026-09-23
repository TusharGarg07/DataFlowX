import { http } from '../../shared/api/http';
import type { Page } from '../../shared/api/types';
import type { JobListParams, JobResponse } from './types';

export async function getJobs(params: JobListParams): Promise<Page<JobResponse>> {
  return http.get<Page<JobResponse>>('/jobs', {
    params: {
      page: params.page,
      size: params.size,
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });
}

export async function getJob(id: number): Promise<JobResponse> {
  return http.get<JobResponse>(`/jobs/${id}`);
}

export async function submitJob(datasetId: number): Promise<JobResponse> {
  return http.post<JobResponse>(`/datasets/${datasetId}/jobs`, {});
}
