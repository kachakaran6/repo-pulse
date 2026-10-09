import React, { useState } from 'react';
import type { UserSettings, InstallationStatus, ThemeChoice } from '../types.js';
import { ExternalLink, AlertCircle, Trash2, Download } from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  installation: InstallationStatus;
  installations?: any[];
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  onExportData: () => void;
  onDeleteAccount: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  installation,
  installations = [],
  onUpdateSettings,
  onExportData,
  onDeleteAccount,
}) => {
  const [activeDays, setActiveDays] = useState(settings.active_days);
  const [coolingDays, setCoolingDays] = useState(settings.cooling_days);
  const [staleDays, setStaleDays] = useState(settings.stale_days);
  const [theme, setTheme] = useState<ThemeChoice>(settings.theme);

  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const hasThresholdsChanged =
    activeDays !== settings.active_days ||
    coolingDays !== settings.cooling_days ||
    staleDays !== settings.stale_days;

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setThresholdError(null);
    setThresholdSuccess(false);

    if (activeDays <= 0 || coolingDays <= 0 || staleDays <= 0) {
      setThresholdError('All thresholds must be positive numbers.');
      return;
    }

    if (activeDays >= coolingDays) {
      setThresholdError('Active days must be strictly less than Cooling days.');
      return;
    }
    if (coolingDays >= staleDays) {
      setThresholdError('Cooling days must be strictly less than Stale days.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateSettings({
        active_days: activeDays,
        cooling_days: coolingDays,
        stale_days: staleDays,
      });
      setThresholdSuccess(true);
      setTimeout(() => setThresholdSuccess(false), 3000);
    } catch (err: any) {
      setThresholdError(err.message || 'Failed to save thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeChoice) => {
    setTheme(newTheme);
    await onUpdateSettings({ theme: newTheme });
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const effectiveInstallations = installations.length > 0
    ? installations
    : (installation.connected ? [{
        id: '1',
        account_login: installation.account_login || 'Personal Account',
        account_type: 'User',
        selection: installation.repository_selection || 'all',
        repo_count: installation.repository_count || 0,
        private_repo_count: 0,
        public_repo_count: installation.repository_count || 0,
        github_installation_id: installation.installation_id || '0',
      }] : []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 0 64px 0' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 32px 0', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Section: Thresholds */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              Status thresholds
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              Define when a repository transitions from active to cooling, stale, and dead.
            </span>
          </div>

          <form onSubmit={handleSaveThresholds}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--ink)',
              lineHeight: 2,
              marginBottom: '16px',
            }}>
              <span>Active up to</span>
              <input
                id="active-days-input"
                type="number"
                min="1"
                max="365"
                value={activeDays}
                onChange={(e) => setActiveDays(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '64px',
                  padding: '4px 8px',
                  fontFamily: 'var(--mono)',
                  fontSize: '14px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r)',
                  color: 'var(--ink)',
                  textAlign: 'center',
                }}
              />
              <span>days, Cooling up to</span>
              <input
                id="cooling-days-input"
                type="number"
                min="1"
                max="365"
                value={coolingDays}
                onChange={(e) => setCoolingDays(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '64px',
                  padding: '4px 8px',
                  fontFamily: 'var(--mono)',
                  fontSize: '14px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r)',
                  color: 'var(--ink)',
                  textAlign: 'center',
                }}
              />
              <span>days, Stale up to</span>
              <input
                id="stale-days-input"
                type="number"
                min="1"
                max="365"
                value={staleDays}
                onChange={(e) => setStaleDays(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '64px',
                  padding: '4px 8px',
                  fontFamily: 'var(--mono)',
                  fontSize: '14px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r)',
                  color: 'var(--ink)',
                  textAlign: 'center',
                }}
              />
              <span>days. After that: <strong>Dead</strong>.</span>
            </div>

            {thresholdError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--heat-active)', marginBottom: '12px' }}>
                <AlertCircle size={15} strokeWidth={1.75} />
                <span>{thresholdError}</span>
              </div>
            )}

            {thresholdSuccess && (
              <div style={{ fontSize: '13px', color: 'var(--heat-cooling)', marginBottom: '12px' }}>
                Thresholds saved successfully.
              </div>
            )}

            <button
              id="save-thresholds-btn"
              type="submit"
              className="btn-primary"
              disabled={!hasThresholdsChanged || isSaving}
              style={{ fontSize: '13px', padding: '6px 16px' }}
            >
              {isSaving ? 'Saving...' : 'Save thresholds'}
            </button>
          </form>
        </div>

        {/* Section: Theme */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              Interface theme
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              Follow system appearance or force a specific mode.
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--surface-2)',
            padding: '2px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--line)',
          }}>
            {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleThemeChange(t)}
                style={{
                  padding: '4px 14px',
                  fontSize: '13px',
                  fontWeight: theme === t ? 600 : 400,
                  backgroundColor: theme === t ? 'var(--surface)' : 'transparent',
                  color: theme === t ? 'var(--ink)' : 'var(--ink-2)',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'var(--transition)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Section: Repository access (W2) */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              Repository access
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              GitHub App installations and account permissions.
            </span>
          </div>

          {effectiveInstallations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {effectiveInstallations.map((inst, idx) => (
                <div
                  key={inst.id || idx}
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>
                      {inst.account_login}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      {inst.selection === 'all' ? 'All repositories' : `Only ${inst.repo_count || 0} selected`}
                      {inst.private_repo_count > 0 && ` (${inst.private_repo_count} private)`}
                    </div>
                  </div>

                  <a
                    href={`https://github.com/settings/installations/${inst.github_installation_id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      padding: '4px 10px',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r)',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    Manage on GitHub
                    <ExternalLink size={13} strokeWidth={1.75} />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              No installations active. Install the GitHub App on your account.
            </div>
          )}
        </div>

        {/* Section: Saved views management */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              Saved views
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              Custom filter presets and repository ledger configurations.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  Needs decision
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                  Filters: Status (Cooling, Stale) · Sort: Newest commit
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ink-2)', fontStyle: 'italic' }}>Default system view</span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  Private and stale
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                  Filters: Visibility (Private) · Status (Stale, Dead)
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ink-2)', fontStyle: 'italic' }}>Default system view</span>
            </div>
          </div>
        </div>

        {/* Section: Danger zone */}
        <div style={{ padding: '24px 0' }}>

          <div style={{ marginBottom: '16px' }}>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              Danger zone
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              Export your data or permanently delete your account.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              id="export-data-btn"
              type="button"
              className="btn-secondary"
              onClick={onExportData}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <Download size={15} strokeWidth={1.75} />
              Export data (JSON)
            </button>

            <button
              id="delete-account-btn"
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                padding: '6px 14px',
                backgroundColor: 'transparent',
                border: '1px solid var(--heat-active)',
                color: 'var(--heat-active)',
                borderRadius: 'var(--r)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--ink)' }}>
              Delete account permanently
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              This action cannot be undone. All your synchronized repositories, commit histories, metadata labels, triage decisions, and saved views will be permanently purged from PostgreSQL.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ink)', margin: '0 0 12px 0' }}>
              Type <strong>DELETE</strong> below to confirm:
            </p>

            <form onSubmit={handleDeleteAccountSubmit}>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontFamily: 'var(--mono)',
                  fontSize: '14px',
                  backgroundColor: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r)',
                  color: 'var(--ink)',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  type="submit"
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  style={{
                    backgroundColor: 'var(--heat-active)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--r)',
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: deleteConfirmText === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                    opacity: deleteConfirmText === 'DELETE' && !isDeleting ? 1 : 0.5,
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
