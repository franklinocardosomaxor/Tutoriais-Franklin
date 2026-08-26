import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

interface BadgeProps {
  status: string;
  variant?: 'pending' | 'implemented' | 'viewed' | 'concluded' | 'consulted' | 'favorite' | 'studied';
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pendente', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  implemented: { label: 'Implementado', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  viewed: { label: 'Visualizado', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  concluded: { label: 'Concluído', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  consulted: { label: 'Consultado', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  favorite: { label: 'Favorito', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  studied: { label: 'Estudado', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export function StatusBadge({ status }: BadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        {icon}
      </div>
      <h3 className="text-slate-900 font-semibold mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
