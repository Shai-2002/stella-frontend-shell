import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ConversationHistory from '@/components/stella/ConversationHistory';
import Topbar from '@/components/stella/Topbar';
import ChatView from '@/components/stella/ChatView';
import Composer from '@/components/stella/Composer';
import SettingsView from '@/components/stella/SettingsView';
import ProjectWorkspace from '@/components/stella/ProjectWorkspace';
import { Message, Conversation, Project } from '@/components/stella/types';
import { useIsMobile } from '@/hooks/use-mobile';

const API = '/api';

const CLEAR_MESSAGES = [
  "Cleared. What are we doing?",
  "Clean slate.",
  "Fresh start — go.",
  "Cleared. Pick up where we left off or start something new?",
  "Wiped. What's next?",
  "Gone. Start fresh.",
];

function randomClearMessage(): string {
  return CLEAR_MESSAGES[Math.floor(Math.random() * CLEAR_MESSAGES.length)];
}

function nowTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function saveMessageToDb(convId: string, role: string, content: string, metadata?: Record<string, unknown>) {
  try {
    await fetch(`${API}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, metadata: metadata ?? null }),
    });
  } catch {}
}

async function patchConversation(convId: string, data: Record<string, unknown>) {
  try {
    await fetch(`${API}/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

const Index = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const isFirstUserMsg = useRef(true);
  const activeConvRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load conversations + projects on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API}/conversations`).then(r => r.json()).catch(() => ({ conversations: [] })),
      fetch(`${API}/projects`).then(r => r.json()).catch(() => ({ projects: [] })),
    ]).then(([convData, projData]) => {
      if (projData.projects) setProjects(projData.projects);
      if (convData.conversations?.length > 0) {
        const convs: Conversation[] = convData.conversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          timestamp: new Date(c.updated_at).toLocaleDateString(),
          project_id: c.project_id,
          updated_at: c.updated_at,
        }));
        setConversationList(convs);
        setActiveConversationId(convs[0].id);
        loadConversation(convs[0].id);
      } else {
        setMessages([]);
      }
    });
  }, []);

  async function loadConversation(convId: string) {
    try {
      const res = await fetch(`${API}/conversations/${convId}/messages`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role as 'stella' | 'user',
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            ...(m.metadata ?? {}),
          }))
        );
        isFirstUserMsg.current = !data.messages.some((m: any) => m.role === 'user');
      } else {
        setMessages([]);
        isFirstUserMsg.current = true;
      }
    } catch {
      setMessages([]);
      isFirstUserMsg.current = true;
    }
  }

  async function ensureConversation(projectId?: string): Promise<string> {
    if (activeConvRef.current) return activeConvRef.current;
    try {
      const res = await fetch(`${API}/conversations`, { method: 'POST' });
      const conv = await res.json();
      const newConv: Conversation = {
        id: conv.id,
        title: conv.title,
        timestamp: 'just now',
        updated_at: new Date().toISOString(),
        project_id: projectId ?? undefined,
      };
      // If creating inside a project, assign project_id
      if (projectId) {
        patchConversation(conv.id, { project_id: projectId });
      }
      activeConvRef.current = conv.id;
      setActiveConversationId(conv.id);
      setConversationList((prev) => [newConv, ...prev]);
      isFirstUserMsg.current = true;
      return conv.id;
    } catch {
      return '';
    }
  }

  const handleSend = useCallback(async (text: string) => {
    const convId = await ensureConversation(activeProject?.id);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: nowTimestamp(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    if (convId) saveMessageToDb(convId, 'user', text);

    if (isFirstUserMsg.current && convId) {
      isFirstUserMsg.current = false;
      const title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
      patchConversation(convId, { title });
      setConversationList((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title, timestamp: 'just now' } : c))
      );
    }

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role === 'stella' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, conversation_id: convId || undefined }),
      });
      const data = await res.json();
      const runId = data.run_id || data.runId;

      if (runId) {
        const stellaMsg: Message = { id: (Date.now() + 1).toString(), role: 'stella', content: data.content, timestamp: nowTimestamp() };
        const runMsg: Message = {
          id: (Date.now() + 2).toString(), role: 'stella', content: '', timestamp: nowTimestamp(),
          showRunCard: true, pipelineType: data.intent === 'BUILD' ? 'build' : 'research', runId,
        };
        setMessages((prev) => [...prev, stellaMsg, runMsg]);
        if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, run_id: runId });
      } else {
        const stellaMsg: Message = { id: (Date.now() + 1).toString(), role: 'stella', content: data.content, timestamp: nowTimestamp() };
        setMessages((prev) => [...prev, stellaMsg]);
        if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, action: data.action });
      }
    } catch (err) {
      console.error('[handleSend] error:', err);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: 'stella',
        content: 'Something went wrong. Check the console.', timestamp: nowTimestamp(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, activeProject]);

  const handleClearChat = useCallback(async () => {
    activeConvRef.current = null;
    setActiveConversationId(null);
    isFirstUserMsg.current = true;
    setMessages([{
      id: Date.now().toString(), role: 'stella',
      content: randomClearMessage(), timestamp: nowTimestamp(),
    }]);
  }, []);

  const handleAction = useCallback(async (action: 'research' | 'build' | 'both') => {
    setMessages((prev) => prev.map((m) => ({ ...m, showActions: false })));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `__action:${action}`, history: [],
          confirmedIntent: action === 'build' ? 'BUILD' : 'RESEARCH',
          confirmedMode: action,
        }),
      });
      const data = await res.json();
      const runId = data.run_id || data.runId;
      const chainId = data.chain_id;
      const ts = nowTimestamp();
      const confirmMsg: Message = { id: Date.now().toString(), role: 'stella', content: data.content || `Starting ${action} run.`, timestamp: ts };
      const newMessages: Message[] = [confirmMsg];
      if (chainId) {
        newMessages.push({ id: (Date.now() + 1).toString(), role: 'stella', content: '', timestamp: ts, showChainCard: true, chainId });
      } else if (runId) {
        newMessages.push({ id: (Date.now() + 1).toString(), role: 'stella', content: '', timestamp: ts, showRunCard: true, pipelineType: action === 'build' ? 'build' : 'research', runId });
      }
      setMessages((prev) => [...prev, ...newMessages]);
      const convId = activeConvRef.current;
      if (convId) saveMessageToDb(convId, 'stella', confirmMsg.content, { intent: action.toUpperCase(), run_id: runId, chain_id: chainId });
    } catch (err) {
      console.error('[handleAction] error:', err);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'stella', content: 'Failed to start the pipeline. Check the console.', timestamp: nowTimestamp() }]);
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    activeConvRef.current = null;
    setActiveConversationId(null);
    setActiveProject(null);
    isFirstUserMsg.current = true;
    setMessages([]);
    setActiveView('chat');
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    if (id === activeConvRef.current) return;
    setActiveConversationId(id);
    loadConversation(id);
    setActiveView('chat');
  }, []);

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const proj = await res.json();
      setProjects((prev) => [proj, ...prev]);
    } catch {}
  }, []);

  const handleOpenProject = useCallback((projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      setActiveConversationId(null);
      activeConvRef.current = null;
      setMessages([]);
      isFirstUserMsg.current = true;
    }
  }, [projects]);

  const handleMoveToProject = useCallback(async (convId: string, projectId: string | null) => {
    await patchConversation(convId, { project_id: projectId });
    setConversationList((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, project_id: projectId } : c))
    );
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`${API}/conversations/${id}`, { method: 'DELETE' });
      setConversationList((prev) => prev.filter((c) => c.id !== id));
      if (activeConvRef.current === id) {
        activeConvRef.current = null;
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch {}
  }, []);

  const handleViewChange = useCallback((view: 'chat' | 'settings') => {
    setActiveView(view);
    setActiveProject(null);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  const handleDocumentUploaded = useCallback((id: string, filename: string, msg: string) => {
    const uploadMsg: Message = {
      id: Date.now().toString(), role: 'stella',
      content: `Got "${filename}". ${msg}\n\nOnce indexed, you can ask me to validate it, summarize it, research more around it, or build from it.`,
      timestamp: nowTimestamp(),
    };
    setMessages(prev => [...prev, uploadMsg]);
    const convId = activeConvRef.current;
    if (convId) saveMessageToDb(convId, 'stella', uploadMsg.content, { document_id: id });
  }, []);

  const handleNewChatInProject = useCallback(async () => {
    activeConvRef.current = null;
    setActiveConversationId(null);
    isFirstUserMsg.current = true;
    setMessages([]);
  }, []);

  const handleProjectUpdated = useCallback((updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    if (activeProject?.id === updated.id) setActiveProject({ ...activeProject, ...updated });
  }, [activeProject]);

  // If a project is active, render ProjectWorkspace
  if (activeProject) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <ProjectWorkspace
          project={activeProject}
          conversations={conversationList}
          activeConversationId={activeConversationId}
          messages={messages}
          isThinking={isThinking}
          onBack={() => { setActiveProject(null); }}
          onSelectConversation={handleSelectConversation}
          onNewChatInProject={handleNewChatInProject}
          onSend={handleSend}
          onAction={handleAction}
          onDocumentUploaded={handleDocumentUploaded}
          onProjectUpdated={handleProjectUpdated}
        />
      </div>
    );
  }

  const sidebarPanel = (
    <ConversationHistory
      conversations={conversationList}
      projects={projects}
      activeId={activeConversationId ?? ''}
      activeView={activeView}
      onSelect={handleSelectConversation}
      onNewChat={handleNewChat}
      onCreateProject={handleCreateProject}
      onMoveToProject={handleMoveToProject}
      onDeleteConversation={handleDeleteConversation}
      onViewChange={handleViewChange}
      onOpenProject={handleOpenProject}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      {isMobile ? (
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
                transition={{ duration: 0.2 }}
                className="fixed left-0 top-0 bottom-0 z-50"
              >
                {sidebarPanel}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        sidebarPanel
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onClearChat={handleClearChat}
          activeView={activeView}
          showMobileMenu={isMobile}
          onMobileMenuToggle={() => setMobileSidebarOpen((p) => !p)}
        />

        {activeView === 'chat' ? (
          <>
            <ChatView messages={messages} onAction={handleAction} isThinking={isThinking} />
            <Composer
              onSend={handleSend}
              onDocumentUploaded={handleDocumentUploaded}
            />
          </>
        ) : (
          <SettingsView />
        )}
      </div>
    </div>
  );
};

export default Index;
