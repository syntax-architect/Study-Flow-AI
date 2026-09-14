import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Moon,
  Sun,
  Layers,
  Activity,
  Bot
} from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { MarketingGrid } from '../components/auth/MarketingGrid';
import { dark } from '@clerk/themes';

interface LoginViewProps {
  soundEnabled: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ isDarkMode, onToggleDarkMode }) => {
  const [isSignUp, setIsSignUp] = useState(() => window.location.hash.includes('sign-up'));

  useEffect(() => {
    const handleHashChange = () => setIsSignUp(window.location.hash.includes('sign-up'));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const STAGGER = 0.08;

  return (
    <div className="h-[100dvh] overflow-y-auto w-full bg-white dark:bg-zinc-950 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-blue-600/20 selection:text-blue-600">

      {/* Theme Toggle */}
      {onToggleDarkMode && (
        <button
          onClick={onToggleDarkMode}
          className="fixed top-6 right-6 z-50 p-2.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-300 text-zinc-900 dark:text-zinc-100 group"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
          ) : (
            <Moon className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-500" />
          )}
        </button>
      )}

      {/* Hero Section (Split Screen) */}
      <div className="w-full flex flex-col md:flex-row relative z-10 border-b border-zinc-200 dark:border-zinc-800">

        {/* Left Column: Hero & Narrative */}
        <div className="w-full md:w-1/2 lg:w-[60%] flex flex-col justify-center py-16 md:py-32 px-8 md:px-12 lg:px-24 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">

          <div className="max-w-2xl w-full">
            {/* Brand */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mb-12"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">
                StudyFlow
              </span>
            </m.div>

            {/* Hero Content */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: STAGGER * 2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-[4.2rem] font-bold text-zinc-900 dark:text-white leading-[1.05] tracking-tight mb-6">
                Mathematical precision.
                <br />
                <span className="text-zinc-500 dark:text-zinc-400">Zero assumptions.</span>
              </h1>
            </m.div>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: STAGGER * 3, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed mb-12"
            >
              A Dual-AI solver engineered for academic rigor. We separate creative generation
              from formal verification to ensure every derivation is structurally sound.
            </m.p>

            {/* Value Props - Minimalist List */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: STAGGER * 4 }}
              className="flex flex-col gap-6"
            >
              {[
                {
                  icon: ShieldCheck,
                  title: 'Formal Verification',
                  desc: 'Every step is audited against established axioms.',
                },
                {
                  icon: Layers,
                  title: 'Longitudinal Tracking',
                  desc: 'Monitor cognitive mastery across domains.',
                },
                {
                  icon: Activity,
                  title: 'Adaptive Interventions',
                  desc: 'Targeted support directly at the point of confusion.',
                },
              ].map((prop, idx) => (
                <m.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: STAGGER * 5 + idx * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                    <prop.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="pt-1.5">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-1">
                      {prop.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{prop.desc}</p>
                  </div>
                </m.div>
              ))}
            </m.div>
          </div>
        </div>

        {/* Right Column: Authentication Panel */}
        <div className="w-full md:w-1/2 lg:w-[40%] bg-white dark:bg-zinc-950 flex items-center justify-center p-8 md:p-12 relative overflow-hidden min-h-[600px]">
          <div className="w-full max-w-[400px] relative z-10 bg-white dark:bg-zinc-900 rounded-[1.5rem] p-2 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
            {isSignUp ? (
              <SignUp
                routing="hash"
                forceRedirectUrl="/"
                signInUrl="#/sign-in"
                appearance={{
                  baseTheme: isDarkMode ? dark : undefined,
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none bg-transparent m-0 p-4 w-full',
                    headerTitle:
                      "text-[24px] font-bold text-zinc-900 dark:text-white tracking-tight",
                    headerSubtitle:
                      "text-zinc-500 dark:text-zinc-400 text-sm mt-1",
                    socialButtonsBlockButton:
                      'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all rounded-[0.75rem] h-11 mb-3 shadow-sm',
                    socialButtonsBlockButtonText: 'font-semibold text-sm',
                    dividerLine: 'bg-zinc-200 dark:bg-zinc-800',
                    dividerText:
                      'text-zinc-500 dark:text-zinc-400 font-medium text-xs tracking-wide uppercase',
                    formFieldLabel:
                      'text-zinc-900 dark:text-zinc-300 font-semibold text-xs mb-1.5',
                    formFieldInput:
                      'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[0.75rem] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-600 h-11 px-4 transition-all text-sm shadow-sm',
                    formButtonPrimary:
                      'bg-blue-600 border-none rounded-[0.75rem] text-white hover:bg-blue-700 transition-colors h-11 font-semibold text-sm mt-4 shadow-sm active:translate-y-[1px]',
                    footerAction: 'bg-transparent mt-6',
                    footerActionText: 'text-zinc-500 dark:text-zinc-400 font-medium text-sm',
                    footerActionLink:
                      'text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-600 font-bold ml-1 transition-colors text-sm',
                  },
                }}
              />
            ) : (
              <SignIn
                routing="hash"
                forceRedirectUrl="/"
                signUpForceRedirectUrl="/"
                signUpUrl="#/sign-up"
                appearance={{
                  baseTheme: isDarkMode ? dark : undefined,
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none bg-transparent m-0 p-4 w-full',
                    headerTitle:
                      "text-[24px] font-bold text-zinc-900 dark:text-white tracking-tight",
                    headerSubtitle:
                      "text-zinc-500 dark:text-zinc-400 text-sm mt-1",
                    socialButtonsBlockButton:
                      'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all rounded-[0.75rem] h-11 mb-3 shadow-sm',
                    socialButtonsBlockButtonText: 'font-semibold text-sm',
                    dividerLine: 'bg-zinc-200 dark:bg-zinc-800',
                    dividerText:
                      'text-zinc-500 dark:text-zinc-400 font-medium text-xs tracking-wide uppercase',
                    formFieldLabel:
                      'text-zinc-900 dark:text-zinc-300 font-semibold text-xs mb-1.5',
                    formFieldInput:
                      'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[0.75rem] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-600 h-11 px-4 transition-all text-sm shadow-sm',
                    formButtonPrimary:
                      'bg-blue-600 border-none rounded-[0.75rem] text-white hover:bg-blue-700 transition-colors h-11 font-semibold text-sm mt-4 shadow-sm active:translate-y-[1px]',
                    footerAction: 'bg-transparent mt-6',
                    footerActionText: 'text-zinc-500 dark:text-zinc-400 font-medium text-sm',
                    footerActionLink:
                      'text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-600 font-bold ml-1 transition-colors text-sm',
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Extended Marketing Content */}
      <MarketingGrid />
    </div>
  );
};

