import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ToastType } from '../components/common/Toast';
import { SEO } from '../components/common/SEO';
import { Check, MessageSquare, AlertTriangle } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';

interface ReviewItem {
  id: string;
  user_id: string;
  chat_id: string;
  message_id: string;
  question: string;
  critic_notes: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
}

export interface MentorReviewViewProps {
  onNotify: (msg: string, type: ToastType) => void;
  isTeacherMode?: boolean;
}

export const MentorReviewView: React.FC<MentorReviewViewProps> = ({ onNotify, isTeacherMode }) => {
  const { getToken } = useAuth();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState<{ [key: string]: string }>({});

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch('/api/db/review-queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      } else {
        onNotify('Failed to fetch review queue', 'warning');
      }
    } catch (err) {
      console.error(err);
      onNotify('Error fetching review queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTeacherMode) {
      fetchQueue();
    }
  }, [isTeacherMode]);

  const handleResolve = async (reviewId: string) => {
    try {
      setResolvingId(reviewId);
      const token = await getToken();
      const notes = resolutionInput[reviewId] || 'Reviewed and resolved by mentor.';
      
      const res = await fetch(`/api/db/review-queue/${reviewId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolutionNotes: notes })
      });

      if (res.ok) {
        onNotify('Review resolved successfully', 'success');
        setQueue(prev => prev.map(item => item.id === reviewId ? { ...item, status: 'resolved', resolution_notes: notes } : item));
      } else {
        onNotify('Failed to resolve review', 'error');
      }
    } catch (err) {
      console.error(err);
      onNotify('Error resolving review', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  if (!isTeacherMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
        <div className="text-center text-zinc-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-medium">Access Denied</h2>
          <p className="mt-2 text-sm">Please enable Teacher Mode in settings to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <SEO title="Mentor Review" description="Review flagged interactions." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Mentor Review Queue</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Review flagged student interactions and provide guidance.</p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Queue'}
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {queue.length === 0 && !loading && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] rounded-xl"
            >
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">All caught up!</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">There are no pending items in the review queue.</p>
            </m.div>
          )}

          {queue.map((item) => (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-5 rounded-xl border ${item.status === 'resolved' ? 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.05] opacity-60' : 'bg-white dark:bg-[#1A1A1B] border-amber-200 dark:border-amber-900/50 shadow-sm'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Student Question</span>
                  <span className="text-xs text-zinc-500 ml-2">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                {item.status === 'resolved' && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md">Resolved</span>
                )}
                {item.status !== 'resolved' && (
                  <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-md">Pending Review</span>
                )}
              </div>
              
              <div className="mb-4">
                <div className="p-3 bg-zinc-100 dark:bg-black/20 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 font-medium">
                  "{item.question}"
                </div>
              </div>

              {item.critic_notes && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Critic's Flags</h4>
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
                    {item.critic_notes}
                  </div>
                </div>
              )}

              {item.status === 'resolved' ? (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mentor Resolution</h4>
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-200">
                    {item.resolution_notes}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Add Resolution Note</h4>
                  <textarea
                    value={resolutionInput[item.id] || ''}
                    onChange={(e) => setResolutionInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="E.g., The student confused velocity and acceleration here. I've sent a clarification."
                    className="w-full p-3 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleResolve(item.id)}
                      disabled={resolvingId === item.id}
                      className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {resolvingId === item.id ? 'Resolving...' : <><Check className="w-4 h-4" /> Resolve Flag</>}
                    </button>
                  </div>
                </div>
              )}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
