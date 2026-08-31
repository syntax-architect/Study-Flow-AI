import React from 'react';
import { Plus, Search, Camera, MessageSquare, Pin, PinOff, Edit2, Trash2 } from 'lucide-react';
import { ChatSession } from '../../types';

interface ChatSidebarProps {
  sidebarOpen: boolean;
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
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sidebarOpen,
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
}) => {
  return (
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
          onClick={onNewChat}
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
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => { if (!chatSearchQuery) onSearchToggle(false); }}
              className="w-full bg-zinc-200/50 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.06] text-zinc-900 dark:text-zinc-200 text-sm rounded-full pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all placeholder:text-zinc-500"
            />
          </div>
        ) : (
          <button 
            onClick={() => onSearchToggle(true)}
            className="w-full flex items-center gap-3 text-zinc-700 dark:text-zinc-300 py-2.5 px-3 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
          >
            <Search className="w-4 h-4" />
            Search chats
          </button>
        )}
        
        <button 
          onClick={onImageUpload}
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
                onChange={(e) => onEditTitleChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRenameChat(chat.id)}
                autoFocus
                onBlur={() => onRenameChat(chat.id)}
                className="bg-transparent border-b border-black/20 dark:border-white/20 text-xs focus:outline-none flex-1 truncate py-1"
              />
            ) : (
              <button
                onClick={() => onSelectChat(chat.id)}
                className="flex items-center gap-2 flex-1 text-left truncate min-w-0"
              >
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeChatId === chat.id ? 'text-blue-500' : 'text-zinc-400'}`} />
                <span className="truncate">{chat.title}</span>
                {chat.is_pinned && <Pin className="w-3 h-3 flex-shrink-0 text-amber-400" />}
              </button>
            )}
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleChatPin(chat.id, chat.is_pinned); }}
                className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${chat.is_pinned ? 'text-amber-500 opacity-100' : 'text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100'}`}
                title={chat.is_pinned ? "Unpin Chat" : "Pin Chat"}
              >
                {chat.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              {editingChatId !== chat.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditStart(chat.id, chat.title); }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
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
  );
};
