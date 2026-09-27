import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from './api';
import { useAuth } from '../auth';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

export function useDashboardSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getDashboardSummary,
    enabled: user?.role === 'ADMIN',
    staleTime: 30 * 1000,
  });
}
