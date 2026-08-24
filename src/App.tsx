import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { ElectionProvider } from './context/ElectionContext';
import { PWAProvider, usePWA } from './context/PWAContext';
import { DemoBanner } from './components/common/DemoBanner';
import { Navbar } from './components/common/Navbar';
import { ObserverApp } from './components/observer/ObserverApp';
import { SituationRoom } from './components/situation/SituationRoom';
import { IncidentCentre } from './components/incidents/IncidentCentre';
import { ResultCentre } from './components/results/ResultCentre';
import { PublicPortal } from './components/public/PublicPortal';
import { AdminManagement } from './components/admin/AdminManagement';
import { VoiceAssistantModal } from './components/voice/VoiceAssistantModal';
import { PWAInstallGuideModal } from './components/common/PWAInstallGuideModal';
import { Mic, Sparkles } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { showIosGuide, setShowIosGuide } = usePWA();
  const [activeTab, setActiveTab] = useState<string>('situation');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Auto-route based on persona / role
  useEffect(() => {
    if (currentUser?.role === 'OBSERVER') {
      setActiveTab('observer');
    } else if (currentUser?.role === 'VERIFIER') {
      setActiveTab('incidents');
    } else if (currentUser?.role === 'COMMUNICATION_OFFICER' || currentUser?.role === 'PUBLIC_VIEWER') {
      setActiveTab('public');
    }
  }, [currentUser?.role]);

  // Global shortcut to toggle voice assistant (Ctrl/Cmd + Shift + V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        setIsVoiceModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative">
      {/* 1. Neutrality & Simulated Demo Mode Banner */}
      <DemoBanner />

      {/* 2. Primary Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
      />

      {/* 3. Main Workspace Container */}
      <main className="flex-1 pb-12">
        {activeTab === 'observer' && <ObserverApp />}
        {activeTab === 'situation' && <SituationRoom />}
        {activeTab === 'incidents' && <IncidentCentre />}
        {activeTab === 'results' && <ResultCentre />}
        {activeTab === 'public' && <PublicPortal />}
        {activeTab === 'admin' && <AdminManagement />}
      </main>

      {/* 4. Floating Action Button for Gemini Live Voice Assistant */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          id="btn-floating-voice"
          onClick={() => setIsVoiceModalOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full shadow-xl shadow-emerald-950/20 border border-emerald-400/40 transition-all transform hover:scale-105 group"
          title="Open Katukan Anka Gemini Live Voice Assistant (Shortcut: Ctrl+Shift+V)"
        >
          <div className="relative">
            <Mic className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-tight hidden sm:inline">
            Voice Assistant
          </span>
          <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded-full uppercase text-emerald-100">
            Live 3.1
          </span>
        </button>
      </div>

      {/* 5. Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setIsVoiceModalOpen(false);
        }}
      />

      {/* 6. PWA Mobile Installation Guidance Modal */}
      <PWAInstallGuideModal
        isOpen={showIosGuide}
        onClose={() => setShowIosGuide(false)}
      />

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-700">
            Katukan Anka Situation Room • Zamfara State, Nigeria
          </span>
          <span className="text-[11px] text-slate-500">
            Neutral Civic Observation Platform • Form EC8A Audit Engine • Real-time Voice Intelligence
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <ElectionProvider>
          <PWAProvider>
            <MainLayout />
          </PWAProvider>
        </ElectionProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
