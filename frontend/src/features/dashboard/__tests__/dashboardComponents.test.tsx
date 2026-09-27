import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSummaryCards } from '../components/AdminSummaryCards';
import { UserOverviewCards } from '../components/UserOverviewCards';
import { RecentJobsList } from '../components/RecentJobsList';
import type { JobResponse } from '../../jobs/types';
import type { DatasetResponse } from '../../datasets/types';

describe('Dashboard Components', () => {
  describe('AdminSummaryCards', () => {
    it('renders skeleton pulse elements when isLoading is true', () => {
      const { container } = render(<AdminSummaryCards isLoading={true} />);
      const pulses = container.querySelectorAll('.animate-pulse');
      expect(pulses.length).toBe(5);
    });

    it('renders default zeros when summary is undefined', () => {
      render(<AdminSummaryCards />);
      expect(screen.getByText('Total Datasets')).toBeInTheDocument();
      expect(screen.getByText('Pending Jobs')).toBeInTheDocument();
      expect(screen.getByText('Running Jobs')).toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
      expect(screen.getByText('Failed Jobs')).toBeInTheDocument();
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(5);
    });

    it('renders exactly the 5 real counts without unsupported metrics', () => {
      render(
        <AdminSummaryCards
          summary={{
            totalDatasets: 10,
            pendingJobs: 2,
            runningJobs: 3,
            completedJobs: 4,
            failedJobs: 1,
          }}
        />
      );
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('UserOverviewCards', () => {
    it('renders skeleton pulse elements when isLoading is true', () => {
      const { container } = render(
        <MemoryRouter>
          <UserOverviewCards isLoading={true} />
        </MemoryRouter>
      );
      const pulses = container.querySelectorAll('.animate-pulse');
      expect(pulses.length).toBe(2);
    });

    it('renders user totals and navigation links', () => {
      render(
        <MemoryRouter>
          <UserOverviewCards totalDatasets={12} totalJobs={34} />
        </MemoryRouter>
      );
      expect(screen.getByText('Your Datasets')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Explore Datasets')).toBeInTheDocument();

      expect(screen.getByText('Your Jobs')).toBeInTheDocument();
      expect(screen.getByText('34')).toBeInTheDocument();
      expect(screen.getByText('Explore Jobs')).toBeInTheDocument();
    });
  });

  describe('RecentJobsList', () => {
    it('renders loading skeleton when isLoading is true', () => {
      const queryClient = new QueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <RecentJobsList jobs={[]} isLoading={true} />
          </MemoryRouter>
        </QueryClientProvider>
      );
      const pulses = container.querySelectorAll('.animate-pulse');
      expect(pulses.length).toBe(5);
    });

    it('renders empty state when jobs array is empty', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <RecentJobsList jobs={[]} isLoading={false} />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(screen.getByText('No jobs submitted yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore datasets/i })).toBeInTheDocument();
    });

    it('resolves dataset name from cache or falls back to Dataset #id', () => {
      const queryClient = new QueryClient();
      // Seed cached detail for dataset 10
      queryClient.setQueryData<DatasetResponse>(['datasets', 'detail', 10], {
        id: 10,
        name: 'Genomic Variant Index',
        description: '',
        ownerId: 1,
        status: 'ACTIVE',
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      });

      const mockJobs: JobResponse[] = [
        {
          id: 501,
          datasetId: 10,
          status: 'RUNNING',
          progress: 55,
          submittedAt: '2026-09-26T12:00:00Z',
          startedAt: '2026-09-26T12:01:00Z',
          completedAt: null,
          errorMessage: null,
        },
        {
          id: 502,
          datasetId: 99,
          status: 'FAILED',
          progress: 20,
          submittedAt: '2026-09-26T11:00:00Z',
          startedAt: '2026-09-26T11:01:00Z',
          completedAt: '2026-09-26T11:02:00Z',
          errorMessage: 'Out of memory',
        },
      ];

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <RecentJobsList jobs={mockJobs} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verified cached name resolved
      expect(screen.getByText('Genomic Variant Index')).toBeInTheDocument();
      // Verified fallback used when not cached
      expect(screen.getByText('Dataset #99')).toBeInTheDocument();

      // Check job IDs and statuses
      expect(screen.getByText('#501')).toBeInTheDocument();
      expect(screen.getByText('#502')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
