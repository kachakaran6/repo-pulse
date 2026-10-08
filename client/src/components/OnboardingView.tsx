import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Keyboard,
  ShieldCheck,
  Check,
  Minus,
  ArrowRight,
  Code2,
  Sparkles,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { fetchAuthStatus } from '../api.js';

interface OnboardingViewProps {
  onGithubLogin: () => void;
  onRegister?: (params: { login: string; email?: string; password: string; name?: string }) => Promise<void>;
  onPasswordLogin?: (params: { loginOrEmail: string; password: string }) => Promise<void>;
  onDemoLogin?: () => Promise<void>;
  onDevLogin?: () => Promise<void>;
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
    [89, 88, 86, 84, 82, 80, 78, 75, 71, 68, 64, 60, 55, 52, 48, 44, 40, 35, 30, 25, 20, 15, 10, 5, 2, 0].forEach(
      (idx) => {
        days[89 - idx] = Math.floor((idx % 4) + 1);
      }
    );
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
  onGithubLogin,
  onRegister,
  onPasswordLogin,
  onDemoLogin,
  onDevLogin,
  isLoading = false,
}) => {
  const [authTab, setAuthTab] = useState<'github' | 'signup' | 'signin'>('github');
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    githubConfigured: boolean;
    demoEnabled: boolean;
    appUrl: string;
  }>({ githubConfigured: true, demoEnabled: true, appUrl: '' });

  // Signup form state
  const [signupLogin, setSignupLogin] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Signin form state
  const [signinIdentifier, setSigninIdentifier] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signinError, setSigninError] = useState<string | null>(null);

  // Check URL error parameter
  const searchParams = new URLSearchParams(window.location.search);
  const [urlError, setUrlError] = useState<string | null>(searchParams.get('error'));

  useEffect(() => {
    fetchAuthStatus().then((status) => {
      setAuthStatus(status);
    });
  }, []);

  const clearErrorParam = () => {
    setUrlError(null);
    setDevError(null);
    setSignupError(null);
    setSigninError(null);
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const callbackUrl = `${currentOrigin}/auth/github/callback`;

  const handleDemoOrDevLogin = async () => {
    setIsDemoLoggingIn(true);
    setDevError(null);
    try {
      if (onDemoLogin) {
        await onDemoLogin();
      } else if (onDevLogin) {
        await onDevLogin();
      }
    } catch (err: any) {
      setDevError(err.message || 'Demo sign-in failed');
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegister) return;
    setIsSigningUp(true);
    setSignupError(null);
    try {
      await onRegister({
        login: signupLogin.trim(),
        email: signupEmail.trim() || undefined,
        password: signupPassword,
      });
    } catch (err: any) {
      setSignupError(err.message || 'Account creation failed');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPasswordLogin) return;
    setIsSigningIn(true);
    setSigninError(null);
    try {
      await onPasswordLogin({
        loginOrEmail: signinIdentifier.trim(),
        password: signinPassword,
      });
    } catch (err: any) {
      setSigninError(err.message || 'Sign in failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const isGithubUnconfigured = urlError === 'github_not_configured' || (!authStatus.githubConfigured && !urlError);

  return (
    <div className="landing-page">
      {/* 1. Header (Wordmark left, Sign in link and primary Sign in with GitHub button right) */}
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a href="/" className="landing-wordmark">
            RepoPulse
          </a>

          <nav className="landing-nav" aria-label="Main Navigation">
            <button
              type="button"
              className="landing-nav-link"
              onClick={handleDemoOrDevLogin}
              disabled={isDemoLoggingIn || isLoading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Live Demo
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => {
                setAuthTab('signin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => {
                setAuthTab('signup');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={isLoading || isDemoLoggingIn}
            >
              Create Account
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
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

            {/* Error / Configuration Guide Card */}
            {(urlError || devError || (!authStatus.githubConfigured && !urlError)) && (
              <div className={`landing-alert-card ${isGithubUnconfigured ? '' : 'error'}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertCircle size={18} strokeWidth={2} style={{ color: isGithubUnconfigured ? 'var(--heat-cooling)' : 'var(--heat-active)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: '4px' }}>
                        {isGithubUnconfigured ? 'GitHub App Configuration Required' : 'Authentication Notice'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                        {isGithubUnconfigured
                          ? 'GitHub OAuth credentials have not been configured on this instance yet. You can create an account below, explore with Demo Mode, or configure GitHub credentials in your Coolify dashboard.'
                          : urlError === 'invalid_oauth_state'
                          ? 'OAuth session expired. Please try signing in again.'
                          : urlError === 'auth_failed'
                          ? 'GitHub OAuth token exchange failed (please check your GitHub App Callback URL matches the one below). You can create an account below and connect via token or OAuth inside your dashboard!'
                          : urlError === 'missing_code'
                          ? 'GitHub authorization code was missing. Please try again.'
                          : devError || 'Authentication encountered an error. Please try again.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearErrorParam}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: '2px' }}
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="landing-btn-primary"
                    style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    onClick={handleDemoOrDevLogin}
                    disabled={isDemoLoggingIn || isLoading}
                  >
                    <Sparkles size={14} style={{ marginRight: '6px' }} />
                    {isDemoLoggingIn ? 'Launching Demo...' : 'Explore Live Demo (1-Click)'}
                  </button>

                  <button
                    type="button"
                    className="landing-btn-secondary"
                    style={{ height: '36px', padding: '0 14px', fontSize: '13px' }}
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                  >
                    {showSetupGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showSetupGuide ? 'Hide Callback Setup Guide' : 'View Correct Callback URL'}</span>
                  </button>
                </div>

                {showSetupGuide && (
                  <div className="landing-setup-guide">
                    <p style={{ fontWeight: 600, marginBottom: '6px' }}>1. GitHub OAuth App Settings (on github.com/settings/apps):</p>
                    <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '4px' }}>Authorization callback URL:</div>
                    <div className="landing-code-snippet">
                      <span>{callbackUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(callbackUrl, 'cb')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
                        title="Copy Callback URL"
                      >
                        {copiedKey === 'cb' ? <Check size={14} color="var(--heat-cooling)" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '4px', marginTop: '8px' }}>Homepage URL:</div>
                    <div className="landing-code-snippet">
                      <span>{currentOrigin}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentOrigin, 'origin')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
                        title="Copy Homepage URL"
                      >
                        {copiedKey === 'origin' ? <Check size={14} color="var(--heat-cooling)" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <p style={{ fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>2. Environment Variables in Coolify:</p>
                    <ul style={{ paddingLeft: '18px', margin: '4px 0', fontSize: '12px', color: 'var(--ink-2)' }}>
                      <li><strong style={{ color: 'var(--ink)' }}>GITHUB_CLIENT_ID</strong> (from your registered GitHub App)</li>
                      <li><strong style={{ color: 'var(--ink)' }}>GITHUB_CLIENT_SECRET</strong> (generated secret)</li>
                      <li><strong style={{ color: 'var(--ink)' }}>APP_URL</strong>: <code>{currentOrigin}</code></li>
                      <li><strong style={{ color: 'var(--ink)' }}>API_URL</strong>: <code>{currentOrigin}</code></li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Auth Tab Switcher */}
            <div className="landing-auth-container">
              <div className="landing-auth-tabs">
                <button
                  type="button"
                  className={`landing-auth-tab ${authTab === 'github' ? 'active' : ''}`}
                  onClick={() => setAuthTab('github')}
                >
                  GitHub OAuth
                </button>
                <button
                  type="button"
                  className={`landing-auth-tab ${authTab === 'signup' ? 'active' : ''}`}
                  onClick={() => setAuthTab('signup')}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  className={`landing-auth-tab ${authTab === 'signin' ? 'active' : ''}`}
                  onClick={() => setAuthTab('signin')}
                >
                  Sign In
                </button>
              </div>

              {/* Tab 1: GitHub Login Mode */}
              {authTab === 'github' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="landing-btn-primary"
                      style={{ height: '48px', padding: '0 24px', fontSize: '15px' }}
                      onClick={onGithubLogin}
                      disabled={isLoading || isDemoLoggingIn}
                    >
                      Sign in with GitHub
                      <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" style={{ marginLeft: '8px' }} />
                    </button>

                    <button
                      id="dev-login-btn"
                      type="button"
                      className="landing-btn-secondary"
                      style={{ height: '48px', padding: '0 20px', fontSize: '15px' }}
                      onClick={handleDemoOrDevLogin}
                      disabled={isDemoLoggingIn || isLoading}
                    >
                      <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>{isDemoLoggingIn ? 'Launching Demo...' : 'Explore Live Demo'}</span>
                    </button>
                  </div>

                  <p className="landing-hero-note">
                    Read-only access. Or create a direct account to manage repos via Personal Access Token.
                  </p>
                </div>
              )}

              {/* Tab 2: Create Account Mode */}
              {authTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="landing-auth-form">
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--ink)' }}>
                    Create your RepoPulse Account
                  </div>
                  {signupError && (
                    <div className="landing-form-error">{signupError}</div>
                  )}

                  <div className="landing-auth-field">
                    <label className="landing-auth-label">Username *</label>
                    <input
                      type="text"
                      className="landing-auth-input"
                      placeholder="e.g. alexdeveloper"
                      value={signupLogin}
                      onChange={(e) => setSignupLogin(e.target.value)}
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="landing-auth-field">
                    <label className="landing-auth-label">Email (optional)</label>
                    <input
                      type="email"
                      className="landing-auth-input"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>

                  <div className="landing-auth-field">
                    <label className="landing-auth-label">Password * (min 6 characters)</label>
                    <input
                      type="password"
                      className="landing-auth-input"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    className="landing-btn-primary"
                    style={{ height: '42px', marginTop: '6px' }}
                    disabled={isSigningUp || !signupLogin.trim() || signupPassword.length < 6}
                  >
                    {isSigningUp ? 'Creating Account...' : 'Create Account & Enter'}
                  </button>

                  <div style={{ fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center' }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('signin')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', textDecoration: 'underline', padding: 0, fontSize: '12px', fontWeight: 600 }}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Sign In Mode */}
              {authTab === 'signin' && (
                <form onSubmit={handleSigninSubmit} className="landing-auth-form">
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--ink)' }}>
                    Sign In to RepoPulse
                  </div>
                  {signinError && (
                    <div className="landing-form-error">{signinError}</div>
                  )}

                  <div className="landing-auth-field">
                    <label className="landing-auth-label">Username or Email *</label>
                    <input
                      type="text"
                      className="landing-auth-input"
                      placeholder="Username or email"
                      value={signinIdentifier}
                      onChange={(e) => setSigninIdentifier(e.target.value)}
                      required
                    />
                  </div>

                  <div className="landing-auth-field">
                    <label className="landing-auth-label">Password *</label>
                    <input
                      type="password"
                      className="landing-auth-input"
                      placeholder="••••••••"
                      value={signinPassword}
                      onChange={(e) => setSigninPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="landing-btn-primary"
                    style={{ height: '42px', marginTop: '6px' }}
                    disabled={isSigningIn || !signinIdentifier.trim() || !signinPassword}
                  >
                    {isSigningIn ? 'Signing In...' : 'Sign In'}
                  </button>

                  <div style={{ fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center' }}>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('signup')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', textDecoration: 'underline', padding: 0, fontSize: '12px', fontWeight: 600 }}
                    >
                      Create Account
                    </button>
                  </div>
                </form>
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
              <div className="landing-state-rule">Committed in the last 7 days</div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-cooling-bg" />
                <span className="landing-state-name">Cooling</span>
              </div>
              <div className="landing-state-rule">8 to 14 days without commits</div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-stale-bg" />
                <span className="landing-state-name">Stale</span>
              </div>
              <div className="landing-state-rule">15 to 30 days without commits</div>
            </div>

            <div className="landing-state-row">
              <div className="landing-state-name-col">
                <span className="landing-swatch-10 heat-dead-bg" />
                <span className="landing-state-name">Dead</span>
              </div>
              <div className="landing-state-rule">Over 30 days or no commits recorded</div>
            </div>
          </div>

          <p className="landing-states-footer-note">Thresholds can be customized in Settings.</p>
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
            <div className="landing-triage-text">
              <p className="landing-body-text">
                When projects cool down, make deliberate decisions instead of letting them linger. Review cooling and stale repositories one by one and press K to keep going, P to pause for a fixed period, or R to retire to the archive.
              </p>
              <p className="landing-shortcut-note">
                Shortcuts K, P, and R work anywhere during triage.
              </p>
            </div>

            <div className="landing-triage-preview">
              <div className="landing-triage-preview-meta">
                <span className="landing-preview-label">Triage item 1 of 4</span>
                <div className="landing-triage-repo mono">metrics-exporter</div>
                <div className="landing-triage-sub">Cooling, last commit 9 days ago, Go</div>
              </div>

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
                  <span>Long-lived user tokens</span>
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
                No. RepoPulse operates with read-only permissions (Contents read-only, Metadata read-only). It never writes commits, opens issues, or alters repository settings.
              </p>
            </div>

            <div className="landing-faq-item">
              <h3 className="landing-faq-q">Where is my access stored?</h3>
              <p className="landing-faq-a">
                Your session is stored in secure, HttpOnly browser cookies. User access tokens are never saved permanently in any database.
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

      {/* 7. Final CTA Band */}
      <section className="landing-final-band">
        <div className="landing-container landing-final-container">
          <h2 className="landing-final-h2">
            Find out what you have actually been working on.
          </h2>

          <button
            type="button"
            className="landing-btn-inverted"
            onClick={onGithubLogin}
            disabled={isLoading}
            style={{ padding: '0 28px', height: '48px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Sign in with GitHub
          </button>
        </div>
      </section>
    </div>
  );
};
