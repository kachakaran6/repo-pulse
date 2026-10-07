import React, { useState } from 'react';

interface OnboardingViewProps {
  onDemoLogin: (username: string) => Promise<void>;
  isLoading: boolean;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onDemoLogin, isLoading }) => {
  const [demoUsername, setDemoUsername] = useState('developer');
  const isDev = import.meta.env.DEV || window.location.search.includes('auth_demo=true');

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDemoLogin(demoUsername.trim() || 'developer');
  };

  return (
    <div className="signin-layout">
      {/* Left Column: Clear Value Proposition & Sign In */}
      <div className="signin-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="brand-dot" style={{ width: '10px', height: '10px' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            RepoPulse
          </span>
        </div>

        <h1 className="signin-headline">
          Know what you are working on and what you abandoned.
        </h1>

        <p className="signin-subhead">
          A quiet ledger of your GitHub activity. Group your repositories into Active, Cooling, Stale, and Dead, then triage what to keep, pause, or retire.
        </p>

        <div>
          <a
            href="/auth/github/start"
            className="btn-ink"
            style={{ padding: '10px 24px', fontSize: '15px' }}
          >
            Sign in with GitHub
          </a>
        </div>

        <p className="signin-privacy-note">
          Read-only access to the repos you choose. We store commit counts and dates, never code.
        </p>

        {/* Development / Testing Demo Sign-in */}
        {isDev && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: '6px' }}>
              Development / Demo Preview Mode
            </span>
            <form onSubmit={handleDemoSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="clean-input"
                style={{ flex: 1, padding: '6px 10px' }}
                value={demoUsername}
                onChange={(e) => setDemoUsername(e.target.value)}
                placeholder="Enter username"
              />
              <button
                type="submit"
                className="btn-outline"
                disabled={isLoading}
                style={{ padding: '6px 14px', whiteSpace: 'nowrap', fontSize: '13px' }}
              >
                {isLoading ? 'Launching...' : 'Launch Demo'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Static Preview of Overview */}
      <div className="sample-preview-card">
        <span className="sample-badge">Sample data</span>

        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          You committed to 3 repos this week. 2 went cold.
        </div>

        {/* Sample Heat Bar */}
        <div style={{ display: 'flex', height: '10px', width: '100%', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: '45%', backgroundColor: 'var(--heat-active)' }} />
          <div style={{ width: '25%', backgroundColor: 'var(--heat-cooling)' }} />
          <div style={{ width: '15%', backgroundColor: 'var(--heat-stale)' }} />
          <div style={{ width: '15%', backgroundColor: 'var(--heat-dead)' }} />
        </div>

        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--ink-2)', marginBottom: '16px' }}>
          <span><span className="swatch-square active" style={{ width: '8px', height: '8px' }} /> Active 8</span>
          <span><span className="swatch-square cooling" style={{ width: '8px', height: '8px' }} /> Cooling 4</span>
          <span><span className="swatch-square stale" style={{ width: '8px', height: '8px' }} /> Stale 3</span>
          <span><span className="swatch-square dead" style={{ width: '8px', height: '8px' }} /> Dead 7</span>
        </div>

        {/* Sample Rows */}
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>repopulse</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Last commit today &bull; TypeScript &bull; SaaS</div>
            </div>
            <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '20px' }}>
              {[2, 4, 0, 1, 3, 0, 5, 2, 4].map((v, i) => (
                <div key={i} style={{ width: '3px', height: `${Math.max(3, v * 4)}px`, backgroundColor: v > 0 ? 'var(--heat-active)' : 'var(--line)', borderRadius: '1px' }} />
              ))}
            </div>
          </div>

          <div style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>metrics-exporter</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Last commit 9 days ago &bull; Go &bull; Infrastructure</div>
            </div>
            <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '20px' }}>
              {[0, 0, 0, 2, 1, 0, 0, 0, 0].map((v, i) => (
                <div key={i} style={{ width: '3px', height: `${Math.max(3, v * 4)}px`, backgroundColor: v > 0 ? 'var(--heat-cooling)' : 'var(--line)', borderRadius: '1px' }} />
              ))}
            </div>
          </div>

          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>customer-crm-v1</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Last commit 18 days ago &bull; TypeScript &bull; Full ERP</div>
            </div>
            <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '20px' }}>
              {[0, 0, 0, 0, 0, 0, 1, 0, 0].map((v, i) => (
                <div key={i} style={{ width: '3px', height: `${Math.max(3, v * 4)}px`, backgroundColor: v > 0 ? 'var(--heat-stale)' : 'var(--line)', borderRadius: '1px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
