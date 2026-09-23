import type { JobResponse } from '../types';
import { formatDate } from '../../../shared/lib/format';
import { CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from 'lucide-react';

interface JobLifecycleProps {
  job: JobResponse;
}

export function JobLifecycle({ job }: JobLifecycleProps) {
  const hasStarted = Boolean(job.startedAt) || job.status === 'RUNNING';
  const isDirectFailure = job.status === 'FAILED' && !hasStarted;

  // Build the steps based only on actual server data
  const steps = isDirectFailure
    ? [
        {
          key: 'submitted',
          title: 'Job Submitted',
          timestamp: job.submittedAt,
          status: 'completed' as const,
        },
        {
          key: 'failed',
          title: 'Processing Failed',
          timestamp: job.completedAt,
          status: 'failed' as const,
        },
      ]
    : [
        {
          key: 'submitted',
          title: 'Job Submitted',
          timestamp: job.submittedAt,
          status: 'completed' as const,
        },
        {
          key: 'running',
          title: 'Processing',
          timestamp: job.startedAt,
          status:
            job.status === 'RUNNING'
              ? ('active' as const)
              : hasStarted
                ? ('completed' as const)
                : ('pending' as const),
        },
        {
          key: 'terminal',
          title: job.status === 'FAILED' ? 'Processing Failed' : 'Completed',
          timestamp: job.completedAt,
          status:
            job.status === 'FAILED'
              ? ('failed' as const)
              : job.status === 'COMPLETED'
                ? ('completed' as const)
                : ('pending' as const),
        },
      ];

  return (
    <div className="space-y-6">
      {/* Progress Bar Section */}
      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Job Progress
          </span>
          <span className="font-mono text-sm font-bold text-slate-900">{job.progress}%</span>
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              job.status === 'FAILED'
                ? 'bg-red-500'
                : job.status === 'COMPLETED'
                  ? 'bg-emerald-500'
                  : 'bg-brand-600'
            }`}
            style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
            role="progressbar"
            aria-valuenow={job.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {steps.map((step) => {
          let icon = <Clock className="w-4 h-4 text-slate-400" />;
          let circleBg = 'bg-slate-100 border-slate-300';
          let textColor = 'text-slate-500';

          if (step.status === 'completed') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            circleBg = 'bg-emerald-50 border-emerald-500';
            textColor = 'text-slate-900';
          } else if (step.status === 'active') {
            icon = <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />;
            circleBg = 'bg-brand-50 border-brand-500 ring-4 ring-brand-100/50';
            textColor = 'text-brand-900 font-semibold';
          } else if (step.status === 'failed') {
            icon = <XCircle className="w-4 h-4 text-red-600" />;
            circleBg = 'bg-red-50 border-red-500';
            textColor = 'text-red-900 font-semibold';
          }

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${circleBg}`}
              >
                {icon}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className={`text-sm font-medium ${textColor}`}>{step.title}</h4>
                  {step.timestamp && (
                    <span className="text-xs text-slate-400 font-normal">
                      {formatDate(step.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message Alert if Failed */}
      {job.status === 'FAILED' && job.errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold mb-0.5">Failure Reason</h5>
            <p className="text-xs text-red-700 leading-relaxed font-mono">{job.errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
