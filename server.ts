import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  User,
  Ward,
  PollingUnit,
  PoliticalParty,
  Election,
  IncidentReport,
  OpeningReport,
  VotingReport,
  ClosingReport,
  ResultSubmission,
  ReferenceResult,
  Alert,
  AuditLog,
  EvidenceItem,
  SystemHealth,
} from './src/types';
import {
  DEMO_ELECTION,
  DEMO_WARDS,
  DEMO_POLLING_UNITS,
  DEMO_POLITICAL_PARTIES,
  DEMO_USERS,
  DEMO_INCIDENTS,
  DEMO_OPENING_REPORTS,
  DEMO_VOTING_REPORTS,
  DEMO_CLOSING_REPORTS,
  DEMO_RESULTS,
  DEMO_REFERENCE_RESULTS,
  DEMO_ALERTS,
  DEMO_AUDIT_LOGS,
} from './src/data/demoData';

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-Memory Database Store
let dbElection: Election = { ...DEMO_ELECTION };
let dbWards: Ward[] = JSON.parse(JSON.stringify(DEMO_WARDS));
let dbPollingUnits: PollingUnit[] = JSON.parse(JSON.stringify(DEMO_POLLING_UNITS));
let dbPoliticalParties: PoliticalParty[] = JSON.parse(JSON.stringify(DEMO_POLITICAL_PARTIES));
let dbUsers: User[] = JSON.parse(JSON.stringify(DEMO_USERS));
let dbIncidents: IncidentReport[] = JSON.parse(JSON.stringify(DEMO_INCIDENTS));
let dbOpeningReports: OpeningReport[] = JSON.parse(JSON.stringify(DEMO_OPENING_REPORTS));
let dbVotingReports: VotingReport[] = JSON.parse(JSON.stringify(DEMO_VOTING_REPORTS));
let dbClosingReports: ClosingReport[] = JSON.parse(JSON.stringify(DEMO_CLOSING_REPORTS));
let dbResults: ResultSubmission[] = JSON.parse(JSON.stringify(DEMO_RESULTS));
let dbReferenceResults: ReferenceResult[] = JSON.parse(JSON.stringify(DEMO_REFERENCE_RESULTS));
let dbAlerts: Alert[] = JSON.parse(JSON.stringify(DEMO_ALERTS));
let dbAuditLogs: AuditLog[] = JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS));

// Helper: Add Audit Log
function addAuditLog(
  action: string,
  category: AuditLog['category'],
  user: { id: string; name: string; role: any },
  targetType: string,
  targetId: string,
  details: string,
  ipAddress = '127.0.0.1'
) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action,
    category,
    userId: user.id || 'sys',
    userName: user.name || 'System Operator',
    userRole: user.role || 'SUPER_ADMIN',
    targetType,
    targetId,
    details,
    ipAddress,
    timestamp: new Date().toISOString(),
  };
  dbAuditLogs.unshift(log);
}

// Helper: Update Polling Unit State
function refreshPollingUnitStatus(puId: string) {
  const pu = dbPollingUnits.find((p) => p.id === puId);
  if (!pu) return;

  const puIncidents = dbIncidents.filter((inc) => inc.puId === puId);
  pu.incidentCount = puIncidents.length;

  const hasCritical = puIncidents.some((inc) => inc.severity === 'CRITICAL' && inc.verificationStatus !== 'REJECTED');
  const hasHighOrMedium = puIncidents.some(
    (inc) => (inc.severity === 'HIGH' || inc.severity === 'MEDIUM') && inc.verificationStatus !== 'REJECTED'
  );

  if (hasCritical) {
    pu.status = 'CRITICAL';
  } else if (hasHighOrMedium) {
    pu.status = 'ATTENTION';
  } else if (pu.lastReportTime) {
    pu.status = 'NORMAL';
  } else {
    pu.status = 'NO_REPORT';
  }

  // Update Result Status
  const puResult = dbResults.find((r) => r.puId === puId);
  if (puResult) {
    if (puResult.validationStatus === 'FLAGGED_FOR_REVIEW') {
      pu.resultStatus = 'FLAGGED';
    } else if (puResult.comparisonStatus === 'DIFFERENCE') {
      pu.resultStatus = 'DISCREPANT';
    } else if (puResult.verificationStatus === 'VERIFIED') {
      pu.resultStatus = 'VERIFIED';
    } else {
      pu.resultStatus = 'PENDING_VERIFICATION';
    }
  } else {
    pu.resultStatus = 'NOT_SUBMITTED';
  }
}

// ----------------------------------------------------
// 1. HEALTH CHECK ENDPOINT
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const totalRecords =
    dbWards.length +
    dbPollingUnits.length +
    dbUsers.length +
    dbIncidents.length +
    dbResults.length +
    dbAuditLogs.length;

  const healthData: SystemHealth = {
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    components: {
      api: { status: 'UP', latencyMs: 4 },
      database: { status: 'UP', totalRecords },
      storage: { status: 'UP', usedBytes: 1542000 },
      queue: { status: 'UP', pendingJobs: 0 },
    },
  };
  res.json(healthData);
});

