import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from './types';
import ActionButtons from './ActionButtons';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: 'research' | 'build' | 'both' | 'go_ahead' | 'cancel') => void;
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

/** Strip markdown formatting for clean TTS output */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-•]\s/gm, '')
    .replace(/\n+/g, '. ')
    .trim();
}

function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  // Stop any current speech
  speechSynthesis.cancel();

  const clean = stripMarkdown(text);
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to pick a good voice
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(
    v => v.name.includes('Samantha') ||
         v.name.includes('Google UK English Female') ||
         v.name.includes('Karen') ||
         (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  speechSynthesis.speak(utterance);
}

function SpeakButton({ text }: { text: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleClick = useCallback(() => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speakText(text);
      setIsSpeaking(true);
      // Reset when speech ends
      const check = setInterval(() => {
        if (!speechSynthesis.speaking) {
          setIsSpeaking(false);
          clearInterval(check);
        }
      }, 200);
    }
  }, [text, isSpeaking]);

  if (!('speechSynthesis' in window)) return null;

  return (
    <button
      onClick={handleClick}
      className="p-1.5 rounded-md hover:bg-white/5 transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100"
      title={isSpeaking ? 'Stop speaking' : 'Listen'}
    >
      {isSpeaking ? (
        <VolumeX size={13} className="text-primary" />
      ) : (
        <Volume2 size={13} className="text-stella-text-dim" />
      )}
    </button>
  );
}

/** Strip any XML-like non-HTML blocks the LLM might emit */
const ALLOWED_HTML = new Set([
  'p','br','b','i','em','strong','a','ul','ol','li','h1','h2','h3','h4','h5','h6',
  'code','pre','blockquote','hr','img','table','thead','tbody','tr','th','td',
  'span','div','sup','sub','del','s','u','mark','small','details','summary',
]);
function sanitizeContent(text: string): string {
  // Strip paired non-HTML XML blocks: <tag>...</tag>
  let result = text.replace(/<([a-zA-Z_][a-zA-Z0-9_-]*)[^>]*>[\s\S]*?<\/\1>/gi, (m, tag) =>
    ALLOWED_HTML.has(tag.toLowerCase()) ? m : ''
  );
  // Strip stray non-HTML tags
  result = result.replace(/<\/?([a-zA-Z_][a-zA-Z0-9_-]*)[^>]*>/gi, (m, tag) =>
    ALLOWED_HTML.has(tag.toLowerCase()) ? m : ''
  );
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function MarkdownContent({ content }: { content: string }) {
  const clean = sanitizeContent(content);
  return (
    <ReactMarkdown
      components={{
        // Custom code blocks with copy button
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeStr = String(children).replace(/\n$/, '');
          // Block code (inside pre)
          const isBlock = className || (codeStr.includes('\n'));
          if (isBlock) {
            const lang = match?.[1] || '';
            return (
              <div className="relative group/code my-3">
                {lang && (
                  <div className="text-[10px] text-primary/70 px-3.5 pt-2.5 pb-0 bg-black/40 rounded-t-lg border border-b-0 border-stella-border">
                    {lang}
                  </div>
                )}
                <pre className={`overflow-x-auto text-[13px] leading-relaxed font-mono text-[#e2e8f0] px-3.5 py-3 bg-black/40 border border-stella-border ${lang ? 'rounded-b-lg border-t-0' : 'rounded-lg'}`}>
                  <code>{codeStr}</code>
                </pre>
                <CopyButton text={codeStr} />
              </div>
            );
          }
          // Inline code
          return (
            <code className="bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 text-[0.85em] font-mono text-primary" {...props}>
              {children}
            </code>
          );
        },
        // Styled headings
        h1({ children }) {
          return <h1 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base font-semibold text-foreground mt-3 mb-1.5">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-[15px] font-semibold text-foreground mt-2 mb-1">{children}</h3>;
        },
        // Paragraphs
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        // Lists
        ul({ children }) {
          return <ul className="mb-2 space-y-0.5 ml-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 space-y-0.5 ml-1 list-decimal list-inside">{children}</ol>;
        },
        li({ children }) {
          return (
            <li className="flex gap-2">
              <span className="text-primary/60 mt-[2px] flex-shrink-0">•</span>
              <span className="flex-1">{children}</span>
            </li>
          );
        },
        // Bold and italic
        strong({ children }) {
          return <strong className="text-foreground font-semibold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        // Links
        a({ href, children }) {
          return <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">{children}</a>;
        },
        // Blockquotes
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-stella-text-muted italic">{children}</blockquote>;
        },
        // Horizontal rule
        hr() {
          return <hr className="my-3 border-stella-border" />;
        },
      }}
    >
      {clean}
    </ReactMarkdown>
  );
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
        {/* Timestamp + speak button — visible on hover */}
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[10px] text-stella-text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {formatRelativeTime(message.timestamp)}
          </span>
          {message.content && <SpeakButton text={message.content} />}
        </div>

        {/* Content — just text, no avatar, no name */}
        {message.content && (
          <div className="text-[14px] sm:text-[15px] leading-[1.75] text-foreground tracking-[0.01em] break-words">
            <MarkdownContent content={message.content} />
          </div>
        )}

        {message.showActions && onAction && <ActionButtons onAction={onAction} actionType={message.actionType || 'clarify'} />}
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
      <div className="max-w-full sm:max-w-[85%]">
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 text-[14px] sm:text-[15px] leading-[1.7] text-foreground whitespace-pre-wrap break-words tracking-[0.01em] bg-white/[0.04] rounded-2xl border border-white/[0.06]">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
