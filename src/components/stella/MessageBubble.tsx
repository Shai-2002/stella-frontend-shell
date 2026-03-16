import React from 'react';
import { motion } from 'framer-motion';
import { Message } from './types';
import ActionButtons from './ActionButtons';
import RunProgressCard from './RunProgressCard';
import ChainProgressCard from './ChainProgressCard';
import { researchStages, buildStages } from './mockData';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: 'research' | 'build' | 'both') => void;
  isLatest?: boolean;
}

// Format timestamp for display
function formatTime(ts: string): string {
  try {
    // If it's already a formatted time like "3:45 PM", return as-is
    if (/\d{1,2}:\d{2}/.test(ts) && ts.length < 10) return ts;
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return ts;
  }
}

// Parse content to render code blocks inline with styling
function renderContent(content: string): React.ReactNode {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, i) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = lines.slice(1).join('\n');
      return (
        <pre key={i} className="my-3 rounded-lg overflow-x-auto text-xs leading-relaxed"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '0.875rem 1rem',
            fontFamily: 'var(--font-mono)',
            color: '#e2e8f0'
          }}>
          {lang && (
            <div style={{ color: 'var(--color-cl-terra)', fontSize: '10px', marginBottom: '0.5rem', opacity: 0.7, fontFamily: 'var(--font-display)' }}>
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background: 'rgba(218,119,86,0.1)',
          border: '1px solid rgba(218,119,86,0.2)',
          borderRadius: '4px',
          padding: '0.1em 0.4em',
          fontSize: '0.85em',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-cl-terra)'
        }}>{part.slice(1, -1)}</code>
      );
    }
    // Bold text
    const withBold = part.split(/(\*\*[^*]+\*\*)/g).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={j} style={{ color: 'var(--color-cl-text)', fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
      }
      return p;
    });
    return <span key={i}>{withBold}</span>;
  });
}

const stellaVariants = {
  hidden: { opacity: 0, x: -8, y: 4 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
};

const userVariants = {
  hidden: { opacity: 0, x: 8, y: 4 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
};

export default function MessageBubble({ message, onAction, isLatest = false }: MessageBubbleProps) {
  const isStella = message.role === 'stella';

  if (isStella) {
    return (
      <motion.div
        className="flex gap-3 group"
        initial="hidden"
        animate="visible"
        variants={stellaVariants}
        style={{ alignItems: 'flex-start', marginBottom: 'var(--space-message)' }}
      >
        {/* Stella avatar — large terra circle with S + status indicator */}
        <div style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          position: 'relative',
          marginTop: '2px',
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e08860 0%, #da7756 50%, #c4623f 100%)',
            boxShadow: isLatest ? '0 0 16px rgba(218,119,86,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'box-shadow 0.5s ease',
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
            }}>S</span>
          </div>
          {/* Status + indicator */}
          <div style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#2b2a27',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #2b2a27',
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--color-cl-green)',
              boxShadow: '0 0 6px rgba(74,222,128,0.5)',
            }} />
          </div>
        </div>

        {/* Message body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header: name + time */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem',
            marginBottom: '0.375rem'
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-cl-terra)',
              letterSpacing: '0.01em',
              fontFamily: 'var(--font-display)'
            }}>Stella</span>
            <span style={{
              fontSize: 10,
              color: 'var(--color-cl-text-muted)',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              fontFamily: 'var(--font-display)'
            }} className="group-hover:opacity-100">{formatTime(message.timestamp)}</span>
          </div>

          {/* Content */}
          {message.content && (
            <div style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--color-cl-text)',
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}>
              {renderContent(message.content)}
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

          {/* Chain progress card (sequential Both) */}
          {message.showChainCard && message.chainId && (
            <ChainProgressCard chainId={message.chainId} />
          )}
        </div>
      </motion.div>
    );
  }

  // User message
  return (
    <motion.div
      className="flex justify-end group"
      initial="hidden"
      animate="visible"
      variants={userVariants}
      style={{ marginBottom: 'var(--space-message)' }}
    >
      <div style={{ maxWidth: '72%', minWidth: 0 }}>
        {/* Header: name + time (right-aligned) */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          marginBottom: '0.375rem'
        }}>
          <span style={{
            fontSize: 10,
            color: 'var(--color-cl-text-muted)',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            fontFamily: 'var(--font-display)'
          }} className="group-hover:opacity-100">{formatTime(message.timestamp)}</span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-cl-text-muted)',
            letterSpacing: '0.01em',
            fontFamily: 'var(--font-display)'
          }}>Shai</span>
        </div>

        {/* Bubble */}
        <div style={{
          background: '#3a2820',
          border: '1px solid rgba(218,119,86,0.15)',
          borderRadius: '20px 6px 20px 20px',
          padding: '0.75rem 1.15rem',
          fontSize: 15,
          lineHeight: 1.7,
          color: 'var(--color-cl-text)',
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          letterSpacing: '0.01em',
        }}>
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
