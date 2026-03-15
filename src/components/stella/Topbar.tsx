import { Menu } from 'lucide-react';

interface TopbarProps {
  onClearChat: () => void;
  activeView: 'chat' | 'settings';
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function Topbar({ onClearChat, activeView, showMobileMenu, onMobileMenuToggle }: TopbarProps) {
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
    </div>
  );
}
