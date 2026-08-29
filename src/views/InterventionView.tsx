import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FlaggedStudent } from '../types';
import { AlertTriangle, ShieldAlert, GraduationCap, ChevronRight, Activity, Mail } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { ToastType } from '../components/common/Toast';
import { SEO } from '../components/common/SEO';

interface InterventionViewProps {
  onNotify: (msg: string, type: ToastType) => void;
  isTeacherMode?: boolean;
}

export const InterventionView: React.FC<InterventionViewProps> = ({ onNotify, isTeacherMode }) => {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<FlaggedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlaggedStudents = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch('/api/db/intervention/flagged-students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        onNotify('Failed to fetch intervention data', 'error');
      }
    } catch (err) {
      console.error(err);
      onNotify('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTeacherMode) {
      fetchFlaggedStudents();
    }
  }, [isTeacherMode]);

  if (!isTeacherMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
        <div className="text-center text-zinc-500">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-500" />
          <h2 className="text-xl font-medium">Access Denied</h2>
          <p className="mt-2 text-sm">Please enable Teacher Mode in settings to access the Intervention Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <SEO title="Interventions" description="Active student alerts and interventions." />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-xl text-red-500">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Predictive Intervention
            </h2>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            AI-driven identification of students consistently failing foundational concepts. Proactively intervene before exams.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-red-500 border-zinc-200 dark:border-zinc-800 rounded-full animate-spin"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-[24px] p-8 text-center">
          <GraduationCap className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-green-700 dark:text-green-400">All Clear</h3>
          <p className="text-green-600 dark:text-green-500/80 mt-1">No students are currently flagged as high-risk.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {students.map((student) => (
              <m.div
                key={student.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white dark:bg-[#111113] border border-red-100 dark:border-red-900/30 shadow-sm rounded-[24px] overflow-hidden"
              >
                <div className="p-5 md:p-6 flex flex-col md:flex-row gap-6">
                  {/* Student Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-full flex items-center justify-center uppercase border border-red-100 dark:border-red-900/50">
                          {student.name.charAt(8)}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{student.name}</h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 uppercase tracking-wider">
                            Risk Score: {student.riskScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Failed Topics List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Failed Foundational Concepts</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {student.failedTopics.map((topic, idx) => {
                          const total = topic.flaggedCount + topic.verifiedCount;
                          const failRate = Math.round((topic.flaggedCount / total) * 100);
                          
                          return (
                            <div key={idx} className="bg-red-50/50 dark:bg-[#1A1010] border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
                              <div className="flex items-start gap-2 z-10">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-[13px] font-semibold text-red-900 dark:text-red-200 leading-tight">
                                  {topic.title}
                                </span>
                              </div>
                              <div className="flex items-center justify-between z-10 pl-5.5">
                                <span className="text-[11px] text-red-700/70 dark:text-red-400/70 font-medium">
                                  Failed {topic.flaggedCount} of {total} attempts
                                </span>
                                <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md">
                                  {failRate}% FAIL
                                </span>
                              </div>
                              {/* Progress bar background */}
                              <div className="absolute bottom-0 left-0 h-1 bg-red-500/20 w-full">
                                <div className="h-full bg-red-500" style={{ width: `${failRate}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Sidebar */}
                  <div className="md:w-64 flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-zinc-100 dark:border-white/5 pt-4 md:pt-0 md:pl-6">
                    <button 
                      onClick={() => onNotify(`Intervention initiated for ${student.name}`, 'success')}
                      className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-95"
                    >
                      <Mail className="w-4 h-4" />
                      Intervene Now
                    </button>
                    <button 
                      onClick={() => onNotify('Generating remedial worksheet (Demo)', 'info')}
                      className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
                    >
                      <GraduationCap className="w-4 h-4" />
                      Generate Worksheet
                    </button>
                  </div>
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
