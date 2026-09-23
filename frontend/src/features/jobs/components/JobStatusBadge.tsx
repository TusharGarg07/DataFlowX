import type { JobStatus } from '../types';
import { STATUS_CONFIG } from '../lib/status';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function JobStatusBadge({ status, className = '' }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  const renderIcon = () => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-3.5 h-3.5" />;
      case 'RUNNING':
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'FAILED':
        return <XCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {renderIcon()}
      <span>{config.label}</span>
    </span>
  );
}
