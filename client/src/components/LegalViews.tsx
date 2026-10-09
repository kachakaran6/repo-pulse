import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ type, onBack }) => {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Privacy policy' : 'Terms of service';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--paper)', color: 'var(--ink)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn-quiet"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to home
        </button>

        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r)',
          padding: '40px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--heat-cooling)',
            marginBottom: '12px',
          }}>
            Draft for legal review
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 24px 0', color: 'var(--ink)' }}>
            {title}
          </h1>

          {isPrivacy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: 1.6, color: 'var(--ink-2)' }}>
              <p>
                RepoPulse is designed with strict least-privilege principles. We only access repository metadata and commit activity timestamps required to calculate momentum and liveliness.
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                1. Information We Collect
              </h2>
              <p>
                When you connect your GitHub account via GitHub App authorization, we store your GitHub user identifier, username, avatar URL, and the metadata of the repositories you have granted us access to (repository name, visibility, primary language, and commit timestamp distributions).
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                2. What We Never Access
              </h2>
              <p>
                RepoPulse never reads, clones, stores, or transmits your actual source code, commit diffs, commit messages, issue contents, or pull requests.
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                3. Tenant Isolation & Data Deletion
              </h2>
              <p>
                Every user's data is isolated with PostgreSQL Row-Level Security (RLS). You may export your entire dataset or delete your account with complete cascading removal at any time in Settings.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: 1.6, color: 'var(--ink-2)' }}>
              <p>
                By using RepoPulse, you agree to these Terms of Service. RepoPulse provides repository lifecycle and momentum analytics for GitHub accounts.
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                1. Service Usage
              </h2>
              <p>
                You represent that you have the right and authority to authorize access to the repositories you connect to RepoPulse.
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                2. Disclaimer of Warranties
              </h2>
              <p>
                RepoPulse is provided "as is" without warranty of any kind. We do not guarantee uninterrupted availability.
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '16px 0 8px 0' }}>
                3. Account Termination
              </h2>
              <p>
                You may terminate your account at any time through the Settings dashboard, which immediately removes your data from our systems.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
