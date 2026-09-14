import React from 'react';
import { m } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
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
        hidden: {},
      }}
      className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto gap-4 md:gap-8 px-2"
    >
      <m.h1
        variants={{ hidden: { opacity: 0, filter: 'blur(10px)', y: 30 }, visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } }}
        className="font-['Outfit'] text-3xl md:text-5xl font-extrabold text-zinc-900 dark:text-white text-center tracking-tight leading-tight py-2"
      >
        How can I help you today, <br className="md:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">{userName}</span>?
      </m.h1>

      <m.div
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full"
      >
        {presetQueries.map((preset, idx) => (
          <m.button
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            key={idx}
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onSubmit(undefined, preset.text);
            }}
            className="group relative overflow-hidden p-4 rounded-2xl text-left transition-all flex flex-col gap-2 cursor-pointer bg-[#F0F4F9] hover:bg-white dark:bg-[#1E1F20] dark:hover:bg-[#131314] backdrop-blur-2xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 shadow-none hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
          >
            {/* Animated glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-400/0 group-hover:from-blue-500/10 group-hover:to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Inner top highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent" />

            <div className="relative z-10 flex items-center justify-between font-['Outfit'] font-bold text-sm text-zinc-900 dark:text-white">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white dark:bg-[#131314] shadow-sm dark:shadow-none text-zinc-700 dark:text-zinc-300 group-hover:bg-[#4B90FF] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(75,144,255,0.4)] transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10 group-hover:ring-0">
                  {preset.icon}
                </div>
                <span>{preset.label}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-blue-500 transition-all duration-200" />
            </div>
            <span
              className="relative z-10 font-['Plus_Jakarta_Sans'] text-zinc-500 dark:text-zinc-400 leading-snug font-medium text-xs line-clamp-3"
            >
              {preset.text}
            </span>
          </m.button>
        ))}
      </m.div>
    </m.div>
  );
};
