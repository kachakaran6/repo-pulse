import React, { useEffect, useRef, useState } from 'react';
import type { Repository } from '../../types.js';
import { Pause, ArrowUpRight, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../v4/ui/Button.js';

export interface WipLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetRepo: Repository;
  currentKeepRepos: Repository[];
  wipLimit: number;
  onPauseInstead: (repoToPause: Repository, targetRepo: Repository) => Promise<void>;
  onRaiseLimit: (newLimit: number, targetRepo: Repository) => Promise<void>;
  onKeepAnyway: (targetRepo: Repository) => Promise<void>;
}

export const WipLimitDialog: React.FC<WipLimitDialogProps> = ({
  isOpen,
  onClose,
  targetRepo,
  currentKeepRepos,
  wipLimit,
  onPauseInstead,
  onRaiseLimit,
  onKeepAnyway,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape & trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isSubmitting) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handlePause = async (repoToPause: Repository) => {
    setIsSubmitting(true);
    setSubmittingAction(`pause-${repoToPause.id}`);
    setErrorMessage(null);
    try {
      await onPauseInstead(repoToPause, targetRepo);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to update repository status.');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleRaise = async () => {
    setIsSubmitting(true);
    setSubmittingAction('raise');
    setErrorMessage(null);
    try {
      const nextLimit = Math.min(20, Math.max(wipLimit + 1, currentKeepRepos.length + 1));
      await onRaiseLimit(nextLimit, targetRepo);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to raise limit.');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleOverride = async () => {
    setIsSubmitting(true);
    setSubmittingAction('override');
    setErrorMessage(null);
    try {
      await onKeepAnyway(targetRepo);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to record decision.');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wip-dialog-title"
      aria-describedby="wip-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg bg-neutral-1 border border-neutral-5 rounded-sm shadow-xl p-6 space-y-5 max-h-[90vh] flex flex-col font-sans animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="wip-dialog-title"
              className="text-base font-semibold text-neutral-12 tracking-tight"
            >
              You already have {currentKeepRepos.length} active {currentKeepRepos.length === 1 ? 'project' : 'projects'}.
            </h2>
            <p id="wip-dialog-desc" className="text-xs text-neutral-10 mt-1 leading-relaxed">
              Pause one to make room for <strong className="text-neutral-12 font-medium">{targetRepo.full_name}</strong>, or choose an option below.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1 text-neutral-8 hover:text-neutral-12 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message state */}
        {errorMessage && (
          <div role="alert" className="flex items-center gap-2 p-2.5 bg-heat-active/10 border border-heat-active/30 rounded-xs text-xs text-heat-active">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Current Keep Going Repos List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 max-h-56">
          <div className="text-2xs font-mono uppercase tracking-wider text-neutral-8 pb-1">
            Current active projects ({currentKeepRepos.length})
          </div>

          {currentKeepRepos.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-9 border border-dashed border-neutral-4 rounded-xs">
              No active projects found.
            </div>
          ) : (
            currentKeepRepos.map((repo) => {
              const isItemSubmitting = submittingAction === `pause-${repo.id}`;
              return (
                <div
                  key={repo.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 border border-neutral-4 rounded-xs bg-neutral-2/50 hover:bg-neutral-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-12 truncate font-mono">
                      {repo.full_name}
                    </p>
                    {repo.meta?.label && (
                      <span className="inline-block mt-0.5 text-2xs px-1.5 py-0.2 rounded-2xs bg-neutral-3 text-neutral-9 border border-neutral-4">
                        {repo.meta.label}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handlePause(repo)}
                    className="shrink-0 text-xs h-7 gap-1.5 font-sans"
                    aria-label={`Pause ${repo.full_name} to make room for ${targetRepo.full_name}`}
                  >
                    {isItemSubmitting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Pause size={12} className="text-neutral-8" />
                    )}
                    <span>Pause this instead</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Alternative Actions: Raise limit, Keep anyway, Cancel */}
        <div className="pt-3 border-t border-neutral-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-neutral-9 hover:text-neutral-12 order-3 sm:order-1"
          >
            Cancel
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRaise}
              disabled={isSubmitting}
              className="text-xs gap-1.5 h-8"
              title={`Increase limit to ${Math.min(20, Math.max(wipLimit + 1, currentKeepRepos.length + 1))}`}
            >
              {submittingAction === 'raise' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowUpRight size={13} />
              )}
              <span>Raise my limit</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOverride}
              disabled={isSubmitting}
              className="text-xs gap-1.5 h-8"
              title="Keep this project anyway and mark an override"
            >
              {submittingAction === 'override' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              <span>Keep anyway</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
