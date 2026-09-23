import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserRole } from './types';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children?: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

interface RequireRoleProps {
  role: UserRole;
  children?: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (user?.role !== role) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-card border border-slate-200 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 mb-6">
          You do not have permission to access this area ({role} role required).
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
