import React from 'react';
import { m } from 'motion/react';
import { Plus, RefreshCw, AudioLines, Mic, MicOff, Square, Send } from 'lucide-react';

interface ChatInputBarProps {
  subject: string;
  language: string;
  userPrompt: string;
  loading: boolean;
  isListening: boolean;
  isSupported: boolean;
  isProcessingImage: boolean;
  soundEnabled: boolean;
  onSubjectChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  onImageClick: () => void;
  onToggleListening: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  subject,
  language,
  userPrompt,
  loading,
  isListening,
  isSupported,
  isProcessingImage,
  soundEnabled,
  onSubjectChange,
  onLanguageChange,
  onPromptChange,
  onSubmit,
  onStop,
  onImageClick,
  onToggleListening,
  inputRef,
}) => {
  return (
    <div className="px-4 md:px-8 pt-3 pb-6 md:pb-8 w-full max-w-3xl mx-auto flex flex-col items-center">
      <div className="w-full bg-zinc-100 dark:bg-[#1E1F20] rounded-[32px] p-2 pr-4 shadow-sm relative transition-all focus-within:ring-2 focus-within:ring-white/10 flex flex-col">
        {/* Context & Language Selectors */}
        <div className="px-3 pt-2 pb-1 border-b border-black/5 dark:border-white/5 mx-2 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Context</span>
              <select
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="bg-transparent dark:bg-[#1E1F20] text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer text-right"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="Data Science & AI">Data Science & AI</option>
                <option value="Product Management">Product Management</option>
                <option value="Finance & Operations">Finance & Operations</option>
                <option value="General Assistant">General Assistant</option>
                <option value="NCERT Class 11 Physics">Physics (Legacy)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">🌐 Language</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent dark:bg-[#1E1F20] text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer text-right"
            >
              <option value="en">English</option>
              <option value="hi" disabled title="Coming soon">हिंदी (Hindi)</option>
              <option value="bn" disabled title="Coming soon">বাংলা (Bengali)</option>
              <option value="ta" disabled title="Coming soon">தமிழ் (Tamil)</option>
              <option value="mr" disabled title="Coming soon">मराठी (Marathi)</option>
            </select>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onImageClick}
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
          
          <textarea
            ref={inputRef as any}
            value={userPrompt}
            onChange={(e) => {
              onPromptChange(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && (userPrompt.trim() || isListening)) {
                  onSubmit(e);
                }
              }
            }}
            placeholder="Message Assistant..."
            className="flex-1 bg-transparent px-2 py-3.5 text-base text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-500 resize-none overflow-y-auto scrollbar-none"
            style={{ minHeight: '52px', maxHeight: '150px' }}
            rows={1}
            disabled={loading}
          />
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled
              title="Coming soon"
              className={`cursor-not-allowed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-zinc-400 opacity-50`}
            >
              <AudioLines className="w-5 h-5" />
            </button>

            {isSupported && (
              <button
                type="button"
                onClick={onToggleListening}
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
                onClick={onStop}
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
        AI can make mistakes. Consider verifying important information.
      </div>
    </div>
  );
};
