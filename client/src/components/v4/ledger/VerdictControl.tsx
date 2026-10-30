import React, { useState } from 'react';
import type { DecisionType } from '../../../types.js';
import { Check, Clock, Archive } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from '../ui/Toast.js';

interface VerdictControlProps {
  currentVerdict?: DecisionType | null;
  onDecision: (decision: 'keep' | 'pause' | 'retire') => Promise<void> | void;
  repoName?: string;
  size?: 'sm' | 'xs';
  className?: string;
}

export const VerdictControl: React.FC<VerdictControlProps> = ({
  currentVerdict,
  onDecision,
  repoName = 'repo',
  size = 'xs',
  className = '',
}) => {
  const [optimisticVerdict, setOptimisticVerdict] = useState<DecisionType | null | undefined>(
    currentVerdict
  );
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    setOptimisticVerdict(currentVerdict);
  }, [currentVerdict]);

  const handleSelect = async (e: React.MouseEvent, decision: 'keep' | 'pause' | 'retire') => {
    e.stopPropagation();
    if (optimisticVerdict === decision) return;

    setOptimisticVerdict(decision);

    const actionLabel = decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused' : 'Retired';
    if (repoName) {
      toast.info(`${actionLabel} ${repoName}`);
    }

    try {
      await onDecision(decision);
    } catch {
      setOptimisticVerdict(currentVerdict);
      toast.error('Failed to update verdict');
    }
  };

  const isXs = size === 'xs';

  const options: { id: 'keep' | 'pause' | 'retire'; label: string; icon: typeof Check; activeClass: string }[] = [
    {
      id: 'keep',
      label: 'Keep',
      icon: Check,
      activeClass: 'text-verdict-keep-text border-verdict-keep-border/60 bg-verdict-keep-bg/40',
    },
    {
      id: 'pause',
      label: 'Pause',
      icon: Clock,
      activeClass: 'text-verdict-pause-text border-verdict-pause-border/60 bg-verdict-pause-bg/40',
    },
    {
      id: 'retire',
      label: 'Retire',
      icon: Archive,
      activeClass: 'text-verdict-retire-text border-verdict-retire-border/60 bg-verdict-retire-bg/40',
    },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-xs border border-neutral-4 bg-neutral-2/70 p-0.5 select-none relative ${className}`}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Repository triage verdict"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = optimisticVerdict === opt.id;

        return (
          <motion.button
            key={opt.id}
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSelect(e, opt.id)}
            title={`${opt.label} repository`}
            aria-pressed={isActive}
            aria-label={`Mark ${repoName} as ${opt.label}`}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={`relative inline-flex items-center gap-1 rounded-xs font-mono transition-colors duration-fast cursor-pointer z-10 touch-target-expand outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 ${
              isXs ? 'px-2 py-1 sm:py-0.5 text-2xs min-h-[36px] sm:min-h-0' : 'px-2.5 py-1.5 sm:py-1 text-xs min-h-[40px] sm:min-h-0'
            } ${
              isActive
                ? `${opt.activeClass} font-semibold shadow-subtle border`
                : 'text-neutral-9 hover:text-neutral-12 hover:bg-neutral-3/50 border border-transparent'
            }`}
          >
            {isActive && !shouldReduceMotion && (
              <motion.span
                layoutId={`verdict-pill-${repoName}`}
                className="absolute inset-0 bg-neutral-1 rounded-xs -z-10 shadow-xs"
                transition={{
                  type: 'tween',
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            )}
            <Icon size={isXs ? 11 : 13} className={isActive ? 'stroke-[2.5]' : ''} />
            <span>{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
