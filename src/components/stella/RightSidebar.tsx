import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, Loader2, CheckCircle2, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProjectFile, PipelineStatus } from './types';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

const API = '/api';
const POLL_INTERVAL = 3000;
const TERMINAL_STATUSES = ['ready', 'failed'];

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
  projectName?: string | null;
  projectInstructions?: string | null;
  researchStatus: PipelineStatus | null;
  buildStatus: PipelineStatus | null;
  onFileUploaded?: (id: string, filename: string, msg: string) => void;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatusCard({ label, color, status }: {
  label: string;
  color: 'terra' | 'green';
  status: PipelineStatus | null;
}) {
  const isRunning = status?.status === 'running';
  const isComplete = status?.status === 'complete';
  const isFailed = status?.status === 'failed';
  const borderColor = isRunning
    ? (color === 'terra' ? 'border-l-primary' : 'border-l-stella-green')
    : 'border-l-transparent';

  return (
    <div className={`bg-stella-sidebar rounded-lg p-3 border-l-[3px] ${borderColor} transition-colors`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
          color === 'terra' ? 'bg-stella-terra-dim text-primary' : 'bg-stella-green-dim text-stella-green'
        }`}>
          {label}
        </span>
        {isRunning && <Loader2 size={10} className="animate-spin text-primary" />}
      </div>

      {!status || status.status === 'idle' ? (
        <p className="text-[11px] text-stella-text-faint">Currently idle</p>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-stella-text-dim">Topic</span>
            <span className="text-foreground truncate ml-2 max-w-[160px]">{status.topic}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-stella-text-dim">Stage</span>
            <span className="text-foreground">{status.stageName} ({status.stage}/{status.totalStages})</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-stella-text-dim">Status</span>
            <span className={
              isRunning ? 'text-primary' :
              isComplete ? 'text-stella-green' :
              isFailed ? 'text-destructive' :
              'text-stella-text-muted'
            }>
              {isRunning ? 'Running' : isComplete ? 'Complete' : isFailed ? 'Failed' : status.status}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-stella-text-dim">Time</span>
            <span className="text-foreground font-mono">{formatElapsed(status.elapsed)}</span>
          </div>
          {status.cost > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-stella-text-dim">Cost</span>
              <span className="text-foreground font-mono">${status.cost.toFixed(4)}</span>
            </div>
          )}
          {isComplete && status.runId && (
            <a
              href={`/api/report/${status.runId}`}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-primary hover:underline mt-1"
            >
              View files →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  const color = t === 'pdf' ? 'text-destructive/70' : t === 'docx' ? 'text-blue-400/70' : 'text-stella-text-dim';
  return <FileText size={14} className={`${color} flex-shrink-0 mt-0.5`} />;
}

export default function RightSidebar({
  isOpen, onClose, projectId, projectName, projectInstructions,
  researchStatus, buildStatus, onFileUploaded,
}: RightSidebarProps) {
  const authFetch = useAuthFetch();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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
        } catch { return null; }
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

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      return;
    }
    setIsLoading(true);
    const url = projectId ? `${API}/projects/${projectId}/files` : `${API}/documents`;
    authFetch(url)
      .then(r => r.json())
      .then(async (data) => {
        let fileList: ProjectFile[] = data.files ?? data.documents ?? [];
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
    return () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };
  }, [isOpen, projectId, authFetch, refreshFileStatuses, startPolling]);

  const uploadFile = async (file: File) => {
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
          id: data.documentId, original_name: file.name,
          file_type: file.name.split('.').pop() ?? '', status: 'processing',
          scope: projectId ? 'project' : 'chat', uploaded_at: new Date().toISOString(),
        };
        setFiles(prev => { const next = [newFile, ...prev]; startPolling(next); return next; });
        if (onFileUploaded) onFileUploaded(data.documentId, data.filename || file.name, data.message || '');
      }
    } catch (err) { console.error('File upload failed', err); }
    finally { setIsUploading(false); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => uploadFile(file));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(file => uploadFile(file));
    }
  };

  const handleRetry = async (docId: string) => {
    try {
      await authFetch(`${API}/documents/${docId}/retry`, { method: 'POST' });
      setFiles(prev => prev.map(f => f.id === docId ? { ...f, status: 'processing' } : f));
      startPolling(files.map(f => f.id === docId ? { ...f, status: 'processing' } : f));
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-shrink-0 h-full bg-stella-surface border-l border-stella-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stella-border flex-shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          {projectName ? projectName : 'Files & Status'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`p-1 rounded text-stella-text-dim hover:text-primary transition-colors ${isUploading ? 'opacity-40 cursor-wait' : ''}`}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin text-primary" /> : <Upload size={14} />}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" multiple onChange={handleFileInput} disabled={isUploading} className="hidden" />
          <button onClick={onClose} className="p-1 rounded text-stella-text-dim hover:text-foreground hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Project info (if in project) */}
        {projectName && projectInstructions && (
          <div className="mb-1">
            <p className="text-[11px] text-stella-text-dim leading-relaxed">{projectInstructions}</p>
          </div>
        )}

        {/* Drag-and-drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
            isDragOver ? 'border-primary bg-stella-terra-dim' : 'border-stella-border'
          }`}
        >
          <Upload size={16} className={`mx-auto mb-1.5 ${isDragOver ? 'text-primary' : 'text-stella-text-faint'}`} />
          <p className={`text-[11px] ${isDragOver ? 'text-primary' : 'text-stella-text-dim'}`}>
            {isDragOver ? 'Drop file here' : 'Drag file here or click upload'}
          </p>
        </div>

        {/* Files */}
        <div>
          <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider mb-2">Files</div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={14} className="animate-spin text-stella-text-dim" />
            </div>
          )}

          {!isLoading && files.length === 0 && (
            <p className="text-[11px] text-stella-text-faint py-2">No files yet</p>
          )}

          {files.map(file => (
            <div key={file.id} className="flex items-start gap-2 px-2 py-2 rounded-lg mb-0.5 hover:bg-white/[0.03] transition-colors">
              <FileIcon type={file.file_type} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-foreground truncate">{file.original_name}</div>
                <div className="text-[11px] text-stella-text-dim flex items-center gap-1.5 mt-0.5">
                  <span className="uppercase text-[10px]">{file.file_type}</span>
                  <span className="text-stella-text-faint">·</span>
                  {file.status === 'processing' && <><Loader2 size={9} className="animate-spin text-primary" /><span className="text-primary">Processing</span></>}
                  {file.status === 'ready' && <><CheckCircle2 size={9} className="text-stella-green" /><span className="text-stella-green">Ready</span></>}
                  {file.status === 'failed' && (
                    <>
                      <AlertCircle size={9} className="text-destructive" />
                      <span className="text-destructive">Failed</span>
                      <button onClick={() => handleRetry(file.id)} className="ml-1 text-stella-text-dim hover:text-primary transition-colors" title="Retry">
                        <RefreshCw size={9} />
                      </button>
                    </>
                  )}
                  {!['processing', 'ready', 'failed'].includes(file.status) && <span>{file.status}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline Status */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider">Pipeline Status</div>
          <StatusCard label="Research" color="terra" status={researchStatus} />
          <StatusCard label="Build" color="green" status={buildStatus} />
        </div>
      </div>
    </motion.div>
  );
}
