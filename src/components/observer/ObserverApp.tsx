import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  Camera,
  MapPin,
  FileCheck,
  Send,
  RefreshCw,
  Eye,
  Plus,
  Shield,
  FileText,
  AlertCircle,
  HelpCircle,
  Settings,
  Download,
  Share2,
  Zap,
  ShieldCheck,
  Volume2,
  Sun,
  Database,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { useSync } from '../../context/SyncContext';
import { usePWA } from '../../context/PWAContext';
import { PollingUnit, IncidentCategory, IncidentSeverity, GPSLocation, EvidenceItem } from '../../types';

export const ObserverApp: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    pollingUnits,
    wards,
    politicalParties,
    submitOpeningReport,
    submitVotingReport,
    submitClosingReport,
    submitIncident,
    submitResult,
    openingReports,
    votingReports,
    closingReports,
    incidents,
    results,
  } = useElection();

  const { isOnline, pendingCount, syncQueue, syncQueueNow, isSyncing, lastSyncTime, isSimulatedOffline, toggleSimulatedOffline } = useSync();
  const { isInstallable, isInstalled, isStandalone, platform, setShowIosGuide, promptInstall, offlineReady } = usePWA();

  // Active view inside observer app
  const [activeView, setActiveView] = useState<'pus' | 'opening' | 'voting' | 'closing' | 'incident' | 'result' | 'my-reports' | 'sync' | 'settings'>('pus');
  const [selectedPuId, setSelectedPuId] = useState<string>('');
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);

  // Field Settings
  const [autoGpsStamp, setAutoGpsStamp] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [highContrastSunlight, setHighContrastSunlight] = useState(false);

  // GPS Simulation / Live Capture
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form States
  // 1. Opening
  const [arrivalTime, setArrivalTime] = useState('07:30');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [officialsPresent, setOfficialsPresent] = useState(true);
  const [officialsCount, setOfficialsCount] = useState(4);
  const [materialsAvailable, setMaterialsAvailable] = useState(true);
  const [securityPresent, setSecurityPresent] = useState(true);
  const [securityCount, setSecurityCount] = useState(2);
  const [bvasAvailable, setBvasAvailable] = useState(true);
  const [bvasFunctioning, setBvasFunctioning] = useState(true);
  const [puOpened, setPuOpened] = useState(true);
  const [openingProblems, setOpeningProblems] = useState<string[]>([]);
  const [openingNotes, setOpeningNotes] = useState('');

  // 2. Voting
  const [accreditationStarted, setAccreditationStarted] = useState(true);
  const [votingOngoing, setVotingOngoing] = useState(true);
  const [votingBvasOk, setVotingBvasOk] = useState(true);
  const [queueLevel, setQueueLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMPTY'>('MEDIUM');
  const [queueSize, setQueueSize] = useState(45);
  const [securitySituation, setSecuritySituation] = useState<'CALM' | 'TENSE' | 'DISRUPTED' | 'CRITICAL'>('CALM');
  const [votingDisruption, setVotingDisruption] = useState(false);
  const [disruptionReason, setDisruptionReason] = useState('');
  const [votingNotes, setVotingNotes] = useState('');

  // 3. Closing
  const [closingTime, setClosingTime] = useState('14:30');
  const [votingCompleted, setVotingCompleted] = useState(true);
  const [countingStarted, setCountingStarted] = useState(true);
  const [resultDisplayed, setResultDisplayed] = useState(true);
  const [closingIssues, setClosingIssues] = useState<string[]>([]);
  const [closingNotes, setClosingNotes] = useState('');

  // 4. Incident
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory>('BVAS_ISSUE');
  const [incidentSeverity, setIncidentSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentEvidencePhotos, setIncidentEvidencePhotos] = useState<EvidenceItem[]>([]);

  // 5. Result
  const [registeredVoters, setRegisteredVoters] = useState<number>(750);
  const [accreditedVoters, setAccreditedVoters] = useState<number>(450);
  const [partyVotes, setPartyVotes] = useState<Record<string, number>>({});
  const [validVotes, setValidVotes] = useState<number>(440);
  const [rejectedVotes, setRejectedVotes] = useState<number>(10);
  const [totalVotes, setTotalVotes] = useState<number>(450);
  const [resultEvidence, setResultEvidence] = useState<EvidenceItem[]>([]);

  // Submission Status Feedback
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string; details?: string[] } | null>(null);

  // Filter assigned polling units for this observer (or show all if admin/coordinator)
  const myPollingUnits = pollingUnits.filter((pu) => {
    if (currentUser?.role === 'OBSERVER') {
      return (
        pu.observerId === currentUser.observerId ||
        (currentUser.assignedPuIds && currentUser.assignedPuIds.includes(pu.id)) ||
        pu.wardId === currentUser.assignedWardIds?.[0]
      );
    }
    return true; // coordinators/admins can test for any PU
  });

  // Default to first PU
  useEffect(() => {
    if (myPollingUnits.length > 0 && !selectedPuId) {
      setSelectedPuId(myPollingUnits[0].id);
      setRegisteredVoters(myPollingUnits[0].registeredVoters || 750);
    }
  }, [myPollingUnits, selectedPuId]);

  // Update registered voters when selected PU changes
  const handlePuChange = (puId: string) => {
    setSelectedPuId(puId);
    const pu = pollingUnits.find((p) => p.id === puId);
    if (pu) {
      setRegisteredVoters(pu.registeredVoters || 750);
    }
  };

  // Initialize party votes with 0
  useEffect(() => {
    if (politicalParties.length > 0 && Object.keys(partyVotes).length === 0) {
      const initial: Record<string, number> = {};
      politicalParties.forEach((p) => {
        initial[p.code] = 0;
      });
      setPartyVotes(initial);
    }
  }, [politicalParties]);

  // Capture GPS Location
  const captureGps = () => {
    setGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
          });
          setGpsLoading(false);
        },
        () => {
          // Fallback to Anka LGA coordinate with slight jitter for simulation
          const pu = pollingUnits.find((p) => p.id === selectedPuId);
          setGpsLocation({
            latitude: pu ? pu.lat : 12.1128 + (Math.random() - 0.5) * 0.005,
            longitude: pu ? pu.lng : 5.9265 + (Math.random() - 0.5) * 0.005,
            accuracy: 4.5,
            timestamp: new Date().toISOString(),
          });
          setGpsLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
      const pu = pollingUnits.find((p) => p.id === selectedPuId);
      setGpsLocation({
        latitude: pu ? pu.lat : 12.1128,
        longitude: pu ? pu.lng : 5.9265,
        accuracy: 5.0,
        timestamp: new Date().toISOString(),
      });
      setGpsLoading(false);
    }
  };

  // Simulated Photo Upload with SHA-256 computation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'incident' | 'result') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        // Generate pseudo SHA-256 hash
        const fakeHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const newEvidence: EvidenceItem = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          fileName: file.name,
          fileType: file.type || 'image/jpeg',
          fileSize: file.size,
          dataUrl: dataUrl || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
          uploadingUserId: currentUser?.id || 'obs-001',
          uploadingUserName: currentUser?.name || 'Field Observer',
          timestamp: new Date().toISOString(),
          gps: gpsLocation || undefined,
          description: target === 'result' ? 'Official Form EC8A Polling Unit Result Sheet' : 'Field incident evidence photograph',
          sha256Hash: fakeHash,
          verificationStatus: 'PENDING',
        };

        if (target === 'incident') {
          setIncidentEvidencePhotos((prev) => [...prev, newEvidence]);
        } else {
          setResultEvidence((prev) => [...prev, newEvidence]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Result Arithmetic Validation Helpers
  const sumPartyVotes = Object.values(partyVotes).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
  const calculatedTotal = Number(validVotes) + Number(rejectedVotes);
  const mathMatchesTotal = calculatedTotal === Number(totalVotes);
  const turnoutOk = Number(totalVotes) <= Number(accreditedVoters);
  const partiesMatchValid = sumPartyVotes === Number(validVotes);
  const isResultMathematicallyValid = mathMatchesTotal && turnoutOk && partiesMatchValid;

  const currentPu = pollingUnits.find((p) => p.id === selectedPuId) || myPollingUnits[0];

  // Submit Handlers
  const handleOpeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPu) return;

    const payload = {
      puId: currentPu.id,
      puCode: currentPu.code,
      puName: currentPu.name,
      wardId: currentPu.wardId,
      wardName: currentPu.wardName,
      observerId: currentUser?.observerId || currentUser?.id || 'obs-001',
      observerName: currentUser?.name || 'Observer',
      deviceId: 'AEMS-MOBILE-PWA-01',
      arrivalTime,
      pollOpeningTime: openingTime,
      officialsPresent,
      officialsCount,
      electionMaterialsAvailable: materialsAvailable,
      securityPresent,
      securityPersonnelCount: securityCount,
      bvasAvailable,
      bvasFunctioning,
      puOpened,
      problemsEncountered: openingProblems,
      notes: openingNotes,
      gps: gpsLocation,
    };

    const res = await submitOpeningReport(payload);
    setSubmitMessage({ type: 'success', text: res.message || 'Opening report recorded.' });
    setTimeout(() => {
      setSubmitMessage(null);
      setActiveView('pus');
    }, 2000);
  };

  const handleVotingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPu) return;

    const payload = {
      puId: currentPu.id,
      puCode: currentPu.code,
      puName: currentPu.name,
      wardId: currentPu.wardId,
      wardName: currentPu.wardName,
      observerId: currentUser?.observerId || currentUser?.id || 'obs-001',
      observerName: currentUser?.name || 'Observer',
      deviceId: 'AEMS-MOBILE-PWA-01',
      accreditationStarted,
      bvasFunctioning: votingBvasOk,
      votingOngoing,
      queueLevel,
      estimatedQueueSize: queueSize,
      securitySituation,
      votingDisruption,
      disruptionReason,
      notes: votingNotes,
      gps: gpsLocation,
    };

    const res = await submitVotingReport(payload);
    setSubmitMessage({ type: 'success', text: res.message || 'Voting report recorded.' });
    setTimeout(() => {
      setSubmitMessage(null);
      setActiveView('pus');
    }, 2000);
  };

  const handleClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPu) return;

    const payload = {
      puId: currentPu.id,
      puCode: currentPu.code,
      puName: currentPu.name,
      wardId: currentPu.wardId,
      wardName: currentPu.wardName,
      observerId: currentUser?.observerId || currentUser?.id || 'obs-001',
      observerName: currentUser?.name || 'Observer',
      deviceId: 'AEMS-MOBILE-PWA-01',
      closingTime,
      votingCompleted,
      countingStarted,
      resultDisplayed,
      closingIssues,
      notes: closingNotes,
      gps: gpsLocation,
    };

    const res = await submitClosingReport(payload);
    setSubmitMessage({ type: 'success', text: res.message || 'Closing report recorded.' });
    setTimeout(() => {
      setSubmitMessage(null);
      setActiveView('pus');
    }, 2000);
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPu) return;

    const categoryLabels: Record<IncidentCategory, string> = {
      BVAS_ISSUE: 'BVAS Malfunction / Failure',
      LATE_OPENING: 'Late Commencement of Polling',
      MISSING_MATERIALS: 'Missing / Shortage of Materials',
      SECURITY_INCIDENT: 'Security Threat / Disorder',
      INTIMIDATION: 'Voter / Official Intimidation',
      VIOLENCE: 'Violent Disruption / Clashes',
      VOTING_INTERRUPTION: 'Temporary Interruption of Voting',
      ACCESSIBILITY_ISSUE: 'Access Barrier for PWDs / Elderly',
      RESULT_ISSUE: 'Form EC8A / Collation Discrepancy',
      OTHER: 'Other Field Issue',
    };

    const payload = {
      puId: currentPu.id,
      puCode: currentPu.code,
      puName: currentPu.name,
      wardId: currentPu.wardId,
      wardName: currentPu.wardName,
      category: incidentCategory,
      categoryLabel: categoryLabels[incidentCategory],
      severity: incidentSeverity,
      timeOccurred: new Date().toISOString(),
      description: incidentDescription,
      evidence: incidentEvidencePhotos,
      gps: gpsLocation,
      observerId: currentUser?.observerId || currentUser?.id || 'obs-001',
      observerName: currentUser?.name || 'Observer',
    };

    const res = await submitIncident(payload);
    setSubmitMessage({ type: 'success', text: res.message || 'Incident transmitted to Verification Queue.' });
    setIncidentDescription('');
    setIncidentEvidencePhotos([]);
    setTimeout(() => {
      setSubmitMessage(null);
      setActiveView('pus');
    }, 2000);
  };

  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPu) return;

    const partyArray = politicalParties.map((p) => ({
      partyId: p.id,
      partyCode: p.code,
      partyName: p.name,
      votes: Number(partyVotes[p.code]) || 0,
    }));

    const payload = {
      puId: currentPu.id,
      puCode: currentPu.code,
      puName: currentPu.name,
      wardId: currentPu.wardId,
      wardName: currentPu.wardName,
      registeredVoters: Number(registeredVoters),
      accreditedVoters: Number(accreditedVoters),
      validVotes: Number(validVotes),
      rejectedVotes: Number(rejectedVotes),
      totalVotes: Number(totalVotes),
      partyVotes: partyArray,
      evidence: resultEvidence,
      gps: gpsLocation,
      observerId: currentUser?.observerId || currentUser?.id || 'obs-001',
      observerName: currentUser?.name || 'Observer',
    };

    const res = await submitResult(payload);
    if (res.validationStatus === 'FLAGGED_FOR_REVIEW') {
      setSubmitMessage({
        type: 'warning',
        text: 'Result received and FLAGGED FOR REVIEW due to mathematical checks.',
        details: res.issues,
      });
    } else {
      setSubmitMessage({ type: 'success', text: 'Result submission received successfully.' });
    }

    setTimeout(() => {
      setSubmitMessage(null);
      setActiveView('pus');
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-900">
      {/* Observer Card Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">
              {currentUser?.name?.charAt(0) || 'O'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900">{currentUser?.name}</h1>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded">
                  {currentUser?.observerId || 'OBS-ANK-FIELD'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentUser?.organization || 'Zamfara Electoral Observation Mission'} • Anka LGA
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">PUs Assigned:</span>
              <span className="font-bold text-slate-900">{myPollingUnits.length}</span>
            </div>
            
            {/* Quick PWA Install Trigger / Status */}
            {!isStandalone ? (
              <button
                type="button"
                id="btn-quick-pwa-install"
                onClick={async () => {
                  setInstallStatusMsg(null);
                  const res = await promptInstall();
                  if (res.outcome === 'accepted') {
                    setInstallStatusMsg('App installed successfully to your home screen!');
                  }
                }}
                className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold shadow-2xs transition-colors"
                title="Install Katukan Anka PWA to Mobile Home Screen"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Install PWA</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>PWA Standalone</span>
              </div>
            )}

            <button
              onClick={() => setActiveView('settings')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                pendingCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount > 0 ? `${pendingCount} Offline` : 'Synced'}</span>
            </button>
          </div>
        </div>

        {/* Observer Sub-Navigation Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveView('pus')}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'pus' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            My PUs
          </button>
          <button
            onClick={() => {
              setActiveView('opening');
              captureGps();
            }}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'opening' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Opening
          </button>
          <button
            onClick={() => {
              setActiveView('voting');
              captureGps();
            }}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'voting' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Voting
          </button>
          <button
            onClick={() => {
              setActiveView('closing');
              captureGps();
            }}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'closing' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Closing
          </button>
          <button
            onClick={() => {
              setActiveView('incident');
              captureGps();
            }}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'incident' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Incident
          </button>
          <button
            onClick={() => {
              setActiveView('result');
              captureGps();
            }}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors ${
              activeView === 'result' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Result
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`py-2 px-2 rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-1 ${
              activeView === 'settings' || activeView === 'sync' ? 'bg-emerald-700 text-white font-semibold shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Global Submission Alert Message */}
      {submitMessage && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            submitMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : submitMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="font-bold">{submitMessage.text}</div>
          {submitMessage.details && submitMessage.details.length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
              {submitMessage.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* VIEW 1: POLLING UNITS LIST */}
      {activeView === 'pus' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Assigned Polling Units</h2>
            <span className="text-xs text-slate-500">Anka LGA Monitoring Zone</span>
          </div>

          <div className="space-y-3">
            {myPollingUnits.map((pu) => (
              <div
                key={pu.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        {pu.code}
                      </span>
                      <span className="text-xs text-slate-500">Ward: {pu.wardName}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">{pu.name}</h3>
                    <p className="text-xs text-slate-500">{pu.address}</p>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      pu.status === 'NORMAL'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : pu.status === 'ATTENTION'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : pu.status === 'CRITICAL'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {pu.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 my-2 border-y border-slate-100 text-slate-700">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Registered Voters</span>
                    <span className="font-semibold text-slate-900">{pu.registeredVoters}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last Report</span>
                    <span className="font-semibold text-slate-900">
                      {pu.lastReportTime ? new Date(pu.lastReportTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Incidents</span>
                    <span className="font-semibold text-slate-900">{pu.incidentCount} logged</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Result Status</span>
                    <span
                      className={`font-semibold ${
                        pu.resultStatus === 'VERIFIED'
                          ? 'text-emerald-700'
                          : pu.resultStatus === 'FLAGGED' || pu.resultStatus === 'DISCREPANT'
                          ? 'text-amber-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {pu.resultStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Quick action triggers for this PU */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedPuId(pu.id);
                      setActiveView('opening');
                      captureGps();
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                  >
                    Opening Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPuId(pu.id);
                      setActiveView('voting');
                      captureGps();
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                  >
                    Voting Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPuId(pu.id);
                      setActiveView('incident');
                      captureGps();
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    Report Incident
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPuId(pu.id);
                      setActiveView('result');
                      captureGps();
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    Submit Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: OPENING REPORT FORM */}
      {activeView === 'opening' && (
        <form onSubmit={handleOpeningSubmit} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Opening Report</h2>
              <p className="text-xs text-slate-500">Record poll opening status and availability of sensitive materials</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono">
              FORM AEMS-01
            </span>
          </div>

          {/* PU Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Polling Unit</label>
            <select
              value={selectedPuId}
              onChange={(e) => handlePuChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              {myPollingUnits.map((pu) => (
                <option key={pu.id} value={pu.id}>
                  [{pu.code}] {pu.name} ({pu.wardName} Ward)
                </option>
              ))}
            </select>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observer Arrival Time</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Poll Opening Time</label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Opening Verification Checklist</h3>

            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-xs text-slate-700">Are INEC Polling Officials Present?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={officialsPresent} onChange={() => setOfficialsPresent(true)} /> Yes
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={!officialsPresent} onChange={() => setOfficialsPresent(false)} /> No
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-xs text-slate-700">All Election Materials Intact & Available?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={materialsAvailable} onChange={() => setMaterialsAvailable(true)} /> Yes
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={!materialsAvailable} onChange={() => setMaterialsAvailable(false)} /> No
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-xs text-slate-700">Security Personnel Present?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={securityPresent} onChange={() => setSecurityPresent(true)} /> Yes
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={!securityPresent} onChange={() => setSecurityPresent(false)} /> No
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-xs text-slate-700">BVAS Machine Configured & Functioning?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={bvasFunctioning} onChange={() => setBvasFunctioning(true)} /> Yes
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={!bvasFunctioning} onChange={() => setBvasFunctioning(false)} /> No
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-slate-700">Polling Unit Formally Opened for Accreditation?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={puOpened} onChange={() => setPuOpened(true)} /> Yes
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={!puOpened} onChange={() => setPuOpened(false)} /> No
                </label>
              </div>
            </div>
          </div>

          {/* GPS Auto Tag */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-semibold text-slate-800">GPS Timestamp Tag:</span>{' '}
                <span className="text-slate-500">
                  {gpsLocation ? `${gpsLocation.latitude}, ${gpsLocation.longitude} (±${gpsLocation.accuracy}m)` : 'Not captured'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={captureGps}
              disabled={gpsLoading}
              className="text-xs bg-slate-200 hover:bg-slate-300 px-2.5 py-1 rounded text-slate-800 font-medium transition-colors"
            >
              {gpsLoading ? 'Locating...' : 'Refresh GPS'}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Field Observation Notes (Optional)</label>
            <textarea
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              rows={2}
              placeholder="Record any logistical notes, queue behavior, or weather conditions..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveView('pus')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Opening Report</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: VOTING REPORT FORM */}
      {activeView === 'voting' && (
        <form onSubmit={handleVotingSubmit} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Voting Progress Report</h2>
              <p className="text-xs text-slate-500">Monitor ongoing voting, queue size, and accreditation flow</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono">
              FORM AEMS-02
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Polling Unit</label>
            <select
              value={selectedPuId}
              onChange={(e) => handlePuChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {myPollingUnits.map((pu) => (
                <option key={pu.id} value={pu.id}>
                  [{pu.code}] {pu.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Queue Level</label>
              <select
                value={queueLevel}
                onChange={(e) => setQueueLevel(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="LOW">Low (&lt; 20 voters)</option>
                <option value="MEDIUM">Medium (20 - 70 voters)</option>
                <option value="HIGH">High (70+ voters)</option>
                <option value="EMPTY">No Queue / Cleared</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Queue Size</label>
              <input
                type="number"
                value={queueSize}
                onChange={(e) => setQueueSize(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Security Environment</label>
              <select
                value={securitySituation}
                onChange={(e) => setSecuritySituation(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="CALM">Calm & Orderly</option>
                <option value="TENSE">Tense Atmosphere</option>
                <option value="DISRUPTED">Disrupted / Agitated</option>
                <option value="CRITICAL">Critical Incident Nearby</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-2">
                <input
                  type="checkbox"
                  checked={votingBvasOk}
                  onChange={(e) => setVotingBvasOk(e.target.checked)}
                  className="rounded"
                />
                BVAS Device operating normally without freeze
              </label>
            </div>
          </div>

          {/* GPS Auto Tag */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-semibold text-slate-800">GPS Stamp:</span>{' '}
                <span className="text-slate-500">
                  {gpsLocation ? `${gpsLocation.latitude}, ${gpsLocation.longitude}` : 'Click capture'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={captureGps}
              className="text-xs bg-slate-200 hover:bg-slate-300 px-2.5 py-1 rounded text-slate-800 transition-colors"
            >
              Refresh GPS
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observation Notes</label>
            <textarea
              value={votingNotes}
              onChange={(e) => setVotingNotes(e.target.value)}
              rows={2}
              placeholder="Describe crowd pace, priority voting for PWDs, etc."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveView('pus')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Voting Report</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 4: CLOSING REPORT FORM */}
      {activeView === 'closing' && (
        <form onSubmit={handleClosingSubmit} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Closing & Counting Report</h2>
              <p className="text-xs text-slate-500">Observe end of voting, ballot sorting, and public vote counting</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono">
              FORM AEMS-03
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Polling Unit</label>
            <select
              value={selectedPuId}
              onChange={(e) => handlePuChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {myPollingUnits.map((pu) => (
                <option key={pu.id} value={pu.id}>
                  [{pu.code}] {pu.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Closing Time</label>
            <input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              required
            />
          </div>

          <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={votingCompleted}
                onChange={(e) => setVotingCompleted(e.target.checked)}
                className="rounded"
              />
              All voters in line by 2:30 PM were accredited and allowed to vote
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={countingStarted}
                onChange={(e) => setCountingStarted(e.target.checked)}
                className="rounded"
              />
              Vote counting conducted in open view of party agents and observers
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={resultDisplayed}
                onChange={(e) => setResultDisplayed(e.target.checked)}
                className="rounded"
              />
              Form EC8A completed and displayed publicly at polling unit
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Closing & Counting Notes</label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={2}
              placeholder="Note any objections raised by party agents or sorting irregularities..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveView('pus')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Closing Report</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 5: INCIDENT REPORTING FORM */}
      {activeView === 'incident' && (
        <form onSubmit={handleIncidentSubmit} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Report Field Incident
              </h2>
              <p className="text-xs text-slate-500">All incident reports undergo objective verification by verification officers</p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono">
              STATUS: UNDER REVIEW
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Polling Unit</label>
            <select
              value={selectedPuId}
              onChange={(e) => handlePuChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
            >
              {myPollingUnits.map((pu) => (
                <option key={pu.id} value={pu.id}>
                  [{pu.code}] {pu.name} ({pu.wardName} Ward)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Category</label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value as IncidentCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
              >
                <option value="BVAS_ISSUE">BVAS Issue / Malfunction</option>
                <option value="LATE_OPENING">Late Opening of Polling Unit</option>
                <option value="MISSING_MATERIALS">Missing Materials / Ballots</option>
                <option value="SECURITY_INCIDENT">Security Threat / Disorder</option>
                <option value="INTIMIDATION">Intimidation / Harassment</option>
                <option value="VIOLENCE">Violence / Physical Altercation</option>
                <option value="VOTING_INTERRUPTION">Voting Interruption / Halting</option>
                <option value="ACCESSIBILITY_ISSUE">Accessibility Barrier</option>
                <option value="RESULT_ISSUE">Result Sheet / Collation Issue</option>
                <option value="OTHER">Other Incident</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level</label>
              <select
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value as IncidentSeverity)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-amber-600"
              >
                <option value="LOW" className="text-slate-700">LOW (Minor delay/clarification)</option>
                <option value="MEDIUM" className="text-amber-700">MEDIUM (Temporary pause &lt; 30 min)</option>
                <option value="HIGH" className="text-orange-700">HIGH (Prolonged disruption)</option>
                <option value="CRITICAL" className="text-red-700">CRITICAL (Threat to life/materials)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description of Incident</label>
            <textarea
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              rows={3}
              placeholder="Describe what occurred factually. Do not make unverified allegations of fraud or assume intent."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              required
            />
          </div>

          {/* Evidence Upload & Hash Tagging */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Supporting Evidence (Photos / Documents)</h3>
                <p className="text-[11px] text-slate-500">Auto-calculates SHA-256 cryptographic hash to prevent tampering</p>
              </div>
              <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors">
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>Attach Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'incident')}
                  className="hidden"
                />
              </label>
            </div>

            {incidentEvidencePhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {incidentEvidencePhotos.map((ev, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-2 rounded-lg flex items-center gap-2 text-xs shadow-2xs">
                    <img src={ev.dataUrl} alt="Evidence" className="w-12 h-12 rounded object-cover border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{ev.fileName}</div>
                      <div className="text-[10px] text-slate-500">{(ev.fileSize / 1024).toFixed(1)} KB</div>
                      <div className="text-[9px] font-mono text-emerald-700 truncate font-semibold" title={`SHA256: ${ev.sha256Hash}`}>
                        SHA: {ev.sha256Hash.substring(0, 16)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveView('pus')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Incident for Review</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 6: RESULT SUBMISSION FORM WITH ARITHMETIC VALIDATION */}
      {activeView === 'result' && (
        <form onSubmit={handleResultSubmit} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-blue-700 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Submit Polling Unit Result (Form EC8A)
              </h2>
              <p className="text-xs text-slate-500">Enter certified numbers from the official polling unit result sheet</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono">
              FORM EC8A ENTRY
            </span>
          </div>

          {/* Polling Unit Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Polling Unit</label>
            <select
              value={selectedPuId}
              onChange={(e) => handlePuChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {myPollingUnits.map((pu) => (
                <option key={pu.id} value={pu.id}>
                  [{pu.code}] {pu.name} ({pu.wardName} Ward)
                </option>
              ))}
            </select>
          </div>

          {/* Registered & Accredited Voters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Voters in PU</label>
              <input
                type="number"
                value={registeredVoters}
                onChange={(e) => setRegisteredVoters(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Accredited Voters (BVAS Total)</label>
              <input
                type="number"
                value={accreditedVoters}
                onChange={(e) => setAccreditedVoters(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Dynamic Political Party Vote Entries */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Political Party Votes</h3>
              <span className="text-xs text-slate-500">Sum of Parties: <strong className="text-slate-900">{sumPartyVotes}</strong></span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {politicalParties.map((party) => (
                <div key={party.code} className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded text-white shadow-xs"
                      style={{ backgroundColor: party.color }}
                    >
                      {party.code}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={party.name}>
                      {party.name}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={partyVotes[party.code] ?? 0}
                    onChange={(e) =>
                      setPartyVotes((prev) => ({
                        ...prev,
                        [party.code]: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Valid, Rejected, Total Votes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Votes</label>
              <input
                type="number"
                value={validVotes}
                onChange={(e) => setValidVotes(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rejected Votes</label>
              <input
                type="number"
                value={rejectedVotes}
                onChange={(e) => setRejectedVotes(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Votes Cast</label>
              <input
                type="number"
                value={totalVotes}
                onChange={(e) => setTotalVotes(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* REAL-TIME ARITHMETIC VALIDATION ENGINE BOX */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
              isResultMathematicallyValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {isResultMathematicallyValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Validation Passed: All Mathematical Checks Match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Flagged for Review: Mathematical Discrepancy Detected</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={mathMatchesTotal ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-bold'}>
                  {mathMatchesTotal ? '✓' : '✗'} Valid + Rejected = Total
                </span>
                <span className="text-slate-500">({calculatedTotal} vs {totalVotes})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={turnoutOk ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-bold'}>
                  {turnoutOk ? '✓' : '✗'} Total ≤ Accredited
                </span>
                <span className="text-slate-500">({totalVotes} ≤ {accreditedVoters})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={partiesMatchValid ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-bold'}>
                  {partiesMatchValid ? '✓' : '✗'} Parties Sum = Valid
                </span>
                <span className="text-slate-500">({sumPartyVotes} vs {validVotes})</span>
              </div>
            </div>

            {!isResultMathematicallyValid && (
              <p className="text-[11px] text-amber-800 pt-1 border-t border-amber-200">
                Note: AEMS allows submission of flagged records for transparent audit and independent verifier review. Discrepancies are logged without bias.
              </p>
            )}
          </div>

          {/* Form EC8A Photo Evidence */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Form EC8A Result Sheet Photograph</h3>
                <p className="text-[11px] text-slate-500">Upload high-resolution photo of the signed EC8A result sheet</p>
              </div>
              <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload EC8A</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'result')}
                  className="hidden"
                />
              </label>
            </div>

            {resultEvidence.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {resultEvidence.map((ev, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-2 rounded-lg flex items-center gap-2 text-xs shadow-2xs">
                    <img src={ev.dataUrl} alt="EC8A" className="w-12 h-12 rounded object-cover border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{ev.fileName}</div>
                      <div className="text-[10px] text-slate-500">{(ev.fileSize / 1024).toFixed(1)} KB</div>
                      <div className="text-[9px] font-mono text-emerald-700 truncate font-semibold">
                        SHA: {ev.sha256Hash.substring(0, 16)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveView('pus')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Result for Verification</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 7: OBSERVER SETTINGS, PWA INSTALLATION & OFFLINE SYNC */}
      {(activeView === 'settings' || activeView === 'sync') && (
        <div className="space-y-4 text-slate-900">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Observer Device Settings & PWA Hub
                </h2>
                <p className="text-xs text-slate-500">
                  Install mobile home screen app, manage offline cache, and calibrate field telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSimulatedOffline}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                  isSimulatedOffline
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isSimulatedOffline ? 'Simulating Offline' : 'Network Active'}
              </button>
            </div>
          </div>

          {/* 1. CUSTOM PWA INSTALL PROMPT SECTION (HERO CARD) */}
          <div className="bg-gradient-to-br from-white to-emerald-50/40 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Mobile Home Screen PWA Installation
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      OFFLINE READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Install Katukan Anka directly to your smartphone home screen for 1-tap launching and zero-signal operation in Anka LGA.
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5">
                {isStandalone ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Standalone PWA Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full font-semibold">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Browser Mode ({platform.toUpperCase()})
                  </span>
                )}
              </div>
            </div>

            {/* Installation Action Banner */}
            <div className="bg-white border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1.5 text-left w-full md:w-auto">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  {isStandalone
                    ? 'Katukan Anka PWA is Installed and Running Standalone'
                    : platform === 'ios'
                    ? 'Add Katukan Anka to your iPhone / iPad Home Screen'
                    : 'One-Click PWA Installation for Field Observers'}
                </div>
                <p className="text-xs text-slate-500 max-w-xl">
                  {isStandalone
                    ? 'All polling unit forms, opening checklists, voting tallies, and EC8A result sheets are cached in device storage and function without internet.'
                    : platform === 'ios'
                    ? 'Safari allows adding this web app to your home screen with full offline caching and high-resolution camera access.'
                    : 'Tap the button below to prompt native installation. The app icon will be pinned to your phone app drawer and home screen.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {/* Custom PWA Install Prompt Button */}
                <button
                  type="button"
                  id="btn-pwa-install-settings"
                  onClick={async () => {
                    setInstallStatusMsg(null);
                    const res = await promptInstall();
                    if (res.outcome === 'accepted') {
                      setInstallStatusMsg('Katukan Anka PWA was successfully installed to your device!');
                    } else if (res.outcome === 'manual') {
                      setInstallStatusMsg('Follow the on-screen steps to add the app to your home screen.');
                    } else if (res.outcome === 'dismissed') {
                      setInstallStatusMsg('Installation prompt closed. You can install anytime.');
                    }
                  }}
                  disabled={isStandalone}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                    isStandalone
                      ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border border-emerald-500 hover:shadow-emerald-900/20'
                  }`}
                  title="Install Katukan Anka Observer PWA"
                >
                  {isStandalone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>App Already Installed</span>
                    </>
                  ) : platform === 'ios' ? (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>View iOS Install Steps</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 animate-bounce" />
                      <span>Install Observer PWA</span>
                    </>
                  )}
                </button>

                {/* Secondary Guide button */}
                <button
                  type="button"
                  onClick={() => setShowIosGuide(true)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Manual Guide</span>
                </button>
              </div>
            </div>

            {/* Install Status Feedback Message */}
            {installStatusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{installStatusMsg}</span>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">100% Offline</div>
                  <div className="text-[10px] text-slate-500">Full local storage</div>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 shadow-2xs">
                <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">Instant Open</div>
                  <div className="text-[10px] text-slate-500">Service Worker cache</div>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 shadow-2xs">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">GPS Geostamping</div>
                  <div className="text-[10px] text-slate-500">Coordinates verified</div>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 shadow-2xs">
                <Camera className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">EC8A SHA-256</div>
                  <div className="text-[10px] text-slate-500">Tamper-proof hash</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FIELD OBSERVER HARDWARE & DISPLAY PREFERENCES */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-600" />
              Field Telemetry & Observer Hardware Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              {/* GPS Auto-stamping */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Auto-Stamp GPS Coordinates</div>
                  <div className="text-[10px] text-slate-500">Acquire lat/long on opening forms</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoGpsStamp(!autoGpsStamp)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    autoGpsStamp ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      autoGpsStamp ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Audio Alerts */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Audible Incident Beeps</div>
                  <div className="text-[10px] text-slate-500">Chime on dispatch confirmation</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioAlerts(!audioAlerts)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    audioAlerts ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      audioAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sunlight High-Contrast */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Outdoor Sunlight Mode</div>
                  <div className="text-[10px] text-slate-500">High-contrast borders for bright glare</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrastSunlight(!highContrastSunlight)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    highContrastSunlight ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      highContrastSunlight ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 3. OFFLINE SYNCHRONIZATION MANAGER */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 text-slate-900 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  Local Queue & Network Sync Engine
                </h3>
                <p className="text-xs text-slate-500">Transmission queue of reports submitted while disconnected</p>
              </div>

              <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                SW CACHE: ACTIVE
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Pending Uploads</span>
                <span className="text-xl font-bold text-amber-700">{pendingCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Network State</span>
                <span className={`text-sm font-bold ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE (QUEUED)'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Last Cloud Sync</span>
                <span className="text-sm font-bold text-slate-800">{lastSyncTime || 'Pending'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => syncQueueNow()}
                  disabled={isSyncing || pendingCount === 0}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Queued Items in Local Storage ({syncQueue.length})
              </h4>

              {syncQueue.length === 0 ? (
                <p className="text-slate-500 text-xs py-5 text-center bg-slate-50 rounded-xl border border-slate-200">
                  Offline transmission queue is clean. All recorded reports are synchronized.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {syncQueue.map((item) => (
                    <div
                      key={item.localId}
                      className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.type.replace('_', ' ')}</span>
                          <span className="font-mono text-[10px] text-slate-500">ID: {item.localId}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          PU: {item.payload?.puCode || 'General'} • Created {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : item.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
