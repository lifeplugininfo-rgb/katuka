import React, { useState } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  BarChart3,
  CheckCircle2,
  Settings,
  Globe,
  Smartphone,
  Wifi,
  WifiOff,
  UserCheck,
  ChevronDown,
  RefreshCw,
  Bell,
  Check,
  Mic,
  Sparkles,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { useElection } from '../../context/ElectionContext';
import { UserRole } from '../../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenVoiceAssistant?: () => void;
}

const ROLES_LIST: { role: UserRole; label: string; desc: string; color: string }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full System Control & Settings', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { role: 'LGA_COORDINATOR', label: 'LGA Coordinator', desc: 'Anka LGA Ops & Oversight', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { role: 'WARD_COORDINATOR', label: 'Ward Coordinator', desc: 'Ward-level Supervision', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
  { role: 'OBSERVER', label: 'Field Observer', desc: 'Polling Unit Monitoring & Forms', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { role: 'VERIFIER', label: 'Verification Officer', desc: 'Incident & Result Review Queue', color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' },
  { role: 'DATA_ANALYST', label: 'Data Analyst', desc: 'Statistics & Report Export', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { role: 'SITUATION_OFFICER', label: 'Situation Officer', desc: 'Live Monitoring & Alerts', color: 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100' },
  { role: 'COMMUNICATION_OFFICER', label: 'Comms Officer', desc: 'Public Portal & Media Releases', color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenVoiceAssistant }) => {
  const { currentUser, loginAsRole, firebaseUser, isFirebaseSignedIn, loginWithGoogleAuth, logout } = useAuth();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, pendingCount, syncQueueNow, isSyncing } = useSync();
  const { alerts, acknowledgeAlert } = useElection();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);

  const unackAlerts = alerts.filter((a) => !a.acknowledged);
  const currentRoleConfig = ROLES_LIST.find((r) => r.role === currentUser?.role) || ROLES_LIST[0];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-50 shadow-xs">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('situation')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-md border border-emerald-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base sm:text-lg">Katukan Anka</span>
              <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                SITUATION ROOM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Katukan Anka Situation Room • Zamfara State
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gemini Live Voice Assistant Trigger Button */}
          <button
            type="button"
            id="btn-voice-assistant-nav"
            onClick={onOpenVoiceAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-semibold shadow-sm border border-emerald-400/30 transition-all group"
            title="Open Gemini 3.1 Live Voice Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
            <span className="hidden sm:inline">Voice Assistant</span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-black/20 rounded uppercase tracking-wider text-emerald-100">
              Live
            </span>
          </button>

          {/* Offline Status & Sim Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
            <button
              onClick={toggleSimulatedOffline}
              title={isSimulatedOffline ? 'Resume live connectivity' : 'Simulate offline field conditions'}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                isOnline ? 'text-emerald-700' : 'text-amber-700 font-bold'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline</span>
                </>
              )}
            </button>

            {pendingCount > 0 && (
              <button
                onClick={() => syncQueueNow()}
                disabled={isSyncing}
                title="Sync offline queue now"
                className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {pendingCount}
              </button>
            )}
          </div>

          {/* Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              {unackAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unackAlerts.length}
                </span>
              )}
            </button>

            {alertsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 text-xs text-slate-900">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Operational Alerts ({unackAlerts.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Monitoring Engine</span>
                </div>
                <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-slate-500 py-3 text-center">No alerts recorded.</p>
                  ) : (
                    alerts.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className={`p-2.5 rounded-lg border text-left ${
                          a.severity === 'CRITICAL'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : a.severity === 'HIGH'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[11px]">{a.title}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug mb-1.5 text-slate-700">{a.message}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[10px]">
                          <span className="text-slate-600 font-medium">{a.wardName || 'Anka LGA'}</span>
                          {!a.acknowledged ? (
                            <button
                              onClick={() => acknowledgeAlert(a.id, currentUser.name)}
                              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5"
                            >
                              <Check className="w-3 h-3" /> Acknowledge
                            </button>
                          ) : (
                            <span className="text-slate-400">Acknowledged</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Firebase / Google Auth Button & Profile */}
          <div className="relative">
            {isFirebaseSignedIn ? (
              <button
                type="button"
                onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold"
                title="Firebase Account Connected"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="max-w-[90px] truncate hidden md:inline">
                  {firebaseUser?.displayName || firebaseUser?.email || 'Firebase'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-75" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loginWithGoogleAuth()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                title="Connect Firebase Google Account"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Firebase Sign In</span>
              </button>
            )}

            {authDropdownOpen && isFirebaseSignedIn && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 text-xs text-slate-900">
                <div className="pb-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-800">{firebaseUser?.displayName || 'Google User'}</div>
                  <div className="text-[11px] text-slate-500">{firebaseUser?.email}</div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-1">Firebase Firestore & Auth Connected</div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center justify-center gap-1.5 font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out of Firebase
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${currentRoleConfig.color}`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{currentRoleConfig.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 text-xs text-slate-900">
                <div className="px-2 py-1.5 text-[11px] text-slate-500 border-b border-slate-100 font-medium">
                  Switch Active Persona / Role:
                </div>
                <div className="mt-1 space-y-1">
                  {ROLES_LIST.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        loginAsRole(r.role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        currentUser?.role === r.role
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{r.label}</div>
                        <div className="text-[10px] text-slate-500">{r.desc}</div>
                      </div>
                      {currentUser?.role === r.role && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="bg-slate-100/90 border-t border-slate-200 px-2 sm:px-6 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-1 text-xs font-medium">
          <button
            id="nav-observer"
            onClick={() => setActiveTab('observer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'observer'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Observer App (PWA)</span>
          </button>

          <button
            id="nav-situation"
            onClick={() => setActiveTab('situation')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'situation'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Situation Room & Map</span>
          </button>

          <button
            id="nav-incidents"
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'incidents'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Incident Centre</span>
          </button>

          <button
            id="nav-results"
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'results'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Result Centre & EC8A Audit</span>
          </button>

          <button
            id="nav-public"
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'public'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Transparency Portal</span>
          </button>

          <button
            id="nav-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'admin'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin & Data Engine</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
