import { http } from '../../shared/api/http';
import type { DashboardSummaryResponse } from './types';

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return http.get<DashboardSummaryResponse>('/dashboard/summary');
}
