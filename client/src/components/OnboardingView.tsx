import React, { useState } from 'react';

interface OnboardingViewProps {
  onDemoLogin: (username: string) => Promise<void>;
  onTokenLogin: (token: string) => Promise<void>;
  isLoading: boolean;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onDemoLogin,
  onTokenLogin,
  isLoading,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [demoUsername, setDemoUsername] = useState('developer');
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);
    if (!tokenInput.trim()) {
      setTokenError('Please enter a valid GitHub token.');
      return;
    }
    setIsSubmittingToken(true);
    try {
      await onTokenLogin(tokenInput.trim());
    } catch (err: any) {
      setTokenError(err.message || 'Failed to authenticate with GitHub token');
    } finally {
      setIsSubmittingToken(false);
    }
  };

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

        {/* Option 1: Personal Access Token (Zero Setup) */}
        <div style={{
          backgroundColor: 'var(--surface-2)',
          padding: '16px',
          borderRadius: 'var(--r)',
          border: '1px solid var(--line)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              Quick Connect with GitHub Token
            </span>
            <button
              type="button"
              onClick={() => setShowTokenGuide(!showTokenGuide)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--heat-stale)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              {showTokenGuide ? 'Hide instructions' : 'How to get a token?'}
            </button>
          </div>

          {showTokenGuide && (
            <div style={{
              fontSize: '12px',
              lineHeight: 1.6,
              color: 'var(--ink-2)',
              backgroundColor: 'var(--paper)',
              padding: '10px 12px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--line)',
              marginBottom: '12px'
            }}>
              <strong style={{ color: 'var(--ink)' }}>Step-by-step token setup:</strong>
              <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>
                  Click{' '}
                  <a
                    href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--heat-active)', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Create GitHub Token (Pre-filled Link) ↗
                  </a>
                </li>
                <li>Ensure <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>repo</code> and <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>read:user</code> scopes are selected.</li>
                <li>Click <strong>Generate token</strong> at the bottom of the GitHub page.</li>
                <li>Copy the generated token (<code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>ghp_...</code>) and paste it below.</li>
              </ol>
            </div>
          )}

          <form onSubmit={handleTokenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                className="clean-input"
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--mono)' }}
                placeholder="Paste token (ghp_... or github_pat_...)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button
                type="submit"
                className="btn-ink"
                disabled={isSubmittingToken || isLoading}
                style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                {isSubmittingToken ? 'Syncing...' : 'Connect & Sync'}
              </button>
            </div>
            {tokenError && (
              <div style={{ fontSize: '12px', color: 'var(--heat-active)' }}>
                {tokenError}
              </div>
            )}
          </form>

          <p style={{ fontSize: '11px', color: 'var(--ink-2)', margin: '8px 0 0 0' }}>
            🔒 Tokens are kept in your secure session only. Used exclusively to read repository commit history.
          </p>
        </div>

        {/* Demo Mode Action */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={handleDemoSubmit}
            disabled={isLoading}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {isLoading ? 'Loading...' : 'Or Explore with Demo Data'}
          </button>
        </div>

        <p className="signin-privacy-note" style={{ marginTop: '16px' }}>
          Read-only access to repositories. We store commit activity counts and dates, never code.
        </p>
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
