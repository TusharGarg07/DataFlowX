import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DatasetTable } from '../components/DatasetTable';
import type { DatasetResponse } from '../types';

const mockDatasets: DatasetResponse[] = [
  {
    id: 1,
    name: 'Alpha Dataset',
    description: 'First dataset',
    ownerId: 7,
    status: 'ACTIVE',
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
  },
  {
    id: 2,
    name: 'Beta Dataset',
    description: null,
    ownerId: 8,
    status: 'ARCHIVED',
    createdAt: '2026-09-22T11:00:00Z',
    updatedAt: '2026-09-22T11:00:00Z',
  },
];

describe('DatasetTable', () => {
  it('renders dataset rows correctly for USER role', () => {
    render(
      <MemoryRouter>
        <DatasetTable
          datasets={mockDatasets}
          userRole="USER"
          currentSortKey="createdAt"
          currentSortDir="desc"
          onSortChange={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Alpha Dataset').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta Dataset').length).toBeGreaterThan(0);
    expect(screen.queryByText('Owner ID')).not.toBeInTheDocument(); // Hidden for USER
  });

  it('renders Owner ID column for ADMIN role', () => {
    render(
      <MemoryRouter>
        <DatasetTable
          datasets={mockDatasets}
          userRole="ADMIN"
          currentSortKey="createdAt"
          currentSortDir="desc"
          onSortChange={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Owner ID')).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('triggers onSortChange when header is clicked', () => {
    const mockSort = vi.fn();
    render(
      <MemoryRouter>
        <DatasetTable
          datasets={mockDatasets}
          userRole="USER"
          currentSortKey="createdAt"
          currentSortDir="desc"
          onSortChange={mockSort}
        />
      </MemoryRouter>
    );

    const nameHeaderButtons = screen.getAllByRole('button', { name: /Name/i });
    expect(nameHeaderButtons[0]).toBeDefined();
    fireEvent.click(nameHeaderButtons[0]!);
    expect(mockSort).toHaveBeenCalledWith('name');
  });

  it('renders empty state when datasets array is empty', () => {
    render(
      <MemoryRouter>
        <DatasetTable
          datasets={[]}
          userRole="USER"
          currentSortKey="createdAt"
          currentSortDir="desc"
          onSortChange={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('No Datasets Found')).toBeInTheDocument();
  });
});
