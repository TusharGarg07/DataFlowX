import { Outlet } from 'react-router-dom';
import { Zap, Database, Cpu, Search } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      {/* Left hero panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0B1120] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">DataFlowX</span>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Process. Discover. Advance.
          </h2>
          <p className="text-slate-400 text-base max-w-md leading-relaxed mb-8">
            High-performance asynchronous research data processing platform with deterministic job lifecycle tracking.
          </p>

          {/* Process Breadcrumb Graphic */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-500" />
                <span>Data</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Processing</span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span>Discovery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 border-t border-slate-800/80 pt-6">
          DataFlowX Architecture Platform • Locked Contract Edition
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        {/* Mobile Header Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-400 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">DataFlowX</span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
