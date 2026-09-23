import { Link, useNavigate } from 'react-router-dom';
import { useCreateDataset } from '../queries';
import { DatasetForm } from '../components/DatasetForm';
import type { CreateDatasetRequest, UpdateDatasetRequest } from '../types';
import { ArrowLeft } from 'lucide-react';

export function DatasetCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateDataset();

  const handleSubmit = async (formData: CreateDatasetRequest | UpdateDatasetRequest) => {
    const createPayload = formData as CreateDatasetRequest;
    const created = await createMutation.mutateAsync(createPayload);
    navigate(`/datasets/${created.id}`, { replace: true });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Datasets</span>
        </Link>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Dataset</h2>
          <p className="text-slate-500 text-sm mt-1">
            Register a new research dataset for asynchronous processing
          </p>
        </div>

        <DatasetForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/datasets')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
