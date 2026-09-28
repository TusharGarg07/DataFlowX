import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface DeleteDatasetDialogProps {
  isOpen: boolean;
  datasetName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteDatasetDialog({
  isOpen,
  datasetName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteDatasetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      if (!dialogNode.open) {
        dialogNode.showModal();
      }
      // Direct focus to Cancel button safely
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 0);
    } else {
      if (dialogNode.open) {
        dialogNode.close();
      }
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
        previouslyFocusedElementRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (!isDeleting) {
        onCancel();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onCancel();
      }
    };

    dialogNode.addEventListener('cancel', handleCancel);
    dialogNode.addEventListener('keydown', handleKeyDown);
    return () => {
      dialogNode.removeEventListener('cancel', handleCancel);
      dialogNode.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, isDeleting]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      className="fixed inset-0 z-50 p-0 m-auto bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs max-w-md w-full rounded-2xl shadow-2xl border-0 overflow-hidden"
    >
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
              Delete Dataset
            </h3>
            <p id="delete-dialog-desc" className="text-sm text-slate-600 mt-1">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">&quot;{datasetName}&quot;</span>? This
              action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Dataset</span>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
