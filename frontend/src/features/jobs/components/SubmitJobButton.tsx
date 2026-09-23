import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubmitJob } from '../queries';
import { ApiError } from '../../../shared/api/ApiError';
import { Play, Loader2, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react';

interface SubmitJobButtonProps {
  datasetId: number;
  className?: string;
}

export function SubmitJobButton({ datasetId, className = '' }: SubmitJobButtonProps) {
  const submitMutation = useSubmitJob();
  const [submittedJobId, setSubmittedJobId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSubmittedJobId(null);
    try {
      const job = await submitMutation.mutateAsync(datasetId);
      setSubmittedJobId(job.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setErrorMessage('You do not have permission to submit jobs for this dataset.');
        } else if (err.status === 404) {
          setErrorMessage('Dataset not found. Cannot submit job.');
        } else {
          setErrorMessage(err.message || 'Failed to submit processing job.');
        }
      } else {
        setErrorMessage('An unexpected error occurred while submitting the job.');
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitMutation.isPending}
          className={`inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Submitting Job...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Submit Job</span>
            </>
          )}
        </button>
      </div>

      {/* Success Notification */}
      {submittedJobId && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Job #{submittedJobId} submitted — status PENDING.</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/jobs/${submittedJobId}`}
              className="inline-flex items-center gap-1 font-semibold text-emerald-900 underline hover:text-emerald-950 transition"
            >
              <span>View Job</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={() => setSubmittedJobId(null)}
              className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 p-0.5 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
