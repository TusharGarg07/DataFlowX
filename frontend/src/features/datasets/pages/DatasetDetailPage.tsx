import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useDataset, useUpdateDataset, useDeleteDataset } from '../queries';
import { DatasetForm } from '../components/DatasetForm';
import { DeleteDatasetDialog } from '../components/DeleteDatasetDialog';
import { formatDate } from '../../../shared/lib/format';
import { ApiError } from '../../../shared/api/ApiError';
import type { CreateDatasetRequest, UpdateDatasetRequest } from '../types';
import { SubmitJobButton } from '../../jobs';
import {
  ArrowLeft,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Database,
} from 'lucide-react';

export function DatasetDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const datasetId = rawId ? parseInt(rawId, 10) : NaN;
  const isInvalidId = isNaN(datasetId) || datasetId < 1;

  const { data: dataset, isLoading, error } = useDataset(datasetId);

  const updateMutation = useUpdateDataset();
  const deleteMutation = useDeleteDataset();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isInvalidId) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Dataset ID</h2>
        <p className="text-sm text-slate-600 mb-6">
          The requested dataset identifier &quot;{rawId}&quot; is invalid.
        </p>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Datasets</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading dataset details...</p>
      </div>
    );
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dataset Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            The dataset with ID #{datasetId} does not exist or has been removed.
          </p>
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Datasets</span>
          </Link>
        </div>
      );
    }
    if (error.status === 403) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            You do not have permission to view this dataset.
          </p>
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Datasets</span>
          </Link>
        </div>
      );
    }
  }

  if (error || !dataset) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-red-200 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to load dataset</h2>
        <p className="text-sm text-slate-500 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Datasets</span>
        </Link>
      </div>
    );
  }

  const isOwnerOrAdmin = user?.role === 'ADMIN' || user?.id === dataset.ownerId;

  const handleInlineEditSubmit = async (formData: CreateDatasetRequest | UpdateDatasetRequest) => {
    const updatePayload = formData as UpdateDatasetRequest;
    await updateMutation.mutateAsync({
      id: dataset.id,
      body: updatePayload,
    });
    setIsEditing(false);
  };

  const handleToggleArchive = async () => {
    const nextStatus = dataset.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    await updateMutation.mutateAsync({
      id: dataset.id,
      body: {
        name: dataset.name,
        description: dataset.description,
        status: nextStatus,
      },
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(dataset.id);
      setIsDeleteDialogOpen(false);
      navigate('/datasets', { replace: true });
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Datasets</span>
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

      {/* Header Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{dataset.name}</h2>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              dataset.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataset.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            {dataset.status}
          </span>
        </div>

        {isOwnerOrAdmin && !isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            <SubmitJobButton datasetId={dataset.id} />
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => void handleToggleArchive()}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {dataset.status === 'ACTIVE' ? (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Card: Inline Edit vs View Mode */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {isEditing ? (
          <div>
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Dataset</h3>
              <p className="text-xs text-slate-500">Update dataset details inline</p>
            </div>
            <DatasetForm
              initialData={dataset}
              onSubmit={handleInlineEditSubmit}
              onCancel={() => setIsEditing(false)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Overview & Metadata
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 font-medium">Dataset ID</dt>
                  <dd className="font-mono text-slate-900 font-semibold">#{dataset.id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">Owner ID</dt>
                  <dd className="font-mono text-slate-900 font-semibold">{dataset.ownerId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">Created At</dt>
                  <dd className="text-slate-900">{formatDate(dataset.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">Last Updated</dt>
                  <dd className="text-slate-900">{formatDate(dataset.updatedAt)}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h3>
              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 text-sm text-slate-700 leading-relaxed min-h-[80px]">
                {dataset.description ? (
                  <p className="whitespace-pre-wrap">{dataset.description}</p>
                ) : (
                  <p className="text-slate-400 italic">No description provided for this dataset.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteDatasetDialog
        isOpen={isDeleteDialogOpen}
        datasetName={dataset.name}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
