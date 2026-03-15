import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/stella/Sidebar';
import ConversationHistory from '@/components/stella/ConversationHistory';
import Topbar from '@/components/stella/Topbar';
import ChatView from '@/components/stella/ChatView';
import Composer from '@/components/stella/Composer';
import SettingsView from '@/components/stella/SettingsView';
import { mockMessages, mockConversations } from '@/components/stella/mockData';
import { Message, Conversation } from '@/components/stella/types';
import { useIsMobile } from '@/hooks/use-mobile';

function generateId() {
  return Math.random().toString(36).slice(2);
}

function saveToStorage(msgs: Message[], convId: string, convList: Conversation[]) {
  const saved = JSON.parse(localStorage.getItem('stella_conversations') || '{}');
  saved.messages = { ...(saved.messages || {}), [convId]: msgs };
  saved.activeId = convId;
  saved.conversations = convList;
  localStorage.setItem('stella_conversations', JSON.stringify(saved));
}

const Index = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState('conv-1');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [conversationList, setConversationList] = useState<Conversation[]>(mockConversations);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('stella_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.conversations?.length > 0) setConversationList(parsed.conversations);
        if (parsed.activeId) {
          setActiveConversationId(parsed.activeId);
          const msgs = parsed.messages?.[parsed.activeId];
          if (msgs?.length > 0) setMessages(msgs);
        }
      } catch {}
    }
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

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
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        const runMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'stella',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          showRunCard: true,
          pipelineType: data.intent === 'BUILD' ? 'build' : 'research',
          runId,
        };
        setMessages((prev) => {
          const updated = [...prev, stellaMsg, runMsg];
          setConversationList((prevConvs) => {
            const updatedConvs = prevConvs.map((c) =>
              c.id === activeConversationId && c.title === 'New chat'
                ? { ...c, title: text.slice(0, 40), timestamp: 'just now' }
                : c
            );
            saveToStorage(updated, activeConversationId, updatedConvs);
            return updatedConvs;
          });
          return updated;
        });
      } else {
        const stellaMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => {
          const updated = [...prev, stellaMsg];
          setConversationList((prevConvs) => {
            const updatedConvs = prevConvs.map((c) =>
              c.id === activeConversationId && c.title === 'New chat'
                ? { ...c, title: text.slice(0, 40), timestamp: 'just now' }
                : c
            );
            saveToStorage(updated, activeConversationId, updatedConvs);
            return updatedConvs;
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('[handleSend] error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'stella',
        content: 'Something went wrong. Check the console.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, activeConversationId]);

  const handleClearChat = useCallback(() => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'stella',
        content: 'Chat cleared. What would you like to work on?',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      },
    ]);
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
      const buildRunId = data.build_run_id;
      const ts = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: 'stella',
        content: data.content || `Starting ${action} run.`,
        timestamp: ts,
      };

      const newMessages: Message[] = [confirmMsg];

      if (runId) {
        newMessages.push({
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: '',
          timestamp: ts,
          showRunCard: true,
          pipelineType: buildRunId ? 'research' : (action === 'build' ? 'build' : 'research'),
          runId,
        });
      }

      if (buildRunId) {
        newMessages.push({
          id: (Date.now() + 2).toString(),
          role: 'stella',
          content: '',
          timestamp: ts,
          showRunCard: true,
          pipelineType: 'build',
          runId: buildRunId,
        });
      }

      setMessages((prev) => {
        const updated = [...prev, ...newMessages];
        saveToStorage(updated, activeConversationId, conversationList);
        return updated;
      });
    } catch (err) {
      console.error('[handleAction] error:', err);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'stella',
        content: 'Failed to start the pipeline. Check the console.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }]);
    }
  }, [activeConversationId, conversationList]);

  const handleNewChat = useCallback(() => {
    const newId = generateId();
    const newConv: Conversation = {
      id: newId,
      title: 'New chat',
      timestamp: 'just now',
    };
    const initialMsg: Message[] = [{
      id: Date.now().toString(),
      role: 'stella',
      content: 'New chat started. What are we working on?',
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }];
    setActiveConversationId(newId);
    setConversationList((prev) => {
      const updated = [newConv, ...prev];
      saveToStorage(initialMsg, newId, updated);
      return updated;
    });
    setMessages(initialMsg);
    setHistoryOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setHistoryOpen(false);
    const saved = localStorage.getItem('stella_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const msgs = parsed.messages?.[id];
        if (msgs?.length > 0) {
          setMessages(msgs);
          return;
        }
      } catch {}
    }
    setMessages([{
      id: Date.now().toString(),
      role: 'stella',
      content: 'What are we working on?',
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }]);
  }, []);

  const handleViewChange = useCallback((view: 'chat' | 'settings') => {
    setActiveView(view);
    setHistoryOpen(false);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
                  onChatIconClick={() => setHistoryOpen((p) => !p)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onChatIconClick={() => setHistoryOpen((p) => !p)}
        />
      )}

      <ConversationHistory
        open={historyOpen}
        conversations={conversationList}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onClose={() => setHistoryOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0" style={{ marginLeft: isMobile ? 0 : '52px' }}>
        <Topbar
          onClearChat={handleClearChat}
          activeView={activeView}
          showMobileMenu={isMobile}
          onMobileMenuToggle={() => setMobileSidebarOpen((p) => !p)}
        />

        {activeView === 'chat' ? (
          <>
            <ChatView messages={messages} onAction={handleAction} isThinking={isThinking} />
            <Composer onSend={handleSend} />
          </>
        ) : (
          <SettingsView />
        )}
      </div>
    </div>
  );
};

export default Index;
