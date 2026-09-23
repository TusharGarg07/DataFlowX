import type { JobStatus } from '../types';

export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

export function isNonTerminalStatus(status: JobStatus): boolean {
  return status === 'PENDING' || status === 'RUNNING';
}

export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  RUNNING: {
    label: 'Running',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
};
