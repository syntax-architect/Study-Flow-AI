import React from 'react';
import { m } from 'motion/react';
import { playSound } from '../../utils/sound';

interface ChatEmptyStateProps {
  userName: string;
  presetQueries: Array<{ label: string; text: string; icon: React.ReactNode }>;
  soundEnabled: boolean;
  onSubmit: (e?: React.FormEvent, overrideText?: string) => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  userName,
  presetQueries,
  soundEnabled,
  onSubmit,
}) => {
  return (
    <m.div 
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.95 }}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {}
      }}
      className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-8 px-4 w-full"
    >
      <m.h1 
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        className="text-3xl md:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 text-center mb-4"
      >
        How can I help you today, {userName}?
      </m.h1>

      <m.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
        {presetQueries.map((preset, idx) => (
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={idx}
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onSubmit(undefined, preset.text);
            }}
            className="p-4 bg-white dark:bg-[#1E1F20] border border-black/5 dark:border-white/5 rounded-2xl text-left hover:border-black/10 dark:hover:border-white/10 hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center gap-2 font-medium text-sm text-zinc-700 dark:text-zinc-200">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                {preset.icon}
              </div>
              {preset.label}
            </div>
            <span className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {preset.text}
            </span>
          </m.button>
        ))}
      </m.div>
    </m.div>
  );
};
