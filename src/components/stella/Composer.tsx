import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Paperclip, ArrowUp, Mic } from 'lucide-react';

interface ComposerProps {
  onSend: (text: string) => void;
  onTranscript?: (text: string) => void;
  onDocumentUploaded?: (id: string, filename: string, message: string) => void;
}

export default function Composer({ onSend, onTranscript, onDocumentUploaded }: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        try {
          const r = await fetch('/api/voice/transcribe', { method: 'POST', body: formData });
          const d = await r.json();
          if (d.text) {
            setText(prev => prev + d.text);
            if (onTranscript) onTranscript(d.text);
          }
        } catch {}
        setIsTranscribing(false);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Microphone access denied — fail silently
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="px-6 pt-3 pb-4 flex-shrink-0">
      <div
        className="flex items-end gap-2.5 rounded-[18px] px-4 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Paperclip / Document upload */}
        <label className="mb-0.5 flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity cursor-pointer">
          <Paperclip size={16} className="text-stella-text-dim" />
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              try {
                const r = await fetch('/api/documents/upload', { method: 'POST', body: formData });
                const d = await r.json();
                if (d.success && onDocumentUploaded) {
                  onDocumentUploaded(d.documentId, d.filename, d.message);
                }
              } catch(err) {
                console.error('Upload failed', err);
              }
              e.target.value = '';
            }}
          />
        </label>

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

        {/* Mic button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          title="Hold to speak"
          className="flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: isRecording
              ? 'rgba(218,119,86,0.3)'
              : isTranscribing
              ? 'rgba(74,222,128,0.2)'
              : 'transparent',
          }}
        >
          {isTranscribing ? (
            <span className="text-[11px] text-stella-green">...</span>
          ) : (
            <Mic size={14} className={isRecording ? 'text-primary' : 'text-stella-text-dim'} />
          )}
        </button>

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
      <p className="text-center text-[11px] mt-2 opacity-50" style={{ color: '#3a3935' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
