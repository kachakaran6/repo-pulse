import React, { useState } from 'react';
import type { UserProfile, SummaryStats, SyncStatus } from '../types.js';

interface ShellProps {
  activeTab: 'overview' | 'analytics' | 'triage' | 'archive' | 'settings';
  onSelectTab: (tab: 'overview' | 'analytics' | 'triage' | 'archive' | 'settings') => void;
  user: UserProfile | null;
  stats: SummaryStats | null;
  lastSync: SyncStatus | null;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onSignOut: () => Promise<void>;
  onSignOutAll: () => Promise<void>;
  children: React.ReactNode;
}

function formatRelativeSyncTime(dateStr?: string | null): string {
  if (!dateStr) return 'Not synced yet';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Not synced yet';

  const diffMinutes = Math.floor((Date.now() - time) / 60000);
  if (diffMinutes <= 0) return 'Synced just now';
  if (diffMinutes === 1) return 'Synced 1 min ago';
  if (diffMinutes < 60) return `Synced ${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `Synced ${diffHours}h ago`;
}

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onSelectTab,
  user,
  stats,
  lastSync,
  onSync,
  isSyncing,
  onSignOut,
  onSignOutAll,
  children,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Undecided triage count = cooling + stale
  const triageCount = (stats?.coolingCount || 0) + (stats?.staleCount || 0);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a
              href="#overview"
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('overview');
              }}
            >
              <span className="brand-dot" />
              RepoPulse
            </a>

            {user && (
              <nav className="nav-tabs" aria-label="Main Navigation">
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => onSelectTab('overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => onSelectTab('analytics')}
                >
                  Analytics
                </button>
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'triage' ? 'active' : ''}`}
                  onClick={() => onSelectTab('triage')}
                >
                  Triage
                  {triageCount > 0 && (
                    <span className="tab-badge num">{triageCount}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'archive' ? 'active' : ''}`}
                  onClick={() => onSelectTab('archive')}
                >
                  Archive
                </button>
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => onSelectTab('settings')}
                >
                  Settings
                </button>
              </nav>
            )}
          </div>

          {user && (
            <div className="top-bar-right">
              {/* Sync text button with relative sync time */}
              <div className="sync-status-group">
                <span>
                  {isSyncing
                    ? 'Syncing repositories...'
                    : formatRelativeSyncTime(lastSync?.finished_at)}
                </span>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={onSync}
                  disabled={isSyncing}
                >
                  Sync
                </button>
              </div>

              {/* Avatar menu with normal font username */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="user-profile-badge"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  title="User account menu"
                >
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="user-avatar"
                  />
                </button>

                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '36px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r)',
                      padding: '8px 0',
                      minWidth: '200px',
                      zIndex: 500,
                      boxShadow: 'none',
                    }}
                  >
                    <div style={{ padding: '4px 16px 8px 16px', borderBottom: '1px solid var(--line)', fontSize: '13px', color: 'var(--ink-2)' }}>
                      Signed in as <strong style={{ color: 'var(--ink)' }}>{user.login}</strong>
                    </div>
                    <button
                      type="button"
                      style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--ink)' }}
                      onClick={() => {
                        setShowUserMenu(false);
                        onSelectTab('settings');
                      }}
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--ink)' }}
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                    >
                      Sign out
                    </button>
                    <button
                      type="button"
                      style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--heat-active)' }}
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOutAll();
                      }}
                    >
                      Sign out everywhere
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
};
