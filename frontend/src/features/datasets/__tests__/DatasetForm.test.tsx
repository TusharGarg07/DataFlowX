import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DatasetForm } from '../components/DatasetForm';
import { ApiError } from '../../../shared/api/ApiError';
import type { DatasetResponse } from '../types';

describe('DatasetForm', () => {
  it('renders empty form for create mode', () => {
    render(<DatasetForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Dataset Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
    expect(screen.queryByLabelText(/Status/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Dataset/i })).toBeInTheDocument();
  });

  it('normalizes empty description to null on update', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockDataset: DatasetResponse = {
      id: 1,
      name: 'Existing Dataset',
      description: 'Old Description',
      ownerId: 7,
      status: 'ACTIVE',
      createdAt: '2026-09-22T10:00:00Z',
      updatedAt: '2026-09-22T10:00:00Z',
    };

    render(<DatasetForm initialData={mockDataset} onSubmit={mockSubmit} />);

    // Clear description
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Existing Dataset',
        description: null, // Normalized from empty string
        status: 'ACTIVE',
      });
    });
  });

  it('renders field validation errors from ApiError', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, 'name: must not be blank', 'VALIDATION_FAILED', { name: 'must not be blank' })
    );

    render(<DatasetForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/Dataset Name/i), { target: { value: 'Test Dataset' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Dataset/i }));

    expect(await screen.findByText('must not be blank')).toBeInTheDocument();
  });
});
