import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Message } from './types';
import ActionButtons from './ActionButtons';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: 'research' | 'build' | 'both') => void;
  isLatest?: boolean;
}

function formatRelativeTime(ts: string): string {
  try {
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(ts) && ts.length < 10) return ts;
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return ts;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-all opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? <Check size={12} className="text-stella-green" /> : <Copy size={12} className="text-stella-text-dim" />}
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
        <div key={i} className="relative group/code my-3">
          {lang && (
            <div className="text-[10px] text-primary/70 px-3.5 pt-2.5 pb-0 bg-black/40 rounded-t-lg border border-b-0 border-stella-border">
              {lang}
            </div>
          )}
          <pre className={`overflow-x-auto text-[13px] leading-relaxed font-mono text-[#e2e8f0] px-3.5 py-3 bg-black/40 border border-stella-border ${lang ? 'rounded-b-lg border-t-0' : 'rounded-lg'}`}>
            <code>{code}</code>
          </pre>
          <CopyButton text={code} />
        </div>
      );
    }
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 text-[0.85em] font-mono text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Bold and italic
    const processed = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={j} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith('*') && p.endsWith('*') && !p.startsWith('**')) {
        return <em key={j} className="italic">{p.slice(1, -1)}</em>;
      }
      // Handle bullet points
      const bulletLines = p.split('\n').map((line, li) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={li} className="flex gap-2 ml-1">
              <span className="text-primary/60 mt-[2px] flex-shrink-0">•</span>
              <span>{trimmed.slice(2)}</span>
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
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const userVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function MessageBubble({ message, onAction, isLatest = false }: MessageBubbleProps) {
  const isStella = message.role === 'stella';

  if (isStella) {
    return (
      <motion.div
        className="group mb-6"
        initial="hidden"
        animate="visible"
        variants={stellaVariants}
      >
        {/* Timestamp — visible on hover */}
        <div className="mb-1">
          <span className="text-[10px] text-stella-text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>

        {/* Content — just text, no avatar, no name */}
        {message.content && (
          <div className="text-[15px] leading-[1.75] text-foreground tracking-[0.01em] whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>
        )}

        {message.showActions && onAction && <ActionButtons onAction={onAction} />}
      </motion.div>
    );
  }

  // User message — left-aligned subtle block
  return (
    <motion.div
      className="group mb-6"
      initial="hidden"
      animate="visible"
      variants={userVariants}
    >
      {/* Timestamp — visible on hover */}
      <div className="mb-1">
        <span className="text-[10px] text-stella-text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>

      {/* Subtle block — left-aligned, light background */}
      <div className="max-w-[85%]">
        <div className="px-4 py-3 text-[15px] leading-[1.7] text-foreground whitespace-pre-wrap break-words tracking-[0.01em] bg-white/[0.04] rounded-2xl border border-white/[0.06]">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
