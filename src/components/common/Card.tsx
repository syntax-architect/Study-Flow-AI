import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`group relative rounded-[2rem] bg-zinc-50 dark:bg-[#09090B] border border-[rgba(226,232,240,0.5)] dark:border-[rgba(255,255,255,0.05)] p-2 overflow-hidden hover:shadow-xl transition-all duration-700 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    <div className="h-full rounded-[calc(2rem-8px)] bg-white dark:bg-[#121214] border border-[rgba(226,232,240,0.5)] dark:border-[rgba(255,255,255,0.05)] p-6 relative flex flex-col justify-between overflow-hidden">
      {children}
    </div>
  </div>
);
