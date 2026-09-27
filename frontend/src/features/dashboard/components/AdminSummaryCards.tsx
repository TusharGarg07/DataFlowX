import {
  Database,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { DashboardSummaryResponse } from '../types';

interface AdminSummaryCardsProps {
  summary?: DashboardSummaryResponse;
  isLoading?: boolean;
}

export function AdminSummaryCards({ summary, isLoading }: AdminSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-9 h-9 bg-slate-200 rounded-xl" />
            </div>
            <div className="w-16 h-8 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalDatasets = summary?.totalDatasets ?? 0;
  const pendingJobs = summary?.pendingJobs ?? 0;
  const runningJobs = summary?.runningJobs ?? 0;
  const completedJobs = summary?.completedJobs ?? 0;
  const failedJobs = summary?.failedJobs ?? 0;

  const cards = [
    {
      label: 'Total Datasets',
      value: totalDatasets,
      icon: Database,
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Pending Jobs',
      value: pendingJobs,
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Running Jobs',
      value: runningJobs,
      icon: Play,
      iconBg: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Completed Jobs',
      value: completedJobs,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Failed Jobs',
      value: failedJobs,
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
