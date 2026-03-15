import { Settings } from 'lucide-react';

interface SidebarProps {
  activeView: 'chat' | 'settings';
  onViewChange: (view: 'chat' | 'settings') => void;
  onChatIconClick: () => void;
}

const ChatIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={active ? 'hsl(16, 64%, 58%)' : '#6b6a65'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h12a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 15 13.5H6l-3 3V4.5A1.5 1.5 0 0 1 3 3z" />
  </svg>
);

export default function Sidebar({ activeView, onViewChange, onChatIconClick }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[52px] bg-stella-sidebar flex flex-col items-center py-3 z-50 border-r border-stella-border">
      {/* Stella Logo */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center mb-4 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, hsl(16, 64%, 58%), hsl(14, 55%, 50%))' }}
      >
        <span className="text-primary-foreground text-[13px] font-semibold leading-none">S</span>
      </div>

      {/* Chat */}
      <button
        onClick={() => {
          if (activeView === 'chat') {
            onChatIconClick();
          } else {
            onViewChange('chat');
          }
        }}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors mb-1 ${
          activeView === 'chat' ? 'bg-stella-terra-dim' : 'hover:bg-stella-terra-dim/50'
        }`}
      >
        <ChatIcon active={activeView === 'chat'} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <button
        onClick={() => onViewChange('settings')}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          activeView === 'settings' ? 'bg-stella-terra-dim' : 'hover:bg-stella-terra-dim/50'
        }`}
      >
        <Settings size={18} className={activeView === 'settings' ? 'text-primary' : 'text-stella-text-dim'} />
      </button>
    </div>
  );
}
