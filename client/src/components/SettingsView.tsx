import React, { useState } from 'react';
import type { UserSettings, InstallationStatus, ThemeChoice } from '../types.js';

interface SettingsViewProps {
  settings: UserSettings;
  installation: InstallationStatus;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  onExportData: () => void;
  onDeleteAccount: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  installation,
  onUpdateSettings,
  onExportData,
  onDeleteAccount,
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

  // Determine if threshold values changed from saved settings
  const hasThresholdsChanged =
    activeDays !== settings.active_days ||
    coolingDays !== settings.cooling_days ||
    staleDays !== settings.stale_days;

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setThresholdError(null);

    if (activeDays >= coolingDays) {
      setThresholdError('Active days must be less than Cooling days.');
      return;
    }
    if (coolingDays >= staleDays) {
      setThresholdError('Cooling days must be less than Stale days.');
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
      setThresholdError(err.message || 'Failed to save thresholds');
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
    <div className="settings-ledger">
      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          Configure repository activity thresholds, appearance preferences, and data portability.
        </p>
      </div>

      {/* Row 1: Status Thresholds as an Inline Sentence */}
      <form onSubmit={handleSaveThresholds} className="settings-row">
        <div className="settings-meta">
          <div className="settings-label">Activity Thresholds</div>
          <div className="settings-desc">
            Controls how days of inactivity group repositories across the temperature scale.
          </div>
          {thresholdError && (
            <div style={{ color: 'var(--heat-active)', fontSize: '13px', marginTop: '4px' }}>
              {thresholdError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="threshold-sentence">
            <span>Active up to</span>
            <input
              type="number"
              min={1}
              max={90}
              className="inline-num-input"
              value={activeDays}
              onChange={(e) => setActiveDays(Number(e.target.value))}
            />
            <span>days, Cooling up to</span>
            <input
              type="number"
              min={2}
              max={180}
              className="inline-num-input"
              value={coolingDays}
              onChange={(e) => setCoolingDays(Number(e.target.value))}
            />
            <span>, Stale up to</span>
            <input
              type="number"
              min={3}
              max={365}
              className="inline-num-input"
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
            />
            <span>. After that: Dead.</span>
          </div>

          <button
            type="submit"
            className="btn-ink"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            disabled={!hasThresholdsChanged || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save thresholds'}
          </button>
        </div>
      </form>

      {/* Row 2: Theme Segmented Control */}
      <div className="settings-row">
        <div className="settings-meta">
          <div className="settings-label">Appearance Theme</div>
          <div className="settings-desc">
            Select light, dark, or follow your operating system default.
          </div>
        </div>

        <div className="segmented-control" role="group" aria-label="Theme selection">
          <button
            type="button"
            className={`segmented-btn ${theme === 'system' ? 'active' : ''}`}
            onClick={() => handleThemeChange('system')}
          >
            System
          </button>
          <button
            type="button"
            className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Row 3: GitHub Connection Details */}
      <div className="settings-row">
        <div className="settings-meta">
          <div className="settings-label">GitHub Integration</div>
          <div className="settings-desc">
            {installation.connected
              ? `Connected to GitHub account ${installation.account_login} via GitHub App.`
              : 'Operating with connected repositories.'}
          </div>
        </div>

        <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
          Read-only access
        </span>
      </div>

      {/* Row 4: Data Export */}
      <div className="settings-row">
        <div className="settings-meta">
          <div className="settings-label">Data Portability</div>
          <div className="settings-desc">
            Download your full repository activity ledger, custom labels, notes, and audit trails as JSON.
          </div>
        </div>

        <button type="button" className="btn-outline" onClick={onExportData}>
          Export all data (JSON)
        </button>
      </div>

      {/* Row 5: Delete Account */}
      <div className="settings-row">
        <div className="settings-meta">
          <div className="settings-label" style={{ color: 'var(--heat-active)' }}>
            Delete Account
          </div>
          <div className="settings-desc">
            Permanently delete your account and all associated repository metadata.
          </div>
        </div>

        <button
          type="button"
          className="btn-ember-outline"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--heat-active)', marginBottom: '8px' }}>
              Confirm Account Deletion
            </h2>
            <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>
              This will permanently delete all your stored repository records, activity strips, custom labels, notes, and sessions.
            </p>
            <p style={{ fontSize: '13px', marginBottom: '12px' }}>
              To confirm, type <strong style={{ fontFamily: 'var(--mono)' }}>delete</strong> below:
            </p>
            <input
              type="text"
              className="clean-input"
              style={{ marginBottom: '16px' }}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-ember-outline"
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
