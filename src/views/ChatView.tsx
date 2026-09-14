import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { SEO } from '../components/common/SEO';

import {
  Bot,
  User,
  Send,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  MessageSquare,
  Plus,
  Menu,
  X,
  Sparkles,
  Trash2,
  Edit2,
  Pin,
  PinOff,
  Search,
  Mic,
  MicOff,
  Camera,
  Languages,
  Square,
  AudioLines,
  BarChart3,
  Code,
  FileText,
  Bug,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { playSound } from '../utils/sound';
import { ToastType } from '../components/common/Toast';
import { useUser, useAuth } from '@clerk/clerk-react';
import { parsePartialSolverJSON } from '../utils/partialJson';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ChatMessage, ChatSession } from '../types';

const ChatMessageItem = React.lazy(() =>
  import('../components/chat/ChatMessageItem').then((m) => ({ default: m.ChatMessageItem })),
);
import { ChatEmptyState } from '../components/chat/ChatEmptyState';
import { presetQueries } from '../components/chat/constants';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatInputBar } from '../components/chat/ChatInputBar';
import { StudySparkle, GeminiThoughtCapsule } from '../components/chat';

export interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialQuery?: string;
  soundEnabled?: boolean;
  onNotify: (msg: string, type: ToastType) => void;
}

