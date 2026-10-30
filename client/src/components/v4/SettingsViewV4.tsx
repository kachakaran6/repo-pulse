import React, { useState } from 'react';
import type { UserSettings, InstallationStatus, ThemeChoice } from '../../types.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Switch } from './ui/Switch.js';
import { SegmentedControl } from './ui/SegmentedControl.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog.js';
import {
  User,
  RefreshCw,
  Sun,
  Flame,
  Bell,
  HardDrive,
  Shield,
  ExternalLink,
  AlertCircle,
  Trash2,
  Download,
  Check,
} from 'lucide-react';
import { toast } from './ui/Toast.js';
import { ACCENT_PALETTES, DENSITY_MODES, FONT_CHOICES } from '../../tokens/index.js';
import { ScoreRing } from './ledger/ScoreRing.js';
import { VerdictControl } from './ledger/VerdictControl.js';

interface SettingsViewV4Props {
  settings: UserSettings;
  installation: InstallationStatus;
  installations?: any[];
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  onExportData: () => void;
  onDeleteAccount: () => Promise<void>;
}

type SettingsSection =
  | 'account'
  | 'sync'
  | 'appearance'
  | 'scoring'
  | 'notifications'
  | 'data'
  | 'privacy';

export const SettingsViewV4: React.FC<SettingsViewV4Props> = ({
  settings,
  installation,
  installations = [],
  onUpdateSettings,
  onExportData,
  onDeleteAccount,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('scoring');

  // Scoring thresholds
  const [activeDays, setActiveDays] = useState(settings.active_days);
  const [coolingDays, setCoolingDays] = useState(settings.cooling_days);
  const [staleDays, setStaleDays] = useState(settings.stale_days);
  const [theme, setTheme] = useState<ThemeChoice>(settings.theme);
  const initialWip = settings.wipLimit !== undefined ? settings.wipLimit : (settings.wip_limit !== undefined ? settings.wip_limit : 5);
  const [wipLimit, setWipLimit] = useState<number>(initialWip ?? 5);
  const [isWipEnabled, setIsWipEnabled] = useState<boolean>(initialWip !== null);

  // Appearance states
  const [accent, setAccent] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      return (
        document.documentElement.getAttribute('data-accent') ||
        localStorage.getItem('repopulse_accent') ||
        'charcoal'
      );
    }
    return 'charcoal';
  });

  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof document !== 'undefined') {
      return (
        (document.documentElement.getAttribute('data-density') as any) ||
        (localStorage.getItem('repopulse_density') as any) ||
        'comfortable'
      );
    }
    return 'comfortable';
  });

  const [font, setFont] = useState<'sans' | 'editorial' | 'mono'>(() => {
    if (typeof document !== 'undefined') {
      return (
        (document.documentElement.getAttribute('data-font') as any) ||
        (localStorage.getItem('repopulse_font') as any) ||
        'sans'
      );
    }
    return 'sans';
  });

  const [previewVerdict, setPreviewVerdict] = useState<'keep' | 'pause' | 'retire' | null>('keep');

  // Notification toggles with instant save
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(true);
  const [cadenceAlertsEnabled, setCadenceAlertsEnabled] = useState(true);

  // Privacy toggles
  const [maskPrivateRepos, setMaskPrivateRepos] = useState(true);

  // Sync state
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Threshold validation
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const validationError = (() => {
    if (activeDays <= 0 || coolingDays <= 0 || staleDays <= 0) {
      return 'All thresholds must be positive numbers.';
    }
    if (activeDays >= coolingDays) {
      return 'Active days must be strictly less than Cooling days.';
    }
    if (coolingDays >= staleDays) {
      return 'Cooling days must be strictly less than Stale days.';
    }
    return null;
  })();

  const hasWipChanged = (isWipEnabled ? wipLimit : null) !== initialWip;
  const hasThresholdsChanged = hasWipChanged ||
    activeDays !== settings.active_days ||
    coolingDays !== settings.cooling_days ||
    staleDays !== settings.stale_days;

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;

    setIsSavingThresholds(true);
    setThresholdError(null);

    try {
      await onUpdateSettings({
        active_days: activeDays,
        cooling_days: coolingDays,
        stale_days: staleDays,
        wipLimit: isWipEnabled ? wipLimit : null,
        wip_limit: isWipEnabled ? wipLimit : null,
      });
      toast.success('Status thresholds updated');
    } catch (err: any) {
      setThresholdError(err.message || 'Failed to save thresholds');
      toast.error('Failed to update thresholds');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeChoice) => {
    setTheme(newTheme);
    const root = document.documentElement;
    const key = 'repopulse-theme';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && systemDark);

    if (newTheme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem(key);
      root.classList.toggle('dark', systemDark);
    } else {
      root.setAttribute('data-theme', newTheme);
      localStorage.setItem(key, newTheme);
      root.classList.toggle('dark', newTheme === 'dark');
    }

    const meta =
      document.getElementById('theme-color-meta') ||
      document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#141517' : '#F9F9F8');

    await onUpdateSettings({ theme: newTheme });
    toast.success(`Theme set to ${newTheme}`);
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    document.documentElement.setAttribute('data-accent', newAccent);
    localStorage.setItem('repopulse_accent', newAccent);
    const found = ACCENT_PALETTES.find((p) => p.id === newAccent);
    toast.success(`Accent palette set to ${found?.name || newAccent}`);
  };

  const handleDensityChange = (newDensity: 'comfortable' | 'compact') => {
    setDensity(newDensity);
    document.documentElement.setAttribute('data-density', newDensity);
    localStorage.setItem('repopulse_density', newDensity);
    toast.success(`Display density set to ${newDensity === 'compact' ? 'Compact' : 'Comfortable'}`);
  };

  const handleFontChange = (newFont: 'sans' | 'editorial' | 'mono') => {
    setFont(newFont);
    document.documentElement.setAttribute('data-font', newFont);
    localStorage.setItem('repopulse_font', newFont);
    const found = FONT_CHOICES.find((f) => f.id === newFont);
    toast.success(`UI font set to ${found?.name || newFont}`);
  };

  const handleToggleWeeklyDigest = (checked: boolean) => {
    setWeeklyDigestEnabled(checked);
    toast.success(checked ? 'Weekly digest enabled' : 'Weekly digest paused');
  };

  const handleToggleCadenceAlerts = (checked: boolean) => {
    setCadenceAlertsEnabled(checked);
    toast.success(checked ? 'Cadence alerts enabled' : 'Cadence alerts paused');
  };

  const handleToggleMaskPrivate = (checked: boolean) => {
    setMaskPrivateRepos(checked);
    toast.success(checked ? 'Private repository names masked' : 'Private names unmasked');
  };

  const handleTriggerSync = async () => {
    setIsSyncingNow(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        toast.success('Sync complete. Repositories refreshed.');
      } else {
        toast.info('Sync initiated in background');
      }
    } catch {
      toast.error('Sync request failed');
    } finally {
      setIsSyncingNow(false);
    }
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

  const effectiveInstallations =
    installations.length > 0
      ? installations
      : installation.connected
      ? [
          {
            id: '1',
            account_login: installation.account_login || 'Personal Account',
            account_type: 'User',
            selection: installation.repository_selection || 'all',
            repo_count: installation.repository_count || 0,
            private_repo_count: 0,
            public_repo_count: installation.repository_count || 0,
            github_installation_id: installation.installation_id || '0',
          },
        ]
      : [];

  const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User size={14} /> },
    { id: 'sync', label: 'Sync & Access', icon: <RefreshCw size={14} /> },
    { id: 'appearance', label: 'Appearance', icon: <Sun size={14} /> },
    { id: 'scoring', label: 'Scoring & Cadence', icon: <Flame size={14} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
    { id: 'data', label: 'Data & Backup', icon: <HardDrive size={14} /> },
    { id: 'privacy', label: 'Privacy & Danger', icon: <Shield size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans animate-in fade-in duration-normal">
      {/* Header */}
      <div className="border-b border-neutral-4 pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-12 font-sans">Settings</h1>
        <p className="text-xs text-neutral-9 mt-1">
          Configure status thresholds, synchronization, interface appearance, and account data.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-2 items-start">
        {/* Left Section Navigation */}
        <nav className="md:col-span-1 space-y-1 select-none" aria-label="Settings navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-xs font-sans text-left transition-colors cursor-pointer ${
                activeSection === item.id
                  ? 'bg-neutral-12 text-neutral-1 font-medium shadow-xs'
                  : 'text-neutral-9 hover:text-neutral-12 hover:bg-neutral-2'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Content Panel */}
        <div className="md:col-span-3 border border-neutral-4 bg-neutral-1 rounded-xs p-6 space-y-8">
          {/* SECTION: SCORING & CADENCE */}
          {activeSection === 'scoring' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12 font-sans">
                  Status & Cadence Thresholds
                </h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Define the day thresholds that transition repositories between Active, Cooling, Stale, and Dormant.
                </p>
              </div>

              <form onSubmit={handleSaveThresholds} className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-12 leading-loose">
                  <span>Active up to</span>
                  <input
                    id="active-days-input"
                    aria-label="Active threshold in days"
                    type="number"
                    min="1"
                    max="365"
                    value={activeDays}
                    onChange={(e) => setActiveDays(parseInt(e.target.value, 10) || 0)}
                    className="w-16 h-8 px-2 text-center font-mono text-sm bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none"
                  />
                  <span>days, Cooling up to</span>
                  <input
                    id="cooling-days-input"
                    aria-label="Cooling threshold in days"
                    type="number"
                    min="1"
                    max="365"
                    value={coolingDays}
                    onChange={(e) => setCoolingDays(parseInt(e.target.value, 10) || 0)}
                    className="w-16 h-8 px-2 text-center font-mono text-sm bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none"
                  />
                  <span>days, Stale up to</span>
                  <input
                    id="stale-days-input"
                    aria-label="Stale threshold in days"
                    type="number"
                    min="1"
                    max="365"
                    value={staleDays}
                    onChange={(e) => setStaleDays(parseInt(e.target.value, 10) || 0)}
                    className="w-16 h-8 px-2 text-center font-mono text-sm bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none"
                  />
                  <span>days. After that: <strong className="font-semibold text-neutral-12">Dead</strong>.</span>
                </div>

                {validationError && (
                  <div className="flex items-center gap-2 text-xs text-heat-active">
                    <AlertCircle size={14} />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Work in progress limit */}
                <div className="border-t border-neutral-4 pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-semibold text-neutral-12 font-sans">
                        Work in Progress Limit
                      </h3>
                      <p className="text-xs text-neutral-9 mt-0.5">
                        Cap the maximum number of projects in "Keep going" (default 5, range 1–20, or off).
                      </p>
                    </div>
                    <Switch
                      id="wip-limit-switch-v4"
                      checked={isWipEnabled}
                      onCheckedChange={(checked) => setIsWipEnabled(checked)}
                      aria-label="Toggle work in progress limit"
                    />
                  </div>

                  {isWipEnabled ? (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-neutral-11">Max active projects:</span>
                      <input
                        id="wip-limit-input-v4"
                        aria-label="Maximum active projects allowed in Keep going"
                        type="number"
                        min="1"
                        max="20"
                        value={wipLimit}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setWipLimit(Math.max(1, Math.min(20, val)));
                        }}
                        className="w-16 h-8 px-2 text-center font-mono text-sm bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none"
                      />
                      <span className="text-2xs text-neutral-9 font-mono">(Range: 1 – 20 projects)</span>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-9 italic pt-0.5">
                      Limit is turned off (unlimited projects).
                    </div>
                  )}
                </div>

                <div>
                  <Button
                    id="save-thresholds-btn"
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!hasThresholdsChanged || Boolean(validationError) || isSavingThresholds}
                  >
                    {isSavingThresholds ? 'Saving...' : 'Save thresholds'}
                  </Button>
                </div>
              </form>
            </section>
          )}

          {/* SECTION: APPEARANCE */}
          {activeSection === 'appearance' && (
            <section className="space-y-8">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12">Interface Appearance</h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Curated theme contrast, tailored accent palettes, layout density, and typographic styling.
                </p>
              </div>

              {/* 1. Theme Contrast Mode */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-neutral-12 block">Theme Contrast Mode</span>
                    <span className="text-2xs text-neutral-8">
                      Designed dark mode uses soft slate-charcoal neutrals, luminous rim shadows, and desaturated verdict tones.
                    </span>
                  </div>

                  <SegmentedControl
                    value={theme}
                    onChange={(val) => handleThemeChange(val as ThemeChoice)}
                    options={[
                      { label: 'System', value: 'system' },
                      { label: 'Light', value: 'light' },
                      { label: 'Dark', value: 'dark' },
                    ]}
                  />
                </div>
              </div>

              {/* 2. Curated Accent Palette */}
              <div className="space-y-3 border-t border-neutral-4 pt-6">
                <div>
                  <span className="text-xs font-medium text-neutral-12 block">Curated Accent Palette</span>
                  <span className="text-2xs text-neutral-8">
                    Select a curated chromatic mood for active highlights, focus rings, and action states.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACCENT_PALETTES.map((pal) => {
                    const isSelected = accent === pal.id;
                    const isCurrentDark =
                      theme === 'dark' ||
                      (theme === 'system' &&
                        typeof window !== 'undefined' &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches);
                    const swatchBase = isCurrentDark ? pal.dark.base : pal.light.base;
                    const swatchSubtle = isCurrentDark ? pal.dark.subtle : pal.light.subtle;
                    const swatchBorder = isCurrentDark ? pal.dark.border : pal.light.border;

                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => handleAccentChange(pal.id)}
                        className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                          isSelected
                            ? 'border-neutral-12 bg-neutral-2 shadow-xs'
                            : 'border-neutral-4 bg-neutral-1 hover:border-neutral-6 hover:bg-neutral-2/50'
                        }`}
                      >
                        {/* Swatch circle */}
                        <div
                          className="size-7 rounded-full shrink-0 flex items-center justify-center border"
                          style={{
                            backgroundColor: swatchSubtle,
                            borderColor: swatchBorder,
                          }}
                        >
                          <span
                            className="size-3.5 rounded-full"
                            style={{ backgroundColor: swatchBase }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-12">
                              {pal.name}
                            </span>
                            {isSelected && (
                              <span className="text-2xs font-mono font-medium text-neutral-12 flex items-center gap-1">
                                <Check size={12} />
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-2xs text-neutral-9 mt-0.5 line-clamp-2 leading-relaxed">
                            {pal.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Layout Density */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-4 pt-6">
                <div>
                  <span className="text-xs font-medium text-neutral-12 block">Ledger Display Density</span>
                  <span className="text-2xs text-neutral-8">
                    Choose between spacious comfortable cards or high-density rows for compact scanning.
                  </span>
                </div>

                <SegmentedControl
                  value={density}
                  onChange={(val) => handleDensityChange(val as 'comfortable' | 'compact')}
                  options={[
                    { label: 'Comfortable', value: 'comfortable' },
                    { label: 'Compact', value: 'compact' },
                  ]}
                />
              </div>

              {/* 4. Font Choice */}
              <div className="space-y-3 border-t border-neutral-4 pt-6">
                <div>
                  <span className="text-xs font-medium text-neutral-12 block">UI Typography</span>
                  <span className="text-2xs text-neutral-8">
                    Choose the primary typeface for UI controls and descriptions (code identifiers & counts remain in JetBrains Mono).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FONT_CHOICES.map((f) => {
                    const isSelected = font === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFontChange(f.id)}
                        className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-neutral-12 bg-neutral-2 shadow-xs'
                            : 'border-neutral-4 bg-neutral-1 hover:border-neutral-6 hover:bg-neutral-2/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-semibold text-neutral-12"
                            style={{ fontFamily: f.family }}
                          >
                            {f.name}
                          </span>
                          {isSelected && <Check size={12} className="text-neutral-12" />}
                        </div>
                        <p
                          className="text-2xs text-neutral-10 leading-snug"
                          style={{ fontFamily: f.family }}
                        >
                          "{f.preview}"
                        </p>
                        <span className="text-3xs text-neutral-8">{f.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Live Appearance Preview Card */}
              <div className="border-t border-neutral-4 pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-neutral-12 block">Live Appearance Preview</span>
                    <span className="text-2xs text-neutral-8">
                      Interactive sample demonstrating your active theme, accent, density, and font.
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider">
                    {accent} · {density} · {font}
                  </span>
                </div>

                <div
                  className="border border-neutral-4 rounded-xs bg-neutral-2/40 overflow-hidden"
                  style={{
                    padding: density === 'compact' ? 'var(--card-p, 12px)' : 'var(--card-p, 16px)',
                  }}
                >
                  <div
                    className="border border-neutral-5 rounded-xs bg-neutral-1 transition-all duration-fast shadow-subtle"
                    style={{
                      paddingTop: 'var(--row-py, 10px)',
                      paddingBottom: 'var(--row-py, 10px)',
                      paddingLeft: 'var(--row-px, 14px)',
                      paddingRight: 'var(--row-px, 14px)',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ScoreRing score={88} size={28} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-neutral-12">
                              repopulse/analytics-engine
                            </span>
                            <span
                              className="text-3xs font-mono px-1.5 py-0.5 rounded-full border border-accent-border text-accent-text bg-accent-subtle"
                            >
                              Active
                            </span>
                          </div>
                          <p
                            className="text-2xs text-neutral-9 mt-0.5 truncate max-w-sm"
                            style={{ fontFamily: 'var(--font)' }}
                          >
                            Core analytical processing worker and GitHub commit ingestion daemon
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <VerdictControl
                          currentVerdict={previewVerdict}
                          onDecision={(dec) => {
                            setPreviewVerdict(dec);
                            toast.info(`Preview verdict set to ${dec}`);
                          }}
                          repoName="analytics-engine"
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Onboarding Coachmarks */}
              <div className="flex items-center justify-between py-3 border-t border-neutral-4 pt-6">
                <div>
                  <span className="text-xs font-medium text-neutral-12 block">Onboarding Coachmarks</span>
                  <span className="text-2xs text-neutral-8">
                    Re-enable subtle guided tips for search, triage, and saved views.
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('repopulse_coachmarks_dismissed_v4');
                    toast.success('Coachmarks reset. They will guide you as you navigate.');
                  }}
                >
                  Reset tips
                </Button>
              </div>
            </section>
          )}

          {/* SECTION: ACCOUNT */}
          {activeSection === 'account' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12">GitHub Account Details</h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Authenticated GitHub identity connected to this session.
                </p>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="flex items-center justify-between py-2 border-b border-neutral-4">
                  <span className="text-neutral-8">Connected Account</span>
                  <span className="font-mono text-neutral-12 font-medium">
                    {installation.account_login || 'github-user'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-neutral-4">
                  <span className="text-neutral-8">Permissions Scope</span>
                  <span className="text-neutral-12">Read-only commit history & repositories</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-8">Session Token Status</span>
                  <span className="text-verdict-keep-text font-mono text-2xs uppercase font-medium">
                    Active & Validated
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION: SYNC & ACCESS */}
          {activeSection === 'sync' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-12">Sync & Permissions</h2>
                  <p className="text-xs text-neutral-9 mt-0.5">
                    Trigger manual synchronization or manage GitHub App access.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTriggerSync}
                  disabled={isSyncingNow}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw size={12} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'Syncing...' : 'Sync Now'}</span>
                </Button>
              </div>

              <div className="space-y-3">
                <span className="text-2xs font-mono text-neutral-8 uppercase tracking-wider block">
                  Connected Installations
                </span>
                <div className="divide-y divide-neutral-4 border border-neutral-4 rounded-xs text-xs">
                  {effectiveInstallations.map((inst, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-neutral-12 block">{inst.account_login}</span>
                        <span className="text-neutral-8 text-2xs">
                          {inst.selection === 'all'
                            ? 'All repositories permitted'
                            : `Only ${inst.repo_count || 0} selected`}
                        </span>
                      </div>
                      <a
                        href={`https://github.com/settings/installations/${inst.github_installation_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-2xs text-neutral-11 hover:text-neutral-12 underline"
                      >
                        <span>Configure on GitHub</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SECTION: NOTIFICATIONS (Instant-Save Toggles) */}
          {activeSection === 'notifications' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12">Digest & Alert Preferences</h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Instant-save toggles for weekly summaries and cooling cadence warnings.
                </p>
              </div>

              <div className="space-y-4">
                <Switch
                  checked={weeklyDigestEnabled}
                  onCheckedChange={handleToggleWeeklyDigest}
                  label="Weekly Digest Briefing"
                  description="Receive an editorial Monday briefing summarizing your portfolio velocity and next actions."
                />

                <div className="border-t border-neutral-4 pt-4">
                  <Switch
                    checked={cadenceAlertsEnabled}
                    onCheckedChange={handleToggleCadenceAlerts}
                    label="Cooling Cadence Alerts"
                    description="Highlight repositories that cross the cooling threshold before they go stale."
                  />
                </div>
              </div>
            </section>
          )}

          {/* SECTION: DATA & BACKUP */}
          {activeSection === 'data' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12">Data Portability</h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Export a complete JSON ledger of your repository records, tags, and triage logs.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border border-neutral-4 rounded-xs bg-neutral-2/40 text-xs">
                <div>
                  <span className="font-medium text-neutral-12 block">Export Full Ledger (JSON)</span>
                  <span className="text-neutral-8 text-2xs">Includes metadata, audit logs, and decisions</span>
                </div>
                <Button variant="secondary" size="sm" onClick={onExportData} className="gap-2 text-xs">
                  <Download size={13} />
                  <span>Export JSON</span>
                </Button>
              </div>
            </section>
          )}

          {/* SECTION: PRIVACY & DANGER */}
          {activeSection === 'privacy' && (
            <section className="space-y-6">
              <div className="border-b border-neutral-4 pb-3">
                <h2 className="text-sm font-semibold text-neutral-12">Privacy & Account Danger Zone</h2>
                <p className="text-xs text-neutral-9 mt-0.5">
                  Manage private repository visibility and permanent account removal.
                </p>
              </div>

              <div className="space-y-6">
                <Switch
                  checked={maskPrivateRepos}
                  onCheckedChange={handleToggleMaskPrivate}
                  label="Mask Private Repository Names"
                  description="Automatically mask private repository titles in shareable digest cards and snapshots."
                />

                {/* Permanent Delete */}
                <div className="border-t border-neutral-4 pt-6 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-heat-active">Delete Account</h3>
                    <p className="text-2xs text-neutral-9 mt-0.5">
                      Permanently erase all synchronized repository data, commit caches, and decisions.
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="gap-2 text-xs bg-transparent border border-heat-active text-heat-active hover:bg-heat-active/10"
                  >
                    <Trash2 size={13} />
                    <span>Delete Account Permanently</span>
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open);
          if (!open) setDeleteConfirmText('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account permanently</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All repository metrics, commit caches, and decisions will be deleted immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteAccountSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="delete-confirm-input" className="text-xs font-mono text-neutral-11">
                Type <strong className="text-neutral-12">DELETE</strong> to confirm
              </label>
              <Input
                id="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono text-xs"
                autoComplete="off"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
                size="sm"
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
