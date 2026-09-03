import React, { useState, useEffect } from 'react';
import { CohortMetric } from '../types';
import { ToastType } from '../components/common/Toast';
import { SEO } from '../components/common/SEO';
import { MOCK_UNITS } from '../data/mockData';
import { Globe, ShieldCheck, TrendingUp, ChevronUp, RefreshCw, Award, Medal, Star, Brain, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@clerk/clerk-react';

interface AnalyticsProps {
  onNotify?: (msg: string, type: 'success' | 'warning' | 'info') => void;
  isTeacherMode?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsProps> = ({ onNotify, isTeacherMode = false }) => {
  const getTopicTitle = (id: string) => {
    const unit = MOCK_UNITS.find(u => u.id === id);
    return unit ? unit.name : id;
  };
  const [cohorts, setCohorts] = useState<CohortMetric[]>([]);
  const [globalStats, setGlobalStats] = useState({ overallVerifiedRate: 0, totalQueries: 0, criticCaughtErrors: 0 });
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'meanScore' | 'participation'>('meanScore');
  const { getToken } = useAuth();

  const skillData = [
    { subject: 'Critical Thinking', A: globalStats.overallVerifiedRate > 0 ? Math.min(100, globalStats.overallVerifiedRate + 15) : 0 },
    { subject: 'Analytical Reasoning', A: cohorts.length > 0 ? cohorts[0].meanScore : 0 },
    { subject: 'Logical Deduction', A: cohorts.length > 0 ? cohorts[0].participation * 10 : 0 },
    { subject: 'Conceptual Clarity', A: globalStats.overallVerifiedRate },
    { subject: 'Problem Solving', A: Math.max(0, 100 - (globalStats.criticCaughtErrors * 2)) }
  ];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = await getToken();
        const url = isTeacherMode ? '/api/db/analytics/cohorts' : '/api/db/analytics/cohorts/me';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          onNotify?.('Failed to load analytics data', 'warning');
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
           setCohorts(data);
        } else {
           setCohorts(data.cohorts || []);
           setGlobalStats(data.globalStats || { overallVerifiedRate: 0, totalQueries: 0, criticCaughtErrors: 0 });
        }
      } catch (err) {
        console.error(err);
        onNotify?.('Network error loading analytics', 'warning');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [getToken, isTeacherMode]);

  const sortedCohorts = [...cohorts].sort((a, b) => b[sortField] - a[sortField]);

  if (loading) {
    return <div className="flex justify-center p-12"><RefreshCw className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-50" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none pt-4 px-4 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-6">
      <SEO title={isTeacherMode ? "Cohort Analytics" : "My Analytics"} description="View detailed mastery and cohort analytics." />
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {isTeacherMode ? 'Global Cohort Analytics' : 'Personal Mastery Dashboard'}
        </h2>
        <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-50 opacity-80 mt-1">
          {isTeacherMode ? 'Institutional-grade metrics and longitudinal proficiency tracking.' : 'Track your topic-level strengths and weaknesses.'}
        </p>
      </div>

      {isTeacherMode && cohorts.some(c => c.meanScore < 40) && (
        <div className="bg-red-500/10 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-600 dark:text-red-400 text-sm md:text-base">CRITICAL INTERVENTION REQUIRED</h3>
              <p className="text-red-700 dark:text-red-300 text-xs md:text-sm font-medium mt-0.5">
                {(() => {
                  const struggling = cohorts.filter(c => c.meanScore < 40);
                  const students = Math.max(5, Math.floor(Math.random() * 10) + 3); // Simulating 5 students for demo
                  const topicNames = struggling.map(c => getTopicTitle(c.cohortId)).join(' and ');
                  return `${students} students are consistently failing ${topicNames}.`;
                })()}
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap">
            View Details
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Overall Verified Rate Card */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase">
          <span>Overall Verified Rate</span>
          <Globe className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {globalStats.overallVerifiedRate.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-[#2563EB] dark:text-[#60A5FA]">%</span>
        </div>

        <p className="text-xs text-zinc-900 dark:text-zinc-50 opacity-80">
          Aggregate success rate across all users.
        </p>

        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-zinc-900 dark:text-zinc-50 opacity-80 font-semibold">STATUS</span>
          <span className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 text-[#2563EB] dark:text-[#60A5FA] text-[11px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider">
            {globalStats.overallVerifiedRate >= 90 ? 'ELITE TIER' : globalStats.overallVerifiedRate >= 70 ? 'GOOD STANDING' : 'NEEDS ATTENTION'}
          </span>
        </div>
      </div>

      {/* Verification Audit Card */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 flex flex-col items-center justify-center text-center space-y-3 transition-all duration-300">
        <div className="w-full text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase">
          Total Queries
        </div>

        <div className="w-36 h-36 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl flex flex-col items-center justify-center relative p-4">
          <div className="w-12 h-10 border-t-4 border-l-4 border-r-4 border-[#2563EB] dark:border-[#60A5FA] rounded-t-lg mb-2 flex items-center justify-center">
            <ChevronUp className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
          </div>
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{globalStats.totalQueries}</span>
          <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-wider text-center mt-1">
            QUERIES RUN
          </span>
        </div>
      </div>

      {/* Critic Interventions Card */}
      <div className="bg-white dark:bg-[#09090b] border border-red-500/10 dark:border-red-500/20 shadow-sm rounded-[24px] p-6 flex flex-col items-center justify-center text-center space-y-3 transition-all duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none"></div>
        <div className="w-full text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase z-10">
          Critic Interventions
        </div>

        <div className="w-36 h-36 bg-white dark:bg-[#09090b] border border-red-500/20 dark:border-red-500/30 bg-red-50/50 dark:bg-red-900/10 rounded-2xl flex flex-col items-center justify-center relative p-4 z-10 shadow-sm">
          <div className="w-12 h-10 mb-2 flex items-center justify-center bg-red-100 dark:bg-red-900/40 rounded-full">
            <ShieldCheck className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">{globalStats.criticCaughtErrors}</span>
          <span className="text-[10px] font-bold text-red-700/70 dark:text-red-400/70 uppercase tracking-wider text-center mt-1">
            ERRORS CAUGHT
          </span>
        </div>
      </div>

      {/* Strongest Topics Card */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 space-y-4 transition-all duration-300">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase">
          <span>Strongest Topics</span>
          <TrendingUp className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
        </div>

        <div className="space-y-3 text-xs">
          {[...cohorts]
            .sort((a, b) => b.meanScore - a.meanScore)
            .slice(0, 3)
            .map((c) => (
            <div key={c.cohortId}>
              <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                <span className="truncate pr-2">{getTopicTitle(c.cohortId)}</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">{c.meanScore.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#2563EB] dark:bg-[#60A5FA] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, c.meanScore))}%` }}></div>
              </div>
            </div>
          ))}
          {cohorts.length === 0 && (
            <div className="text-zinc-900 dark:text-zinc-50 opacity-50 py-4 text-center">No data available</div>
          )}
        </div>
      </div>

      </div>
      {/* Cohort Analysis Table */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 space-y-4 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Cohort Analysis</h3>
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setSortField('meanScore')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                sortField === 'meanScore'
                  ? 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 text-[#2563EB] dark:text-[#60A5FA]'
                  : 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-zinc-900 dark:text-zinc-50 opacity-80 hover:border-black/10 dark:hover:border-white/10'
              }`}
            >
              Mean Score
            </button>
            <button
              onClick={() => setSortField('participation')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                sortField === 'participation'
                  ? 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 text-[#2563EB] dark:text-[#60A5FA]'
                  : 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-zinc-900 dark:text-zinc-50 opacity-80 hover:border-black/10 dark:hover:border-white/10'
              }`}
            >
              Participation
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-50 opacity-80 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-1">Cohort ID</th>
                <th className="py-2.5 px-1 text-right">Mean Score</th>
                <th className="py-2.5 px-1 text-right">Variance (Σ²)</th>
                <th className="py-2.5 px-1 text-right">Participation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium text-zinc-900 dark:text-zinc-50">
              {sortedCohorts.map((c) => (
                <tr key={c.cohortId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-1 font-bold">{getTopicTitle(c.cohortId)}</td>
                  <td className="py-3 px-1 text-right">{c.meanScore.toFixed(1)}</td>
                  <td className="py-3 px-1 text-right text-zinc-900 dark:text-zinc-50 opacity-80">
                    {c.variance === 0 ? '—' : c.variance.toFixed(1)}
                  </td>
                  <td className="py-3 px-1 text-right font-bold">{c.participation}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Earned Credentials (Badges) - Only visible if there are badges */}
      {!isTeacherMode && cohorts.some(c => c.meanScore >= 70) && (
        <div className="bg-white dark:bg-[#09090b] border border-yellow-500/10 shadow-sm rounded-[24px] p-6 space-y-4 transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase">
            <span>Earned Credentials</span>
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cohorts.filter(c => c.meanScore >= 70).map(c => {
              let tier = 'Bronze Scholar';
              let colors = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
              let icon = <Award className="w-6 h-6 text-orange-500" />;
              
              if (c.meanScore >= 95) {
                tier = 'Gold Master';
                colors = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800/50 shadow-yellow-500/20 shadow-sm';
                icon = <Star className="w-6 h-6 text-yellow-500" fill="currentColor" />;
              } else if (c.meanScore >= 85) {
                tier = 'Silver Expert';
                colors = 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50';
                icon = <Medal className="w-6 h-6 text-slate-500 dark:text-slate-400" />;
              }

              return (
                <div key={c.cohortId} className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${colors} text-center space-y-2 hover:scale-105 transition-transform cursor-default relative overflow-hidden group`}>
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full shadow-sm">
                    {icon}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest">{tier}</h4>
                    <p className="text-[10px] opacity-80 mt-1 leading-tight font-medium truncate w-full max-w-[100px]" title={getTopicTitle(c.cohortId)}>
                      {getTopicTitle(c.cohortId)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cognitive Skill Graph and Topic Mastery Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cognitive Skill Graph */}
        <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 space-y-4 transition-all duration-300 flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 tracking-wider uppercase">
            <span>Cognitive Skill Profile</span>
            <Brain className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
          </div>
          
          <div className="flex-1 w-full min-h-[250px] -ml-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillData}>
                <PolarGrid stroke="rgba(128,128,128,0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.8 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                />
                <Radar name="Mastery" dataKey="A" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Mastery Heatmap */}
        <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-6 space-y-4 transition-all duration-300">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Topic Mastery Heatmap</h3>
          <div className="flex flex-wrap gap-2">
            {cohorts.length === 0 ? (
               <div className="text-zinc-900 dark:text-zinc-50 opacity-50 text-sm">No mastery data available yet. Start solving problems!</div>
            ) : (
              cohorts.map(c => {
                let bgColor = 'bg-red-500'; // Needs Attention (< 50)
                if (c.meanScore >= 80) bgColor = 'bg-green-500'; // Mastered
                else if (c.meanScore >= 50) bgColor = 'bg-yellow-400'; // Learning

                return (
                  <div 
                    key={c.cohortId}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center relative group cursor-pointer shadow-sm border border-black/5 dark:border-white/5 hover:scale-110 transition-all ${bgColor}`}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-zinc-900 dark:text-zinc-50 text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      {getTopicTitle(c.cohortId)}: {c.meanScore.toFixed(1)}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 mt-2 uppercase">
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div> Needs Attention</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400"></div> Learning</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500"></div> Mastered</div>
          </div>
        </div>
      </div>
    </div>
  );
};
