import { useEffect, useRef } from 'react';
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[700px] mx-auto py-10 px-8 md:px-12 pb-4 flex flex-col gap-8">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={onAction} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
