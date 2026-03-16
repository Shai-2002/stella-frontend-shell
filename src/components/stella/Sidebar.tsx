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
    <div className="fixed left-0 top-0 bottom-0 w-[52px] bg-stella-sidebar flex flex-col items-center py-3 z-50 border-r border-stella-border"
      style={{ position: 'relative' }}
    >
      {/* Terra accent bar at top */}
      <div style={{
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, var(--color-cl-terra) 0%, rgba(218,119,86,0.3) 100%)',
        position: 'absolute',
        top: 0,
        left: 0,
      }} />

      {/* Stella Logo */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center mb-4 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, hsl(16, 64%, 58%), hsl(14, 55%, 50%))' }}
      >
        <span className="text-primary-foreground text-[13px] font-semibold leading-none">S</span>
      </div>

      {/* Chat — with tooltip */}
      <div className="relative group/tooltip">
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
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
          background: 'rgba(42,40,37,0.95)',
          border: '1px solid var(--color-cl-border)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: 11,
          color: 'var(--color-cl-text-muted)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          fontFamily: 'var(--font-display)',
          zIndex: 50,
        }} className="group-hover/tooltip:opacity-100">
          Chat
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings — with tooltip */}
      <div className="relative group/tooltip">
        <button
          onClick={() => onViewChange('settings')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'settings' ? 'bg-stella-terra-dim' : 'hover:bg-stella-terra-dim/50'
          }`}
        >
          <Settings size={18} className={activeView === 'settings' ? 'text-primary' : 'text-stella-text-dim'} />
        </button>
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
          background: 'rgba(42,40,37,0.95)',
          border: '1px solid var(--color-cl-border)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: 11,
          color: 'var(--color-cl-text-muted)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          fontFamily: 'var(--font-display)',
          zIndex: 50,
        }} className="group-hover/tooltip:opacity-100">
          Settings
        </div>
      </div>
    </div>
  );
}
