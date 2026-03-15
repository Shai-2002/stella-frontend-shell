import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/stella/Sidebar';
import ConversationHistory from '@/components/stella/ConversationHistory';
import Topbar from '@/components/stella/Topbar';
import ChatView from '@/components/stella/ChatView';
import Composer from '@/components/stella/Composer';
import SettingsView from '@/components/stella/SettingsView';
import { mockMessages, mockConversations } from '@/components/stella/mockData';
import { Message } from '@/components/stella/types';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState('conv-1');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = useCallback(async (text: string) => {
    // 1. Append user message immediately (optimistic)
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // 2. POST to /api/chat with history (last 6 messages)
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
        // Case B — pipeline triggered
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
        setMessages((prev) => [...prev, stellaMsg, runMsg]);
      } else {
        // Case A — conversational response
        const stellaMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'stella',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, stellaMsg]);
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
  }, [messages]);

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
    // Remove showActions from all previous messages
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
      const ts = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: 'stella',
        content: data.content || `Starting ${action} run.`,
        timestamp: ts,
      };

      const runMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'stella',
        content: '',
        timestamp: ts,
        showRunCard: true,
        pipelineType: action === 'build' ? 'build' : 'research',
        runId,
      };

      setMessages((prev) => [...prev, confirmMsg, ...(runId ? [runMsg] : [])]);
    } catch (err) {
      console.error('[handleAction] error:', err);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'stella',
        content: 'Failed to start the pipeline. Check the console.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }]);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    handleClearChat();
    setHistoryOpen(false);
  }, [handleClearChat]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setHistoryOpen(false);
  }, []);

  const handleViewChange = useCallback((view: 'chat' | 'settings') => {
    setActiveView(view);
    setHistoryOpen(false);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar — desktop always visible, mobile overlay */}
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

      {/* Conversation history drawer */}
      <ConversationHistory
        open={historyOpen}
        conversations={mockConversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Main area */}
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
