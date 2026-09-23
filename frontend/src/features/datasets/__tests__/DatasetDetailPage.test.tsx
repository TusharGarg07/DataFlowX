import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DatasetDetailPage } from '../pages/DatasetDetailPage';
import * as AuthProviderModule from '../../auth/AuthProvider';
import * as datasetQueries from '../queries';
import { ApiError } from '../../../shared/api/ApiError';
import type { DatasetResponse } from '../types';

vi.mock('../../auth/AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../../auth/AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../queries', async () => {
  const actual = await vi.importActual<typeof datasetQueries>('../queries');
  return {
    ...actual,
    useDataset: vi.fn(),
    useUpdateDataset: vi.fn(),
    useDeleteDataset: vi.fn(),
  };
});

const mockDataset: DatasetResponse = {
  id: 42,
  name: 'Genome Sample A',
  description: 'Sample description text',
  ownerId: 7,
  status: 'ACTIVE',
  createdAt: '2026-09-22T10:00:00Z',
  updatedAt: '2026-09-22T10:00:00Z',
};

describe('DatasetDetailPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 7, username: 'johndoe', email: 'john@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(datasetQueries.useDataset).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof datasetQueries.useDataset>);
    vi.mocked(datasetQueries.useUpdateDataset).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof datasetQueries.useUpdateDataset>);
    vi.mocked(datasetQueries.useDeleteDataset).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof datasetQueries.useDeleteDataset>);
  });

  it('renders invalid ID page state when route parameter is non-numeric or less than 1', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/datasets/invalid-id']}>
          <Routes>
            <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Invalid Dataset ID')).toBeInTheDocument();
  });

  it('renders dataset detail overview and toggles inline edit mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/datasets/42']}>
          <Routes>
            <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Genome Sample A')).toBeInTheDocument();
    expect(screen.getByText('Sample description text')).toBeInTheDocument();

    // Click Edit to toggle inline edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    expect(screen.getByText('Edit Dataset')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();

    // Cancel inline edit mode
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText('Edit Dataset')).not.toBeInTheDocument();
  });

  it('renders 403 Access Restricted view when user lacks authorization', () => {
    vi.mocked(datasetQueries.useDataset).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError(403, 'Forbidden', 'FORBIDDEN'),
    } as unknown as ReturnType<typeof datasetQueries.useDataset>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/datasets/42']}>
          <Routes>
            <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });

  it('renders 404 Dataset Not Found view when dataset does not exist', () => {
    vi.mocked(datasetQueries.useDataset).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError(404, 'Dataset not found', 'NOT_FOUND'),
    } as unknown as ReturnType<typeof datasetQueries.useDataset>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/datasets/42']}>
          <Routes>
            <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Dataset Not Found')).toBeInTheDocument();
  });
});
