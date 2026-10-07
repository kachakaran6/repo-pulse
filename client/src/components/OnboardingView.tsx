import React from 'react';
import { Thermometer, Keyboard, ShieldCheck, Check, Minus } from 'lucide-react';

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
    // Recent activity in last 7 days + regular history
    [89, 88, 86, 84, 82, 80, 78, 75, 71, 68, 64, 60, 55, 52, 48, 44, 40, 35, 30, 25, 20, 15, 10, 5, 2, 0].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 4) + 1);
    });
    days[89] = 3;
    days[88] = 5;
    days[86] = 2;
  } else if (pattern === 'cooling') {
    // Last commit was 9-12 days ago
    [75, 72, 68, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 3) + 1);
    });
  } else if (pattern === 'stale') {
    // Last commit was 18-24 days ago
    [65, 60, 55, 50, 42, 35, 28, 20].forEach((idx) => {
      days[89 - idx] = Math.floor((idx % 3) + 1);
    });
  } else {
    // Dead: no commits in last 45+ days
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

export const OnboardingView: React.FC = () => {
  return (
    <div className="landing-page">
      {/* 1. Header (Once, wordmark left text only, sign in actions right) */}
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a href="/" className="landing-wordmark">
            RepoPulse
          </a>

          <nav className="landing-nav" aria-label="Main Navigation">
            <a href="/auth/github/start" className="landing-nav-link">
              Sign in
            </a>
            <a href="/auth/github/start" className="landing-btn-primary">
              Sign in with GitHub
            </a>
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

            <div className="landing-hero-actions">
              <a href="/auth/github/start" className="landing-btn-primary">
                Sign in with GitHub
              </a>
              <a href="#sample-preview" className="landing-link-quiet">
                See a sample
              </a>
            </div>

            <p className="landing-hero-note">
              Read-only access to the repos you choose.
            </p>
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
          <div>
            <a href="/auth/github/start" className="landing-btn-inverted">
              Sign in with GitHub
            </a>
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
    </div>
  );
};
