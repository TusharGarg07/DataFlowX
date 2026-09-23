export function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDurationMs(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '—';
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffMs = Math.max(0, end - start);
    if (diffMs < 1000) {
      return `${diffMs} ms`;
    }
    const seconds = (diffMs / 1000).toFixed(1);
    return `${seconds} s`;
  } catch {
    return '—';
  }
}