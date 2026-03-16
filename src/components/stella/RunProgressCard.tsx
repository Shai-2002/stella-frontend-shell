import { useState, useEffect } from 'react';
import { PipelineStage } from './types';

// SSE stage keys → display name mapping (matches server.ts STAGE_LABELS)
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

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="hsl(16, 64%, 58%)" opacity={0.7}>
    <path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12l-1.5-4.5L0 6l4.5-1.5z" />
  </svg>
);

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// Fuzzy match: normalize both to lowercase with underscores stripped
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
    // /api/report/:runId returns { mode, pdf, docx, markdown, build_dir }
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
            // First: set ALL currently active stages to completed
            const updated = prev.map((s) => {
              if (stageMatches(s.name, data.stage)) {
                return { ...s, status: 'completed' as const, elapsed };
              }
              if (s.status === 'active') {
                return { ...s, status: 'completed' as const };
              }
              return s;
            });

            // If no existing stage matched the SSE key, add it
            const hasMatch = prev.some((s) => stageMatches(s.name, data.stage));
            if (!hasMatch) {
              const label = STAGE_LABEL_MAP[data.stage] ?? data.message ?? data.stage;
              updated.push({ name: label, status: 'completed', elapsed });
            }

            // Mark only the next pending stage as active
            const nextPendingIdx = updated.findIndex((s) => s.status === 'pending');
            if (nextPendingIdx !== -1) {
              updated[nextPendingIdx] = { ...updated[nextPendingIdx], status: 'active' as const };
            }

            return updated;
          });
        }

        if (data.type === 'run_complete') {
          setRunStatus('completed');
          if (data.elapsed != null) setTotalElapsed(data.elapsed);
          if (data.cost != null) setTotalCost(data.cost);
          setStages((prev) => prev.map((s) =>
            s.status === 'active' || s.status === 'pending'
              ? { ...s, status: 'completed' as const }
              : s
          ));
          es.close();
          // Fetch download links
          if (runId) fetchOutputs(runId).then(setOutputs);
        }

        if (data.type === 'run_failed') {
          setRunStatus('failed');
          es.close();
        }
      } catch {}
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [runId]);

  // Also check for already-completed runs (e.g. reconnecting to a finished run)
  useEffect(() => {
    if (!runId || runStatus !== 'completed' || outputs) return;
    fetchOutputs(runId).then(setOutputs);
  }, [runId, runStatus, outputs]);

  const isComplete = runStatus === 'completed';

  return (
    <div
      className="rounded-xl flex flex-col mt-1"
      style={{
        background: 'var(--color-cl-surface)',
        border: '1px solid var(--color-cl-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '0.75rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Terra/green accent bar at top */}
      <div style={{
        height: '2px',
        background: isComplete
          ? 'linear-gradient(90deg, var(--color-cl-green) 0%, rgba(74,222,128,0.3) 100%)'
          : 'linear-gradient(90deg, var(--color-cl-terra) 0%, rgba(218,119,86,0.3) 100%)',
        transition: 'background 0.5s ease',
      }} />

      <div className="p-3.5 flex flex-col gap-2.5">
      {/* Pipeline badge */}
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-[20px] ${
            pipelineType === 'research'
              ? 'bg-stella-terra-dim text-primary'
              : 'bg-stella-green-dim text-stella-green'
          }`}
        >
          {pipelineType}
        </span>
      </div>

      {/* Stages */}
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-2.5"
          style={{
            padding: '0.25rem 0.5rem',
            borderLeft: stage.status === 'active' ? '2px solid var(--color-cl-terra)' : '2px solid transparent',
            transition: 'border-color 0.2s ease',
          }}
        >
          {stage.status === 'completed' && <StarIcon />}
          {stage.status === 'active' && (
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
          )}
          {stage.status === 'pending' && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ border: '1.5px solid rgba(255,255,255,0.15)' }}
            />
          )}

          <span
            className={`text-[13px] tracking-tight ${
              stage.status === 'active'
                ? 'text-foreground'
                : stage.status === 'completed'
                ? 'text-muted-foreground'
                : 'text-stella-text-faint'
            }`}
          >
            {stage.name}
          </span>

          {stage.elapsed && (
            <span className="text-[11px] font-mono text-stella-text-dim ml-auto">
              {stage.elapsed}
            </span>
          )}
        </div>
      ))}

      {/* Completion footer */}
      {runStatus === 'completed' && (
        <div className="flex items-center justify-between border-t pt-2.5 mt-0.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[13px] text-stella-green">✓ Complete</span>
          <div className="flex gap-3">
            {totalCost != null && totalCost > 0 && (
              <span className="text-[11px] font-mono text-stella-text-dim">${totalCost.toFixed(4)}</span>
            )}
            {totalElapsed != null && (
              <span className="text-[11px] font-mono text-stella-text-dim">{formatElapsed(totalElapsed)}</span>
            )}
          </div>
        </div>
      )}

      {/* Download buttons */}
      {runStatus === 'completed' && outputs && (outputs.md || outputs.pdf || outputs.docx) && (
        <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {outputs.md && (
            <a
              href={`/api/download?path=${encodeURIComponent(outputs.md)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono px-2 py-1 rounded-md text-stella-text-dim hover:text-foreground transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              .md
            </a>
          )}
          {outputs.pdf && (
            <a
              href={`/api/download?path=${encodeURIComponent(outputs.pdf)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono px-2 py-1 rounded-md text-primary hover:opacity-80 transition-opacity"
              style={{ border: '1px solid rgba(218,119,86,0.25)' }}
            >
              PDF
            </a>
          )}
          {outputs.docx && (
            <a
              href={`/api/download?path=${encodeURIComponent(outputs.docx)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono px-2 py-1 rounded-md text-stella-green hover:opacity-80 transition-opacity"
              style={{ border: '1px solid rgba(74,222,128,0.2)' }}
            >
              DOCX
            </a>
          )}
        </div>
      )}

      {runStatus === 'failed' && (
        <div className="border-t pt-2.5 mt-0.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[13px] text-destructive">✗ Run failed</span>
        </div>
      )}
      </div>
    </div>
  );
}
