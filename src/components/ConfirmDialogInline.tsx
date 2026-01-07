/**
 * Phase 5A: Inline Confirmation Dialog
 * 
 * Replaces browser-native confirm() with inline UI.
 */

import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogInlineProps {
  isOpen: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialogInline({
  isOpen,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogInlineProps) {
  if (!isOpen) return null;

  const getStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-900',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${styles.bg} border rounded-lg shadow-xl max-w-md w-full p-6 ${styles.text}`}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
          <p className="flex-1 font-medium">{message}</p>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} px-4 py-2 font-medium rounded-lg transition-colors min-h-[44px]`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


