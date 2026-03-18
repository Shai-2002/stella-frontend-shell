import { useState, useEffect } from 'react';
import { modelRoutes, ollamaModels as mockOllamaModels, monthlyStats as mockMonthlyStats } from './mockData';
import { OllamaModel } from './types';
import { Progress } from '@/components/ui/progress';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

interface PersonalityData {
  preferences: { category: string; key: string; value: string; confidence: number; evidence_count: number }[];
  currentSnapshot: {
    version: number;
    tone_profile: Record<string, number>;
    active_adaptations: string[];
    created_at: string;
  } | null;
  recentActivity: { total: string; date: string }[];
  totalEpisodes: string;
}

export default function SettingsView() {
  const authFetch = useAuthFetch();
  const [stats, setStats] = useState(mockMonthlyStats);
  const [models, setModels] = useState<OllamaModel[]>(mockOllamaModels);
  const [personalityData, setPersonalityData] = useState<PersonalityData | null>(null);

  useEffect(() => {
    authFetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setStats({
          totalRuns: data.totalRuns,
          totalCost: data.totalCost,
          costLimit: data.costLimit,
          costPercent: data.costPercent,
          tokensUsed: data.tokensUsed,
        });
        if (data.ollamaModels?.length > 0) {
          setModels(data.ollamaModels);
        }
      })
      .catch(() => {});

    authFetch('/api/personality')
      .then(r => r.json())
      .then(setPersonalityData)
      .catch(() => {});
  }, [authFetch]);

  const totalModelSize = models.reduce((sum, m) => {
    const match = m.size.match(/([\d.]+)(GB|MB|B)/);
    if (!match) return sum;
    const val = parseFloat(match[1]);
    if (match[2] === 'GB') return sum + val;
    if (match[2] === 'MB') return sum + val / 1000;
    return sum;
  }, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto py-8 px-8 md:px-12 space-y-10">
        {/* Section 1: Active Models */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-stella-text-dim font-medium mb-4">
            Active Models
          </h2>
          <div className="rounded-xl overflow-hidden border border-stella-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stella-border">
                  <th className="text-[11px] uppercase text-stella-text-dim font-medium px-4 py-3 tracking-wider">Stage</th>
                  <th className="text-[11px] uppercase text-stella-text-dim font-medium px-4 py-3 tracking-wider">Model</th>
                  <th className="text-[11px] uppercase text-stella-text-dim font-medium px-4 py-3 tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody>
                {modelRoutes.map((route, i) => (
                  <tr
                    key={i}
                    className={`${i % 2 === 1 ? 'bg-white/[0.02]' : ''} ${i < modelRoutes.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <td className="text-[13px] text-muted-foreground px-4 py-2.5">{route.stage}</td>
                    <td className="text-[13px] text-muted-foreground px-4 py-2.5 font-mono">{route.model}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-[20px] ${
                        route.type === 'Local'
                          ? 'bg-stella-green-dim text-stella-green'
                          : 'bg-stella-terra-dim text-primary'
                      }`}>
                        {route.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: This Month */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-stella-text-dim font-medium mb-4">
            This Month
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[10px] p-4 bg-white/[0.02] border border-stella-border">
              <div className="text-2xl font-semibold text-foreground">{stats.totalRuns}</div>
              <div className="text-[11px] text-stella-text-dim mt-1">Total runs</div>
            </div>
            <div className="rounded-[10px] p-4 bg-white/[0.02] border border-stella-border">
              <div className="text-2xl font-semibold text-foreground">
                {stats.totalCost}{' '}
                <span className="text-sm font-normal text-stella-text-dim">/ {stats.costLimit}</span>
              </div>
              <Progress value={stats.costPercent} className="h-1 mt-2 bg-stella-border" />
              <div className="text-[11px] text-stella-text-dim mt-1">Total cost</div>
            </div>
            <div className="rounded-[10px] p-4 bg-white/[0.02] border border-stella-border">
              <div className="text-2xl font-semibold text-foreground">{stats.tokensUsed}</div>
              <div className="text-[11px] text-stella-text-dim mt-1">Tokens used</div>
            </div>
          </div>
        </section>

        {/* Section 3: Local Models */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-stella-text-dim font-medium mb-4">
            Local Models (Ollama)
          </h2>
          <div className="rounded-xl p-4 space-y-3 bg-white/[0.02] border border-stella-border">
            {models.map((model, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-stella-green" />
                <span className="text-[13px] text-foreground">{model.name}</span>
                <span className="text-[11px] font-mono text-stella-text-dim ml-auto">{model.size}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-stella-border">
              <span className="text-[11px] text-stella-text-dim">
                {totalModelSize.toFixed(1)} GB of models loaded · 32GB unified memory
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Personality & Learning */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-stella-text-dim font-medium mb-4">
            Personality & Learning
          </h2>

          {personalityData?.currentSnapshot && (
            <div className="mb-4">
              <div className="text-[11px] text-stella-text-muted mb-2">
                Tone Profile (v{personalityData.currentSnapshot.version})
              </div>
              {Object.entries(personalityData.currentSnapshot.tone_profile).map(([key, val]) => (
                <div key={key} className="mb-1.5">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-foreground capitalize">{key}</span>
                    <span className="text-[11px] text-primary">{Math.round(val * 100)}%</span>
                  </div>
                  <div className="h-0.5 bg-stella-border rounded-sm">
                    <div
                      className="h-full bg-primary rounded-sm transition-all duration-500"
                      style={{ width: `${val * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-stella-text-muted">
            {personalityData?.preferences?.length || 0} preference facts learned
            {personalityData?.totalEpisodes && ` · ${personalityData.totalEpisodes} total episodes`}
          </div>

          <button
            onClick={() => {
              authFetch('/api/personality/recompute', { method: 'POST' })
                .then(() => authFetch('/api/personality').then(r => r.json()).then(setPersonalityData))
                .catch(() => {});
            }}
            className="mt-3 px-3 py-1.5 text-[11px] font-medium text-primary bg-stella-terra-dim border border-stella-terra-border rounded-md cursor-pointer hover:bg-primary/15 transition-colors"
          >
            Recompute Tone Profile
          </button>
        </section>
      </div>
    </div>
  );
}
