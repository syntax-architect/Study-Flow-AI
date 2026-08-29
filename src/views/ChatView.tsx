import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { SEO } from '../components/common/SEO';

import { Bot, User, Send, RefreshCw, Copy, Check, CheckCircle2, MessageSquare, Plus, Menu, X, Sparkles, Trash2, Edit2, Pin, PinOff, Search, Mic, MicOff, Camera, Languages, Square, AudioLines } from 'lucide-react';
import { playSound } from '../utils/sound';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ToastType } from '../components/common/Toast';
import { useUser, useAuth } from '@clerk/clerk-react';
import { parsePartialSolverJSON } from '../utils/partialJson';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ChatMessage, ChatSession } from '../types';
import 'katex/dist/katex.min.css';

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
  
  const [subject, setSubject] = useState('NCERT Class 11 Physics');
  
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
      label: '1. Basic Question',
      text: 'A car of mass 1500 kg drives at 20 m/s on a flat circular turn of radius 50 m with μ_s = 0.6. Will it skid?',
    },
    {
      label: '2. Misconception Trap',
      text: 'A block of 5 kg rests on a rough table with μ_s = 0.4. A horizontal force of 10 N is applied. Is static friction equal to 19.6 N?',
    },
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
      <div className={`
        absolute md:static inset-y-0 left-0 z-40 w-60 bg-zinc-50 dark:bg-[#1E1F20] flex flex-col transition-transform duration-300 ease-in-out pt-16 md:pt-4
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-4 py-2 flex items-center gap-2 mb-4 md:hidden">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            <img src="/logo.jpg" alt="StudyFlow AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg tracking-tight">StudyFlow</span>
        </div>

        <div className="px-3 space-y-1">
          <button 
            onClick={() => {
              isManualSwitch.current = true;
              setActiveChatId(null);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 text-zinc-700 dark:text-zinc-300 py-2.5 px-3 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
          {isSearchActive ? (
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                autoFocus
                placeholder="Search chats..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                onBlur={() => { if (!chatSearchQuery) setIsSearchActive(false); }}
                className="w-full bg-zinc-200/50 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.06] text-zinc-900 dark:text-zinc-200 text-sm rounded-full pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all placeholder:text-zinc-500"
              />
            </div>
          ) : (
            <button 
              onClick={() => setIsSearchActive(true)}
              className="w-full flex items-center gap-3 text-zinc-700 dark:text-zinc-300 py-2.5 px-3 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
            >
              <Search className="w-4 h-4" />
              Search chats
            </button>
          )}
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 text-zinc-700 dark:text-zinc-300 py-2.5 px-3 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
          >
            <Camera className="w-4 h-4" />
            Images
          </button>
        </div>

        <div className="mt-8 px-5 pb-2">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recents</span>
        </div>

        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] dark:scrollbar-thumb-[#1E293B] p-3 space-y-1">
          {chats
            .filter(c => c.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
            .sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            })
            .map(chat => (
            <div
              key={chat.id}
              className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg premium-transition text-sm cursor-pointer ${
                activeChatId === chat.id 
                  ? 'bg-zinc-100 dark:bg-white/[0.06] font-semibold text-zinc-900 dark:text-white' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/[0.03] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editChatTitle}
                  onChange={(e) => setEditChatTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameChat(chat.id)}
                  autoFocus
                  onBlur={() => handleRenameChat(chat.id)}
                  className="bg-transparent border-b border-black/20 dark:border-white/20 text-xs focus:outline-none flex-1 truncate py-1"
                />
              ) : (
                <button
                  onClick={() => {
                    isManualSwitch.current = true;
                    setActiveChatId(chat.id);
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-2 flex-1 text-left truncate min-w-0"
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeChatId === chat.id ? 'text-blue-500' : 'text-zinc-400'}`} />
                  <span className="truncate">{chat.title}</span>
                  {chat.is_pinned && <Pin className="w-3 h-3 flex-shrink-0 text-amber-400" />}
                </button>
              )}
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleChatPin(chat.id, chat.is_pinned); }}
                  className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${chat.is_pinned ? 'text-amber-500 opacity-100' : 'text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100'}`}
                  title={chat.is_pinned ? "Unpin Chat" : "Pin Chat"}
                >
                  {chat.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                {editingChatId !== chat.id && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditChatTitle(chat.title); setEditingChatId(chat.id); }}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                  className="p-1 hover:bg-red-500/10 rounded-md text-red-500 opacity-60 hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {chats.length === 0 && !chatSearchQuery && (
            <div className="text-center text-xs font-medium text-[#94A3B8] p-4">
              No chat history yet
            </div>
          )}
          {chats.length > 0 && chatSearchQuery && chats.filter(c => c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 && (
            <div className="text-center text-xs font-medium text-[#94A3B8] p-4">
              No results found
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col h-full bg-white dark:bg-[#131314] relative">
        {/* Scrollable Chat History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 px-4 md:px-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-[#1E1F20] scrollbar-track-transparent pt-16 md:pt-16 pb-12"
        >
          <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-4"
            >
              <h1 className="text-3xl md:text-4xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 text-center">
                What can I help with, {user?.firstName || 'Agnishwar'}?
              </h1>
            </m.div>
          )}

          {messages.map((msg, i) => (
            <ChatMessageItem 
              key={msg.id}
              msg={msg}
              onTogglePin={handleTogglePin}
              userId={userId}
              activeChatId={activeChatId}
              onNotify={onNotify}
              onEditMessage={handleEditMessage}
            />
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
        <div className="px-4 md:px-8 pt-3 pb-6 md:pb-8 w-full max-w-3xl mx-auto flex flex-col items-center">
          <div className="w-full bg-zinc-100 dark:bg-[#1E1F20] rounded-[32px] p-2 pr-4 shadow-sm relative transition-all focus-within:ring-2 focus-within:ring-white/10 flex flex-col">
            {/* Context & Language Selectors */}
            <div className="px-3 pt-2 pb-1 border-b border-black/5 dark:border-white/5 mx-2 mb-1 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Context</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-transparent dark:bg-[#1E1F20] text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer text-right"
              >
                <option value="NCERT Class 11 Physics">Physics (Class 11)</option>
                <option value="NCERT Class 11 Chemistry">Chemistry (Class 11)</option>
                <option value="NCERT Class 11 Mathematics">Mathematics (Class 11)</option>
              </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">🌐 Language</span>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    localStorage.setItem('preferred_language', e.target.value);
                  }}
                  className="bg-transparent dark:bg-[#1E1F20] text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer text-right"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>
            </div>

            {/* Demo Preset Chips - only show on empty chat */}
            {!activeChatId && messages.length === 0 && (
              <m.div 
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1 } },
                  hidden: {}
                }}
                className="absolute bottom-full mb-4 left-0 flex flex-col items-center justify-center w-full gap-4 px-4"
              >
                <m.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <h2 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1 text-center">
                    What would you like to learn today?
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center">
                    Ask a question, upload a problem, or start a derivation.
                  </p>
                </m.div>

                <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto w-full scrollbar-none">
                  {presetQueries.map((preset, idx) => (
                  <m.button
                    variants={{
                      hidden: { opacity: 0, y: 10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      handleSubmit(undefined, preset.text);
                    }}
                    className="px-4 py-2 bg-zinc-100 dark:bg-[#1E1F20] rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all flex-shrink-0 cursor-pointer shadow-sm"
                  >
                    {preset.label}
                  </m.button>
                ))}
                </div>
              </m.div>
            )}

            <form onSubmit={(e) => handleSubmit(e)} className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="cursor-pointer text-zinc-400 hover:text-zinc-900 dark:hover:text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ml-1"
                title="Upload image"
              >
                {isProcessingImage ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-zinc-300" />
                ) : (
                  <Plus className="w-6 h-6 text-zinc-300 dark:text-zinc-400" />
                )}
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />

              <textarea
                ref={inputRef as any}
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading && (userPrompt.trim() || isListening)) {
                      handleSubmit(e);
                    }
                  }
                }}
                placeholder="Ask StudyFlow..."
                className="flex-1 bg-transparent px-2 py-3.5 text-base text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-500 resize-none overflow-y-auto scrollbar-none"
                style={{ minHeight: '52px', maxHeight: '150px' }}
                rows={1}
                disabled={loading}
              />
              
              <div className="flex items-center gap-2 flex-shrink-0">


                <button
                  type="button"
                  onClick={toggleMediaRecording}
                  title="Record audio (Server Transcription)"
                  className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isMediaRecording ? 'text-blue-500 bg-blue-500/10 animate-pulse' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/5'}`}
                >
                  <AudioLines className="w-5 h-5" />
                </button>

                {isSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    title="Dictate (Browser)"
                    className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isListening ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/5'}`}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5 text-zinc-300 dark:text-zinc-400" />
                    )}
                  </button>
                )}

                {loading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="cursor-pointer text-zinc-400 hover:text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all bg-white/5 hover:bg-white/10"
                    title="Stop generating"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : userPrompt.trim() && (
                  <m.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    type="submit"
                    className="cursor-pointer text-zinc-300 dark:text-zinc-200 hover:text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all bg-zinc-800 dark:bg-white/5 hover:bg-zinc-700 dark:hover:bg-white/10"
                  >
                    <Send className="w-4 h-4" />
                  </m.button>
                )}
              </div>
            </form>
          </div>
          
          <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-500/80 text-center">
            StudyFlow is AI and can make mistakes.
          </div>
        </div>
      
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
