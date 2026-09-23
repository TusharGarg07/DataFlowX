import { describe, it, expect } from 'vitest';
import { isTerminalStatus, isNonTerminalStatus } from '../lib/status';
import { calculatePollInterval, calculateListPollInterval, MAX_POLL_DURATION_MS } from '../lib/polling';

describe('Job Status & Polling Utilities', () => {
  it('correctly identifies terminal and non-terminal statuses', () => {
    expect(isTerminalStatus('COMPLETED')).toBe(true);
    expect(isTerminalStatus('FAILED')).toBe(true);
    expect(isTerminalStatus('PENDING')).toBe(false);
    expect(isTerminalStatus('RUNNING')).toBe(false);

    expect(isNonTerminalStatus('PENDING')).toBe(true);
    expect(isNonTerminalStatus('RUNNING')).toBe(true);
    expect(isNonTerminalStatus('COMPLETED')).toBe(false);
    expect(isNonTerminalStatus('FAILED')).toBe(false);
  });

  it('calculates polling interval with backoff and stops on terminal status or timeout', () => {
    // Terminal states should stop immediately
    expect(calculatePollInterval('COMPLETED', 0)).toBe(false);
    expect(calculatePollInterval('FAILED', 0)).toBe(false);
    expect(calculatePollInterval(undefined, 0)).toBe(false);

    // Initial fast polling under 10s
    expect(calculatePollInterval('RUNNING', 0)).toBe(1000);
    expect(calculatePollInterval('PENDING', 5000)).toBe(1000);

    // Backoff between 10s and 30s
    expect(calculatePollInterval('RUNNING', 15000)).toBe(2000);
    expect(calculatePollInterval('PENDING', 29999)).toBe(2000);

    // Slower poll between 30s and 120s
    expect(calculatePollInterval('RUNNING', 30000)).toBe(5000);
    expect(calculatePollInterval('RUNNING', 119000)).toBe(5000);

    // Hard timeout after 120s (2 minutes)
    expect(calculatePollInterval('RUNNING', MAX_POLL_DURATION_MS)).toBe(false);
    expect(calculatePollInterval('PENDING', MAX_POLL_DURATION_MS + 1000)).toBe(false);
  });

  it('determines list polling interval based on active jobs in view', () => {
    expect(calculateListPollInterval(['COMPLETED', 'FAILED'])).toBe(false);
    expect(calculateListPollInterval([])).toBe(false);
    expect(calculateListPollInterval(['COMPLETED', 'RUNNING'])).toBe(2500);
    expect(calculateListPollInterval(['PENDING'])).toBe(2500);
  });
});
