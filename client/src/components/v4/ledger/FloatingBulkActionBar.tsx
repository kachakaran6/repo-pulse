import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedNumber } from '../motion/AnimatedNumber.js';
import { Button } from '../ui/Button.js';
import { Check, Clock, Archive, Tag, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog.js';
import { Input } from '../ui/Input.js';

interface FloatingBulkActionBarProps {
  selectedCount: number;
  onBulkDecision: (decision: 'keep' | 'pause' | 'retire') => Promise<void>;
  onBulkTag?: (tag: string) => Promise<void>;
  onClearSelection: () => void;
}

export const FloatingBulkActionBar: React.FC<FloatingBulkActionBarProps> = ({
  selectedCount,
  onBulkDecision,
  onBulkTag,
  onClearSelection,
}) => {
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  if (selectedCount === 0) return null;

  const handleApplyTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBulkTag || !tagInput.trim()) return;
    setIsSubmitting(true);
    try {
      await onBulkTag(tagInput.trim());
      setShowTagModal(false);
      setTagInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={shouldReduceMotion ? false : { y: 20, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        exit={shouldReduceMotion ? undefined : { y: 20, opacity: 0, x: '-50%' }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        role="region"
        aria-label="Bulk repository actions"
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 left-1/2 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-12 text-neutral-1 rounded-xs shadow-elevation-3 border border-neutral-11 select-none max-w-[calc(100vw-2rem)] overflow-x-auto touch-manipulation"
      >
        {/* Count */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-2 border-r border-neutral-10 text-xs font-sans shrink-0">
          <span className="font-mono font-semibold tabular bg-neutral-10 px-1.5 py-0.5 rounded-xs text-neutral-1">
            <AnimatedNumber value={selectedCount} />
          </span>
          <span className="hidden sm:inline">selected</span>
        </div>

        {/* Verdict Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => onBulkDecision('keep')}
            aria-label={`Bulk keep ${selectedCount} selected repositories`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 min-h-[38px] sm:min-h-0 bg-neutral-11 hover:bg-neutral-10 text-neutral-1 rounded-xs text-xs font-mono transition-colors focus-visible:ring-2 focus-visible:ring-neutral-1 outline-none"
          >
            <Check size={12} />
            <span>Keep</span>
          </button>

          <button
            type="button"
            onClick={() => onBulkDecision('pause')}
            aria-label={`Bulk pause ${selectedCount} selected repositories`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 min-h-[38px] sm:min-h-0 bg-neutral-11 hover:bg-neutral-10 text-neutral-1 rounded-xs text-xs font-mono transition-colors focus-visible:ring-2 focus-visible:ring-neutral-1 outline-none"
          >
            <Clock size={12} />
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={() => onBulkDecision('retire')}
            aria-label={`Bulk retire ${selectedCount} selected repositories`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 min-h-[38px] sm:min-h-0 bg-neutral-11 hover:bg-neutral-10 text-neutral-1 rounded-xs text-xs font-mono transition-colors focus-visible:ring-2 focus-visible:ring-neutral-1 outline-none"
          >
            <Archive size={12} />
            <span>Retire</span>
          </button>

          {onBulkTag && (
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              aria-label={`Bulk add tag to ${selectedCount} selected repositories`}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 min-h-[38px] sm:min-h-0 bg-neutral-11 hover:bg-neutral-10 text-neutral-1 rounded-xs text-xs font-mono transition-colors focus-visible:ring-2 focus-visible:ring-neutral-1 outline-none"
            >
              <Tag size={12} />
              <span>Tag</span>
            </button>
          )}
        </div>

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Clear selected repositories"
          className="p-1.5 sm:p-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xs text-neutral-6 hover:text-neutral-1 transition-colors ml-1 focus-visible:ring-2 focus-visible:ring-neutral-1 outline-none"
          title="Clear selection"
        >
          <X size={14} />
        </button>
      </motion.div>

      {/* Bulk Tag Dialog */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Tag to {selectedCount} Repositories</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplyTag} className="space-y-4 pt-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. client, infra, experiment"
              autoFocus
              className="font-mono text-xs"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowTagModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !tagInput.trim()}>
                Apply Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
