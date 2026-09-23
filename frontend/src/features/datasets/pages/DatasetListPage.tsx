import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useDatasets, useUpdateDataset, useDeleteDataset } from '../queries';
import { DatasetTable } from '../components/DatasetTable';
import { DeleteDatasetDialog } from '../components/DeleteDatasetDialog';
import type { DatasetResponse, DatasetSortKey } from '../types';
import { useUrlState } from '../../../shared/hooks/useUrlState';
import { parseDatasetSort, formatDatasetSort, DEFAULT_SORT_KEY, DEFAULT_SORT_DIR } from '../lib/sort';
import { ApiError } from '../../../shared/api/ApiError';
import { Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export function DatasetListPage() {
  const { user } = useAuth();
  const { params, setParams } = useUrlState({ page: 0, size: 10 });

  const validatedSort = parseDatasetSort(params.sort);
  const concreteSortString = formatDatasetSort(validatedSort.key, validatedSort.dir);

  const { data, isLoading, error, refetch } = useDatasets({
    page: params.page,
    size: params.size,
    sort: concreteSortString,
  });

  const updateMutation = useUpdateDataset();
  const deleteMutation = useDeleteDataset();

  const [deletingDataset, setDeletingDataset] = useState<DatasetResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSortChange = (newKey: DatasetSortKey) => {
    let newDir: 'asc' | 'desc' = 'asc';
    if (validatedSort.key === newKey) {
      newDir = validatedSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      newDir = newKey === DEFAULT_SORT_KEY ? DEFAULT_SORT_DIR : 'asc';
    }
    setParams({ page: 0, sort: formatDatasetSort(newKey, newDir) });
  };

  const handleToggleArchive = async (dataset: DatasetResponse) => {
    const nextStatus = dataset.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await updateMutation.mutateAsync({
        id: dataset.id,
        body: {
          name: dataset.name,
          description: dataset.description,
          status: nextStatus,
        },
      });
    } catch {
      // Invalidation handles state
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDataset) return;
    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(deletingDataset.id);
      setDeletingDataset(null);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setDeleteError('You do not have permission to delete this dataset.');
        } else if (err.status === 500) {
          setDeleteError("Couldn't delete this dataset. If it has jobs, try archiving instead.");
        } else {
          setDeleteError(err.message || 'An unexpected error occurred while deleting.');
        }
      } else {
        setDeleteError("Couldn't delete this dataset. If it has jobs, try archiving instead.");
      }
    }
  };

  const totalPages = data?.totalPages || 0;
  const currentPage = params.page;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Datasets</h2>
          <p className="text-slate-500 text-sm">Manage and inspect your research datasets</p>
        </div>
        <Link
          to="/datasets/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Dataset</span>
        </Link>
      </div>

      {deleteError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{deleteError}</div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-xs font-semibold text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dataset Table */}
      <DatasetTable
        datasets={data?.content || []}
        userRole={user?.role}
        currentSortKey={validatedSort.key}
        currentSortDir={validatedSort.dir}
        onSortChange={handleSortChange}
        onToggleArchive={handleToggleArchive}
        onDelete={(dataset) => {
          setDeleteError(null);
          setDeletingDataset(dataset);
        }}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
      />

      {/* Pagination Footer */}
      {data && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-sm">
          <div className="text-slate-500 text-xs">
            Showing Page <span className="font-semibold text-slate-900">{currentPage + 1}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({data.totalElements} total items)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setParams({ page: Math.max(0, currentPage - 1) })}
              disabled={currentPage === 0 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setParams({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages - 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteDatasetDialog
        isOpen={Boolean(deletingDataset)}
        datasetName={deletingDataset?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingDataset(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
