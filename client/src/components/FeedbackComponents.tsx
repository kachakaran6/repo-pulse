import React from 'react';

export const SkeletonRow: React.FC = () => {
  return (
    <div className="skeleton-row" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
      <div style={{ width: '180px', height: '14px', backgroundColor: 'var(--line)', borderRadius: '2px' }} />
      <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--line)', borderRadius: '2px' }} />
      <div style={{ width: '120px', height: '14px', backgroundColor: 'var(--line)', borderRadius: '2px' }} />
    </div>
  );
};

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  return (
    <div className="toast-notice" role="status" onClick={onDismiss} style={{ cursor: 'pointer' }}>
      {message}
    </div>
  );
};

interface ErrorBannerProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, actionText, onAction }) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'var(--chalk)',
        border: '1px solid var(--stale)',
        borderRadius: 'var(--r-sm)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
      }}
    >
      <span style={{ color: 'var(--stale)' }}>{message}</span>
      {actionText && onAction && (
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px' }}
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
