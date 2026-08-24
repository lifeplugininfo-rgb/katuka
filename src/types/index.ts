export type UserRole =
  | 'SUPER_ADMIN'
  | 'LGA_COORDINATOR'
  | 'WARD_COORDINATOR'
  | 'OBSERVER'
  | 'VERIFIER'
  | 'DATA_ANALYST'
  | 'SITUATION_OFFICER'
  | 'COMMUNICATION_OFFICER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  observerId?: string;
  assignedWardIds?: string[];
  assignedPuIds?: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  twoFactorEnabled?: boolean;
  avatarUrl?: string;
  organization?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Ward {
  id: string;
  code: string;
  name: string;
  lgaName: string; // "Anka"
  stateName: string; // "Zamfara"
  totalPollingUnits: number;
  registeredVoters: number;
  centerLat: number;
  centerLng: number;
}

export type PollingUnitStatus = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'NO_REPORT';

export interface PollingUnit {
  id: string;
  code: string; // e.g. "36-02-01-001"
  name: string;
  wardId: string;
  wardName: string;
  address: string;
  registeredVoters: number;
  lat: number;
  lng: number;
  status: PollingUnitStatus;
  lastReportTime?: string;
  observerId?: string;
  observerName?: string;
  incidentCount: number;
  resultStatus: 'NOT_SUBMITTED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'FLAGGED' | 'DISCREPANT';
}

export interface PoliticalParty {
  id: string;
  code: string; // "APC", "PDP", "LP", "NNPP", "SDP", etc.
  name: string;
  color: string;
  logoText: string;
  candidateName?: string;
}

