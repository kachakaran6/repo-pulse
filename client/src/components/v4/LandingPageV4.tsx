import React, { useState, useEffect } from 'react';
import { CommitStripV4 } from './CommitStripV4.js';
import { Button } from './ui/Button.js';
import { Lock, ShieldCheck, Terminal, AlertCircle, Sparkles } from 'lucide-react';
import type { RepoStatus } from '../../types.js';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className="inline-block shrink-0"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface LandingPageV4Props {
  onGithubLogin: () => void;
  onDevLogin?: () => Promise<void>;
  onTryDemo?: () => void;
  devEnabled?: boolean;
  onNavigateLegal?: (type: 'privacy' | 'terms') => void;
  onOpenDesignTokens?: () => void;
  onOpenComponents?: () => void;
}

interface SampleRepo {
  name: string;
  status: RepoStatus;
  meta: string;
  is_private?: boolean;
  activity: { day: string; commits: number }[];
}

function generateSampleActivity(pattern: RepoStatus): { day: string; commits: number }[] {
  const result: { day: string; commits: number }[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayStr = d.toISOString().split('T')[0];
    let commits = 0;
    if (pattern === 'active' && (i % 3 === 0 || i < 7)) {
      commits = (i % 4) + 1;
    } else if (pattern === 'cooling' && i > 8 && i < 45 && i % 4 === 0) {
      commits = (i % 3) + 1;
    } else if (pattern === 'stale' && i > 25 && i < 60 && i % 7 === 0) {
      commits = (i % 2) + 1;
    } else if (pattern === 'dead' && i > 60 && i % 15 === 0) {
      commits = 1;
    }
    result.push({ day: dayStr, commits });
  }
  return result;
}

const SAMPLE_REPOS: SampleRepo[] = [
  {
    name: 'repopulse',
    status: 'active',
    meta: 'Last commit today · TypeScript',
    is_private: false,
    activity: generateSampleActivity('active'),
  },
  {
    name: 'core-backend',
    status: 'active',
    meta: 'Last commit 2 days ago · Go',
    is_private: true,
    activity: generateSampleActivity('active'),
  },
  {
    name: 'metrics-agent',
    status: 'cooling',
    meta: 'Last commit 9 days ago · Rust',
    is_private: false,
    activity: generateSampleActivity('cooling'),
  },
  {
    name: 'legacy-importer',
    status: 'stale',
    meta: 'Last commit 24 days ago · Python',
    is_private: true,
    activity: generateSampleActivity('stale'),
  },
  {
    name: 'archive-scripts',
    status: 'dead',
    meta: 'Last commit 78 days ago · Bash',
    is_private: false,
    activity: generateSampleActivity('dead'),
  },
];

