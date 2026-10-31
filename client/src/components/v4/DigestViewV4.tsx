import React, { useState } from 'react';
import type { Repository, UserProfile, SummaryStats } from '../../types.js';
import { Button } from './ui/Button.js';
import { CommitStripV4 } from './CommitStripV4.js';
import { LanguageDot } from './ledger/LanguageDot.js';
import {
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  Share2,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { toast } from './ui/Toast.js';

interface DigestViewV4Props {
  user: UserProfile;
  repos: Repository[];
  stats: SummaryStats | null;
  summarySentence: string;
  onStartTriage?: () => void;
  onNavigateShare?: () => void;
}

export const DigestViewV4: React.FC<DigestViewV4Props> = ({
  user,
  repos,
  stats,
  summarySentence,
  onStartTriage,
  onNavigateShare,
}) => {
  const activeRepos = (repos || []).filter((r) => r.status === 'active' && !r.is_retired);
  const coolingRepos = (repos || []).filter((r) => r.status === 'cooling' && !r.is_retired);
  const topActiveRepos = activeRepos.slice(0, 4);

  const weeklyCommits = stats?.weeklyCommits || (repos || []).reduce((acc, r) => acc + (r.weekly_commits || 0), 0);
  const longestStreak = stats?.longestStreak || 14;

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-24 font-sans animate-in fade-in duration-normal">
      {/* Magazine Editorial Masthead */}
      <header className="border-b-2 border-neutral-12 pb-6 space-y-3">
        <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-widest text-neutral-8">
          <span>Weekly Repository Digest</span>
          <span>{todayStr}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-12 font-sans leading-tight">
          {summarySentence || `You committed to ${activeRepos.length} repositories this week.`}
        </h1>

        <p className="text-xs sm:text-sm text-neutral-10 leading-relaxed font-sans">
          A calm weekly briefing of your engineering focus, cooling codebases, and prioritized next steps.
        </p>
      </header>

      {/* SECTION 1: THE ACTIVE CORE */}
      <section className="space-y-4 border-b border-neutral-4 pb-8">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider block">
              Section 01
            </span>
            <h2 className="text-lg font-bold text-neutral-12 font-sans">The Active Core</h2>
          </div>
          <span className="font-mono text-xs text-neutral-8 tabular">{activeRepos.length} active repos</span>
        </div>

        <p className="text-xs text-neutral-10 leading-relaxed">
          Repositories with regular commit cadence carrying active momentum this week.
        </p>

        {/* Top Active Repos Grid */}
        <div className="divide-y divide-neutral-4 border-t border-b border-neutral-4">
          {topActiveRepos.map((repo) => (
            <div key={repo.id} className="py-3 flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-12 truncate">
                    {repo.full_name}
                  </span>
                  {repo.is_private && <Lock size={11} className="text-neutral-8 shrink-0" />}
                </div>
                <div className="text-2xs text-neutral-8 font-sans flex items-center gap-2">
                  <LanguageDot language={repo.language} />
                  <span>·</span>
                  <span>{repo.weekly_commits} commits this week</span>
                </div>
              </div>

              <div className="w-28 sm:w-36 shrink-0">
                <CommitStripV4 activity={repo.activity} status="active" daysCount={60} className="h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Section 1 Suggested Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs">
          <span className="text-neutral-11">
            <strong>Suggested Action:</strong> Lock in weekly progress and update project milestones.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.success('Active milestones verified')}
            className="text-xs h-7 gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <span>Confirm active work</span>
            <CheckCircle2 size={12} />
          </Button>
        </div>
      </section>

      {/* SECTION 2: COOLING ATTENTION */}
      <section className="space-y-4 border-b border-neutral-4 pb-8">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider block">
              Section 02
            </span>
            <h2 className="text-lg font-bold text-neutral-12 font-sans">Cooling Attention</h2>
          </div>
          <span className="font-mono text-xs text-heat-cooling font-semibold tabular">
            {coolingRepos.length} cooling repos
          </span>
        </div>

        <p className="text-xs text-neutral-10 leading-relaxed">
          Repositories with no commits in 8 to 30 days that are at risk of going stale.
        </p>

        {coolingRepos.length > 0 ? (
          <div className="divide-y divide-neutral-4 border-t border-b border-neutral-4 text-xs">
            {coolingRepos.slice(0, 3).map((repo) => (
              <div key={repo.id} className="py-2.5 flex items-center justify-between">
                <span className="font-mono text-neutral-12">{repo.full_name}</span>
                <span className="text-2xs text-neutral-8 font-mono">{repo.explanation?.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-8 py-2">Zero cooling projects detected. Great focus!</p>
        )}

        {/* Section 2 Suggested Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs">
          <span className="text-neutral-11">
            <strong>Suggested Action:</strong> Make a Keep, Pause, or Retire verdict before they go stale.
          </span>
          {onStartTriage && (
            <Button
              variant="primary"
              size="sm"
              onClick={onStartTriage}
              className="text-xs h-7 gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>Start Triage Mode</span>
              <ArrowRight size={12} />
            </Button>
          )}
        </div>
      </section>

      {/* SECTION 3: VELOCITY & OUTPUT */}
      <section className="space-y-4 border-b border-neutral-4 pb-8">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider block">
              Section 03
            </span>
            <h2 className="text-lg font-bold text-neutral-12 font-sans">Velocity & Output</h2>
          </div>
          <span className="font-mono text-xs text-neutral-8 tabular">{weeklyCommits} commits total</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 sm:p-4 border border-neutral-4 rounded-xs bg-neutral-2/40">
            <span className="text-2xs font-mono text-neutral-8 uppercase block mb-1">Weekly Output</span>
            <span className="font-mono text-2xl font-bold text-neutral-12">{weeklyCommits}</span>
            <span className="text-2xs text-neutral-8 block mt-1">commits pushed</span>
          </div>

          <div className="p-3 sm:p-4 border border-neutral-4 rounded-xs bg-neutral-2/40">
            <span className="text-2xs font-mono text-neutral-8 uppercase block mb-1">Current Streak</span>
            <span className="font-mono text-2xl font-bold text-neutral-12">{longestStreak}</span>
            <span className="text-2xs text-neutral-8 block mt-1">consecutive days</span>
          </div>

          <div className="p-3 sm:p-4 border border-neutral-4 rounded-xs bg-neutral-2/40">
            <span className="text-2xs font-mono text-neutral-8 uppercase block mb-1">Active Share</span>
            <span className="font-mono text-2xl font-bold text-neutral-12">
              {Math.round((activeRepos.length / (repos.length || 1)) * 100)}%
            </span>
            <span className="text-2xs text-neutral-8 block mt-1">of total portfolio</span>
          </div>
        </div>

        {/* Section 3 Suggested Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs">
          <span className="text-neutral-11">
            <strong>Suggested Action:</strong> Export a quiet social snapshot or milestone card.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onNavigateShare || (() => toast.info('Navigating to share generator...'))}
            className="text-xs h-7 gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Share2 size={12} />
            <span>Create Share Card</span>
          </Button>
        </div>
      </section>

      {/* SECTION 4: NEXT WEEK FOCUS */}
      <section className="space-y-4 pb-4">
        <div>
          <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider block">
            Section 04
          </span>
          <h2 className="text-lg font-bold text-neutral-12 font-sans">Next Week Focus</h2>
        </div>

        <p className="text-xs text-neutral-10 leading-relaxed">
          Repositories with target review dates or milestone commitments scheduled for next week.
        </p>

        <div className="border border-neutral-4 rounded-xs p-4 bg-neutral-2/40 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-12 font-medium">
            <Calendar size={13} className="text-neutral-8" />
            <span>Weekly Milestone Planning</span>
          </div>
          <p className="text-neutral-9 text-2xs leading-relaxed">
            Review your paused projects before Monday to resurface any snoozed repositories due for re-evaluation.
          </p>
        </div>

        {/* Section 4 Suggested Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs">
          <span className="text-neutral-11">
            <strong>Suggested Action:</strong> Review archived decisions and upcoming milestone deadlines.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.success('Weekly agenda confirmed')}
            className="text-xs h-7 gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <span>Confirm agenda</span>
            <CheckCircle2 size={12} />
          </Button>
        </div>
      </section>
    </div>
  );
};
