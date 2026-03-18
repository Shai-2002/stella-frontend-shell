import { useState, useRef, useEffect } from 'react';
import { Plus, Search, FolderOpen, MessageSquare, FileText, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Task } from './types';

interface ProjectDashboardProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => void;
}

function TaskPreview({ task }: { task: Task }) {
  const isDone = task.status === 'done';
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`text-[12px] ${isDone ? 'text-stella-text-faint' : 'text-stella-text-dim'}`}>
        {isDone ? '☑' : '☐'}
      </span>
      <span className={`text-[12px] truncate ${isDone ? 'text-stella-text-faint line-through' : 'text-foreground'}`}>
        {task.title}
      </span>
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const tasks = project.tasks || [];
  const taskCount = project.task_count || 0;
  const extraTasks = taskCount - tasks.length;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      className="w-full text-left p-5 rounded-xl bg-stella-surface border border-stella-border hover:border-stella-border-strong transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <FolderOpen size={18} className="text-primary/70 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-foreground truncate">{project.name}</h3>
          {project.description && (
            <p className="text-[12px] text-stella-text-dim mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[12px] text-stella-text-muted mb-3">
        <span className="flex items-center gap-1"><MessageSquare size={11} /> {project.conversation_count || 0} chats</span>
        <span className="flex items-center gap-1"><FileText size={11} /> {project.file_count || 0} files</span>
        {taskCount > 0 && (
          <span className="flex items-center gap-1"><CheckSquare size={11} /> {taskCount} tasks</span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="border-t border-stella-border pt-2.5 mt-1">
          {tasks.slice(0, 3).map(t => <TaskPreview key={t.id} task={t} />)}
          {extraTasks > 0 && (
            <p className="text-[11px] text-stella-text-faint mt-1">+ {extraTasks} more tasks</p>
          )}
        </div>
      )}
    </motion.button>
  );
}

export default function ProjectDashboard({ projects, onSelectProject, onCreateProject }: ProjectDashboardProps) {
  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showNewProject) inputRef.current?.focus(); }, [showNewProject]);

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProject(false);
    }
  };

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stella-border-strong text-stella-text-muted text-[13px] font-medium hover:bg-white/[0.04] hover:text-foreground transition-all"
          >
            <Plus size={14} /> New project
          </button>
        </div>

        {/* New project input */}
        <AnimatePresence>
          {showNewProject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewProject(false); }}
                  placeholder="Project name..."
                  className="flex-1 py-2.5 px-3 rounded-lg bg-white/[0.04] border border-stella-terra-border text-foreground text-[13px] outline-none"
                />
                <button onClick={handleCreate} className="px-4 py-2.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:brightness-110 transition-all">
                  Create
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        {projects.length > 3 && (
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stella-text-dim" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full py-2.5 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-stella-border text-foreground text-[13px] outline-none focus:border-stella-terra-border transition-colors placeholder:text-stella-text-dim"
            />
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={32} className="mx-auto mb-3 text-stella-text-faint" />
            <p className="text-[14px] text-stella-text-dim">
              {search ? 'No projects match your search' : 'No projects yet'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewProject(true)}
                className="mt-3 text-[13px] text-primary hover:underline"
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
