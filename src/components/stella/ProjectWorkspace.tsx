import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, FileText, Upload, ChevronRight } from 'lucide-react';
import { Project, ProjectFile, Conversation, Message } from './types';
import ChatView from './ChatView';
import Composer from './Composer';

const API = '/api';

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
  onAction: (action: 'research' | 'build' | 'both') => void;
  onDocumentUploaded: (id: string, filename: string, msg: string) => void;
  onProjectUpdated: (project: Project) => void;
}

export default function ProjectWorkspace({
  project,
  conversations,
  activeConversationId,
  messages,
  isThinking,
  onBack,
  onSelectConversation,
  onNewChatInProject,
  onSend,
  onAction,
  onDocumentUploaded,
  onProjectUpdated,
}: ProjectWorkspaceProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [instructionsValue, setInstructionsValue] = useState(project.instructions ?? '');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectConvs = conversations.filter(c => c.project_id === project.id);

  useEffect(() => {
    setNameValue(project.name);
    setInstructionsValue(project.instructions ?? '');
  }, [project.id]);

  useEffect(() => {
    fetch(`${API}/projects/${project.id}/files`)
      .then(r => r.json())
      .then(data => setFiles(data.files ?? []))
      .catch(() => {});
  }, [project.id]);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  const saveProject = useCallback(async (updates: Partial<Project>) => {
    try {
      const res = await fetch(`${API}/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      onProjectUpdated({ ...project, ...updated });
    } catch {}
  }, [project, onProjectUpdated]);

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== project.name) {
      saveProject({ name: nameValue.trim() });
    }
  };

  const handleInstructionsBlur = () => {
    if (instructionsValue !== (project.instructions ?? '')) {
      saveProject({ instructions: instructionsValue });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.documentId) {
        // Assign to project
        await fetch(`${API}/documents/${data.documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: project.id, scope: 'project' }),
        });
        setFiles(prev => [{
          id: data.documentId,
          original_name: file.name,
          file_type: file.name.split('.').pop() ?? '',
          status: 'processing',
          scope: 'project',
          uploaded_at: new Date().toISOString(),
        }, ...prev]);
      }
    } catch {}
    e.target.value = '';
  };

  const toggleFileScope = async (fileId: string, currentScope: string) => {
    const newScope = currentScope === 'project' ? 'chat' : 'project';
    try {
      await fetch(`${API}/documents/${fileId}`, {
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
      <div style={{
        width: 260, flexShrink: 0, height: '100%',
        backgroundColor: '#141311', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-display)',
      }}>
        <div style={{ padding: '14px 12px 8px' }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-cl-text-muted)', fontSize: 12, fontFamily: 'var(--font-display)',
            padding: '4px 0', marginBottom: 8,
          }}>
            <ArrowLeft size={14} /> All projects
          </button>

          <button onClick={onNewChatInProject} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '9px 0', borderRadius: 10,
            background: 'var(--color-cl-terra)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-display)', transition: 'filter 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <Plus size={15} strokeWidth={2.5} /> New chat in project
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--color-cl-text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 6px 4px',
          }}>Conversations</div>

          {projectConvs.length === 0 && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: 'var(--color-cl-text-dim)', opacity: 0.6 }}>
              No conversations yet
            </div>
          )}
          {projectConvs.map(conv => {
            const isActive = conv.id === activeConversationId;
            return (
              <button key={conv.id} onClick={() => onSelectConversation(conv.id)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 8,
                background: isActive ? 'rgba(218,119,86,0.12)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--color-cl-text)' : 'var(--color-cl-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{conv.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: chat or project landing */}
      <div className="flex flex-col flex-1 min-w-0">
        {hasActiveConv ? (
          <>
            <ChatView messages={messages} onAction={onAction} isThinking={isThinking} />
            <Composer
              onSend={onSend}
              onDocumentUploaded={onDocumentUploaded}
            />
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h1 style={{
                fontSize: 24, fontWeight: 600, color: 'var(--color-cl-text)',
                fontFamily: 'var(--font-display)', marginBottom: 8,
              }}>{project.name}</h1>
              {project.description && (
                <p style={{ fontSize: 14, color: 'var(--color-cl-text-muted)', marginBottom: 24 }}>{project.description}</p>
              )}
              <div style={{ fontSize: 13, color: 'var(--color-cl-text-dim)', marginBottom: 24 }}>
                {projectConvs.length} conversation{projectConvs.length !== 1 ? 's' : ''} &middot; {files.length} file{files.length !== 1 ? 's' : ''}
              </div>

              {projectConvs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-cl-text-muted)', marginBottom: 8 }}>Recent conversations</div>
                  {projectConvs.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => onSelectConversation(c.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', color: 'var(--color-cl-text)', fontSize: 13,
                      fontFamily: 'var(--font-display)',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                      <ChevronRight size={12} style={{ color: 'var(--color-cl-terra)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={onNewChatInProject} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10,
                background: 'var(--color-cl-terra)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}>
                <Plus size={15} /> Start a conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: project settings */}
      <div style={{
        width: 280, flexShrink: 0, height: '100%',
        backgroundColor: '#141311', borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-display)', overflowY: 'auto',
        padding: '20px 16px',
      }}>
        {/* Project name */}
        {editingName ? (
          <input ref={nameRef} value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleNameBlur(); if (e.key === 'Escape') { setNameValue(project.name); setEditingName(false); } }}
            style={{
              fontSize: 16, fontWeight: 600, color: 'var(--color-cl-text)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(218,119,86,0.3)',
              borderRadius: 6, padding: '6px 8px', width: '100%',
              fontFamily: 'var(--font-display)', outline: 'none', marginBottom: 16,
            }}
          />
        ) : (
          <div onClick={() => setEditingName(true)} style={{
            fontSize: 16, fontWeight: 600, color: 'var(--color-cl-text)',
            cursor: 'pointer', marginBottom: 16, padding: '2px 0',
          }} title="Click to edit">{project.name}</div>
        )}

        {/* Instructions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--color-cl-text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
          }}>Instructions</div>
          <textarea
            value={instructionsValue}
            onChange={e => setInstructionsValue(e.target.value)}
            onBlur={handleInstructionsBlur}
            placeholder="Give Stella context about this project..."
            rows={4}
            style={{
              width: '100%', resize: 'vertical',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '8px 10px',
              color: 'var(--color-cl-text)', fontSize: 12, fontFamily: 'var(--font-display)',
              outline: 'none', lineHeight: 1.5,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(218,119,86,0.3)')}
          />
        </div>

        {/* Files */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--color-cl-text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Files</span>
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-cl-text-dim)', padding: 2, borderRadius: 4,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-cl-terra)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-cl-text-dim)')}
            >
              <Upload size={13} />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>

          {files.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-cl-text-dim)', opacity: 0.6, padding: '4px 0' }}>
              No files uploaded yet
            </div>
          )}

          {files.map(file => (
            <div key={file.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8, marginBottom: 4,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <FileText size={14} style={{ color: 'var(--color-cl-terra)', opacity: 0.7, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, color: 'var(--color-cl-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{file.original_name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-cl-text-dim)' }}>
                  {file.file_type.toUpperCase()} &middot; {file.status}
                </div>
              </div>
              <button
                onClick={() => toggleFileScope(file.id, file.scope)}
                style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: file.scope === 'project' ? 'rgba(218,119,86,0.15)' : 'transparent',
                  color: file.scope === 'project' ? 'var(--color-cl-terra)' : 'var(--color-cl-text-dim)',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                }}
              >
                {file.scope === 'project' ? 'Project' : 'Chat only'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