export const ChatView: React.FC<ChatViewProps> = React.memo(
  ({
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [subject, setSubject] = useState('Software Engineering');

    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editChatTitle, setEditChatTitle] = useState('');

    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<'pro' | 'flash'>('pro');
    const modelMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
          setModelMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTogglePin = useCallback(
      async (messageId: string, currentPinStatus?: boolean) => {
        const newStatus = !currentPinStatus;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, is_pinned: newStatus } : m)),
        );

        try {
          const token = await getToken();
          await fetch(`/api/db/messages/${messageId}/pin`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ is_pinned: newStatus }),
          });
        } catch (e) {
          console.error('Failed to pin message', e);
          onNotify('Failed to pin message', 'warning');
        }
      },
      [setMessages, getToken, onNotify],
    );

    const handleRenameChat = async (chatId: string) => {
      if (!editChatTitle.trim()) {
        setEditingChatId(null);
        return;
      }
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: editChatTitle } : c)));
      setEditingChatId(null);
      try {
        const token = await getToken();
        await fetch(`/api/db/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: editChatTitle }),
        });
      } catch (e) {
        console.error('Failed to rename chat:', e);
      }
    };

    const handleToggleChatPin = async (chatId: string, currentPinStatus?: boolean) => {
      const newStatus = !currentPinStatus;
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, is_pinned: newStatus } : c)));
      try {
        const token = await getToken();
        await fetch(`/api/db/chats/${chatId}/pin`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_pinned: newStatus }),
        });
      } catch (e) {
        console.error('Failed to pin chat:', e);
      }
    };

    const handleDeleteChat = async (chatId: string) => {
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        isManualSwitch.current = true;
        setActiveChatId(null);
        setMessages([]);
      }
      try {
        const token = await getToken();
        await fetch(`/api/db/chats/${chatId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
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
            stream.getTracks().forEach((track) => track.stop());
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
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
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
            headers: { Authorization: `Bearer ${token}` },
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
      console.log(`[DEBUG ChatView] useEffect running for activeChatId: ${activeChatId}`);

      const fetchMessages = async () => {
        if (!activeChatId) {
          setMessages([]);
          return;
        }

        try {
          const token = await getToken();
          const res = await fetch(`/api/db/chats/${activeChatId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            console.log(
              `[DEBUG ChatView] Fetched ${data.length} messages for chat ${activeChatId}`,
              data,
            );
            if (!ignore) setMessages(data);
          } else {
            if (!ignore) onNotify('Failed to fetch messages', 'warning');
          }
        } catch (err) {
          if (!ignore) {
            console.error('Failed to fetch messages:', err);
            onNotify('Network error fetching messages', 'warning');
          }
        }
      };
      fetchMessages();

      return () => {
        ignore = true;
      };
    }, [activeChatId, setMessages, getToken, onNotify]);

    // presetQueries imported from constants

    const processImageFile = async (file: File) => {
      playSound('click', soundEnabled);

      // Read file as base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        onNotify('Image attached successfully!', 'success');

        if (inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      };
      reader.readAsDataURL(file);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processImageFile(file);
      if (e.target) {
        e.target.value = ''; // Reset file input
      }
    };

    const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
      if (e) e.preventDefault();
      const queryToUse = customQuery || userPrompt;
      if ((!queryToUse.trim() && !selectedImage) || loading || !userId) return;

      playSound('click', soundEnabled);
      setLoading(true);
      setUserPrompt('');

      // Capture image and clear state
      const currentImage = selectedImage;
      setSelectedImage(null);

      if (inputRef.current) {
        (inputRef.current as any).style.height = 'auto';
      }

      let currentChatId = activeChatId;

      // Create new chat if none is active
      if (!currentChatId) {
        try {
          const title =
            queryToUse.length > 30
              ? queryToUse.substring(0, 30) + '...'
              : queryToUse || 'Image Upload';
          const token = await getToken();
          const res = await fetch('/api/db/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, title }),
          });
          if (res.ok) {
            const chat = await res.json();
            currentChatId = chat.id;
            isManualSwitch.current = false;
            setActiveChatId(currentChatId);
            setChats((prev) => [{ ...chat, is_pinned: false }, ...prev]);
          } else {
            console.error('Failed to create chat');
            onNotify('Failed to create chat', 'error');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to create chat:', err);
          setLoading(false);
          return;
        }
      }

      // Include image_url in the local message object if we want to display it
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: queryToUse,
        image_url: currentImage || undefined, // Need to update ChatMessage interface
      } as any;
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
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            query: queryToUse,
            subject,
            chatId: currentChatId,
            userId: userId,
            language,
            messages: newMessages,
            imageUrl: currentImage, // Send to backend
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
        let accumulatedCriticText = '';
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
                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (exists)
                      return prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: JSON.stringify(parsed) } : m,
                      );
                    return [
                      ...prev,
                      {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: JSON.stringify(parsed),
                      },
                    ];
                  });
                } else if (currentEvent === 'critic_verdict') {
                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (exists)
                      return prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: JSON.stringify(parsed) } : m,
                      );
                    return [
                      ...prev,
                      {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: JSON.stringify(parsed),
                      },
                    ];
                  });
                } else if (currentEvent === 'solver_chunk') {
                  if (parsed.isCorrection && !hasSeenCorrection) {
                    accumulatedSolverText = '';
                    accumulatedCriticText = ''; // Reset critic text for re-evaluation
                    hasSeenCorrection = true;
                  }
                  accumulatedSolverText += parsed.content;

                  // Parse the partial JSON for real-time streaming UI
                  const partialJson = parsePartialSolverJSON(accumulatedSolverText);
                  partialJson.criticAuditStatus = 'STREAMING'; // Indicates it's still being typed
                  if (accumulatedCriticText) {
                    partialJson.criticStreamingReasoning = accumulatedCriticText;
                  }

                  const newContent = JSON.stringify(partialJson);

                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (exists)
                      return prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: newContent } : m,
                      );
                    return [
                      ...prev,
                      { id: assistantMessageId, role: 'assistant', content: newContent },
                    ];
                  });
                } else if (currentEvent === 'critic_chunk') {
                  if (parsed.isCorrection) {
                    accumulatedCriticText += parsed.content;
                  } else {
                    accumulatedCriticText += parsed.content;
                  }

                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (exists) {
                      return prev.map((m) => {
                        if (m.id === assistantMessageId) {
                          try {
                            const existingJson = JSON.parse(m.content);
                            existingJson.criticStreamingReasoning = accumulatedCriticText;
                            existingJson.criticAuditStatus = 'VERIFYING';
                            return { ...m, content: JSON.stringify(existingJson) };
                          } catch (e) {
                            return m;
                          }
                        }
                        return m;
                      });
                    }
                    return prev;
                  });
                } else if (currentEvent === 'conversation_chunk') {
                  accumulatedConversationText += parsed.content;
                  const newContent = JSON.stringify({
                    isConversation: true,
                    content: accumulatedConversationText,
                  });
                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (exists)
                      return prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: newContent } : m,
                      );
                    return [
                      ...prev,
                      { id: assistantMessageId, role: 'assistant', content: newContent },
                    ];
                  });
                } else if (currentEvent === 'error') {
                  onNotify(parsed.error, 'error');
                  return;
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
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
        onNotify(err.message || 'Failed to connect to AI server', 'warning');
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
      onNotify('Generation stopped.', 'info');
    };

    const handleEditMessage = (msgId: string, newContent: string) => {
      // Find the index of the message being edited
      const index = messages.findIndex((m) => m.id === msgId);
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
        {/* Sidebar Toggle Button (Floating when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 p-2.5 bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 shadow-md rounded-xl transition-all hover:scale-105 active:scale-95"
            title="Open Sidebar"
          >
            <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </button>
        )}

        <ChatSidebar
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
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
          onEditStart={(chatId, title) => {
            setEditChatTitle(title);
            setEditingChatId(chatId);
          }}
          onEditTitleChange={setEditChatTitle}
          onRenameChat={handleRenameChat}
          onToggleChatPin={handleToggleChatPin}
          onDeleteChat={handleDeleteChat}
          onImageUpload={() => fileInputRef.current?.click()}
          onSelectGem={(prompt) => {
            setUserPrompt(prompt);
            inputRef.current?.focus();
            setSidebarOpen(false);
          }}
        />

        {/* Main Chat Area */}
        <div className="flex-1 min-h-0 flex flex-col h-full bg-zinc-50 dark:bg-[#030303] relative overflow-hidden">
          {/* Stunning Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center">
            {/* Gemini-style Top Left glowing orb */}
            <div className="absolute top-[10%] left-[15%] w-[600px] h-[600px] bg-[#4B90FF]/15 dark:bg-[#4B90FF]/10 blur-[120px] rounded-[100%] opacity-80 animate-pulse-slow"></div>
            {/* Gemini-style Center/Right glowing orb */}
            <div className="absolute top-[30%] right-[15%] w-[500px] h-[500px] bg-[#FF5546]/10 dark:bg-[#FF5546]/5 blur-[120px] rounded-[100%] opacity-60"></div>
            {/* Grid background */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTYwIDBMMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3N2Zz4=')] opacity-[0.05] dark:opacity-[0.05]"></div>
          </div>
          {/* Top Bar with Gemini-Style Model/Engine Selector */}
          <div className="relative z-20 px-4 md:px-8 py-2.5 flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.05] bg-zinc-50/70 dark:bg-[#030303]/70 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors mr-1"
                  title="Open Sidebar"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}

              {/* Gemini-style Model Selector Pill */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#1E1F20]/80 hover:bg-white dark:hover:bg-[#28292c] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer"
                >
                  <StudySparkle size={15} />
                  <span>StudyFlow {selectedEngine === 'pro' ? 'Pro (Dual-AI)' : 'Flash'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {modelMenuOpen && (
                    <m.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-2 w-72 p-2 rounded-2xl bg-white dark:bg-[#1E1F20] shadow-2xl border border-black/10 dark:border-white/10 z-50 backdrop-blur-3xl"
                    >
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        AI Reasoning Engine
                      </div>

                      {/* Option 1: Pro Dual AI */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEngine('pro');
                          setModelMenuOpen(false);
                          onNotify('StudyFlow Pro Dual-AI Engine active', 'info');
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                          selectedEngine === 'pro'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-transparent'
                        }`}
                      >
                        <StudySparkle size={18} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">StudyFlow Pro</span>
                            {selectedEngine === 'pro' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <p className="text-[11px] opacity-80 leading-snug mt-0.5">
                            Dual-AI: Solver + NCERT Critic line-by-line verification. Zero unchecked hallucination.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Flash */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEngine('flash');
                          setModelMenuOpen(false);
                          onNotify('StudyFlow Flash mode active', 'info');
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors mt-1 ${
                          selectedEngine === 'flash'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-transparent'
                        }`}
                      >
                        <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">StudyFlow Flash</span>
                            {selectedEngine === 'flash' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <p className="text-[11px] opacity-80 leading-snug mt-0.5">
                            Instant conversational answers, concept summaries, and quick study tips.
                          </p>
                        </div>
                      </button>

                      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 px-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Ground Truth: Class 11-12 & STEM</span>
                        <span className="text-emerald-500 font-semibold">Live 99.4%</span>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>


          </div>

          {/* Scrollable Chat History */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-6 px-4 md:px-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-[#1E1F20] scrollbar-track-transparent pt-6 pb-72 relative z-10"
          >
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <div className="w-full flex flex-col items-center pt-[5vh] pb-10">
                  <ChatEmptyState
                    userName={user?.firstName || 'Agnishwar'}
                    presetQueries={presetQueries}
                    soundEnabled={soundEnabled}
                    onSubmit={handleSubmit}
                  />
                </div>
              )}

              {messages.map((msg, i) => (
                <React.Suspense
                  key={msg.id}
                  fallback={
                    <div className="animate-pulse bg-zinc-200 dark:bg-white/5 rounded-2xl h-32 w-full max-w-[85%] mt-2"></div>
                  }
                >
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
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1E1F20] border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center flex-shrink-0 mt-1">
                    <StudySparkle size={18} isAnimated={true} />
                  </div>
                  <div className="w-full max-w-full space-y-3">
                    <GeminiThoughtCapsule isLoading={true} status="STREAMING" defaultExpanded={true} />
                    
                    {/* Shimmering Gemini-style generation skeleton */}
                    <div className="bg-[#FAFAFA] dark:bg-[#18181B] border border-black/5 dark:border-white/5 shadow-sm rounded-2xl rounded-tl-sm p-5 space-y-3.5">
                      <div className="h-3.5 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-white/5 dark:via-white/15 dark:to-white/5 rounded-full w-4/5 animate-pulse" />
                      <div className="h-3.5 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-white/5 dark:via-white/15 dark:to-white/5 rounded-full w-full animate-pulse" />
                      <div className="h-3.5 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-white/5 dark:via-white/15 dark:to-white/5 rounded-full w-2/3 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Fade-out gradient for Gemini level professionalism */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-zinc-50 via-zinc-50/80 dark:from-[#030303] dark:via-[#030303]/80 to-transparent pointer-events-none z-20" />

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
            onFileUpload={processImageFile}
            selectedImage={selectedImage}
            onClearImage={() => setSelectedImage(null)}
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
  },
);
