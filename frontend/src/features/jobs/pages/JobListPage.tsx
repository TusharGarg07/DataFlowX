import { useAuth } from '../../auth';
import { useJobs } from '../queries';
import { JobTable } from '../components/JobTable';
import type { JobSortKey } from '../types';
import { useUrlState } from '../../../shared/hooks/useUrlState';
import {
  parseJobSort,
  formatJobSort,
  DEFAULT_JOB_SORT_KEY,
  DEFAULT_JOB_SORT_DIR,
} from '../lib/sort';
import { ChevronLeft, ChevronRight, Workflow } from 'lucide-react';

export function JobListPage() {
  const { user } = useAuth();
  const { params, setParams } = useUrlState({ page: 0, size: 20 });

  const validatedSort = parseJobSort(params.sort);
  const concreteSortString = formatJobSort(validatedSort.key, validatedSort.dir);

  const { data, isLoading, error, refetch } = useJobs({
    page: params.page,
    size: params.size,
    sort: concreteSortString,
  });

  const handleSortChange = (newKey: JobSortKey) => {
    let newDir: 'asc' | 'desc' = 'asc';
    if (validatedSort.key === newKey) {
      newDir = validatedSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      newDir = newKey === DEFAULT_JOB_SORT_KEY ? DEFAULT_JOB_SORT_DIR : 'asc';
    }
    setParams({ page: 0, sort: formatJobSort(newKey, newDir) });
  };

  const totalPages = data?.totalPages || 0;
  const currentPage = params.page;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Processing Jobs</h2>
          <p className="text-slate-500 text-sm">
            Monitor and track asynchronous data processing executions
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Workflow className="w-3.5 h-3.5" />
          <span>{data ? `${data.totalElements} Total Jobs` : 'Loading...'}</span>
        </div>
      </div>

      {/* Main Table View */}
      <JobTable
        jobs={data?.content || []}
        userRole={user?.role}
        currentSortKey={validatedSort.key}
        currentSortDir={validatedSort.dir}
        onSortChange={handleSortChange}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-900">{currentPage + 1}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
            {data && ` (${data.totalElements} total entries)`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setParams({ page: Math.max(0, currentPage - 1) })}
              disabled={currentPage === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setParams({ page: Math.min(totalPages - 1, currentPage + 1) })}
              disabled={currentPage >= totalPages - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