export const LandingPageV4: React.FC<LandingPageV4Props> = ({
  onGithubLogin,
  onDevLogin,
  onTryDemo,
  devEnabled = false,
  onNavigateLegal,
  onOpenDesignTokens,
  onOpenComponents,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      if (errorParam === 'access_denied') {
        setErrorMessage("Sign in was cancelled on GitHub. You can try again whenever you're ready.");
      } else if (errorParam === 'invalid_oauth_state') {
        setErrorMessage('Session verification expired. Please sign in again.');
      } else if (errorParam === 'github_not_configured') {
        setErrorMessage('GitHub App credentials are not yet configured on this instance.');
      } else {
        setErrorMessage(`Authentication issue: ${errorParam}. Please try signing in again.`);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-1 text-neutral-12 flex flex-col justify-between font-sans selection:bg-neutral-4">
      {/* Top Quiet Bar */}
      <header className="border-b border-neutral-4 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-semibold tracking-tight text-neutral-12">
            RepoPulse
          </span>
          <span className="text-2xs font-mono text-neutral-8 px-1.5 py-0.5 rounded-xs border border-neutral-4">
            v4
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-9 font-sans">
          {onOpenDesignTokens && (
            <button
              type="button"
              onClick={onOpenDesignTokens}
              className="hover:text-neutral-12 transition-colors cursor-pointer"
            >
              Design Tokens
            </button>
          )}
          {onOpenComponents && (
            <button
              type="button"
              onClick={onOpenComponents}
              className="hover:text-neutral-12 transition-colors cursor-pointer"
            >
              Components
            </button>
          )}
        </div>
      </header>

      {/* Main 2-Column Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left Column: Headline, Action, Assurance Copy */}
        <div className="flex-1 space-y-6 max-w-xl">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 border border-heat-active/30 bg-heat-active/10 text-heat-active text-xs rounded-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-12 font-sans leading-[1.1]">
              A quiet ledger for your repositories.
            </h1>
            <p className="text-sm sm:text-base text-neutral-10 leading-relaxed font-sans">
              Group repositories by recent commit activity, triage cooling projects into Keep,
              Pause, or Retire, and maintain clarity over where your engineering attention goes.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="button"
              id="github-login-btn"
              onClick={onGithubLogin}
              className="h-10 px-5 bg-neutral-12 text-neutral-1 hover:bg-neutral-11 transition-colors duration-fast rounded-xs text-sm font-medium flex items-center gap-2.5 shadow-elevation-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 cursor-pointer"
            >
              <GithubIcon size={16} />
              <span>Continue with GitHub</span>
            </button>

            {/* Try with Demo Data */}
            {onTryDemo && (
              <button
                type="button"
                id="landing-try-demo-btn"
                onClick={onTryDemo}
                className="h-10 px-4 border border-neutral-5 hover:border-neutral-12 bg-neutral-2 hover:bg-neutral-3 text-neutral-11 hover:text-neutral-12 transition-colors duration-fast rounded-xs text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} className="text-neutral-12" />
                <span>Try with demo data</span>
              </button>
            )}

            {/* Dev Login: Dev builds only */}
            {devEnabled && onDevLogin && (
              <button
                type="button"
                id="dev-login-btn"
                onClick={onDevLogin}
                className="h-10 px-4 border border-neutral-5 hover:border-neutral-12 text-neutral-11 hover:text-neutral-12 transition-colors duration-fast rounded-xs text-xs font-mono flex items-center gap-2 cursor-pointer"
              >
                <Terminal size={13} />
                <span>Developer Mode</span>
              </button>
            )}
          </div>

          {/* Read-Only Assurance Copy */}
          <div className="flex items-start gap-2.5 pt-4 text-xs text-neutral-9 font-sans leading-normal">
            <ShieldCheck size={16} className="text-neutral-8 shrink-0 mt-0.5" />
            <p>
              Read-only access to the repositories you choose. We store commit counts and dates,
              never code or commit messages.
            </p>
          </div>
        </div>

        {/* Right Column: Static Preview of Overview with Sample Repos */}
        <div className="flex-1 w-full max-w-lg select-none">
          <div className="border border-neutral-4 bg-neutral-2/60 rounded-xs p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-2xs font-mono text-neutral-8 border-b border-neutral-4 pb-2">
              <span>REPOSITORY LEDGER</span>
              <span>Sample data</span>
            </div>

            {/* Sample Repos Rows */}
            <div className="divide-y divide-neutral-4">
              {SAMPLE_REPOS.map((sample) => {
                const statusColorMap = {
                  active: 'bg-heat-active',
                  cooling: 'bg-heat-cooling',
                  stale: 'bg-heat-stale',
                  dead: 'bg-heat-dead',
                };

                return (
                  <div key={sample.name} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-neutral-12 truncate">
                          {sample.name}
                        </span>
                        {sample.is_private && (
                          <Lock size={10} className="text-neutral-8 shrink-0" />
                        )}
                      </div>
                      <div className="text-2xs text-neutral-9 font-sans truncate mt-0.5">
                        {sample.meta}
                      </div>
                    </div>

                    <div className="w-[180px] sm:w-[220px] shrink-0">
                      <CommitStripV4
                        activity={sample.activity}
                        status={sample.status}
                        daysCount={90}
                        className="h-6"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-4 px-6 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between text-2xs text-neutral-8 font-sans gap-2">
        <div>
          <span>RepoPulse · Calibrated GitHub activity ledger</span>
        </div>
        <div className="flex items-center gap-4">
          {onNavigateLegal && (
            <>
              <button
                type="button"
                onClick={() => onNavigateLegal('privacy')}
                className="hover:text-neutral-12 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('terms')}
                className="hover:text-neutral-12 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
