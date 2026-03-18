import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div className="flex-1 overflow-y-auto py-8 scroll-smooth">
      <div className="max-w-[800px] mx-auto px-8">
        {/* Empty state — welcome */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center justify-center min-h-[50vh] text-center"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #e08860 0%, #da7756 50%, #c4623f 100%)',
                boxShadow: '0 0 24px rgba(218,119,86,0.2)',
              }}
            >
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1.5">Hey, what are you working on?</h2>
            <p className="text-[13px] text-stella-text-muted max-w-sm">
              Ask me anything, start a research run, or kick off a build.
            </p>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onAction={onAction}
              isLatest={i === messages.length - 1 && msg.role === 'stella'}
              prevRole={i > 0 ? messages[i - 1].role : null}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator — iMessage-style dots */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="mt-5"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
