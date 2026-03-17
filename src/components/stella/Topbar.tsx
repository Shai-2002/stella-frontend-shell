import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

interface TopbarProps {
  onClearChat: () => void;
  activeView: 'chat' | 'settings';
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isOwner?: boolean;
}

export default function Topbar({ onClearChat, activeView, showMobileMenu, onMobileMenuToggle, isOwner }: TopbarProps) {
  return (
    <div className="h-12 flex items-center px-6 border-b border-stella-border flex-shrink-0">
      {/* Mobile hamburger */}
      {showMobileMenu && (
        <button onClick={onMobileMenuToggle} className="mr-3 md:hidden">
          <Menu size={18} className="text-stella-text-dim" />
        </button>
      )}

      <span className="text-[13px] font-semibold text-foreground tracking-tight">
        {activeView === 'chat' ? 'Stella' : 'Settings'}
      </span>

      <div className="flex-1" />

      {activeView === 'chat' && (
        <button
          onClick={onClearChat}
          className="text-[11px] font-mono text-stella-text-dim px-3 py-1 rounded-md border border-stella-border hover:border-stella-border-strong transition-colors"
        >
          Clear chat
        </button>
      )}

      {isOwner && (
        <a
          href="/admin"
          className="ml-3 text-[11px] font-mono px-3 py-1 rounded-md border transition-colors"
          style={{ color: '#da7756', borderColor: 'rgba(218,119,86,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(218,119,86,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(218,119,86,0.3)')}
        >
          Admin
        </a>
      )}

      <div className="ml-3">
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 28, height: 28 },
            },
          }}
        />
      </div>
    </div>
  );
}
