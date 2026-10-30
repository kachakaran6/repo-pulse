import { toast } from 'sonner';

export interface ToastOptions {
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
  description?: string;
}

export function showAppToast(message: string, options?: ToastOptions) {
  if (options?.onUndo) {
    toast(message, {
      duration: options.duration || 4500,
      description: options.description,
      action: {
        label: options.undoLabel || 'Undo [Z]',
        onClick: options.onUndo,
      },
    });
  } else {
    toast.message(message, {
      duration: options?.duration || 3500,
      description: options?.description,
    });
  }
}
