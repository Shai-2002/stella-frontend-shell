import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ChainProgressCardProps {
  chainId: string;
}

type Phase = 'research' | 'build' | 'complete' | 'error' | 'waiting';

export default function ChainProgressCard({ chainId }: ChainProgressCardProps) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const [researchStages, setResearchStages] = useState<string[]>([]);
  const [buildStages, setBuildStages] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!chainId) return;

    const es = new EventSource(`/api/chain/${chainId}/stream`);

    es.addEventListener('phase_start', (e) => {
      const data = JSON.parse(e.data);
      setPhase(data.phase);
      setCurrentStage(data.message);
    });

    es.addEventListener('research_stage', (e) => {
      const data = JSON.parse(e.data);
      if (data.status === 'completed') {
        setResearchStages(prev => [...prev, data.stage]);
      }
      setCurrentStage(data.stage);
    });

    es.addEventListener('research_complete', () => {});

    es.addEventListener('build_stage', (e) => {
      const data = JSON.parse(e.data);
      if (data.status === 'completed') {
        setBuildStages(prev => [...prev, data.stage]);
      }
      setCurrentStage(data.stage);
    });

    es.addEventListener('chain_complete', () => {
      setIsComplete(true);
      setPhase('complete');
      es.close();
    });

    es.addEventListener('chain_error', (e) => {
      const data = JSON.parse(e.data);
      setError(data.error);
      setPhase('error');
      es.close();
    });

    return () => es.close();
  }, [chainId]);

  const phaseConfig = {
    waiting: { color: 'text-stella-text-muted', bg: 'bg-white/5', border: 'border-stella-border' },
    research: { color: 'text-stella-indigo', bg: 'bg-stella-indigo-dim', border: 'border-stella-indigo/20' },
    build: { color: 'text-primary', bg: 'bg-stella-terra-dim', border: 'border-stella-terra-border' },
    complete: { color: 'text-stella-green', bg: 'bg-stella-green-dim', border: 'border-stella-green/20' },
    error: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  }[phase];

  const phaseGradientColor = {
    waiting: 'rgba(160,159,154,0.5)',
    research: 'rgba(79,70,229,0.8)',
    build: 'rgba(218,119,86,0.8)',
    complete: 'rgba(74,222,128,0.8)',
    error: 'rgba(248,113,113,0.8)',
  }[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden mt-3 bg-stella-surface border border-stella-border"
    >
      {/* Top accent bar */}
      <div
        className="h-0.5 transition-all duration-500"
        style={{ background: `linear-gradient(90deg, ${phaseGradientColor} 0%, transparent 100%)` }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-2 h-2 rounded-full ${phaseConfig.bg}`}
            style={{
              boxShadow: isComplete || phase === 'error' ? 'none' : `0 0 8px ${phaseGradientColor}`,
              background: phaseGradientColor,
            }}
          />
          <span className={`text-xs font-semibold text-foreground`}>
            {phase === 'waiting' && 'Preparing sequential run...'}
            {phase === 'research' && 'Phase 1 — Research'}
            {phase === 'build' && 'Phase 2 — Build (with research context)'}
            {phase === 'complete' && 'Chain complete'}
            {phase === 'error' && 'Chain failed'}
          </span>
        </div>

        {/* Research progress */}
        {researchStages.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-stella-text-muted uppercase tracking-widest mb-1.5">Research</div>
            <div className="flex flex-wrap gap-1">
              {researchStages.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-stella-indigo-dim border border-stella-indigo/20 text-stella-indigo">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Build progress */}
        {buildStages.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-stella-text-muted uppercase tracking-widest mb-1.5">Build (informed by research)</div>
            <div className="flex flex-wrap gap-1">
              {buildStages.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-stella-terra-dim border border-stella-terra-border text-primary">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current stage */}
        {!isComplete && currentStage && (
          <div className="text-[11px] text-stella-text-muted flex items-center gap-1.5">
            <span className="animate-spin inline-block">↻</span>
            {currentStage}
          </div>
        )}

        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    </motion.div>
  );
}
