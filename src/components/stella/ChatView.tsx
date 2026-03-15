import { useEffect, useRef } from 'react';
import { Message } from './types';
import MessageBubble from './MessageBubble';

interface ChatViewProps {
  messages: Message[];
  onAction?: (action: 'research' | 'build' | 'both') => void;
}

export default function ChatView({ messages, onAction }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto py-8 px-12 md:px-12 px-5 flex flex-col gap-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={onAction} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
