import React, { useState } from 'react';

interface OnboardingViewProps {
  onDemoLogin: (username: string) => Promise<void>;
  isLoading: boolean;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onDemoLogin, isLoading }) => {
  const [demoUsername, setDemoUsername] = useState('developer');
  const [showDataDetails, setShowDataDetails] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDemoLogin(demoUsername.trim() || 'developer');
  };

  return (
    <div className="onboarding-card">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="brand-dot" style={{ width: '12px', height: '12px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            RepoPulse
          </h1>
        </div>
        <p style={{ fontSize: '16px', color: 'var(--ink-soft)' }}>
          A quiet ledger of your GitHub activity. Decide what to keep, pause, or retire.
        </p>
      </div>

      {/* Onboarding Steps */}
      <div className="onboarding-steps">
        <div className="onboarding-step-item">
          <span className="step-num">1</span>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>
              Sign in with GitHub
            </strong>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Authenticate securely with GitHub OAuth. We never store long-lived tokens.
            </p>
          </div>
        </div>

        <div className="onboarding-step-item">
          <span className="step-num">2</span>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>
              Select your repositories
            </strong>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Choose which personal or organization repositories RepoPulse may read.
            </p>
          </div>
        </div>

        <div className="onboarding-step-item">
          <span className="step-num">3</span>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>
              Review your ledger & triage
            </strong>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              See 90-day commit strips, identify cooling repos, and clear your backlog.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
        <a
          href="/auth/github/start"
          className="btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none', padding: '10px 16px' }}
        >
          Sign in with GitHub
        </a>

        {/* Demo / Local Developer Sign-in */}
        <div style={{ padding: '12px', backgroundColor: 'var(--chalk)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>
            Instant Preview & Testing Mode
          </span>
          <form onSubmit={handleDemoSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, padding: '6px 10px' }}
              value={demoUsername}
              onChange={(e) => setDemoUsername(e.target.value)}
              placeholder="Enter demo username"
            />
            <button
              type="submit"
              className="btn-secondary"
              disabled={isLoading}
              style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
            >
              {isLoading ? 'Loading...' : 'Launch Demo'}
            </button>
          </form>
        </div>
      </div>

      {/* Transparency: What We Read and Store */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => setShowDataDetails(!showDataDetails)}
        >
          {showDataDetails ? 'Hide data transparency details' : 'What we read and store (Data Privacy)'}
        </button>

        {showDataDetails && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>What we store:</strong> Repository names, daily commit counts, relative commit timestamps, and your custom labels/notes.
            </p>
            <p>
              <strong>What we never store:</strong> Source code, commit messages, diffs, pull request bodies, or user passwords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
