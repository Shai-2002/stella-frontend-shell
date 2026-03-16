import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Message } from './types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatViewProps {
  messages: Message[];
  onAction?: (action: 'research' | 'build' | 'both') => void;
  isThinking?: boolean;
}

export default function ChatView({ messages, onAction, isThinking }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 0',
        scrollBehavior: 'smooth',
      }}
    >
      {/* Inner width constraint — Claude.ai style centered column */}
      <div style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '0 2rem',
      }}>
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onAction={onAction}
            isLatest={i === messages.length - 1 && msg.role === 'stella'}
          />
        ))}

        {/* Typing indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 'var(--space-message)' }}
          >
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}
