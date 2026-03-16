import { useState, useRef, useEffect } from 'react';
import { Plus, Search, FolderOpen, MoreHorizontal, Trash2, FolderInput, ChevronRight, Settings } from 'lucide-react';
import { Conversation, Project } from './types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  projects: Project[];
  activeId: string;
  activeView: 'chat' | 'settings';
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onCreateProject: (name: string) => void;
  onMoveToProject: (convId: string, projectId: string | null) => void;
  onDeleteConversation: (id: string) => void;
  onViewChange: (view: 'chat' | 'settings') => void;
  onOpenProject?: (projectId: string) => void;
}

function isToday(d: Date): boolean {
  return d.toDateString() === new Date().toDateString();
}
function isYesterday(d: Date): boolean {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}
function isLast7Days(d: Date): boolean {
  const w = new Date(); w.setDate(w.getDate() - 7);
  return d > w && !isToday(d) && !isYesterday(d);
}

function groupConversations(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const buckets: Record<string, Conversation[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] };
  for (const c of convs) {
    const d = new Date(c.updated_at || c.timestamp);
    if (isToday(d)) buckets.Today.push(c);
    else if (isYesterday(d)) buckets.Yesterday.push(c);
    else if (isLast7Days(d)) buckets['Previous 7 days'].push(c);
    else buckets.Older.push(c);
  }
  return Object.entries(buckets).filter(([, v]) => v.length > 0).map(([label, items]) => ({ label, items }));
}

