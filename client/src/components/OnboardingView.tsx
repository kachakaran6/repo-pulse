import React, { useState, useRef } from 'react';
import { Thermometer, Keyboard, ShieldCheck, Check, Minus, Key, User, Lock, X } from 'lucide-react';

interface OnboardingViewProps {
  onTokenLogin?: (token: string) => Promise<void>;
  onLogin?: (username: string, password: string) => Promise<void>;
  onSignup?: (username: string, password: string, token?: string) => Promise<void>;
  onDemoLogin?: (username: string) => Promise<void>;
  isLoading?: boolean;
}

interface SampleRepo {
  name: string;
  status: 'active' | 'cooling' | 'stale' | 'dead';
  statusLabel: string;
  meta: string;
  activity: number[];
}

// Generate 90-day commit activity profiles for sample preview
function generateSampleActivity(pattern: 'active' | 'cooling' | 'stale' | 'dead'): number[] {
  const days: number[] = new Array(90).fill(0);
  if (pattern === 'active') {
    [89, 88, 86, 84, 82, 80, 78, 75, 71, 68, 64, 60, 55, 52, 48, 44, 40, 35, 30, 25, 20, 15, 10, 5, 2, 0].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 4) + 1);
    });
    days[89] = 3;
    days[88] = 5;
    days[86] = 2;
  } else if (pattern === 'cooling') {
    [75, 72, 68, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 3) + 1);
    });
  } else if (pattern === 'stale') {
    [65, 60, 55, 50, 42, 35, 28, 20].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 3) + 1);
    });
  } else {
    [35, 28, 15, 5].forEach((idx) => {
      days[89 - idx] = 1;
    });
  }
  return days;
}

const SAMPLE_REPOS: SampleRepo[] = [
  {
    name: 'repopulse',
    status: 'active',
    statusLabel: 'Active',
    meta: 'Last commit today, TypeScript',
    activity: generateSampleActivity('active'),
  },
  {
    name: 'auth-shield',
    status: 'active',
    statusLabel: 'Active',
    meta: 'Last commit yesterday, Go',
    activity: generateSampleActivity('active'),
  },
  {
    name: 'metrics-exporter',
    status: 'cooling',
    statusLabel: 'Cooling',
    meta: 'Last commit 9 days ago, Go',
    activity: generateSampleActivity('cooling'),
  },
  {
    name: 'customer-crm',
    status: 'stale',
    statusLabel: 'Stale',
    meta: 'Last commit 18 days ago, TypeScript',
    activity: generateSampleActivity('stale'),
  },
];