// ----------------------------------------------------
// 2. AUTHENTICATION & USERS
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { identifier, role, requires2FA } = req.body;
  const user = dbUsers.find(
    (u) => u.email.toLowerCase() === (identifier || '').toLowerCase() || u.phone === identifier || u.role === role
  ) || dbUsers[0];

  if (requires2FA || user.twoFactorEnabled) {
    return res.json({
      success: true,
      requiresOtp: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'OTP sent to registered phone/email (Demo OTP is: 123456)',
    });
  }

  user.lastLoginAt = new Date().toISOString();
  addAuditLog('USER_LOGIN', 'AUTH', user, 'User', user.id, `User ${user.name} (${user.role}) logged in successfully.`);

  res.json({
    success: true,
    token: `aems-token-${user.id}-${Date.now()}`,
    user,
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { userId, otp } = req.body;
  const user = dbUsers.find((u) => u.id === userId) || dbUsers[0];

  // In demo environment, accept '123456' or any 6-digit code
  if (otp && (otp === '123456' || otp.length === 6)) {
    user.lastLoginAt = new Date().toISOString();
    addAuditLog(
      '2FA_VERIFICATION_SUCCESS',
      'AUTH',
      user,
      'User',
      user.id,
      `User ${user.name} completed 2FA authentication.`
    );
    return res.json({
      success: true,
      token: `aems-token-${user.id}-${Date.now()}`,
      user,
    });
  }

  res.status(400).json({ success: false, message: 'Invalid 2FA OTP code. Please try 123456.' });
});

app.get('/api/users', (req, res) => {
  res.json(dbUsers);
});

app.post('/api/users', (req, res) => {
  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: req.body.name || 'New User',
    email: req.body.email || `user${Date.now()}@aems-anka.org`,
    phone: req.body.phone || '+2348000000000',
    role: req.body.role || 'OBSERVER',
    status: 'ACTIVE',
    organization: req.body.organization || 'Independent Observer',
    assignedWardIds: req.body.assignedWardIds || [],
    assignedPuIds: req.body.assignedPuIds || [],
    createdAt: new Date().toISOString(),
  };
  dbUsers.push(newUser);
  addAuditLog('USER_CREATED', 'ADMIN', { id: 'admin', name: 'Admin', role: 'SUPER_ADMIN' }, 'User', newUser.id, `Created user ${newUser.name} with role ${newUser.role}`);
  res.json(newUser);
});

// ----------------------------------------------------
// 3. ELECTION & GEOGRAPHIC STRUCTURE
// ----------------------------------------------------
app.get('/api/election', (req, res) => {
  res.json(dbElection);
});

app.get('/api/wards', (req, res) => {
  res.json(dbWards);
});

app.get('/api/polling-units', (req, res) => {
  const { wardId, status } = req.query;
  let list = dbPollingUnits;
  if (wardId) {
    list = list.filter((p) => p.wardId === wardId);
  }
  if (status) {
    list = list.filter((p) => p.status === status);
  }
  res.json(list);
});

app.post('/api/polling-units', (req, res) => {
  const newPU: PollingUnit = {
    id: `pu-${Date.now()}`,
    code: req.body.code || '36/02/01/999',
    name: req.body.name || 'New Polling Unit',
    wardId: req.body.wardId,
    wardName: req.body.wardName || 'Anka',
    address: req.body.address || '',
    registeredVoters: Number(req.body.registeredVoters) || 500,
    lat: Number(req.body.lat) || 12.112,
    lng: Number(req.body.lng) || 5.926,
    status: 'NO_REPORT',
    incidentCount: 0,
    resultStatus: 'NOT_SUBMITTED',
  };
  dbPollingUnits.push(newPU);
  res.json(newPU);
});

app.get('/api/political-parties', (req, res) => {
  res.json(dbPoliticalParties);
});

app.post('/api/political-parties', (req, res) => {
  const party: PoliticalParty = {
    id: `party-${Date.now()}`,
    code: req.body.code.toUpperCase(),
    name: req.body.name,
    color: req.body.color || '#3B82F6',
    logoText: req.body.code.toUpperCase(),
    candidateName: req.body.candidateName,
  };
  dbPoliticalParties.push(party);
  res.json(party);
});

// ----------------------------------------------------
// 4. MONITORING REPORTS (OPENING, VOTING, CLOSING)
// ----------------------------------------------------
app.get('/api/reports/opening', (req, res) => {
  res.json(dbOpeningReports);
});

