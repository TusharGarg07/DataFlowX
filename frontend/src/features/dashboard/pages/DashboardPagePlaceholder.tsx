import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../auth';

export function DashboardPagePlaceholder() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Dashboard</h2>
        <p className="text-slate-500 text-sm">System metrics and platform summary ({user?.role} view)</p>
      </div>

      <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Role-Aware Dashboard (Phase F5)</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Phase F2 Authentication + App Shell active. Admin summary cards and user overview metrics will be implemented in Phase F5.
        </p>
      </div>
    </div>
  );
}
