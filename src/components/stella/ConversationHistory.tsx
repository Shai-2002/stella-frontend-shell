import { useState, useRef, useEffect } from 'react';
import { Plus, Search, FolderOpen, MoreHorizontal, Trash2, FolderInput, ChevronRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation, Project, Task } from './types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  projects: Project[];
  activeId: string;
  activeView: 'chat' | 'settings' | 'projects';
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onCreateProject: (name: string) => void;
  onMoveToProject: (convId: string, projectId: string | null) => void;
  onDeleteConversation: (id: string) => void;
  onViewChange: (view: 'chat' | 'settings' | 'projects') => void;
  onOpenProject?: (projectId: string) => void;
  onToggleTask?: (taskId: string, newStatus: 'pending' | 'done') => void;
  isOwner?: boolean;
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

  return (
    <div ref={ref} className="absolute right-2 top-full mt-0.5 bg-stella-surface border border-stella-border-strong rounded-lg p-1 z-[60] min-w-[170px] shadow-xl">
      <button onClick={() => setShowProjects(!showProjects)}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-stella-text-muted hover:bg-white/5 transition-colors"
      >
        <FolderInput size={13} /> Move to project <ChevronRight size={11} className="ml-auto" />
      </button>
      <AnimatePresence>
        {showProjects && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-stella-border mt-0.5 pt-0.5"
          >
            {projects.map(p => (
              <button key={p.id} onClick={() => { onMove(convId, p.id); onClose(); }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] text-stella-text-muted hover:bg-white/5 transition-colors"
              >{p.name}</button>
            ))}
            <button onClick={() => { onMove(convId, null); onClose(); }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] text-stella-text-dim italic hover:bg-white/5 transition-colors"
            >Remove from project</button>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => { onDelete(convId); onClose(); }}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

export default function ConversationHistory({
  conversations, projects, activeId, activeView,
  onSelect, onNewChat, onCreateProject, onMoveToProject, onDeleteConversation, onViewChange, onOpenProject, onToggleTask, isOwner,
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
      <div key={conv.id} className="relative group/conv">
        <button
          onClick={() => onSelect(conv.id)}
          className={`block w-full text-left px-2.5 py-2 rounded-lg transition-colors duration-150 ${
            isActive ? 'bg-stella-terra-dim' : 'hover:bg-white/[0.04]'
          }`}
        >
          <div className={`text-[13px] truncate ${
            isActive ? 'text-foreground font-medium' : 'text-stella-text-muted'
          }`}>{conv.title}</div>
        </button>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-stella-text-dim opacity-0 group-hover/conv:opacity-100 hover:bg-white/5 transition-all"
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
    <div className="w-[260px] flex-shrink-0 h-screen bg-stella-sidebar border-r border-stella-border flex flex-col">
      {/* Top */}
      <div className="px-3 pt-3.5 pb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stella-border-strong text-stella-text-muted text-[13px] font-medium hover:bg-white/[0.04] hover:text-foreground transition-all active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.5} /> New chat
        </button>
        <div className="relative mt-2.5">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stella-text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full py-[7px] pl-8 pr-2.5 rounded-lg bg-white/[0.04] border border-stella-border text-foreground text-xs outline-none focus:border-stella-terra-border transition-colors placeholder:text-stella-text-dim"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Projects */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-1.5 pt-2 pb-1">
            <button
              onClick={() => onViewChange('projects')}
              className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${activeView === 'projects' ? 'text-primary' : 'text-stella-text-dim hover:text-stella-text-muted'}`}
            >Projects</button>
            <button
              onClick={() => setShowNewProject(true)}
              className="p-0.5 rounded text-stella-text-dim hover:text-primary transition-colors"
            ><Plus size={13} /></button>
          </div>
          <AnimatePresence>
            {showNewProject && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-1 pb-1.5">
                <input ref={npRef} value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProject(false); }}
                  placeholder="Project name..."
                  className="w-full py-1.5 px-2 rounded-md bg-white/[0.04] border border-stella-terra-border text-foreground text-xs outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
          {projects.map(p => {
            const isExp = expandedProjects.has(p.id);
            const pConvs = projectConvs.get(p.id) || [];
            return (
              <div key={p.id}>
                <button
                  onClick={() => onOpenProject ? onOpenProject(p.id) : toggleProject(p.id)}
                  className="flex items-center gap-1.5 w-full py-[7px] px-2 rounded-lg text-stella-text-muted text-[13px] hover:bg-white/[0.04] transition-colors"
                >
                  <ChevronRight size={12} className={`transition-transform duration-150 ${isExp ? 'rotate-90' : ''}`} />
                  <FolderOpen size={14} className="text-primary/70" />
                  <span className="flex-1 text-left truncate">{p.name}</span>
                  <span className="text-[10px] text-stella-text-dim">{pConvs.length}</span>
                </button>
                {isExp && (
                  <div className="pl-4">
                    {pConvs.map(renderConvItem)}
                    {/* Tasks */}
                    {p.tasks && p.tasks.length > 0 && (
                      <div className="mt-1 mb-1">
                        <div className="text-[10px] font-semibold text-stella-text-faint uppercase tracking-wider px-2.5 py-0.5">Tasks</div>
                        {p.tasks.map((t: Task) => {
                          const isDone = t.status === 'done';
                          return (
                            <button
                              key={t.id}
                              onClick={() => onToggleTask?.(t.id, isDone ? 'pending' : 'done')}
                              className="flex items-center gap-2 w-full px-2.5 py-1 text-left hover:bg-white/[0.04] rounded transition-colors"
                            >
                              <span className={`text-[11px] ${isDone ? 'text-stella-green/60' : 'text-stella-text-dim'}`}>
                                {isDone ? '☑' : '☐'}
                              </span>
                              <span className={`text-[12px] truncate ${isDone ? 'text-stella-text-faint line-through' : 'text-stella-text-muted'}`}>
                                {t.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && !showNewProject && (
            <div className="px-2 py-1 text-[11px] text-stella-text-dim/60">Click + to create a project</div>
          )}
        </div>

        {/* Date-grouped conversations */}
        {groups.map(g => (
          <div key={g.label} className="mb-1">
            <div className="text-[11px] font-semibold text-stella-text-dim uppercase tracking-wider px-1.5 pt-2 pb-1">
              {g.label}
            </div>
            {g.items.map(renderConvItem)}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-5 px-2.5 text-center text-xs text-stella-text-dim">
            {search ? 'No matches' : 'Start a new chat with Stella'}
          </div>
        )}
      </div>

      {/* Bottom: Settings */}
      <div className="px-3 py-2.5 border-t border-stella-border">
        <button
          onClick={() => onViewChange('settings')}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
            activeView === 'settings'
              ? 'bg-stella-terra-dim text-primary'
              : 'text-stella-text-dim hover:bg-white/[0.04]'
          }`}
        >
          <Settings size={15} /> Settings
        </button>
      </div>
    </div>
  );
}
