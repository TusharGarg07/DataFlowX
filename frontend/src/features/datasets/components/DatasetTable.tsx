import React from 'react';
import { Link } from 'react-router-dom';
import type { DatasetResponse, DatasetSortKey } from '../types';
import { formatDate } from '../../../shared/lib/format';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  ExternalLink,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface DatasetTableProps {
  datasets: DatasetResponse[];
  userRole?: 'USER' | 'ADMIN';
  currentSortKey: DatasetSortKey;
  currentSortDir: 'asc' | 'desc';
  onSortChange: (key: DatasetSortKey) => void;
  onEdit?: (dataset: DatasetResponse) => void;
  onToggleArchive?: (dataset: DatasetResponse) => void;
  onDelete?: (dataset: DatasetResponse) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function DatasetTable({
  datasets,
  userRole,
  currentSortKey,
  currentSortDir,
  onSortChange,
  onEdit,
  onToggleArchive,
  onDelete,
  isLoading = false,
  error = null,
  onRetry,
}: DatasetTableProps) {
  const handleSortHeader = (key: DatasetSortKey) => {
    onSortChange(key);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent, key: DatasetSortKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSortChange(key);
    }
  };

  const renderSortIcon = (key: DatasetSortKey) => {
    if (currentSortKey !== key) {
      return (
        <ArrowUpDown
          className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition"
          aria-hidden="true"
        />
      );
    }
    return currentSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
    );
  };

  const getAriaSort = (key: DatasetSortKey) => {
    if (currentSortKey !== key) return 'none';
    return currentSortDir === 'asc' ? 'ascending' : 'descending';
  };

  if (error) {
    return (
      <div role="alert" className="p-8 bg-white rounded-2xl border border-red-200 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load datasets</h3>
        <p className="text-sm text-slate-500 mb-4">{error.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
        role="status"
        aria-label="Loading datasets"
      >
        <div className="divide-y divide-slate-100 p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="flex items-center justify-between py-3 animate-pulse">
              <div className="space-y-2 flex-1 max-w-sm">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-20" />
              <div className="h-4 bg-slate-100 rounded w-24 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
          <Database className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No Datasets Found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          No research datasets are available in this view.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Datasets">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-6" aria-sort={getAriaSort('name')}>
                <button
                  type="button"
                  onClick={() => handleSortHeader('name')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'name')}
                  className="flex items-center gap-1.5 hover:text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 -ml-1"
                >
                  <span>Name</span>
                  {renderSortIcon('name')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4" aria-sort={getAriaSort('status')}>
                <button
                  type="button"
                  onClick={() => handleSortHeader('status')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'status')}
                  className="flex items-center gap-1.5 hover:text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 -ml-1"
                >
                  <span>Status</span>
                  {renderSortIcon('status')}
                </button>
              </th>
              {userRole === 'ADMIN' && (
                <th scope="col" className="py-3.5 px-4">
                  Owner ID
                </th>
              )}
              <th scope="col" className="py-3.5 px-4">
                Description
              </th>
              <th scope="col" className="py-3.5 px-4" aria-sort={getAriaSort('updatedAt')}>
                <button
                  type="button"
                  onClick={() => handleSortHeader('updatedAt')}
                  onKeyDown={(e) => handleHeaderKeyDown(e, 'updatedAt')}
                  className="flex items-center gap-1.5 hover:text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 -ml-1"
                >
                  <span>Updated At</span>
                  {renderSortIcon('updatedAt')}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {datasets.map((dataset) => (
              <tr key={dataset.id} className="hover:bg-slate-50/60 transition">
                <td className="py-4 px-6 font-semibold text-slate-900">
                  <Link
                    to={`/datasets/${dataset.id}`}
                    className="hover:text-brand-600 transition inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    <span>{dataset.name}</span>
                    <ExternalLink
                      className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition"
                      aria-hidden="true"
                    />
                  </Link>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      dataset.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                    role="status"
                    aria-label={`Status: ${dataset.status}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        dataset.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    {dataset.status}
                  </span>
                </td>
                {userRole === 'ADMIN' && (
                  <td className="py-4 px-4 font-mono text-xs text-slate-600">{dataset.ownerId}</td>
                )}
                <td className="py-4 px-4 text-slate-600 max-w-xs truncate">
                  {dataset.description || '—'}
                </td>
                <td className="py-4 px-4 text-slate-500 text-xs">{formatDate(dataset.updatedAt)}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/datasets/${dataset.id}`}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      title="View Details"
                      aria-label={`View ${dataset.name}`}
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(dataset)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        title="Edit Dataset"
                        aria-label={`Edit ${dataset.name}`}
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {onToggleArchive && (
                      <button
                        type="button"
                        onClick={() => onToggleArchive(dataset)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        title={dataset.status === 'ACTIVE' ? 'Archive Dataset' : 'Restore Dataset'}
                        aria-label={
                          dataset.status === 'ACTIVE'
                            ? `Archive ${dataset.name}`
                            : `Restore ${dataset.name}`
                        }
                      >
                        {dataset.status === 'ACTIVE' ? (
                          <Archive className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(dataset)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        title="Delete Dataset"
                        aria-label={`Delete ${dataset.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden divide-y divide-slate-100">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/datasets/${dataset.id}`}
                className="font-bold text-slate-900 text-base hover:text-brand-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                {dataset.name}
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  dataset.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                role="status"
                aria-label={`Status: ${dataset.status}`}
              >
                {dataset.status}
              </span>
            </div>

            {dataset.description && (
              <p className="text-xs text-slate-600 line-clamp-2">{dataset.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Updated: {formatDate(dataset.updatedAt)}</span>
              {userRole === 'ADMIN' && <span>Owner: {dataset.ownerId}</span>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-50">
              <Link
                to={`/datasets/${dataset.id}`}
                className="text-xs font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded p-1"
                aria-label={`View ${dataset.name}`}
              >
                View
              </Link>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(dataset)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded p-1"
                  aria-label={`Edit ${dataset.name}`}
                >
                  Edit
                </button>
              )}
              {onToggleArchive && (
                <button
                  type="button"
                  onClick={() => onToggleArchive(dataset)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded p-1"
                  aria-label={
                    dataset.status === 'ACTIVE'
                      ? `Archive ${dataset.name}`
                      : `Restore ${dataset.name}`
                  }
                >
                  {dataset.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(dataset)}
                  className="text-xs font-medium text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1"
                  aria-label={`Delete ${dataset.name}`}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
