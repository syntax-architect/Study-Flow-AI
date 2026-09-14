import React, { useState, useEffect } from 'react';
import { UnitOverview, TopicMastery } from '../types';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/sound';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ToastType } from '../components/common/Toast';

interface HubViewProps {
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  onNavigateToChatWithQuery: (query: string) => void;
  soundEnabled?: boolean;
  onNotify: (msg: string, type: ToastType) => void;
}

import { SEO } from '../components/common/SEO';
import { Card } from '../components/common/Card';

export const HubView: React.FC<HubViewProps> = ({
  selectedUnitId,
  onSelectUnit,
  onNavigateToChatWithQuery,
  soundEnabled = true,
  onNotify,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const userId = user?.id;

  const [units, setUnits] = useState<UnitOverview[]>([
    {
      id: 'unit-active',
      name: 'Active Studies',
      course: 'Recent AI Verification Topics',
      overallMastery: 0,
      masteryDelta: 0,
      totalTimeHours: 0,
      totalTimeMinutes: 0,
      questionsCompleted: 0,
      questionsTotal: 0,
      topics: [],
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        const token = await getToken();
        const res = await fetch(`/api/db/mastery/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          let totalVerified = 0,
            totalFlagged = 0;
          const topics: TopicMastery[] = data.map((row: any) => {
            const vCount = row.verified_count || 0;
            const fCount = row.flagged_count || 0;
            const total = vCount + fCount;
            totalVerified += vCount;
            totalFlagged += fCount;
            const score = total > 0 ? Math.round((vCount / total) * 100) : 0;
            return {
              id: row.topic_id,
              unit: 'unit-active',
              title: row.topic_title || row.topic_id,
              subtitle: total === 0 ? 'Not attempted' : `${vCount} verified | ${fCount} flagged`,
              status: total === 0 ? 'PENDING' : score >= 75 ? 'VERIFIED' : 'FLAGGED',
              auditDetails:
                total === 0
                  ? 'Start solving problems to earn mastery.'
                  : 'Based on your recent problem solving history.',
              masteryScore: score,
            };
          });
          const totalQ = totalVerified + totalFlagged;
          setUnits([
            {
              id: 'unit-active',
              name: 'Active Studies',
              course: 'Recent AI Verification Topics',
              overallMastery: totalQ > 0 ? Math.round((totalVerified / totalQ) * 100) : 0,
              masteryDelta: 0,
              totalTimeHours: 0,
              totalTimeMinutes: 0,
              questionsCompleted: totalQ,
              questionsTotal: totalQ,
              topics,
            },
          ]);
        }
        const recRes = await fetch(`/api/db/recommendations/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (recRes.ok) setRecommendations(await recRes.json());
      } catch (err) {
        console.error('Failed to load hub data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, getToken]);

  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const [selectedTopic, setSelectedTopic] = useState<TopicMastery | null>(null);
  const [auditingTopicId, setAuditingTopicId] = useState<string | null>(null);
  const [topicAuditResult, setTopicAuditResult] = useState<any>(null);

  const handleRunTopicAudit = async (topic: TopicMastery) => {
    playSound('click', soundEnabled);
    setAuditingTopicId(topic.id);
    setTopicAuditResult(null);
    try {
      const res = await fetch('/api/audit-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic.title,
          subtitle: topic.subtitle,
          unit: currentUnit.name,
        }),
      });
      setTopicAuditResult(await res.json());
      playSound('success', soundEnabled);
    } catch (err: any) {
      onNotify(err.message || 'Audit failed', 'warning');
      playSound('warning', soundEnabled);
    } finally {
      setAuditingTopicId(null);
    }
  };

  return (
    <div className="pt-8 md:pt-16 px-4 md:px-6 max-w-6xl mx-auto space-y-10 pb-32 font-['Plus_Jakarta_Sans']">
      <SEO title="Hub" description="Your active studies and mastery dashboard." />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#71717A] uppercase tracking-widest mb-1">
            {currentUnit.course}
          </p>
          <h2 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#18181B] dark:text-white tracking-tight">
            {currentUnit.name}
          </h2>
        </div>
        <div className="relative">
          <select
            value={currentUnit.id}
            onChange={(e) => onSelectUnit(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium py-2 px-3 rounded-lg pr-8 cursor-pointer appearance-none outline-none premium-transition"
            id="unit-selector"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.course})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Hero Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="p-0 border-none">
          <div className="flex flex-col lg:flex-row h-full">
            <div className="w-full lg:w-[55%] p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-[rgba(226,232,240,0.5)] dark:border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between mb-8">
                <span className="inline-flex items-center gap-1.5 bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                  HACKATHON DEMO · NCERT PHYSICS CH 5
                </span>
                <span className="text-[11px] text-[#71717A] font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#2563EB]" /> Dual AI Pipeline
                </span>
              </div>

              <div className="space-y-4">
                <h2 className="font-['Outfit'] text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#18181B] dark:text-white leading-[1.05]">
                  Honest AI Study Assistant
                  <br /> <span className="text-[#2563EB]">for JEE & NEET</span>
                </h2>
                <p className="text-base text-[#71717A] dark:text-zinc-400 leading-relaxed max-w-md">
                  Standard AI chatbots give wrong physics derivations confidently. In exams where 1
                  mark shifts your college rank, that's dangerous.
                </p>
              </div>

              {/* Demo buttons */}
              <div className="pt-10 flex flex-col items-start gap-3">
                <span className="font-['JetBrains_Mono'] text-[#71717A] font-semibold text-[11px] uppercase tracking-wider">
                  Try Scenarios:
                </span>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onNavigateToChatWithQuery(
                        'A car of mass 1500 kg drives at 20 m/s on a flat circular turn of radius 50 m with μ_s = 0.6. Will it skid? Show step-by-step NCERT derivation.',
                      );
                    }}
                    className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-3 rounded-xl active:translate-y-[1px] transition-all cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" /> In-Scope NCERT (Verified)
                  </button>
                  <button
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onNavigateToChatWithQuery(
                        'A block of 5 kg rests on a rough table with μ_s = 0.4. A horizontal force of 10 N is applied. Is static friction equal to 0.4 × 5 × 9.8 = 19.6 N?',
                      );
                    }}
                    className="flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-sm px-5 py-3 rounded-xl active:translate-y-[1px] transition-all cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4" /> Misconception Trap (Warning)
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Engine Features (Asymmetric Right) */}
            <div className="w-full lg:w-[45%] flex flex-col bg-[#F9FAFB] dark:bg-[#09090B]">
              <div className="flex-1 p-8 md:p-12 border-b border-[rgba(226,232,240,0.5)] dark:border-[rgba(255,255,255,0.05)] group/solver hover:bg-white dark:hover:bg-[#121214] transition-colors duration-500 flex flex-col justify-center">
                <div className="font-['Outfit'] font-semibold text-[#2563EB] flex items-center gap-3 text-lg mb-2">
                  <span className="w-8 h-8 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 flex items-center justify-center text-[12px] font-bold group-hover/solver:scale-110 transition-transform">
                    1
                  </span>
                  Solver AI
                </div>
                <p className="text-[#71717A] text-sm leading-relaxed pl-11">
                  Retrieves NCERT Class 11 textbook text & drafts step-by-step math derivations.
                </p>
              </div>
              <div className="flex-1 p-8 md:p-12 group/critic hover:bg-white dark:hover:bg-[#121214] transition-colors duration-500 flex flex-col justify-center">
                <div className="font-['Outfit'] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-3 text-lg mb-2">
                  <span className="w-8 h-8 rounded-full border border-rose-500/20 bg-rose-500/10 flex items-center justify-center text-[12px] font-bold group-hover/critic:scale-110 transition-transform">
                    2
                  </span>
                  Critic AI Fact-Checker
                </div>
                <p className="text-[#71717A] text-sm leading-relaxed pl-11">
                  Audits each line against NCERT. If unbacked: warns{' '}
                  <span className="text-rose-500 font-semibold">"Ask a teacher instead!"</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </m.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <Card className="min-h-[160px] md:min-h-full">
            <div className="flex items-center justify-between">
              <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#71717A] tracking-widest uppercase">
                Overall Mastery
              </span>
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-end gap-2">
                <span className="font-['JetBrains_Mono'] text-5xl md:text-6xl font-extrabold text-[#18181B] dark:text-white tracking-tight leading-none">
                  {currentUnit.overallMastery}%
                </span>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-1 rounded-md mb-1.5">
                  +{currentUnit.masteryDelta}%
                </span>
              </div>
              <div className="w-full bg-[#F9FAFB] dark:bg-[#09090B] h-2 rounded-full overflow-hidden border border-[rgba(226,232,240,0.5)] dark:border-[rgba(255,255,255,0.05)]">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentUnit.overallMastery}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-[#2563EB] h-full rounded-full"
                />
              </div>
            </div>
          </Card>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <Card className="min-h-[160px] md:min-h-full">
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#71717A] tracking-widest uppercase">
              Total Time
            </span>
            <div className="mt-8 font-['JetBrains_Mono'] text-5xl md:text-6xl font-extrabold text-[#18181B] dark:text-white tracking-tight leading-none">
              {currentUnit.totalTimeHours}
              <span className="text-2xl text-[#71717A] ml-1 font-medium font-sans">h</span>{' '}
              {currentUnit.totalTimeMinutes}
              <span className="text-2xl text-[#71717A] ml-1 font-medium font-sans">m</span>
            </div>
          </Card>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <Card className="min-h-[160px] md:min-h-full">
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#71717A] tracking-widest uppercase">
              Questions
            </span>
            <div className="mt-8 flex items-end gap-1 font-['JetBrains_Mono'] text-5xl md:text-6xl font-extrabold text-[#18181B] dark:text-white tracking-tight leading-none">
              <span>{currentUnit.questionsCompleted}</span>
              <span className="text-2xl font-bold text-[#71717A] mb-1">
                /{currentUnit.questionsTotal}
              </span>
            </div>
          </Card>
        </m.div>
      </div>

      {/* Focus Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Focus On This
            </h3>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Weakest topics
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, i) => (
              <m.div
                key={rec.topic_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 line-clamp-2">
                      {rec.topic_title || rec.topic_id}
                    </h4>
                    <p className="text-xs font-semibold text-zinc-400 mt-2 uppercase tracking-wider">
                      Mastery: <span className="font-bold text-rose-500">{rec.masteryScore}%</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onNavigateToChatWithQuery(
                        `Give me a practice question on ${rec.topic_title || rec.topic_id} similar to common JEE/NEET traps.`,
                      );
                    }}
                    className="mt-6 bg-zinc-100 dark:bg-white/5 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 text-zinc-700 dark:text-zinc-300 hover:text-rose-500 border border-black/5 dark:border-white/10 hover:border-rose-500/30 text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer w-full flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Practice Now
                  </button>
                </Card>
              </m.div>
            ))}
          </div>
        </div>
      )}

      {/* Conceptual Mastery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] text-xl font-bold text-[#18181B] dark:text-white tracking-tight">
            Conceptual Mastery
          </h3>
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#71717A] tracking-wider uppercase">
            Solver-Critic Audit Log
          </span>
        </div>
        <div className="space-y-2">
          {currentUnit.topics.map((topic) => {
            const isVerified = topic.status === 'VERIFIED';
            return (
              <div
                key={topic.id}
                className="group relative rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-black/5 dark:border-white/10 p-1 overflow-hidden hover:shadow-lg transition-all duration-500 cursor-pointer"
                onClick={() => {
                  setSelectedTopic(topic);
                  setTopicAuditResult(null);
                }}
              >
                <div className="rounded-[calc(1rem-4px)] bg-white dark:bg-[#151518] border border-black/5 dark:border-white/5 p-4 md:p-5 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {topic.title}
                    </h4>
                    <p className="text-sm text-zinc-500 mt-1">{topic.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isVerified ? (
                      <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-widest uppercase shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                      </div>
                    ) : (
                      <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-widest uppercase shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" /> FLAGGED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic Audit Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-lg w-full"
          >
            <div className="p-6 md:p-8 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Conceptual Audit · {currentUnit.name}
                  </span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                    {selectedTopic.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-0.5">{selectedTopic.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg p-2 cursor-pointer active:scale-95 premium-transition flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${selectedTopic.status === 'VERIFIED' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}
              >
                {selectedTopic.status === 'VERIFIED' ? (
                  <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                )}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider">
                    Status: {selectedTopic.status}
                  </div>
                  <div className="text-sm font-medium mt-0.5 opacity-80">
                    {selectedTopic.auditDetails}
                  </div>
                </div>
              </div>

              {topicAuditResult && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-2 text-sm">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Live Critic AI Audit
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {topicAuditResult.auditDetails}
                  </p>
                  {topicAuditResult.insights && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider">
                        Key Insights:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-500 dark:text-zinc-400 text-[13px]">
                        {topicAuditResult.insights.map((ins: string, idx: number) => (
                          <li key={idx}>{ins}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => handleRunTopicAudit(selectedTopic)}
                  disabled={auditingTopicId === selectedTopic.id}
                  className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] premium-transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {auditingTopicId === selectedTopic.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Running Audit...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Run Live Audit
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedTopic(null);
                    onNavigateToChatWithQuery(
                      `Can you break down the step-by-step derivation and key concepts for ${selectedTopic.title} in ${currentUnit.name}?`,
                    );
                  }}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold py-3 px-4 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] premium-transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <MessageSquare className="w-4 h-4" /> Ask AI Derivation
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
};
