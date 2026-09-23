import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobDetailPage } from '../pages/JobDetailPage';
import * as api from '../api';
import { ApiError } from '../../../shared/api/ApiError';
import type { JobResponse } from '../types';

vi.mock('../api');

const mockJob: JobResponse = {
  id: 42,
  datasetId: 7,
  status: 'RUNNING',
  progress: 60,
  submittedAt: '2026-09-23T10:00:00Z',
  startedAt: '2026-09-23T10:00:01Z',
  completedAt: null,
  errorMessage: null,
};

describe('JobDetailPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithRouter = (initialRoute: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/jobs" element={<div>Jobs List Page Mock</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders job details and execution lifecycle when job is successfully fetched', async () => {
    vi.mocked(api.getJob).mockResolvedValueOnce(mockJob);

    renderWithRouter('/jobs/42');

    await waitFor(() => {
      expect(screen.getByText('Job #42')).toBeInTheDocument();
    });

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
    expect(screen.getByText('Execution Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Auto-refreshing job status...')).toBeInTheDocument();
  });

  it('renders invalid ID page state when route parameter is non-numeric or less than 1', async () => {
    renderWithRouter('/jobs/invalid-id');

    expect(screen.getByText('Invalid Job ID')).toBeInTheDocument();
    expect(screen.getByText('Return to Jobs')).toBeInTheDocument();
    expect(api.getJob).not.toHaveBeenCalled();
  });

  it('renders 404 Not Found error state when API returns 404', async () => {
    vi.mocked(api.getJob).mockRejectedValueOnce(
      new ApiError(404, 'Job not found', 'NOT_FOUND')
    );

    renderWithRouter('/jobs/999');

    await waitFor(() => {
      expect(screen.getByText('Job Not Found')).toBeInTheDocument();
    });
    expect(screen.getByText(/The job with ID #999 does not exist/i)).toBeInTheDocument();
  });

  it('renders 403 Access Restricted state when API returns 403', async () => {
    vi.mocked(api.getJob).mockRejectedValueOnce(
      new ApiError(403, 'Not authorized to access this dataset or its jobs', 'FORBIDDEN')
    );

    renderWithRouter('/jobs/42');

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
    expect(screen.getByText(/You do not have permission to view this job/i)).toBeInTheDocument();
  });

  it('triggers manual refresh when Refresh button is clicked', async () => {
    vi.mocked(api.getJob).mockResolvedValue(mockJob);

    renderWithRouter('/jobs/42');

    await waitFor(() => {
      expect(screen.getByText('Job #42')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    expect(api.getJob).toHaveBeenCalledTimes(2);
  });
});
