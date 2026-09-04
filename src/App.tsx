import React, { useState, Suspense, lazy } from 'react';
import { UnitOverview, VaultProblem, CohortMetric, ChatMessage } from './types';
import { MOCK_UNITS, MOCK_VAULT_PROBLEMS, MOCK_COHORTS } from './data/mockData';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { Breadcrumbs } from './components/layout/Breadcrumbs';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

const HubView = lazy(() => import('./views/HubView').then(module => ({ default: module.HubView })));
const ChatView = lazy(() => import('./views/ChatView').then(module => ({ default: module.ChatView })));
const AnalyticsView = lazy(() => import('./views/AnalyticsView').then(module => ({ default: module.AnalyticsView })));
const VaultView = lazy(() => import('./views/VaultView').then(module => ({ default: module.VaultView })));
const MentorReviewView = lazy(() => import('./views/MentorReviewView').then(module => ({ default: module.MentorReviewView })));
const StudyRoomView = lazy(() => import('./views/StudyRoomView').then(module => ({ default: module.StudyRoomView })));
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const TrustDashboardView = lazy(() => import('./views/TrustDashboardView').then(m => ({ default: m.TrustDashboardView })));
const InterventionView = lazy(() => import('./views/InterventionView').then(m => ({ default: m.InterventionView })));
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastContainer, ToastMessage, ToastType } from './components/common/Toast';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'motion/react';
import { SignedIn, SignedOut, useClerk, useAuth } from '@clerk/clerk-react';
import { CookieBanner } from './components/common/CookieBanner';
import { BackToTop } from './components/common/BackToTop';
import { ShortcutsModal } from './components/common/ShortcutsModal';

import { AppLoader } from './components/layout/AppLoader';
const WaitlistView = lazy(() => import('./views/WaitlistView').then(m => ({ default: m.WaitlistView })));
const NotFoundView = lazy(() => import('./views/NotFoundView').then(m => ({ default: m.NotFoundView })));

