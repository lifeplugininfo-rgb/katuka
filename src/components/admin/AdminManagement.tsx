import React, { useState } from 'react';
import {
  Users,
  Building2,
  Flag,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const AdminManagement: React.FC = () => {
  const { wards, pollingUnits, politicalParties, auditLogs, resetDemoData } = useElection();
  const { currentUser, allUsers, isFirebaseSignedIn, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'pus' | 'observers' | 'parties' | 'audit'>('pus');
  const [searchFilter, setSearchFilter] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetData = async () => {
    if (window.confirm('Reset all election data back to initial demo state?')) {
      await resetDemoData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    }
  };

  // Export audit logs
  const handleExportAuditLogs = () => {
    let csv = 'Timestamp,Action,Category,Target Type,Target ID,User ID,User Name,User Role,Details\n';
    auditLogs.forEach((log) => {
      csv += `"${log.timestamp}","${log.action}","${log.category}","${log.targetType}","${log.targetId}","${log.userId}","${log.userName}","${log.userRole}","${log.details.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEMS_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h1 className="font-bold text-lg text-slate-900">AEMS Administrative Control & Governance</h1>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
              ROLE: {currentUser?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage wards, polling units, accredited observers, political parties, and immutable audit logs
          </p>
        </div>

        {/* Tab Buttons & Reset */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('pus')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'pus' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Polling Units
          </button>
          <button
            onClick={() => setActiveTab('observers')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'observers' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Observers ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('parties')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'parties' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Parties ({politicalParties.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
          <button
            type="button"
            onClick={handleResetData}
            className="px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 border border-red-200 font-medium transition-colors"
            title="Reset to clean baseline dataset"
          >
            {resetSuccess ? 'Restored!' : 'Reset Data'}
          </button>
        </div>
      </div>

      {/* TAB 1: POLLING UNITS & WARDS */}
      {activeTab === 'pus' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Anka LGA Polling Units Directory</h2>
                <p className="text-xs text-slate-500">10 Wards • 130 Polling Units Configuration</p>
              </div>
              <div className="relative w-64 text-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PU code, name or ward..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">PU Code</th>
                    <th className="py-2.5 px-3 font-semibold">PU Name & Address</th>
                    <th className="py-2.5 px-3 font-semibold">Ward</th>
                    <th className="py-2.5 px-3 font-semibold">Registered Voters</th>
                    <th className="py-2.5 px-3 font-semibold">Coordinates (Lat, Lng)</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pollingUnits
                    .filter(
                      (p) =>
                        !searchFilter ||
                        p.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        p.wardName.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">{p.code}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-500">{p.address}</div>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{p.wardName}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.registeredVoters}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{p.lat}, {p.lng}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              p.status === 'NORMAL'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : p.status === 'ATTENTION'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : p.status === 'CRITICAL'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OBSERVERS & FIELD DEPLOYMENTS */}
      {activeTab === 'observers' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Accredited Field Observers</h2>
              <p className="text-xs text-slate-500">Observer credential registry, ward assignments, and activity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allUsers.map((user) => (
              <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {user.observerId || user.role}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      user.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'
                    }`}
                  >
                    {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>Organization: <strong className="text-slate-800">{user.organization || 'Civic Observer'}</strong></div>
                  <div>Email: <strong className="text-slate-800">{user.email}</strong></div>
                  <div>Role: <strong className="text-slate-800">{user.role}</strong></div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Assigned PUs: {user.assignedPuIds?.length || 0}</span>
                  <span>Assigned Wards: {user.assignedWardIds?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: POLITICAL PARTIES */}
      {activeTab === 'parties' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Political Parties Registry</h2>
              <p className="text-xs text-slate-500">Configured political parties eligible for Form EC8A tally in Anka LGA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {politicalParties.map((party) => (
              <div key={party.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-xs"
                  style={{ backgroundColor: party.color }}
                >
                  {party.code}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{party.name}</div>
                  <div className="text-[11px] text-slate-500">Party Code: {party.code}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Status: Registered for Ballot</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Immutable System Audit Logs
              </h2>
              <p className="text-xs text-slate-500">All submissions, verifications, and user actions are timestamped and logged</p>
            </div>

            <button
              onClick={handleExportAuditLogs}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Audit Trail CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-700">{log.action}</td>
                    <td className="py-2 px-3 font-sans text-slate-900 font-medium">{log.userName}</td>
                    <td className="py-2 px-3 text-slate-500 font-sans">{log.userRole}</td>
                    <td className="py-2 px-3 text-slate-700 font-sans">
                      {log.targetType} ({log.targetId})
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-sans truncate max-w-xs" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
