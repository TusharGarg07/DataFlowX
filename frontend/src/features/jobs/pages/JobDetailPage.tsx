import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useJob } from '../queries';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { JobLifecycle } from '../components/JobLifecycle';
import { isNonTerminalStatus } from '../lib/status';
import { MAX_POLL_DURATION_MS } from '../lib/polling';
import { formatDate } from '../../../shared/lib/format';
import { ApiError } from '../../../shared/api/ApiError';
import type { DatasetResponse } from '../../datasets/types';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Workflow,
  ExternalLink,
  Clock,
} from 'lucide-react';

export function JobDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const jobId = rawId ? parseInt(rawId, 10) : NaN;
  const isInvalidId = isNaN(jobId) || jobId < 1;

  const [pollStartTime, setPollStartTime] = useState(() => Date.now());

  const { data: job, isLoading, error, refetch, isFetching } = useJob(jobId, pollStartTime);
  const queryClient = useQueryClient();

  // Resolve dataset name from cache
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

  const handleManualRefresh = () => {
    setPollStartTime(Date.now());
    void refetch();
  };

  if (isInvalidId) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Job ID</h2>
        <p className="text-sm text-slate-600 mb-6">
          The requested job identifier &quot;{rawId}&quot; is invalid.
        </p>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Jobs</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading job details...</p>
      </div>
    );
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            The job with ID #{jobId} does not exist or has been removed.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Jobs</span>
          </Link>
        </div>
      );
    }
    if (error.status === 403) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            You do not have permission to view this job or its dataset.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Jobs</span>
          </Link>
        </div>
      );
    }
  }

  if (error || !job) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Failed to load job</h2>
        <p className="text-sm text-slate-600 mb-6">
          {error?.message || 'An unexpected error occurred while fetching job details.'}
        </p>
        <button
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const isPolling = isNonTerminalStatus(job.status);
  const elapsedSincePollStart = Date.now() - pollStartTime;
  const isTimedOut = isPolling && elapsedSincePollStart >= MAX_POLL_DURATION_MS;
  const datasetName = resolveDatasetName(job.datasetId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      {/* Header Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Job #{job.id}</h2>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Processing for dataset:{' '}
              <Link
                to={`/datasets/${job.datasetId}`}
                className="font-medium text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <span>{datasetName}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Polling / Timeout Status Notice */}
      {isTimedOut ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No update since {formatDate(new Date(pollStartTime).toISOString())}. Refresh to check again.</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="font-semibold text-amber-900 underline hover:text-amber-950 transition"
          >
            Refresh Now
          </button>
        </div>
      ) : isPolling ? (
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-700 text-xs flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Auto-refreshing job status...</span>
        </div>
      ) : null}

      {/* Main Content: Lifecycle and Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Lifecycle & Progress */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Execution Lifecycle
          </h3>
          <JobLifecycle job={job} />
        </div>

        {/* Right Column: Metadata Overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Job Details
          </h3>
          <dl className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-500 font-medium">Job ID</dt>
              <dd className="font-mono font-semibold text-slate-900">#{job.id}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-500 font-medium">Dataset ID</dt>
              <dd className="font-mono font-semibold text-slate-900">#{job.datasetId}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-500 font-medium">Status</dt>
              <dd className="font-semibold text-slate-900">{job.status}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-500 font-medium">Progress</dt>
              <dd className="font-mono font-semibold text-slate-900">{job.progress}%</dd>
            </div>
            <div className="py-2.5 flex flex-col gap-1">
              <dt className="text-slate-500 font-medium">Submitted At</dt>
              <dd className="text-slate-900">{formatDate(job.submittedAt)}</dd>
            </div>
            {job.startedAt && (
              <div className="py-2.5 flex flex-col gap-1">
                <dt className="text-slate-500 font-medium">Started At</dt>
                <dd className="text-slate-900">{formatDate(job.startedAt)}</dd>
              </div>
            )}
            {job.completedAt && (
              <div className="py-2.5 flex flex-col gap-1">
                <dt className="text-slate-500 font-medium">Completed At</dt>
                <dd className="text-slate-900">{formatDate(job.completedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
