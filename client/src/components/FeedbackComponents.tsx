import React from 'react';
import { Loader2 } from 'lucide-react';

export const SkeletonRow: React.FC = () => {
  return (
    <div className="skeleton-row-item">
      <div className="skeleton-shimmer" style={{ width: '220px', height: '14px' }} />
      <div className="skeleton-shimmer" style={{ width: '90px', height: '14px' }} />
      <div className="skeleton-shimmer" style={{ width: '140px', height: '14px' }} />
    </div>
  );
};

export const OverviewSkeleton: React.FC<{ message?: string }> = ({
  message = 'Syncing your repositories and commit activity from GitHub...',
}) => {
  return (
    <div className="overview-skeleton" aria-busy="true" aria-live="polite">
      {/* Sync in-progress banner */}
      <div className="sync-progress-banner">
        <Loader2 size={18} strokeWidth={2} className="sync-spinner" aria-hidden="true" />
        <span>{message}</span>
      </div>

      {/* Pulsing Summary Sentence */}
      <div className="skeleton-shimmer skeleton-title" />

      {/* Pulsing Heat Bar */}
      <div className="skeleton-shimmer skeleton-heat-bar" />

      {/* Pulsing Legend */}
      <div className="skeleton-legend">
        <div className="skeleton-shimmer skeleton-legend-pill" />
        <div className="skeleton-shimmer skeleton-legend-pill" />
        <div className="skeleton-shimmer skeleton-legend-pill" />
        <div className="skeleton-shimmer skeleton-legend-pill" />
      </div>

      {/* Pulsing Search Bar */}
      <div className="skeleton-shimmer skeleton-search" />

      {/* 4 Status Groups Skeleton */}
      {['Active', 'Cooling', 'Stale', 'Dead'].map((group) => (
        <section key={group} style={{ marginBottom: '24px' }}>
          <div className="skeleton-shimmer skeleton-group-header" />
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </section>
      ))}
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
