import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Check, ArrowRight, ExternalLink } from 'lucide-react';
import type { Repository } from '../types.js';
import * as api from '../api.js';

interface WelcomeViewProps {
  onComplete: () => void;
  onStartTriage: () => void;
  repos: Repository[];
  onRefreshRepos: () => Promise<void>;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onComplete,
  onStartTriage,
  repos,
  onRefreshRepos,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ read: number; total: number }>({ read: 0, total: 0 });
  const [appUrl, setAppUrl] = useState<string>('https://github.com/apps/repopulse');

  useEffect(() => {
    api.fetchAuthStatus().then((status) => {
      if (status.appUrl) {
        setAppUrl(status.appUrl);
      }
    }).catch(() => {});
  }, []);

  // Compute breakdown from repos
  const totalRepos = repos.length;
  const privateCount = repos.filter((r) => r.is_private).length;
  const publicCount = totalRepos - privateCount;
  const orgs = new Set(
    repos.filter((r) => r.owner_type === 'Organization' || r.relationship === 'organization')
      .map((r) => r.owner_login)
  );
  const orgCount = orgs.size;

  const coolingOrStaleCount = repos.filter(
    (r) => (r.status === 'cooling' || r.status === 'stale') && !r.meta?.decision
  ).length;

  const handleStartSync = async () => {
    setCurrentStep(2);
    setIsSyncing(true);
    setSyncProgress({ read: 0, total: totalRepos || 20 });

    try {
      // Simulate progress ticks while running live sync
      const timer = setInterval(() => {
        setSyncProgress((prev) => {
          const next = prev.read + Math.floor(Math.random() * 8) + 3;
          const total = prev.total || 50;
          return { read: Math.min(next, total), total };
        });
      }, 300);

      await api.triggerSync(true);
      await onRefreshRepos();
      clearInterval(timer);
      setSyncProgress({ read: repos.length || totalRepos, total: repos.length || totalRepos });
    } catch {
      // continue
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '48px auto', padding: '0 20px' }}>
      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: currentStep === 1 ? 600 : 400,
          color: currentStep === 1 ? 'var(--ink)' : 'var(--ink-2)',
        }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: 'var(--r-pill)',
            backgroundColor: currentStep >= 1 ? 'var(--ink)' : 'var(--surface-2)',
            color: currentStep >= 1 ? 'var(--paper)' : 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
          }}>1</span>
          Connect
        </div>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--line)' }} />
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: currentStep === 2 ? 600 : 400,
          color: currentStep === 2 ? 'var(--ink)' : 'var(--ink-2)',
        }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: 'var(--r-pill)',
            backgroundColor: currentStep >= 2 ? 'var(--ink)' : 'var(--surface-2)',
            color: currentStep >= 2 ? 'var(--paper)' : 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
          }}>2</span>
          First sync
        </div>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--line)' }} />
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: currentStep === 3 ? 600 : 400,
          color: currentStep === 3 ? 'var(--ink)' : 'var(--ink-2)',
        }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: 'var(--r-pill)',
            backgroundColor: currentStep >= 3 ? 'var(--ink)' : 'var(--surface-2)',
            color: currentStep >= 3 ? 'var(--paper)' : 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
          }}>3</span>
          Overview
        </div>
      </div>

      {/* Step 1: Connect */}
      {currentStep === 1 && (
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Connect your repositories
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 24px 0' }}>
            RepoPulse reads repository names, commit dates, and commit counts. We never read, store, or analyze your code, diffs, or commit messages.
          </p>

          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '20px',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <Lock size={18} strokeWidth={1.75} style={{ color: 'var(--ink)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', marginBottom: '4px' }}>
                  Repository access recommendation
                </strong>
                <span style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  We recommend selecting <strong>All repositories</strong> on GitHub so your private repositories and team activity are included. You can modify your repository selection on GitHub at any time.
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a
              href="https://github.com/apps/repopulse"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              onClick={() => setCurrentStep(2)}
            >
              Install GitHub App
              <ExternalLink size={16} strokeWidth={1.75} />
            </a>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleStartSync}
            >
              I already installed the App
            </button>
          </div>
        </div>
      )}

      {/* Step 2: First Sync */}
      {currentStep === 2 && (
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Syncing your repositories
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 24px 0' }}>
            Reading repository commit history to build your 90-day activity strips.
          </p>

          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '24px',
            marginBottom: '28px',
          }}>
            {isSyncing ? (
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink)', marginBottom: '12px' }}>
                  Read {syncProgress.read} of {syncProgress.total || totalRepos || 100} repositories...
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.round(((syncProgress.read || 1) / (syncProgress.total || totalRepos || 100)) * 100))}%`,
                    height: '100%',
                    backgroundColor: 'var(--ink)',
                    transition: 'width 200ms ease',
                  }} />
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 500, color: 'var(--ink)', marginBottom: '12px' }}>
                  <Check size={18} strokeWidth={1.75} style={{ color: 'var(--heat-active)' }} />
                  {totalRepos > 0 ? `${totalRepos} repositories found` : 'Sync complete'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  {totalRepos > 0 ? (
                    <span>
                      {totalRepos} repositories found: {privateCount} private, {publicCount} public
                      {orgCount > 0 ? `, ${orgCount} organization${orgCount > 1 ? 's' : ''}` : ''}.
                    </span>
                  ) : (
                    <span>No repositories were found. Check your GitHub App installation access.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={isSyncing}
              onClick={() => setCurrentStep(3)}
            >
              Continue to overview
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={isSyncing}
              onClick={handleStartSync}
            >
              Re-sync repositories
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Land on Overview */}
      {currentStep === 3 && (
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            You are ready
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 24px 0' }}>
            RepoPulse has indexed your commit timeline. Use Triage to decide what to keep, pause, or retire.
          </p>

          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '24px',
            marginBottom: '28px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              {coolingOrStaleCount > 0
                ? `${coolingOrStaleCount} repos need a decision.`
                : 'All repositories reviewed.'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: '20px' }}>
              {coolingOrStaleCount > 0
                ? 'Review cooling and stale projects one by one using keyboard shortcuts (K, P, R).'
                : 'Explore your repository ledger and 90-day activity strips on the overview page.'}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {coolingOrStaleCount > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onStartTriage}
                >
                  Start triage
                </button>
              )}
              <button
                type="button"
                className={coolingOrStaleCount > 0 ? 'btn-secondary' : 'btn-primary'}
                onClick={onComplete}
              >
                Go to overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