app.post('/api/reports/opening', (req, res) => {
  const report: OpeningReport = {
    id: `op-${Date.now()}`,
    puId: req.body.puId,
    puCode: req.body.puCode,
    puName: req.body.puName,
    wardId: req.body.wardId,
    wardName: req.body.wardName,
    observerId: req.body.observerId || 'obs-001',
    observerName: req.body.observerName || 'Observer',
    deviceId: req.body.deviceId,
    arrivalTime: req.body.arrivalTime || '07:30',
    pollOpeningTime: req.body.pollOpeningTime || '08:00',
    officialsPresent: Boolean(req.body.officialsPresent),
    officialsCount: Number(req.body.officialsCount) || 4,
    electionMaterialsAvailable: Boolean(req.body.electionMaterialsAvailable),
    securityPresent: Boolean(req.body.securityPresent),
    securityPersonnelCount: Number(req.body.securityPersonnelCount) || 2,
    bvasAvailable: Boolean(req.body.bvasAvailable),
    bvasFunctioning: Boolean(req.body.bvasFunctioning),
    puOpened: Boolean(req.body.puOpened),
    problemsEncountered: req.body.problemsEncountered || [],
    notes: req.body.notes,
    gps: req.body.gps,
    timestamp: new Date().toISOString(),
    verificationStatus: 'UNDER_REVIEW',
  };

  dbOpeningReports.push(report);

  // Update Polling Unit last report time & status
  const pu = dbPollingUnits.find((p) => p.id === report.puId);
  if (pu) {
    pu.lastReportTime = report.timestamp;
    refreshPollingUnitStatus(pu.id);
  }

  addAuditLog(
    'OPENING_REPORT_SUBMITTED',
    'REPORT',
    { id: report.observerId, name: report.observerName, role: 'OBSERVER' },
    'OpeningReport',
    report.id,
    `Submitted Opening Report for ${report.puCode} - ${report.puName}`
  );

  res.json({ success: true, report });
});

app.get('/api/reports/voting', (req, res) => {
  res.json(dbVotingReports);
});

app.post('/api/reports/voting', (req, res) => {
  const report: VotingReport = {
    id: `vt-${Date.now()}`,
    puId: req.body.puId,
    puCode: req.body.puCode,
    puName: req.body.puName,
    wardId: req.body.wardId,
    wardName: req.body.wardName,
    observerId: req.body.observerId || 'obs-001',
    observerName: req.body.observerName || 'Observer',
    deviceId: req.body.deviceId,
    accreditationStarted: Boolean(req.body.accreditationStarted),
    bvasFunctioning: Boolean(req.body.bvasFunctioning),
    votingOngoing: Boolean(req.body.votingOngoing),
    queueLevel: req.body.queueLevel || 'MEDIUM',
    estimatedQueueSize: Number(req.body.estimatedQueueSize) || 50,
    securitySituation: req.body.securitySituation || 'CALM',
    votingDisruption: Boolean(req.body.votingDisruption),
    disruptionReason: req.body.disruptionReason,
    notes: req.body.notes,
    gps: req.body.gps,
    timestamp: new Date().toISOString(),
    verificationStatus: 'UNDER_REVIEW',
  };

  dbVotingReports.push(report);

  const pu = dbPollingUnits.find((p) => p.id === report.puId);
  if (pu) {
    pu.lastReportTime = report.timestamp;
    refreshPollingUnitStatus(pu.id);
  }

  addAuditLog(
    'VOTING_REPORT_SUBMITTED',
    'REPORT',
    { id: report.observerId, name: report.observerName, role: 'OBSERVER' },
    'VotingReport',
    report.id,
    `Submitted Voting Report for ${report.puCode} - ${report.puName}`
  );

  res.json({ success: true, report });
});

app.get('/api/reports/closing', (req, res) => {
  res.json(dbClosingReports);
});

app.post('/api/reports/closing', (req, res) => {
  const report: ClosingReport = {
    id: `cl-${Date.now()}`,
    puId: req.body.puId,
    puCode: req.body.puCode,
    puName: req.body.puName,
    wardId: req.body.wardId,
    wardName: req.body.wardName,
    observerId: req.body.observerId || 'obs-001',
    observerName: req.body.observerName || 'Observer',
    deviceId: req.body.deviceId,
    closingTime: req.body.closingTime || '14:30',
    votingCompleted: Boolean(req.body.votingCompleted),
    countingStarted: Boolean(req.body.countingStarted),
    resultDisplayed: Boolean(req.body.resultDisplayed),
    closingIssues: req.body.closingIssues || [],
    notes: req.body.notes,
    gps: req.body.gps,
    timestamp: new Date().toISOString(),
    verificationStatus: 'UNDER_REVIEW',
  };

  dbClosingReports.push(report);

  const pu = dbPollingUnits.find((p) => p.id === report.puId);
  if (pu) {
    pu.lastReportTime = report.timestamp;
    refreshPollingUnitStatus(pu.id);
  }

  addAuditLog(
    'CLOSING_REPORT_SUBMITTED',
    'REPORT',
    { id: report.observerId, name: report.observerName, role: 'OBSERVER' },
    'ClosingReport',
    report.id,
    `Submitted Closing Report for ${report.puCode} - ${report.puName}`
  );

  res.json({ success: true, report });
});

// ----------------------------------------------------
// 5. INCIDENT REPORTING & VERIFICATION
// ----------------------------------------------------
app.get('/api/incidents', (req, res) => {
  const { wardId, severity, status } = req.query;
  let list = dbIncidents;
  if (wardId) list = list.filter((i) => i.wardId === wardId);
  if (severity) list = list.filter((i) => i.severity === severity);
  if (status) list = list.filter((i) => i.verificationStatus === status);
  res.json(list);
});

