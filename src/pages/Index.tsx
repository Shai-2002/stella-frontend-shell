import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import ConversationHistory from '@/components/stella/ConversationHistory';
import Topbar from '@/components/stella/Topbar';
import ChatView from '@/components/stella/ChatView';
import Composer from '@/components/stella/Composer';
import SettingsView from '@/components/stella/SettingsView';
import ProjectWorkspace from '@/components/stella/ProjectWorkspace';
import ProjectDashboard from '@/components/stella/ProjectDashboard';
import RightSidebar from '@/components/stella/RightSidebar';
import { Message, Conversation, Project, PipelineStatus } from '@/components/stella/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API = `${API_BASE}/api`;

/** Resolve /api paths to the backend in production */
function apiUrl(path: string): string {
  if (path.startsWith('/api') && API_BASE) return `${API_BASE}${path}`;
  return path;
}

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

const Index = () => {
  const isMobile = useIsMobile();
  const authFetch = useAuthFetch();
  const { user } = useUser();
  const [activeView, setActiveView] = useState<'chat' | 'settings' | 'projects'>('chat');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [researchStatus, setResearchStatus] = useState<PipelineStatus | null>(null);
  const [buildStatus, setBuildStatus] = useState<PipelineStatus | null>(null);
  const [presentationStatus, setPresentationStatus] = useState<PipelineStatus | null>(null);
  const [boardroomStatus, setBoardroomStatus] = useState<PipelineStatus | null>(null);
  const isFirstUserMsg = useRef(true);
  const activeConvRef = useRef<string | null>(null);
  // Store authFetch in a ref so helper functions can access it
  const fetchRef = useRef(authFetch);
  fetchRef.current = authFetch;

  // Check if current user is the owner (for showing admin link, etc.)
  const isOwner = user?.primaryEmailAddress?.emailAddress === 'shaivignesh.2002@gmail.com';

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Connect to pipeline SSE and track status in sidebar
  const trackPipelineRun = useCallback((runId: string, mode: 'research' | 'build' | 'presentation' | 'boardroom', topic: string) => {
    const totalStages = mode === 'presentation' ? 4 : mode === 'boardroom' ? 5 : 8;
    const setStatus = mode === 'research' ? setResearchStatus : mode === 'build' ? setBuildStatus : mode === 'boardroom' ? setBoardroomStatus : setPresentationStatus;
    setStatus({ runId, topic, stage: 0, totalStages, stageName: 'Starting', status: 'running', elapsed: 0, cost: 0 });
    setIsFilesPanelOpen(true); // auto-open sidebar

    console.log(`[trackPipelineRun] ${mode} run ${runId.slice(0, 8)} — connecting SSE`);

    let retryCount = 0;
    const MAX_RETRIES = 3;
    let isClosed = false; // true when run is complete/failed — no more retries

    function connectSSE() {
      const url = apiUrl(`/api/run/${runId}/stream`);
      console.log(`[SSE] Connecting to ${url} (attempt ${retryCount + 1})`);
      const es = new EventSource(url);

      es.onopen = () => {
        console.log(`[SSE] Connected for ${mode} run ${runId.slice(0, 8)}`);
        retryCount = 0; // reset on successful connect
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Skip heartbeat/connected events
          if (data.type === 'connected') {
            console.log(`[SSE] Server confirmed connection for ${runId.slice(0, 8)}`);
            return;
          }
          if (data.type === 'stage_complete') {
            console.log(`[SSE] Stage ${data.stage_index}/${data.total_stages}: ${data.stage || data.message}`);
            setStatus(prev => prev ? {
              ...prev,
              stage: (data.stage_index ?? prev.stage + 1),
              totalStages: data.total_stages ?? prev.totalStages,
              stageName: data.stage || data.message || prev.stageName,
              elapsed: data.elapsed ?? prev.elapsed,
              cost: data.cost ?? prev.cost,
            } : prev);
          }
          if (data.type === 'run_complete') {
            console.log(`[SSE] Run complete: ${runId.slice(0, 8)}`);
            isClosed = true;
            setStatus(prev => prev ? {
              ...prev,
              status: 'complete',
              stage: prev.totalStages,
              stageName: 'Complete',
              elapsed: data.elapsed ?? prev.elapsed,
              cost: data.cost ?? prev.cost,
            } : prev);
            es.close();
          }
          if (data.type === 'run_failed') {
            console.log(`[SSE] Run failed: ${runId.slice(0, 8)}`);
            isClosed = true;
            setStatus(prev => prev ? { ...prev, status: 'failed', stageName: 'Failed' } : prev);
            es.close();
          }
          // Two-step chain: research done, ask user to confirm build
          if (data.type === 'chain_build_confirm') {
            console.log(`[SSE] Chain build confirmation requested`);
            const confirmMsg: Message = {
              id: `chain-confirm-${Date.now()}`,
              role: 'stella',
              content: `Research is done! Here's a quick summary:\n\n${data.message || 'Key findings collected.'}\n\nWant me to start the **build pipeline** using these findings?`,
              timestamp: nowTimestamp(),
              showActions: true,
              actionType: 'confirm',
              pendingMode: 'build',
            };
            setMessages(prev => [...prev, confirmMsg]);
          }
        } catch (err) {
          console.warn('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        es.close();
        if (isClosed) return; // run already finished, no retry needed
        retryCount++;
        if (retryCount <= MAX_RETRIES) {
          const delay = Math.min(2000 * retryCount, 8000);
          console.warn(`[SSE] Connection lost for ${runId.slice(0, 8)}, retrying in ${delay}ms (${retryCount}/${MAX_RETRIES})`);
          setTimeout(connectSSE, delay);
        } else {
          console.error(`[SSE] Max retries exceeded for ${runId.slice(0, 8)}`);
        }
      };
    }

    connectSSE();
  }, []);

  async function saveMessageToDb(convId: string, role: string, content: string, metadata?: Record<string, unknown>) {
    try {
      await fetchRef.current(`${API}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, metadata: metadata ?? null }),
      });
    } catch {}
  }

  async function patchConversation(convId: string, data: Record<string, unknown>) {
    try {
      await fetchRef.current(`${API}/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {}
  }

  // Load conversations + projects on mount
  useEffect(() => {
    Promise.all([
      authFetch(`${API}/conversations`).then(r => r.json()).catch(() => ({ conversations: [] })),
      authFetch(`${API}/projects`).then(r => r.json()).catch(() => ({ projects: [] })),
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
      const res = await fetchRef.current(`${API}/conversations/${convId}/messages`);
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
      const res = await fetchRef.current(`${API}/conversations`, { method: 'POST' });
      const conv = await res.json();
      const newConv: Conversation = {
        id: conv.id,
        title: conv.title,
        timestamp: 'just now',
        updated_at: new Date().toISOString(),
        project_id: projectId ?? undefined,
      };
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

      const controller = new AbortController();
      const chatTimeout = setTimeout(() => controller.abort(), 45000); // 45s timeout
      const res = await fetchRef.current('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, conversation_id: convId || undefined }),
        signal: controller.signal,
      });
      clearTimeout(chatTimeout);

      const contentType = res.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream')) {
        // ── SSE streaming response (CONVERSE / MEMORY) ──
        const msgId = (Date.now() + 1).toString();
        setMessages((prev) => [...prev, { id: msgId, role: 'stella', content: '', timestamp: nowTimestamp() }]);
        setIsThinking(false);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let streamIntent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.intent) {
                  streamIntent = data.intent;
                } else if (data.token) {
                  fullContent += data.token;
                  setMessages((prev) =>
                    prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m)
                  );
                } else if (data.done) {
                  // Stream complete
                }
              } catch {}
            }
          }
        }

        if (convId) saveMessageToDb(convId, 'stella', fullContent, { intent: streamIntent });

      } else {
        // ── JSON response (pipeline triggers, CONFIRM, etc.) ──
        const data = await res.json();
        const runId = data.run_id || data.runId;
        const chainId = data.chain_id;
        console.log(`[handleSend] JSON response — intent: ${data.intent}, action: ${data.action}, run_id: ${runId || 'none'}, chain_id: ${chainId || 'none'}`);

        if (chainId) {
          // Pipeline status moved to RightSidebar — just show text message
          const stellaMsg: Message = { id: (Date.now() + 1).toString(), role: 'stella', content: data.content, timestamp: nowTimestamp() };
          setMessages((prev) => [...prev, stellaMsg]);
          if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, chain_id: chainId });
          // Track research phase of chain in sidebar
          trackPipelineRun(chainId, 'research', data.content?.slice(0, 60) || 'Sequential run');
          // Show Build as "queued" during Research→Build chain
          setBuildStatus({ runId: '', topic: data.content?.slice(0, 60) || 'Waiting', stage: 0, totalStages: 8, stageName: 'Queued', status: 'queued' as any, elapsed: 0, cost: 0 });
        } else if (runId) {
          // Pipeline status moved to RightSidebar — just show text message
          const mode = data.intent === 'BUILD' ? 'build' : data.intent === 'PRESENTATION' ? 'presentation' : data.intent === 'BOARDROOM' ? 'boardroom' : 'research';
          const stellaMsg: Message = { id: (Date.now() + 1).toString(), role: 'stella', content: data.content, timestamp: nowTimestamp() };
          setMessages((prev) => [...prev, stellaMsg]);
          if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, run_id: runId });
          trackPipelineRun(runId, mode as 'research' | 'build' | 'presentation' | 'boardroom', data.content?.slice(0, 60) || `${mode} run`);
          // Two-step chain: show build as "Planned" (user will confirm after research)
          if (data._chainPending) {
            setBuildStatus({ runId: '', topic: data.content?.slice(0, 60) || 'Pending confirmation', stage: 0, totalStages: 8, stageName: 'Planned', status: 'queued' as any, elapsed: 0, cost: 0 });
          }
        } else {
          const showActions = data.action === 'CONFIRM' || data.action === 'CLARIFY_MODE';
          // Determine action type: if server sent pendingPipeline, it's a specific-intent confirmation
          const hasPending = !!data.pendingPipeline;
          const actionType: 'clarify' | 'confirm' = hasPending ? 'confirm' : 'clarify';
          const pendingMode = data.pendingPipeline?.mode as 'research' | 'build' | 'presentation' | 'boardroom' | undefined;
          const stellaMsg: Message = {
            id: (Date.now() + 1).toString(), role: 'stella', content: data.content, timestamp: nowTimestamp(),
            showActions, actionType, pendingMode,
          };
          setMessages((prev) => [...prev, stellaMsg]);
          if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, action: data.action });
        }
      }
    } catch (err: any) {
      console.error('[handleSend] error:', err);
      let errorContent: string;
      if (!navigator.onLine) {
        errorContent = "You're offline. Check your connection and try again.";
      } else if (err?.name === 'AbortError' || err?.message?.includes('timeout')) {
        errorContent = "Stella is taking too long to respond. Try sending your message again.";
      } else if (err?.status === 500 || err?.message?.includes('500')) {
        errorContent = "Something went wrong on Stella's end. Try again in a moment.";
      } else if (err?.status === 409) {
        errorContent = err?.message || "That file has already been uploaded.";
      } else {
        errorContent = "Couldn't reach Stella. Check your connection and try again.";
      }
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: 'stella',
        content: errorContent, timestamp: nowTimestamp(),
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

  const handleAction = useCallback(async (action: 'research' | 'build' | 'both' | 'go_ahead' | 'cancel') => {
    // Hide action buttons from all messages
    setMessages((prev) => prev.map((m) => ({ ...m, showActions: false })));

    // Cancel — tell server to clear pending
    if (action === 'cancel') {
      try {
        await fetchRef.current('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'cancel', history: [],
            conversation_id: activeConvRef.current || undefined,
          }),
        });
        setMessages((prev) => [...prev, {
          id: Date.now().toString(), role: 'stella',
          content: 'Cancelled. Let me know when you want to start something.',
          timestamp: nowTimestamp(),
        }]);
      } catch {}
      return;
    }

    // Go ahead — find the pending mode from the last message and confirm it
    if (action === 'go_ahead') {
      // Find pending mode from the most recent message with pendingMode
      const pendingMsg = [...messages].reverse().find(m => m.pendingMode);
      const pendingMode = pendingMsg?.pendingMode || 'research';
      const intentMap: Record<string, string> = { research: 'RESEARCH', build: 'BUILD', presentation: 'PRESENTATION', boardroom: 'BOARDROOM' };

      try {
        const res = await fetchRef.current('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'go ahead', history: [],
            confirmedIntent: intentMap[pendingMode],
            confirmedMode: pendingMode,
            conversation_id: activeConvRef.current || undefined,
          }),
        });
        const data = await res.json();
        const runId = data.run_id || data.runId;
        const chainId = data.chain_id;
        const ts = nowTimestamp();
        const confirmMsg: Message = { id: Date.now().toString(), role: 'stella', content: data.content || `Starting ${pendingMode} run.`, timestamp: ts };
        setMessages((prev) => [...prev, confirmMsg]);
        const convId = activeConvRef.current;
        if (convId) saveMessageToDb(convId, 'stella', confirmMsg.content, { intent: pendingMode.toUpperCase(), run_id: runId, chain_id: chainId });
        if (chainId) {
          trackPipelineRun(chainId, 'research', confirmMsg.content.slice(0, 60));
        } else if (runId) {
          const trackMode = pendingMode === 'build' ? 'build' : pendingMode === 'presentation' ? 'presentation' : pendingMode === 'boardroom' ? 'boardroom' : 'research';
          trackPipelineRun(runId, trackMode as any, confirmMsg.content.slice(0, 60));
        }
      } catch (err) {
        console.error('[handleAction] error:', err);
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'stella', content: 'Failed to start the pipeline. Check the console.', timestamp: nowTimestamp() }]);
      }
      return;
    }

    // Original Research / Build / Both flow
    try {
      const res = await fetchRef.current('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `__action:${action}`, history: [],
          confirmedIntent: action === 'build' ? 'BUILD' : 'RESEARCH',
          confirmedMode: action,
          conversation_id: activeConvRef.current || undefined,
        }),
      });
      const data = await res.json();
      const runId = data.run_id || data.runId;
      const chainId = data.chain_id;
      const ts = nowTimestamp();
      const confirmMsg: Message = { id: Date.now().toString(), role: 'stella', content: data.content || `Starting ${action} run.`, timestamp: ts };
      setMessages((prev) => [...prev, confirmMsg]);
      const convId = activeConvRef.current;
      if (convId) saveMessageToDb(convId, 'stella', confirmMsg.content, { intent: action.toUpperCase(), run_id: runId, chain_id: chainId });
      // Track pipeline in sidebar
      if (chainId) {
        trackPipelineRun(chainId, 'research', confirmMsg.content.slice(0, 60));
      } else if (runId) {
        const trackMode = data.intent === 'BUILD' ? 'build' : data.intent === 'PRESENTATION' ? 'presentation' : data.intent === 'BOARDROOM' ? 'boardroom' : 'research';
        trackPipelineRun(runId, trackMode as any, confirmMsg.content.slice(0, 60));
        // Two-step chain: show build as "Planned" (user confirms after research)
        if (data._chainPending) {
          setBuildStatus({ runId: '', topic: confirmMsg.content.slice(0, 60), stage: 0, totalStages: 8, stageName: 'Planned', status: 'queued' as any, elapsed: 0, cost: 0 });
        }
      }
    } catch (err) {
      console.error('[handleAction] error:', err);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'stella', content: 'Failed to start the pipeline. Check the console.', timestamp: nowTimestamp() }]);
    }
  }, [messages]);

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
    setMobileSidebarOpen(false); // close mobile sidebar on selection
  }, []);

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      const res = await fetchRef.current(`${API}/projects`, {
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
      await fetchRef.current(`${API}/conversations/${id}`, { method: 'DELETE' });
      setConversationList((prev) => prev.filter((c) => c.id !== id));
      if (activeConvRef.current === id) {
        activeConvRef.current = null;
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch {}
  }, []);

  const handleViewChange = useCallback((view: 'chat' | 'settings' | 'projects') => {
    setActiveView(view);
    if (view !== 'projects') setActiveProject(null);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  const handleDocumentUploaded = useCallback((id: string, filename: string, msg: string) => {
    const uploadMsg: Message = {
      id: Date.now().toString(), role: 'stella',
      content: `Got "${filename}". ${msg}\n\nOnce indexed, you can ask me to validate it, summarize it, research more around it, or build from it.`,
      timestamp: nowTimestamp(),
    };
    setMessages(prev => [...prev, uploadMsg]);
    setIsFilesPanelOpen(true); // auto-open sidebar to show file
    const convId = activeConvRef.current;
    if (convId) saveMessageToDb(convId, 'stella', uploadMsg.content, { document_id: id });
  }, []);

  const handleNewChatInProject = useCallback(async () => {
    // Clear current state
    activeConvRef.current = null;
    setActiveConversationId(null);
    isFirstUserMsg.current = true;
    setMessages([]);

    // Create conversation on server with project_id
    if (activeProject) {
      try {
        const res = await fetchRef.current(`${API}/conversations`, { method: 'POST' });
        const conv = await res.json();
        await fetchRef.current(`${API}/conversations/${conv.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: activeProject.id }),
        });
        const newConv: Conversation = {
          id: conv.id,
          title: conv.title || 'New conversation',
          timestamp: 'just now',
          updated_at: new Date().toISOString(),
          project_id: activeProject.id,
        };
        activeConvRef.current = conv.id;
        setActiveConversationId(conv.id);
        setConversationList((prev) => [newConv, ...prev]);
      } catch (err) {
        console.error('[handleNewChatInProject] failed:', err);
      }
    }
  }, [activeProject]);

  // Drag-and-drop file upload handler for ChatView
  const handleFileDrop = useCallback(async (file: File) => {
    setIsFilesPanelOpen(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetchRef.current(`${API}/documents/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.documentId) {
        handleDocumentUploaded(data.documentId, data.filename || file.name, data.message || '');
      }
    } catch (err) { console.error('Drag-drop upload failed', err); }
  }, [handleDocumentUploaded]);

  const handleToggleTask = useCallback(async (taskId: string, newStatus: 'pending' | 'done') => {
    try {
      await fetchRef.current(`${API}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Update local projects state
      setProjects(prev => prev.map(p => ({
        ...p,
        tasks: p.tasks?.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
      })));
    } catch (err) {
      console.error('[handleToggleTask] error:', err);
    }
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
          onDeleteConversation={handleDeleteConversation}
          researchStatus={researchStatus}
          buildStatus={buildStatus}
          presentationStatus={presentationStatus}
          boardroomStatus={boardroomStatus}
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
      onToggleTask={handleToggleTask}
      isOwner={isOwner}
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
          isOwner={isOwner}
          onToggleFiles={() => setIsFilesPanelOpen(p => !p)}
          isFilesPanelOpen={isFilesPanelOpen}
        />

        {activeView === 'chat' && (
          <>
            <ChatView messages={messages} onAction={handleAction} isThinking={isThinking} onFileDrop={handleFileDrop} />
            <Composer
              onSend={handleSend}
              onDocumentUploaded={handleDocumentUploaded}
            />
          </>
        )}
        {activeView === 'settings' && <SettingsView />}
        {activeView === 'projects' && (
          <ProjectDashboard
            projects={projects}
            onSelectProject={handleOpenProject}
            onCreateProject={handleCreateProject}
          />
        )}
      </div>

      {/* Right sidebar — files + pipeline status */}
      <AnimatePresence>
        {isFilesPanelOpen && activeView === 'chat' && (
          <RightSidebar
            isOpen={isFilesPanelOpen}
            onClose={() => setIsFilesPanelOpen(false)}
            projectId={activeProject?.id}
            projectName={activeProject?.name}
            projectInstructions={activeProject?.instructions}
            researchStatus={researchStatus}
            buildStatus={buildStatus}
            presentationStatus={presentationStatus}
            boardroomStatus={boardroomStatus}
            onFileUploaded={handleDocumentUploaded}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
