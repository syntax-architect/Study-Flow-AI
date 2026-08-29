import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Users, Send, Bot, User, Sparkles } from 'lucide-react';
import { StudyRoomMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/common/SEO';

export const StudyRoomView: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<StudyRoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('study-room', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.values(newState).flatMap(p => p.map((u: any) => u.name));
        setParticipants([...new Set(users)] as string[]);
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: user.firstName || 'Student',
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const newMsg: StudyRoomMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: user.firstName || 'Student',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setInput('');
    setMessages(prev => [...prev, newMsg]);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: newMsg,
      });
    }

    await triggerAIModeration([...messages, newMsg]);
  };

  const triggerAIModeration = async (currentMessages: StudyRoomMessage[]) => {
    try {
      const token = await getToken();
      
      const currentParticipants = participants.includes('Rahul (Peer)') 
        ? [...participants, 'Rahul (Peer)'] 
        : participants;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: currentMessages,
          currentParticipants,
        })
      });
      
      const data = await res.json();
      if (data.response) {
        const aiMsg: StudyRoomMessage = {
          id: crypto.randomUUID(),
          user_id: 'ai-moderator',
          name: 'AI Moderator',
          content: data.response,
          timestamp: new Date().toISOString(),
          isAI: true
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, aiMsg]);
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'message',
              payload: aiMsg,
            });
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Moderation error:', err);
    }
  };

  const simulatePeer = () => {
    setIsSimulating(true);
    setParticipants(prev => [...new Set([...prev, 'Rahul (Peer)'])]);
    
    setTimeout(() => {
      const peerMsg: StudyRoomMessage = {
        id: crypto.randomUUID(),
        user_id: 'simulated-peer',
        name: 'Rahul (Peer)',
        content: "Hey everyone! I'm stuck on Newton's second law. Can anyone explain how inertia relates to it?",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, peerMsg]);
      triggerAIModeration([...messages, peerMsg]);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto w-full h-[calc(100vh-8rem)] flex gap-6">
      <SEO title="Study Room" description="Collaborate with peers and AI in real-time." />
      {/* Sidebar - Participants */}
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-zinc-900 dark:text-zinc-50">
          <Users className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
          <h2 className="font-bold text-lg">Study Room</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Online Now</div>
          <AnimatePresence>
            {participants.map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5"
              >
                <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 dark:bg-[#60A5FA]/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{p}</span>
                <div className="w-2 h-2 rounded-full bg-green-500 ml-auto shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button 
          onClick={simulatePeer}
          disabled={isSimulating}
          className="mt-4 w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {isSimulating ? 'Peer Active' : 'Simulate Peer'}
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            Physics 101 Cohort
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wider">Live</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-4">
              <Sparkles className="w-12 h-12 opacity-20" />
              <p>Welcome to the Study Room! Say hi to start learning together.</p>
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.user_id === user?.id;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">
                    {msg.isAI ? (
                      <span className="flex items-center gap-1 text-[#2563EB] dark:text-[#60A5FA]">
                        <Bot className="w-3 h-3" /> Moderator
                      </span>
                    ) : (
                      msg.name
                    )}
                  </span>
                  <div 
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      isMe 
                        ? 'bg-[#2563EB] text-white rounded-tr-sm shadow-md shadow-blue-500/20' 
                        : msg.isAI
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800/50 rounded-tl-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-[#09090b] border-t border-black/5 dark:border-white/5">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or help a peer..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 p-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
