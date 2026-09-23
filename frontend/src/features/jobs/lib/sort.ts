import type { JobSortKey } from '../types';

export const ALLOWED_JOB_SORT_KEYS: JobSortKey[] = [
  'id',
  'status',
  'progress',
  'submittedAt',
  'startedAt',
  'completedAt',
];

export const DEFAULT_JOB_SORT_KEY: JobSortKey = 'submittedAt';
export const DEFAULT_JOB_SORT_DIR: 'asc' | 'desc' = 'desc';

export function parseJobSort(sortParam?: string): { key: JobSortKey; dir: 'asc' | 'desc' } {
  if (!sortParam) {
    return { key: DEFAULT_JOB_SORT_KEY, dir: DEFAULT_JOB_SORT_DIR };
  }
  const parts = sortParam.split(',');
  const keyRaw = parts[0];
  const dirRaw = parts[1];

  const key = ALLOWED_JOB_SORT_KEYS.includes(keyRaw as JobSortKey)
    ? (keyRaw as JobSortKey)
    : DEFAULT_JOB_SORT_KEY;
  const dir = dirRaw === 'asc' ? 'asc' : 'desc';

  return { key, dir };
}

export function formatJobSort(key: JobSortKey, dir: 'asc' | 'desc'): string {
  const validKey = ALLOWED_JOB_SORT_KEYS.includes(key) ? key : DEFAULT_JOB_SORT_KEY;
  const validDir = dir === 'asc' ? 'asc' : 'desc';
  return `${validKey},${validDir}`;
}
