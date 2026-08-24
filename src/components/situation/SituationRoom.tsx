import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  RefreshCw,
  Bell,
  Check,
  AlertOctagon,
  FileCheck2,
} from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import { useAuth } from '../../context/AuthContext';
import { AnkaMap } from '../map/AnkaMap';
import { PollingUnit } from '../../types';

export const SituationRoom: React.FC = () => {
  const {
    election,
    wards,
    pollingUnits,
    incidents,
    alerts,
    results,
    openingReports,
    votingReports,
    closingReports,
    analytics,
    acknowledgeAlert,
    refreshData,
  } = useElection();

  const { currentUser } = useAuth();
  const [selectedPuForDrawer, setSelectedPuForDrawer] = useState<PollingUnit | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // KPIs
  const totalPUs = pollingUnits.length;
  const reportedPUs = pollingUnits.filter((p) => p.lastReportTime).length;
  const coverageRate = analytics?.summary?.coverageRate ?? (totalPUs > 0 ? ((reportedPUs / totalPUs) * 100).toFixed(1) : 0);
  const turnoutRate = analytics?.summary?.turnoutRate ?? 0;
  const criticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL');
  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  // Reporting Gaps (PUs with status NO_REPORT)
  const reportingGaps = pollingUnits.filter((p) => p.status === 'NO_REPORT');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-900">
      {/* Top Banner & Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="font-bold text-lg text-slate-900">Katukan Anka Situation Room</h1>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
              LIVE MONITORING ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {election?.name || '2026 Katukan Anka Situation Room Election Observation Exercise'} • Real-Time Neutral Observation Feed
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs text-slate-500 font-mono">
            Auto-Polling: <strong className="text-emerald-700">Active</strong>
          </span>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Ticker Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Coverage Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-700">{coverageRate}%</span>
            <span className="text-[10px] text-slate-400">({reportedPUs}/{totalPUs} PUs)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Estimated Turnout</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-700">{turnoutRate}%</span>
            <span className="text-[10px] text-slate-400">Accredited</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Reports Received</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">
              {openingReports.length + votingReports.length + closingReports.length}
            </span>
            <span className="text-[10px] text-slate-400">Forms Filed</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Critical Incidents</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-black ${criticalIncidents.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {criticalIncidents.length}
            </span>
            <span className="text-[10px] text-slate-400">of {incidents.length} total</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Results Received</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-700">{results.length}</span>
            <span className="text-[10px] text-slate-400">Submissions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">Active Alerts</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-black ${activeAlerts.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-900'}`}>
              {activeAlerts.length}
            </span>
            <span className="text-[10px] text-slate-400">Unacknowledged</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Map + Alerts Engine & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive Leaflet Map */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Live Geographic Monitoring • Anka LGA Wards
            </h2>
            <span className="text-xs text-slate-500">10 Wards • Color-coded PU Status</span>
          </div>

          <div className="h-[480px]">
            <AnkaMap pollingUnits={pollingUnits} wards={wards} onSelectPu={(pu) => setSelectedPuForDrawer(pu)} />
          </div>
        </div>

        {/* Right 1 Col: Operational Alerts & Reporting Gaps */}
        <div className="space-y-4">
          {/* Operational Alerts Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Operational Alerts Engine ({activeAlerts.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">System Alert</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No alerts triggered.</p>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      a.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : a.severity === 'HIGH'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-[11px]">{a.title}</span>
                      <span className="text-[9px] text-slate-500">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-700 mb-1.5">{a.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                      <span className="text-slate-600 font-semibold">{a.wardName || 'Anka LGA'}</span>
                      {!a.acknowledged ? (
                        <button
                          onClick={() => acknowledgeAlert(a.id, currentUser?.name || 'Operator')}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" /> Ack
                        </button>
                      ) : (
                        <span className="text-slate-400">Ack by {a.acknowledgedBy}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reporting Gaps Watch */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <AlertOctagon className="w-4 h-4 text-slate-500" />
                <span>Reporting Gaps ({reportingGaps.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Unreported PUs</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
              {reportingGaps.length === 0 ? (
                <p className="text-emerald-700 font-medium text-xs py-2 text-center">100% Reporting Coverage! No gaps.</p>
              ) : (
                reportingGaps.map((pu) => (
                  <div
                    key={pu.id}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{pu.code}</span>
                      <p className="text-slate-500 text-[10px] truncate max-w-[170px]">{pu.name} ({pu.wardName})</p>
                    </div>
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-300">
                      NO REPORT
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Ticker */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Real-Time Observation Stream</span>
          </div>
          <span className="text-[10px] text-slate-400">Transparent & Auditable</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Latest Incidents */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Latest Incidents</h3>
            {incidents.slice(0, 3).map((inc) => (
              <div key={inc.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{inc.categoryLabel}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      inc.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : inc.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {inc.severity}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] line-clamp-2">{inc.description}</p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{inc.puCode} ({inc.wardName})</span>
                  <span>{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Latest Results Filed */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Latest Result Submissions</h3>
            {results.slice(0, 3).map((res) => (
              <div key={res.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{res.puCode}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      res.validationStatus === 'VALID'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {res.validationStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Total Votes: <strong className="text-slate-900">{res.totalVotes}</strong> (Accredited: {res.accreditedVoters})
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{res.puName}</span>
                  <span>{new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Monitoring Progress Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Ward Coverage Breakdown</h3>
            <div className="space-y-1.5">
              {wards.slice(0, 4).map((w) => {
                const wardPUs = pollingUnits.filter((p) => p.wardId === w.id);
                const reported = wardPUs.filter((p) => p.lastReportTime).length;
                const pct = wardPUs.length > 0 ? Math.round((reported / wardPUs.length) * 100) : 0;
                return (
                  <div key={w.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{w.name} Ward</span>
                      <span className="text-[11px] font-bold text-emerald-700">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
