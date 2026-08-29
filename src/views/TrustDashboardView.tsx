import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

interface TrustStats {
  overallVerifiedRate: number;
  totalQueries: number;
  criticCaughtErrors: number;
}

export const TrustDashboardView: React.FC = () => {
  const [stats, setStats] = useState<TrustStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/trust-stats');
        if (!res.ok) throw new Error('Failed to fetch trust stats');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0B] text-zinc-900 dark:text-zinc-100 p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            AI Trust & Transparency
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Live metrics from our Dual-Engine AI architecture, ensuring every answer is verified against standard curriculum.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Verified Accuracy</h3>
              <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.overallVerifiedRate.toFixed(1)}%
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Answers verified correct by Critic AI
              </p>
            </div>

            <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Questions Tested</h3>
              <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.totalQueries.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Total queries evaluated in real-time
              </p>
            </div>

            <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Critic Interventions</h3>
              <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.criticCaughtErrors.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Hallucinations/Errors caught before serving
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