function ConvMenu({ convId, projects, onMove, onDelete, onClose }: {
  convId: string; projects: Project[];
  onMove: (convId: string, projectId: string | null) => void;
  onDelete: (id: string) => void; onClose: () => void;
}) {
  const [showProjects, setShowProjects] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '6px 10px', borderRadius: 6, fontSize: 12,
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-display)',
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 8, top: '100%', marginTop: 2,
      background: '#1f1e1b', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: 4, zIndex: 60, minWidth: 170,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <button onClick={() => setShowProjects(!showProjects)}
        style={{ ...itemStyle, color: 'var(--color-cl-text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <FolderInput size={13} /> Move to project <ChevronRight size={11} style={{ marginLeft: 'auto' }} />
      </button>
      {showProjects && (
        <div style={{ padding: '2px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 2 }}>
          {projects.map(p => (
            <button key={p.id} onClick={() => { onMove(convId, p.id); onClose(); }}
              style={{ ...itemStyle, fontSize: 11, color: 'var(--color-cl-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{p.name}</button>
          ))}
          <button onClick={() => { onMove(convId, null); onClose(); }}
            style={{ ...itemStyle, fontSize: 11, color: 'var(--color-cl-text-dim)', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >Remove from project</button>
        </div>
      )}
      <button onClick={() => { onDelete(convId); onClose(); }}
        style={{ ...itemStyle, color: '#f87171' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

export default function ConversationHistory({
  conversations, projects, activeId, activeView,
  onSelect, onNewChat, onCreateProject, onMoveToProject, onDeleteConversation, onViewChange, onOpenProject,
}: ConversationHistoryProps) {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const npRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (showNewProject) npRef.current?.focus(); }, [showNewProject]);

  const filtered = search
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const projectConvs = new Map<string, Conversation[]>();
  const unassigned: Conversation[] = [];
  for (const c of filtered) {
    if (c.project_id) {
      if (!projectConvs.has(c.project_id)) projectConvs.set(c.project_id, []);
      projectConvs.get(c.project_id)!.push(c);
    } else {
      unassigned.push(c);
    }
  }
  const groups = groupConversations(unassigned);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) { onCreateProject(newProjectName.trim()); setNewProjectName(''); setShowNewProject(false); }
  };

  const renderConvItem = (conv: Conversation) => {
    const isActive = conv.id === activeId;
    return (
      <div key={conv.id} style={{ position: 'relative' }} className="group/conv">
        <button onClick={() => onSelect(conv.id)} style={{
          display: 'block', width: '100%', textAlign: 'left',
          padding: '8px 32px 8px 10px', borderRadius: 8,
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
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id); }}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            opacity: 0, transition: 'opacity 0.15s', padding: 4, borderRadius: 4,
            color: 'var(--color-cl-text-dim)',
          }}
          className="group-hover/conv:!opacity-100"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen === conv.id && (
          <ConvMenu convId={conv.id} projects={projects} onMove={onMoveToProject} onDelete={onDeleteConversation} onClose={() => setMenuOpen(null)} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: 260, flexShrink: 0, height: '100vh',
      backgroundColor: '#141311', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-display)',
    }}>
      {/* Top */}
      <div style={{ padding: '14px 12px 8px' }}>
        <button onClick={onNewChat} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '9px 0', borderRadius: 10,
          background: 'var(--color-cl-terra)', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-display)', transition: 'filter 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <Plus size={15} strokeWidth={2.5} /> New chat
        </button>
        <div style={{ position: 'relative', marginTop: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-cl-text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--color-cl-text)', fontSize: 12, fontFamily: 'var(--font-display)', outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(218,119,86,0.3)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
          />
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {/* Projects */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-cl-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</span>
            <button onClick={() => setShowNewProject(true)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-cl-text-dim)', padding: 2, borderRadius: 4,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-cl-terra)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-cl-text-dim)')}
            ><Plus size={13} /></button>
          </div>
          {showNewProject && (
            <div style={{ padding: '2px 4px 6px' }}>
              <input ref={npRef} value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProject(false); }}
                placeholder="Project name..." style={{
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(218,119,86,0.3)',
                  color: 'var(--color-cl-text)', fontSize: 12, fontFamily: 'var(--font-display)', outline: 'none',
                }}
              />
            </div>
          )}
          {projects.map(p => {
            const isExp = expandedProjects.has(p.id);
            const pConvs = projectConvs.get(p.id) || [];
            return (
              <div key={p.id}>
                <button onClick={() => onOpenProject ? onOpenProject(p.id) : toggleProject(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '7px 8px', borderRadius: 8, background: 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                  color: 'var(--color-cl-text-muted)', fontSize: 13, fontFamily: 'var(--font-display)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ChevronRight size={12} style={{ transition: 'transform 0.15s', transform: isExp ? 'rotate(90deg)' : 'none' }} />
                  <FolderOpen size={14} style={{ color: 'var(--color-cl-terra)', opacity: 0.7 }} />
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-cl-text-dim)' }}>{pConvs.length}</span>
                </button>
                {isExp && pConvs.length > 0 && <div style={{ paddingLeft: 16 }}>{pConvs.map(renderConvItem)}</div>}
              </div>
            );
          })}
          {projects.length === 0 && !showNewProject && (
            <div style={{ padding: '4px 8px 8px', fontSize: 11, color: 'var(--color-cl-text-dim)', opacity: 0.6 }}>
              Click + to create a project
            </div>
          )}
        </div>

        {/* Date-grouped conversations */}
        {groups.map(g => (
          <div key={g.label} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--color-cl-text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 6px 4px',
            }}>{g.label}</div>
            {g.items.map(renderConvItem)}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: 'var(--color-cl-text-dim)' }}>
            {search ? 'No matches' : 'No conversations yet'}
          </div>
        )}
      </div>

      {/* Bottom: Settings */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => onViewChange('settings')} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 8,
          background: activeView === 'settings' ? 'rgba(218,119,86,0.12)' : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'background 0.15s',
          color: activeView === 'settings' ? 'var(--color-cl-terra)' : 'var(--color-cl-text-dim)',
          fontSize: 13, fontFamily: 'var(--font-display)',
        }}
          onMouseEnter={e => { if (activeView !== 'settings') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { if (activeView !== 'settings') e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={15} /> Settings
        </button>
      </div>
    </div>
  );
}
