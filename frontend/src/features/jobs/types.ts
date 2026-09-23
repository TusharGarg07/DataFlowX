export const JOB_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobResponse {
  id: number;
  datasetId: number;
  status: JobStatus;
  progress: number;
  submittedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export type JobSortKey = 'id' | 'status' | 'progress' | 'submittedAt' | 'startedAt' | 'completedAt';

export interface JobListParams {
  page: number;
  size: number;
  sort?: string;
}
