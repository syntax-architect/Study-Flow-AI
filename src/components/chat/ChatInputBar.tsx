import React from 'react';
import { m } from 'motion/react';
import {
  RefreshCw,
  Mic,
  MicOff,
  Send,
  X,
  Expand,
  RefreshCcw,
  ImagePlus,
  FunctionSquare,
  Trash2,
  StopCircle,
} from 'lucide-react';

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
  onFileUpload?: (file: File) => void;
  onClearImage?: () => void;
  selectedImage?: string | null;
  onToggleListening: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
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
  onFileUpload,
  onClearImage,
  selectedImage,
  onToggleListening,
  inputRef,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const hasContent = userPrompt.trim().length > 0 || selectedImage || isListening;
  const isExpanded = isFocused || hasContent;

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file && onFileUpload) {
            e.preventDefault();
            onFileUpload(file);
            break;
          }
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files) {
      const files = e.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.indexOf('image') !== -1) {
          const file = files[i];
          if (file && onFileUpload) {
            onFileUpload(file);
            break;
          }
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  return (
    <div className="absolute bottom-4 inset-x-0 p-4 pointer-events-none flex justify-center z-40">
      <div className="group/dock relative pointer-events-auto w-full max-w-full px-2 md:px-4 transition-all duration-500 hover:scale-[1.01]">
        {/* Animated outer glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4B90FF] via-[#9B72CB] to-[#FF5546] rounded-3xl blur-xl opacity-20 group-hover/dock:opacity-40 transition duration-1000"></div>
        
        {/* Main Dock Container */}
        <div className={`relative bg-[#F0F4F9]/80 dark:bg-[#1E1F20]/80 backdrop-blur-3xl border border-transparent dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden transition-all duration-300 ${isExpanded ? 'p-3.5 space-y-3' : 'p-2 md:p-3 space-y-1.5'}`}>
          
          {/* Inner highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"></div>

          {/* Top Mini-Controls Row */}
          {isExpanded && (
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono-metric gap-2 sm:gap-0 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)] animate-pulse"></span>
                <select
                  value={subject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  className="bg-transparent text-[11px] font-mono-metric font-medium focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="Physics: Mechanics & Rigid Body">Physics: Mechanics & Rigid Body</option>
                  <option value="Physics: Electrodynamics">Physics: Electrodynamics</option>
                  <option value="Physics: Thermodynamics">Physics: Thermodynamics</option>
                  <option value="Mathematics: Calculus III">Mathematics: Calculus III</option>
                  <option value="Chemistry: Organic">Chemistry: Organic</option>
                  <option value="General Engineering">General Engineering</option>
                </select>
                <Expand className="w-3 h-3 opacity-60" />
              </div>
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium shadow-sm dark:shadow-none">
                <span className="text-blue-500 font-bold">λ</span>
                <span>LaTeX / SymPy Engine</span>
              </div>
            </div>
            {/* Multi-Agent Toggle */}
            <div className="flex items-center space-x-2 bg-gradient-to-r from-[#4B90FF]/10 to-[#9B72CB]/10 px-3 py-1.5 rounded-xl border border-[#4B90FF]/20 ml-auto text-blue-700 dark:text-blue-300 backdrop-blur-md">
              <span className="text-[10px] opacity-80 font-medium">Dual Engine:</span>
              <span className="text-[10px] font-bold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]"></span>
                <span>Solver + Critic Synced</span>
              </span>
            </div>
          </div>
          )}
          {selectedImage && (
            <div className="relative inline-block mt-2 px-1 z-10">
              <div className="relative inline-block border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-md">
                <img
                  src={selectedImage}
                  alt="Uploaded"
                  className="h-16 w-auto object-cover max-w-[200px]"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 text-white rounded-full p-1 transition-colors flex items-center justify-center backdrop-blur-md"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Multiline Mathematical Formulation Input */}
          <div className="relative group z-10">
            <textarea
              ref={inputRef}
              value={userPrompt}
              onChange={(e) => {
                onPromptChange(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 250)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && (userPrompt.trim() || selectedImage || isListening)) {
                    onSubmit(e);
                  }
                }
              }}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="relative w-full bg-transparent border-0 focus:ring-0 rounded-2xl px-3 py-2 text-zinc-900 dark:text-white font-mono-metric text-sm md:text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none outline-none transition-all scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent leading-relaxed"
              placeholder="Enter mathematical formulation, edge-case test, or follow-up query (e.g. 'What happens if cylinder is hollow with I = M R²?')..."
              rows={1}
              disabled={loading}
            ></textarea>
          </div>

          {/* Bottom Action Dock */}
          <div className={`relative z-10 flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-80'}`}>
            {/* Left Tool Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onImageClick}
                disabled={isProcessingImage}
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-none"
                title="Upload Diagram / OCR Image"
              >
                {isProcessingImage ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                ) : (
                  <ImagePlus className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-none"
                title="Formula Symbol Builder"
              >
                <FunctionSquare className="w-5 h-5" />
              </button>

              {isSupported && (
                <button
                  type="button"
                  onClick={onToggleListening}
                  className={`p-2 rounded-xl transition-all shadow-sm dark:shadow-none ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 shadow-none' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}`}
                  title="Voice Input / Dictation"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              <div className="h-6 w-px bg-zinc-200 dark:bg-white/10 mx-2"></div>
              <button
                type="button"
                onClick={() => onPromptChange('')}
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-sm dark:shadow-none"
                title="Clear Formulation Context"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Right Execution CTA & Metrics */}
            <div className="flex items-center space-x-4">
              <span className="font-mono-metric text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                {userPrompt.length} / 4096
              </span>
              {loading ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-zinc-900 dark:text-white font-mono-metric text-sm font-bold shadow-sm active:scale-95 transition-all border border-black/5 dark:border-white/10"
                >
                  <StopCircle className="w-4.5 h-4.5 text-red-500" />
                  <span>Halt</span>
                </button>
              ) : (
                <m.button
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  type="button"
                  onClick={onSubmit}
                  disabled={!userPrompt.trim() && !selectedImage && !isListening}
                  className={`group relative flex items-center space-x-3 px-6 py-2.5 rounded-xl font-mono-metric text-sm font-bold shadow-lg active:scale-95 transition-all overflow-hidden ${
                    userPrompt.trim() || selectedImage || isListening
                      ? 'bg-gradient-to-r from-[#4B90FF] to-[#9B72CB] hover:from-[#4B90FF] hover:to-[#FF5546] text-white shadow-[0_8px_20px_rgba(75,144,255,0.4)] border border-white/20'
                      : 'bg-white/50 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-black/5 dark:border-white/5 shadow-none'
                  }`}
                >
                  {/* Sweep gradient effect on hover */}
                  {(userPrompt.trim() || selectedImage || isListening) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none" />
                  )}
                  <span className="relative z-10">Synthesize</span>
                  <span className="relative z-10 text-lg leading-none opacity-90">↵</span>
                </m.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
