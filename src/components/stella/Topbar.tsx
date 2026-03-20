import { Menu, PanelRight } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

interface TopbarProps {
  onClearChat: () => void;
  activeView: 'chat' | 'settings' | 'projects';
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isOwner?: boolean;
  onToggleFiles?: () => void;
  isFilesPanelOpen?: boolean;
}

export default function Topbar({ onClearChat, activeView, showMobileMenu, onMobileMenuToggle, isOwner, onToggleFiles, isFilesPanelOpen }: TopbarProps) {
  return (
    <div className="h-12 flex items-center px-3 md:px-6 border-b border-stella-border flex-shrink-0">
      {/* Mobile hamburger — 44px touch target */}
      {showMobileMenu && (
        <button onClick={onMobileMenuToggle} className="mr-2 md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-white/5 transition-colors -ml-1">
          <Menu size={20} className="text-stella-text-dim" />
        </button>
      )}

      <span className="text-[13px] font-semibold text-foreground tracking-tight">
        {activeView === 'chat' ? 'Stella' : activeView === 'projects' ? 'Projects' : 'Settings'}
      </span>

      <div className="flex-1" />

      {activeView === 'chat' && (
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={onClearChat}
            className="text-[11px] font-mono text-stella-text-dim px-2 md:px-3 py-1 rounded-md border border-stella-border hover:border-stella-border-strong hover:text-stella-text-muted transition-colors hidden sm:block"
          >
            Clear chat
          </button>
          {/* Mobile clear — icon only */}
          <button
            onClick={onClearChat}
            className="sm:hidden min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-stella-border text-stella-text-dim hover:text-stella-text-muted transition-colors"
            title="Clear chat"
          >
            <span className="text-[11px]">✕</span>
          </button>
          {onToggleFiles && (
            <button
              onClick={onToggleFiles}
              className={`min-w-[36px] min-h-[36px] md:min-w-0 md:min-h-0 md:p-1.5 flex items-center justify-center rounded-md border transition-colors ${
                isFilesPanelOpen
                  ? 'border-stella-terra-border text-primary bg-stella-terra-dim'
                  : 'border-stella-border text-stella-text-dim hover:border-stella-border-strong hover:text-stella-text-muted'
              }`}
              title="Toggle files panel"
            >
              <PanelRight size={14} />
            </button>
          )}
        </div>
      )}

      {isOwner && (
        <a
          href="/admin"
          className="ml-2 md:ml-3 text-[11px] font-mono px-2 md:px-3 py-1 rounded-md border border-stella-terra-border text-primary hover:bg-stella-terra-dim transition-colors"
        >
          Admin
        </a>
      )}

      <div className="ml-2 md:ml-3">
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
