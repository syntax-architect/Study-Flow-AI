import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Terminal,
} from 'lucide-react';
import { StudySparkle } from './StudySparkle';

interface GeminiThoughtCapsuleProps {
  isLoading: boolean;
  status?: 'STREAMING' | 'VERIFYING' | 'VERIFIED' | 'FLAGGED';
  streamingReasoning?: string;
  defaultExpanded?: boolean;
}

export const GeminiThoughtCapsule: React.FC<GeminiThoughtCapsuleProps> = ({
  isLoading,
  status = 'STREAMING',
  streamingReasoning = '',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || isLoading);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        const diff = (Date.now() - startTimeRef.current) / 1000;
        setElapsedSeconds(Number(diff.toFixed(1)));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  // Keep expanded open while loading
  useEffect(() => {
    if (isLoading) {
      setExpanded(true);
    }
  }, [isLoading]);

  const isVerifying = status === 'VERIFYING';
  const isStreaming = status === 'STREAMING';
  const isVerified = status === 'VERIFIED';
  const isFlagged = status === 'FLAGGED';

  const getStageTitle = () => {
    if (isLoading) {
      if (isStreaming) return 'Drafting first-principles solution...';
      if (isVerifying) return 'Auditing line-by-line against Ground Truth...';
      return 'Analyzing question context...';
    }
    if (isVerified) return 'Line-by-line ground truth verification passed';
    if (isFlagged) return 'Critic flagged potential discrepancy';
    return 'Execution pipeline completed';
  };

  return (
    <div className="w-full my-3">
      {/* Pill Trigger Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="group relative flex items-center justify-between gap-3 px-3.5 py-2 rounded-full bg-white/70 dark:bg-[#18181B]/70 hover:bg-white dark:hover:bg-[#202124] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all text-left text-xs"
      >
        {/* Shimmering border glow when loading */}
        {isLoading && (
          <div className="absolute -inset-[1px] bg-gradient-to-r from-[#4B90FF] via-[#9B72CB] to-[#FF5546] rounded-full blur-[2px] opacity-40 animate-pulse pointer-events-none" />
        )}

        <div className="relative z-10 flex items-center gap-2">
          <StudySparkle size={14} isAnimated={isLoading} />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <span>Thinking</span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                  {elapsedSeconds > 0 ? `${elapsedSeconds}s` : '...'}
                </span>
              </span>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-300">
                Thought for {elapsedSeconds > 0 ? `${elapsedSeconds}s` : '2.1s'}
              </span>
            )}
          </span>
          <span className="hidden sm:inline-block text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[280px]">
            • {getStageTitle()}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-1 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
            {expanded ? 'Hide' : 'Show'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 p-4 rounded-2xl bg-white/50 dark:bg-[#121316]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-sm space-y-4">
              
              {/* Dual-AI Pipeline Progression */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                    Dual-AI Pipeline Trace
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                    Ground Truth: NCERT & University STEM
                  </span>
                </div>

                <div className="flex items-center justify-between relative px-2">
                  {/* Pipeline Connector */}
                  <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-black/10 dark:bg-white/10 -translate-y-1/2 z-0">
                    <m.div
                      className="h-full bg-gradient-to-r from-[#4B90FF] to-[#9B72CB]"
                      initial={{ width: '0%' }}
                      animate={{
                        width: isStreaming ? '33%' : isVerifying ? '66%' : '100%',
                      }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                  </div>

                  {/* Node 1: Solver */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white/80 dark:bg-[#121316] px-2 py-0.5 rounded-lg">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md ${
                        isStreaming
                          ? 'bg-[#4B90FF] shadow-blue-500/30 ring-4 ring-blue-500/20'
                          : 'bg-[#4B90FF]'
                      }`}
                    >
                      {isStreaming ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <BookOpen className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                      Solver
                    </span>
                  </div>

                  {/* Node 2: Critic Review */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white/80 dark:bg-[#121316] px-2 py-0.5 rounded-lg">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-colors ${
                        isStreaming
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                          : isVerifying
                            ? 'bg-[#9B72CB] shadow-purple-500/30 ring-4 ring-purple-500/20'
                            : 'bg-[#9B72CB]'
                      }`}
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isStreaming
                          ? 'text-zinc-400 dark:text-zinc-600'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      Critic
                    </span>
                  </div>

                  {/* Node 3: Decision Gate */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white/80 dark:bg-[#121316] px-2 py-0.5 rounded-lg">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-colors ${
                        isStreaming || isVerifying
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                          : isVerified
                            ? 'bg-emerald-500 shadow-emerald-500/30'
                            : 'bg-amber-500 shadow-amber-500/30'
                      }`}
                    >
                      {isStreaming || isVerifying ? (
                        <CheckCircle2 className="w-3 h-3 opacity-50" />
                      ) : isVerified ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isStreaming || isVerifying
                          ? 'text-zinc-400 dark:text-zinc-600'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      Decision Gate
                    </span>
                  </div>
                </div>
              </div>

              {/* Critic Live Terminal Trace */}
              {streamingReasoning && (
                <div className="rounded-xl overflow-hidden bg-black/90 text-emerald-400 border border-emerald-500/20 p-3 font-mono text-[11px] shadow-inner">
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10 opacity-70">
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-bold tracking-wider text-white">
                      Critic Ground-Truth Reasoning Trace
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/30">
                    {streamingReasoning}
                    {isLoading && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-400 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
