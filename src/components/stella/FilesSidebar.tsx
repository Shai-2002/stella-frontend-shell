import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProjectFile } from './types';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

const API = '/api';
const POLL_INTERVAL = 3000;
const TERMINAL_STATUSES = ['ready', 'failed'];

interface FilesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
}

export default function FilesSidebar({ isOpen, onClose, projectId }: FilesSidebarProps) {
  const authFetch = useAuthFetch();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef(authFetch);
  fetchRef.current = authFetch;

  const refreshFileStatuses = useCallback(async (currentFiles: ProjectFile[]) => {
    const pending = currentFiles.filter(f => !TERMINAL_STATUSES.includes(f.status));
    if (pending.length === 0) return currentFiles;

    const updated = await Promise.all(
      pending.map(async (f) => {
        try {
          const res = await fetchRef.current(`${API}/documents/${f.id}`);
          const doc = await res.json();
          return { id: f.id, status: doc.status as string };
        } catch {
          return null;
        }
      })
    );

    let changed = false;
    const next = currentFiles.map(f => {
      const u = updated.find(x => x && x.id === f.id);
      if (u && u.status !== f.status) { changed = true; return { ...f, status: u.status }; }
      return f;
    });
    return changed ? next : currentFiles;
  }, []);

  const startPolling = useCallback((currentFiles: ProjectFile[]) => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    const hasPending = currentFiles.some(f => !TERMINAL_STATUSES.includes(f.status));
    if (!hasPending) return;

    pollTimerRef.current = setInterval(async () => {
      setFiles(prev => {
        refreshFileStatuses(prev).then(next => {
          if (next !== prev) setFiles(next);
          if (!next.some(f => !TERMINAL_STATUSES.includes(f.status))) {
            if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
          }
        });
        return prev;
      });
    }, POLL_INTERVAL);
  }, [refreshFileStatuses]);

  // Fetch files when panel opens
  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      return;
    }

    setIsLoading(true);
    const url = projectId
      ? `${API}/projects/${projectId}/files`
      : `${API}/documents`;

    authFetch(url)
      .then(r => r.json())
      .then(async (data) => {
        let fileList: ProjectFile[] = data.files ?? data.documents ?? [];
        // Normalize: /api/documents returns different field names
        fileList = fileList.map(f => ({
          ...f,
          original_name: f.original_name || (f as any).filename || 'Unknown',
          scope: f.scope || 'chat',
        }));
        fileList = await refreshFileStatuses(fileList);
        setFiles(fileList);
        startPolling(fileList);
      })
      .catch(() => setFiles([]))
      .finally(() => setIsLoading(false));

    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [isOpen, projectId, authFetch, refreshFileStatuses, startPolling]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch(`${API}/documents/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.documentId) {
        if (projectId) {
          await authFetch(`${API}/documents/${data.documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, scope: 'project' }),
          });
        }
        const newFile: ProjectFile = {
          id: data.documentId,
          original_name: file.name,
          file_type: file.name.split('.').pop() ?? '',
          status: 'processing',
          scope: projectId ? 'project' : 'chat',
          uploaded_at: new Date().toISOString(),
        };
        setFiles(prev => {
          const next = [newFile, ...prev];
          startPolling(next);
          return next;
        });
      }
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-shrink-0 h-full bg-stella-sidebar border-l border-stella-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stella-border flex-shrink-0">
        <span className="text-[13px] font-medium text-foreground">Files</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`p-1 rounded text-stella-text-dim hover:text-primary transition-colors ${isUploading ? 'opacity-40 cursor-wait' : ''}`}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin text-primary" /> : <Upload size={14} />}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
          <button
            onClick={onClose}
            className="p-1 rounded text-stella-text-dim hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-stella-text-dim" />
          </div>
        )}

        {!isLoading && files.length === 0 && (
          <div className="text-center py-8">
            <FileText size={24} className="mx-auto mb-2 text-stella-text-faint" />
            <p className="text-xs text-stella-text-dim">No files yet</p>
            <p className="text-[11px] text-stella-text-faint mt-1">Upload documents for Stella to reference</p>
          </div>
        )}

        {files.map(file => (
          <div
            key={file.id}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg mb-1 hover:bg-white/[0.03] transition-colors group/file"
          >
            <FileText size={14} className="text-primary/60 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-foreground truncate">{file.original_name}</div>
              <div className="text-[11px] text-stella-text-dim flex items-center gap-1.5 mt-0.5">
                <span className="uppercase">{file.file_type}</span>
                <span className="text-stella-text-faint">·</span>
                {file.status === 'processing' && (
                  <>
                    <Loader2 size={9} className="animate-spin text-primary" />
                    <span className="text-primary">Processing</span>
                  </>
                )}
                {file.status === 'ready' && (
                  <>
                    <CheckCircle2 size={9} className="text-stella-green" />
                    <span className="text-stella-green">Ready</span>
                  </>
                )}
                {file.status === 'failed' && (
                  <>
                    <AlertCircle size={9} className="text-destructive" />
                    <span className="text-destructive">Failed</span>
                  </>
                )}
                {!['processing', 'ready', 'failed'].includes(file.status) && (
                  <span>{file.status}</span>
                )}
              </div>
              {file.summary && (
                <p className="text-[11px] text-stella-text-dim mt-1 leading-relaxed line-clamp-2">{file.summary}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
