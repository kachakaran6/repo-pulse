import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const SkeletonRow: React.FC = () => {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      <Skeleton className="h-3.5 w-52 max-w-[40%]" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="ml-auto h-7 w-full max-w-md" />
    </div>
  );
};

export const OverviewSkeleton: React.FC<{ message?: string }> = ({
  message = 'Syncing your repositories and commit activity from GitHub...',
}) => {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>{message}</span>
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      {['Active', 'Cooling', 'Stale', 'Dead'].map((group) => (
        <section key={group}>
          <Skeleton className="mb-2 h-4 w-32" />
          <div className="border-t border-border">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </section>
      ))}
    </div>
  );
};

/** @deprecated Use showAppToast from lib/toast */
export const Toast: React.FC<{ message: string; onDismiss: () => void }> = () => null;

interface ErrorBannerProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, actionText, onAction }) => {
  return (
    <Alert variant="destructive" className="mb-4 border-heat-stale/40 bg-surface text-foreground">
      <AlertTitle className="sr-only">Error</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {actionText && onAction && (
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
