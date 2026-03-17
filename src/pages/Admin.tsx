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
  const [activeTab, setActiveTab] = useState<Tab>('runs');

  // Data states
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

  // Not owner → blocked
  if (!isOwner) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2b2a27', color: '#f87171', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: '#a09f9a' }}>This page is only accessible to the owner.</p>
          <a href="/" style={{ color: '#da7756', marginTop: 16, display: 'inline-block' }}>← Back to Stella</a>
        </div>
      </div>
    );
  }

  // Password gate
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2b2a27', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: '#1f1e1b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, width: 340 }}>
          <h2 style={{ color: '#da7756', fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Admin Access</h2>
          <p style={{ color: '#6b6a65', fontSize: 13, marginBottom: 20 }}>Enter the admin password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                try {
                  const res = await authFetch('/api/admin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': password },
                  });
                  if (res.ok) setAuthenticated(true);
                  else setError('Wrong password');
                } catch { setError('Failed to verify'); }
              }
            }}
            placeholder="Admin password..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              backgroundColor: '#2b2a27', border: '1px solid rgba(255,255,255,0.08)',
              color: '#eeeeee', fontSize: 14, outline: 'none',
              fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
            }}
          />
          {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button
            onClick={async () => {
              try {
                const res = await authFetch('/api/admin/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': password },
                });
                if (res.ok) setAuthenticated(true);
                else setError('Wrong password');
              } catch { setError('Failed to verify'); }
            }}
            style={{
              width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 8,
              backgroundColor: '#da7756', border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            Verify
          </button>
          <a href="/" style={{ display: 'block', textAlign: 'center', color: '#6b6a65', fontSize: 12, marginTop: 16, textDecoration: 'none' }}>← Back to Stella</a>
        </div>
      </div>
    );
  }

  // Fetch data based on active tab
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

  const cardStyle: React.CSSProperties = {
    background: '#1f1e1b', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 20, marginTop: 16,
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#2b2a27', color: '#eeeeee', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ color: '#6b6a65', fontSize: 13, textDecoration: 'none' }}>← Stella</a>
        <h1 style={{ color: '#da7756', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Admin Dashboard</h1>
      </div>

      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '16px 24px', gap: 20 }}>
        {/* Tab nav */}
        <div style={{ width: 180, flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', borderRadius: 8, marginBottom: 4,
              background: activeTab === t.id ? 'rgba(218,119,86,0.12)' : 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 13,
              color: activeTab === t.id ? '#da7756' : '#a09f9a',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* PIPELINE RUNS */}
          {activeTab === 'runs' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756', marginBottom: 12 }}>Pipeline Runs</h2>
              {runs.length === 0 ? (
                <p style={{ color: '#6b6a65', fontSize: 13 }}>No runs found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['ID', 'Mode', 'Status', 'Cost', 'Started'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#6b6a65', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#a09f9a' }}>{r.id?.slice(0, 8)}…</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: r.mode === 'research' ? 'rgba(218,119,86,0.15)' : 'rgba(74,222,128,0.15)', color: r.mode === 'research' ? '#da7756' : '#4ade80' }}>{r.mode}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: r.status === 'completed' ? '#4ade80' : r.status === 'failed' ? '#f87171' : '#a09f9a' }}>{r.status}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#a09f9a' }}>${(r.total_cost_usd ?? 0).toFixed(4)}</td>
                          <td style={{ padding: '8px 10px', color: '#6b6a65' }}>{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SERVICE HEALTH */}
          {activeTab === 'health' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756' }}>Service Health</h2>
                <button onClick={() => fetchTabData('health')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 12px', color: '#a09f9a', fontSize: 11, cursor: 'pointer' }}>Refresh</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {Object.entries(health).map(([name, up]) => (
                  <div key={name} style={{ background: '#2b2a27', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: up ? '#4ade80' : '#f87171' }} />
                    <span style={{ fontSize: 13, color: '#eeeeee' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOG VIEWER */}
          {activeTab === 'logs' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756', marginBottom: 12 }}>Log Viewer</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchTabData('logs'); }}
                  placeholder="Search logs..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, backgroundColor: '#2b2a27', border: '1px solid rgba(255,255,255,0.08)', color: '#eeeeee', fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                />
                <button onClick={() => fetchTabData('logs')} style={{ padding: '8px 16px', borderRadius: 6, background: '#da7756', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Search</button>
              </div>
              <pre style={{ background: '#141311', borderRadius: 8, padding: 16, fontSize: 11, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', color: '#a09f9a', overflowX: 'auto', maxHeight: 500, overflowY: 'auto', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {logs || 'No logs found.'}
              </pre>
            </div>
          )}

          {/* CHARACTER EDITOR */}
          {activeTab === 'character' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756' }}>Character Editor</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {characterSaved && <span style={{ color: '#4ade80', fontSize: 12 }}>Saved ✓</span>}
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
                    style={{ padding: '6px 16px', borderRadius: 6, background: '#da7756', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              </div>
              <textarea
                value={character}
                onChange={e => setCharacter(e.target.value)}
                style={{
                  width: '100%', minHeight: 400, padding: 16, borderRadius: 8,
                  backgroundColor: '#141311', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#eeeeee', fontSize: 13, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
                  lineHeight: 1.7, outline: 'none', resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* PREFERENCES */}
          {activeTab === 'preferences' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756', marginBottom: 12 }}>Preferences</h2>
              {preferences.length === 0 ? (
                <p style={{ color: '#6b6a65', fontSize: 13 }}>No preferences stored yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {preferences.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#2b2a27', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#eeeeee', fontWeight: 500 }}>{p.key || p.preference_key}</div>
                        <div style={{ fontSize: 12, color: '#a09f9a', marginTop: 2 }}>{p.value || p.preference_value}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await authFetch(`/api/admin/preferences/${p.id}`, {
                            method: 'DELETE',
                            headers: { 'X-Admin-Secret': password },
                          });
                          setPreferences(prev => prev.filter(x => x.id !== p.id));
                        }}
                        style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SYSTEM METRICS */}
          {activeTab === 'metrics' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#da7756' }}>System Metrics</h2>
                <button onClick={() => fetchTabData('metrics')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 12px', color: '#a09f9a', fontSize: 11, cursor: 'pointer' }}>Refresh</button>
              </div>
              {metrics ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'CPU Usage', value: `${metrics.cpu_percent?.toFixed(1) ?? '—'}%` },
                    { label: 'Memory Used', value: `${((metrics.memory_used ?? 0) / 1e9).toFixed(1)} GB` },
                    { label: 'Memory Total', value: `${((metrics.memory_total ?? 0) / 1e9).toFixed(1)} GB` },
                    { label: 'Disk Used (/Volumes/Stella)', value: `${((metrics.disk_used ?? 0) / 1e9).toFixed(1)} GB` },
                    { label: 'Disk Free', value: `${((metrics.disk_free ?? 0) / 1e9).toFixed(1)} GB` },
                    { label: 'Uptime', value: `${((metrics.uptime ?? 0) / 3600).toFixed(1)} hrs` },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#2b2a27', borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#6b6a65', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#eeeeee', fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b6a65', fontSize: 13 }}>Loading metrics...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