app.post('/api/incidents', (req, res) => {
  const {
    puId,
    puCode,
    puName,
    wardId,
    wardName,
    category,
    categoryLabel,
    severity,
    timeOccurred,
    description,
    evidence = [],
    gps,
    observerId,
    observerName,
  } = req.body;

  const incident: IncidentReport = {
    id: `inc-${Date.now()}`,
    puId,
    puCode,
    puName,
    wardId,
    wardName,
    category: category || 'OTHER',
    categoryLabel: categoryLabel || 'General Issue',
    severity: severity || 'MEDIUM',
    timeOccurred: timeOccurred || new Date().toISOString(),
    description,
    evidence,
    gps,
    observerId: observerId || 'obs-001',
    observerName: observerName || 'Observer',
    timestamp: new Date().toISOString(),
    verificationStatus: 'UNDER_REVIEW',
  };

  dbIncidents.unshift(incident);

  // If Critical/High, create a system alert
  if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
    const alert: Alert = {
      id: `alt-${Date.now()}`,
      type: 'CRITICAL_INCIDENT',
      title: `OPERATIONAL ALERT: ${incident.severity} ${incident.categoryLabel}`,
      message: `${incident.puName} (${incident.puCode}) reported: ${incident.description.substring(0, 100)}...`,
      severity: incident.severity,
      puId: incident.puId,
      puCode: incident.puCode,
      wardId: incident.wardId,
      wardName: incident.wardName,
      timestamp: incident.timestamp,
      acknowledged: false,
    };
    dbAlerts.unshift(alert);
  }

  // Update PU status
  refreshPollingUnitStatus(puId);

  addAuditLog(
    'INCIDENT_REPORTED',
    'INCIDENT',
    { id: incident.observerId, name: incident.observerName, role: 'OBSERVER' },
    'IncidentReport',
    incident.id,
    `Reported ${incident.severity} incident at ${incident.puCode} (${incident.categoryLabel})`
  );

  res.json({ success: true, incident });
});

app.post('/api/incidents/:id/verify', (req, res) => {
  const { id } = req.params;
  const { status, verifierNotes, verifierId, verifierName, escalatedTo } = req.body;

  const incident = dbIncidents.find((i) => i.id === id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Incident not found' });
  }

  if (!verifierNotes || !verifierNotes.trim()) {
    return res.status(400).json({ success: false, message: 'Verification notes are required for auditability.' });
  }

  incident.verificationStatus = status;
  incident.verifierNotes = verifierNotes;
  incident.verifierId = verifierId;
  incident.verifierName = verifierName;
  incident.verifiedAt = new Date().toISOString();
  if (escalatedTo) incident.escalatedTo = escalatedTo;

  refreshPollingUnitStatus(incident.puId);

  addAuditLog(
    'INCIDENT_VERIFIED',
    'VERIFICATION',
    { id: verifierId || 'ver-01', name: verifierName || 'Verification Officer', role: 'VERIFIER' },
    'IncidentReport',
    incident.id,
    `Updated incident ${incident.id} verification status to ${status}. Notes: ${verifierNotes}`
  );

  res.json({ success: true, incident });
});

// ----------------------------------------------------
// 6. RESULT MONITORING, VALIDATION & COMPARISON
// ----------------------------------------------------
app.get('/api/results', (req, res) => {
  res.json(dbResults);
});

app.get('/api/results/references', (req, res) => {
  res.json(dbReferenceResults);
});

