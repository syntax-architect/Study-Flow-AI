import React from 'react';
import { m, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error';
export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex flex-col items-center gap-3 pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={`pointer-events-auto shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 text-sm font-bold border backdrop-blur-md max-w-sm w-full
              ${toast.type === 'success' ? 'bg-[#2563EB]/95 text-white border-[#2563EB]' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/95 text-white border-amber-500' : ''}
              ${toast.type === 'error' ? 'bg-[#F43F5E]/95 text-white border-[#F43F5E]' : ''}
              ${toast.type === 'info' ? 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-50 border-[rgba(0,0,0,0.05)]' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1 text-center">{toast.message}</span>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
