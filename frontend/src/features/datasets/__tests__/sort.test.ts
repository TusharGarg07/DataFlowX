import { describe, it, expect } from 'vitest';
import { parseDatasetSort, formatDatasetSort } from '../lib/sort';

describe('Dataset Sort Utilities', () => {
  it('parses valid sort parameter correctly', () => {
    expect(parseDatasetSort('name,asc')).toEqual({ key: 'name', dir: 'asc' });
    expect(parseDatasetSort('status,desc')).toEqual({ key: 'status', dir: 'desc' });
    expect(parseDatasetSort('updatedAt,asc')).toEqual({ key: 'updatedAt', dir: 'asc' });
  });

  it('falls back to default sort (createdAt,desc) when sort parameter is missing or invalid', () => {
    expect(parseDatasetSort(undefined)).toEqual({ key: 'createdAt', dir: 'desc' });
    expect(parseDatasetSort('')).toEqual({ key: 'createdAt', dir: 'desc' });
    expect(parseDatasetSort('invalidField,asc')).toEqual({ key: 'createdAt', dir: 'asc' });
    expect(parseDatasetSort('secretColumn,invalidDir')).toEqual({ key: 'createdAt', dir: 'desc' });
  });

  it('formats sort parameter cleanly', () => {
    expect(formatDatasetSort('name', 'asc')).toBe('name,asc');
    expect(formatDatasetSort('createdAt', 'desc')).toBe('createdAt,desc');
  });
});
