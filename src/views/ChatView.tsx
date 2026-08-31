import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { SEO } from '../components/common/SEO';

import { Bot, User, Send, RefreshCw, Copy, Check, CheckCircle2, MessageSquare, Plus, Menu, X, Sparkles, Trash2, Edit2, Pin, PinOff, Search, Mic, MicOff, Camera, Languages, Square, AudioLines, BarChart3, Code, FileText, Bug } from 'lucide-react';
import { playSound } from '../utils/sound';
import { ToastType } from '../components/common/Toast';
import { useUser, useAuth } from '@clerk/clerk-react';
import { parsePartialSolverJSON } from '../utils/partialJson';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ChatMessage, ChatSession } from '../types';

const ChatMessageItem = React.lazy(() => import('../components/chat/ChatMessageItem').then(m => ({ default: m.ChatMessageItem })));
import { ChatEmptyState } from '../components/chat/ChatEmptyState';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatInputBar } from '../components/chat/ChatInputBar';

export interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialQuery?: string;
  soundEnabled?: boolean;
  onNotify: (msg: string, type: ToastType) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  setMessages,
  initialQuery = '',
  soundEnabled: propSoundEnabled = true,
  onNotify,
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id;

  const [userPrompt, setUserPrompt] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [language, setLanguage] = useState(localStorage.getItem('preferred_language') || 'en');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isManualSwitch = useRef<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState(propSoundEnabled);
  
  const [subject, setSubject] = useState('Software Engineering');
  
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState('');
  
  const handleTogglePin = useCallback(async (messageId: string, currentPinStatus?: boolean) => {
    const newStatus = !currentPinStatus;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: newStatus } : m));
    
    try {
      const token = await getToken();
      await fetch(`/api/db/messages/${messageId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_pinned: newStatus })
      });
    } catch (e) {
      console.error("Failed to pin message", e);
      onNotify("Failed to pin message", "warning");
    }
  }, [setMessages, getToken, onNotify]);

  const handleRenameChat = async (chatId: string) => {
    if (!editChatTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editChatTitle } : c));
    setEditingChatId(null);
    try {
      const token = await getToken();
      await fetch(`/api/db/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editChatTitle })
      });
    } catch (e) {
      console.error('Failed to rename chat:', e);
    }
  };

  const handleToggleChatPin = async (chatId: string, currentPinStatus?: boolean) => {
    const newStatus = !currentPinStatus;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_pinned: newStatus } : c));
    try {
      const token = await getToken();
      await fetch(`/api/db/chats/${chatId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_pinned: newStatus })
      });
    } catch (e) {
      console.error('Failed to pin chat:', e);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      isManualSwitch.current = true;
      setActiveChatId(null);
      setMessages([]);
    }
    try {
      const token = await getToken();
      await fetch(`/api/db/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to delete chat:', e);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const { isListening, isSupported, toggleListening } = useSpeechRecognition((transcript) => {
    setUserPrompt((prev) => prev + (prev ? ' ' : '') + transcript);
  });

  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleMediaRecording = async () => {
    if (isMediaRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsMediaRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          
          setUserPrompt((p) => p + (p ? ' ' : '') + '(Transcribing...)');

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            formData.append('language', language);
            
            const token = await getToken();
            const res = await fetch('/api/voice-transcribe', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: formData
            });

            if (res.ok) {
              const data = await res.json();
              setUserPrompt((p) => p.replace('(Transcribing...)', data.text.trim()));
            } else {
              throw new Error('Transcription failed');
            }
          } catch (e) {
            console.error(e);
            onNotify('Failed to transcribe audio', 'error');
            setUserPrompt((p) => p.replace('(Transcribing...)', ''));
          }
        };

        mediaRecorder.start();
        setIsMediaRecording(true);
      } catch (e) {
        console.error('Microphone access denied:', e);
        onNotify('Microphone access denied', 'error');
      }
    }
  };

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('preferred_language');
      if (savedLang) setLanguage(savedLang);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (initialQuery) setUserPrompt(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handleClear = () => {
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
    };
    window.addEventListener('clear-chat-history', handleClear);
    return () => window.removeEventListener('clear-chat-history', handleClear);
  }, [setChats, setActiveChatId, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      
      // Additional scrolls to handle framer-motion layout animations and katex rendering
      const t1 = setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
      
      const t2 = setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 350);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [messages, loading, activeChatId]);

  // Auto-focus input when loading finishes
  useEffect(() => {
    if (!loading && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [loading]);

  // Load chat sessions on mount
  useEffect(() => {
    const fetchChats = async () => {
      if (!userId) return;
      try {
        const token = await getToken();
        const res = await fetch(`/api/db/chats/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChats(data);
        }
      } catch (err) {
        console.error('Failed to fetch chats:', err);
      }
    };
    fetchChats();
  }, [userId]);

  // Load messages when active chat changes
  useEffect(() => {
    let ignore = false;

    if (!isManualSwitch.current) {
      // Chat was just created automatically by sending a message, do not wipe our local state or abort stream!
      return;
    }

    // Abort any ongoing stream if user switches chat manually
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const fetchMessages = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      
      try {
        const token = await getToken();
        const res = await fetch(`/api/db/chats/${activeChatId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setMessages(data);
        } else {
          if (!ignore) onNotify("Failed to fetch messages", "warning");
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to fetch messages:', err);
          onNotify("Network error fetching messages", "warning");
        }
      }
    };
    fetchMessages();

    return () => { ignore = true; };
  }, [activeChatId, setMessages, getToken, onNotify]);

  const presetQueries = [
    {
      label: 'Analyze Data',
      text: 'Analyze the recent user engagement dataset and give me the top 3 insights.',
      icon: <BarChart3 className="w-4 h-4 text-blue-500" />
    },
    {
      label: 'Review Code',
      text: 'Can you review my React component for performance issues and security vulnerabilities?',
      icon: <Code className="w-4 h-4 text-emerald-500" />
    },
    {
      label: 'Draft Strategy',
      text: 'Draft a go-to-market strategy for a new B2B AI product.',
      icon: <FileText className="w-4 h-4 text-purple-500" />
    },
    {
      label: 'Debug Issue',
      text: 'Help me debug this error message: "Cannot read properties of undefined"',
      icon: <Bug className="w-4 h-4 text-rose-500" />
    }
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playSound('click', soundEnabled);
    setIsProcessingImage(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/vision-ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      if (data.text) {
        setUserPrompt(prev => prev ? `${prev}\n\n${data.text}` : data.text);
        onNotify('Image scanned successfully! Review the text before sending.', 'success');
        
        if (inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus();
            if (inputRef.current) {
              (inputRef.current as any).style.height = 'auto';
              (inputRef.current as any).style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
            }
          }, 100);
        }
      } else {
        throw new Error('No text found in image');
      }
    } catch (err: any) {
      console.error('Vision OCR Error:', err);
      onNotify(err.message || 'Failed to scan image', 'error');
    } finally {
      setIsProcessingImage(false);
      if (e.target) {
        e.target.value = ''; // Reset file input
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || userPrompt;
    if (!queryToUse.trim() || loading || !userId) return;

    playSound('click', soundEnabled);
    setLoading(true);
    setUserPrompt(''); 
    if (inputRef.current) {
      (inputRef.current as any).style.height = 'auto';
    }

    let currentChatId = activeChatId;

    // Create new chat if none is active
    if (!currentChatId) {
      try {
        const title = queryToUse.length > 30 ? queryToUse.substring(0, 30) + '...' : queryToUse;
        const token = await getToken();
        const res = await fetch('/api/db/chats', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId, title }),
        });
        if (res.ok) {
          const chat = await res.json();
          currentChatId = chat.id;
          isManualSwitch.current = false;
          setActiveChatId(currentChatId);
          setChats(prev => [{ ...chat, is_pinned: false }, ...prev]);
        } else {
          console.error('Failed to create chat');
          onNotify("Failed to create chat", "error");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to create chat:', err);
        setLoading(false);
        return;
      }
    }

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: queryToUse };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const token = await getToken();
      const response = await fetch('/api/solver-critic?stream=true', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          query: queryToUse,
          subject,
          chatId: currentChatId,
          userId: userId,
          language,
          messages: newMessages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI server');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream available');
      
      const decoder = new TextDecoder('utf-8');
      const assistantMessageId = (Date.now() + 1).toString();
      let buffer = '';
      let accumulatedConversationText = '';
      let accumulatedSolverText = '';
      let hasSeenCorrection = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        
        for (let i = 0; i < parts.length - 1; i++) {
          const eventText = parts[i];
          const lines = eventText.split('\n');
          let currentEvent = 'message';
          let dataStr = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
          }

          if (dataStr && dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === 'solver_draft') {
                parsed.criticAuditStatus = 'VERIFYING';
                setMessages(prev => {
                  const exists = prev.some(m => m.id === assistantMessageId);
                  if (exists) return prev.map(m => m.id === assistantMessageId ? { ...m, content: JSON.stringify(parsed) } : m);
                  return [...prev, { id: assistantMessageId, role: 'assistant', content: JSON.stringify(parsed) }];
                });
              } else if (currentEvent === 'critic_verdict') {
                setMessages(prev => {
                  const exists = prev.some(m => m.id === assistantMessageId);
                  if (exists) return prev.map(m => m.id === assistantMessageId ? { ...m, content: JSON.stringify(parsed) } : m);
                  return [...prev, { id: assistantMessageId, role: 'assistant', content: JSON.stringify(parsed) }];
                });
              } else if (currentEvent === 'solver_chunk') {
                if (parsed.isCorrection && !hasSeenCorrection) {
                  accumulatedSolverText = '';
                  hasSeenCorrection = true;
                }
                accumulatedSolverText += parsed.content;
                
                // Parse the partial JSON for real-time streaming UI
                const partialJson = parsePartialSolverJSON(accumulatedSolverText);
                partialJson.criticAuditStatus = 'STREAMING'; // Indicates it's still being typed

                const newContent = JSON.stringify(partialJson);
                
                setMessages(prev => {
                  const exists = prev.some(m => m.id === assistantMessageId);
                  if (exists) return prev.map(m => m.id === assistantMessageId ? { ...m, content: newContent } : m);
                  return [...prev, { id: assistantMessageId, role: 'assistant', content: newContent }];
                });
              } else if (currentEvent === 'conversation_chunk') {
                accumulatedConversationText += parsed.content;
                const newContent = JSON.stringify({ isConversation: true, content: accumulatedConversationText });
                setMessages(prev => {
                  const exists = prev.some(m => m.id === assistantMessageId);
                  if (exists) return prev.map(m => m.id === assistantMessageId ? { ...m, content: newContent } : m);
                  return [...prev, { id: assistantMessageId, role: 'assistant', content: newContent }];
                });
              } else if (currentEvent === 'error') {
                onNotify(parsed.error, 'error');
                return;
              }
            } catch (e) {
              console.error("Error parsing stream data:", e);
            }
          }
        }
        buffer = parts[parts.length - 1];
      }
      
      playSound('success', soundEnabled);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        console.log('Stream aborted.');
        return;
      }
      console.error('Error streaming chat:', err);
      onNotify(err.message || "Failed to connect to AI server", "warning");
      playSound('warning', soundEnabled);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    onNotify("Generation stopped.", "info");
  };

  const handleEditMessage = (msgId: string, newContent: string) => {
    // Find the index of the message being edited
    const index = messages.findIndex(m => m.id === msgId);
    if (index === -1) return;
    
    // Slice messages up to the edited message (excluding it, as we will submit it as a new prompt)
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);
    
    // Set the prompt and submit
    setUserPrompt(newContent);
    // Use setTimeout to ensure state updates before submission
    setTimeout(() => {
      // Simulate form submission
      if (inputRef.current) {
        const form = inputRef.current.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }, 100);
  };
  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden relative transition-all duration-300">
      <SEO title="Chat" description="Chat with the Dual-AI Solver and Critic." />
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/[0.06] shadow-sm rounded-lg transition-all"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" /> : <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />}
      </button>

      {/* Sidebar for Chat History */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        chatSearchQuery={chatSearchQuery}
        isSearchActive={isSearchActive}
        editingChatId={editingChatId}
        editChatTitle={editChatTitle}
        onNewChat={() => {
          isManualSwitch.current = true;
          setActiveChatId(null);
          setSidebarOpen(false);
        }}
        onSelectChat={(chatId) => {
          isManualSwitch.current = true;
          setActiveChatId(chatId);
          setSidebarOpen(false);
        }}
        onSearchChange={setChatSearchQuery}
        onSearchToggle={setIsSearchActive}
        onEditStart={(chatId, title) => { setEditChatTitle(title); setEditingChatId(chatId); }}
        onEditTitleChange={setEditChatTitle}
        onRenameChat={handleRenameChat}
        onToggleChatPin={handleToggleChatPin}
        onDeleteChat={handleDeleteChat}
        onImageUpload={() => fileInputRef.current?.click()}
      />

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col h-full bg-white dark:bg-[#131314] relative">
        {/* Scrollable Chat History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 px-4 md:px-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-[#1E1F20] scrollbar-track-transparent pt-16 md:pt-16 pb-12"
        >
          <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <ChatEmptyState 
              userName={user?.firstName || 'Agnishwar'}
              presetQueries={presetQueries}
              soundEnabled={soundEnabled}
              onSubmit={handleSubmit}
            />
          )}

          {messages.map((msg, i) => (
            <React.Suspense key={msg.id} fallback={<div className="animate-pulse bg-zinc-200 dark:bg-white/5 rounded-2xl h-32 w-full max-w-[85%] mt-2"></div>}>
              <ChatMessageItem 
                msg={msg}
                onTogglePin={handleTogglePin}
                userId={userId}
                activeChatId={activeChatId}
                onNotify={onNotify}
                onEditMessage={handleEditMessage}
                onSuggestionClick={(q) => handleSubmit(undefined, q)}
              />
            </React.Suspense>
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#18181B] border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="w-full max-w-[100%] md:max-w-[90%] bg-[#FAFAFA] dark:bg-[#18181B] border border-black/5 dark:border-white/5 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-widest mb-3">AI Execution Pipeline</h4>
                  <div className="flex items-center justify-between relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5 -translate-y-1/2 z-0">
                       <m.div 
                         className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                         initial={{ width: '0%' }}
                         animate={{ width: '0%' }}
                       />
                    </div>

                    {/* Node 1: Solver */}
                    <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
                      <m.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20 animate-pulse"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      </m.div>
                      <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Solver</span>
                    </div>

                    {/* Node 2: Critic Review */}
                    <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
                      <m.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-50/30 bg-black/5 dark:bg-white/5 shadow-lg"
                      >
                        <RefreshCw className="w-3 h-3 opacity-50" />
                      </m.div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50 opacity-50">Critic</span>
                    </div>

                    {/* Node 3: Decision Gate */}
                    <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
                      <m.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-50/30 bg-black/5 dark:bg-white/5 shadow-lg"
                      >
                        <CheckCircle2 className="w-3 h-3 opacity-50" />
                      </m.div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50 opacity-50">Decision Gate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </AnimatePresence>
        </div>

        {/* Input Container */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload} 
        />
        <ChatInputBar
          subject={subject}
          language={language}
          userPrompt={userPrompt}
          loading={loading}
          isListening={isListening}
          isSupported={isSupported}
          isProcessingImage={isProcessingImage}
          soundEnabled={soundEnabled}
          onSubjectChange={setSubject}
          onLanguageChange={(val) => {
            setLanguage(val);
            localStorage.setItem('preferred_language', val);
          }}
          onPromptChange={(val) => {
            setUserPrompt(val);
          }}
          onSubmit={handleSubmit}
          onStop={handleStop}
          onImageClick={() => fileInputRef.current?.click()}
          onToggleListening={toggleListening}
          inputRef={inputRef as any}
        />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="md:hidden absolute inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
    </div>
  );
};
