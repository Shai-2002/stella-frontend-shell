import { PipelineStage } from './types';

interface RunProgressCardProps {
  pipelineType: 'research' | 'build';
  stages: PipelineStage[];
}

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="hsl(16, 64%, 58%)" opacity={0.7}>
    <path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12l-1.5-4.5L0 6l4.5-1.5z" />
  </svg>
);

export default function RunProgressCard({ pipelineType, stages }: RunProgressCardProps) {
  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-2.5 mt-1"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
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
        <div key={i} className="flex items-center gap-2.5">
          {/* Status indicator */}
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

          {/* Stage name */}
          <span
            className={`text-[13px] ${
              stage.status === 'active'
                ? 'text-foreground'
                : stage.status === 'completed'
                ? 'text-muted-foreground'
                : 'text-stella-text-faint'
            }`}
          >
            {stage.name}
          </span>

          {/* Elapsed time */}
          {stage.elapsed && (
            <span className="text-[11px] font-mono text-stella-text-faint ml-auto">
              {stage.elapsed}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
