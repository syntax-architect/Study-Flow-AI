import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  Bookmark,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  Zap,
  Lightbulb,
  HelpCircle,
  FileSpreadsheet,
  Bot,
} from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { ToastType } from '../common/Toast';

interface MessageActionBarProps {
  messageText: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  onNotify?: (msg: string, type: ToastType) => void;
}

const cleanTextForSpeech = (raw: string): string => {
  if (!raw) return '';
  // Try to parse if it's JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary || parsed.title) {
      return `${parsed.title || ''}. ${parsed.summary || ''}. ${parsed.finalEquation ? 'Final equation: ' + parsed.finalEquation : ''}`;
    }
    if (parsed.content) raw = parsed.content;
  } catch (e) {}

  // Strip markdown formatting & LaTeX for speech
  return raw
    .replace(/\$\$(.*?)\$\$/g, ' equation ')
    .replace(/\$(.*?)\$/g, ' formula ')
    .replace(/[#*`_~[\]()]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
};

export const MessageActionBar: React.FC<MessageActionBarProps> = ({
  messageText,
  isPinned,
  onTogglePin,
  onSuggestionClick,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showModifyMenu, setShowModifyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close modify menu when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowModifyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    let textToCopy = messageText;
    try {
      const parsed = JSON.parse(messageText);
      if (parsed.summary || parsed.steps) {
        textToCopy = `# ${parsed.title || 'Solution'}\n\n${parsed.summary || ''}\n\n` +
          (parsed.steps ? parsed.steps.map((s: any, idx: number) => `### Step ${idx + 1}: ${s.title}\n${s.description}\n${s.mathBlock ? '$$\n' + s.mathBlock + '\n$$' : ''}`).join('\n\n') : '') +
          (parsed.finalEquation ? `\n\n**Final Result:**\n$$\n${parsed.finalEquation}\n$$` : '');
      } else if (parsed.content) {
        textToCopy = parsed.content;
      }
    } catch (e) {}

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onNotify?.('Copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      onNotify?.('Text-to-speech is not supported in this browser', 'warning');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const clean = cleanTextForSpeech(messageText);
    if (!clean) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
    onNotify?.('Reading aloud...', 'info');
  };

  const modifyOptions = [
    {
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
      label: 'Shorter & Concise',
      prompt: 'Please make your previous explanation more concise, bullet-pointed, and focused on key exam formulas.',
    },
    {
      icon: <Lightbulb className="w-3.5 h-3.5 text-blue-500" />,
      label: 'Simpler (ELI12)',
      prompt: 'Explain the core intuition of your previous answer in simpler terms using an everyday real-world analogy.',
    },
    {
      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />,
      label: 'Step-by-Step Rigor',
      prompt: 'Provide a deeper, line-by-line mathematical derivation with every intermediate step explicitly written out.',
    },
    {
      icon: <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />,
      label: 'Quiz Me On This',
      prompt: 'Give me 1 challenging multiple-choice practice question based directly on this concept with 4 options to test my mastery.',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-black/5 dark:border-white/5 text-zinc-500 dark:text-zinc-400 text-xs">
      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
        title="Copy response"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>

      {/* Read Aloud (TTS) */}
      <button
        type="button"
        onClick={handleToggleSpeech}
        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          isPlayingAudio
            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
            : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-800 dark:hover:text-zinc-200'
        }`}
        title={isPlayingAudio ? 'Stop reading' : 'Read aloud (Voice synthesis)'}
      >
        {isPlayingAudio ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span className="text-[11px] font-medium hidden sm:inline animate-pulse">Playing</span>
          </>
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      {/* Modify Response (Gemini's signature feature) */}
      {onSuggestionClick && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowModifyMenu(!showModifyMenu)}
            className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all flex items-center gap-1 text-[11px] font-medium"
            title="Modify response"
          >
            <Bot className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Modify</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showModifyMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showModifyMenu && (
              <m.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 bottom-full mb-2 w-64 p-1.5 rounded-2xl bg-white dark:bg-[#1E1F20] shadow-xl border border-black/10 dark:border-white/10 z-50 backdrop-blur-2xl"
              >
                <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Modify with StudyFlow AI
                </div>
                <div className="space-y-0.5">
                  {modifyOptions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setShowModifyMenu(false);
                        onSuggestionClick(opt.prompt);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span className="text-xs font-medium">{opt.label}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                    </button>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Save to Vault */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className={`p-1.5 px-2.5 rounded-lg transition-colors ml-auto flex items-center gap-1.5 text-[11px] font-medium border ${
            isPinned
              ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title={isPinned ? 'Remove from Vault' : 'Save to Vault'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isPinned ? 'Saved to Vault' : 'Save to Vault'}</span>
        </button>
      )}
    </div>
  );
};
