import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/stella/Sidebar';
import ConversationHistory from '@/components/stella/ConversationHistory';
import Topbar from '@/components/stella/Topbar';
import ChatView from '@/components/stella/ChatView';
import Composer from '@/components/stella/Composer';
import SettingsView from '@/components/stella/SettingsView';
import { Message, Conversation } from '@/components/stella/types';
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

async function patchTitle(convId: string, title: string) {
  try {
    await fetch(`${API}/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  } catch {}
}

const Index = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const isFirstUserMsg = useRef(true);
  const activeConvRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load conversations from Postgres on mount
  useEffect(() => {
    fetch(`${API}/conversations`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations?.length > 0) {
          const convs: Conversation[] = data.conversations.map((c: { id: string; title: string; updated_at: string }) => ({
            id: c.id,
            title: c.title,
            timestamp: new Date(c.updated_at).toLocaleDateString(),
          }));
          setConversationList(convs);
          // Load most recent
          setActiveConversationId(convs[0].id);
          loadConversation(convs[0].id);
        } else {
          // No conversations yet — empty screen, just composer
          setMessages([]);
        }
      })
      .catch(() => {
        setMessages([]);
      });
  }, []);

  async function loadConversation(convId: string) {
    try {
      const res = await fetch(`${API}/conversations/${convId}/messages`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; metadata: Record<string, unknown> | null; created_at: string }) => ({
            id: m.id,
            role: m.role as 'stella' | 'user',
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            ...(m.metadata ?? {}),
          }))
        );
        isFirstUserMsg.current = !data.messages.some((m: { role: string }) => m.role === 'user');
      } else {
        setMessages([]);
        isFirstUserMsg.current = true;
      }
    } catch {
      setMessages([]);
      isFirstUserMsg.current = true;
    }
  }

  async function ensureConversation(): Promise<string> {
    if (activeConvRef.current) return activeConvRef.current;
    try {
      const res = await fetch(`${API}/conversations`, { method: 'POST' });
      const conv = await res.json();
      const newConv: Conversation = {
        id: conv.id,
        title: conv.title,
        timestamp: 'just now',
      };
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
    const convId = await ensureConversation();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: nowTimestamp(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Persist user message
    if (convId) saveMessageToDb(convId, 'user', text);

    // Auto-title after first user message
    if (isFirstUserMsg.current && convId) {
      isFirstUserMsg.current = false;
      const title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
      patchTitle(convId, title);
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
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();

      const runId = data.run_id || data.runId;

      if (runId) {
        const stellaMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: data.content,
          timestamp: nowTimestamp(),
        };
        const runMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'stella',
          content: '',
          timestamp: nowTimestamp(),
          showRunCard: true,
          pipelineType: data.intent === 'BUILD' ? 'build' : 'research',
          runId,
        };
        setMessages((prev) => [...prev, stellaMsg, runMsg]);
        // Persist Stella's reply
        if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, run_id: runId });
      } else {
        const stellaMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: data.content,
          timestamp: nowTimestamp(),
        };
        setMessages((prev) => [...prev, stellaMsg]);
        // Persist Stella's reply
        if (convId) saveMessageToDb(convId, 'stella', data.content, { intent: data.intent, action: data.action });
      }
    } catch (err) {
      console.error('[handleSend] error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'stella',
        content: 'Something went wrong. Check the console.',
        timestamp: nowTimestamp(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [messages]);

  const handleClearChat = useCallback(async () => {
    // Lazy — don't create DB conversation until first message
    activeConvRef.current = null;
    setActiveConversationId(null);
    isFirstUserMsg.current = true;
    setMessages([{
      id: Date.now().toString(),
      role: 'stella',
      content: randomClearMessage(),
      timestamp: nowTimestamp(),
    }]);
  }, []);

  const handleAction = useCallback(async (action: 'research' | 'build' | 'both') => {
    setMessages((prev) => prev.map((m) => ({ ...m, showActions: false })));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `__action:${action}`,
          history: [],
          confirmedIntent: action === 'build' ? 'BUILD' : 'RESEARCH',
          confirmedMode: action,
        }),
      });

      const data = await res.json();
      const runId = data.run_id || data.runId;
      const chainId = data.chain_id;
      const ts = nowTimestamp();

      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: 'stella',
        content: data.content || `Starting ${action} run.`,
        timestamp: ts,
      };

      const newMessages: Message[] = [confirmMsg];

      if (chainId) {
        newMessages.push({
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: '',
          timestamp: ts,
          showChainCard: true,
          chainId,
        });
      } else if (runId) {
        newMessages.push({
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: '',
          timestamp: ts,
          showRunCard: true,
          pipelineType: action === 'build' ? 'build' : 'research',
          runId,
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);

      // Persist action confirmation
      const convId = activeConvRef.current;
      if (convId) saveMessageToDb(convId, 'stella', confirmMsg.content, { intent: action.toUpperCase(), run_id: runId, chain_id: chainId });
    } catch (err) {
      console.error('[handleAction] error:', err);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'stella',
        content: 'Failed to start the pipeline. Check the console.',
        timestamp: nowTimestamp(),
      }]);
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    // Lazy — don't create DB conversation until first message
    activeConvRef.current = null;
    setActiveConversationId(null);
    isFirstUserMsg.current = true;
    setMessages([]);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    if (id === activeConvRef.current) return;
    setActiveConversationId(id);
    loadConversation(id);
  }, []);

  const handleViewChange = useCallback((view: 'chat' | 'settings') => {
    setActiveView(view);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Icon sidebar */}
      {isMobile ? (
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -52 }}
                animate={{ x: 0 }}
                exit={{ x: -52 }}
                transition={{ duration: 0.2 }}
                className="fixed left-0 top-0 bottom-0 z-50"
              >
                <Sidebar
                  activeView={activeView}
                  onViewChange={handleViewChange}
                  onChatIconClick={() => {}}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onChatIconClick={() => {}}
        />
      )}

      {/* Persistent conversation history panel — desktop only */}
      {!isMobile && (
        <div style={{ marginLeft: '52px' }}>
          <ConversationHistory
            conversations={conversationList}
            activeId={activeConversationId ?? ''}
            onSelect={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>
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
              onDocumentUploaded={(id, filename, msg) => {
                const uploadMsg: Message = {
                  id: Date.now().toString(),
                  role: 'stella',
                  content: `Got "${filename}". ${msg}\n\nOnce indexed, you can ask me to validate it, summarize it, research more around it, or build from it.`,
                  timestamp: nowTimestamp(),
                };
                setMessages(prev => [...prev, uploadMsg]);
                // Persist upload message
                const convId = activeConvRef.current;
                if (convId) saveMessageToDb(convId, 'stella', uploadMsg.content, { document_id: id });
              }}
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
