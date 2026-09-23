import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubmitJobButton } from '../components/SubmitJobButton';
import * as api from '../api';
import { ApiError } from '../../../shared/api/ApiError';
import type { JobResponse } from '../types';

vi.mock('../api');

const mockSubmittedJob: JobResponse = {
  id: 777,
  datasetId: 10,
  status: 'PENDING',
  progress: 0,
  submittedAt: '2026-09-23T12:00:00Z',
  startedAt: null,
  completedAt: null,
  errorMessage: null,
};

describe('SubmitJobButton Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderButton = (datasetId: number) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SubmitJobButton datasetId={datasetId} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('submits job and displays success message with link to job details', async () => {
    vi.mocked(api.submitJob).mockResolvedValueOnce(mockSubmittedJob);

    renderButton(10);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Job #777 submitted — status PENDING.')).toBeInTheDocument();
    });

    expect(api.submitJob).toHaveBeenCalledWith(10);
    const viewJobLink = screen.getByRole('link', { name: /View Job/i });
    expect(viewJobLink).toHaveAttribute('href', '/jobs/777');
  });

  it('handles 403 Forbidden error with clear user message', async () => {
    vi.mocked(api.submitJob).mockRejectedValueOnce(
      new ApiError(403, 'Not authorized to access this dataset or its jobs', 'FORBIDDEN')
    );

    renderButton(10);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('You do not have permission to submit jobs for this dataset.')
      ).toBeInTheDocument();
    });
  });

  it('handles 404 Not Found error when dataset does not exist', async () => {
    vi.mocked(api.submitJob).mockRejectedValueOnce(
      new ApiError(404, 'Dataset not found', 'NOT_FOUND')
    );

    renderButton(999);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Dataset not found. Cannot submit job.')).toBeInTheDocument();
    });
  });
});
