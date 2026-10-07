import React, { useState } from 'react';

interface OnboardingViewProps {
  onDemoLogin: (username: string) => Promise<void>;
  onTokenLogin: (token: string) => Promise<void>;
  onSignup: (username: string, password: string, token?: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
}

type AuthMode = 'ephemeral' | 'signup' | 'login' | 'demo';
type PreviewFilter = 'all' | 'active' | 'cooling' | 'stale' | 'dead';

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onDemoLogin,
  onTokenLogin,
  onSignup,
  onLogin,
  isLoading,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('ephemeral');

  // Form states
  const [patToken, setPatToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cloudToken, setCloudToken] = useState('');
  const [demoUser, setDemoUser] = useState('developer');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Interactive Live Preview Filter State
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');

  // Handle Ephemeral Token Login
  const handleEphemeralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!patToken.trim()) {
      setFormError('Please enter a GitHub Personal Access Token.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onTokenLogin(patToken.trim());
    } catch (err: any) {
      setFormError(err.message || 'Failed to authenticate with GitHub token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cloud Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!username.trim() || !password.trim()) {
      setFormError('Username and password are required.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSignup(username.trim(), password, cloudToken.trim() || undefined);
    } catch (err: any) {
      setFormError(err.message || 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cloud Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!username.trim() || !password.trim()) {
      setFormError('Username and password are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setFormError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sample data for live interactive preview
  const sampleRepos = [
    { name: 'repopulse', status: 'active', desc: 'Last commit today • TypeScript • SaaS', activity: [2, 4, 0, 1, 3, 0, 5, 2, 4] },
    { name: 'auth-shield', status: 'active', desc: 'Last commit yesterday • Go • Security', activity: [0, 2, 1, 4, 3, 0, 2, 1, 3] },
    { name: 'metrics-exporter', status: 'cooling', desc: 'Last commit 9 days ago • Go • Infrastructure', activity: [0, 0, 0, 2, 1, 0, 0, 0, 0] },
    { name: 'react-virtual-ledger', status: 'cooling', desc: 'Last commit 12 days ago • TypeScript • Library', activity: [0, 0, 1, 0, 2, 0, 0, 0, 0] },
    { name: 'customer-crm-v1', status: 'stale', desc: 'Last commit 18 days ago • TypeScript • Full ERP', activity: [0, 0, 0, 0, 0, 0, 1, 0, 0] },
    { name: 'docker-pg-cluster', status: 'stale', desc: 'Last commit 24 days ago • Shell • Infrastructure', activity: [0, 0, 0, 0, 0, 0, 0, 1, 0] },
    { name: 'angularjs-legacy-portal', status: 'dead', desc: 'Last commit 45 days ago • JavaScript • Legacy', activity: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'abandoned-solidity-dao', status: 'dead', desc: 'Last commit 78 days ago • Solidity • Experiment', activity: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];

  const filteredSampleRepos = sampleRepos.filter((r) => {
    if (previewFilter === 'all') return true;
    return r.status === previewFilter;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 0 64px 0' }}>
      {/* Landing Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px', borderBottom: '1px solid var(--line)', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="brand-dot" style={{ width: '10px', height: '10px' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            RepoPulse
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => onDemoLogin('developer')}
            disabled={isLoading}
          >
            Explore Demo
          </button>
          <a
            href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ink"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Create GitHub Token ↗
          </a>
        </div>
      </div>

      {/* Main 2-Column Hero */}
      <div className="signin-layout" style={{ gap: '48px', alignItems: 'flex-start' }}>
        {/* Left Column: Mission + Multi-Mode Auth Hub */}
        <div className="signin-left" style={{ maxWidth: '520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--surface-2)', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '16px', border: '1px solid var(--line)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--heat-active)' }} />
            V3 HEAT ENGINE • READ-ONLY COMMIT LEDGER
          </div>

          <h1 className="signin-headline" style={{ fontSize: '36px', lineHeight: 1.15, fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.03em' }}>
            The quiet ledger for hyperactive developers.
          </h1>

          <p className="signin-subhead" style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-2)', marginBottom: '24px' }}>
            Stop drowning across dozens of unmaintained repositories. RepoPulse inspects your 90-day GitHub commit activity, groups projects by temperature, and helps you triage what to <strong>Keep</strong>, <strong>Pause</strong>, or <strong>Retire</strong>.
          </p>

          {/* Tabbed Auth Container */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', boxShadow: 'none' }}>
            {/* Auth Mode Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '16px', gap: '4px' }}>
              <button
                type="button"
                className={`nav-tab ${authMode === 'ephemeral' ? 'active' : ''}`}
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => { setAuthMode('ephemeral'); setFormError(null); }}
              >
                ⚡ Session Token
              </button>
              <button
                type="button"
                className={`nav-tab ${authMode === 'signup' ? 'active' : ''}`}
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => { setAuthMode('signup'); setFormError(null); }}
              >
                ☁️ Cloud Sign Up
              </button>
              <button
                type="button"
                className={`nav-tab ${authMode === 'login' ? 'active' : ''}`}
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => { setAuthMode('login'); setFormError(null); }}
              >
                🔑 Log In
              </button>
              <button
                type="button"
                className={`nav-tab ${authMode === 'demo' ? 'active' : ''}`}
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => { setAuthMode('demo'); setFormError(null); }}
              >
                🚀 Demo
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-2)', borderLeft: '3px solid var(--heat-active)', color: 'var(--heat-active)', fontSize: '13px', marginBottom: '16px', borderRadius: '2px' }}>
                {formError}
              </div>
            )}

            {/* Mode 1: Ephemeral / Local Session (Zero Storage) */}
            {authMode === 'ephemeral' && (
              <form onSubmit={handleEphemeralSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    GitHub Personal Access Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                    style={{ background: 'none', border: 'none', color: 'var(--heat-stale)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    {showTokenHelp ? 'Hide guide' : 'Get token in 30s ↗'}
                  </button>
                </div>

                {showTokenHelp && (
                  <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink-2)', backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--r)', marginBottom: '12px', border: '1px solid var(--line)' }}>
                    1. Open <a href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--heat-active)', fontWeight: 600, textDecoration: 'underline' }}>Pre-filled GitHub Token Creator ↗</a><br />
                    2. Check <code style={{ fontFamily: 'var(--mono)' }}>repo</code> & <code style={{ fontFamily: 'var(--mono)' }}>read:user</code> scopes.<br />
                    3. Click <strong>Generate token</strong> and paste below.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="password"
                    className="clean-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--mono)' }}
                    placeholder="Paste token (ghp_... or github_pat_...)"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-ink"
                    disabled={isSubmitting || isLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                  >
                    {isSubmitting ? 'Syncing...' : 'Connect & Sync'}
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  🛡️ <strong>Zero Server Storage:</strong> Your token is stored in your secure browser session only. It is never persisted in any database and vanishes on logout.
                </div>
              </form>
            )}

            {/* Mode 2: Cloud Sign Up (Encrypted Persistence) */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Username</label>
                  <input
                    type="text"
                    className="clean-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Password (min 6 chars)</label>
                  <input
                    type="password"
                    className="clean-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>GitHub Token (Optional)</label>
                    <a
                      href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: 'var(--heat-stale)', textDecoration: 'underline' }}
                    >
                      Get token ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    className="clean-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--mono)' }}
                    placeholder="ghp_... (for persistent cloud sync across devices)"
                    value={cloudToken}
                    onChange={(e) => setCloudToken(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-ink"
                  disabled={isSubmitting || isLoading}
                  style={{ width: '100%', padding: '9px', fontSize: '13px', marginTop: '4px' }}
                >
                  {isSubmitting ? 'Creating account...' : 'Create Cloud Account'}
                </button>

                <div style={{ fontSize: '11px', color: 'var(--ink-2)', textAlign: 'center' }}>
                  Already registered? <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: 'var(--heat-active)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Sign in</button>
                </div>
              </form>
            )}

            {/* Mode 3: Cloud Login */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Username</label>
                  <input
                    type="text"
                    className="clean-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="Your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Password</label>
                  <input
                    type="password"
                    className="clean-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-ink"
                  disabled={isSubmitting || isLoading}
                  style={{ width: '100%', padding: '9px', fontSize: '13px', marginTop: '4px' }}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In to Cloud Vault'}
                </button>

                <div style={{ fontSize: '11px', color: 'var(--ink-2)', textAlign: 'center' }}>
                  Need an account? <button type="button" onClick={() => setAuthMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--heat-active)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Sign up</button>
                </div>
              </form>
            )}

            {/* Mode 4: Instant Demo Preview */}
            {authMode === 'demo' && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '14px', lineHeight: 1.5 }}>
                  Explore the full RepoPulse suite with 30 simulated repositories across Active, Cooling, Stale, and Dead temperatures.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="clean-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    value={demoUser}
                    onChange={(e) => setDemoUser(e.target.value)}
                    placeholder="Demo username"
                  />
                  <button
                    type="button"
                    className="btn-ink"
                    onClick={() => onDemoLogin(demoUser.trim() || 'developer')}
                    disabled={isLoading}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Launch Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Live Ledger Simulator */}
        <div className="sample-preview-card" style={{ flex: 1, minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="sample-badge">Interactive Live Simulator</span>
            <span style={{ fontSize: '11px', color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>90-Day Sparklines</span>
          </div>

          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            You committed to 8 repos this week. 7 went cold.
          </div>

          {/* Segmented Heat Bar */}
          <div style={{ display: 'flex', height: '12px', width: '100%', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ width: '35%', backgroundColor: 'var(--heat-active)' }} />
            <div style={{ width: '25%', backgroundColor: 'var(--heat-cooling)' }} />
            <div style={{ width: '20%', backgroundColor: 'var(--heat-stale)' }} />
            <div style={{ width: '20%', backgroundColor: 'var(--heat-dead)' }} />
          </div>

          {/* Interactive Group Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(['all', 'active', 'cooling', 'stale', 'dead'] as PreviewFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPreviewFilter(f)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--r)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: previewFilter === f ? '1px solid var(--ink)' : '1px solid var(--line)',
                  backgroundColor: previewFilter === f ? 'var(--ink)' : 'var(--surface-2)',
                  color: previewFilter === f ? 'var(--paper)' : 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                {f} {f === 'all' ? '(8)' : f === 'active' ? '(2)' : f === 'cooling' ? '(2)' : f === 'stale' ? '(2)' : '(2)'}
              </button>
            ))}
          </div>

          {/* Filtered Sample Rows */}
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {filteredSampleRepos.map((r) => {
              const heatColor =
                r.status === 'active'
                  ? 'var(--heat-active)'
                  : r.status === 'cooling'
                  ? 'var(--heat-cooling)'
                  : r.status === 'stale'
                  ? 'var(--heat-stale)'
                  : 'var(--heat-dead)';

              return (
                <div
                  key={r.name}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: heatColor }} />
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>{r.name}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>{r.desc}</div>
                  </div>

                  {/* Micro Commit Sparkline */}
                  <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '22px' }}>
                    {r.activity.map((v, i) => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          height: `${Math.max(3, v * 4)}px`,
                          backgroundColor: v > 0 ? heatColor : 'var(--line)',
                          borderRadius: '1px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Pillars of RepoPulse */}
      <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--line)' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Built for developers with too many side-projects.
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
            A disciplined system designed to turn repository guilt into actionable clarity.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Pillar 1 */}
          <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🌡️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Thermodynamic Heat Ramp</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
              No arbitrary metrics. Repositories automatically shift between <strong>Active</strong> (&le;7d), <strong>Cooling</strong> (&le;14d), <strong>Stale</strong> (&le;30d), and <strong>Dead</strong> (&gt;30d) based on actual commit frequency.
            </p>
          </div>

          {/* Pillar 2 */}
          <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⌨️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>60-Second Keyboard Triage</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Rapidly decide the fate of cooling and stale projects: press <kbd style={{ padding: '2px 5px', border: '1px solid var(--line)', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--mono)' }}>K</kbd> to Keep, <kbd style={{ padding: '2px 5px', border: '1px solid var(--line)', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--mono)' }}>P</kbd> to Pause, or <kbd style={{ padding: '2px 5px', border: '1px solid var(--line)', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--mono)' }}>R</kbd> to Retire.
            </p>
          </div>

          {/* Pillar 3 */}
          <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Zero-Code Privacy Guarantee</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
              We never clone, read, or parse your source code. RepoPulse inspects only commit timestamps and repository names via read-only GitHub API. Full JSON export and 1-click account wipe anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
