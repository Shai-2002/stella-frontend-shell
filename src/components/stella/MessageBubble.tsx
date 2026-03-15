import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from './types';
import ActionButtons from './ActionButtons';
import RunProgressCard from './RunProgressCard';
import { researchStages, buildStages } from './mockData';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: 'research' | 'build' | 'both') => void;
}

const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
    <path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12l-1.5-4.5L0 6l4.5-1.5z" />
  </svg>
);

export default function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const isStella = message.role === 'stella';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex gap-3 ${isStella ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
          isStella ? 'bg-primary' : ''
        }`}
        style={!isStella ? { backgroundColor: 'rgba(255,255,255,0.08)' } : undefined}
      >
        {isStella ? (
          <SparkleIcon />
        ) : (
          <span className="text-[11px] font-semibold text-muted-foreground">S</span>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col min-w-0 ${isStella ? '' : 'max-w-[85%] items-end'}`}>
        {/* Name + timestamp */}
        <div className={`flex items-center gap-2 mb-2 message-meta ${!isStella ? 'flex-row-reverse' : ''}`}>
          <span className="text-[13px] font-semibold text-foreground">
            {isStella ? 'Stella' : 'Shai'}
          </span>
          <span className="text-[11px] font-mono text-stella-text-faint opacity-60">{message.timestamp}</span>
        </div>

        {/* Message body */}
        {message.content && (
          <div
            className={`text-[14px] leading-[1.75] tracking-tight ${
              isStella
                ? ''
                : 'px-4 py-3 rounded-[16px_16px_4px_16px] bg-stella-terra-dim border border-stella-terra-border max-w-[85%]'
            }`}
            style={{ color: '#d4d4cf' }}
          >
            {isStella ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded bg-accent text-[13px] font-mono">{children}</code>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}
          </div>
        )}

        {/* Action buttons */}
        {message.showActions && onAction && <ActionButtons onAction={onAction} />}

        {/* Run progress card */}
        {message.showRunCard && message.pipelineType && (
          <RunProgressCard
            pipelineType={message.pipelineType}
            stages={message.pipelineType === 'research' ? researchStages : buildStages}
            runId={message.runId}
          />
        )}
      </div>
    </motion.div>
  );
}
