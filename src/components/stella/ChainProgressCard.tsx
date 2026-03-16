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

    es.addEventListener('research_complete', () => {
      // Phase transition handled by phase_start
    });

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

  const phaseColor = phase === 'research'
    ? 'var(--color-cl-indigo)'
    : phase === 'build'
    ? 'var(--color-cl-terra)'
    : phase === 'complete'
    ? 'var(--color-cl-green)'
    : phase === 'error'
    ? 'var(--color-cl-red)'
    : 'var(--color-cl-text-muted)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--color-cl-surface)',
        border: '1px solid var(--color-cl-border)',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: '0.75rem',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${phaseColor} 0%, transparent 100%)`,
        transition: 'background 0.5s ease'
      }} />

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: phaseColor,
            boxShadow: isComplete ? 'none' : `0 0 8px ${phaseColor}`,
            animation: (!isComplete && phase !== 'error') ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-cl-text)', fontFamily: 'var(--font-display)' }}>
            {phase === 'waiting' && 'Preparing sequential run...'}
            {phase === 'research' && 'Phase 1 — Research'}
            {phase === 'build' && 'Phase 2 — Build (with research context)'}
            {phase === 'complete' && 'Chain complete'}
            {phase === 'error' && 'Chain failed'}
          </span>
        </div>

        {/* Research progress */}
        {researchStages.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: 10, color: 'var(--color-cl-text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Research
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {researchStages.map(s => (
                <span key={s} style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(79,70,229,0.1)',
                  border: '1px solid rgba(79,70,229,0.2)',
                  color: 'var(--color-cl-indigo)',
                  fontFamily: 'var(--font-display)'
                }}>&#10003; {s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Build progress */}
        {buildStages.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: 10, color: 'var(--color-cl-text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Build (informed by research)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {buildStages.map(s => (
                <span key={s} style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(218,119,86,0.1)',
                  border: '1px solid rgba(218,119,86,0.2)',
                  color: 'var(--color-cl-terra)',
                  fontFamily: 'var(--font-display)'
                }}>&#10003; {s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Current stage */}
        {!isComplete && currentStage && (
          <div style={{
            fontSize: 11,
            color: 'var(--color-cl-text-muted)',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}>
            <span style={{ display: 'inline-block' }}>&#8635;</span>
            {currentStage}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: 'var(--color-cl-red)', fontFamily: 'var(--font-display)' }}>
            {error}
          </div>
        )}
      </div>
    </motion.div>
  );
}
