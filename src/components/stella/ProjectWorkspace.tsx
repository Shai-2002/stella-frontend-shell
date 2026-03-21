import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, FileText, Upload, ChevronRight, Loader2, CheckCircle2, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Project, ProjectFile, Conversation, Message, PipelineStatus } from './types';
import { useAuthFetch, API_BASE } from '@/hooks/use-auth-fetch';
import ChatView from './ChatView';
import Composer from './Composer';
import DownloadButtons from './DownloadButtons';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatusCard({ label, color, status, mode }: {
  label: string;
  color: 'terra' | 'green' | 'indigo';
  status: PipelineStatus | null;
  mode: 'research' | 'build' | 'presentation';
}) {
  const isRunning = status?.status === 'running';
  const isComplete = status?.status === 'complete';
  const isFailed = status?.status === 'failed';
  const isQueued = status?.status === 'queued';
  const borderColor = isRunning
    ? (color === 'terra' ? 'border-l-primary' : color === 'indigo' ? 'border-l-stella-indigo' : 'border-l-stella-green')
    : isComplete
    ? 'border-l-stella-green'
    : 'border-l-transparent';

  return (
    <div className={`bg-white/[0.03] rounded-lg p-3 border-l-[3px] ${borderColor} transition-colors`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
          color === 'terra' ? 'bg-stella-terra-dim text-primary' : color === 'indigo' ? 'bg-stella-indigo/10 text-stella-indigo' : 'bg-stella-green-dim text-stella-green'
        }`}>
          {label}
        </span>
        {isRunning && <Loader2 size={10} className={`animate-spin ${color === 'indigo' ? 'text-stella-indigo' : 'text-primary'}`} />}
        {isQueued && <span className="w-2 h-2 rounded-full bg-stella-text-dim animate-pulse" />}
        {isComplete && <CheckCircle2 size={10} className="text-stella-green" />}
      </div>

      {!status || status.status === 'idle' ? (
        <p className="text-[11px] text-stella-text-faint">Currently idle</p>
      ) : isQueued ? (
        <p className="text-[11px] text-stella-text-dim animate-pulse">Queued — waiting for research to complete</p>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-stella-text-dim">Topic</span>
            <span className="text-foreground truncate ml-2 max-w-[140px]">{status.topic}</span>
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
            <DownloadButtons runId={status.runId} mode={mode} />
          )}
        </div>
      )}
    </div>
  );
}

function PipelineStatusBar({ status, label }: { status: PipelineStatus | null; label: string }) {
  if (!status || status.status === 'complete') return null;
  const pct = status.totalStages > 0 ? Math.round((status.stage / status.totalStages) * 100) : 0;
  return (
    <div className="px-3 py-2 bg-stella-terra-dim border-b border-stella-border">
      <div className="flex items-center gap-2 text-xs">
        <Loader2 size={12} className={status.status === 'running' ? 'animate-spin text-primary' : 'text-destructive'} />
        <span className="text-stella-text-muted font-medium">{label}</span>
        <span className="text-stella-text-dim">{status.stageName}</span>
        <span className="ml-auto text-stella-text-dim">{pct}%</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${status.status === 'failed' ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const API = '/api';
const POLL_INTERVAL = 3000; // 3 seconds
const TERMINAL_STATUSES = ['ready', 'failed'];

interface ProjectWorkspaceProps {
  project: Project;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isThinking: boolean;
  onBack: () => void;
  onSelectConversation: (id: string) => void;
  onNewChatInProject: () => void;
  onSend: (text: string) => void;
  onAction: (action: 'research' | 'build' | 'both' | 'go_ahead' | 'cancel') => void;
  onDocumentUploaded: (id: string, filename: string, msg: string) => void;
  onProjectUpdated: (project: Project) => void;
  onDeleteConversation?: (id: string) => void;
  researchStatus?: PipelineStatus | null;
  buildStatus?: PipelineStatus | null;
  presentationStatus?: PipelineStatus | null;
}

export default function ProjectWorkspace({
  project, conversations, activeConversationId, messages, isThinking,
  onBack, onSelectConversation, onNewChatInProject, onSend, onAction, onDocumentUploaded, onProjectUpdated,
  onDeleteConversation, researchStatus, buildStatus, presentationStatus,
}: ProjectWorkspaceProps) {
  const authFetch = useAuthFetch();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [instructionsValue, setInstructionsValue] = useState(project.instructions ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectConvs = conversations.filter(c => c.project_id === project.id);

  useEffect(() => {
    setNameValue(project.name);
    setInstructionsValue(project.instructions ?? '');
  }, [project.id]);

  // Fetch files on mount / project change, then poll any still-processing docs
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

  useEffect(() => {
    // Clear any existing poll timer when project changes
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }

    authFetch(`${API}/projects/${project.id}/files`)
      .then(r => r.json())
      .then(async (data) => {
        let fileList: ProjectFile[] = data.files ?? [];
        // Immediately refresh statuses for any stale data
        fileList = await refreshFileStatuses(fileList);
        setFiles(fileList);
        // Start polling if any files are still processing
        startPolling(fileList);
      })
      .catch(() => {});

    return () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };
  }, [project.id, authFetch, refreshFileStatuses]);

  const startPolling = useCallback((currentFiles: ProjectFile[]) => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    const hasPending = currentFiles.some(f => !TERMINAL_STATUSES.includes(f.status));
    if (!hasPending) return;

    pollTimerRef.current = setInterval(async () => {
      setFiles(prev => {
        // Trigger async refresh — we update via the callback in the then()
        refreshFileStatuses(prev).then(next => {
          if (next !== prev) setFiles(next);
          // Stop polling once all terminal
          if (!next.some(f => !TERMINAL_STATUSES.includes(f.status))) {
            if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
          }
        });
        return prev; // return unchanged for this sync call
      });
    }, POLL_INTERVAL);
  }, [refreshFileStatuses]);

  useEffect(() => { if (editingName) nameRef.current?.focus(); }, [editingName]);

  const saveProject = useCallback(async (updates: Partial<Project>) => {
    try {
      const res = await authFetch(`${API}/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      onProjectUpdated({ ...project, ...updated });
    } catch {}
  }, [project, onProjectUpdated, authFetch]);

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== project.name) saveProject({ name: nameValue.trim() });
  };

  const handleInstructionsBlur = () => {
    if (instructionsValue !== (project.instructions ?? '')) saveProject({ instructions: instructionsValue });
  };

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
        await authFetch(`${API}/documents/${data.documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: project.id, scope: 'project' }),
        });
        const newFile: ProjectFile = {
          id: data.documentId, original_name: file.name,
          file_type: file.name.split('.').pop() ?? '', status: 'processing',
          scope: 'project', uploaded_at: new Date().toISOString(),
        };
        setFiles(prev => {
          const next = [newFile, ...prev];
          startPolling(next);
          return next;
        });
      }
    } catch (err) { console.error('Project file upload failed', err); }
    finally { setIsUploading(false); }
    e.target.value = '';
  };

  const toggleFileScope = async (fileId: string, currentScope: string) => {
    const newScope = currentScope === 'project' ? 'chat' : 'project';
    try {
      await authFetch(`${API}/documents/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: newScope }),
      });
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, scope: newScope as 'chat' | 'project' } : f));
    } catch {}
  };

  const hasActiveConv = activeConversationId && projectConvs.some(c => c.id === activeConversationId);

  return (
    <div className="flex h-full w-full">
      {/* Left: project sidebar */}
      <div className="w-[260px] flex-shrink-0 h-full bg-stella-sidebar border-r border-stella-border flex flex-col">
        <div className="px-3 pt-3.5 pb-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-stella-text-muted text-xs py-1 mb-2 hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> All projects
          </button>
          <button onClick={onNewChatInProject}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stella-border-strong text-stella-text-muted text-[13px] font-medium hover:bg-white/[0.04] hover:text-foreground transition-all active:scale-[0.98]">
            <Plus size={15} strokeWidth={2.5} /> New chat in project
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider px-1.5 pt-2 pb-1">
            Conversations
          </div>
          {projectConvs.length === 0 && (
            <div className="px-2 py-2 text-xs text-stella-text-dim/60">No conversations yet</div>
          )}
          {projectConvs.map(conv => {
            const isActive = conv.id === activeConversationId;
            return (
              <div key={conv.id} className="relative group flex items-center mb-0.5">
                <button onClick={() => onSelectConversation(conv.id)}
                  className={`block w-full text-left px-2.5 py-2 rounded-lg transition-colors pr-8 ${
                    isActive ? 'bg-stella-terra-dim' : 'hover:bg-white/[0.04]'
                  }`}>
                  <div className={`text-[13px] truncate ${isActive ? 'text-foreground font-medium' : 'text-stella-text-muted'}`}>
                    {conv.title}
                  </div>
                </button>
                {onDeleteConversation && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-stella-text-dim hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: chat or project landing */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Pipeline status bars */}
        <PipelineStatusBar status={researchStatus ?? null} label="Research" />
        <PipelineStatusBar status={buildStatus ?? null} label="Build" />
        <PipelineStatusBar status={presentationStatus ?? null} label="Presentation" />

        {hasActiveConv ? (
          <>
            <ChatView messages={messages} onAction={onAction} isThinking={isThinking} />
            <Composer onSend={onSend} onDocumentUploaded={onDocumentUploaded} />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-8 py-12">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-[600px] mx-auto">
              <h1 className="text-2xl font-semibold text-foreground mb-2">{project.name}</h1>
              {project.description && <p className="text-sm text-stella-text-muted mb-6">{project.description}</p>}
              <div className="text-[13px] text-stella-text-dim mb-6">
                {projectConvs.length} conversation{projectConvs.length !== 1 ? 's' : ''} · {files.length} file{files.length !== 1 ? 's' : ''}
              </div>

              {projectConvs.length > 0 && (
                <div className="mb-6">
                  <div className="text-[13px] font-semibold text-stella-text-muted mb-2">Recent conversations</div>
                  {projectConvs.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => onSelectConversation(c.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg mb-1 bg-white/[0.03] border border-stella-border text-foreground text-[13px] hover:bg-white/[0.06] transition-colors">
                      <ChevronRight size={12} className="text-primary" />
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={onNewChatInProject}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stella-border-strong text-stella-text-muted text-[13px] font-medium hover:bg-white/[0.04] hover:text-foreground transition-all">
                <Plus size={15} /> Start a conversation
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Right panel: project settings */}
      <div className="w-[280px] flex-shrink-0 h-full bg-stella-sidebar border-l border-stella-border flex flex-col overflow-y-auto px-4 py-5">
        {/* Project name */}
        {editingName ? (
          <input ref={nameRef} value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleNameBlur(); if (e.key === 'Escape') { setNameValue(project.name); setEditingName(false); } }}
            className="text-base font-semibold text-foreground bg-white/[0.04] border border-stella-terra-border rounded-md px-2 py-1.5 w-full outline-none mb-4"
          />
        ) : (
          <div onClick={() => setEditingName(true)}
            className="text-base font-semibold text-foreground cursor-pointer mb-4 py-0.5 hover:text-primary transition-colors"
            title="Click to edit">{project.name}</div>
        )}

        {/* Instructions */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider mb-1.5">Instructions</div>
          <textarea
            value={instructionsValue}
            onChange={e => setInstructionsValue(e.target.value)}
            onBlur={handleInstructionsBlur}
            placeholder="Give Stella context about this project..."
            rows={4}
            className="w-full resize-y bg-white/[0.04] border border-stella-border rounded-lg px-2.5 py-2 text-xs text-foreground outline-none leading-relaxed placeholder:text-stella-text-dim focus:border-stella-terra-border transition-colors"
          />
        </div>

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider">Files</span>
            <button onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`p-0.5 rounded text-stella-text-dim hover:text-primary transition-colors ${isUploading ? 'opacity-40 cursor-wait' : ''}`}>
              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
          </div>

          {files.length === 0 && (
            <div className="text-xs text-stella-text-dim/60 py-1">Upload documents for Stella to reference</div>
          )}

          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-1 bg-white/[0.03] border border-white/[0.04]">
              <FileText size={14} className="text-primary/70 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground truncate">{file.original_name}</div>
                <div className="text-[10px] text-stella-text-dim flex items-center gap-1">
                  {file.file_type.toUpperCase()} ·{' '}
                  {file.status === 'processing' && <><Loader2 size={9} className="animate-spin text-primary" /> <span className="text-primary">Processing</span></>}
                  {file.status === 'ready' && <><CheckCircle2 size={9} className="text-stella-green" /> <span className="text-stella-green">Ready</span></>}
                  {file.status === 'failed' && <><AlertCircle size={9} className="text-destructive" /> <span className="text-destructive">Failed</span></>}
                  {!['processing', 'ready', 'failed'].includes(file.status) && <span>{file.status}</span>}
                </div>
              </div>
              <button onClick={() => toggleFileScope(file.id, file.scope)}
                className={`text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap transition-colors ${
                  file.scope === 'project'
                    ? 'bg-stella-terra-dim border-stella-terra-border text-primary'
                    : 'border-stella-border text-stella-text-dim'
                }`}>
                {file.scope === 'project' ? 'Project' : 'Chat only'}
              </button>
            </div>
          ))}
        </div>

        {/* Pipeline Status */}
        <div className="mt-5">
          <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider mb-2">Pipelines</div>
          <div className="space-y-2">
            <StatusCard label="Research" color="terra" status={researchStatus ?? null} mode="research" />
            <StatusCard label="Build" color="green" status={buildStatus ?? null} mode="build" />
            <StatusCard label="Presentation" color="indigo" status={presentationStatus ?? null} mode="presentation" />
          </div>
        </div>
      </div>
    </div>
  );
}
