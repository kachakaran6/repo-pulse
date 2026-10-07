import React, { useState } from 'react';
import type { UserSettings, InstallationStatus, ThemeChoice } from '../types.js';

interface SettingsViewProps {
  settings: UserSettings;
  installation: InstallationStatus;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  onExportData: () => void;
  onDeleteAccount: () => Promise<void>;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  installation,
  onUpdateSettings,
  onExportData,
  onDeleteAccount,
  onSync,
  isSyncing,
}) => {
  const [activeDays, setActiveDays] = useState(settings.active_days);
  const [coolingDays, setCoolingDays] = useState(settings.cooling_days);
  const [staleDays, setStaleDays] = useState(settings.stale_days);
  const [theme, setTheme] = useState<ThemeChoice>(settings.theme);

  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setThresholdError(null);

    if (activeDays >= coolingDays) {
      setThresholdError('Active days must be strictly less than cooling days.');
      return;
    }
    if (coolingDays >= staleDays) {
      setThresholdError('Cooling days must be strictly less than stale days.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateSettings({
        active_days: activeDays,
        cooling_days: coolingDays,
        stale_days: staleDays,
      });
    } catch (err: any) {
      setThresholdError(err.message || 'Failed to update thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeChoice) => {
    setTheme(newTheme);
    await onUpdateSettings({ theme: newTheme });
  };

  const handleDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* 1. Thresholds Settings */}
      <section className="settings-section">
        <h2 className="settings-heading">Activity Status Thresholds</h2>
        <p className="settings-desc">
          Customize the days without commits before a repository transitions from Active to Cooling, Stale, and Dead.
        </p>

        <form onSubmit={handleSaveThresholds}>
          <div className="form-group-row">
            <div className="form-field">
              <label className="form-label" htmlFor="active-threshold-input">Active (days)</label>
              <input
                id="active-threshold-input"
                type="number"
                min={1}
                max={90}
                className="form-input"
                value={activeDays}
                onChange={(e) => setActiveDays(Number(e.target.value))}
              />
              <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                0 to {activeDays} days
              </span>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="cooling-threshold-input">Cooling (days)</label>
              <input
                id="cooling-threshold-input"
                type="number"
                min={2}
                max={180}
                className="form-input"
                value={coolingDays}
                onChange={(e) => setCoolingDays(Number(e.target.value))}
              />
              <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                {activeDays + 1} to {coolingDays} days
              </span>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="stale-threshold-input">Stale (days)</label>
              <input
                id="stale-threshold-input"
                type="number"
                min={3}
                max={365}
                className="form-input"
                value={staleDays}
                onChange={(e) => setStaleDays(Number(e.target.value))}
              />
              <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                {coolingDays + 1} to {staleDays} days
              </span>
            </div>
          </div>

          {thresholdError && (
            <div style={{ color: 'var(--stale)', fontSize: '13px', marginBottom: '12px' }}>
              {thresholdError}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save thresholds'}
          </button>
        </form>
      </section>

      {/* 2. Theme Preferences */}
      <section className="settings-section">
        <h2 className="settings-heading">Theme & Appearance</h2>
        <p className="settings-desc">
          Choose your interface theme. System option follows your OS color preference.
        </p>

        <div className="theme-options">
          <button
            type="button"
            className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
            onClick={() => handleThemeChange('system')}
          >
            System
          </button>
          <button
            type="button"
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            Dark
          </button>
        </div>
      </section>

      {/* 3. GitHub Connection */}
      <section className="settings-section">
        <h2 className="settings-heading">GitHub Connection</h2>
        <p className="settings-desc">
          RepoPulse reads repository metadata and commit frequencies through short-lived installation tokens.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              {installation.connected
                ? `Connected to GitHub Account: ${installation.account_login}`
                : 'Connected in Developer Mode'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              Read-only contents and commit activity. No long-lived tokens stored.
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync repositories now'}
          </button>
        </div>
      </section>

      {/* 4. Export Data */}
      <section className="settings-section">
        <h2 className="settings-heading">Data Portability</h2>
        <p className="settings-desc">
          Export all of your repository data, commit logs, labels, goals, notes, and audit trails as a formatted JSON file.
        </p>
        <button type="button" className="btn-secondary" onClick={onExportData}>
          Export all data (JSON)
        </button>
      </section>

      {/* 5. Delete Account */}
      <section className="settings-section" style={{ borderColor: 'var(--stale)' }}>
        <h2 className="settings-heading" style={{ color: 'var(--stale)' }}>Delete Account</h2>
        <p className="settings-desc">
          Permanently delete your account and all associated repository metadata. This action is irreversible.
        </p>
        <button
          type="button"
          className="btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete my account...
        </button>
      </section>

      {/* Delete Confirmation Dialog */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--stale)', marginBottom: '8px' }}>
              Confirm Permanent Account Deletion
            </h2>
            <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>
              This will immediately and permanently delete:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '16px', lineHeight: 1.6 }}>
              <li>All stored repository records and commit activity strips</li>
              <li>All custom labels, milestone goals, personal notes, and triage decisions</li>
              <li>All user settings, preferences, and active login sessions</li>
              <li>All audit event records associated with your account</li>
            </ul>
            <p style={{ fontSize: '13px', marginBottom: '12px' }}>
              To confirm, type <strong style={{ fontFamily: 'var(--mono)' }}>delete</strong> below:
            </p>
            <input
              type="text"
              className="form-input"
              style={{ marginBottom: '16px' }}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={deleteConfirmText.toLowerCase() !== 'delete' || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? 'Deleting...' : 'Permanently delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
