import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Paperclip, ArrowUp, Mic, Loader2, FileText, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const authFetch = useAuthFetch();

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
      // Microphone access denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadError('');
    setUploadSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await authFetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!r.ok) {
        const errText = await r.text().catch(() => 'Upload failed');
        throw new Error(errText);
      }
      const d = await r.json();
      if (d.success && onDocumentUploaded) {
        onDocumentUploaded(d.documentId, d.filename, d.message);
        setUploadSuccess(d.filename || file.name);
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch(err: any) {
      console.error('Upload failed', err);
      setUploadError(err.message || 'Upload failed');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setIsUploading(false);
      setUploadFileName('');
    }
    e.target.value = '';
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="px-6 pt-3 pb-4 flex-shrink-0">
      {/* Upload status banners */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stella-terra-dim border border-stella-terra-border">
              <Loader2 size={15} className="text-primary animate-spin flex-shrink-0" />
              <FileText size={14} className="text-primary/60 flex-shrink-0" />
              <span className="text-sm text-primary font-medium truncate">{uploadFileName}</span>
              <span className="text-xs text-stella-text-muted ml-auto flex-shrink-0">Uploading & processing...</span>
            </div>
          </motion.div>
        )}
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stella-green-dim border border-stella-green/20">
              <CheckCircle2 size={15} className="text-stella-green flex-shrink-0" />
              <span className="text-sm text-stella-green font-medium truncate">{uploadSuccess}</span>
              <span className="text-xs text-stella-green/60 ml-auto flex-shrink-0">Ready</span>
            </div>
          </motion.div>
        )}
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <X size={15} className="text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive truncate">{uploadError}</span>
              <button onClick={() => setUploadError('')} className="ml-auto text-stella-text-dim hover:text-foreground text-xs transition-colors">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2.5 rounded-[20px] px-4 py-3.5 bg-white/[0.03] border border-stella-border focus-within:border-stella-terra-border transition-colors duration-200">
        {/* Paperclip / Document upload */}
        <label className={`mb-0.5 flex-shrink-0 transition-all cursor-pointer rounded-full p-1 ${isUploading ? 'opacity-30 pointer-events-none' : 'opacity-50 hover:opacity-90 hover:bg-white/5'}`}>
          {isUploading ? (
            <Loader2 size={16} className="text-primary animate-spin" />
          ) : (
            <Paperclip size={16} className="text-stella-text-muted" />
          )}
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            disabled={isUploading}
            onChange={handleFileUpload}
          />
        </label>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
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
          className={`flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
            isRecording ? 'bg-primary/30' : isTranscribing ? 'bg-stella-green/20' : 'hover:bg-white/5'
          }`}
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
          className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            hasText ? 'bg-primary hover:brightness-110 scale-100' : 'bg-white/[0.06] scale-95'
          }`}
        >
          <ArrowUp size={14} className={hasText ? 'text-primary-foreground' : 'text-stella-text-faint'} />
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] mt-2.5 text-stella-text-faint">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