app.post('/api/results', (req, res) => {
  const {
    puId,
    puCode,
    puName,
    wardId,
    wardName,
    electionId,
    registeredVoters,
    accreditedVoters,
    validVotes,
    rejectedVotes,
    totalVotes,
    partyVotes = [],
    evidence = [],
    gps,
    observerId,
    observerName,
  } = req.body;

  const regV = Number(registeredVoters) || 0;
  const accV = Number(accreditedVoters) || 0;
  const valV = Number(validVotes) || 0;
  const rejV = Number(rejectedVotes) || 0;
  const totV = Number(totalVotes) || 0;

  // Validation Arithmetic Rules
  const validationIssues: string[] = [];
  const sumParties = partyVotes.reduce((acc: number, curr: any) => acc + (Number(curr.votes) || 0), 0);

  if (valV + rejV !== totV) {
    validationIssues.push(
      `Mathematical Discrepancy: Valid votes (${valV}) + Rejected votes (${rejV}) does not equal Total votes recorded (${totV})`
    );
  }

  if (totV > accV) {
    validationIssues.push(
      `Over-voting Flag: Total votes cast (${totV}) exceeds accredited voters recorded (${accV})`
    );
  }

  if (sumParties !== valV) {
    validationIssues.push(
      `Party Votes Discrepancy: Sum of party votes (${sumParties}) does not equal recorded Valid votes (${valV})`
    );
  }

  const validationStatus = validationIssues.length > 0 ? 'FLAGGED_FOR_REVIEW' : 'VALID';

  // Comparison with Reference Result if exists
  let comparisonStatus: ResultSubmission['comparisonStatus'] = 'UNDER_REVIEW';
  let comparisonDetails: ResultSubmission['comparisonDetails'] = undefined;

  const reference = dbReferenceResults.find((r) => r.puId === puId);
  if (reference) {
    const diffs: string[] = [];
    if (reference.totalVotes !== totV) {
      diffs.push(`Total votes mismatch: Observer (${totV}) vs Reference (${reference.totalVotes})`);
    }

    partyVotes.forEach((pv: any) => {
      const refPartyVote = reference.partyVotes[pv.partyCode] ?? 0;
      if (refPartyVote !== Number(pv.votes)) {
        diffs.push(
          `${pv.partyCode} mismatch: Observer (${pv.votes}) vs Reference (${refPartyVote}) [diff: ${
            Number(pv.votes) - refPartyVote
          }]`
        );
      }
    });

    if (diffs.length === 0) {
      comparisonStatus = 'MATCH';
    } else {
      comparisonStatus = 'DIFFERENCE';
    }

    comparisonDetails = {
      referenceTotalVotes: reference.totalVotes,
      referencePartyVotes: reference.partyVotes,
      discrepancies: diffs,
    };
  }

  const resultSubmission: ResultSubmission = {
    id: `res-${Date.now()}`,
    puId,
    puCode,
    puName,
    wardId,
    wardName,
    electionId: electionId || dbElection.id,
    registeredVoters: regV,
    accreditedVoters: accV,
    validVotes: valV,
    rejectedVotes: rejV,
    totalVotes: totV,
    partyVotes,
    evidence,
    gps,
    observerId: observerId || 'obs-001',
    observerName: observerName || 'Observer',
    timestamp: new Date().toISOString(),
    validationStatus,
    validationIssues,
    comparisonStatus,
    comparisonDetails,
    verificationStatus: 'UNDER_REVIEW',
  };

  dbResults.push(resultSubmission);

  // If flagged, generate an alert
  if (validationStatus === 'FLAGGED_FOR_REVIEW') {
    const alert: Alert = {
      id: `alt-${Date.now()}`,
      type: 'RESULT_DISCREPANCY',
      title: `SYSTEM ALERT: Result Flagged for Review (${puCode})`,
      message: `${puName}: ${validationIssues.join('; ')}`,
      severity: 'HIGH',
      puId,
      puCode,
      wardId,
      wardName,
      timestamp: resultSubmission.timestamp,
      acknowledged: false,
    };
    dbAlerts.unshift(alert);
  }

  refreshPollingUnitStatus(puId);

  addAuditLog(
    'RESULT_SUBMITTED',
    'RESULT',
    { id: resultSubmission.observerId, name: resultSubmission.observerName, role: 'OBSERVER' },
    'ResultSubmission',
    resultSubmission.id,
    `Submitted result for ${puCode} (${puName}). Validation: ${validationStatus}. Issues: ${validationIssues.length}`
  );

  res.json({ success: true, result: resultSubmission });
});

app.post('/api/results/:id/verify', (req, res) => {
  const { id } = req.params;
  const { status, verifierNotes, verifierId, verifierName, comparisonStatus } = req.body;

  const result = dbResults.find((r) => r.id === id);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Result submission not found' });
  }

  if (!verifierNotes || !verifierNotes.trim()) {
    return res.status(400).json({ success: false, message: 'Verification notes are required for auditability.' });
  }

  result.verificationStatus = status;
  result.verifierNotes = verifierNotes;
  result.verifierId = verifierId;
  result.verifiedAt = new Date().toISOString();
  if (comparisonStatus) result.comparisonStatus = comparisonStatus;

  refreshPollingUnitStatus(result.puId);

  addAuditLog(
    'RESULT_VERIFIED',
    'VERIFICATION',
    { id: verifierId || 'ver-01', name: verifierName || 'Verifier', role: 'VERIFIER' },
    'ResultSubmission',
    result.id,
    `Verified result for ${result.puCode} with status ${status}. Notes: ${verifierNotes}`
  );

  res.json({ success: true, result });
});

