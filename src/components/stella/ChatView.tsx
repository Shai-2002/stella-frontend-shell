import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from './types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatViewProps {
  messages: Message[];
  onAction?: (action: 'research' | 'build' | 'both') => void;
  isThinking?: boolean;
  onFileDrop?: (file: File) => void;
}

export default function ChatView({ messages, onAction, isThinking, onFileDrop }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (onFileDrop) setIsDragOver(true);
  }, [onFileDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger leave if we're actually leaving the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onFileDrop) onFileDrop(file);
  }, [onFileDrop]);

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div
      className="flex-1 overflow-y-auto py-8 scroll-smooth relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-primary/[0.06] border-2 border-dashed border-primary rounded-lg m-2"
          >
            <span className="text-primary text-base font-medium">Drop file here</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[720px] mx-auto px-6">
        {/* Empty state — welcome */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center justify-center min-h-[50vh] text-center"
          >
            <h2 className="text-2xl font-medium text-foreground mb-2">What are you working on?</h2>
            <p className="text-[14px] text-stella-text-muted max-w-sm leading-relaxed">
              Ask anything, start a research run, or kick off a build.
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
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-8"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-px" />
      </div>
    </div>
  );
}
