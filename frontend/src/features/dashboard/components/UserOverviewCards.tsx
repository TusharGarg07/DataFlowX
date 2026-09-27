import { Database, Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserOverviewCardsProps {
  totalDatasets?: number;
  totalJobs?: number;
  isLoading?: boolean;
}

export function UserOverviewCards({
  totalDatasets,
  totalJobs,
  isLoading,
}: UserOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-9 h-9 bg-slate-200 rounded-xl" />
            </div>
            <div className="w-16 h-8 bg-slate-200 rounded mb-4" />
            <div className="w-28 h-4 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Your Datasets',
      value: totalDatasets ?? 0,
      icon: Database,
      iconBg: 'bg-indigo-50 text-indigo-600',
      to: '/datasets',
      linkText: 'Explore Datasets',
    },
    {
      label: 'Your Jobs',
      value: totalJobs ?? 0,
      icon: Briefcase,
      iconBg: 'bg-blue-50 text-blue-600',
      to: '/jobs',
      linkText: 'Explore Jobs',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
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

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                to={card.to}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition"
              >
                <span>{card.linkText}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
