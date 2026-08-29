import React, { useState } from 'react';
import { VaultProblem } from '../types';
import { ExternalLink, Flag, Compass, CheckCircle2, AlertOctagon, RotateCcw, HelpCircle, Layers, Sparkles } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/sound';

import { ToastType } from '../components/common/Toast';
import { SEO } from '../components/common/SEO';

interface VaultViewProps {
  problems: VaultProblem[];
  onSelectProblem?: (problem: VaultProblem) => void;
  soundEnabled?: boolean;
  onNotify?: (msg: string, type: ToastType) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({ problems, soundEnabled = true, onNotify }) => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    problems[0]?.id || 'problem-402'
  );

  const activeProblem =
    problems && problems.length > 0 
      ? problems.find((p) => p.id === selectedProblemId) || problems[0]
      : null;

  // Interactive Physics Simulator Parameters
  const [mass, setMass] = useState(activeProblem?.params?.mass || 0);
  const [velocity, setVelocity] = useState(activeProblem?.params?.velocity || 0);
  const [radius, setRadius] = useState(activeProblem?.params?.radius || 0);
  const [mu, setMu] = useState(activeProblem?.params?.mu || 0);

  // Flashcard Flip State
  const [isFlipped, setIsFlipped] = useState(false);

  // Sync state when switching problems
  const handleSelectProblem = (p: VaultProblem) => {
    playSound('click', soundEnabled);
    setSelectedProblemId(p.id);
    setMass(p.params.mass);
    setVelocity(p.params.velocity);
    setRadius(p.params.radius);
    setMu(p.params.mu);
    setIsFlipped(false);
  };

  // Calculations: g = 9.8 m/s^2
  const g = 9.8;
  const fc = (mass * Math.pow(velocity, 2)) / (radius || 1); // Centripetal Force (N)
  const fMax = mu * mass * g; // Max Static Friction (N)
  const willSkid = fc > fMax;

  if (!activeProblem) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <SEO title="Vault" />
        <Compass className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-500">No Problems Found</h3>
        <p className="text-gray-400">Add problems to your vault to see them here.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-6">
      <SEO title="Vault" description="Your saved problems and simulations vault." />
      {/* Problem Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-zinc-900 dark:text-zinc-50 opacity-80 font-semibold flex-shrink-0">Problem Vault:</span>
        {problems.map((p) => (
          <m.button
            key={p.id}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => handleSelectProblem(p)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              p.id === activeProblem.id
                ? 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50'
                : 'bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-zinc-900 dark:text-zinc-50 opacity-80 hover:border-black/10 dark:hover:border-white/10'
            }`}
          >
            {p.problemNumber}
          </m.button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="text-xs text-zinc-900 dark:text-zinc-50 opacity-80 font-medium flex items-center gap-1.5">
        <span>Physics</span>
        <span>›</span>
        <span>Mechanics</span>
        <span>›</span>
        <span className="font-bold text-zinc-900 dark:text-zinc-50">{activeProblem.problemNumber}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
      {/* Interactive 3D Flip Flashcard / Question Card */}
      <div className="perspective-1000">
        <m.div
          onClick={() => {
            playSound('click', soundEnabled);
            setIsFlipped(!isFlipped);
          }}
          whileHover={{ scale: 1.01 }}
          className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-5 space-y-3 cursor-pointer relative transition-all"
        >
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
              {isFlipped ? 'NCERT Conceptual Fact-Check' : 'Original Question (Tap to Flip Concept Card)'}
            </h3>
            <span className="text-[10px] bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" /> Tap to Flip
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <m.div
                key="front"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 90 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-50 leading-relaxed font-medium">
                  {activeProblem.question}
                </p>
              </m.div>
            ) : (
              <m.div
                key="back"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 rounded-2xl space-y-2 text-xs"
              >
                <div className="font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Core NCERT Principle:
                </div>
                <p className="text-zinc-900 dark:text-zinc-50 leading-relaxed font-medium">
                  {activeProblem.factCheck || activeProblem.solution.summary}
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </div>

      {/* References Card */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-5 space-y-4">
        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase tracking-wider">
          References
        </div>

        <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-zinc-900 dark:text-zinc-50">
              {activeProblem.reference.textbook}
            </div>
            <div className="text-zinc-900 dark:text-zinc-50 opacity-80">
              {activeProblem.reference.chapter}, {activeProblem.reference.page}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <m.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playSound('click', soundEnabled);
              onNotify?.(`Opening textbook source reference: ${activeProblem.reference.textbook}`, 'info');
            }}
            className="w-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-[#2563EB] dark:text-[#60A5FA] text-xs font-bold py-3 px-4 rounded-2xl hover:border-black/10 dark:hover:border-white/10 active:bg-zinc-50/50 dark:bg-zinc-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Textbook Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </m.button>

          <m.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playSound('warning', soundEnabled);
              onNotify?.('Issue reported to StudyFlow AI Audit Panel.', 'success');
            }}
            className="w-full bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm text-zinc-900 dark:text-zinc-50 text-xs font-bold py-3 px-4 rounded-2xl hover:border-black/10 dark:hover:border-white/10 active:bg-zinc-50/50 dark:bg-zinc-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50 opacity-80" />
            <span>Report Issue</span>
          </m.button>
        </div>
      </div>

      </div>
        <div className="space-y-6">
      {/* Interactive Physics Diagram & Vector Simulator */}
      <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-[24px] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
              Interactive Force Vector Diagram
            </span>
          </div>

          <button
            onClick={() => {
              playSound('click', soundEnabled);
              setMass(activeProblem.params.mass);
              setVelocity(activeProblem.params.velocity);
              setRadius(activeProblem.params.radius);
              setMu(activeProblem.params.mu);
            }}
            className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50 opacity-80 hover:opacity-100 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults
          </button>
        </div>

        {/* Dynamic Physics Simulation SVG Canvas with Motion Animations */}
        <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[220px] overflow-hidden">
          <svg className="w-full max-w-xs h-44 overflow-visible" viewBox="0 0 200 200">
            {/* Circular Track */}
            <circle
              cx="100"
              cy="100"
              r="65"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="12"
              strokeDasharray="4 4"
            />
            <circle cx="100" cy="100" r="65" fill="none" stroke="#F1F5F9" strokeWidth="10" />

            {/* Radius Line */}
            <line
              x1="100"
              y1="100"
              x2="165"
              y2="100"
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <text x="125" y="95" className="text-[10px] fill-[#64748B] font-bold">
              r = {radius}m
            </text>

            {/* Car Position & Animated Vector Elements */}
            <g transform="translate(165, 100)">
              {/* Skidding Dust Smoke FX if Skidding */}
              {willSkid && (
                <g>
                  <circle cx="5" cy="-5" r="4" fill="#F43F5E" opacity="0.4" className="animate-ping" />
                  <circle cx="12" cy="5" r="3" fill="#F43F5E" opacity="0.3" className="animate-ping" />
                </g>
              )}

              {/* Car Body */}
              <rect
                x="-12"
                y="-8"
                width="24"
                height="16"
                rx="3"
                fill={willSkid ? '#F43F5E' : 'currentColor'}
                className="transition-colors duration-200 text-zinc-900 dark:text-zinc-50"
              />
              <circle cx="-7" cy="8" r="3" className="fill-[#09090b]" />
              <circle cx="7" cy="8" r="3" className="fill-[#09090b]" />

              {/* Centripetal Force Vector (Inward) */}
              <m.line
                x1="0"
                y1="0"
                initial={{ x2: -Math.min(50, fc / 100) }}
                animate={{ x2: -Math.min(50, fc / 100) }}
                y2="0"
                className="stroke-[#09090b]"
                strokeWidth="2.5"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <text x="-45" y="-12" className="text-[9px] fill-[#09090b] font-extrabold">
                F_c ({Math.round(fc)}N)
              </text>

              {/* Velocity Vector (Tangential) */}
              <m.line
                x1="0"
                y1="0"
                x2="0"
                initial={{ y2: -Math.min(45, velocity * 1.5) }}
                animate={{ y2: -Math.min(45, velocity * 1.5) }}
                stroke="#2563EB"
                strokeWidth="2.5"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <text x="5" y="-20" className="text-[9px] fill-[#2563EB] font-bold">
                v={velocity}m/s
              </text>
            </g>

            {/* Center Axis */}
            <circle cx="100" cy="100" r="4" fill="#2563EB" />
          </svg>

          {/* Skidding Status Indicator Badge */}
          <div className="mt-3">
            <AnimatePresence mode="wait">
              {willSkid ? (
                <m.div
                  key="skid"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/40 text-xs font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 tracking-wider uppercase shadow-xs"
                >
                  <AlertOctagon className="w-4 h-4 text-[#F43F5E] animate-bounce" />
                  TRAJECTORY UNSTABLE: CAR WILL SKID!
                </m.div>
              ) : (
                <m.div
                  key="safe"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/40 text-xs font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 tracking-wider uppercase shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  SAFE TRAJECTORY: FRICTION HOLDS
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Controls Sliders */}
        <div className="space-y-3 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* Speed Control */}
            <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm p-3 rounded-2xl">
              <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                <span>Speed (v)</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">{velocity} m/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={velocity}
                onChange={(e) => setVelocity(Number(e.target.value))}
                className="w-full accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>

            {/* Radius Control */}
            <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm p-3 rounded-2xl">
              <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                <span>Radius (r)</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">{radius} m</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>

            {/* Mass Control */}
            <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm p-3 rounded-2xl">
              <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                <span>Mass (m)</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">{mass} kg</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="100"
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="w-full accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>

            {/* Friction Control */}
            <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm p-3 rounded-2xl">
              <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                <span>Friction (μ_s)</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">{mu}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.05"
                value={mu}
                onChange={(e) => setMu(Number(e.target.value))}
                className="w-full accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>
          </div>

          {/* Mathematical Calculations Breakdown */}
          <div className="bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase block">
                Required F_c
              </span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-50 text-sm">
                {Math.round(fc).toLocaleString()} N
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 opacity-80 uppercase block">
                Max Static Friction f_max
              </span>
              <span className="font-extrabold text-[#2563EB] dark:text-[#60A5FA] text-sm">
                {Math.round(fMax).toLocaleString()} N
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
};