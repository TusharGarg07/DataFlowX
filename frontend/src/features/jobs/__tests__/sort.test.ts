import { describe, it, expect } from 'vitest';
import { parseJobSort, formatJobSort } from '../lib/sort';

describe('Job Sort Utilities', () => {
  it('parses valid sort parameters correctly', () => {
    expect(parseJobSort('id,asc')).toEqual({ key: 'id', dir: 'asc' });
    expect(parseJobSort('status,desc')).toEqual({ key: 'status', dir: 'desc' });
    expect(parseJobSort('progress,asc')).toEqual({ key: 'progress', dir: 'asc' });
    expect(parseJobSort('submittedAt,desc')).toEqual({ key: 'submittedAt', dir: 'desc' });
    expect(parseJobSort('startedAt,asc')).toEqual({ key: 'startedAt', dir: 'asc' });
    expect(parseJobSort('completedAt,desc')).toEqual({ key: 'completedAt', dir: 'desc' });
  });

  it('falls back to default sort (submittedAt,desc) when parameter is missing or invalid', () => {
    expect(parseJobSort(undefined)).toEqual({ key: 'submittedAt', dir: 'desc' });
    expect(parseJobSort('')).toEqual({ key: 'submittedAt', dir: 'desc' });
    expect(parseJobSort('invalidColumn,asc')).toEqual({ key: 'submittedAt', dir: 'asc' });
    expect(parseJobSort('foobar,invalidDir')).toEqual({ key: 'submittedAt', dir: 'desc' });
  });

  it('formats sort parameter correctly', () => {
    expect(formatJobSort('submittedAt', 'desc')).toBe('submittedAt,desc');
    expect(formatJobSort('progress', 'asc')).toBe('progress,asc');
  });
});
