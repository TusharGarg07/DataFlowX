import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobStatusBadge } from '../components/JobStatusBadge';

describe('JobStatusBadge', () => {
  it('renders PENDING status badge correctly', () => {
    render(<JobStatusBadge status="PENDING" />);
    expect(screen.getByRole('status', { name: /Status: Pending/i })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders RUNNING status badge correctly', () => {
    render(<JobStatusBadge status="RUNNING" />);
    expect(screen.getByRole('status', { name: /Status: Running/i })).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders COMPLETED status badge correctly', () => {
    render(<JobStatusBadge status="COMPLETED" />);
    expect(screen.getByRole('status', { name: /Status: Completed/i })).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders FAILED status badge correctly', () => {
    render(<JobStatusBadge status="FAILED" />);
    expect(screen.getByRole('status', { name: /Status: Failed/i })).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