const TRIAGE_SAMPLE_ACTIVITY = generateSampleActivity('cooling');

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onTokenLogin,
  onLogin,
  onSignup,
  isLoading = false,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [finalTokenInput, setFinalTokenInput] = useState('');
  const [heroAuthMode, setHeroAuthMode] = useState<'token' | 'cloud'>('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTokenGuide, setShowTokenGuide] = useState(false);

  // Account Modal / Form state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountToken, setAccountToken] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);

  // Handle Token Submission from Hero
  const handleHeroTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const clean = tokenInput.trim();
    if (!clean) {
      setErrorMessage('Please enter your GitHub Personal Access Token.');
      heroInputRef.current?.focus();
      return;
    }

    if (!onTokenLogin) return;
    setIsSubmitting(true);
    try {
      await onTokenLogin(clean);
    } catch (err: any) {
      setErrorMessage(err.message || 'Token authentication failed. Check permissions and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Token Submission from Final Band
  const handleFinalTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const clean = finalTokenInput.trim();
    if (!clean) {
      heroInputRef.current?.focus();
      heroInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!onTokenLogin) return;
    setIsSubmitting(true);
    try {
      await onTokenLogin(clean);
    } catch (err: any) {
      setErrorMessage(err.message || 'Token authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Account Submit (from hero or modal)
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);

    if (!accountUsername.trim() || !accountPassword.trim()) {
      setAccountError('Username and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authTab === 'login' && onLogin) {
        await onLogin(accountUsername.trim(), accountPassword);
        setShowAccountModal(false);
      } else if (authTab === 'signup' && onSignup) {
        await onSignup(accountUsername.trim(), accountPassword, accountToken.trim() || undefined);
        setShowAccountModal(false);
      }
    } catch (err: any) {
      setAccountError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusHeroInput = () => {
    setHeroAuthMode('token');
    setTimeout(() => {
      heroInputRef.current?.focus();
      heroInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const switchToCloudMode = (tab: 'login' | 'signup') => {
    setHeroAuthMode('cloud');
    setAuthTab(tab);
    setAccountError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* 1. Header (Wordmark left, token & cloud actions right) */}
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a href="/" className="landing-wordmark">
            RepoPulse
          </a>

          <nav className="landing-nav" aria-label="Main Navigation">
            <a
              href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
            >
              Create token
            </a>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => switchToCloudMode('login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Cloud sign in
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => switchToCloudMode('signup')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Create account
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={focusHeroInput}
            >
              Connect token
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Hero (Two columns, left aligned) */}
      <section className="landing-section landing-hero-section">
        <div className="landing-container landing-hero-grid">
          {/* Left Column */}
          <div className="landing-hero-content">
            <h1 className="landing-hero-h1">
              See which repos you are still working on.
            </h1>

            <p className="landing-hero-sub">
              RepoPulse reads your GitHub commits and sorts every repo into Active, Cooling, Stale or Dead. Then you decide what to keep, pause or retire.
            </p>

            {/* Dual Authentication Selector & Form */}
            <div className="landing-auth-container">
              {/* Mode Tabs */}
              <div className="landing-auth-tabs" role="tablist" aria-label="Authentication Method">
                <button
                  type="button"
                  className={`landing-auth-tab ${heroAuthMode === 'token' ? 'active' : ''}`}
                  onClick={() => { setHeroAuthMode('token'); setErrorMessage(null); }}
                  role="tab"
                  aria-selected={heroAuthMode === 'token'}
                >
                  <Key size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Instant token</span>
                </button>
                <button
                  type="button"
                  className={`landing-auth-tab ${heroAuthMode === 'cloud' ? 'active' : ''}`}
                  onClick={() => { setHeroAuthMode('cloud'); setAccountError(null); }}
                  role="tab"
                  aria-selected={heroAuthMode === 'cloud'}
                >
                  <User size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Cloud account</span>
                </button>
              </div>

              {heroAuthMode === 'token' ? (
                /* Direct Personal Access Token Flow */
                <form onSubmit={handleHeroTokenSubmit} className="landing-token-form" id="token-form">
                  <div className="landing-token-input-group">
                    <input
                      ref={heroInputRef}
                      type="password"
                      className="clean-input landing-token-input mono"
                      placeholder="Paste GitHub Personal Access Token (ghp_...)"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      disabled={isSubmitting || isLoading}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="landing-btn-primary"
                      disabled={isSubmitting || isLoading}
                    >
                      {isSubmitting ? 'Syncing...' : 'Connect & Sync'}
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="landing-form-error">
                      {errorMessage}
                    </div>
                  )}

                  <div className="landing-token-helpers">
                    <button
                      type="button"
                      className="landing-link-quiet"
                      onClick={() => setShowTokenGuide(!showTokenGuide)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                    >
                      {showTokenGuide ? 'Hide token guide' : 'How to generate a token in 30 seconds'}
                    </button>

                    <a
                      href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="landing-link-quiet"
                      style={{ fontSize: '13px' }}
                    >
                      Generate token on GitHub
                    </a>
                  </div>

                  {showTokenGuide && (
                    <div className="landing-guide-box">
                      <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                        Generating your GitHub token:
                      </p>
                      <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--ink-2)' }}>
                        <li>
                          Open{' '}
                          <a
                            href="https://github.com/settings/tokens/new?description=RepoPulse&scopes=repo,read:user"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}
                          >
                            GitHub Token Settings
                          </a>
                        </li>
                        <li>Ensure <code>repo</code> and <code>read:user</code> scopes are selected.</li>
                        <li>Click <strong>Generate token</strong>, copy the token string, and paste above.</li>
                      </ol>
                    </div>
                  )}

                  <p className="landing-hero-note">
                    Ephemeral session mode: Token remains strictly in your active session and is never stored permanently in any database.
                  </p>
                </form>
              ) : (
                /* Cloud Account Sign In / Sign Up Card */
                <div className="landing-cloud-form-card">
                  <div className="landing-cloud-subtabs">
                    <button
                      type="button"
                      className={`segmented-btn ${authTab === 'login' ? 'active' : ''}`}
                      onClick={() => { setAuthTab('login'); setAccountError(null); }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${authTab === 'signup' ? 'active' : ''}`}
                      onClick={() => { setAuthTab('signup'); setAccountError(null); }}
                    >
                      Create Account
                    </button>
                  </div>

                  {accountError && (
                    <div className="landing-form-error" style={{ marginBottom: '12px' }}>
                      {accountError}
                    </div>
                  )}

                  <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                        Username
                      </label>
                      <input
                        type="text"
                        className="clean-input"
                        style={{ width: '100%', height: '42px' }}
                        placeholder="Username"
                        value={accountUsername}
                        onChange={(e) => setAccountUsername(e.target.value)}
                        required
                        autoComplete="username"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                        Password
                      </label>
                      <input
                        type="password"
                        className="clean-input"
                        style={{ width: '100%', height: '42px' }}
                        placeholder="Password (minimum 6 characters)"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        required
                        autoComplete={authTab === 'login' ? 'current-password' : 'new-password'}
                      />
                    </div>

                    {authTab === 'signup' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                            GitHub Token (Optional Vault Storage)
                          </label>
                          <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>Encrypted at rest</span>
                        </div>
                        <input
                          type="password"
                          className="clean-input mono"
                          style={{ width: '100%', height: '42px' }}
                          placeholder="Paste ghp_... to auto-sync across devices"
                          value={accountToken}
                          onChange={(e) => setAccountToken(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="landing-btn-primary"
                      style={{ width: '100%', height: '44px', marginTop: '4px' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Please wait...'
                        : authTab === 'login'
                        ? 'Sign In to Cloud Account'
                        : 'Create Cloud Account'}
                    </button>
                  </form>

                  <p className="landing-hero-note" style={{ marginTop: '12px' }}>
                    Cloud vault mode: Passwords are salted & hashed. Tokens are stored encrypted at rest with AES-256-GCM. We never share or sell your data.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Static Preview of Overview */}
          <div id="sample-preview" className="landing-preview-panel">
            <div className="landing-preview-header">
              <span className="landing-preview-label">Sample data</span>
              <h2 className="landing-preview-title">
                You committed to 8 repos this week. 7 went cold.
              </h2>
            </div>

            {/* Segmented Heat Bar */}
            <div className="landing-heat-bar" role="img" aria-label="Repository status distribution bar">
              <div className="landing-heat-segment heat-active-bg" style={{ width: '35%' }} />
              <div className="landing-heat-segment heat-cooling-bg" style={{ width: '25%' }} />
              <div className="landing-heat-segment heat-stale-bg" style={{ width: '20%' }} />
              <div className="landing-heat-segment heat-dead-bg" style={{ width: '20%' }} />
            </div>

            {/* Heat Bar Legend */}
            <div className="landing-heat-legend">
              <div className="landing-legend-item">
                <span className="landing-swatch heat-active-bg" />
                <span>Active 2</span>
              </div>
              <div className="landing-legend-item">
                <span className="landing-swatch heat-cooling-bg" />
                <span>Cooling 2</span>
              </div>
              <div className="landing-legend-item">
                <span className="landing-swatch heat-stale-bg" />
                <span>Stale 2</span>
              </div>
              <div className="landing-legend-item">
                <span className="landing-swatch heat-dead-bg" />
                <span>Dead 2</span>
              </div>
            </div>

            {/* 4 Static Ledger Rows */}
            <div className="landing-ledger-list">
              {SAMPLE_REPOS.map((repo) => {
                const heatColorClass =
                  repo.status === 'active'
                    ? 'heat-active'
                    : repo.status === 'cooling'
                    ? 'heat-cooling'
                    : repo.status === 'stale'
                    ? 'heat-stale'
                    : 'heat-dead';

                return (
                  <div key={repo.name} className="landing-ledger-row">
                    <div className="landing-ledger-info">
                      <div className="landing-repo-name mono">{repo.name}</div>
                      <div className="landing-repo-meta">{repo.meta}</div>
                    </div>

                    {/* 90-day strip preview */}
                    <div
                      className="landing-strip-wrapper"
                      role="img"
                      aria-label={`90-day commit strip for ${repo.name}`}
                    >
                      <div className="landing-strip-bars">
                        {repo.activity.map((count, i) => {
                          const height = count > 0 ? Math.max(4, Math.min(32, count * 7)) : 1;
                          return (
                            <div
                              key={i}
                              className={`landing-strip-bar ${count > 0 ? `${heatColorClass}-bg` : 'empty-bar'}`}
                              style={{ height: `${height}px` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. "Four states, one rule" */}
      <section className="landing-section landing-states-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <Thermometer size={20} strokeWidth={1.75} aria-hidden="true" className="landing-heading-icon" />
            <h2 className="landing-section-h2">Four states, one rule</h2>
          </div>
          <p className="landing-section-intro">
            Every repository automatically falls into one of four states based on commit frequency.
          </p>

          <div className="landing-states-table">
            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-active-bg" />
                <span className="landing-state-name">Active</span>
              </div>
              <div className="landing-state-rule">
                Committed in the last 7 days
              </div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-cooling-bg" />
                <span className="landing-state-name">Cooling</span>
              </div>
              <div className="landing-state-rule">
                8 to 14 days without commits
              </div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-stale-bg" />
                <span className="landing-state-name">Stale</span>
              </div>
              <div className="landing-state-rule">
                15 to 30 days without commits
              </div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-dead-bg" />
                <span className="landing-state-name">Dead</span>
              </div>
              <div className="landing-state-rule">
                Over 30 days or no commits recorded
              </div>
            </div>
          </div>

          <p className="landing-states-footer-note">
            Thresholds can be changed in Settings.
          </p>
        </div>
      </section>

      {/* 4. "Decide in seconds" */}
      <section className="landing-section landing-triage-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <Keyboard size={20} strokeWidth={1.75} aria-hidden="true" className="landing-heading-icon" />
            <h2 className="landing-section-h2">Decide in seconds</h2>
          </div>

          <div className="landing-triage-grid">
            {/* Left text */}
            <div className="landing-triage-text">
              <p className="landing-body-text">
                When projects cool down, make deliberate decisions instead of letting them linger. Review cooling and stale repositories one by one and press K to keep going, P to pause for a fixed period, or R to retire to the archive.
              </p>
              <p className="landing-shortcut-note">
                Shortcuts K, P, and R work anywhere during triage.
              </p>
            </div>

            {/* Right Static Triage Preview */}
            <div className="landing-triage-preview">
              <div className="landing-triage-preview-meta">
                <span className="landing-preview-label">Triage item 1 of 4</span>
                <div className="landing-triage-repo mono">metrics-exporter</div>
                <div className="landing-triage-sub">Cooling, last commit 9 days ago, Go</div>
              </div>

              {/* Triage 90-day strip preview */}
              <div className="landing-strip-wrapper triage-strip" role="img" aria-label="90-day commit strip for triage preview">
                <div className="landing-strip-bars">
                  {TRIAGE_SAMPLE_ACTIVITY.map((count, i) => {
                    const height = count > 0 ? Math.max(4, Math.min(32, count * 7)) : 1;
                    return (
                      <div
                        key={i}
                        className={`landing-strip-bar ${count > 0 ? 'heat-cooling-bg' : 'empty-bar'}`}
                        style={{ height: `${height}px` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Triage Actions with Keys */}
              <div className="landing-triage-buttons">
                <div className="landing-triage-btn-item">
                  <button type="button" className="landing-btn-outline" tabIndex={-1}>
                    Keep going
                  </button>
                  <span className="landing-key-hint">K</span>
                </div>
                <div className="landing-triage-btn-item">
                  <button type="button" className="landing-btn-outline" tabIndex={-1}>
                    Pause
                  </button>
                  <span className="landing-key-hint">P</span>
                </div>
                <div className="landing-triage-btn-item">
                  <button type="button" className="landing-btn-outline" tabIndex={-1}>
                    Retire
                  </button>
                  <span className="landing-key-hint">R</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "What we read and store" */}
      <section className="landing-section landing-privacy-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="landing-heading-icon" />
            <h2 className="landing-section-h2">What we read and store</h2>
          </div>

          <div className="landing-columns-grid">
            {/* Column 1: Reads */}
            <div className="landing-column-block">
              <h3 className="landing-column-h3">Reads</h3>
              <ul className="landing-list">
                <li className="landing-list-item">
                  <Check size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Repository names and descriptions</span>
                </li>
                <li className="landing-list-item">
                  <Check size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Commit dates and daily commit counts</span>
                </li>
                <li className="landing-list-item">
                  <Check size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Primary language and visibility status</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Never reads or stores */}
            <div className="landing-column-block">
              <h3 className="landing-column-h3">Never reads or stores</h3>
              <ul className="landing-list">
                <li className="landing-list-item">
                  <Minus size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Your code, diffs, or file contents</span>
                </li>
                <li className="landing-list-item">
                  <Minus size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Commit messages or author details</span>
                </li>
                <li className="landing-list-item">
                  <Minus size={16} strokeWidth={1.75} aria-hidden="true" className="landing-list-icon" />
                  <span>Personal access tokens on our servers</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="landing-privacy-footer-line">
            Export your data or delete your account at any time.
          </p>
        </div>
      </section>

      {/* 6. "Questions" */}
      <section className="landing-section landing-faq-section">
        <div className="landing-container">
          <h2 className="landing-section-h2 landing-faq-title">Questions</h2>

          <div className="landing-faq-list">
            <div className="landing-faq-item">
              <h3 className="landing-faq-q">Does it change anything on GitHub?</h3>
              <p className="landing-faq-a">
                No. RepoPulse operates with read-only access. It never writes commits, creates branches, opens issues, or alters repository settings.
              </p>
            </div>

            <div className="landing-faq-item">
              <h3 className="landing-faq-q">Where is my access stored?</h3>
              <p className="landing-faq-a">
                Your session is stored in secure, encrypted browser cookies. If you use local mode or self-host, your credentials never leave your machine.
              </p>
            </div>

            <div className="landing-faq-item">
              <h3 className="landing-faq-q">Which commits count?</h3>
              <p className="landing-faq-a">
                RepoPulse counts all commits authored by you to the default branch across your repositories in the last 90 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final band using ink background with paper text */}
      <section className="landing-final-band">
        <div className="landing-container landing-final-container">
          <h2 className="landing-final-h2">
            Find out what you have actually been working on.
          </h2>

          <form onSubmit={handleFinalTokenSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '480px', width: '100%', marginBottom: '16px' }}>
            <input
              type="password"
              className="clean-input mono"
              placeholder="Paste token (ghp_...)"
              value={finalTokenInput}
              onChange={(e) => setFinalTokenInput(e.target.value)}
              style={{ flex: 1, height: '48px', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
            />
            <button
              type="submit"
              className="landing-btn-inverted"
            >
              Connect & Sync
            </button>
          </form>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ color: 'var(--paper)', opacity: 0.8, fontSize: '14px' }}>Prefer permanent sync?</span>
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setShowAccountModal(true);
              }}
              style={{ background: 'transparent', border: '1px solid var(--paper)', color: 'var(--paper)', padding: '6px 14px', borderRadius: 'var(--r)', fontSize: '13px', cursor: 'pointer' }}
            >
              Sign in to Cloud
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setShowAccountModal(true);
              }}
              style={{ background: 'var(--paper)', border: '1px solid var(--paper)', color: 'var(--ink)', padding: '6px 14px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <p className="landing-footer-brand">
            RepoPulse. A quiet repository ledger for developers.
          </p>
          <div className="landing-footer-links">
            <a href="#privacy" className="landing-footer-link">
              Privacy
            </a>
            <a href="#terms" className="landing-footer-link">
              Terms
            </a>
          </div>
        </div>
      </footer>

      {/* Account Login / Signup Modal Dialog */}
      {showAccountModal && (
        <div className="modal-backdrop" onClick={() => setShowAccountModal(false)}>
          <div className="modal-panel" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`segmented-btn ${authTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('login'); setAccountError(null); }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${authTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('signup'); setAccountError(null); }}
                >
                  Sign Up
                </button>
              </div>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => setShowAccountModal(false)}
                style={{ padding: '4px' }}
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {accountError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-2)', borderLeft: '3px solid var(--heat-active)', color: 'var(--heat-active)', fontSize: '13px', marginBottom: '16px', borderRadius: '2px' }}>
                {accountError}
              </div>
            )}

            <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Username
                </label>
                <input
                  type="text"
                  className="clean-input"
                  style={{ width: '100%', height: '40px' }}
                  placeholder="Username"
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Password
                </label>
                <input
                  type="password"
                  className="clean-input"
                  style={{ width: '100%', height: '40px' }}
                  placeholder="••••••••"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  required
                />
              </div>

              {authTab === 'signup' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    GitHub Token (Optional for cloud sync)
                  </label>
                  <input
                    type="password"
                    className="clean-input mono"
                    style={{ width: '100%', height: '40px' }}
                    placeholder="ghp_..."
                    value={accountToken}
                    onChange={(e) => setAccountToken(e.target.value)}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn-ink"
                style={{ width: '100%', height: '44px', marginTop: '8px', fontSize: '14px' }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Please wait...'
                  : authTab === 'login'
                  ? 'Sign in to account'
                  : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
