import React, { useState } from 'react';
import type { CreateDatasetRequest, DatasetResponse, DatasetStatus, UpdateDatasetRequest } from '../types';
import { ApiError } from '../../../shared/api/ApiError';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface DatasetFormProps {
  initialData?: DatasetResponse;
  onSubmit: (data: CreateDatasetRequest | UpdateDatasetRequest) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function DatasetForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DatasetFormProps) {
  const isEditMode = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<DatasetStatus>(initialData?.status || 'ACTIVE');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFieldErrors({ name: 'Name is required' });
      return;
    }

    try {
      if (isEditMode) {
        const descriptionNormalized = description.trim() === '' ? null : description.trim();
        const updatePayload: UpdateDatasetRequest = {
          name: trimmedName,
          description: descriptionNormalized,
          status,
        };
        await onSubmit(updatePayload);
      } else {
        const descriptionTrimmed = description.trim();
        const createPayload: CreateDatasetRequest = {
          name: trimmedName,
          description: descriptionTrimmed !== '' ? descriptionTrimmed : undefined,
        };
        await onSubmit(createPayload);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Dataset Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Genome Sequence Analysis 2026"
          disabled={isSubmitting}
          className={`w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none focus:ring-2 ${
            fieldErrors.name
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-200 focus:ring-brand-500 focus:border-brand-500'
          }`}
        />
        {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide optional details about dataset provenance, format, or notes..."
          disabled={isSubmitting}
          className={`w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none focus:ring-2 ${
            fieldErrors.description
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-200 focus:ring-brand-500 focus:border-brand-500'
          }`}
        />
        {fieldErrors.description && <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>}
      </div>

      {isEditMode && (
        <div>
          <label htmlFor="status" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DatasetStatus)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isEditMode ? 'Saving Changes...' : 'Creating Dataset...'}</span>
            </>
          ) : (
            <span>{isEditMode ? 'Save Changes' : 'Create Dataset'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
