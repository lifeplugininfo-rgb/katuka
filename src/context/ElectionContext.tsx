import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Election,
  Ward,
  PollingUnit,
  PoliticalParty,
  OpeningReport,
  VotingReport,
  ClosingReport,
  IncidentReport,
  ResultSubmission,
  ReferenceResult,
  Alert,
  AuditLog,
  VerificationStatus,
  SystemHealth,
} from '../types';
import { useSync } from './SyncContext';
import {
  persistIncidentToFirestore,
  persistResultToFirestore,
  persistReportToFirestore,
  persistAuditLogToFirestore,
} from '../lib/firebase';

interface ElectionContextType {
  election: Election | null;
  wards: Ward[];
  pollingUnits: PollingUnit[];
  politicalParties: PoliticalParty[];
  openingReports: OpeningReport[];
  votingReports: VotingReport[];
  closingReports: ClosingReport[];
  incidents: IncidentReport[];
  results: ResultSubmission[];
  referenceResults: ReferenceResult[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  analytics: any | null;
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  submitOpeningReport: (report: any) => Promise<{ success: boolean; message?: string }>;
  submitVotingReport: (report: any) => Promise<{ success: boolean; message?: string }>;
  submitClosingReport: (report: any) => Promise<{ success: boolean; message?: string }>;
  submitIncident: (incident: any) => Promise<{ success: boolean; message?: string }>;
  verifyIncident: (id: string, payload: { status: VerificationStatus; verifierNotes: string; verifierId: string; verifierName: string; escalatedTo?: string }) => Promise<{ success: boolean; message?: string }>;
  submitResult: (result: any) => Promise<{ success: boolean; message?: string; validationStatus?: string; issues?: string[] }>;
  verifyResult: (id: string, payload: { status: VerificationStatus; verifierNotes: string; verifierId: string; verifierName: string; comparisonStatus?: any }) => Promise<{ success: boolean; message?: string }>;
  acknowledgeAlert: (alertId: string, ackBy: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  addNewPollingUnit: (pu: Partial<PollingUnit>) => Promise<void>;
  addNewParty: (party: Partial<PoliticalParty>) => Promise<void>;
}

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

export const ElectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, enqueueOfflineItem } = useSync();
  const [election, setElection] = useState<Election | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [politicalParties, setPoliticalParties] = useState<PoliticalParty[]>([]);
  const [openingReports, setOpeningReports] = useState<OpeningReport[]>([]);
  const [votingReports, setVotingReports] = useState<VotingReport[]>([]);
  const [closingReports, setClosingReports] = useState<ClosingReport[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [results, setResults] = useState<ResultSubmission[]>([]);
  const [referenceResults, setReferenceResults] = useState<ReferenceResult[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [
        elecRes,
        wardsRes,
        puRes,
        partyRes,
        opRes,
        vtRes,
        clRes,
        incRes,
        resultsRes,
        refRes,
        alertsRes,
        auditRes,
        analyticsRes,
        healthRes,
      ] = await Promise.all([
        fetch('/api/election').then((r) => r.json()),
        fetch('/api/wards').then((r) => r.json()),
        fetch('/api/polling-units').then((r) => r.json()),
        fetch('/api/political-parties').then((r) => r.json()),
        fetch('/api/reports/opening').then((r) => r.json()),
        fetch('/api/reports/voting').then((r) => r.json()),
        fetch('/api/reports/closing').then((r) => r.json()),
        fetch('/api/incidents').then((r) => r.json()),
        fetch('/api/results').then((r) => r.json()),
        fetch('/api/results/references').then((r) => r.json()),
        fetch('/api/alerts').then((r) => r.json()),
        fetch('/api/audit-logs').then((r) => r.json()),
        fetch('/api/analytics').then((r) => r.json()),
        fetch('/api/health').then((r) => r.json()),
      ]);

      setElection(elecRes);
      setWards(wardsRes);
      setPollingUnits(puRes);
      setPoliticalParties(partyRes);
      setOpeningReports(opRes);
      setVotingReports(vtRes);
      setClosingReports(clRes);
      setIncidents(incRes);
      setResults(resultsRes);
      setReferenceResults(refRes);
      setAlerts(alertsRes);
      setAuditLogs(auditRes);
      setAnalytics(analyticsRes);
      setHealth(healthRes);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load election data:', err);
      setError('Could not connect to AEMS server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Poll every 6 seconds for live situation room updates
    const interval = setInterval(refreshData, 6000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const submitOpeningReport = async (payload: any) => {
    persistReportToFirestore('openingReports', payload);
    if (!isOnline) {
      enqueueOfflineItem({
        type: 'OPENING_REPORT',
        endpoint: '/api/reports/opening',
        payload,
      });
      return { success: true, message: 'Opening report saved locally in offline queue. Will sync automatically.' };
    }
    try {
      const res = await fetch('/api/reports/opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshData();
      return { success: true, message: 'Opening report submitted successfully.' };
    } catch (err: any) {
      enqueueOfflineItem({
        type: 'OPENING_REPORT',
        endpoint: '/api/reports/opening',
        payload,
      });
      return { success: true, message: 'Network error: report queued for offline synchronization.' };
    }
  };

  const submitVotingReport = async (payload: any) => {
    persistReportToFirestore('votingReports', payload);
    if (!isOnline) {
      enqueueOfflineItem({
        type: 'VOTING_REPORT',
        endpoint: '/api/reports/voting',
        payload,
      });
      return { success: true, message: 'Voting report saved locally in offline queue.' };
    }
    try {
      const res = await fetch('/api/reports/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshData();
      return { success: true, message: 'Voting report submitted successfully.' };
    } catch (err: any) {
      enqueueOfflineItem({
        type: 'VOTING_REPORT',
        endpoint: '/api/reports/voting',
        payload,
      });
      return { success: true, message: 'Queued offline.' };
    }
  };

  const submitClosingReport = async (payload: any) => {
    persistReportToFirestore('closingReports', payload);
    if (!isOnline) {
      enqueueOfflineItem({
        type: 'CLOSING_REPORT',
        endpoint: '/api/reports/closing',
        payload,
      });
      return { success: true, message: 'Closing report saved locally in offline queue.' };
    }
    try {
      const res = await fetch('/api/reports/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshData();
      return { success: true, message: 'Closing report submitted successfully.' };
    } catch (err: any) {
      enqueueOfflineItem({
        type: 'CLOSING_REPORT',
        endpoint: '/api/reports/closing',
        payload,
      });
      return { success: true, message: 'Queued offline.' };
    }
  };

  const submitIncident = async (payload: any) => {
    persistIncidentToFirestore(payload);
    if (!isOnline) {
      enqueueOfflineItem({
        type: 'INCIDENT',
        endpoint: '/api/incidents',
        payload,
      });
      return { success: true, message: 'Incident queued locally. Will be transmitted upon connection.' };
    }
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshData();
      return { success: true, message: 'Incident report submitted for verification.' };
    } catch (err: any) {
      enqueueOfflineItem({
        type: 'INCIDENT',
        endpoint: '/api/incidents',
        payload,
      });
      return { success: true, message: 'Queued for offline synchronization.' };
    }
  };

  const verifyIncident = async (id: string, payload: any) => {
    try {
      persistIncidentToFirestore({ id, ...payload, verifiedAt: new Date().toISOString() });
      const res = await fetch(`/api/incidents/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await refreshData();
      return { success: true, message: 'Incident verification recorded.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const submitResult = async (payload: any) => {
    persistResultToFirestore(payload);
    if (!isOnline) {
      enqueueOfflineItem({
        type: 'RESULT',
        endpoint: '/api/results',
        payload,
      });
      return { success: true, message: 'Result saved locally in offline queue.' };
    }
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshData();
      return {
        success: true,
        message: 'Result submission received.',
        validationStatus: data.result?.validationStatus,
        issues: data.result?.validationIssues,
      };
    } catch (err: any) {
      enqueueOfflineItem({
        type: 'RESULT',
        endpoint: '/api/results',
        payload,
      });
      return { success: true, message: 'Result queued offline.' };
    }
  };

  const verifyResult = async (id: string, payload: any) => {
    try {
      persistResultToFirestore({ id, ...payload, verifiedAt: new Date().toISOString() });
      const res = await fetch(`/api/results/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await refreshData();
      return { success: true, message: 'Result verification status updated.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const acknowledgeAlert = async (alertId: string, ackBy: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: ackBy }),
      });
      await refreshData();
    } catch (e) {}
  };

  const resetDemoData = async () => {
    try {
      await fetch('/api/admin/reset-demo', { method: 'POST' });
      await refreshData();
    } catch (e) {}
  };

  const addNewPollingUnit = async (pu: Partial<PollingUnit>) => {
    await fetch('/api/polling-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pu),
    });
    await refreshData();
  };

  const addNewParty = async (party: Partial<PoliticalParty>) => {
    await fetch('/api/political-parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(party),
    });
    await refreshData();
  };

  return (
    <ElectionContext.Provider
      value={{
        election,
        wards,
        pollingUnits,
        politicalParties,
        openingReports,
        votingReports,
        closingReports,
        incidents,
        results,
        referenceResults,
        alerts,
        auditLogs,
        analytics,
        health,
        loading,
        error,
        refreshData,
        submitOpeningReport,
        submitVotingReport,
        submitClosingReport,
        submitIncident,
        verifyIncident,
        submitResult,
        verifyResult,
        acknowledgeAlert,
        resetDemoData,
        addNewPollingUnit,
        addNewParty,
      }}
    >
      {children}
    </ElectionContext.Provider>
  );
};

export const useElection = () => {
  const context = useContext(ElectionContext);
  if (!context) throw new Error('useElection must be used within an ElectionProvider');
  return context;
};
