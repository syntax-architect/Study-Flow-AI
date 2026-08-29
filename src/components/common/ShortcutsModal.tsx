import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modals/menus' },
  { keys: ['/'], description: 'Focus search input (if available)' },
  { keys: ['Ctrl', 'K'], description: 'Open search command' },
];

export const ShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-white/5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-zinc-400" />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-2">
              {SHORTCUTS.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/10 rounded-md text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-sm">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
