import React, { useState, useEffect } from 'react';
import type { VerdictLearningStats } from '@shared';
import {
  fetchVerdictLearningStats,
  resetVerdictPersonalization,
  triggerVerdictModelTraining,
} from '../../api.js';
import { Button } from './ui/Button.js';
import { Progress } from './ui/Progress.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog.js';
import { toast } from './ui/Toast.js';
import {
  Sparkles,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingUp,
  Brain,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export const VerdictLearningSettingsView: React.FC = () => {
  const [stats, setStats] = useState<VerdictLearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await fetchVerdictLearningStats();
      setStats(data);
    } catch (err: any) {
      toast.error('Failed to load verdict learning statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      const res = await triggerVerdictModelTraining();
      setStats(res.stats);
      if (res.stats.status === 'trained') {
        toast.success('Verdict model retrained successfully');
      } else {
        toast.info(
          `Recorded ${res.stats.decisionCount}/${res.stats.minDecisionsRequired} decisions. Need 30 to activate personalized ML.`
        );
      }
    } catch (err: any) {
      toast.error('Failed to retrain verdict model');
    } finally {
      setIsRetraining(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await resetVerdictPersonalization();
      setStats(res.stats);
      setShowResetModal(false);
      toast.success('Personalization reset. Falling back to calibrated Pulse Score rules.');
    } catch (err: any) {
      toast.error('Failed to reset personalization');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-8 font-mono animate-pulse">
        Loading verdict learning statistics...
      </div>
    );
  }

  const currentStats: VerdictLearningStats = stats || {
    status: 'cold_start',
    decisionCount: 0,
    agreementCount: 0,
    overrideCount: 0,
    agreementRate: 100,
    minDecisionsRequired: 30,
    trainedAt: null,
    topSignals: ['days_since_last_commit', 'twelve_week_trend', 'stars', 'hygiene_score'],
  };

  const isTrained = currentStats.status === 'trained';
  const progressPercent = Math.min(
    100,
    Math.round((currentStats.decisionCount / currentStats.minDecisionsRequired) * 100)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-normal font-sans text-neutral-12">
      {/* Overview Card */}
      <div className="border border-neutral-4 rounded-xs p-5 bg-neutral-1 space-y-4 shadow-elevation-1">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-12">Verdict Suggestions & Learning</h2>
              <span
                className={`inline-flex items-center gap-1 font-mono text-2xs px-2 py-0.5 rounded-full border ${
                  isTrained
                    ? 'border-verdict-keep-border text-verdict-keep-text bg-verdict-keep-bg'
                    : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                }`}
              >
                {isTrained ? <Sparkles size={10} /> : <Clock size={10} />}
                <span className="capitalize font-semibold">
                  {isTrained ? 'Personalized ML Active' : 'Pulse Score Cold Start'}
                </span>
              </span>
            </div>
            <p className="text-xs text-neutral-9 max-w-2xl leading-relaxed">
              RepoPulse predicts whether each cooling project should <strong>Keep going</strong>,{' '}
              <strong>Pause</strong>, or <strong>Retire</strong> based on your unique history rather than rigid
              static rules. Models train privately in-process with zero external API calls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetrain}
              disabled={isRetraining}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={isRetraining ? 'animate-spin' : ''} />
              <span>{isRetraining ? 'Retraining...' : 'Retrain Now'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetModal(true)}
              className="text-neutral-8 hover:text-red-500 gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* Accuracy & Agreement Rate Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Agreement Rate Callout */}
          <div className="border border-neutral-4 rounded-xs p-4 bg-neutral-2/40 space-y-1">
            <span className="text-2xs font-mono uppercase text-neutral-8 tracking-wider">
              Agreement Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-neutral-12">
                {currentStats.agreementRate}%
              </span>
              <span className="text-2xs text-neutral-9 font-sans">user alignment</span>
            </div>
            <p className="text-2xs text-neutral-8 pt-1">
              {currentStats.agreementCount} accepted · {currentStats.overrideCount} overridden
            </p>
          </div>

          {/* Decisions Logged */}
          <div className="border border-neutral-4 rounded-xs p-4 bg-neutral-2/40 space-y-1">
            <span className="text-2xs font-mono uppercase text-neutral-8 tracking-wider">
              Triage Decisions Logged
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-neutral-12">
                {currentStats.decisionCount}
              </span>
              <span className="text-2xs text-neutral-9 font-sans">
                / {currentStats.minDecisionsRequired} threshold
              </span>
            </div>
            <p className="text-2xs text-neutral-8 pt-1">
              {currentStats.decisionCount >= currentStats.minDecisionsRequired
                ? 'Sufficient data to maintain per-user ML weights'
                : `${currentStats.minDecisionsRequired - currentStats.decisionCount} more to unlock personalization`}
            </p>
          </div>

          {/* Model Status & Schedule */}
          <div className="border border-neutral-4 rounded-xs p-4 bg-neutral-2/40 space-y-1">
            <span className="text-2xs font-mono uppercase text-neutral-8 tracking-wider">
              Model Schedule
            </span>
            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span className="font-mono text-sm font-semibold text-neutral-12">
                {isTrained ? 'Nightly Automated' : 'Awaiting 30 Decisions'}
              </span>
            </div>
            <p className="text-2xs text-neutral-8 pt-1">
              {currentStats.trainedAt
                ? `Last trained ${new Date(currentStats.trainedAt).toLocaleDateString()}`
                : 'Using calibrated activity rules'}
            </p>
          </div>
        </div>

        {/* Cold Start / Activation Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-neutral-4/70">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-10 font-medium">
              {isTrained
                ? 'Personalized Model Active (Adapts incrementally with each decision)'
                : `Cold Start Progress (${currentStats.decisionCount}/${currentStats.minDecisionsRequired} decisions)`}
            </span>
            <span className="font-mono text-neutral-9 text-2xs">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} indicatorClassName={isTrained ? 'bg-verdict-keep-base' : 'bg-amber-500'} />
          {!isTrained && (
            <p className="text-2xs text-neutral-8 italic">
              Until 30 decisions are recorded, RepoPulse suggests verdicts using standard Pulse Score activity rules (Commit recency, 12-week velocity, and cadence).
            </p>
          )}
        </div>
      </div>

      {/* Feature Breakdown and Top Signals */}
      <div className="border border-neutral-4 rounded-xs p-5 bg-neutral-1 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-12 flex items-center gap-2">
          <Sliders size={14} />
          <span>Contributing Features & Signals</span>
        </h3>
        <p className="text-xs text-neutral-9 leading-relaxed">
          The feature extractor evaluates 12 signals for every repository at triage time:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          {[
            { label: 'Commit Recency', desc: 'Days since last commit pushed to default branch' },
            { label: '12-Week Velocity', desc: 'Linear regression momentum of weekly commits' },
            { label: 'Repository Age', desc: 'Time since repository inception on GitHub' },
            { label: 'Stars & Watchers', desc: 'Community external interest signals' },
            { label: 'Open Issues & PRs', desc: 'Pending backlog and active pull request load' },
            { label: 'Hygiene Score', desc: 'Composite repo hygiene (license, readme, health)' },
            { label: 'Milestone Finish Line', desc: 'Whether repository has a targeted goal date' },
            { label: 'Codebase Size', desc: 'Repository disk footprint in KB' },
            { label: 'Contributors Count', desc: 'Solo developer vs multi-author team' },
            { label: 'Ownership Profile', desc: 'Personal user repo vs organization project' },
            { label: 'Decision Recency', desc: 'Time elapsed since previous verdict transition' },
            { label: 'Language Category', desc: 'Ecosystem category (TypeScript, Go, Python, etc.)' },
          ].map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-xs border border-neutral-4 bg-neutral-2/30 space-y-0.5">
              <span className="font-mono text-2xs font-semibold text-neutral-11">{item.label}</span>
              <p className="text-[11px] text-neutral-8 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <span>Reset Personalization Model</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-10 leading-relaxed pt-2">
              This will purge your learned ML model weights and agreement tracking, returning RepoPulse to the default
              cold-start Pulse Score rules. Your existing repository triage decisions will remain intact.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="gap-1.5"
            >
              <RotateCcw size={13} />
              <span>{isResetting ? 'Resetting...' : 'Confirm Reset'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
