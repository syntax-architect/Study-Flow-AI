import React, { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  Settings,
  Volume2,
  VolumeX,
  Moon,
  Trash2,
  LogOut,
  X,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { playSound } from '../../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isTeacherMode: boolean;
  onToggleTeacherMode: () => void;
  onClearData: () => Promise<void>;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  isDarkMode,
  onToggleDarkMode,
  isTeacherMode,
  onToggleTeacherMode,
  onClearData,
  onSignOut,
}) => {
  const [isClearing, setIsClearing] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-[#09090b]/20 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[32px] w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex items-center justify-between bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-[#2563EB] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-zinc-900 dark:text-zinc-50">Settings</h2>
              </div>
              <button
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="cursor-pointer w-8 h-8 flex items-center justify-center bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm hover:border-black/10 dark:hover:border-white/10 active:bg-zinc-50/50 dark:bg-zinc-900/50 rounded-full text-zinc-900 dark:text-zinc-50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Preferences */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-widest">
                  Preferences
                </h3>

                <button
                  onClick={() => {
                    onToggleSound();
                    playSound('click', !soundEnabled);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-2xl cursor-pointer hover:shadow-sm transition-all"
                  type="button"
                >
                  <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Sound Effects
                    </span>
                  </div>
                  <div
                    className={`pointer-events-none w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-[#2563EB] border border-transparent' : 'bg-black/10 dark:bg-white/10 shadow-inner border border-black/5 dark:border-white/5'}`}
                  >
                    <m.div
                      className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all bg-white`}
                      animate={{ left: soundEnabled ? '26px' : '2px' }}
                    />
                  </div>
                </button>

                <button
                  onClick={() => {
                    onToggleDarkMode();
                    playSound('click', soundEnabled);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-2xl cursor-pointer hover:shadow-sm transition-all"
                  type="button"
                >
                  <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Dark Mode
                    </span>
                  </div>
                  <div
                    className={`pointer-events-none w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-[#2563EB] border border-transparent' : 'bg-black/10 dark:bg-white/10 shadow-inner border border-black/5 dark:border-white/5'}`}
                  >
                    <m.div
                      className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all bg-white`}
                      animate={{ left: isDarkMode ? '26px' : '2px' }}
                    />
                  </div>
                </button>

                <button
                  onClick={() => {
                    onToggleTeacherMode();
                    playSound('click', soundEnabled);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-2xl cursor-pointer hover:shadow-sm transition-all"
                  type="button"
                >
                  <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Teacher Dashboard Mode
                    </span>
                  </div>
                  <div
                    className={`pointer-events-none w-12 h-6 rounded-full transition-all relative ${isTeacherMode ? 'bg-[#2563EB] border border-transparent' : 'bg-black/10 dark:bg-white/10 shadow-inner border border-black/5 dark:border-white/5'}`}
                  >
                    <m.div
                      className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all bg-white`}
                      animate={{ left: isTeacherMode ? '26px' : '2px' }}
                    />
                  </div>
                </button>
              </div>

              {/* Data & Account */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-widest">
                  Data & Account
                </h3>

                <button
                  onClick={async () => {
                    if (isClearing) return;
                    playSound('warning', soundEnabled);
                    setIsClearing(true);
                    try {
                      await onClearData();
                      onClose();
                    } finally {
                      setIsClearing(false);
                    }
                  }}
                  disabled={isClearing}
                  className="cursor-pointer w-full flex items-center justify-between p-3 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm hover:border-black/10 dark:hover:border-white/10 active:bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl transition-all text-[#F43F5E] group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center transition-all group-hover:text-white group-hover:bg-[#F43F5E]">
                      {isClearing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-bold">
                      {isClearing ? 'Clearing...' : 'Clear Chat History'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    playSound('click', soundEnabled);
                    onSignOut();
                  }}
                  className="cursor-pointer w-full flex items-center justify-between p-3 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm hover:border-black/10 dark:hover:border-white/10 active:bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl transition-all text-zinc-900 dark:text-zinc-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center transition-all">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold">Sign Out</span>
                  </div>
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
