import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Paperclip, ArrowUp } from 'lucide-react';

interface ComposerProps {
  onSend: (text: string) => void;
}

export default function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="px-6 pt-3 pb-4 flex-shrink-0">
      <div
        className="flex items-end gap-2.5 rounded-2xl px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Paperclip */}
        <button className="mb-0.5 flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity">
          <Paperclip size={16} className="text-stella-text-dim" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Stella anything, or start a new run..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground tracking-tight placeholder:text-stella-text-dim leading-[1.5]"
          style={{ maxHeight: '200px' }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!hasText}
          className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            hasText ? 'bg-primary' : ''
          }`}
          style={!hasText ? { backgroundColor: '#3a3935' } : undefined}
        >
          <ArrowUp size={14} className={hasText ? 'text-primary-foreground' : 'text-stella-text-faint'} />
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] mt-2" style={{ color: '#3a3935' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
