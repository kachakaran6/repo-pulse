import React from 'react';
import type { Verdict, VerdictSuggestion } from '@shared';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover.js';
import { Sparkles, HelpCircle, ArrowUpRight, Check, Clock, Archive } from 'lucide-react';
import { cn } from '@/lib/utils.js';

interface VerdictSuggestionChipProps {
  suggestion: VerdictSuggestion;
  onApplyVerdict?: (verdict: Verdict) => void;
  compact?: boolean;
  className?: string;
}

export const VerdictSuggestionChip: React.FC<VerdictSuggestionChipProps> = ({
  suggestion,
  onApplyVerdict,
  compact = false,
  className = '',
}) => {
  const { verdict, confidence, probabilities, explanation, contributingFeatures, source, decisionCount } =
    suggestion;

  const confPercent = Math.round(confidence * 100);
  const isPersonalized = source === 'ml_model';

  const verdictStyles = {
    keep: {
      bg: 'bg-verdict-keep-bg',
      border: 'border-verdict-keep-border',
      text: 'text-verdict-keep-text',
      icon: Check,
      label: 'Keep',
    },
    pause: {
      bg: 'bg-verdict-pause-bg',
      border: 'border-verdict-pause-border',
      text: 'text-verdict-pause-text',
      icon: Clock,
      label: 'Pause',
    },
    retire: {
      bg: 'bg-verdict-retire-bg',
      border: 'border-verdict-retire-border',
      text: 'text-verdict-retire-text',
      icon: Archive,
      label: 'Retire',
    },
  }[verdict] || {
    bg: 'bg-neutral-3',
    border: 'border-neutral-5',
    text: 'text-neutral-11',
    icon: Sparkles,
    label: verdict,
  };

  const Icon = verdictStyles.icon;

  return (
    <Popover>
      <div className={cn('inline-flex items-center gap-1.5', className)}>
        {/* Suggestion Chip Button */}
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 border font-mono rounded-xs transition-colors cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-neutral-12',
              verdictStyles.bg,
              verdictStyles.border,
              verdictStyles.text,
              compact ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'
            )}
            title="Click to see why this verdict was suggested"
          >
            {isPersonalized ? (
              <Sparkles size={compact ? 10 : 12} className="shrink-0 text-amber-500" />
            ) : (
              <Icon size={compact ? 10 : 12} className="shrink-0" />
            )}
            <span className="font-semibold uppercase tracking-wider">{verdictStyles.label}</span>
            <span className="opacity-75 font-normal">({confPercent}%)</span>
            <span className="text-[10px] underline ml-0.5 opacity-90 hover:opacity-100 flex items-center">
              Why?
            </span>
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="start" className="w-80 p-4 space-y-3 font-sans text-xs">
        {/* Popover Header */}
        <div className="flex items-start justify-between gap-2 border-b border-neutral-5 pb-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-12">
              <Icon size={14} className={verdictStyles.text} />
              <span>Suggested: {verdictStyles.label}</span>
              <span className="font-mono text-2xs font-normal text-neutral-9">({confPercent}% confidence)</span>
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-neutral-9 font-mono">
              {isPersonalized ? (
                <span className="text-amber-500 flex items-center gap-1">
                  <Sparkles size={10} />
                  <span>Personalized ML Model</span>
                </span>
              ) : (
                <span className="text-neutral-9 flex items-center gap-1">
                  <Clock size={10} />
                  <span>Pulse Score Rules (Cold Start)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Probability Split */}
        <div className="space-y-1 bg-neutral-2 p-2 rounded-xs border border-neutral-4 font-mono text-[11px]">
          <div className="flex justify-between text-neutral-9 text-2xs">
            <span>Probabilities</span>
            <span>K: {Math.round(probabilities.keep * 100)}% · P: {Math.round(probabilities.pause * 100)}% · R: {Math.round(probabilities.retire * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-4 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${probabilities.keep * 100}%` }}
              className="bg-verdict-keep-base h-full"
              title={`Keep: ${Math.round(probabilities.keep * 100)}%`}
            />
            <div
              style={{ width: `${probabilities.pause * 100}%` }}
              className="bg-verdict-pause-base h-full"
              title={`Pause: ${Math.round(probabilities.pause * 100)}%`}
            />
            <div
              style={{ width: `${probabilities.retire * 100}%` }}
              className="bg-verdict-retire-base h-full"
              title={`Retire: ${Math.round(probabilities.retire * 100)}%`}
            />
          </div>
        </div>

        {/* Natural Language Explanation */}
        <p className="text-neutral-11 leading-relaxed bg-neutral-2/50 p-2 rounded-xs border border-neutral-4 italic">
          &ldquo;{explanation}&rdquo;
        </p>

        {/* Top Contributing Features */}
        {contributingFeatures && contributingFeatures.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-2xs font-mono uppercase tracking-wider text-neutral-8">
              Top Contributing Factors
            </span>
            <div className="space-y-1">
              {contributingFeatures.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-2xs py-1 px-1.5 rounded-xs bg-neutral-2 border border-neutral-4/60"
                >
                  <span className="text-neutral-11">{f.description}</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] px-1 rounded-[2px]',
                      f.impact === 'positive'
                        ? 'text-verdict-keep-text bg-verdict-keep-bg'
                        : 'text-verdict-retire-text bg-verdict-retire-bg'
                    )}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cold Start Notice */}
        {!isPersonalized && (
          <div className="text-2xs text-neutral-9 bg-neutral-2 p-2 rounded-xs border border-neutral-4">
            <span className="font-semibold text-neutral-11">Cold Start:</span> Rule-based suggestions are active until
            you reach 30 triage decisions ({decisionCount}/30 made). Once reached, RepoPulse automatically trains a model on your historical decisions.
          </div>
        )}

        {/* Quick Action Button */}
        {onApplyVerdict && (
          <button
            type="button"
            onClick={() => onApplyVerdict(verdict)}
            className={cn(
              'w-full py-1.5 px-3 rounded-xs text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border',
              verdictStyles.bg,
              verdictStyles.border,
              verdictStyles.text
            )}
          >
            <span>Accept {verdictStyles.label} suggestion</span>
            <ArrowUpRight size={13} />
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};
