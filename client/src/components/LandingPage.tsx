import React, { useState, useEffect } from 'react';
import {
  Lock,
  Building2,
  ListChecks,
  Check,
  Minus,
  ExternalLink,
  Users,
  Calendar,
  Flame,
  GitCommit,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { CommitStrip } from './CommitStrip.js';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface LandingPageProps {
  onGithubLogin: () => void;
  onDevLogin?: () => Promise<void>;
  devEnabled?: boolean;
  onNavigateLegal?: (type: 'privacy' | 'terms') => void;
}

interface SampleRepo {
  name: string;
  status: 'active' | 'cooling' | 'stale' | 'dead';
  statusLabel: string;
  meta: string;
  is_private?: boolean;
  activity: { day: string; commits: number }[];
}

function generateSampleActivity(pattern: 'active' | 'cooling' | 'stale' | 'dead'): { day: string; commits: number }[] {
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
    statusLabel: 'Active',
    meta: 'Last commit today · TypeScript',
    is_private: false,
    activity: generateSampleActivity('active'),
  },
  {
    name: 'core-backend',
    status: 'active',
    statusLabel: 'Active',
    meta: 'Last commit 2 days ago · Go',
    is_private: true,
    activity: generateSampleActivity('active'),
  },
  {
    name: 'metrics-agent',
    status: 'cooling',
    statusLabel: 'Cooling',
    meta: 'Last commit 9 days ago · Rust',
    is_private: false,
    activity: generateSampleActivity('cooling'),
  },
  {
    name: 'legacy-importer',
    status: 'stale',
    statusLabel: 'Stale',
    meta: 'Last commit 24 days ago · Python',
    is_private: true,
    activity: generateSampleActivity('stale'),
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGithubLogin,
  onDevLogin,
  devEnabled = false,
  onNavigateLegal,
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
      } else if (errorParam === 'org_approval_pending') {
        setErrorMessage('Organization access is pending approval. Ask an owner of your organization to approve RepoPulse.');
      } else if (errorParam === 'saml_sso_required') {
        setErrorMessage('Your organization requires SAML SSO authorization before RepoPulse can access its repositories.');
      } else if (errorParam === 'rate_limited') {
        setErrorMessage('GitHub API rate limit reached. Sync will automatically resume shortly.');
      } else {
        setErrorMessage(`Authentication issue: ${errorParam}. Please try signing in again.`);
      }
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Top Header */}
      <header style={{
        borderBottom: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img src="/repopulse-mark.svg" alt="" width={24} height={24} style={{ display: 'block', flexShrink: 0 }} />
              RepoPulse
            </span>
            <nav style={{ display: 'flex', gap: '24px' }}>
              <a href="#how-it-decides" style={{ fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'none' }}>How it works</a>
              <a href="#share-cards" style={{ fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'none' }}>Share cards</a>
              <a href="#privacy-trust" style={{ fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'none' }}>Privacy</a>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {devEnabled && onDevLogin && (
              <button
                id="dev-login-btn"
                type="button"
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={onDevLogin}
              >
                Dev login
              </button>
            )}
            <button
              id="header-signin-btn"
              type="button"
              className="btn-primary"
              onClick={onGithubLogin}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <GithubIcon size={16} />
              Sign in with GitHub
            </button>
          </div>
        </div>
      </header>

      {/* Error Notice */}
      {errorMessage && (
        <div style={{
          maxWidth: '1120px',
          margin: '20px auto 0 auto',
          padding: '12px 24px',
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--heat-cooling)',
            borderRadius: 'var(--r)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--ink)',
          }}>
            <AlertCircle size={16} strokeWidth={1.75} style={{ color: 'var(--heat-cooling)', flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '64px 24px 80px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '48px', alignItems: 'start' }}>
          <div>
            <h1 style={{
              fontSize: '56px',
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '0 0 24px 0',
              color: 'var(--ink)',
            }}>
              Which of your repos are still alive?
            </h1>
            <p style={{
              fontSize: '18px',
              lineHeight: 1.5,
              color: 'var(--ink-2)',
              maxWidth: '52ch',
              margin: '0 0 32px 0',
            }}>
              RepoPulse reads your GitHub commit history, sorts every repo from active to dead, and helps you decide what to keep, pause or retire.
            </p>

            <div style={{ marginBottom: '32px' }}>
              <button
                id="hero-signin-btn"
                type="button"
                className="btn-primary"
                onClick={onGithubLogin}
                style={{
                  fontSize: '15px',
                  padding: '12px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <GithubIcon size={18} />
                Sign in with GitHub
              </button>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '8px' }}>
                By continuing you agree to the Terms and Privacy policy.
              </div>
            </div>

            {/* Trust Lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--ink-2)' }}>
                <Lock size={16} strokeWidth={1.75} style={{ color: 'var(--ink)' }} />
                <span>Read-only access to repository metadata and commit timestamps</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--ink-2)' }}>
                <Building2 size={16} strokeWidth={1.75} style={{ color: 'var(--ink)' }} />
                <span>Works with private repos and organizations</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--ink-2)' }}>
                <ListChecks size={16} strokeWidth={1.75} style={{ color: 'var(--ink)' }} />
                <span>You choose which repos it sees</span>
              </div>
            </div>
          </div>

          {/* Hero Visual: Component Preview */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '20px',
              boxShadow: 'none',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  Repository ledger
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
                  Sample data
                </span>
              </div>

              {/* Heat bar snippet */}
              <div style={{
                display: 'flex',
                height: '8px',
                borderRadius: 'var(--r)',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <div style={{ width: '35%', backgroundColor: 'var(--heat-active)' }} />
                <div style={{ width: '25%', backgroundColor: 'var(--heat-cooling)' }} />
                <div style={{ width: '25%', backgroundColor: 'var(--heat-stale)' }} />
                <div style={{ width: '15%', backgroundColor: 'var(--heat-dead)' }} />
              </div>

              {/* Sample Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--line)' }}>
                {SAMPLE_REPOS.map((repo) => (
                  <div
                    key={repo.name}
                    style={{
                      backgroundColor: 'var(--surface)',
                      padding: '12px 14px',
                      display: 'grid',
                      gridTemplateColumns: '1fr minmax(140px, 200px)',
                      alignItems: 'center',
                      gap: '16px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {repo.name}
                        </span>
                        {repo.is_private && <Lock size={12} strokeWidth={1.75} style={{ color: 'var(--ink-2)', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.meta}
                      </div>
                    </div>
                    <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                      <CommitStrip activity={repo.activity} status={repo.status} daysCount={90} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center', marginTop: '8px' }}>
              Live 90-day activity strips with instant health classification
            </div>
          </div>

        </div>
      </section>

      {/* Section 1: How it decides */}
      <section id="how-it-decides" style={{
        borderTop: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            How RepoPulse decides
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)', margin: '0 0 40px 0', maxWidth: '60ch' }}>
            A continuous temperature scale based strictly on your last commit date. Default thresholds can be customized at any time.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', backgroundColor: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--heat-active)', display: 'inline-block' }} />
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>Active</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Committed within the last 7 days. Your core momentum.
              </div>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', backgroundColor: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--heat-cooling)', display: 'inline-block' }} />
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>Cooling</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Untouched between 8 and 14 days. Needs a quick decision.
              </div>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', backgroundColor: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--heat-stale)', display: 'inline-block' }} />
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>Stale</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Untouched between 15 and 30 days. Slipping away.
              </div>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', backgroundColor: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--heat-dead)', display: 'inline-block' }} />
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>Dead</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Over 30 days without your commits. Ready to archive.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Decide in seconds (Triage) */}
      <section style={{ padding: '64px 24px', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Decide in seconds
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Stop hoarding dead side-projects. Triage presents each cooling repo one by one. Make your decision with rapid keyboard shortcuts.
            </p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>K · Keep going</strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Set an optional goal date</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>P · Pause</strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Pick a return date</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>R · Retire</strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Move cleanly to Archive</span>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '24px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '8px' }}>Triage 1 of 8</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
              metrics-agent
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '20px' }}>
              Last commit 9 days ago · Rust
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ border: '1px solid var(--line)', padding: '10px', textAlign: 'center', borderRadius: 'var(--r)' }}>
                <strong style={{ fontSize: '13px', display: 'block' }}>Keep going</strong>
                <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>[K]</span>
              </div>
              <div style={{ border: '1px solid var(--line)', padding: '10px', textAlign: 'center', borderRadius: 'var(--r)' }}>
                <strong style={{ fontSize: '13px', display: 'block' }}>Pause</strong>
                <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>[P]</span>
              </div>
              <div style={{ border: '1px solid var(--line)', padding: '10px', textAlign: 'center', borderRadius: 'var(--r)' }}>
                <strong style={{ fontSize: '13px', display: 'block' }}>Retire</strong>
                <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>[R]</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Private repos, organizations and teammates */}
      <section style={{
        borderTop: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Private repos, organizations and teammates
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)', margin: '0 0 36px 0', maxWidth: '60ch' }}>
            Full visibility across every repository you touch, with absolute control over access boundaries.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', backgroundColor: 'var(--paper)' }}>
              <Lock size={20} strokeWidth={1.75} style={{ color: 'var(--ink)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px 0' }}>
                Private by default
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                Private repos are fully tracked on your dashboard but anonymized by default on any public share cards.
              </p>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', backgroundColor: 'var(--paper)' }}>
              <Building2 size={20} strokeWidth={1.75} style={{ color: 'var(--ink)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px 0' }}>
                Multi-organization support
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                Install across multiple GitHub organizations. Separate your personal projects from team commitments.
              </p>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', backgroundColor: 'var(--paper)' }}>
              <Users size={20} strokeWidth={1.75} style={{ color: 'var(--ink)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px 0' }}>
                Team momentum tracking
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                See your personal contribution share alongside total team commit velocity on collaborative repositories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Share cards */}
      <section id="share-cards" style={{ padding: '64px 24px', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Customizable share cards
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)', margin: '0 0 36px 0', maxWidth: '60ch' }}>
            Turn your commit streaks and repository momentum into clean, high-resolution SVG and PNG cards.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* Card Sample 1: Summary */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Summary template
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '16px' }}>
                48 Commits · 6 Active repos
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--line)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: '60%', height: '100%', backgroundColor: 'var(--heat-active)' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                1200 × 630 Link preview
              </div>
            </div>

            {/* Card Sample 2: Streak */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Streak template
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)', margin: '8px 0' }}>
                24 DAYS
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '16px' }}>
                Current continuous daily streak
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                1080 × 1080 Square
              </div>
            </div>

            {/* Card Sample 3: Achievements */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Milestones template
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
                  <Flame size={16} strokeWidth={1.75} style={{ color: 'var(--heat-active)' }} />
                  <span>7-Day Momentum</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
                  <GitCommit size={16} strokeWidth={1.75} style={{ color: 'var(--heat-active)' }} />
                  <span>Century Velocity</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                1080 × 1350 Portrait
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Privacy & What we read */}
      <section id="privacy-trust" style={{
        borderTop: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            What we read and never store
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)', margin: '0 0 36px 0', maxWidth: '60ch' }}>
            Built with strict least-privilege principles. No source code ever passes through our servers.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', backgroundColor: 'var(--paper)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} strokeWidth={1.75} style={{ color: 'var(--heat-active)' }} />
                What RepoPulse reads
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>· Repository names, primary languages, and visibility (public or private)</li>
                <li>· Commit timestamps and daily commit counts</li>
                <li>· Contributor logins and avatars for collaborative projects</li>
                <li>· Only the repositories you explicitly select during installation</li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', backgroundColor: 'var(--paper)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Minus size={18} strokeWidth={1.75} style={{ color: 'var(--ink-2)' }} />
                What RepoPulse never reads or stores
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>· Source code files, branches, and diff contents</li>
                <li>· Commit messages or issue comments</li>
                <li>· Pull request text or file trees</li>
                <li>· Long-lived GitHub personal credentials</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Questions */}
      <section style={{ padding: '64px 24px', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 32px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Common questions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                Does RepoPulse require write access?
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                No. RepoPulse operates with read-only metadata and commit permissions through the official GitHub App standard.
              </p>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                Can I connect multiple organizations?
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                Yes. You can install the GitHub App across your personal account and any number of organizations.
              </p>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                How are private repositories protected?
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                All tenant tables enforce Row-Level Security in PostgreSQL. Private repository names are never included on public share cards unless explicitly enabled.
              </p>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                Can I export or delete my data?
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                Yes. Full JSON export and 1-click account deletion with complete cascade are available in Settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Final CTA Band */}
      <section style={{
        borderTop: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        padding: '64px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--ink)' }}>
            Take control of your repositories
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            Connect with GitHub in seconds. No credit card, no passwords, and read-only least privilege permissions.
          </p>
          <button
            id="bottom-signin-btn"
            type="button"
            className="btn-primary"
            onClick={onGithubLogin}
            style={{ fontSize: '15px', padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <GithubIcon size={18} />
            Sign in with GitHub
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: 'var(--ink-2)',
        }}>
          <div>
            RepoPulse · Built for developers
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('privacy')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              Privacy policy
            </button>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('terms')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              Terms of service
            </button>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>GitHub</a>
            <a href="mailto:support@repopulse.dev" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
