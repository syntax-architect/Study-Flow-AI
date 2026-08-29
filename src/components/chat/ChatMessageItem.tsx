import React, { useState } from 'react';
import { m } from 'motion/react';
import { ChatMessage } from '../../types';
import { Bot, User, Copy, Check, Pin, PinOff, Languages, Edit2, Volume2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { DualAiResponseView } from './DualAiResponseView';
import { ToastType } from '../common/Toast';
import 'katex/dist/katex.min.css';

interface ChatMessageItemProps {
  msg: ChatMessage;
  onTogglePin: (messageId: string, currentPinStatus?: boolean) => void;
  userId?: string;
  activeChatId: string | null;
  onNotify: (msg: string, type: ToastType) => void;
  onEditMessage?: (msgId: string, newContent: string) => void;
}

export const ChatMessageItem = React.memo(({ msg, onTogglePin, userId, activeChatId, onNotify, onEditMessage }: ChatMessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const { getToken } = useAuth();
  
  const preprocessMath = (content: string) => {
    if (!content) return '';
    let processed = content;
    processed = processed.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
    processed = processed.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
    
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      let trimmed = mathContent.trim();
      
      if (trimmed.includes('\\end{aligned}') && !trimmed.includes('\\begin{aligned}')) {
        trimmed = trimmed.replace(/\\end\{aligned\}/g, '');
      }
      
      if ((trimmed.includes('&=') || trimmed.includes('\\\\')) && !trimmed.includes('\\begin{aligned}')) {
        trimmed = `\\begin{aligned}\n${trimmed}\n\\end{aligned}`;
      }
      
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    });

    return processed;
  };

  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    return (
      <button
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 bg-white dark:bg-[#18181B] border border-black/10 dark:border-white/10 shadow-sm hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-md transition-all z-10"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50 opacity-60 hover:opacity-100" />}
      </button>
    );
  };

  const renderAssistantMessage = () => {
    let textToRender = msg.content as any;
    try {
      const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
      if (parsed && typeof parsed === 'object') {
        if (parsed.criticAuditStatus) {
          return (
            <div className="relative">
            <button
              onClick={() => onTogglePin(msg.id, msg.is_pinned)}
              className="absolute -top-3 -right-2 z-10 p-1.5 bg-white dark:bg-[#27272A] border border-black/10 dark:border-white/10 shadow-sm rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={msg.is_pinned ? "Unpin message" : "Pin message"}
            >
              {msg.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50 opacity-50 hover:opacity-100" />}
            </button>
        <DualAiResponseView 
          data={parsed} 
          preprocessMath={preprocessMath} 
          userId={userId}
          chatId={activeChatId}
          messageId={msg.id}
          onNotify={onNotify}
        />
      </div>
    );
  }
  if (parsed.isConversation || parsed.content) {
    textToRender = parsed.content || msg.content;
  }
}
} catch (e) {
// Fallback for non-JSON or older string messages
if (typeof msg.content === 'object') {
  textToRender = JSON.stringify(msg.content);
}
}
    
    return (
      <div className={`bg-[#FAFAFA] dark:bg-[#18181B] border border-black/5 dark:border-white/5 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 text-[14px] text-gray-800 dark:text-gray-200 leading-relaxed prose prose-sm max-w-none prose-p:leading-relaxed overflow-x-auto relative group ${msg.is_pinned ? 'ring-2 ring-amber-400 dark:ring-amber-500/50' : ''}`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onNotify?.("Translating explanation to regional language (Demo)...", "info")}
            className="p-1.5 text-zinc-900 dark:text-zinc-50 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all flex items-center gap-1"
            title="Translate Explanation"
          >
            <Languages className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          </button>
          <button
            onClick={async () => {
              onNotify?.("Preparing audio playback...", "info");
              try {
                const token = await getToken();
                const res = await fetch('/api/text-to-speech', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ 
                    text: textToRender, 
                    language: localStorage.getItem('preferred_language') || 'en' 
                  })
                });
                if (!res.ok) throw new Error('Audio fetch failed');
                const blob = await res.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.play();
              } catch (e) {
                onNotify?.("Failed to play audio", "error");
              }
            }}
            className="p-1.5 text-zinc-900 dark:text-zinc-50 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all flex items-center gap-1"
            title="Read Aloud (Bhashini TTS)"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <CopyButton text={textToRender} />
          <button
            onClick={() => onTogglePin(msg.id, msg.is_pinned)}
            className="p-1.5 text-zinc-900 dark:text-zinc-50 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all"
            title={msg.is_pinned ? "Unpin message" : "Pin message"}
          >
            {msg.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="prose dark:prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-math">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          components={{
            code({node, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              return !isInline ? (
                <div className="rounded-xl overflow-hidden my-4 border border-black/10 dark:border-white/10 shadow-sm">
                  <div className="bg-gray-100 dark:bg-[#27272A] px-4 py-2 flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>{match?.[1] || 'code'}</span>
                    <button onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))} className="hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5 transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy code
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-50 dark:bg-[#09090B] text-sm overflow-x-auto text-black dark:text-white m-0" {...props}>
                    <code className={className}>{children}</code>
                  </pre>
                </div>
              ) : (
                <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono text-[#F43F5E] dark:text-[#FB7185]" {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {preprocessMath(textToRender)}
        </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <m.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6"
    >
      {msg.role === 'user' ? (
        <div className="flex justify-end items-end gap-2 relative group/user-msg">
          <div className={`bg-[#09090B] dark:bg-[#FAFAFA] text-white dark:text-black shadow-sm rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] ${msg.is_pinned ? 'ring-2 ring-amber-400 dark:ring-amber-500/50' : ''}`}>
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[250px]">
                <textarea 
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-white/10 dark:bg-black/5 text-white dark:text-black p-2 rounded-lg text-[14px] focus:outline-none resize-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setIsEditing(false); setEditValue(msg.content); }} className="px-3 py-1 text-xs rounded-md bg-white/20 dark:bg-black/10 hover:bg-white/30 dark:hover:bg-black/20 transition-colors">Cancel</button>
                  <button onClick={() => { setIsEditing(false); if(onEditMessage && editValue.trim() !== msg.content) onEditMessage(msg.id, editValue); }} className="px-3 py-1 text-xs rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">Save & Submit</button>
                </div>
              </div>
            ) : (
              <p className="text-[14px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={() => onTogglePin(msg.id, msg.is_pinned)}
                  className="absolute top-1 -left-8 p-1.5 text-zinc-900 dark:text-zinc-50 opacity-0 group-hover/user-msg:opacity-50 hover:!opacity-100 bg-white dark:bg-[#27272A] border border-black/10 dark:border-white/10 shadow-sm rounded-md transition-all"
                  title={msg.is_pinned ? "Unpin message" : "Pin message"}
                >
                  {msg.is_pinned ? <PinOff className="w-3 h-3 text-amber-500" /> : <Pin className="w-3 h-3" />}
                </button>
                {onEditMessage && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="absolute top-10 -left-8 p-1.5 text-zinc-900 dark:text-zinc-50 opacity-0 group-hover/user-msg:opacity-50 hover:!opacity-100 bg-white dark:bg-[#27272A] border border-black/10 dark:border-white/10 shadow-sm rounded-md transition-all"
                    title="Edit message"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#09090B] dark:bg-[#FAFAFA] text-white dark:text-black border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center flex-shrink-0 mb-1 z-10">
            <User className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="flex justify-start items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#18181B] border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 mt-1">
            <Bot className="w-4 h-4" />
          </div>
          <div className="max-w-[100%] md:max-w-[90%] w-full relative">
            {renderAssistantMessage()}
          </div>
        </div>
      )}
    </m.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id && 
         prevProps.msg.content === nextProps.msg.content && 
         prevProps.msg.is_pinned === nextProps.msg.is_pinned &&
         prevProps.activeChatId === nextProps.activeChatId &&
         prevProps.userId === nextProps.userId &&
         prevProps.onTogglePin === nextProps.onTogglePin &&
         prevProps.onNotify === nextProps.onNotify;
});
