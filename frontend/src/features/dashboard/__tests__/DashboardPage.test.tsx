import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../pages/DashboardPage';
import * as dashboardApi from '../api';
import * as datasetApi from '../../datasets/api';
import * as jobApi from '../../jobs/api';
import * as AuthProviderModule from '../../auth/AuthProvider';
import type { DashboardSummaryResponse } from '../types';
import type { Page } from '../../../shared/api/types';
import type { DatasetResponse } from '../../datasets/types';
import type { JobResponse } from '../../jobs/types';

vi.mock('../api');
vi.mock('../../datasets/api');
vi.mock('../../jobs/api');
vi.mock('../../auth/AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../../auth/AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockAdminSummary: DashboardSummaryResponse = {
  totalDatasets: 14,
  pendingJobs: 3,
  runningJobs: 2,
  completedJobs: 8,
  failedJobs: 1,
};

const mockEmptyPage = <T,>(): Page<T> => ({
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 1,
  number: 0,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
});

describe('DashboardPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
      },
    });
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders ADMIN branch with AdminSummaryCards and all 5 real backend values', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(dashboardApi.getDashboardSummary).mockResolvedValueOnce(mockAdminSummary);
    vi.mocked(jobApi.getJobs).mockResolvedValueOnce(mockEmptyPage<JobResponse>());

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total Datasets')).toBeInTheDocument();
    });

    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    expect(screen.getByText('Pending Jobs')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Running Jobs')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    expect(screen.getByText('Failed Jobs')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledTimes(1);
  });

  it('renders USER branch with UserOverviewCards and never calls getDashboardSummary', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 2, username: 'alice', email: 'alice@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const datasetPage: Page<DatasetResponse> = {
      ...mockEmptyPage<DatasetResponse>(),
      totalElements: 27,
    };
    const jobCountPage: Page<JobResponse> = {
      ...mockEmptyPage<JobResponse>(),
      totalElements: 64,
    };
    const recentJobsPage: Page<JobResponse> = {
      ...mockEmptyPage<JobResponse>(),
      totalElements: 64,
      content: [
        {
          id: 101,
          datasetId: 4,
          status: 'RUNNING',
          progress: 45,
          submittedAt: '2026-09-24T12:00:00Z',
          startedAt: '2026-09-24T12:01:00Z',
          completedAt: null,
          errorMessage: null,
        },
      ],
    };

    vi.mocked(datasetApi.getDatasets).mockResolvedValue(datasetPage);
    vi.mocked(jobApi.getJobs)
      .mockResolvedValueOnce(jobCountPage) // For job count (size: 1)
      .mockResolvedValueOnce(recentJobsPage); // For recent jobs (size: 5)

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Your Datasets')).toBeInTheDocument();
    });

    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();

    expect(screen.getByText('Your Jobs')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();

    // Verify per-status breakdown cards are NOT present
    expect(screen.queryByText('Pending Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Running Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed Jobs')).not.toBeInTheDocument();

    // Verify admin endpoint was NEVER invoked
    expect(dashboardApi.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('renders recent jobs list with status and progress for user', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 2, username: 'alice', email: 'alice@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(datasetApi.getDatasets).mockResolvedValue({
      ...mockEmptyPage<DatasetResponse>(),
      totalElements: 3,
    });

    const recentJobs: JobResponse[] = [
      {
        id: 201,
        datasetId: 99,
        status: 'COMPLETED',
        progress: 100,
        submittedAt: '2026-09-25T14:30:00Z',
        startedAt: '2026-09-25T14:31:00Z',
        completedAt: '2026-09-25T14:35:00Z',
        errorMessage: null,
      },
    ];

    vi.mocked(jobApi.getJobs)
      .mockResolvedValueOnce({ ...mockEmptyPage<JobResponse>(), totalElements: 1 })
      .mockResolvedValueOnce({
        ...mockEmptyPage<JobResponse>(),
        totalElements: 1,
        content: recentJobs,
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('#201')).toBeInTheDocument();
    });

    expect(screen.getByText('Dataset #99')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders clear empty state when user has no recent jobs', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 3, username: 'bob', email: 'bob@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(datasetApi.getDatasets).mockResolvedValue(mockEmptyPage<DatasetResponse>());
    vi.mocked(jobApi.getJobs).mockResolvedValue(mockEmptyPage<JobResponse>());

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No jobs submitted yet')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Explore Datasets').length).toBeGreaterThan(0);
  });

  it('triggers manual refresh without calling admin endpoint when user clicks refresh', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 2, username: 'alice', email: 'alice@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(datasetApi.getDatasets).mockResolvedValue(mockEmptyPage<DatasetResponse>());
    vi.mocked(jobApi.getJobs).mockResolvedValue(mockEmptyPage<JobResponse>());

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Your Datasets')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh dashboard data/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      // Re-invoked datasets and jobs queries
      expect(datasetApi.getDatasets).toHaveBeenCalledTimes(2);
    });

    expect(dashboardApi.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('displays error alert with retry button when admin summary query fails', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(dashboardApi.getDashboardSummary).mockRejectedValueOnce(new Error('Internal Server Error'));
    vi.mocked(jobApi.getJobs).mockResolvedValue(mockEmptyPage<JobResponse>());

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to load platform summary: Internal Server Error/i)).toBeInTheDocument();

    // Verify retry functionality
    vi.mocked(dashboardApi.getDashboardSummary).mockResolvedValueOnce(mockAdminSummary);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Total Datasets')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });
});
