export type DatasetStatus = 'ACTIVE' | 'ARCHIVED';

export interface DatasetResponse {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  status: DatasetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
}

export interface UpdateDatasetRequest {
  name: string;
  description: string | null;
  status: DatasetStatus;
}

export type DatasetSortKey = 'name' | 'status' | 'createdAt' | 'updatedAt';

export interface DatasetListParams {
  page: number;
  size: number;
  sort?: string;
}
