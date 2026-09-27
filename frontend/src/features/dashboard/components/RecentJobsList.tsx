import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Workflow, ExternalLink } from 'lucide-react';
import type { JobResponse } from '../../jobs/types';
import type { DatasetResponse } from '../../datasets/types';
import { JobStatusBadge } from '../../jobs/components/JobStatusBadge';
import { formatDate } from '../../../shared/lib/format';

interface RecentJobsListProps {
  jobs: JobResponse[];
  isLoading?: boolean;
}

export function RecentJobsList({ jobs, isLoading }: RecentJobsListProps) {
  const queryClient = useQueryClient();

  const resolveDatasetName = (datasetId: number): string => {
    const cachedDetail = queryClient.getQueryData<DatasetResponse>(['datasets', 'detail', datasetId]);
    if (cachedDetail?.name) {
      return cachedDetail.name;
    }

    const datasetQueries = queryClient.getQueriesData<{ content?: DatasetResponse[] }>({
      queryKey: ['datasets', 'list'],
    });

    for (const [, pageData] of datasetQueries) {
      const match = pageData?.content?.find((d) => d.id === datasetId);
      if (match?.name) {
        return match.name;
      }
    }

    return `Dataset #${datasetId}`;
  };

  return (
    <section aria-labelledby="recent-jobs-heading" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100">
        <div>
          <h2 id="recent-jobs-heading" className="text-base font-semibold text-slate-900">
            Recent Jobs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest pipeline executions and status updates
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>View all jobs</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100/70 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Workflow className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No jobs submitted yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Jobs will appear here once submitted. Explore your datasets to initiate processing.
          </p>
          <div className="mt-4">
            <Link
              to="/datasets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <span>Explore Datasets</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Recent jobs list">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                <th scope="col" className="py-3 px-5 sm:px-6">Job ID</th>
                <th scope="col" className="py-3 px-4">Dataset</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4">Progress</th>
                <th scope="col" className="py-3 px-4">Submitted</th>
                <th scope="col" className="py-3 px-5 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/60 transition group">
                  <td className="py-3.5 px-5 sm:px-6 font-mono font-medium text-slate-900">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="hover:text-indigo-600 transition inline-flex items-center gap-1"
                    >
                      #{job.id}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 truncate max-w-[200px]">
                    {resolveDatasetName(job.datasetId)}
                  </td>
                  <td className="py-3.5 px-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="py-3.5 px-4 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === 'FAILED'
                              ? 'bg-rose-500'
                              : job.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
                        {job.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(job.submittedAt)}
                  </td>
                  <td className="py-3.5 px-5 sm:px-6 text-right">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
                      aria-label={`View details for job #${job.id}`}
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
