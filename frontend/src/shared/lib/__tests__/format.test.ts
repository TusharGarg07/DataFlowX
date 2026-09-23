import { describe, it, expect } from 'vitest';
import { formatDate, formatDurationMs } from '../format';

describe('format helpers', () => {
  it('formats null dates safely', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats valid ISO date strings', () => {
    const formatted = formatDate('2026-09-22T10:00:00Z');
    expect(formatted).not.toBe('—');
    expect(formatted).toContain('2026');
  });

  it('calculates duration in ms and seconds', () => {
    expect(formatDurationMs(null, null)).toBe('—');
    expect(formatDurationMs('2026-09-22T10:00:00Z', '2026-09-22T10:00:00.150Z')).toBe('150 ms');
    expect(formatDurationMs('2026-09-22T10:00:00Z', '2026-09-22T10:00:02.500Z')).toBe('2.5 s');
  });
});