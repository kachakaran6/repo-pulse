import React, { useState } from 'react';
import type { UserSettings, InstallationStatus, ThemeChoice } from '../types.js';
import { ExternalLink, AlertCircle, Trash2, Download } from 'lucide-react';
import { PageHeader } from './layout/PageHeader.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    <div className="mx-auto max-w-2xl pb-16">
      <PageHeader
        title="Settings"
        description="Thresholds, theme, GitHub access, and account controls."
      />

      <div className="settings-ledger">
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

        <div className="settings-row flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div className="settings-meta">
            <div className="settings-label">Interface theme</div>
            <p className="settings-desc">Follow system appearance or force a specific mode.</p>
          </div>
          <div className="inline-flex rounded-sm border border-border bg-muted p-0.5">
            {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={theme === t ? 'secondary' : 'ghost'}
                size="sm"
                className="capitalize"
                onClick={() => handleThemeChange(t)}
              >
                {t}
              </Button>
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

      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        setShowDeleteModal(open);
        if (!open) setDeleteConfirmText('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account permanently</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All synchronized repositories, commit histories, metadata,
              triage decisions, and saved views will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAccountSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="delete-confirm-input">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                id="confirm-delete-btn"
                type="submit"
                variant="destructive"
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete permanently'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