// ----------------------------------------------------
// 7. OFFLINE BATCH SYNC ENDPOINT
// ----------------------------------------------------
app.post('/api/sync/batch', (req, res) => {
  const items: any[] = req.body.items || [];
  const processed: { localId: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = [];

  items.forEach((item) => {
    try {
      if (item.type === 'OPENING_REPORT') {
        const existing = dbOpeningReports.find((r) => r.puId === item.payload.puId);
        if (!existing) {
          const report: OpeningReport = {
            ...item.payload,
            id: `op-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            timestamp: item.payload.timestamp || new Date().toISOString(),
            verificationStatus: 'UNDER_REVIEW',
          };
          dbOpeningReports.push(report);
          refreshPollingUnitStatus(report.puId);
        }
        processed.push({ localId: item.localId, status: 'SUCCESS' });
      } else if (item.type === 'VOTING_REPORT') {
        const report: VotingReport = {
          ...item.payload,
          id: `vt-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: item.payload.timestamp || new Date().toISOString(),
          verificationStatus: 'UNDER_REVIEW',
        };
        dbVotingReports.push(report);
        refreshPollingUnitStatus(report.puId);
        processed.push({ localId: item.localId, status: 'SUCCESS' });
      } else if (item.type === 'CLOSING_REPORT') {
        const report: ClosingReport = {
          ...item.payload,
          id: `cl-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: item.payload.timestamp || new Date().toISOString(),
          verificationStatus: 'UNDER_REVIEW',
        };
        dbClosingReports.push(report);
        refreshPollingUnitStatus(report.puId);
        processed.push({ localId: item.localId, status: 'SUCCESS' });
      } else if (item.type === 'INCIDENT') {
        const incident: IncidentReport = {
          ...item.payload,
          id: `inc-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: item.payload.timestamp || new Date().toISOString(),
          verificationStatus: 'UNDER_REVIEW',
        };
        dbIncidents.unshift(incident);
        refreshPollingUnitStatus(incident.puId);
        processed.push({ localId: item.localId, status: 'SUCCESS' });
      } else if (item.type === 'RESULT') {
        const existing = dbResults.find((r) => r.puId === item.payload.puId);
        if (!existing) {
          const resSub: ResultSubmission = {
            ...item.payload,
            id: `res-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            timestamp: item.payload.timestamp || new Date().toISOString(),
            verificationStatus: 'UNDER_REVIEW',
          };
          dbResults.push(resSub);
          refreshPollingUnitStatus(resSub.puId);
        }
        processed.push({ localId: item.localId, status: 'SUCCESS' });
      }
    } catch (err: any) {
      processed.push({ localId: item.localId, status: 'FAILED', error: err.message });
    }
  });

  addAuditLog(
    'OFFLINE_BATCH_SYNC',
    'SYSTEM',
    { id: req.body.userId || 'observer', name: req.body.userName || 'Field Observer', role: 'OBSERVER' },
    'SyncQueue',
    `batch-${Date.now()}`,
    `Synchronized ${processed.filter((p) => p.status === 'SUCCESS').length} of ${items.length} offline queued items.`
  );

  res.json({ success: true, processed });
});

// ----------------------------------------------------
// 8. ALERTS & NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/alerts', (req, res) => {
  res.json(dbAlerts);
});

app.post('/api/alerts/:id/ack', (req, res) => {
  const { id } = req.params;
  const { acknowledgedBy } = req.body;
  const alert = dbAlerts.find((a) => a.id === id);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy || 'Situation Officer';
    addAuditLog('ALERT_ACKNOWLEDGED', 'SYSTEM', { id: 'usr-situation-01', name: alert.acknowledgedBy, role: 'SITUATION_OFFICER' }, 'Alert', alert.id, `Alert ${alert.id} acknowledged.`);
  }
  res.json({ success: true, alert });
});

// ----------------------------------------------------
// 9. AUDIT LOGS
// ----------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  res.json(dbAuditLogs);
});

// ----------------------------------------------------
// 10. ANALYTICS & MONITORING METRICS
// ----------------------------------------------------
app.get('/api/analytics', (req, res) => {
  const totalPUs = dbPollingUnits.length;
  const assignedPUs = dbPollingUnits.filter((p) => p.observerId).length;
  const reportedPUs = dbPollingUnits.filter((p) => p.lastReportTime).length;
  const coverageRate = totalPUs > 0 ? (reportedPUs / totalPUs) * 100 : 0;

  const totalRegisteredVoters = dbPollingUnits.reduce((acc, p) => acc + (p.registeredVoters || 0), 0);
  const totalAccreditedVoters = dbResults.reduce((acc, r) => acc + (r.accreditedVoters || 0), 0);
  const turnoutRate = totalRegisteredVoters > 0 ? (totalAccreditedVoters / totalRegisteredVoters) * 100 : 0;

  const pusWithIncidents = new Set(dbIncidents.map((i) => i.puId)).size;
  const incidentRate = reportedPUs > 0 ? (pusWithIncidents / reportedPUs) * 100 : 0;

  const totalResultsSubmitted = dbResults.length;
  const verifiedResults = dbResults.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const resultVerificationRate = totalResultsSubmitted > 0 ? (verifiedResults / totalResultsSubmitted) * 100 : 0;

  // Party vote totals across verified or all results
  const partyTotals: Record<string, { partyCode: string; name: string; votes: number; color: string }> = {};
  dbPoliticalParties.forEach((p) => {
    partyTotals[p.code] = { partyCode: p.code, name: p.name, votes: 0, color: p.color };
  });

  dbResults.forEach((resItem) => {
    resItem.partyVotes.forEach((pv) => {
      if (partyTotals[pv.partyCode]) {
        partyTotals[pv.partyCode].votes += pv.votes;
      }
    });
  });

  // Ward breakdown
  const wardBreakdown = dbWards.map((w) => {
    const wardPUs = dbPollingUnits.filter((p) => p.wardId === w.id);
    const wardReported = wardPUs.filter((p) => p.lastReportTime).length;
    const wardIncidents = dbIncidents.filter((i) => i.wardId === w.id);
    const wardResults = dbResults.filter((r) => r.wardId === w.id);
    return {
      wardId: w.id,
      wardName: w.name,
      totalPUs: wardPUs.length,
      reportedPUs: wardReported,
      coveragePercent: wardPUs.length > 0 ? Math.round((wardReported / wardPUs.length) * 100) : 0,
      incidentCount: wardIncidents.length,
      resultsCount: wardResults.length,
      status: wardIncidents.some((i) => i.severity === 'CRITICAL')
        ? 'CRITICAL'
        : wardIncidents.some((i) => i.severity === 'HIGH' || i.severity === 'MEDIUM')
        ? 'ATTENTION'
        : 'NORMAL',
    };
  });

  res.json({
    summary: {
      totalWards: dbWards.length,
      totalPollingUnits: totalPUs,
      assignedPUs,
      reportedPUs,
      coverageRate: Number(coverageRate.toFixed(1)),
      totalRegisteredVoters,
      totalAccreditedVoters,
      turnoutRate: Number(turnoutRate.toFixed(1)),
      totalIncidents: dbIncidents.length,
      verifiedIncidents: dbIncidents.filter((i) => i.verificationStatus === 'VERIFIED').length,
      incidentRate: Number(incidentRate.toFixed(1)),
      totalResultsSubmitted,
      verifiedResults,
      resultVerificationRate: Number(resultVerificationRate.toFixed(1)),
      criticalAlerts: dbAlerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length,
    },
    partyTotals: Object.values(partyTotals),
    wardBreakdown,
  });
});

// ----------------------------------------------------
// 11. ADMIN ACTIONS & RESET
// ----------------------------------------------------
app.post('/api/admin/reset-demo', (req, res) => {
  dbElection = { ...DEMO_ELECTION };
  dbWards = JSON.parse(JSON.stringify(DEMO_WARDS));
  dbPollingUnits = JSON.parse(JSON.stringify(DEMO_POLLING_UNITS));
  dbPoliticalParties = JSON.parse(JSON.stringify(DEMO_POLITICAL_PARTIES));
  dbUsers = JSON.parse(JSON.stringify(DEMO_USERS));
  dbIncidents = JSON.parse(JSON.stringify(DEMO_INCIDENTS));
  dbOpeningReports = JSON.parse(JSON.stringify(DEMO_OPENING_REPORTS));
  dbVotingReports = JSON.parse(JSON.stringify(DEMO_VOTING_REPORTS));
  dbClosingReports = JSON.parse(JSON.stringify(DEMO_CLOSING_REPORTS));
  dbResults = JSON.parse(JSON.stringify(DEMO_RESULTS));
  dbReferenceResults = JSON.parse(JSON.stringify(DEMO_REFERENCE_RESULTS));
  dbAlerts = JSON.parse(JSON.stringify(DEMO_ALERTS));
  dbAuditLogs = JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS));

  addAuditLog('DATABASE_RESET_DEMO', 'ADMIN', { id: 'admin', name: 'Super Admin', role: 'SUPER_ADMIN' }, 'Database', 'all', 'Restored pristine demo dataset.');

  res.json({ success: true, message: 'Restored demo dataset successfully.' });
});

app.post('/api/admin/backup', (req, res) => {
  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'Anka Election Monitoring System (AEMS)',
    version: '1.0.0',
    election: dbElection,
    wards: dbWards,
    pollingUnits: dbPollingUnits,
    politicalParties: dbPoliticalParties,
    users: dbUsers.map((u) => ({ ...u, password: '[PROTECTED]' })),
    incidents: dbIncidents,
    results: dbResults,
    auditLogs: dbAuditLogs,
  };
  res.json(backup);
});

// ----------------------------------------------------
// 12. GEMINI AI VOICE ASSISTANT & LIVE API
// ----------------------------------------------------
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'demo-key',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

app.post('/api/voice-assistant/query', async (req, res) => {
  const { query, language = 'English', userRole = 'OBSERVER', locationContext } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, message: 'Query cannot be empty' });
  }

  const totalPUs = dbPollingUnits.length;
  const reportedPUs = dbPollingUnits.filter((p) => p.lastReportTime).length;
  const criticalIncidents = dbIncidents.filter((i) => i.severity === 'CRITICAL');
  const totalResults = dbResults.length;
  const verifiedResults = dbResults.filter((r) => r.verificationStatus === 'VERIFIED').length;

  const liveStatsSummary = `
Current Election State for Anka LGA (Zamfara State):
- Wards: ${dbWards.map((w) => w.name).join(', ')}
- Total Polling Units: ${totalPUs} (Reported: ${reportedPUs}, Coverage: ${Math.round((reportedPUs / totalPUs) * 100)}%)
- Active Incidents: ${dbIncidents.length} total (${criticalIncidents.length} Critical, ${dbIncidents.filter((i) => i.verificationStatus === 'VERIFIED').length} Verified)
- Form EC8A Results Submitted: ${totalResults} (${verifiedResults} Verified)
- Recent critical incidents: ${criticalIncidents.slice(0, 3).map((i) => `${i.puName} (${i.wardName}): ${i.categoryLabel} - ${i.description}`).join('; ') || 'None'}
`;

  const systemInstruction = `You are the Katukan Anka Situation Room Voice Field Assistant for Anka LGA, Zamfara State, Nigeria.
You assist field observers, situation room analysts, verifiers, and civic monitoring directors.

You must:
1. Provide accurate, neutral, and actionable electoral intelligence based on the live system stats and INEC election guidelines.
2. If the user is reporting a field incident (e.g. "I want to report BVAS failure at Bagega PU 001", "Ballot box snatched by armed thugs in Galadima"), extract structured incident details if possible.
3. Respond in the requested language: ${language} (English, Hausa, or Nigerian Pidgin). If Hausa, provide culturally accurate Hausa election terms (e.g. Zabe, Jami'an INEC, Katin Zabe, Na'urar BVAS).
4. Keep the voice response concise (2-4 sentences max) for clear audio reading, but informative.
5. If the observer asks about Electoral Act 2022 rules (e.g. over-voting, BVAS bypass, accreditation, priority voting for pregnant women / elderly / persons with disabilities), explain the standard procedure calmly and neutrally.

Live Context:
${liveStatsSummary}
`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      const localResponse = `Katukan Anka Situation Room Voice Assistant: Currently tracking ${reportedPUs} of ${totalPUs} polling units in Anka LGA. We have recorded ${dbIncidents.length} incident reports, with ${criticalIncidents.length} critical issues under review by verification officers.`;
      return res.json({
        success: true,
        responseText: localResponse,
        suggestedIncident: null,
      });
    }

    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          text: `User query from role [${userRole}] with location context [${JSON.stringify(locationContext || {})}]:\n${query}`,
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const responseText = response.text || 'Understood. Operational status updated.';

    let suggestedIncident = null;
    const isIncidentReport = /report|incident|problem|fight|violence|bvas|broken|stolen|snatch|delay|corrupt|late/i.test(query);
    if (isIncidentReport) {
      try {
        const extraction = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Analyze this voice report: "${query}". Extract JSON object with keys: "isIncident" (boolean), "wardName" (string), "puNameOrCode" (string), "category" (one of BVAS_ISSUE, LATE_OPENING, MISSING_MATERIALS, SECURITY_INCIDENT, INTIMIDATION, VIOLENCE, VOTING_INTERRUPTION, ACCESSIBILITY_ISSUE, RESULT_ISSUE, OTHER), "severity" (LOW, MEDIUM, HIGH, CRITICAL), "summary" (concise string). Output only valid JSON.`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (extraction.text) {
          suggestedIncident = JSON.parse(extraction.text);
        }
      } catch (e) {
        // Ignore extraction error
      }
    }

    res.json({
      success: true,
      responseText,
      suggestedIncident,
    });
  } catch (error: any) {
    console.error('Gemini Voice Assistant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process voice query with Gemini API',
      error: error.message,
    });
  }
});

// ----------------------------------------------------
// 13. VITE MIDDLEWARE / STATIC ASSETS SERVING & WEBSOCKET
// ----------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[WebSocket] Client connected to Live Voice API');

    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'GEMINI_API_KEY not configured. Standard Voice Assistant available via fallback.',
        })
      );
      return;
    }

    let session: any = null;

    try {
      const ai = getGemini();
      session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are the Katukan Anka Situation Room Real-time Voice Field Assistant for Zamfara State, Nigeria.
You speak clearly, calmly, and authoritatively to assist election observers and situation room staff.
You can understand English, Hausa (Katin zabe, Na'urar BVAS, Zabe, Akwatin zabe), and Nigerian Pidgin.
Keep your voice answers concise (1-3 sentences) so field communication remains swift and crisp.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            const outTrans = (message.serverContent as any)?.outputAudioTranscription?.text;
            const inTrans = (message.serverContent as any)?.inputAudioTranscription?.text;

            if (audio) {
              clientWs.send(JSON.stringify({ type: 'audio', audio, text: text || outTrans }));
            }
            if (outTrans) {
              clientWs.send(JSON.stringify({ type: 'transcription', text: outTrans, role: 'model' }));
            }
            if (inTrans) {
              clientWs.send(JSON.stringify({ type: 'transcription', text: inTrans, role: 'user' }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'session_closed' }));
            }
          },
          onerror: (err: any) => {
            console.error('[Gemini Live Error]:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: String(err) }));
            }
          },
        },
      });

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'audio' && parsed.audio) {
            session?.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.type === 'text' && parsed.text) {
            session?.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (e) {
          console.error('Error sending audio to Gemini Live:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          session?.close();
        } catch (e) {
          // ignore
        }
      });
    } catch (err: any) {
      console.error('Failed to initialize Gemini Live connection:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: `Failed to connect to Live API: ${err.message}`,
          })
        );
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AEMS Server] running on http://0.0.0.0:${PORT} with WebSocket Live API on /live`);
  });
}

startServer();
