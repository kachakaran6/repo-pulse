import { useEffect, useState, useMemo, useRef } from 'react';

const SUGGEST_LABELS = ['Application', 'Web app', 'Full ERP', 'API/service', 'Library', 'CLI/tool', 'Client work', 'Experiment', 'Infrastructure'];

const ago = (d) => {
  if (!d) return 'No commits recorded';
  const n = Math.floor((Date.now() - new Date(d)) / 864e5);
  if (n === 0) return 'Last commit today';
  if (n === 1) return 'Last commit yesterday';
  return `Last commit ${n} days ago`;
};

function CommitStrip({ days }) {
  const safeDays = Array.isArray(days) && days.length === 30 ? days : Array(30).fill(0);
  const total = safeDays.reduce((a, b) => a + (Number(b) || 0), 0);
  const max = Math.max(1, ...safeDays);

  return (
    <div className="strip-container">
      <div className="strip" role="img" aria-label={`${total} commits in past 30 days`}>
        {safeDays.map((n, i) => {
          const count = Number(n) || 0;
          return (
            <i
              key={i}
              className={count ? '' : 'zero'}
              title={`Day ${30 - i} ago: ${count} commit${count === 1 ? '' : 's'}`}
              style={{ height: count ? `${Math.max(14, Math.min(100, (count / max) * 100))}%` : 2 }}
            />
          );
        })}
      </div>
      <span className="strip-label">{total} commit{total === 1 ? '' : 's'} (30d)</span>
    </div>
  );
}

