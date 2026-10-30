import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, X, ChevronRight, ChevronLeft, Check, Command, CheckSquare, Layers } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { cn } from '@/lib/utils';

export const COACHMARKS_STORAGE_KEY = 'repopulse_coachmarks_dismissed_v4';

interface CoachmarkStep {
  id: 'command-palette' | 'triage-mode' | 'saved-views';
  title: string;
  description: string;
  targetSelector: string;
  shortcutHint?: string;
  icon: React.ReactNode;
}

const STEPS: CoachmarkStep[] = [
  {
    id: 'command-palette',
    title: 'Command Palette',
    description: 'Press ⌘K (or Ctrl+K) anywhere to jump to any repository, run actions, or navigate views instantly.',
    targetSelector: '[data-coachmark="command-palette"]',
    shortcutHint: '⌘K',
    icon: <Command size={14} className="text-neutral-12" />,
  },
  {
    id: 'triage-mode',
    title: 'Quiet Triage',
    description: 'Review cooling projects with single-key decisions: K to keep going, P to pause, and R to retire.',
    targetSelector: '[data-coachmark="triage-mode"]',
    shortcutHint: 'K · P · R',
    icon: <CheckSquare size={14} className="text-neutral-12" />,
  },
  {
    id: 'saved-views',
    title: 'Saved Views',
    description: 'Switch between Active Work, Cooling projects, and custom tag views with a single click in your sidebar.',
    targetSelector: '[data-coachmark="saved-views"]',
    shortcutHint: 'Views',
    icon: <Layers size={14} className="text-neutral-12" />,
  },
];

interface CoachmarksV4Props {
  forceShow?: boolean;
  onDismiss?: () => void;
}

export const CoachmarksV4: React.FC<CoachmarksV4Props> = ({ forceShow = false, onDismiss }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Check if dismissed previously
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    const isDismissed = localStorage.getItem(COACHMARKS_STORAGE_KEY) === 'true';
    if (!isDismissed) {
      // Delay slightly so layout stabilizes after page mount
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Update target rect on step change or resize
  const updateTargetPosition = useCallback(() => {
    if (!isVisible) return;
    const step = STEPS[currentStepIndex];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isVisible, currentStepIndex]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);
    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismissAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleDismissAll = () => {
    setIsVisible(false);
    localStorage.setItem(COACHMARKS_STORAGE_KEY, 'true');
    onDismiss?.();
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleDismissAll();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isVisible) return null;

  const currentStep = STEPS[currentStepIndex];
  if (!currentStep) return null;

  // Compute position relative to target if present
  let popoverStyle: React.CSSProperties = {};
  let isAnchored = false;

  if (targetRect && window.innerWidth >= 768) {
    // If target is in top bar (e.g. search)
    if (targetRect.top < 120) {
      popoverStyle = {
        position: 'fixed',
        top: Math.max(16, targetRect.bottom + 12),
        left: Math.max(16, Math.min(window.innerWidth - 340, targetRect.left - 40)),
        zIndex: 90,
      };
      isAnchored = true;
    }
    // If target is in sidebar (e.g. triage or saved views)
    else {
      popoverStyle = {
        position: 'fixed',
        top: Math.max(16, Math.min(window.innerHeight - 240, targetRect.top - 10)),
        left: Math.max(16, targetRect.right + 14),
        zIndex: 90,
      };
      isAnchored = true;
    }
  } else {
    // Fallback: bottom right or centered card
    popoverStyle = {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 90,
    };
  }

  return (
    <>
      {/* Target Pulsing Highlight Beacon (if anchored) */}
      {isAnchored && targetRect && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none z-50 rounded-xs ring-2 ring-neutral-12 ring-offset-2 ring-offset-neutral-1 transition-all duration-normal"
          style={{
            top: targetRect.top - 2,
            left: targetRect.left - 2,
            width: targetRect.width + 4,
            height: targetRect.height + 4,
          }}
        />
      )}

      {/* Floating Quiet Coachmark Card */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`Guide tip: ${currentStep.title}`}
        style={popoverStyle}
        className={cn(
          'w-[320px] max-w-[calc(100vw-32px)] p-4 bg-neutral-1 border border-neutral-6 text-neutral-12 rounded-xs shadow-elevation-3 font-sans animate-in fade-in zoom-in-95 duration-fast'
        )}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-4 pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-xs bg-neutral-3 border border-neutral-5">
              {currentStep.icon}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-tight text-neutral-12">
                {currentStep.title}
              </span>
              <span className="text-2xs font-mono text-neutral-8">
                Tip {currentStepIndex + 1} of {STEPS.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentStep.shortcutHint && (
              <span className="px-1.5 py-0.5 rounded-xs bg-neutral-3 border border-neutral-5 text-[10px] font-mono text-neutral-10">
                {currentStep.shortcutHint}
              </span>
            )}
            <button
              type="button"
              onClick={handleDismissAll}
              aria-label="Dismiss all tips"
              className="text-neutral-8 hover:text-neutral-12 p-1 rounded-xs hover:bg-neutral-3 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Description Body */}
        <p className="text-xs text-neutral-10 leading-relaxed font-sans mb-3.5">
          {currentStep.description}
        </p>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-1">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to tip ${idx + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-fast',
                  idx === currentStepIndex
                    ? 'w-4 bg-neutral-12'
                    : 'w-1.5 bg-neutral-5 hover:bg-neutral-8'
                )}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-7 px-2 text-2xs text-neutral-9 hover:text-neutral-12"
              >
                <ChevronLeft size={12} className="mr-0.5" />
                Back
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              className="h-7 px-2.5 text-2xs font-medium"
            >
              {currentStepIndex === STEPS.length - 1 ? (
                <>
                  <Check size={12} className="mr-1" />
                  Got it
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={12} className="ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
