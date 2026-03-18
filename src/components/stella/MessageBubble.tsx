import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Message } from './types';
import ActionButtons from './ActionButtons';
import RunProgressCard from './RunProgressCard';
import ChainProgressCard from './ChainProgressCard';
import { researchStages, buildStages } from './mockData';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: 'research' | 'build' | 'both') => void;
  isLatest?: boolean;
  prevRole?: 'stella' | 'user' | null;
}

function formatTime(ts: string): string {
  try {
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(ts) && ts.length < 10) return ts;
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return ts;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] transition-all duration-150 opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? <Check size={13} className="text-stella-green" /> : <Copy size={13} className="text-stella-text-dim" />}
    </button>
  );
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, i) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
      return (
        <div key={i} className="relative group/code my-4 -ml-[52px] pl-[52px]">
          {lang && (
            <div className="text-[11px] text-stella-text-dim font-mono px-4 pt-3 pb-0 rounded-t-lg border border-b-0 border-white/[0.06]" style={{ background: '#1a1917' }}>
              {lang}
            </div>
          )}
          <pre className={`overflow-x-auto text-[13px] leading-[1.7] font-mono text-[#e2e8f0] px-4 py-4 border border-white/[0.06] ${lang ? 'rounded-b-lg border-t-0' : 'rounded-lg'}`} style={{ background: '#1a1917' }}>
            <code>{code}</code>
          </pre>
          <CopyButton text={code} />
        </div>
      );
    }
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-primary/[0.1] rounded-md px-1.5 py-0.5 text-[0.85em] font-mono text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Bold, italic, bullets, links
    const processed = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={j} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith('*') && p.endsWith('*') && !p.startsWith('**')) {
        return <em key={j} className="italic text-stella-text-muted">{p.slice(1, -1)}</em>;
      }
      // Handle bullet points and numbered lists
      const bulletLines = p.split('\n').map((line, li) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={li} className="flex gap-2.5 ml-0.5 mt-1">
              <span className="text-primary/50 mt-[3px] flex-shrink-0 text-[8px]">●</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={li} className="flex gap-2.5 ml-0.5 mt-1">
              <span className="text-stella-text-dim flex-shrink-0 text-[13px] font-mono min-w-[16px]">{numMatch[1]}.</span>
              <span>{numMatch[2]}</span>
            </div>
          );
        }
        return line + (li < p.split('\n').length - 1 ? '\n' : '');
      });
      return <React.Fragment key={j}>{bulletLines}</React.Fragment>;
    });
    return <span key={i}>{processed}</span>;
  });
}

const stellaVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const userVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function MessageBubble({ message, onAction, isLatest = false, prevRole = null }: MessageBubbleProps) {
  const isStella = message.role === 'stella';
  const sameSpeaker = prevRole === message.role;
  const spacing = sameSpeaker ? 'mt-2' : 'mt-5';

  if (isStella) {
    return (
      <motion.div
        className={`flex gap-3 group items-start ${spacing} max-w-[75%]`}
        initial="hidden"
        animate="visible"
        variants={stellaVariants}
      >
        {/* Stella avatar — 32px, top-aligned */}
        <div className="flex-shrink-0 w-8 h-8 relative mt-0.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #e08860 0%, #da7756 50%, #c4623f 100%)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-[13px] font-bold text-white">S</span>
          </div>
          <div className="absolute -bottom-px -right-px w-3 h-3 rounded-full bg-background flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-stella-green" />
          </div>
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0">
          {/* Header: name + timestamp on same line */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[13px] font-medium text-foreground">Stella</span>
            <span className="text-[12px] text-stella-text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Content — indented to align with text, not avatar */}
          {message.content && (
            <div className="text-[14px] leading-[1.65] text-foreground whitespace-pre-wrap break-words [&>span]:block [&>span+span]:mt-3">
              {renderContent(message.content)}
            </div>
          )}

          {message.showActions && onAction && <ActionButtons onAction={onAction} />}
          {message.showRunCard && message.pipelineType && (
            <RunProgressCard
              pipelineType={message.pipelineType}
              stages={message.pipelineType === 'research' ? researchStages : buildStages}
              runId={message.runId}
            />
          )}
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
      className={`flex justify-end group ${spacing}`}
      initial="hidden"
      animate="visible"
      variants={userVariants}
    >
      <div className="max-w-[70%] min-w-0">
        {/* Header */}
        <div className="flex items-baseline justify-end gap-2 mb-1">
          <span className="text-[12px] text-stella-text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {formatTime(message.timestamp)}
          </span>
          <span className="text-[13px] font-medium text-stella-text-muted">Shai</span>
        </div>

        {/* Bubble */}
        <div className="px-4 py-3 text-[14px] leading-[1.5] text-foreground whitespace-pre-wrap break-words rounded-2xl bg-stella-terra-dim border border-stella-terra-border">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
