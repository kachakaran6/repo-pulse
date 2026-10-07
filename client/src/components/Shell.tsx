import React, { useState } from 'react';
import type { UserProfile, SummaryStats } from '../types.js';

interface ShellProps {
  activeTab: 'overview' | 'triage' | 'archive' | 'settings';
  onSelectTab: (tab: 'overview' | 'triage' | 'archive' | 'settings') => void;
  user: UserProfile | null;
  stats: SummaryStats | null;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onSignOut: () => Promise<void>;
  onSignOutAll: () => Promise<void>;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onSelectTab,
  user,
  stats,
  onSync,
  isSyncing,
  onSignOut,
  onSignOutAll,
  children,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Undecided triage count = cooling + stale
  const triageCount = (stats?.coolingCount || 0) + (stats?.staleCount || 0);
  const archiveCount = stats?.retiredCount || 0;

  return (
    <div className="app-shell">
      {/* Top Bar Header */}
      <header className="top-bar">
        <div className="top-bar-inner">
          {/* Brand Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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

            {/* Navigation Tabs */}
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
                  {archiveCount > 0 && (
                    <span className="badge-count num" style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                      ({archiveCount})
                    </span>
                  )}
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

          {/* Top Bar Right: Sync button & User Profile */}
          {user && (
            <div className="top-bar-right">
              <button
                type="button"
                className="sync-btn"
                onClick={onSync}
                disabled={isSyncing}
                title="Sync recent commit activity across repositories"
              >
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="user-profile-badge"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  title="Account menu"
                >
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="user-avatar"
                  />
                  <span className="mono" style={{ fontWeight: 600 }}>{user.login}</span>
                </button>

                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '36px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-sm)',
                      padding: '4px',
                      minWidth: '180px',
                      zIndex: 500,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      className="nav-tab"
                      style={{ width: '100%', justifyContent: 'flex-start', height: '32px' }}
                      onClick={() => {
                        setShowUserMenu(false);
                        onSelectTab('settings');
                      }}
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      className="nav-tab"
                      style={{ width: '100%', justifyContent: 'flex-start', height: '32px' }}
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                    >
                      Sign out
                    </button>
                    <button
                      type="button"
                      className="nav-tab"
                      style={{ width: '100%', justifyContent: 'flex-start', height: '32px', color: 'var(--stale)' }}
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

      {/* Main Screen Content */}
      <main className="main-content">{children}</main>
    </div>
  );
};
