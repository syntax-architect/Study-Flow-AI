import React, { useState } from 'react';
import { SolverResult } from '../../types';
import { ShieldCheck, AlertTriangle, BookOpen, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '@clerk/clerk-react';

interface Props {
  data: Omit<Partial<SolverResult>, 'criticAuditStatus'> & { criticAuditStatus?: 'VERIFIED' | 'FLAGGED' | 'VERIFYING' | 'STREAMING' };
  preprocessMath: (s: string) => string;
  userId?: string;
  chatId?: string | null;
  messageId?: string;
  onNotify?: (msg: string, type: 'success' | 'warning' | 'info') => void;
}

const StepItem = ({ step, idx, isVerifying, isStreaming, preprocessMath, globalCitation }: any) => {
  const [expanded, setExpanded] = useState(true);
  
  const citation = step.citation || globalCitation;
  const isVerified = step.verified;

  return (
    <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-2xl relative overflow-hidden flex flex-col transition-all">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
            Step {step.stepNumber || idx + 1}: {step.title || 'Step'}
          </span>
          {!isVerifying && !isStreaming && (
            <span className={`flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
              isVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isVerified ? 'Verified' : 'Flagged'}
            </span>
          )}
        </div>
        <div className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-black/5 dark:border-white/5"
          >
            <div className="p-4 space-y-4 pt-2">
              {step.description && (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                  >
                    {preprocessMath(step.description)}
                  </ReactMarkdown>
                </div>
              )}
              
              {step.mathBlock && (
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl overflow-x-auto text-sm">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                  >
                    {preprocessMath(step.mathBlock)}
                  </ReactMarkdown>
                </div>
              )}

              {!isVerifying && !isStreaming && (
                <div className={`mt-4 rounded-xl border p-3 ${
                  isVerified 
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/20' 
                    : 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-500/20'
                }`}>
                  <div className="flex flex-col gap-2">
                    {citation && (
                      <div className="flex items-start gap-2 text-xs">
                        <BookOpen className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
                        <span className="opacity-80">
                          <strong>Grounded on:</strong> {citation.textbook}, {citation.chapter} {citation.ncertPage && `(Page ${citation.ncertPage})`}
                        </span>
                      </div>
                    )}
                    
                    {!isVerified && step.criticFeedback && (
                      <div className={`flex items-start gap-2 text-xs ${citation ? 'mt-1 pt-2 border-t border-rose-500/10' : ''}`}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                        <div className="text-rose-700 dark:text-rose-300 leading-relaxed">
                          <strong>Critic Feedback:</strong> 
                          <div className="mt-1">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                            >
                              {preprocessMath(step.criticFeedback)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isVerified && (
                      <div className={`flex items-start gap-2 text-xs ${citation ? 'mt-1 pt-2 border-t border-emerald-500/10' : ''}`}>
                        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                          Step passed strict line-by-line verification.
                        </span>
                      </div>
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
}

export const DualAiResponseView: React.FC<Props> = React.memo(({ data, preprocessMath, userId, chatId, messageId, onNotify }) => {
  const isVerified = data.criticAuditStatus === 'VERIFIED';
  const isVerifying = data.criticAuditStatus === 'VERIFYING';
  const isStreaming = data.criticAuditStatus === 'STREAMING';
  
  const [isFlagging, setIsFlagging] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const { getToken } = useAuth();

  const handleFlagForReview = async () => {
    if (!userId || !chatId || !messageId) {
      onNotify?.("Missing chat context to flag message.", "warning");
      return;
    }
    
    setIsFlagging(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const response = await fetch('/api/db/flag-for-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          chatId,
          messageId,
          question: data.query,
          criticNotes: data.criticAuditNotes
        })
      });
      
      if (!response.ok) throw new Error('Failed to flag message');
      
      setIsFlagged(true);
      onNotify?.("Flagged for Teacher Review successfully!", "success");
    } catch (err) {
      console.error(err);
      onNotify?.("Failed to flag. Please try again.", "warning");
    } finally {
      setIsFlagging(false);
    }
  };
  
  return (
    <div className="space-y-4 w-full">
      {/* First Principles Timeline Visualizer */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 p-4 rounded-2xl mb-4">
        <h4 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-widest mb-3">AI Execution Pipeline</h4>
        <div className="flex items-center justify-between relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5 -translate-y-1/2 z-0">
             <m.div 
               className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
               initial={{ width: '0%' }}
               animate={{ width: isVerifying ? '50%' : '100%' }}
               transition={{ duration: 1.5, ease: 'easeInOut' }}
             />
          </div>

          {/* Node 1: Solver */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
            <m.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg ${isStreaming ? 'bg-blue-500 shadow-blue-500/30 ring-4 ring-blue-500/20' : 'bg-blue-500 shadow-blue-500/30'}`}
            >
              {isStreaming ? <RefreshCw className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
            </m.div>
            <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Solver</span>
          </div>

          {/* Node 2: Critic Review */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
            <m.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-500 ${
                isStreaming ? 'bg-black/5 dark:bg-white/5 text-zinc-900 dark:text-zinc-50/30' : isVerifying ? 'bg-blue-500 shadow-blue-500/30 ring-4 ring-blue-500/20' : 'bg-blue-500 shadow-blue-500/30'
              }`}
            >
              {(isStreaming) ? <RefreshCw className="w-3 h-3 opacity-50" /> : isVerifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            </m.div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${(isStreaming) ? 'text-zinc-900 dark:text-zinc-50 opacity-50' : 'text-zinc-900 dark:text-zinc-50'}`}>Critic</span>
          </div>

          {/* Node 3: Decision Gate */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-[#09090b] px-2">
            <m.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-500 ${
                (isVerifying || isStreaming) ? 'bg-black/5 dark:bg-white/5 text-zinc-900 dark:text-zinc-50/30' : isVerified ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30'
              }`}
            >
              {(isVerifying || isStreaming) ? <CheckCircle2 className="w-3 h-3 opacity-50" /> : isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            </m.div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${(isVerifying || isStreaming) ? 'text-zinc-900 dark:text-zinc-50 opacity-50' : 'text-zinc-900 dark:text-zinc-50'}`}>Decision Gate</span>
          </div>
        </div>
      </div>

      {/* Badge Header */}
      <div className={`p-4 rounded-2xl flex items-start gap-3 shadow-sm relative overflow-hidden ${
        isVerifying 
          ? 'bg-blue-500/10 border border-blue-500/20'
          : isVerified 
            ? 'bg-emerald-500/10 border border-emerald-500/20 shimmer-effect' 
            : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        {isStreaming ? (
          <RefreshCw className="w-6 h-6 text-zinc-900 dark:text-zinc-50/30 mt-0.5 flex-shrink-0 relative z-10" />
        ) : isVerifying ? (
          <RefreshCw className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0 relative z-10 animate-spin" />
        ) : isVerified ? (
          <ShieldCheck className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0 relative z-10" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0 relative z-10" />
        )}
        <div className="relative z-10">
          <h3 className={`font-bold text-sm ${
            isStreaming
              ? 'text-zinc-900 dark:text-zinc-50 opacity-70'
              : isVerifying 
                ? 'text-blue-600 dark:text-blue-400'
                : isVerified 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-amber-600 dark:text-amber-400'
          }`}>
            {isStreaming
              ? 'Awaiting Solver to finish...'
              : isVerifying 
                ? 'Verifying against Ground Truth...' 
                : isVerified 
                  ? 'Verified by Critic AI' 
                  : 'Honest Warning from Critic AI'}
          </h3>
          <div className="text-xs opacity-90 mt-1.5 leading-relaxed">
            {isStreaming
              ? 'The Critic AI will begin verification once the derivation is complete.'
              : isVerifying
                ? 'The Critic AI is currently line-by-line verifying this derivation against standard NCERT curriculum.'
                : isVerified 
                  ? 'This derivation has been line-by-line verified against standard NCERT curriculum.' 
                  : (
                    <>
                      <span className="font-semibold block mb-1">Here's specifically why:</span>
                      {data.criticAuditNotes ? (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                        >
                          {preprocessMath(data.criticAuditNotes)}
                        </ReactMarkdown>
                      ) : (
                        'This question involves out-of-scope concepts or tricky assumptions. Do not trust the derivation completely.'
                      )}
                    </>
                  )}
          </div>
          {!isVerified && !isVerifying && onNotify && userId && (
            <button 
              onClick={handleFlagForReview}
              disabled={isFlagging || isFlagged}
              className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isFlagged 
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 opacity-70 cursor-not-allowed' 
                  : 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-95'
              }`}
            >
              {isFlagging ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isFlagged ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {isFlagged ? 'Flagged for Teacher' : 'Flag for Teacher Review'}
            </button>
          )}
        </div>
      </div>

      {/* Citation if verified */}
      {isVerified && data.citation && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl flex items-center gap-2 text-xs text-zinc-900 dark:text-zinc-50 opacity-80">
          <BookOpen className="w-4 h-4 text-[#2563EB]" />
          <span>Source: {data.citation.textbook}, {data.citation.chapter} {data.citation.ncertPage && `(Page ${data.citation.ncertPage})`}</span>
        </div>
      )}

      {/* Summary */}
      {/* Derivation Title */}
      <h2 className="font-bold text-xl mb-3 pr-8 relative">
        {data.title || 'Solving...'}
        {isStreaming && <span className="absolute ml-2 animate-pulse bg-white dark:bg-[#09090b] w-2 h-5 inline-block top-1"></span>}
      </h2>
      
      {data.summary && (
        <div className="text-sm opacity-80 mb-6 leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          >
            {preprocessMath(data.summary)}
          </ReactMarkdown>
        </div>
      )}

      {/* Steps */}
      {data.steps && data.steps.length > 0 && (
        <div className="space-y-4">
          {data.steps.map((step: any, idx: number) => (
            <StepItem 
              key={idx} 
              step={step} 
              idx={idx} 
              isVerifying={isVerifying} 
              isStreaming={isStreaming} 
              preprocessMath={preprocessMath} 
              globalCitation={data.citation} 
            />
          ))}
        </div>
      )}

      {/* Final Equation */}
      {data.finalEquation && (
        <div className="mt-4 p-4 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/20 text-center shadow-sm">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          >
            {preprocessMath(data.finalEquation)}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.messageId === nextProps.messageId && 
         prevProps.userId === nextProps.userId &&
         prevProps.chatId === nextProps.chatId &&
         prevProps.onNotify === nextProps.onNotify &&
         prevProps.preprocessMath === nextProps.preprocessMath &&
         JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});
