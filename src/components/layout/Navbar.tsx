import React from 'react';
import { Compass, MessageSquare, Archive, BarChart2, CheckCircle2, Settings, ChevronLeft, ChevronRight, Activity, Users } from 'lucide-react';
import { m } from 'motion/react';
import { playSound } from '../../utils/sound';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  soundEnabled?: boolean;
  onOpenSettings?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isTeacherMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({ soundEnabled = true, onOpenSettings, isCollapsed, onToggleCollapse, isTeacherMode }) => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs: { id: string; path: string; label: string; icon: React.ReactNode }[] = [
    { id: 'hub', path: '/', label: 'Hub', icon: <Compass className="w-[18px] h-[18px]" /> },
    { id: 'chat', path: '/chat', label: 'Chat', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
    { id: 'study-room', path: '/study-room', label: 'Study Room', icon: <Users className="w-[18px] h-[18px]" /> },
    { id: 'vault', path: '/vault', label: 'Vault', icon: <Archive className="w-[18px] h-[18px]" /> },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: <BarChart2 className="w-[18px] h-[18px]" /> },
  ];

  if (isTeacherMode) {
    tabs.push({ id: 'intervention', path: '/intervention', label: 'Intervention', icon: <Activity className="w-[18px] h-[18px]" /> });
    tabs.push({ id: 'review', path: '/review', label: 'Review', icon: <CheckCircle2 className="w-[18px] h-[18px]" /> });
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 md:bottom-0 md:top-0 ${isCollapsed ? 'md:w-[72px]' : 'md:w-[240px]'} md:h-screen md:rounded-none bg-white dark:bg-[#111113] border-t border-zinc-200 dark:border-white/[0.06] md:border-t-0 md:border-r py-2 px-3 md:py-5 md:px-3 premium-transition flex md:flex-col justify-between`}>
      
      {/* Top Branding (Desktop Only) */}
      <div className="hidden md:flex flex-col gap-6 relative">
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-[30px] top-2 bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/[0.08] rounded-full p-1 shadow-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white z-50 premium-transition hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <Link to="/" className={`flex items-center gap-2.5 px-2 cursor-pointer group ${isCollapsed ? 'justify-center' : ''}`}>
          <m.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            <img src="/logo.jpg" alt="StudyFlow AI" className="w-full h-full object-cover rounded-[10px]" />
          </m.div>
          {!isCollapsed && (
            <div>
              <h1 className="text-[14px] font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 premium-transition">
                StudyFlow AI
              </h1>
              <span className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 text-[9px] font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-2.5 h-2.5" /> Dual-AI Active
              </span>
            </div>
          )}
        </Link>

        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
            return (
              <Link
                key={tab.id}
                to={tab.path}
                onClick={() => {
                  playSound('click', soundEnabled);
                }}
                className={`relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg premium-transition select-none group text-[13px] ${
                  isActive 
                    ? 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-semibold' 
                    : 'hover:bg-zinc-50 dark:hover:bg-white/[0.03] text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div
                  className={`relative z-10 premium-transition flex items-center gap-2.5 w-full ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <div className="flex-shrink-0">{tab.icon}</div>
                  {!isCollapsed && <span className="tracking-wide">{tab.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Layout (Bottom Bar) */}
      <div className="md:hidden w-full flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => {
                playSound('click', soundEnabled);
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg premium-transition ${
                isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
              }`}
            >
              <div className="mb-0.5">{tab.icon}</div>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Profile Section (Desktop Only) */}
      <div className="hidden md:flex flex-col gap-1">
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            onOpenSettings?.();
          }}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.03] premium-transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white group text-[13px] ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!isCollapsed && <span className="font-medium tracking-wide">Settings</span>}
        </button>

        <div className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.04] mt-1 group hover:border-zinc-300 dark:hover:border-white/[0.08] premium-transition ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex-shrink-0">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-7 h-7 rounded-lg" } }} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-medium text-zinc-900 dark:text-white truncate">{user?.firstName || 'Student'}</span>
              <span className="text-[10px] text-zinc-400 truncate">{user?.primaryEmailAddress?.emailAddress || 'Pro Plan'}</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
});
