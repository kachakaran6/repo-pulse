import React, { useState, useEffect } from 'react';
import type { Repository, UserProfile, SummaryStats } from '../../types.js';
import { ShareView } from '../ShareView.js';
import { DigestViewV4 } from './DigestViewV4.js';
import { Share2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShareViewV4Props {
  user: UserProfile;
  repos: Repository[];
  stats: SummaryStats | null;
  summarySentence: string;
  onStartTriage?: () => void;
  defaultSubView?: 'card' | 'digest';
}

export const ShareViewV4: React.FC<ShareViewV4Props> = ({
  user,
  repos,
  stats,
  summarySentence,
  onStartTriage,
  defaultSubView,
}) => {
  const [subView, setSubView] = useState<'card' | 'digest'>(() => {
    if (defaultSubView) return defaultSubView;
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'digest') return 'digest';
    }
    return 'card';
  });

  // Keep URL in sync if desired
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (subView === 'digest') {
        url.searchParams.set('tab', 'digest');
      } else {
        url.searchParams.set('tab', 'share');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [subView]);

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Top Segmented Control / Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-4 pb-4 select-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-12 font-sans">
            {subView === 'card' ? 'Share Cards & Public Links' : 'Weekly Repository Digest'}
          </h1>
          <p className="text-xs text-neutral-9 font-sans mt-0.5">
            {subView === 'card'
              ? 'Generate momentum cards, save public snapshot links, and manage your shared cards.'
              : 'A quiet weekly editorial briefing of your engineering focus and momentum.'}
          </p>
        </div>

        {/* Sub-view switcher */}
        <div
          className="inline-flex rounded-xs border border-neutral-4 bg-neutral-2/70 p-0.5 self-start sm:self-auto shrink-0"
          role="tablist"
          aria-label="Share section views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'card'}
            onClick={() => setSubView('card')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-sans transition-all cursor-pointer touch-manipulation',
              subView === 'card'
                ? 'bg-neutral-1 text-neutral-12 font-semibold shadow-xs'
                : 'text-neutral-9 hover:text-neutral-12'
            )}
          >
            <Share2 size={13} />
            <span>Share Cards & Links</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === 'digest'}
            onClick={() => setSubView('digest')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-sans transition-all cursor-pointer touch-manipulation',
              subView === 'digest'
                ? 'bg-neutral-1 text-neutral-12 font-semibold shadow-xs'
                : 'text-neutral-9 hover:text-neutral-12'
            )}
          >
            <FileText size={13} />
            <span>Weekly Digest</span>
          </button>
        </div>
      </div>

      {/* Main Sub-view Content */}
      {subView === 'card' ? (
        <ShareView
          user={user}
          repos={repos}
          stats={stats}
          summarySentence={summarySentence}
        />
      ) : (
        <DigestViewV4
          user={user}
          repos={repos}
          stats={stats}
          summarySentence={summarySentence}
          onStartTriage={onStartTriage}
          onNavigateShare={() => setSubView('card')}
        />
      )}
    </div>
  );
};
