import React, { useState } from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Settings } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { playSound } from '../../utils/sound';

interface HeaderProps {
  currentUnit: string;
  onSelectUnit: (unitId: string) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ soundEnabled = true, currentUnit, onSelectUnit }) => {
  const [showInvestorDeck, setShowInvestorDeck] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('main') || window;
      const scrollY = scrollContainer instanceof Window ? window.scrollY : scrollContainer.scrollTop;
      setScrolled(scrollY > 10);
    };
    const scrollContainer = document.querySelector('main') || window;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 px-4 py-2.5 transition-all duration-300 pointer-events-none ${
      scrolled ? 'bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 shadow-sm' : ''
    }`}>
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-end pointer-events-auto">
        
        {/* Live System Telemetry & Investor Deck Modal Trigger */}
        <div className="flex items-center gap-2">

          <m.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => {
              playSound('click', soundEnabled);
              setShowInvestorDeck(true);
            }}
            className="hidden md:flex items-center gap-2 bg-black/40 border border-white/10 shadow-sm text-zinc-300 hover:text-white hover:bg-black/60 hover:border-white/20 text-xs font-medium px-4 py-2 rounded-full premium-transition group"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#60A5FA] group-hover:animate-pulse" />
            <span>SaaS Vision</span>
          </m.button>

        </div>
      </div>

      {/* Silicon Valley Investor Pitch & Product Moat Modal */}
      <AnimatePresence>
        {showInvestorDeck && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="ethereal-card-shell max-w-lg w-full relative"
            >
              <div className="ethereal-card-core space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/30 text-[#60A5FA] flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-lg text-white">
                        StudyFlow AI • SaaS Thesis
                      </h3>
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">Target: $312M → $3B (India test-prep)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInvestorDeck(false)}
                    className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full cursor-pointer active:scale-95 premium-transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
                    <span className="font-bold text-[#F43F5E] uppercase tracking-widest text-xs block">
                      Problem: AI Hallucinations
                    </span>
                    <p className="text-zinc-300">
                      Standard LLMs answer fast and sound confident even when wrong. In competitive exams (JEE/NEET), losing 4 marks can theoretically shift a student's college rank by thousands.
                    </p>
                  </div>

                  <div className="bg-[#2563EB]/10 border border-[#2563EB]/30 p-4 rounded-2xl space-y-2">
                    <span className="font-bold text-[#60A5FA] uppercase tracking-widest text-xs block">
                      Product Moat: Dual-AI Fact-Checker
                    </span>
                    <p className="text-zinc-200 font-medium">
                      Two-pass architecture: Solver AI derives from NCERT text, while Critic AI line-audits every step. If even 1 step is unbacked, we output a clear <span className="font-bold text-[#F43F5E]">"Do Not Trust / Ask Teacher"</span> warning.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center pt-2">
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                      <span className="block font-bold text-lg text-white">3.2M+</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Aspirants</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                      <span className="block font-bold text-lg text-[#60A5FA]">2-Agent</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Verify</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                      <span className="block font-bold text-lg text-white">NCERT</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Grounded</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowInvestorDeck(false)}
                    className="bg-white text-black font-bold text-sm px-6 py-2.5 rounded-xl premium-transition cursor-pointer active:scale-95 hover:bg-zinc-200"
                  >
                    Close Executive Summary
                  </button>
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
});
