import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth';
import { useDashboardSummary, dashboardKeys } from '../queries';
import { useDatasets, datasetKeys } from '../../datasets/queries';
import { useJobs, jobKeys } from '../../jobs/queries';
import { AdminSummaryCards } from '../components/AdminSummaryCards';
import { UserOverviewCards } from '../components/UserOverviewCards';
import { RecentJobsList } from '../components/RecentJobsList';

function AdminDashboardContent() {
  const summaryQuery = useDashboardSummary();
  const recentJobsQuery = useJobs({ page: 0, size: 5, sort: 'submittedAt,desc' });

  return (
    <div className="space-y-6">
      {summaryQuery.isError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              Failed to load platform summary: {summaryQuery.error?.message || 'Unknown error'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <AdminSummaryCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {recentJobsQuery.isError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              Failed to load recent jobs: {recentJobsQuery.error?.message || 'Unknown error'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => recentJobsQuery.refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <RecentJobsList
        jobs={recentJobsQuery.data?.content ?? []}
        isLoading={recentJobsQuery.isLoading}
      />
    </div>
  );
}

function UserDashboardContent() {
  const datasetsQuery = useDatasets({ page: 0, size: 1 });
  const jobsCountQuery = useJobs({ page: 0, size: 1 });
  const recentJobsQuery = useJobs({ page: 0, size: 5, sort: 'submittedAt,desc' });

  const isStatsLoading = datasetsQuery.isLoading || jobsCountQuery.isLoading;
  const isStatsError = datasetsQuery.isError || jobsCountQuery.isError;
  const statsErrorMessage =
    datasetsQuery.error?.message || jobsCountQuery.error?.message || 'Failed to load workspace metrics';

  return (
    <div className="space-y-6">
      {isStatsError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{statsErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void datasetsQuery.refetch();
              void jobsCountQuery.refetch();
            }}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <UserOverviewCards
        totalDatasets={datasetsQuery.data?.totalElements}
        totalJobs={jobsCountQuery.data?.totalElements}
        isLoading={isStatsLoading}
      />

      {recentJobsQuery.isError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              Failed to load recent jobs: {recentJobsQuery.error?.message || 'Unknown error'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => recentJobsQuery.refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <RecentJobsList
        jobs={recentJobsQuery.data?.content ?? []}
        isLoading={recentJobsQuery.isLoading}
      />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (user?.role === 'ADMIN') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: dashboardKeys.summary() }),
          queryClient.invalidateQueries({ queryKey: jobKeys.lists() }),
        ]);
      } else {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: datasetKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: jobKeys.lists() }),
        ]);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                user?.role === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
              }`}
            >
              {user?.role === 'ADMIN' ? 'Platform Overview' : 'Workspace Overview'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'ADMIN'
              ? 'Real-time system health and platform-wide execution status'
              : 'Your datasets, pipeline executions, and recent activity'}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition shadow-xs cursor-pointer"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {user?.role === 'ADMIN' ? <AdminDashboardContent /> : <UserDashboardContent />}
    </div>
  );
}
