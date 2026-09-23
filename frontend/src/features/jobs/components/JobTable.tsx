import React from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { JobResponse, JobSortKey } from '../types';
import type { DatasetResponse } from '../../datasets/types';
import { JobStatusBadge } from './JobStatusBadge';
import { formatDate } from '../../../shared/lib/format';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Workflow,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface JobTableProps {
  jobs: JobResponse[];
  userRole?: 'USER' | 'ADMIN';
  currentSortKey: JobSortKey;
  currentSortDir: 'asc' | 'desc';
  onSortChange: (key: JobSortKey) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function JobTable({
  jobs,
  currentSortKey,
  currentSortDir,
  onSortChange,
  isLoading = false,
  error = null,
  onRetry,
}: JobTableProps) {
  const queryClient = useQueryClient();

  // Pure resolution of dataset name from existing dataset cache queries
  const resolveDatasetName = (datasetId: number): string => {
    // Check cached individual dataset query
    const cachedDetail = queryClient.getQueryData<DatasetResponse>(['datasets', 'detail', datasetId]);
    if (cachedDetail?.name) {
      return cachedDetail.name;
    }

    // Check cached list queries
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

  const handleSortHeader = (key: JobSortKey) => {
    onSortChange(key);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent, key: JobSortKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSortChange(key);
    }
  };

  const renderSortIcon = (key: JobSortKey) => {
    if (currentSortKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />;
    }
    return currentSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
    );
  };

  if (error) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-red-200 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load jobs</h3>
        <p className="text-sm text-slate-500 mb-4">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <div className="w-8 h-4 bg-slate-200 rounded" />
                <div className="w-32 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-24 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <Workflow className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No Jobs Found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          No data processing jobs have been submitted yet. Go to a dataset to trigger a new job.
        </p>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition shadow-xs"
        >
          <span>Explore Datasets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-4">
                <button
                  type="button"
                  onClick={() => handleSortHeader('id')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'id')}
                  className="group inline-flex items-center gap-1.5 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  <span>Job ID</span>
                  {renderSortIcon('id')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4">
                <span>Dataset</span>
              </th>
              <th scope="col" className="py-3.5 px-4">
                <button
                  type="button"
                  onClick={() => handleSortHeader('status')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'status')}
                  className="group inline-flex items-center gap-1.5 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  <span>Status</span>
                  {renderSortIcon('status')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4">
                <button
                  type="button"
                  onClick={() => handleSortHeader('progress')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'progress')}
                  className="group inline-flex items-center gap-1.5 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  <span>Progress</span>
                  {renderSortIcon('progress')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4">
                <button
                  type="button"
                  onClick={() => handleSortHeader('submittedAt')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'submittedAt')}
                  className="group inline-flex items-center gap-1.5 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  <span>Submitted At</span>
                  {renderSortIcon('submittedAt')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {jobs.map((job) => {
              const datasetName = resolveDatasetName(job.datasetId);
              return (
                <tr key={job.id} className="hover:bg-slate-50/70 transition group">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="hover:text-brand-600 transition inline-flex items-center gap-1"
                    >
                      #{job.id}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <Link
                      to={`/datasets/${job.datasetId}`}
                      className="hover:text-brand-600 transition"
                    >
                      {datasetName}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 max-w-[140px]">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            job.status === 'FAILED'
                              ? 'bg-red-500'
                              : job.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : 'bg-brand-600'
                          }`}
                          style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-600">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {formatDate(job.submittedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-md transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-slate-100">
        {jobs.map((job) => {
          const datasetName = resolveDatasetName(job.datasetId);
          return (
            <div key={job.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Link
                  to={`/jobs/${job.id}`}
                  className="font-mono text-sm font-bold text-slate-900 hover:text-brand-600 transition"
                >
                  Job #{job.id}
                </Link>
                <JobStatusBadge status={job.status} />
              </div>

              <div className="text-sm font-medium text-slate-800">
                <Link to={`/datasets/${job.datasetId}`} className="hover:underline">
                  {datasetName}
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      job.status === 'FAILED'
                        ? 'bg-red-500'
                        : job.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : 'bg-brand-600'
                    }`}
                    style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-slate-600">{job.progress}%</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>{formatDate(job.submittedAt)}</span>
                <Link
                  to={`/jobs/${job.id}`}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
