import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Camera,
  MessageSquare,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  X,
  PanelLeftClose,
  BrainCircuit,
  Lightbulb,
  FileText,
  Target,
} from 'lucide-react';
import { ChatSession } from '../../types';
import { StudySparkle } from './StudySparkle';

interface ChatSidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  chats: ChatSession[];
  activeChatId: string | null;
  chatSearchQuery: string;
  isSearchActive: boolean;
  editingChatId: string | null;
  editChatTitle: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onSearchChange: (query: string) => void;
  onSearchToggle: (active: boolean) => void;
  onEditStart: (chatId: string, title: string) => void;
  onEditTitleChange: (title: string) => void;
  onRenameChat: (chatId: string) => void;
  onToggleChatPin: (chatId: string, isPinned?: boolean) => void;
  onDeleteChat: (chatId: string) => void;
  onImageUpload: () => void;
  onSelectGem?: (prompt: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sidebarOpen,
  onCloseSidebar,
  chats,
  activeChatId,
  chatSearchQuery,
  isSearchActive,
  editingChatId,
  editChatTitle,
  onNewChat,
  onSelectChat,
  onSearchChange,
  onSearchToggle,
  onEditStart,
  onEditTitleChange,
  onRenameChat,
  onToggleChatPin,
  onDeleteChat,
  onImageUpload,
  onSelectGem,
}) => {
  const [width, setWidth] = useState(288);
  const isResizing = useRef(false);

  const startResizing = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = React.useCallback(() => {
    isResizing.current = false;
    document.body.style.userSelect = '';
  }, []);

  const resize = React.useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const [isGemsExpanded, setIsGemsExpanded] = useState(true);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true);

  const studyGems = [
    {
      id: 'gem-solver',
      name: 'Rigorous Solver',
      desc: 'Dual-AI ground truth math & physics',
      prompt: 'Solve step-by-step with complete first-principles mathematical rigor: ',
      icon: <BrainCircuit className="w-3.5 h-3.5 text-blue-500" />,
      badge: 'Dual-AI',
    },
    {
      id: 'gem-simplifier',
      name: 'Concept Simplifier',
      desc: 'Feynman technique & analogies',
      prompt: 'Explain the core intuition of this topic using the Feynman technique and simple analogies: ',
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500" />,
      badge: 'Intuitive',
    },
    {
      id: 'gem-exam',
      name: 'Exam & Quiz Master',
      desc: 'Practice problems & active recall',
      prompt: 'Generate 3 high-yield exam-style practice questions with tricky edge cases on: ',
      icon: <Target className="w-3.5 h-3.5 text-rose-500" />,
      badge: 'Practice',
    },
    {
      id: 'gem-summary',
      name: 'Quick Summarizer',
      desc: 'Cheat sheets & formula cards',
      prompt: 'Create a high-yield revision cheat sheet and key formula card for: ',
      icon: <FileText className="w-3.5 h-3.5 text-purple-500" />,
      badge: 'Summary',
    },
  ];
  
  const filteredChats = chats.filter((c) => c.title.toLowerCase().includes(chatSearchQuery.toLowerCase()));
  const pinnedChats = filteredChats.filter(c => c.is_pinned).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const recentChats = filteredChats.filter(c => !c.is_pinned).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const renderChatItem = (chat: ChatSession) => (
    <div
      key={chat.id}
      className={`group relative w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer overflow-hidden ${
        activeChatId === chat.id
          ? 'bg-white dark:bg-white/10 font-medium text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-white/10'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white border border-transparent'
      }`}
    >
      {activeChatId === chat.id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
      )}

      {editingChatId === chat.id ? (
        <input
          type="text"
          value={editChatTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRenameChat(chat.id)}
          autoFocus
          onBlur={() => onRenameChat(chat.id)}
          className="bg-transparent border-b border-black/20 dark:border-white/20 text-sm focus:outline-none flex-1 truncate py-0.5 ml-2"
        />
      ) : (
        <button
          onClick={() => onSelectChat(chat.id)}
          className="flex items-center gap-2.5 flex-1 text-left truncate min-w-0 z-10 pl-1"
        >
          <MessageSquare
            className={`w-4 h-4 flex-shrink-0 transition-colors ${activeChatId === chat.id ? 'text-blue-500' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}
          />
          <span className="truncate">{chat.title}</span>
          {chat.is_pinned && <Pin className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />}
        </button>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleChatPin(chat.id, chat.is_pinned);
          }}
          className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${chat.is_pinned ? 'text-amber-500 opacity-100' : 'text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100'}`}
          title={chat.is_pinned ? 'Unpin Chat' : 'Pin Chat'}
        >
          {chat.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
        {editingChatId !== chat.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditStart(chat.id, chat.title);
            }}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100"
            title="Rename"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChat(chat.id);
          }}
          className="p-1 hover:bg-red-500/10 rounded-md text-red-500 opacity-60 hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-30 backdrop-blur-sm"
          onClick={onCloseSidebar}
        />
      )}
      <div
        style={{ width: sidebarOpen ? `${width}px` : '0px' }}
        className={`
        absolute md:relative inset-y-0 left-0 z-40 bg-white/60 dark:bg-black/60 backdrop-blur-3xl border-r border-black/5 dark:border-white/10 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-lg
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="w-full flex-1 flex flex-col min-w-[200px]">
          <div className="px-5 py-4 flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-white/50 dark:border-white/[0.1] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <img src="/logo.jpg" alt="StudyFlow AI" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-zinc-900 dark:text-white text-lg tracking-tight bg-clip-text">
                StudyFlow
              </span>
            </div>
            <button
              onClick={onCloseSidebar}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              title="Close Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 space-y-2">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 text-zinc-800 dark:text-zinc-200 py-2.5 px-3 rounded-xl text-sm font-semibold hover:bg-white dark:hover:bg-white/10 hover:shadow-sm dark:hover:shadow-none border border-transparent hover:border-zinc-200/50 dark:hover:border-white/5 active:scale-[0.98] transition-all group"
            >
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              New chat
            </button>
            {isSearchActive ? (
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search chats..."
                  value={chatSearchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => {
                    if (!chatSearchQuery) onSearchToggle(false);
                  }}
                  className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-200 text-sm rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-500 shadow-inner"
                />
              </div>
            ) : (
              <button
                onClick={() => onSearchToggle(true)}
                className="w-full flex items-center gap-3 text-zinc-600 dark:text-zinc-400 py-2.5 px-3 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <Search className="w-4 h-4" />
                Search chats
              </button>
            )}

            <button
              onClick={onImageUpload}
              className="w-full flex items-center gap-3 text-zinc-600 dark:text-zinc-400 py-2.5 px-3 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
            >
              <Camera className="w-4 h-4" />
              Images
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10 mt-4 px-3 pb-4 space-y-4">
            {/* Study Gems Section (Gemini-Style) */}
            <div>
              <button 
                onClick={() => setIsGemsExpanded(!isGemsExpanded)}
                className="w-full flex items-center justify-between px-2 mb-1.5 group cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <StudySparkle size={13} />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    Study Gems
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isGemsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isGemsExpanded && (
                <div className="space-y-1">
                  {studyGems.map((gem) => (
                    <button
                      key={gem.id}
                      type="button"
                      onClick={() => onSelectGem?.(gem.prompt)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-white/60 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all group border border-transparent hover:border-black/5 dark:hover:border-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.06] group-hover:bg-white dark:group-hover:bg-[#1E1F20] transition-colors shadow-xs">
                          {gem.icon}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-semibold block truncate">{gem.name}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate block">
                            {gem.desc}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 opacity-70 group-hover:opacity-100 flex-shrink-0">
                        {gem.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Section */}
            {pinnedChats.length > 0 && (
              <div>
                <button 
                  onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
                  className="w-full flex items-center justify-between px-2 mb-1 group"
                >
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">Pinned</span>
                  <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isPinnedExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isPinnedExpanded && (
                  <div className="space-y-1">
                    {pinnedChats.map(renderChatItem)}
                  </div>
                )}
              </div>
            )}

            {/* Recents Section */}
            <div>
              <button 
                onClick={() => setIsRecentsExpanded(!isRecentsExpanded)}
                className="w-full flex items-center justify-between px-2 mb-1 group"
              >
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">Recents</span>
                <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isRecentsExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isRecentsExpanded && (
                <div className="space-y-1">
                  {recentChats.map(renderChatItem)}
                  
                  {recentChats.length === 0 && !chatSearchQuery && (
                    <div className="text-center text-xs font-medium text-[#94A3B8] p-4">
                      No chat history yet
                    </div>
                  )}
                  {chatSearchQuery && recentChats.length === 0 && pinnedChats.length === 0 && (
                    <div className="text-center text-xs font-medium text-[#94A3B8] p-4">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-50 transition-colors"
        />
      </div>
    </>
  );
};
