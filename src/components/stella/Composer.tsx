import { useState, useRef, useCallback, KeyboardEvent, DragEvent } from 'react';
import { Paperclip, ArrowUp, Mic, Loader2, FileText, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

interface ComposerProps {
  onSend: (text: string) => void;
  onTranscript?: (text: string) => void;
  onDocumentUploaded?: (id: string, filename: string, message: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function Composer({ onSend, onTranscript, onDocumentUploaded }: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // File upload chip state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadFile = useCallback(async (file: File) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('Unsupported format. Use .pdf, .docx, .txt, or .md');
      setUploadStatus('error');
      setUploadFileName(file.name);
      return;
    }
    setUploadStatus('uploading');
    setUploadFileName(file.name);
    setUploadError('');
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
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch(err: any) {
      console.error('Upload failed', err);
      setUploadError(err.message || 'Upload failed');
      setUploadStatus('error');
    }
  }, [authFetch, onDocumentUploaded]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  const dismissUpload = () => {
    setUploadStatus('idle');
    setUploadFileName('');
    setUploadError('');
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      className="px-6 pt-3 pb-4 flex-shrink-0 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-primary/[0.06] backdrop-blur-sm"
          >
            <span className="text-[13px] font-medium text-primary">Drop file here</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File upload chip — compact inline indicator */}
      <AnimatePresence>
        {uploadStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-2 overflow-hidden"
          >
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] ${
              uploadStatus === 'uploading' ? 'bg-stella-terra-dim border border-stella-terra-border' :
              uploadStatus === 'success' ? 'bg-stella-green-dim border border-stella-green/20' :
              'bg-destructive/10 border border-destructive/20'
            }`}>
              {uploadStatus === 'uploading' && <Loader2 size={13} className="text-primary animate-spin flex-shrink-0" />}
              {uploadStatus === 'success' && <CheckCircle2 size={13} className="text-stella-green flex-shrink-0" />}
              {uploadStatus === 'error' && <X size={13} className="text-destructive flex-shrink-0" />}

              <FileText size={12} className="flex-shrink-0 text-stella-text-dim" />
              <span className={`truncate font-medium ${
                uploadStatus === 'uploading' ? 'text-primary' :
                uploadStatus === 'success' ? 'text-stella-green' : 'text-destructive'
              }`}>{uploadFileName}</span>

              {uploadStatus === 'uploading' && (
                <span className="text-stella-text-dim ml-auto flex-shrink-0">Processing...</span>
              )}
              {uploadStatus === 'success' && (
                <span className="text-stella-green/60 ml-auto flex-shrink-0">Ready</span>
              )}
              {uploadStatus === 'error' && (
                <>
                  <span className="text-destructive/70 truncate">{uploadError}</span>
                  <button onClick={() => fileInputRef.current?.click()} className="ml-auto text-stella-text-dim hover:text-foreground transition-colors flex-shrink-0">
                    <RefreshCw size={12} />
                  </button>
                </>
              )}

              <button onClick={dismissUpload} className="flex-shrink-0 p-0.5 rounded hover:bg-white/[0.06] transition-colors">
                <X size={11} className="text-stella-text-dim" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2.5 rounded-[24px] px-4 py-3.5 bg-white/[0.03] border border-stella-border focus-within:border-stella-terra-border transition-colors duration-200">
        {/* Paperclip / Document upload */}
        <label className={`mb-0.5 flex-shrink-0 transition-all duration-150 cursor-pointer rounded-full p-1 ${uploadStatus === 'uploading' ? 'opacity-30 pointer-events-none' : 'opacity-50 hover:opacity-100 hover:text-primary'}`}>
          {uploadStatus === 'uploading' ? (
            <Loader2 size={16} className="text-primary animate-spin" />
          ) : (
            <Paperclip size={16} className="text-stella-text-muted hover:text-primary transition-colors duration-150" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            disabled={uploadStatus === 'uploading'}
            onChange={handleFileUpload}
          />
        </label>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Stella anything..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] text-foreground placeholder:text-stella-text-dim leading-[1.5]"
          style={{ maxHeight: '200px' }}
        />

        {/* Mic button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          title="Hold to speak"
          className={`flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-150 ${
            isRecording ? 'bg-primary/30' : isTranscribing ? 'bg-stella-green/20' : 'hover:bg-white/5'
          }`}
        >
          {isTranscribing ? (
            <Loader2 size={13} className="text-stella-green animate-spin" />
          ) : (
            <Mic size={14} className={`transition-colors duration-150 ${isRecording ? 'text-primary' : 'text-stella-text-dim hover:text-primary'}`} />
          )}
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!hasText}
          className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
            hasText ? 'bg-primary hover:scale-105 active:scale-95 scale-100' : 'bg-white/[0.06] scale-90 opacity-50'
          }`}
        >
          <ArrowUp size={14} className={hasText ? 'text-primary-foreground' : 'text-stella-text-faint'} />
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] mt-2 text-stella-text-faint">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
