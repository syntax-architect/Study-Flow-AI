import React, { useState } from 'react';
import { m } from 'motion/react';
import { SEO } from '../components/common/SEO';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export const WaitlistView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError('');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0B] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <SEO title="Waitlist" description="Join the waitlist for StudyFlow AI to get early access." />
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-xl w-full bg-white dark:bg-[#131314] rounded-[32px] p-8 md:p-12 shadow-xl shadow-black/5 border border-black/5 dark:border-white/5 text-center"
      >
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8"
        >
          <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </m.div>

        <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-zinc-900 dark:text-zinc-50">
          Join the Future of Learning
        </h1>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
          StudyFlow AI is currently in invite-only beta. Join the waitlist to be the first to experience AI-powered mastery and dual-agent verification.
        </p>

        {submitted ? (
          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center gap-4"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">You're on the list!</h3>
              <p className="text-emerald-600 dark:text-emerald-500 text-sm mt-1">Keep an eye on {email} for your invite.</p>
            </div>
          </m.div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
            <div className="text-left mb-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest pl-4">
                Early Access
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={loading}
                className="w-full bg-zinc-100 dark:bg-[#1E1F20] border border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-[#131314] rounded-full py-4 pl-6 pr-32 outline-none transition-all text-zinc-900 dark:text-zinc-50 disabled:opacity-50"
                required
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Joining...' : <>Join <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            )}
          </form>
        )}
      </m.div>
    </div>
  );
};
