import { Plus } from 'lucide-react';
import { Conversation } from './types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export default function ConversationHistory({
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: ConversationHistoryProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 220,
        flexShrink: 0,
        backgroundColor: '#141311',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stella-terra-border text-primary text-[13px] font-medium transition-colors hover:bg-stella-terra-dim"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
              conv.id === activeId
                ? 'bg-stella-terra-dim'
                : 'hover:bg-accent/50'
            }`}
          >
            <div
              className={`text-[13px] truncate ${
                conv.id === activeId ? 'text-foreground' : 'text-muted-foreground'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {conv.title}
            </div>
            <div className="text-[11px] font-mono text-stella-text-faint mt-0.5">
              {conv.timestamp}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
