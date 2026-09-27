export interface DashboardSummaryResponse {
  totalDatasets: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
}
