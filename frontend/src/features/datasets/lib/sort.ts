import type { DatasetSortKey } from '../types';

export const ALLOWED_SORT_KEYS: DatasetSortKey[] = ['name', 'status', 'createdAt', 'updatedAt'];
export const DEFAULT_SORT_KEY: DatasetSortKey = 'createdAt';
export const DEFAULT_SORT_DIR: 'asc' | 'desc' = 'desc';

export function parseDatasetSort(sortParam?: string): { key: DatasetSortKey; dir: 'asc' | 'desc' } {
  if (!sortParam) {
    return { key: DEFAULT_SORT_KEY, dir: DEFAULT_SORT_DIR };
  }
  const parts = sortParam.split(',');
  const keyRaw = parts[0];
  const dirRaw = parts[1];

  const key = ALLOWED_SORT_KEYS.includes(keyRaw as DatasetSortKey)
    ? (keyRaw as DatasetSortKey)
    : DEFAULT_SORT_KEY;
  const dir = dirRaw === 'asc' ? 'asc' : 'desc';

  return { key, dir };
}

export function formatDatasetSort(key: DatasetSortKey, dir: 'asc' | 'desc'): string {
  const validKey = ALLOWED_SORT_KEYS.includes(key) ? key : DEFAULT_SORT_KEY;
  const validDir = dir === 'asc' ? 'asc' : 'desc';
  return `${validKey},${validDir}`;
}
