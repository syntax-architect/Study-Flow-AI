import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Cookie, X } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('studyflow_cookie_consent');
    if (!hasConsented) {
      // Small delay before showing for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('studyflow_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('studyflow_cookie_consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none flex justify-center"
        >
          <div className="pointer-events-auto bg-white dark:bg-[#0A0A0B] border border-zinc-200 dark:border-white/10 shadow-2xl rounded-2xl p-5 max-w-4xl w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hidden sm:block">
                <Cookie className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Cookie className="w-4 h-4 sm:hidden text-blue-500" />
                  Cookie Preferences
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
                  We use cookies to improve your experience, analyze site traffic, and support our Dual-AI Fact-Checker systems. Read our <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              <button
                onClick={handleDecline}
                className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 premium-transition"
              >
                Decline All
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 md:flex-none px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 premium-transition hover-lift"
              >
                Accept All
              </button>
              <button 
                onClick={handleDecline}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors absolute top-2 right-2 md:relative md:top-auto md:right-auto"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
