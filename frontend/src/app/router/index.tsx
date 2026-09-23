import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthLayout, AppShell } from '../../layouts';
import {
  LoginPage,
  RegisterPage,
  RequireAuth,
  RequireRole,
  useAuth,
} from '../../features/auth';
import {
  DatasetListPage,
  DatasetDetailPage,
  DatasetCreatePage,
} from '../../features/datasets';
import { JobListPage, JobDetailPage } from '../../features/jobs';
import { DashboardPagePlaceholder } from '../../features/dashboard/pages/DashboardPagePlaceholder';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in route:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-xl shadow-md border border-slate-200 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/datasets" replace />;
}

const router = createBrowserRouter([
  {
    element: (
      <RouteErrorBoundary>
        <AuthLayout />
      </RouteErrorBoundary>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <RouteErrorBoundary>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </RouteErrorBoundary>
    ),
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: '/datasets', element: <DatasetListPage /> },
      { path: '/datasets/new', element: <DatasetCreatePage /> },
      { path: '/datasets/:id', element: <DatasetDetailPage /> },
      { path: '/jobs', element: <JobListPage /> },
      { path: '/jobs/:id', element: <JobDetailPage /> },
      {
        path: '/dashboard',
        element: (
          <RequireRole role="ADMIN">
            <DashboardPagePlaceholder />
          </RequireRole>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}