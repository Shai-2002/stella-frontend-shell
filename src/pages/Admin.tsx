import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

const OWNER_EMAIL = 'shaivignesh.2002@gmail.com';

type Tab = 'runs' | 'health' | 'logs' | 'character' | 'preferences' | 'metrics';

export default function Admin() {
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('runs');

  const [runs, setRuns] = useState<any[]>([]);
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [character, setCharacter] = useState('');
  const [characterSaved, setCharacterSaved] = useState(false);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const email = user?.primaryEmailAddress?.emailAddress;
  const isOwner = email === OWNER_EMAIL;

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-stella-text-muted">This page is only accessible to the owner.</p>
          <a href="/" className="text-primary mt-4 inline-block hover:underline">← Back to Stella</a>
        </div>
      </div>
    );
  }

  const handleVerify = async () => {
    if (!password.trim()) { setError('Enter a password'); return; }
    setVerifying(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': password },
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Wrong password (${res.status})`);
      }
    } catch (err: any) {
      console.error('[Admin verify]', err);
      setError(`Connection failed: ${err.message || 'network error'}`);
    } finally {
      setVerifying(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-stella-border rounded-xl p-8 w-[340px]">
          <h2 className="text-primary text-xl font-semibold mb-1">Admin Access</h2>
          <p className="text-stella-text-dim text-[13px] mb-5">Enter the admin password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
            placeholder="Admin password..."
            autoFocus
            className={`w-full px-3 py-2.5 rounded-lg bg-background border text-foreground text-sm font-mono outline-none transition-colors ${
              error ? 'border-destructive/40' : 'border-stella-border focus:border-stella-terra-border'
            }`}
          />
          {error && <p className="text-destructive text-xs mt-2">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={verifying}
            className={`w-full mt-3 py-2.5 rounded-lg text-sm font-semibold text-white transition-all ${
              verifying ? 'bg-primary/60 cursor-wait' : 'bg-primary hover:brightness-110 cursor-pointer'
            }`}
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
          <a href="/" className="block text-center text-stella-text-dim text-xs mt-4 hover:text-stella-text-muted transition-colors">
            ← Back to Stella
          </a>
        </div>
      </div>
    );
  }

  const fetchTabData = useCallback(async (tab: Tab) => {
    const headers: Record<string, string> = { 'X-Admin-Secret': password };
    try {
      switch (tab) {
        case 'runs': {
          const res = await authFetch('/api/admin/runs', { headers });
          const data = await res.json();
          setRuns(data.runs || []);
          break;
        }
        case 'health': {
          const res = await authFetch('/api/admin/health', { headers });
          const data = await res.json();
          setHealth(data.services || {});
          break;
        }
        case 'logs': {
          const params = new URLSearchParams({ lines: '100' });
          if (logSearch) params.set('search', logSearch);
          const res = await authFetch(`/api/admin/logs?${params}`, { headers });
          const data = await res.json();
          setLogs(data.content || '');
          break;
        }
        case 'character': {
          const res = await authFetch('/api/admin/character', { headers });
          const data = await res.json();
          setCharacter(data.content || '');
          setCharacterSaved(false);
          break;
        }
        case 'preferences': {
          const res = await authFetch('/api/admin/preferences', { headers });
          const data = await res.json();
          setPreferences(data.preferences || []);
          break;
        }
        case 'metrics': {
          const res = await authFetch('/api/admin/metrics', { headers });
          const data = await res.json();
          setMetrics(data);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab}:`, err);
    }
  }, [authFetch, password, logSearch]);

  useEffect(() => { fetchTabData(activeTab); }, [activeTab, fetchTabData]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'runs', label: 'Pipeline Runs' },
    { id: 'health', label: 'Service Health' },
    { id: 'logs', label: 'Log Viewer' },
    { id: 'character', label: 'Character Editor' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'metrics', label: 'System Metrics' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-stella-border px-6 py-3.5 flex items-center gap-3">
        <a href="/" className="text-stella-text-dim text-[13px] hover:text-stella-text-muted transition-colors">← Stella</a>
        <h1 className="text-primary text-lg font-semibold">Admin Dashboard</h1>
      </div>

      <div className="flex max-w-[1200px] mx-auto px-6 py-4 gap-5">
        {/* Tab nav */}
        <div className="w-[180px] flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg mb-1 text-[13px] transition-colors ${
                activeTab === t.id
                  ? 'bg-stella-terra-dim text-primary'
                  : 'text-stella-text-muted hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-stella-border rounded-xl p-5 mt-4">
            {/* PIPELINE RUNS */}
            {activeTab === 'runs' && (
              <>
                <h2 className="text-base font-semibold text-primary mb-3">Pipeline Runs</h2>
                {runs.length === 0 ? (
                  <p className="text-stella-text-dim text-[13px]">No runs found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-stella-border">
                          {['ID', 'Mode', 'Status', 'Cost', 'Started'].map(h => (
                            <th key={h} className="text-left py-2 px-2.5 text-stella-text-dim font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((r: any) => (
                          <tr key={r.id} className="border-b border-white/[0.04]">
                            <td className="py-2 px-2.5 font-mono text-stella-text-muted">{r.id?.slice(0, 8)}…</td>
                            <td className="py-2 px-2.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                r.mode === 'research' ? 'bg-stella-terra-dim text-primary' : 'bg-stella-green-dim text-stella-green'
                              }`}>{r.mode}</span>
                            </td>
                            <td className={`py-2 px-2.5 ${
                              r.status === 'completed' ? 'text-stella-green' : r.status === 'failed' ? 'text-destructive' : 'text-stella-text-muted'
                            }`}>{r.status}</td>
                            <td className="py-2 px-2.5 font-mono text-stella-text-muted">${(r.total_cost_usd ?? 0).toFixed(4)}</td>
                            <td className="py-2 px-2.5 text-stella-text-dim">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* SERVICE HEALTH */}
            {activeTab === 'health' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-primary">Service Health</h2>
                  <button onClick={() => fetchTabData('health')}
                    className="border border-stella-border rounded-md px-3 py-1 text-[11px] text-stella-text-muted hover:text-foreground transition-colors">
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                  {Object.entries(health).map(([name, up]) => (
                    <div key={name} className="bg-background rounded-lg px-4 py-3 flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${up ? 'bg-stella-green' : 'bg-destructive'}`} />
                      <span className="text-[13px] text-foreground">{name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* LOG VIEWER */}
            {activeTab === 'logs' && (
              <>
                <h2 className="text-base font-semibold text-primary mb-3">Log Viewer</h2>
                <div className="flex gap-2 mb-3">
                  <input
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') fetchTabData('logs'); }}
                    placeholder="Search logs..."
                    className="flex-1 px-3 py-2 rounded-md bg-background border border-stella-border text-foreground text-xs font-mono outline-none focus:border-stella-terra-border transition-colors"
                  />
                  <button onClick={() => fetchTabData('logs')}
                    className="px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all">
                    Search
                  </button>
                </div>
                <pre className="bg-stella-sidebar rounded-lg p-4 text-[11px] font-mono text-stella-text-muted overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap break-all">
                  {logs || 'No logs found.'}
                </pre>
              </>
            )}

            {/* CHARACTER EDITOR */}
            {activeTab === 'character' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-primary">Character Editor</h2>
                  <div className="flex gap-2 items-center">
                    {characterSaved && <span className="text-stella-green text-xs">Saved ✓</span>}
                    <button
                      onClick={async () => {
                        try {
                          await authFetch('/api/admin/character', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': password },
                            body: JSON.stringify({ content: character }),
                          });
                          setCharacterSaved(true);
                          setTimeout(() => setCharacterSaved(false), 3000);
                        } catch {}
                      }}
                      className="px-4 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all">
                      Save
                    </button>
                  </div>
                </div>
                <textarea
                  value={character}
                  onChange={e => setCharacter(e.target.value)}
                  className="w-full min-h-[400px] p-4 rounded-lg bg-stella-sidebar border border-stella-border text-foreground text-[13px] font-mono leading-relaxed outline-none resize-y focus:border-stella-terra-border transition-colors"
                />
              </>
            )}

            {/* PREFERENCES */}
            {activeTab === 'preferences' && (
              <>
                <h2 className="text-base font-semibold text-primary mb-3">Preferences</h2>
                {preferences.length === 0 ? (
                  <p className="text-stella-text-dim text-[13px]">No preferences stored yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {preferences.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 bg-background rounded-lg px-3.5 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-foreground font-medium">{p.key || p.preference_key}</div>
                          <div className="text-xs text-stella-text-muted mt-0.5">{p.value || p.preference_value}</div>
                        </div>
                        <button
                          onClick={async () => {
                            await authFetch(`/api/admin/preferences/${p.id}`, {
                              method: 'DELETE',
                              headers: { 'X-Admin-Secret': password },
                            });
                            setPreferences(prev => prev.filter(x => x.id !== p.id));
                          }}
                          className="border border-destructive/30 rounded-md px-2.5 py-1 text-destructive text-[11px] hover:bg-destructive/10 transition-colors">
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* SYSTEM METRICS */}
            {activeTab === 'metrics' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-primary">System Metrics</h2>
                  <button onClick={() => fetchTabData('metrics')}
                    className="border border-stella-border rounded-md px-3 py-1 text-[11px] text-stella-text-muted hover:text-foreground transition-colors">
                    Refresh
                  </button>
                </div>
                {metrics ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {[
                      { label: 'CPU Usage', value: `${metrics.cpu_percent?.toFixed(1) ?? '—'}%` },
                      { label: 'Memory Used', value: `${((metrics.memory_used ?? 0) / 1e9).toFixed(1)} GB` },
                      { label: 'Memory Total', value: `${((metrics.memory_total ?? 0) / 1e9).toFixed(1)} GB` },
                      { label: 'Disk Used (/Volumes/Stella)', value: `${((metrics.disk_used ?? 0) / 1e9).toFixed(1)} GB` },
                      { label: 'Disk Free', value: `${((metrics.disk_free ?? 0) / 1e9).toFixed(1)} GB` },
                      { label: 'Uptime', value: `${((metrics.uptime ?? 0) / 3600).toFixed(1)} hrs` },
                    ].map(m => (
                      <div key={m.label} className="bg-background rounded-lg px-4 py-3.5">
                        <div className="text-[11px] text-stella-text-dim mb-1">{m.label}</div>
                        <div className="text-xl font-semibold text-foreground font-mono">{m.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stella-text-dim text-[13px]">Loading metrics...</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