export interface Election {
  id: string;
  name: string;
  category: 'GOVERNORSHIP' | 'SENATORIAL' | 'HOUSE_OF_REPS' | 'STATE_ASSEMBLY' | 'LOCAL_GOVERNMENT' | 'PRESIDENTIAL';
  date: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CONCLUDED';
  description: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface EvidenceItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  uploadingUserId: string;
  uploadingUserName: string;
  timestamp: string;
  gps?: GPSLocation;
  description: string;
  sha256Hash: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export type VerificationStatus = 'UNDER_REVIEW' | 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'REJECTED' | 'ESCALATED';

export interface OpeningReport {
  id: string;
  puId: string;
  puCode: string;
  puName: string;
  wardId: string;
  wardName: string;
  observerId: string;
  observerName: string;
  deviceId?: string;
  arrivalTime: string;
  pollOpeningTime: string;
  officialsPresent: boolean;
  officialsCount?: number;
  electionMaterialsAvailable: boolean;
  securityPresent: boolean;
  securityPersonnelCount?: number;
  bvasAvailable: boolean;
  bvasFunctioning: boolean;
  puOpened: boolean;
  problemsEncountered: string[];
  notes?: string;
  gps?: GPSLocation;
  timestamp: string;
  verificationStatus: VerificationStatus;
  verifierNotes?: string;
  verifierId?: string;
}

export interface VotingReport {
  id: string;
  puId: string;
  puCode: string;
  puName: string;
  wardId: string;
  wardName: string;
  observerId: string;
  observerName: string;
  deviceId?: string;
  accreditationStarted: boolean;
  bvasFunctioning: boolean;
  votingOngoing: boolean;
  queueLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMPTY';
  estimatedQueueSize: number;
  securitySituation: 'CALM' | 'TENSE' | 'DISRUPTED' | 'CRITICAL';
  votingDisruption: boolean;
  disruptionReason?: string;
  notes?: string;
  gps?: GPSLocation;
  timestamp: string;
  verificationStatus: VerificationStatus;
  verifierNotes?: string;
  verifierId?: string;
}

export interface ClosingReport {
  id: string;
  puId: string;
  puCode: string;
  puName: string;
  wardId: string;
  wardName: string;
  observerId: string;
  observerName: string;
  deviceId?: string;
  closingTime: string;
  votingCompleted: boolean;
  countingStarted: boolean;
  resultDisplayed: boolean;
  closingIssues: string[];
  notes?: string;
  gps?: GPSLocation;
  timestamp: string;
  verificationStatus: VerificationStatus;
  verifierNotes?: string;
  verifierId?: string;
}

export type IncidentCategory =
  | 'BVAS_ISSUE'
  | 'LATE_OPENING'
  | 'MISSING_MATERIALS'
  | 'SECURITY_INCIDENT'
  | 'INTIMIDATION'
  | 'VIOLENCE'
  | 'VOTING_INTERRUPTION'
  | 'ACCESSIBILITY_ISSUE'
  | 'RESULT_ISSUE'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentReport {
  id: string;
  puId: string;
  puCode: string;
  puName: string;
  wardId: string;
  wardName: string;
  category: IncidentCategory;
  categoryLabel: string;
  severity: IncidentSeverity;
  timeOccurred: string;
  description: string;
  evidence: EvidenceItem[];
  gps?: GPSLocation;
  observerId: string;
  observerName: string;
  timestamp: string;
  verificationStatus: VerificationStatus;
  verifierNotes?: string;
  verifierId?: string;
  verifierName?: string;
  verifiedAt?: string;
  escalatedTo?: string;
}

export interface PartyVoteEntry {
  partyId: string;
  partyCode: string;
  partyName: string;
  votes: number;
}

export type ResultValidationStatus = 'VALID' | 'FLAGGED_FOR_REVIEW';
export type ResultComparisonStatus = 'MATCH' | 'DIFFERENCE' | 'INCOMPLETE' | 'UNDER_REVIEW' | 'RESOLVED';

export interface ResultSubmission {
  id: string;
  puId: string;
  puCode: string;
  puName: string;
  wardId: string;
  wardName: string;
  electionId: string;
  registeredVoters: number;
  accreditedVoters: number;
  validVotes: number;
  rejectedVotes: number;
  totalVotes: number;
  partyVotes: PartyVoteEntry[];
  evidence: EvidenceItem[];
  gps?: GPSLocation;
  observerId: string;
  observerName: string;
  timestamp: string;
  validationStatus: ResultValidationStatus;
  validationIssues: string[];
  comparisonStatus: ResultComparisonStatus;
  comparisonDetails?: {
    referenceTotalVotes?: number;
    referencePartyVotes?: Record<string, number>;
    discrepancies?: string[];
  };
  verificationStatus: VerificationStatus;
  verifierNotes?: string;
  verifierId?: string;
  verifiedAt?: string;
}

export interface ReferenceResult {
  id: string;
  puId: string;
  registeredVoters: number;
  accreditedVoters: number;
  validVotes: number;
  rejectedVotes: number;
  totalVotes: number;
  partyVotes: Record<string, number>;
  source: 'INEC_OFFICIAL_EC8A' | 'COLLATED_REFERENCE' | 'AUTHORIZED_OBSERVER_BENCHMARK';
  uploadedAt: string;
}

export type AlertType =
  | 'CRITICAL_INCIDENT'
  | 'MULTI_INCIDENT_CLUSTER'
  | 'NO_REPORT_ALERT'
  | 'SYNC_FAILURE'
  | 'RESULT_DISCREPANCY'
  | 'SYSTEM_ALERT';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  puId?: string;
  puCode?: string;
  wardId?: string;
  wardName?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'AUTH' | 'REPORT' | 'INCIDENT' | 'RESULT' | 'VERIFICATION' | 'SYSTEM' | 'ADMIN';
  userId: string;
  userName: string;
  userRole: UserRole;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface OfflineSyncItem {
  localId: string;
  type: 'OPENING_REPORT' | 'VOTING_REPORT' | 'CLOSING_REPORT' | 'INCIDENT' | 'RESULT';
  endpoint: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  components: {
    api: { status: 'UP' | 'DOWN'; latencyMs: number };
    database: { status: 'UP' | 'DOWN'; totalRecords: number };
    storage: { status: 'UP' | 'DOWN'; usedBytes: number };
    queue: { status: 'UP' | 'DOWN'; pendingJobs: number };
  };
}
