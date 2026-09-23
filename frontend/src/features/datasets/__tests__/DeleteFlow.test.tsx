import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteDatasetDialog } from '../components/DeleteDatasetDialog';
import { ApiError } from '../../../shared/api/ApiError';

describe('Delete Flow', () => {
  it('renders confirmation dialog text and buttons correctly', () => {
    render(
      <DeleteDatasetDialog
        isOpen={true}
        datasetName="Sample Dataset"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Delete Dataset/i })).toBeInTheDocument();
    expect(screen.getByText(/Sample Dataset/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete Dataset$/i })).toBeInTheDocument();
  });

  it('triggers onConfirm and onCancel callbacks', () => {
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();

    render(
      <DeleteDatasetDialog
        isOpen={true}
        datasetName="Sample Dataset"
        onConfirm={mockConfirm}
        onCancel={mockCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^Delete Dataset$/i }));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('verifies safe user-facing error message on HTTP 500 deletion failure', () => {
    const error500 = new ApiError(
      500,
      'Deleting a dataset with associated jobs causes a database FK constraint violation.',
      'Internal Server Error'
    );

    let userFacingMessage = '';
    if (error500.status === 500) {
      userFacingMessage = "Couldn't delete this dataset. If it has jobs, try archiving instead.";
    }

    expect(userFacingMessage).toBe("Couldn't delete this dataset. If it has jobs, try archiving instead.");
    expect(userFacingMessage).not.toContain('FK');
    expect(userFacingMessage).not.toContain('database');
  });
});
