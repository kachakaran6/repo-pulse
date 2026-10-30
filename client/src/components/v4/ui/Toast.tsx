import React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      position="bottom-left"
      toastOptions={{
        duration: 4000,
        className:
          '!bg-neutral-12 !text-neutral-1 !border !border-neutral-8 !rounded-sm !p-3 !text-xs !font-sans !shadow-popover',
      }}
    />
  );
};

export const toast = {
  success: (message: string, options?: { description?: string }) => {
    sonnerToast.success(message, {
      description: options?.description,
      style: {
        backgroundColor: 'var(--neutral-12)',
        color: 'var(--neutral-1)',
        borderColor: 'var(--neutral-8)',
      },
    });
  },
  error: (message: string, options?: { description?: string }) => {
    sonnerToast.error(message, {
      description: options?.description,
      style: {
        backgroundColor: 'var(--neutral-12)',
        color: 'var(--activity-5)',
        borderColor: 'var(--activity-5)',
      },
    });
  },
  info: (message: string, options?: { description?: string }) => {
    sonnerToast(message, {
      description: options?.description,
      style: {
        backgroundColor: 'var(--neutral-12)',
        color: 'var(--neutral-1)',
        borderColor: 'var(--neutral-8)',
      },
    });
  },
  undo: (message: string, onUndo: () => void) => {
    sonnerToast(message, {
      action: {
        label: 'Undo [Z]',
        onClick: onUndo,
      },
      style: {
        backgroundColor: 'var(--neutral-12)',
        color: 'var(--neutral-1)',
        borderColor: 'var(--neutral-8)',
      },
    });
  },
};
