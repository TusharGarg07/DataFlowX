import type { JobStatus } from '../types';
import { isTerminalStatus } from './status';

export const MAX_POLL_DURATION_MS = 120_000; // 2 minutes hard timeout

/**
 * Calculates next polling interval in milliseconds based on elapsed time.
 * Returns `false` when polling should stop (terminal status or timeout exceeded).
 */
export function calculatePollInterval(
  status: JobStatus | undefined,
  elapsedMs: number
): number | false {
  if (!status || isTerminalStatus(status)) {
    return false;
  }

  if (elapsedMs >= MAX_POLL_DURATION_MS) {
    return false;
  }

  if (elapsedMs < 10_000) {
    return 1_000; // Fast initial poll (1s)
  }

  if (elapsedMs < 30_000) {
    return 2_000; // Backoff to 2s
  }

  return 5_000; // Moderate poll until timeout (5s)
}

/**
 * Determines whether a job list page should poll.
 * Polls at 2.5s interval if any item on the current page is non-terminal.
 */
export function calculateListPollInterval(statuses: JobStatus[]): number | false {
  const hasActiveJob = statuses.some((status) => !isTerminalStatus(status));
  if (!hasActiveJob) {
    return false;
  }
  return 2_500;
}
