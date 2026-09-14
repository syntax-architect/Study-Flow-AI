import React, { useState, useEffect } from 'react';
import { m } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface AppLoaderProps {
  onComplete: () => void;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentProgress = 0;

    // Smooth, realistic loading simulation
    const interval = setInterval(() => {
      // Slow down as it gets closer to 100%
      const remaining = 100 - currentProgress;
      const increment = Math.max(1, Math.floor(remaining * 0.1));

      // Randomly decide whether to increment to simulate network loading
      if (Math.random() > 0.3) {
        currentProgress += increment;

        if (currentProgress >= 100) {
          currentProgress = 100;
          setProgress(100);
          clearInterval(interval);

          // Wait a moment at 100% before triggering complete (which will trigger exit animation via parent AnimatePresence)
          setTimeout(onComplete, 400);
        } else {
          setProgress(currentProgress);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <m.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0A0A0B] text-zinc-900 dark:text-white"
    >
      <div className="flex flex-col items-center flex-1 justify-center relative mt-20">
        <div className="flex items-center gap-4 mb-10">
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.06] flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)] dark:shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-hidden border border-black/5 dark:border-white/5"
          >
            <img src="/logo.jpg" alt="StudyFlow AI" className="w-full h-full object-cover" />
          </m.div>
          <m.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-black text-3xl tracking-wide uppercase"
          >
            STUDYFLOW AI
          </m.h1>
        </div>

        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-medium text-xl text-zinc-500 dark:text-white/80"
        >
          {progress}%
        </m.div>
      </div>

      {/* Progress Bar at bottom, similar to the reference image */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-sm px-6 pb-24 relative"
      >
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </m.div>
    </m.div>
  );
};
