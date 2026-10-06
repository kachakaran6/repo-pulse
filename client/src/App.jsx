import { useEffect, useState } from 'react';

const GROUPS = [
  { key: 'active', name: 'Active', meaning: 'Committed in the last 7 days', color: 'var(--active)' },
  { key: 'cooling', name: 'Cooling', meaning: 'No commits in 8-14 days', color: 'var(--cooling)' },
  { key: 'stale', name: 'Stale', meaning: 'No commits in 15-30 days', color: 'var(--stale)' },
  { key: 'dead', name: 'Dead', meaning: 'No commits in over 30 days', color: 'var(--dead)' },
];
const SUGGEST = ['Application', 'Web app', 'Full ERP', 'Library', 'Client work', 'Experiment'];

const ago = (d) => {
  if (!d) return 'No commits found';
  const n = Math.floor((Date.now() - new Date(d)) / 864e5);
  return n === 0 ? 'Last commit today' : `Last commit ${n} day${n === 1 ? '' : 's'} ago`;
};

function Strip({ days }) {
  const max = Math.max(1, ...days);
  return (
    <div className="strip" role="img" aria-label={`${days.reduce((a, b) => a + b, 0)} commits in 30 days`}>
      {days.map((n, i) => <i key={i} className={n ? '' : 'zero'} style={{ height: n ? `${Math.max(14, (n / max) * 100)}%` : 2 }} />)}
    </div>
  );
}

function Label({ repo, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(repo.label ?? '');
  if (!editing) return (
    <button className={`chip ${repo.label ? '' : 'empty'}`} onClick={() => setEditing(true)}>{repo.label || 'Add label'}</button>
  );
  const save = () => { setEditing(false); if (val !== (repo.label ?? '')) onSave(val); };
  return (
    <>
      <input className="chip-input" autoFocus list="labels" value={val} maxLength={40} aria-label="Label"
        onChange={(e) => setVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()} />
      <datalist id="labels">{SUGGEST.map((s) => <option key={s} value={s} />)}</datalist>
    </>
  );
}

export default function App() {
  const [repos, setRepos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => fetch('/api/repos').then((r) => r.json()).then(setRepos)
    .catch(() => setError('Cannot reach the server. Start it with npm run dev in /server.'));
  useEffect(() => { load(); }, []);

  const sync = async () => {
    setBusy(true); setError('');
    const res = await fetch('/api/sync', { method: 'POST' });
    if (!res.ok) setError((await res.json()).error);
    await load(); setBusy(false);
  };
  const saveLabel = async (id, label) => {
    await fetch(`/api/repos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
    load();
  };

  return (
    <main>
      <header>
        <div><h1>RepoPulse</h1><p>What you are working on, and what you left behind.</p></div>
        <button className="primary" onClick={sync} disabled={busy}>{busy ? 'Syncing repos...' : 'Sync repos'}</button>
      </header>
      {error && <div className="error" role="alert">{error}</div>}
      {!repos.length && !error && <div className="empty-state">No repos yet. Add your GitHub token to server/.env, then select Sync repos.</div>}
      {GROUPS.map((g) => {
        const list = repos.filter((r) => r.status === g.key);
        if (!list.length) return null;
        return (
          <section className="group" key={g.key} style={{ '--c': g.color }}>
            <h2><b>{g.name}</b> {list.length}</h2>
            <p className="meaning">{g.meaning}</p>
            {list.map((r) => (
              <div className="row" key={r.github_id}>
                <div>
                  <a className="name" href={r.html_url} target="_blank" rel="noreferrer">{r.full_name}</a>
                  <div className="meta"><span>{ago(r.last_commit_at)}</span><Label repo={r} onSave={(l) => saveLabel(r.github_id, l)} /></div>
                </div>
                <Strip days={r.commit_days.length ? r.commit_days : Array(30).fill(0)} />
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
