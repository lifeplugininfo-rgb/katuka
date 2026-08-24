import React, { useState } from 'react';
import {
  AlertTriangle,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Camera,
  Shield,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  FileCheck,
} from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import { useAuth } from '../../context/AuthContext';
import { IncidentReport, IncidentSeverity, IncidentCategory, VerificationStatus } from '../../types';

export const IncidentCentre: React.FC = () => {
  const { incidents, wards, pollingUnits, verifyIncident } = useElection();
  const { currentUser } = useAuth();

  // Filters
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Verifier Modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<VerificationStatus>('VERIFIED');
  const [verifierNotes, setVerifierNotes] = useState<string>('');
  const [escalatedTo, setEscalatedTo] = useState<string>('LGA_COORDINATOR');
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<string | null>(null);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Can this user verify?
  const canVerify =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'VERIFIER' ||
    currentUser?.role === 'LGA_COORDINATOR' ||
    currentUser?.role === 'WARD_COORDINATOR';

  // Filtered List
  const filteredIncidents = incidents.filter((inc) => {
    const matchWard = selectedWard === 'ALL' || inc.wardId === selectedWard;
    const matchSeverity = selectedSeverity === 'ALL' || inc.severity === selectedSeverity;
    const matchStatus = selectedStatus === 'ALL' || inc.verificationStatus === selectedStatus;
    const matchCategory = selectedCategory === 'ALL' || inc.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.puCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.puName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchWard && matchSeverity && matchStatus && matchCategory && matchSearch;
  });

  const handleOpenIncident = (inc: IncidentReport) => {
    setSelectedIncident(inc);
    setVerificationDecision(inc.verificationStatus === 'UNDER_REVIEW' ? 'VERIFIED' : inc.verificationStatus);
    setVerifierNotes(inc.verifierNotes || '');
    setVerifyStatusMessage(null);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    if (!verifierNotes.trim()) {
      setVerifyStatusMessage('Mandatory verifier notes are required for auditability.');
      return;
    }

    setIsSubmittingVerification(true);
    const res = await verifyIncident(selectedIncident.id, {
      status: verificationDecision,
      verifierNotes: verifierNotes.trim(),
      verifierId: currentUser?.id || 'ver-01',
      verifierName: currentUser?.name || 'Verification Officer',
      escalatedTo: verificationDecision === 'ESCALATED' ? escalatedTo : undefined,
    });

    setIsSubmittingVerification(false);
    if (res.success) {
      setVerifyStatusMessage('Verification decision recorded and logged in audit trail.');
      setTimeout(() => {
        setSelectedIncident(null);
      }, 1500);
    } else {
      setVerifyStatusMessage(res.message || 'Failed to record verification');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h1 className="font-bold text-lg text-slate-900">Anka LGA Incident Centre</h1>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">
              {incidents.length} INCIDENTS LOGGED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective verification queue: Reports undergo multi-source verification without unsupported allegations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
            Under Review: <strong className="text-amber-700">{incidents.filter((i) => i.verificationStatus === 'UNDER_REVIEW').length}</strong>
          </span>
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
            Verified: <strong className="text-emerald-700">{incidents.filter((i) => i.verificationStatus === 'VERIFIED').length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-wrap items-center gap-2.5 text-xs shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PU code, name, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Ward Filter */}
        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All 10 Wards</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} Ward
            </option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="VERIFIED">Verified</option>
          <option value="PARTIALLY_VERIFIED">Partially Verified</option>
          <option value="REJECTED">Rejected</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm shadow-xs">
            No incident reports matching current filters.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => handleOpenIncident(inc)}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 cursor-pointer transition-all shadow-xs group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      inc.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : inc.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : inc.severity === 'MEDIUM'
                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {inc.severity}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{inc.categoryLabel}</span>
                  <span className="text-xs font-mono bg-slate-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-slate-200">
                    {inc.puCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      inc.verificationStatus === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : inc.verificationStatus === 'PARTIALLY_VERIFIED'
                        ? 'bg-teal-50 text-teal-800 border-teal-300'
                        : inc.verificationStatus === 'UNDER_REVIEW'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : inc.verificationStatus === 'ESCALATED'
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {inc.verificationStatus.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-3 leading-relaxed">{inc.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Location: <strong className="text-slate-800">{inc.puName} ({inc.wardName})</strong></span>
                  {inc.evidence && inc.evidence.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <Camera className="w-3.5 h-3.5" />
                      {inc.evidence.length} Photo Evidence (Hashed)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span>Reporter: <strong className="text-slate-700">{inc.observerName}</strong></span>
                  <span>Time: <strong className="text-slate-700">{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* VERIFIER MODAL / INSPECTION DIALOG */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 text-slate-900 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      selectedIncident.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {selectedIncident.severity}
                  </span>
                  <h2 className="font-bold text-base text-slate-900">{selectedIncident.categoryLabel}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  PU Code: <strong className="text-emerald-700 font-mono font-bold">{selectedIncident.puCode}</strong> • {selectedIncident.puName} ({selectedIncident.wardName} Ward)
                </p>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="text-slate-600 block font-semibold text-[11px] uppercase">Incident Narrative:</span>
              <p className="text-slate-800 leading-relaxed text-sm">{selectedIncident.description}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                <span>Observer: {selectedIncident.observerName}</span>
                <span>
                  GPS:{' '}
                  {selectedIncident.gps
                    ? `${selectedIncident.gps.latitude}, ${selectedIncident.gps.longitude} (±${selectedIncident.gps.accuracy}m)`
                    : 'Not tagged'}
                </span>
                <span>Time: {new Date(selectedIncident.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Photo Evidence with SHA-256 Check */}
            {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cryptographic Evidence Trail</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedIncident.evidence.map((ev) => (
                    <div key={ev.id} className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2 text-xs">
                      <img src={ev.dataUrl} alt="Evidence" className="w-14 h-14 rounded object-cover border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{ev.fileName}</div>
                        <div className="text-[10px] text-slate-500">{(ev.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(ev.timestamp).toLocaleTimeString()}</div>
                        <div className="text-[9px] font-mono text-emerald-700 truncate font-semibold" title={ev.sha256Hash}>
                          SHA-256: {ev.sha256Hash}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verifier Action Section */}
            {canVerify ? (
              <form onSubmit={handleVerifySubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-teal-600" />
                    Verification Officer Review Workspace
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Audited Decision</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['VERIFIED', 'PARTIALLY_VERIFIED', 'REJECTED', 'ESCALATED'] as VerificationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setVerificationDecision(st)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition-all ${
                        verificationDecision === st
                          ? st === 'VERIFIED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'PARTIALLY_VERIFIED'
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : st === 'REJECTED'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Verifier Notes & Audit Rationale
                  </label>
                  <textarea
                    value={verifierNotes}
                    onChange={(e) => setVerifierNotes(e.target.value)}
                    rows={2}
                    placeholder="Provide justification, confirmation source (e.g. phone with SPO, technical officer deployment), or escalation reason..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    required
                  />
                </div>

                {verifyStatusMessage && (
                  <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                    {verifyStatusMessage}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Verifier: <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role})
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingVerification}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Record Verification Decision</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-1">Verification Status: {selectedIncident.verificationStatus}</span>
                <p>Verifier Notes: {selectedIncident.verifierNotes || 'No notes added yet.'}</p>
                <span className="text-[10px] text-slate-500 block mt-1">Verified By: {selectedIncident.verifierName || 'Pending'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
