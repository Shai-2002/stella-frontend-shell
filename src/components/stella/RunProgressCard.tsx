import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
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
  const [progressPct, setProgressPct] = useState(0);
  const [stageProgress, setStageProgress] = useState('');
  const elapsedRef = useRef(0);

  // Live elapsed timer
  useEffect(() => {
    if (runStatus !== 'running') return;
    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setTotalElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [runStatus]);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/api/run/${runId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'stage_complete' && data.stage) {
          const elapsed = data.elapsed != null ? formatElapsed(data.elapsed) : undefined;

          // Update progress from SSE data
          if (data.progress_pct != null) setProgressPct(data.progress_pct);
          if (data.stage_index != null && data.total_stages != null) {
            setStageProgress(`${data.stage_index}/${data.total_stages}`);
          }

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
          setProgressPct(100);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl mt-4 border border-white/[0.06] overflow-hidden"
      style={{ background: '#1f1e1b' }}
    >
      <div className="px-5 py-4">
        {/* Header: badge + elapsed */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
              pipelineType === 'research'
                ? 'bg-stella-terra-dim text-primary'
                : 'bg-stella-green-dim text-stella-green'
            }`}>
              {pipelineType === 'research' ? 'Research' : 'Build'}
            </span>
            {stageProgress && !isComplete && (
              <span className="text-[11px] font-mono text-stella-text-dim">{stageProgress}</span>
            )}
          </div>
          {totalElapsed != null && (
            <span className="text-[11px] font-mono text-stella-text-dim">{formatElapsed(totalElapsed)}</span>
          )}
        </div>

        {/* Overall progress bar */}
        {!isComplete && (
          <div className="h-[2px] rounded-full bg-white/[0.04] mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Stages */}
        <div className="space-y-0.5">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 py-1.5 px-1 rounded-md transition-all duration-200 ${
                stage.status === 'active' ? 'bg-white/[0.02]' : ''
              }`}
            >
              {/* Status icon */}
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <AnimatePresence mode="wait">
                  {stage.status === 'completed' && (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                    >
                      <Check size={13} className="text-stella-green" strokeWidth={2.5} />
                    </motion.div>
                  )}
                  {stage.status === 'active' && (
                    <Loader2 size={13} className="text-primary animate-spin" />
                  )}
                  {stage.status === 'pending' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/[0.12]" />
                  )}
                </AnimatePresence>
              </div>

              {/* Stage name */}
              <span className={`text-[13px] transition-colors duration-200 ${
                stage.status === 'active' ? 'text-foreground' :
                stage.status === 'completed' ? 'text-stella-text-muted' :
                'text-stella-text-faint'
              }`}>
                {stage.name}
              </span>

              {/* Elapsed time */}
              {stage.elapsed && (
                <span className="text-[11px] font-mono text-stella-text-dim ml-auto">{stage.elapsed}</span>
              )}
            </div>
          ))}
        </div>

        {/* Completion footer */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between border-t border-white/[0.06] pt-3 mt-3"
          >
            <span className="text-[13px] text-stella-green font-medium flex items-center gap-1.5">
              <Check size={14} strokeWidth={2.5} /> Complete
            </span>
            <div className="flex items-center gap-3">
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
        {isComplete && outputs && (outputs.md || outputs.pdf || outputs.docx) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]"
          >
            {outputs.pdf && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.pdf)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-3 py-1.5 rounded-full text-primary border border-stella-terra-border hover:bg-stella-terra-dim transition-colors duration-150">
                PDF
              </a>
            )}
            {outputs.docx && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.docx)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-3 py-1.5 rounded-full text-stella-green border border-stella-green/20 hover:bg-stella-green-dim transition-colors duration-150">
                DOCX
              </a>
            )}
            {outputs.md && (
              <a href={`/api/download?path=${encodeURIComponent(outputs.md)}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono px-3 py-1.5 rounded-full text-stella-text-dim border border-stella-border hover:text-foreground hover:border-stella-border-strong transition-colors duration-150">
                .md
              </a>
            )}
          </motion.div>
        )}

        {runStatus === 'failed' && (
          <div className="border-t border-white/[0.06] pt-3 mt-3">
            <span className="text-[13px] text-destructive font-medium">Run failed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
