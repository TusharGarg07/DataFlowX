import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobTable } from '../components/JobTable';
import type { JobResponse } from '../types';

const mockJobs: JobResponse[] = [
  {
    id: 101,
    datasetId: 1,
    status: 'COMPLETED',
    progress: 100,
    submittedAt: '2026-09-23T10:00:00Z',
    startedAt: '2026-09-23T10:00:01Z',
    completedAt: '2026-09-23T10:00:02Z',
    errorMessage: null,
  },
  {
    id: 102,
    datasetId: 2,
    status: 'RUNNING',
    progress: 40,
    submittedAt: '2026-09-23T10:05:00Z',
    startedAt: '2026-09-23T10:05:01Z',
    completedAt: null,
    errorMessage: null,
  },
];

describe('JobTable', () => {
  const createQueryClient = () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Prime query cache with a known dataset
    qc.setQueryData(['datasets', 'detail', 1], {
      id: 1,
      name: 'Genomic Dataset Alpha',
    });
    return qc;
  };

  it('renders job rows with resolved dataset name and honest fallback for uncached datasets', () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <JobTable
            jobs={mockJobs}
            currentSortKey="submittedAt"
            currentSortDir="desc"
            onSortChange={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Job IDs
    expect(screen.getAllByText('#101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#102').length).toBeGreaterThan(0);

    // Cached dataset name resolved
    expect(screen.getAllByText('Genomic Dataset Alpha').length).toBeGreaterThan(0);

    // Uncached dataset name falls back honestly
    expect(screen.getAllByText('Dataset #2').length).toBeGreaterThan(0);
  });

  it('triggers onSortChange when a sortable header is clicked', () => {
    const queryClient = createQueryClient();
    const mockSort = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <JobTable
            jobs={mockJobs}
            currentSortKey="submittedAt"
            currentSortDir="desc"
            onSortChange={mockSort}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const statusHeaders = screen.getAllByRole('button', { name: /Status/i });
    expect(statusHeaders[0]).toBeDefined();
    fireEvent.click(statusHeaders[0]!);
    expect(mockSort).toHaveBeenCalledWith('status');
  });

  it('renders empty state when jobs list is empty', () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <JobTable
            jobs={[]}
            currentSortKey="submittedAt"
            currentSortDir="desc"
            onSortChange={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('No Jobs Found')).toBeInTheDocument();
  });
});