function WorkspacePulse({ dailyPulse, total30d, recent7d }) {
  const safePulse = Array.isArray(dailyPulse) && dailyPulse.length === 30 ? dailyPulse : Array(30).fill(0);
  const max = Math.max(1, ...safePulse);

  return (
    <div className="workspace-pulse-card">
      <div className="pulse-header">
        <h3>
          <span>📈 30-Day Workspace Pulse</span>
        </h3>
        <span className="pulse-stats-snippet">
          {recent7d || 0} commits in last 7 days • {total30d || 0} total in 30 days
        </span>
      </div>

      <div className="aggregate-strip" role="img" aria-label="30-day aggregate commit volume">
        {safePulse.map((n, i) => {
          const count = Number(n) || 0;
          return (
            <i
              key={i}
              className={count ? '' : 'zero'}
              title={`Day ${30 - i} ago: ${count} total commit${count === 1 ? '' : 's'} across workspace`}
              style={{ height: count ? `${Math.max(14, Math.min(100, (count / max) * 100))}%` : 2 }}
            />
          );
        })}
      </div>

      <div className="pulse-footer">
        <span>30 days ago</span>
        <span>15 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function ReviewNextSection({ items, onSelectRepo, onQuickAction }) {
  if (!items || !items.length) return null;

  return (
    <div className="review-next-container">
      <div className="review-next-header">
        <h3>🔍 Next to Review ({items.length})</h3>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Prioritized by inactivity & importance</span>
      </div>
      <div className="review-items-grid">
        {items.map((item) => (
          <div className="review-item" key={item.github_id}>
            <div>
              <a
                href={item.html_url}
                target="_blank"
                rel="noreferrer"
                className="review-item-name"
              >
                {item.full_name}
              </a>
              <p className="review-item-reason">{item.reason}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                className="review-item-action"
                onClick={() => onSelectRepo(item.github_id)}
              >
                Open notes
              </button>
              {item.lifecycle_status !== 'paused' && (
                <button
                  type="button"
                  className="review-item-action"
                  onClick={() => onQuickAction(item.github_id, { lifecycle_status: 'paused' })}
                >
                  Pause
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, currentSettings, onSave, onExport, onClearData }) {
  const [active, setActive] = useState(currentSettings.active_max_days ?? 7);
  const [cooling, setCooling] = useState(currentSettings.cooling_max_days ?? 14);
  const [stale, setStale] = useState(currentSettings.stale_max_days ?? 30);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenMsg, setTokenMsg] = useState('');

  useEffect(() => {
    setActive(currentSettings.active_max_days ?? 7);
    setCooling(currentSettings.cooling_max_days ?? 14);
    setStale(currentSettings.stale_max_days ?? 30);
  }, [currentSettings]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      active_max_days: Number(active),
      cooling_max_days: Number(cooling),
      stale_max_days: Number(stale)
    };
    if (tokenInput.trim()) {
      payload.github_token = tokenInput.trim();
    }
    onSave(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings & Preferences</h3>
          <button type="button" className="text-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>
            Inactivity Boundaries
          </h4>

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label htmlFor="active-days">Active threshold (days)</label>
            <input
              id="active-days"
              className="form-input"
              type="number"
              min="1"
              max="60"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Committed within 0 to {active} days = Active.</span>
          </div>

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label htmlFor="cooling-days">Cooling threshold (days)</label>
            <input
              id="cooling-days"
              className="form-input"
              type="number"
              min={active}
              max="90"
              value={cooling}
              onChange={(e) => setCooling(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>No commits in {Number(active) + 1}–{cooling} days = Cooling.</span>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="stale-days">Stale threshold (days)</label>
            <input
              id="stale-days"
              className="form-input"
              type="number"
              min={cooling}
              max="365"
              value={stale}
              onChange={(e) => setStale(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>No commits in {Number(cooling) + 1}–{stale} days = Stale; past {stale} days = Dead.</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />

          <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>
            GitHub Connection
          </h4>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="gh-token">Personal Access Token (optional)</label>
            <input
              id="gh-token"
              className="form-input"
              type="password"
              placeholder={currentSettings.has_github_token ? "Token configured (type new token to update)" : "ghp_..."}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
              {currentSettings.github_username
                ? `Connected as @${currentSettings.github_username}`
                : (currentSettings.has_github_token ? 'Configured via server environment or settings.' : 'Needs read repository access (repo scope).')}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />

          <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>
            Data Management
          </h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button type="button" onClick={onExport}>
              📥 Export JSON Backup
            </button>
            <button type="button" style={{ color: 'var(--stale)' }} onClick={onClearData}>
              🗑️ Clear Repositories
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [repos, setRepos] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, cooling: 0, stale: 0, dead: 0, paused: 0, favorites: 0, daily_pulse: [], total_30d_commits: 0, recent_7d_commits: 0 });
  const [reviewNext, setReviewNext] = useState([]);
  const [settings, setSettings] = useState({ active_max_days: 7, cooling_max_days: 14, stale_max_days: 30, has_github_token: false, github_username: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');

  const searchInputRef = useRef(null);

  const groups = useMemo(() => [
    { key: 'active', name: 'Active', meaning: `Committed in the last ${settings.active_max_days} days`, color: 'var(--active)' },
    { key: 'cooling', name: 'Cooling', meaning: `No commits in ${Number(settings.active_max_days) + 1}–${settings.cooling_max_days} days`, color: 'var(--cooling)' },
    { key: 'stale', name: 'Stale', meaning: `No commits in ${Number(settings.cooling_max_days) + 1}–${settings.stale_max_days} days`, color: 'var(--stale)' },
    { key: 'dead', name: 'Dead', meaning: `No commits in over ${settings.stale_max_days} days`, color: 'var(--dead)' },
  ], [settings]);

  const loadData = async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (sortBy) q.set('sort', sortBy);
      if (showArchived) q.set('archived', 'true');

      const [reposRes, statsRes, settingsRes, reviewRes] = await Promise.all([
        fetch(`/api/repos?${q.toString()}`),
        fetch('/api/stats'),
        fetch('/api/settings'),
        fetch('/api/review-next')
      ]);

      if (reposRes.ok) setRepos(await reposRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (reviewRes.ok) setReviewNext(await reviewRes.json());
    } catch {
      setError('Cannot connect to RepoPulse API. Verify server status.');
    }
  };

  useEffect(() => {
    loadData();
  }, [search, sortBy, showArchived]);

  // Global Keyboard Shortcuts: '/' for search, 'Esc' to clear/close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (search) {
          setSearch('');
        } else if (statusFilter !== 'all') {
          setStatusFilter('all');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, search, statusFilter]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleSync = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'GitHub sync failed. Check GITHUB_TOKEN in Settings.');
      }
    } catch {
      setError('Failed to contact sync service.');
    }
    await loadData();
    setBusy(false);
  };

  const handleSeedDemo = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/demo-seed', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Demo seed failed');
      }
    } catch {
      setError('Failed to load demo data');
    }
    await loadData();
    setBusy(false);
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(await res.json());
        setSettingsOpen(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update settings');
      }
    } catch {
      setError('Failed to update settings');
    }
  };

  const handleExportBackup = () => {
    window.open('/api/export', '_blank');
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all repository data? This will reset the ledger.')) return;
    try {
      await fetch('/api/repos', { method: 'DELETE' });
      await loadData();
      setSettingsOpen(false);
    } catch {
      setError('Failed to clear data');
    }
  };

  const updateRepo = async (id, patch) => {
    try {
      const res = await fetch(`/api/repos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        setRepos(prev => prev.map(r => r.github_id === id ? { ...r, ...patch } : r));
        const [statsRes, reviewRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/review-next')
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (reviewRes.ok) setReviewNext(await reviewRes.json());
      }
    } catch {
      setError('Failed to save repository update');
    }
  };

  const filteredRepos = useMemo(() => {
    if (statusFilter === 'all') return repos;
    if (statusFilter === 'favorites') return repos.filter(r => r.is_favorite);
    if (statusFilter === 'paused') return repos.filter(r => r.lifecycle_status === 'paused');
    return repos.filter(r => r.status === statusFilter);
  }, [repos, statusFilter]);

  return (
    <main>
      <header>
        <div>
          <div className="brand-title">
            <h1>RepoPulse</h1>
            <span className="badge" style={{ borderColor: 'var(--ink)', fontSize: 10 }}>POC</span>
          </div>
          <p className="tagline">What you are working on, and what you left behind.</p>
        </div>

        <div className="header-actions">
          <button type="button" onClick={toggleTheme} title="Toggle light/dark theme">
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} title="Configure Inactivity Thresholds & Token">
            ⚙️ Settings ({settings.active_max_days}/{settings.cooling_max_days}/{settings.stale_max_days}d)
          </button>
          <button type="button" onClick={handleSeedDemo} disabled={busy} title="Load sample repositories to evaluate features">
            🧪 Demo seed
          </button>
          <button type="button" className="primary" onClick={handleSync} disabled={busy}>
            {busy ? 'Syncing...' : 'Sync repos'}
          </button>
        </div>
      </header>

      {/* KPI Metric Counter Row */}
      <div className="kpi-row" role="region" aria-label="Summary Statistics">
        <div className={`kpi-card ${statusFilter === 'all' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('all')}>
          <div className="kpi-label">Total Repos</div>
          <div className="kpi-value">{stats.total || repos.length}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'active' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('active')} style={{ borderLeftColor: 'var(--active)', borderLeftWidth: 3 }}>
          <div className="kpi-label">Active</div>
          <div className="kpi-value" style={{ color: 'var(--active)' }}>{stats.active || 0}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'cooling' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('cooling')} style={{ borderLeftColor: 'var(--cooling)', borderLeftWidth: 3 }}>
          <div className="kpi-label">Cooling</div>
          <div className="kpi-value" style={{ color: 'var(--cooling)' }}>{stats.cooling || 0}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'stale' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('stale')} style={{ borderLeftColor: 'var(--stale)', borderLeftWidth: 3 }}>
          <div className="kpi-label">Stale</div>
          <div className="kpi-value" style={{ color: 'var(--stale)' }}>{stats.stale || 0}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'dead' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('dead')} style={{ borderLeftColor: 'var(--dead)', borderLeftWidth: 3 }}>
          <div className="kpi-label">Dead</div>
          <div className="kpi-value" style={{ color: 'var(--dead)' }}>{stats.dead || 0}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'paused' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('paused')}>
          <div className="kpi-label">Paused</div>
          <div className="kpi-value">{stats.paused || 0}</div>
        </div>
        <div className={`kpi-card ${statusFilter === 'favorites' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('favorites')}>
          <div className="kpi-label">Favorites</div>
          <div className="kpi-value">{stats.favorites || 0}</div>
        </div>
      </div>

      {/* 30-Day Workspace Pulse Activity Chart */}
      {repos.length > 0 && (
        <WorkspacePulse
          dailyPulse={stats.daily_pulse}
          total30d={stats.total_30d_commits}
          recent7d={stats.recent_7d_commits}
        />
      )}

      {/* "Next to Review" Prioritized Recommendations */}
      <ReviewNextSection
        items={reviewNext}
        onSelectRepo={(id) => {
          setExpandedId(id);
          const el = document.getElementById(`repo-${id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onQuickAction={updateRepo}
      />

      {/* Toolbar: Search, Sort, Archived Toggle */}
      <div className="toolbar">
        <input
          ref={searchInputRef}
          type="search"
          className="search-input"
          placeholder="Filter by name, description, stack, or label... (press '/' to focus)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search repositories"
        />

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort repositories"
        >
          <option value="recent">Sort: Most recent commit</option>
          <option value="commits_desc">Sort: Highest commit volume (30d)</option>
          <option value="name_asc">Sort: Name (A-Z)</option>
          <option value="priority_desc">Sort: Priority (High to Low)</option>
        </select>

        <label style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-soft)' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>

        {statusFilter !== 'all' && (
          <button type="button" className="text-btn" onClick={() => setStatusFilter('all')}>
            Clear filter ({statusFilter})
          </button>
        )}
      </div>

      {error && (
        <div className="banner error" role="alert">
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Empty State */}
      {!filteredRepos.length && !error && (
        <div className="empty-state">
          <strong>No repositories found.</strong>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search query or filter selection.'
              : 'Add your GITHUB_TOKEN in Settings or click "Demo seed" to evaluate the dashboard with realistic sample data.'}
          </p>
          {!repos.length && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" className="primary" onClick={handleSeedDemo}>
                Load sample data (Demo mode)
              </button>
              <button type="button" onClick={handleSync}>
                Sync with GitHub
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped Repository Ledger */}
      {groups.map((g) => {
        const groupList = filteredRepos.filter((r) => r.status === g.key);
        if (!groupList.length) return null;

        return (
          <section className="group" key={g.key} style={{ '--c': g.color }}>
            <div className="group-header">
              <h2>
                <b>{g.name}</b>
                <span className="count">({groupList.length})</span>
              </h2>
              <p className="meaning">{g.meaning}</p>
            </div>

            {groupList.map((r) => {
              const isExpanded = expandedId === r.github_id;
              const stackTags = Array.isArray(r.tech_stack) ? r.tech_stack : [];

              return (
                <article className="row" key={r.github_id} id={`repo-${r.github_id}`} style={{ '--c': g.color }}>
                  <div className="row-main">
                    <div className="repo-info">
                      <div className="repo-title-line">
                        <button
                          type="button"
                          className={`fav-btn ${r.is_favorite ? 'is-fav' : ''}`}
                          onClick={() => updateRepo(r.github_id, { is_favorite: !r.is_favorite })}
                          title={r.is_favorite ? 'Favorited' : 'Add to favorites'}
                          aria-label={r.is_favorite ? 'Favorited' : 'Add to favorites'}
                        >
                          {r.is_favorite ? '★' : '☆'}
                        </button>

                        <a className="name" href={r.html_url} target="_blank" rel="noreferrer">
                          {r.full_name}
                        </a>

                        {r.label && <span className="chip">{r.label}</span>}
                        {r.priority && r.priority !== 'normal' && (
                          <span className={`badge priority-${r.priority}`}>{r.priority}</span>
                        )}
                        {r.lifecycle_status && r.lifecycle_status !== 'active' && (
                          <span className={`badge lifecycle-${r.lifecycle_status}`}>{r.lifecycle_status.replace('_', ' ')}</span>
                        )}
                        {r.language && <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>• {r.language}</span>}
                      </div>

                      {r.description && <p className="repo-desc">{r.description}</p>}

                      <div className="meta">
                        <span>{ago(r.last_commit_at)}</span>
                        {stackTags.map(tag => (
                          <span key={tag} className="stack-tag">{tag}</span>
                        ))}
                        <button
                          type="button"
                          className="text-btn"
                          style={{ padding: 0, textDecoration: 'underline' }}
                          onClick={() => setExpandedId(isExpanded ? null : r.github_id)}
                        >
                          {isExpanded ? 'Hide details' : 'Edit annotations'}
                        </button>
                      </div>
                    </div>

                    <CommitStrip days={r.commit_days} />
                  </div>

                  {/* Expanded Annotation Editor */}
                  {isExpanded && (
                    <div className="row-edit-panel">
                      <div className="form-group">
                        <label>Category Label</label>
                        <input
                          className="form-input"
                          defaultValue={r.label || ''}
                          list="label-options"
                          placeholder="Application, Web app, etc."
                          onBlur={(e) => updateRepo(r.github_id, { label: e.target.value.trim() || null })}
                        />
                        <datalist id="label-options">
                          {SUGGEST_LABELS.map(l => <option key={l} value={l} />)}
                        </datalist>
                      </div>

                      <div className="form-group">
                        <label>Lifecycle Status</label>
                        <select
                          className="form-input"
                          value={r.lifecycle_status || 'active'}
                          onChange={(e) => updateRepo(r.github_id, { lifecycle_status: e.target.value })}
                        >
                          <option value="active">Active (Ongoing work)</option>
                          <option value="paused">Paused (Temporarily on hold)</option>
                          <option value="completed">Completed (Stable & shipped)</option>
                          <option value="needs_review">Needs review (Check status)</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Priority</label>
                        <select
                          className="form-input"
                          value={r.priority || 'normal'}
                          onChange={(e) => updateRepo(r.github_id, { priority: e.target.value })}
                        >
                          <option value="high">High priority</option>
                          <option value="normal">Normal priority</option>
                          <option value="low">Low priority</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Tech Stack (comma-separated)</label>
                        <input
                          className="form-input"
                          defaultValue={stackTags.join(', ')}
                          placeholder="React, Node.js, PostgreSQL"
                          onBlur={(e) => {
                            const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            updateRepo(r.github_id, { tech_stack: tags });
                          }}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Personal Notes</label>
                        <textarea
                          className="form-input"
                          rows="2"
                          defaultValue={r.notes || ''}
                          placeholder="Goals, blockers, reminders for this repository..."
                          onBlur={(e) => updateRepo(r.github_id, { notes: e.target.value.trim() || null })}
                        />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentSettings={settings}
        onSave={handleSaveSettings}
        onExport={handleExportBackup}
        onClearData={handleClearData}
      />
    </main>
  );
}
