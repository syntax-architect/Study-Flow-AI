import React, { useState } from 'react';
import { Shield, Brain, Zap, LineChart, CheckCircle2, ChevronDown } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
      >
        <h4 className="text-lg font-bold text-zinc-900 dark:text-white pr-4">{question}</h4>
        <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 md:px-8 pb-6 md:pb-8 text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800 pt-4">
              {answer}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MarketingGrid = () => {
  return (
    <div className="w-full bg-white dark:bg-zinc-950 font-['Plus_Jakarta_Sans']">

      {/* 1. Trusted By Section */}
      <section className="py-16 md:py-24 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-8">
            Trusted by researchers and students at top institutions
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 dark:opacity-40 grayscale">
            <span className="text-xl font-bold font-serif text-zinc-800 dark:text-white">Stanford</span>
            <span className="text-xl font-bold font-serif text-zinc-800 dark:text-white tracking-tighter">MIT</span>
            <span className="text-xl font-bold font-serif text-zinc-800 dark:text-white uppercase">Berkeley</span>
            <span className="text-xl font-bold font-serif text-zinc-800 dark:text-white">Harvard</span>
            <span className="text-xl font-bold font-serif text-zinc-800 dark:text-white">Caltech</span>
          </div>
        </div>
      </section>

      {/* 2. Alternating Features (Zig-Zag) */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-32">

          {/* Feature 1: Verification */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                <Shield className="w-4 h-4" />
                <span>Deterministic Verification</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                Stop guessing. Start proving.
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Traditional AI models hallucinate mathematical derivations because they predict text, not logic. StudyFlow couples a generative synthesizer with a strict symbolic verifier. Every step must achieve formal mathematical closure.
              </p>
              <ul className="space-y-3 pt-4">
                {[
                  'Zero hallucinations in calculus and linear algebra.',
                  'Real-time symbolic engine checks every step.',
                  'Eliminates the "confident but wrong" AI problem.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-10 shadow-sm flex flex-col justify-center overflow-hidden aspect-[4/3]">
                {/* Mock UI: Verification Dashboard */}
                <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                  {/* Mock Header */}
                  <div className="h-12 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-4 gap-3 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                    <div className="text-xs font-medium text-zinc-400 tracking-wide uppercase">Proof Session #894</div>
                  </div>
                  {/* Mock Content */}
                  <div className="flex flex-col md:flex-row p-4 gap-4 bg-white dark:bg-zinc-950">
                    {/* Left side: Math Generation */}
                    <div className="flex-1 space-y-4">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Candidate Derivation</div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg font-mono text-sm text-zinc-600 dark:text-zinc-300 space-y-2 border border-zinc-100 dark:border-zinc-800">
                        <div><span className="text-blue-500">let</span> f(x) = x² + 2x</div>
                        <div><span className="text-blue-500">derive</span> d/dx</div>
                        <div>{'->'} 2x + 2</div>
                      </div>
                    </div>
                    {/* Right side: Verification Status */}
                    <div className="w-full md:w-1/3 flex flex-col gap-3">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Z3 Engine Status</div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Mathematically Sound</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Cognitive Graph (Reversed) */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                <LineChart className="w-4 h-4" />
                <span>Cognitive Graph</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                Trace your mastery. <br /> Predict your exams.
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                StudyFlow builds a persistent Bayesian graph of your knowledge across all subjects. It maps your strong foundations, detects memory decay, and schedules highly targeted interventions just before you forget.
              </p>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-10 shadow-sm flex items-center justify-center overflow-hidden aspect-[4/3]">
                {/* Mock UI: Cognitive Graph Dashboard */}
                <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Knowledge Retention Matrix</div>
                    <div className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Last 30 Days</div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Multivariable Calculus', val: '84%', w: 'w-[84%]', color: 'bg-blue-500' },
                      { label: 'Newtonian Mechanics', val: '62%', w: 'w-[62%]', color: 'bg-emerald-500' },
                      { label: 'Organic Chemistry', val: '41%', w: 'w-[41%]', color: 'bg-amber-500' },
                    ].map((stat, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-600 dark:text-zinc-400">{stat.label}</span>
                          <span className="text-zinc-900 dark:text-white">{stat.val}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <m.div
                            initial={{ width: 0 }}
                            whileInView={{ width: stat.val }}
                            transition={{ duration: 1, delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className={`h-full rounded-full ${stat.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. 3-Column Benefits Grid */}
      <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Built for institutional rigor</h2>
            <p className="text-zinc-600 dark:text-zinc-400">Everything you need to excel in university-level STEM, wrapped in a distraction-free interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'Socratic Methodology',
                desc: 'StudyFlow won\'t just give you the answer. It guides you to the solution through targeted questioning.'
              },
              {
                icon: Zap,
                title: 'Instant Execution',
                desc: 'Generate practice problems, parse complex PDFs, and verify proofs in milliseconds.'
              },
              {
                icon: Shield,
                title: 'Privacy First',
                desc: 'Your academic data and learning patterns are encrypted and never sold to third parties.'
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FAQ Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is StudyFlow free to use?',
                a: 'We offer a generous free tier for students covering basic problem-solving. Advanced features like longitudinal mastery tracking and the formal verification API require a Pro subscription.'
              },
              {
                q: 'How does the Dual-AI verification work?',
                a: 'Instead of relying on a single language model that guesses the next token, StudyFlow generates potential solution paths and feeds them into a strict symbolic solver (like Z3). Only mathematically sound paths are displayed to you.'
              },
              {
                q: 'Does it support university-level physics and chemistry?',
                a: 'Yes. Our engine is specifically calibrated for advanced AP, undergraduate, and graduate-level STEM courses, including multivariable calculus, organic chemistry, and Newtonian mechanics.'
              },
              {
                q: 'Can I upload my own lecture notes or PDFs?',
                a: 'Absolutely. You can drop any PDF or image of your textbook into the chat, and StudyFlow will parse the equations and terminology to align its derivations with your specific curriculum.'
              }
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Final CTA */}
      <section className="py-32 bg-zinc-950 border-t border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-zinc-950 to-zinc-950" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            Ready to master the hardest subjects?
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-medium">
            Join thousands of students who trust StudyFlow for their most critical academic challenges.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#/sign-up"
              onClick={() => {
                document.getElementById('login-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.1)] w-full sm:w-auto"
            >
              Get Started for Free
            </a>
            <a 
              href="#/sign-in"
              onClick={() => {
                document.getElementById('login-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-zinc-900 border border-zinc-800 text-white font-bold hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              Log In
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