export default function App() {
  const { signOut } = useClerk();
  const { userId, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [appLoaded, setAppLoaded] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState<string>('unit-active');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [vaultProblems] = useState<VaultProblem[]>(MOCK_VAULT_PROBLEMS);
  const [initialChatQuery, setInitialChatQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('studyflow_dark_mode');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  const [isTeacherMode, setIsTeacherMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studyflow_teacher_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('studyflow_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    try { localStorage.setItem('studyflow_sidebar_collapsed', String(newVal)); } catch (e) {}
  };

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('studyflow_dark_mode', isDarkMode.toString());
    } catch (e) {
    }
  }, [isDarkMode]);

  const handleNotify = React.useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const handleClearData = async () => {
    if (!userId) return;
    
    try {
      const token = await getToken();
      
      const response = await fetch(`/api/db/chats/user/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chats');
      }
      
      setChatMessages([]);
      window.dispatchEvent(new Event('clear-chat-history'));
      handleNotify('Chat history cleared', 'success');
    } catch (error) {
      console.error('Error clearing chats:', error);
      handleNotify('Some chats could not be cleared', 'warning');
    }
  };

  const handleNavigateToChatWithQuery = (query: string) => {
    setInitialChatQuery(query);
    navigate('/chat');
  };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {!appLoaded && <AppLoader onComplete={() => setAppLoaded(true)} key="app-loader" />}
      </AnimatePresence>
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:p-4 focus:bg-white focus:text-blue-600 focus:font-bold focus:shadow-xl focus:rounded-br-xl top-0 left-0">
        Skip to main content
      </a>

      <div className="flex flex-col h-[100dvh] overflow-hidden w-full bg-zinc-50 dark:bg-[#0A0A0B] text-zinc-900 dark:text-zinc-100 transition-colors duration-500 relative selection:bg-blue-500/20">
      <ToastContainer toasts={toasts} />
      <CookieBanner />
      <BackToTop />
      <ShortcutsModal />

      <Routes>
        <Route path="/waitlist" element={
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-[#2563EB] border-black/10 dark:border-white/10 animate-spin" /></div>}>
            <WaitlistView />
          </Suspense>
        } />
        <Route path="/trust" element={
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-[#2563EB] border-black/10 dark:border-white/10 animate-spin" /></div>}>
            <TrustDashboardView />
          </Suspense>
        } />
          <Route path="*" element={
            <>
              <SignedIn>
                <div className={`flex flex-col flex-1 min-h-0 h-full w-full transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[240px]'}`}>
                  <Header 
                    currentUnit={selectedUnitId}
                    onSelectUnit={(unitId) => setSelectedUnitId(unitId)}
                    soundEnabled={soundEnabled}
                    onToggleSound={() => setSoundEnabled(!soundEnabled)}
                    onOpenSettings={() => setShowSettings(true)}
                  />

                  <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    soundEnabled={soundEnabled}
                    onToggleSound={() => setSoundEnabled(!soundEnabled)}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                    isTeacherMode={isTeacherMode}
                    onToggleTeacherMode={() => {
                      const newVal = !isTeacherMode;
                      setIsTeacherMode(newVal);
                      try { localStorage.setItem('studyflow_teacher_mode', String(newVal)); } catch (e) {}
                    }}
                    onClearData={handleClearData}
                    onSignOut={() => signOut()}
                  />

                  <main id="main-content" className={`flex-1 min-h-0 w-full mx-auto relative overflow-x-hidden scroll-smooth ${location.pathname === '/chat' ? 'px-0 max-w-none overflow-y-hidden flex flex-col' : 'px-4 md:px-6 lg:px-8 max-w-[1600px] overflow-y-auto pt-4'}`}>
                    <Breadcrumbs />
                    <AnimatePresence mode="wait">
                      <m.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 12, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.99 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`w-full ${location.pathname === '/chat' ? 'flex-1 flex flex-col h-full overflow-hidden min-h-0' : 'min-h-full pb-32 md:pb-12'}`}
                      >
                        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-[#2563EB] border-black/10 dark:border-white/10 animate-spin" /></div>}>
                          <Routes>
                            <Route path="/" element={
                              <HubView
                                selectedUnitId={selectedUnitId}
                                onSelectUnit={setSelectedUnitId}
                                onNavigateToChatWithQuery={handleNavigateToChatWithQuery}
                                soundEnabled={soundEnabled}
                                onNotify={handleNotify}
                              />
                            } />
                            <Route path="/chat" element={
                              <ChatView
                                messages={chatMessages}
                                setMessages={setChatMessages}
                                initialQuery={initialChatQuery}
                                soundEnabled={soundEnabled}
                                onNotify={handleNotify}
                              />
                            } />
                            <Route path="/vault" element={
                              <VaultView 
                                problems={vaultProblems} 
                                onSelectProblem={(prob) => console.log('Selected problem:', prob.id)}
                                soundEnabled={soundEnabled}
                                onNotify={handleNotify}
                              />
                            } />
                            <Route path="/study-room" element={<StudyRoomView />} />
                            <Route path="/analytics" element={<AnalyticsView onNotify={handleNotify} isTeacherMode={isTeacherMode} />} />
                            <Route path="/intervention" element={<InterventionView onNotify={handleNotify} isTeacherMode={isTeacherMode} />} />
                            <Route path="/review" element={<MentorReviewView onNotify={handleNotify} isTeacherMode={isTeacherMode} />} />
                            <Route path="*" element={<NotFoundView />} />
                          </Routes>
                        </Suspense>
                      </m.div>
                    </AnimatePresence>
                  </main>

                  <Navbar 
                    soundEnabled={soundEnabled} 
                    onOpenSettings={() => setShowSettings(true)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={toggleSidebar}
                    isTeacherMode={isTeacherMode}
                  />
                </div>
              </SignedIn>
              <SignedOut>
                <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-[#2563EB] border-black/10 dark:border-white/10 animate-spin" /></div>}>
                  <LoginView 
                    soundEnabled={soundEnabled} 
                    isDarkMode={isDarkMode} 
                    onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
                  />
                </Suspense>
              </SignedOut>
            </>
          } />
        </Routes>
      </div>
    </LazyMotion>
  );
}

