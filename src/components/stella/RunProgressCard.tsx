import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PipelineStage } from './types';

const STAGE_LABEL_MAP: Record<string, string> = {
  clarification: 'Clarification',
  decomposition: 'Question decomposition',
  track_approval_gate: 'Track approval',
  source_collection: 'Source collection',
  claim_extraction: 'Claim extraction',
  contradiction_detection: 'Contradiction detection',
  synthesis: 'Synthesis',
  synthesis_checkpoint: 'Synthesis checkpoint',
  report_assembly: 'Report assembly',
  export_and_receipt: 'Export',
  architecture: 'Architecture plan',
  task_breakdown: 'Task breakdown',
  scaffold: 'Scaffold plan',
  patch_generation: 'Patch generation',
  test_checklist: 'Test checklist',
  critic: 'Critic review',
  export: 'Export',
};

interface RunProgressCardProps {
  pipelineType: 'research' | 'build';
  stages: PipelineStage[];
  runId?: string;
}

interface RunOutputs {
  md?: string;
  pdf?: string;
  docx?: string;
  build_dir?: string;
}

const CheckMark = () => (
  <span className="text-[11px] text-stella-text-dim">✓</span>
);

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function stageMatches(displayName: string, sseKey: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
  if (norm(displayName) === norm(sseKey)) return true;
  const mapped = STAGE_LABEL_MAP[sseKey];
  if (mapped && norm(mapped) === norm(displayName)) return true;
  return false;
}

async function fetchOutputs(runId: string): Promise<RunOutputs | null> {
  try {
    const res = await fetch(`/api/report/${runId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      md: data.markdown ?? undefined,
      pdf: data.pdf ?? undefined,
      docx: data.docx ?? undefined,
      build_dir: data.build_dir ?? undefined,
    };
  } catch {
    return null;
  }
}

export default function RunProgressCard({ pipelineType, stages: initialStages, runId }: RunProgressCardProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [runStatus, setRunStatus] = useState<'running' | 'completed' | 'failed'>('running');
  const [totalElapsed, setTotalElapsed] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [outputs, setOutputs] = useState<RunOutputs | null>(null);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/api/run/${runId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'stage_complete' && data.stage) {
          const elapsed = data.elapsed != null ? formatElapsed(data.elapsed) : undefined;
          setStages((prev) => {
            const updated = prev.map((s) => {
              if (stageMatches(s.name, data.stage)) return { ...s, status: 'completed' as const, elapsed };
              if (s.status === 'active') return { ...s, status: 'completed' as const };
              return s;
            });
            const hasMatch = prev.some((s) => stageMatches(s.name, data.stage));
            if (!hasMatch) {
              const label = STAGE_LABEL_MAP[data.stage] ?? data.message ?? data.stage;
              updated.push({ name: label, status: 'completed', elapsed });
            }
            const nextPendingIdx = updated.findIndex((s) => s.status === 'pending');
            if (nextPendingIdx !== -1) updated[nextPendingIdx] = { ...updated[nextPendingIdx], status: 'active' as const };
            return updated;
          });
        }

        if (data.type === 'run_complete') {
          setRunStatus('completed');
          if (data.elapsed != null) setTotalElapsed(data.elapsed);
          if (data.cost != null) setTotalCost(data.cost);
          setStages((prev) => prev.map((s) =>
            s.status === 'active' || s.status === 'pending' ? { ...s, status: 'completed' as const } : s
          ));
          es.close();
          if (runId) fetchOutputs(runId).then(setOutputs);
        }

        if (data.type === 'run_failed') { setRunStatus('failed'); es.close(); }
      } catch {}
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [runId]);

  useEffect(() => {
    if (!runId || runStatus !== 'completed' || outputs) return;
    fetchOutputs(runId).then(setOutputs);
  }, [runId, runStatus, outputs]);

  const isComplete = runStatus === 'completed';
  const accentGradient = isComplete
    ? 'linear-gradient(90deg, rgba(74,222,128,0.8) 0%, rgba(74,222,128,0.1) 100%)'
    : 'linear-gradient(90deg, rgba(218,119,86,0.8) 0%, rgba(218,119,86,0.1) 100%)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl overflow-hidden mt-3 bg-stella-surface border border-stella-border shadow-lg"
    >
      {/* Accent bar */}
      <div className="h-0.5 transition-all duration-500" style={{ background: accentGradient }} />

      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Pipeline badge */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[20px] ${
            pipelineType === 'research'
              ? 'bg-stella-terra-dim text-primary'
              : 'bg-stella-green-dim text-stella-green'
          }`}>
            {pipelineType}
          </span>
        </div>

        {/* Stages */}
        {stages.map((stage, i) => (
          <motion.div
            key={i}
            initial={stage.status === 'active' ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2.5 px-2 py-1 transition-colors duration-200 border-l-2 ${
              stage.status === 'active' ? 'border-l-primary' : 'border-l-transparent'
            }`}
          >
            {stage.status === 'completed' && <CheckMark />}
            {stage.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            {stage.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-white/10" />}

            <span className={`text-[13px] tracking-tight ${
              stage.status === 'active' ? 'text-foreground' :
              stage.status === 'completed' ? 'text-muted-foreground' :
              'text-stella-text-faint'
            }`}>
              {stage.name}
            </span>

            {stage.elapsed && (
              <span className="text-[11px] font-mono text-stella-text-dim ml-auto">{stage.elapsed}</span>
            )}
          </motion.div>
        ))}

        {/* Completion footer */}
        {runStatus === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between border-t border-stella-border pt-2.5 mt-0.5"
          >
            <span className="text-[13px] text-stella-green font-medium">✓ Complete</span>
            <div className="flex gap-3">
              {totalCost != null && totalCost > 0 && (
                <span className="text-[11px] font-mono text-stella-text-dim">${totalCost.toFixed(4)}</span>
              )}
              {totalElapsed != null && (
                <span className="text-[11px] font-mono text-stella-text-dim">{formatElapsed(totalElapsed)}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Download buttons */}
        {runStatus === 'completed' && outputs && (outputs.md || outputs.pdf || outputs.docx) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2 mt-2 pt-2 border-t border-stella-border"
          >
            {outputs.md && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.md)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-2.5 py-1 rounded-md text-stella-text-dim border border-stella-border hover:text-foreground hover:border-stella-border-strong transition-colors">
                .md
              </a>
            )}
            {outputs.pdf && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.pdf)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-2.5 py-1 rounded-md text-primary border border-stella-terra-border hover:bg-stella-terra-dim transition-colors">
                PDF
              </a>
            )}
            {outputs.docx && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.docx)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-2.5 py-1 rounded-md text-stella-green border border-stella-green/20 hover:bg-stella-green-dim transition-colors">
                DOCX
              </a>
            )}
          </motion.div>
        )}

        {runStatus === 'failed' && (
          <div className="border-t border-stella-border pt-2.5 mt-0.5">
            <span className="text-[13px] text-destructive font-medium">✗ Run failed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
