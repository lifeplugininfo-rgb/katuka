import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Search,
  Filter,
  Shield,
  FileCheck2,
  ChevronRight,
  Eye,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import { useAuth } from '../../context/AuthContext';
import { ResultSubmission, VerificationStatus, PartyVoteEntry } from '../../types';

export const ResultCentre: React.FC = () => {
  const { results, wards, pollingUnits, politicalParties, verifyResult } = useElection();
  const { currentUser } = useAuth();

  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeModalResult, setActiveModalResult] = useState<ResultSubmission | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<VerificationStatus>('VERIFIED');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const canVerify =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'VERIFIER' ||
    currentUser?.role === 'LGA_COORDINATOR';

  // Filtered results
  const filteredResults = results.filter((res) => {
    const matchWard = selectedWard === 'ALL' || res.wardId === selectedWard;
    const matchStatus = selectedStatus === 'ALL' || res.verificationStatus === selectedStatus;
    const matchSearch =
      !searchQuery ||
      res.puCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.puName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchWard && matchStatus && matchSearch;
  });

  // Calculate Aggregated Vote Totals across all verified/submitted results
  const totalRegisteredInReported = results.reduce((acc, r) => acc + r.registeredVoters, 0);
  const totalAccreditedInReported = results.reduce((acc, r) => acc + r.accreditedVoters, 0);
  const totalVotesCast = results.reduce((acc, r) => acc + r.totalVotes, 0);
  const totalValidVotes = results.reduce((acc, r) => acc + r.validVotes, 0);
  const totalRejectedVotes = results.reduce((acc, r) => acc + r.rejectedVotes, 0);

  // Party vote aggregation
  const aggregatedPartyVotes: Record<string, number> = {};
  politicalParties.forEach((p) => {
    aggregatedPartyVotes[p.code] = 0;
  });

  results.forEach((r) => {
    r.partyVotes?.forEach((pv) => {
      aggregatedPartyVotes[pv.partyCode] = (aggregatedPartyVotes[pv.partyCode] || 0) + pv.votes;
    });
  });

  const handleOpenDetail = (r: ResultSubmission) => {
    setActiveModalResult(r);
    setVerificationDecision(r.verificationStatus === 'UNDER_REVIEW' ? 'VERIFIED' : r.verificationStatus);
    setVerificationNotes(r.verifierNotes || '');
    setFeedbackMessage(null);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalResult) return;

    const res = await verifyResult(activeModalResult.id, {
      status: verificationDecision,
      verifierNotes: verificationNotes,
      verifierId: currentUser?.id || 'ver-01',
    });

    if (res.success) {
      setFeedbackMessage('Result verification status updated.');
      setTimeout(() => {
        setActiveModalResult(null);
      }, 1500);
    } else {
      setFeedbackMessage(res.message || 'Failed to update status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-lg text-slate-900">Anka LGA Result Centre</h1>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
              {results.length} OF {pollingUnits.length} PUs RECEIVED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Form EC8A Submissions with strict double-entry arithmetic audit and photo hash verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
            Mathematically Valid: <strong className="text-emerald-700">{results.filter((r) => r.validationStatus === 'VALID').length}</strong>
          </span>
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
            Flagged for Audit: <strong className="text-amber-700">{results.filter((r) => r.validationStatus === 'FLAGGED_FOR_REVIEW').length}</strong>
          </span>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Collation Progress & Vote Aggregate (Observed PUs Only)</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Turnout:{' '}
            <strong className="text-slate-900">
              {totalRegisteredInReported > 0 ? ((totalAccreditedInReported / totalRegisteredInReported) * 100).toFixed(1) : 0}%
            </strong>
          </span>
        </div>

        {/* Aggregated Totals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Accredited Voters</span>
            <span className="text-lg font-bold text-slate-900">{totalAccreditedInReported.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Total Votes Cast</span>
            <span className="text-lg font-bold text-slate-900">{totalVotesCast.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Total Valid Votes</span>
            <span className="text-lg font-bold text-emerald-700">{totalValidVotes.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Rejected Ballots</span>
            <span className="text-lg font-bold text-amber-700">{totalRejectedVotes.toLocaleString()}</span>
          </div>
        </div>

        {/* Party Vote Distribution Bars */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Observed Party Vote Share</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {politicalParties.slice(0, 6).map((party) => {
              const votes = aggregatedPartyVotes[party.code] || 0;
              const pct = totalValidVotes > 0 ? ((votes / totalValidVotes) * 100).toFixed(1) : '0.0';
              return (
                <div key={party.code} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: party.color }}
                    >
                      {party.code}
                    </span>
                    <span className="font-bold text-slate-800">{pct}%</span>
                  </div>
                  <div className="text-[13px] font-mono font-bold text-slate-900">{votes.toLocaleString()}</div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: party.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-wrap items-center gap-2.5 text-xs shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PU Code or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All 10 Wards</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} Ward
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="FLAGGED">Flagged / Discrepancy</option>
          <option value="DISCREPANT">Discrepant</option>
        </select>
      </div>

      {/* Submitted Form EC8A Results List */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm shadow-xs">
            No Form EC8A results recorded for current filters.
          </div>
        ) : (
          filteredResults.map((res) => (
            <div
              key={res.id}
              onClick={() => handleOpenDetail(res)}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 cursor-pointer transition-all shadow-xs group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs border border-blue-200">
                    {res.puCode}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{res.puName}</h3>
                  <span className="text-xs text-slate-500">({res.wardName} Ward)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      res.validationStatus === 'VALID'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {res.validationStatus.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      res.verificationStatus === 'VERIFIED'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {res.verificationStatus}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>

              {/* Vote Row Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-1 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[10px]">Accredited / Registered</span>
                  <span className="font-semibold text-slate-900">
                    {res.accreditedVoters} / {res.registeredVoters} ({((res.accreditedVoters / (res.registeredVoters || 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Valid Votes</span>
                  <span className="font-semibold text-emerald-700">{res.validVotes}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Rejected Ballots</span>
                  <span className="font-semibold text-amber-700">{res.rejectedVotes}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Votes Cast</span>
                  <span className="font-semibold text-slate-900">{res.totalVotes}</span>
                </div>
              </div>

              {/* Party Vote Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                {res.partyVotes?.map((pv) => (
                  <span
                    key={pv.partyCode}
                    className="text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-800"
                  >
                    <strong className="text-slate-900">{pv.partyCode}:</strong> {pv.votes}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* RESULT DETAIL & VERIFICATION MODAL */}
      {activeModalResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 text-slate-900 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                    {activeModalResult.puCode}
                  </span>
                  <h2 className="font-bold text-base text-slate-900">{activeModalResult.puName}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ward: {activeModalResult.wardName} • Observer: {activeModalResult.observerName}</p>
              </div>

              <button
                onClick={() => setActiveModalResult(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Arithmetic Audit Status Box */}
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                activeModalResult.validationStatus === 'VALID'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>Mathematical Integrity: {activeModalResult.validationStatus.replace('_', ' ')}</span>
                <span className="text-xs font-mono text-slate-600">Timestamp: {new Date(activeModalResult.timestamp).toLocaleString()}</span>
              </div>
              {activeModalResult.validationIssues && activeModalResult.validationIssues.length > 0 && (
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-amber-800">
                  {activeModalResult.validationIssues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Complete Numbers Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Registered Voters</span>
                <span className="font-bold text-base text-slate-900">{activeModalResult.registeredVoters}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Accredited Voters</span>
                <span className="font-bold text-base text-slate-900">{activeModalResult.accreditedVoters}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Valid Votes</span>
                <span className="font-bold text-base text-emerald-700">{activeModalResult.validVotes}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Rejected Ballots</span>
                <span className="font-bold text-base text-amber-700">{activeModalResult.rejectedVotes}</span>
              </div>
            </div>

            {/* Political Party Table */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Party Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {activeModalResult.partyVotes?.map((pv) => (
                  <div key={pv.partyCode} className="bg-white border border-slate-200 p-2 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                    <span className="font-bold text-slate-800">{pv.partyCode}</span>
                    <span className="font-mono font-bold text-slate-900">{pv.votes}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form EC8A Photo & Hash */}
            {activeModalResult.evidence && activeModalResult.evidence.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Official Form EC8A Photograph Evidence</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModalResult.evidence.map((ev) => (
                    <div key={ev.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center gap-3 text-xs">
                      <img src={ev.dataUrl} alt="EC8A Form" className="w-16 h-16 rounded object-cover border border-slate-200" />
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
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Verification Officer Action Panel
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {(['VERIFIED', 'UNDER_REVIEW', 'REJECTED'] as VerificationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setVerificationDecision(st)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition-all ${
                        verificationDecision === st
                          ? st === 'VERIFIED'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : st === 'UNDER_REVIEW'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
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
                    Verifier Audit Notes & Commentary
                  </label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={2}
                    placeholder="Document EC8A clarity, math reconciliation, or flag reasons..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {feedbackMessage && (
                  <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                    {feedbackMessage}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Verifier: <strong className="text-slate-800">{currentUser?.name}</strong>
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Confirm Verification</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-1">Verification Status: {activeModalResult.verificationStatus}</span>
                <p>Notes: {activeModalResult.verificationNotes || 'No notes added.'}</p>
                <span className="text-[10px] text-slate-500 block mt-1">Verified By: {activeModalResult.verifiedByName || 'Pending'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
