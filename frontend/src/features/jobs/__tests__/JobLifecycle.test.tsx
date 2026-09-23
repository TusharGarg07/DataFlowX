import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobLifecycle } from '../components/JobLifecycle';
import type { JobResponse } from '../types';

describe('JobLifecycle', () => {
  it('renders Submitted -> Running -> Completed lifecycle when job completed successfully', () => {
    const mockJob: JobResponse = {
      id: 1,
      datasetId: 10,
      status: 'COMPLETED',
      progress: 100,
      submittedAt: '2026-09-23T10:00:00Z',
      startedAt: '2026-09-23T10:00:01Z',
      completedAt: '2026-09-23T10:00:02Z',
      errorMessage: null,
    };

    render(<JobLifecycle job={mockJob} />);

    expect(screen.getByText('Job Submitted')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText('Failure Reason')).not.toBeInTheDocument();
  });

  it('renders Submitted -> Running -> Failed lifecycle with error message when failed during running', () => {
    const mockJob: JobResponse = {
      id: 2,
      datasetId: 10,
      status: 'FAILED',
      progress: 40,
      submittedAt: '2026-09-23T10:00:00Z',
      startedAt: '2026-09-23T10:00:01Z',
      completedAt: '2026-09-23T10:00:02Z',
      errorMessage: 'Simulated processing failure',
    };

    render(<JobLifecycle job={mockJob} />);

    expect(screen.getByText('Job Submitted')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Processing Failed')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Failure Reason')).toBeInTheDocument();
    expect(screen.getByText('Simulated processing failure')).toBeInTheDocument();
  });

  it('renders direct Submitted -> Failed without fabricating Running when failed from PENDING', () => {
    const mockJob: JobResponse = {
      id: 3,
      datasetId: 10,
      status: 'FAILED',
      progress: 0,
      submittedAt: '2026-09-23T10:00:00Z',
      startedAt: null,
      completedAt: '2026-09-23T10:00:01Z',
      errorMessage: 'Validation failed before start',
    };

    render(<JobLifecycle job={mockJob} />);

    expect(screen.getByText('Job Submitted')).toBeInTheDocument();
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    expect(screen.getByText('Processing Failed')).toBeInTheDocument();
    expect(screen.getByText('Validation failed before start')).toBeInTheDocument();
  });
});
