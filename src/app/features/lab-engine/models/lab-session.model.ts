import { Timestamp } from '@angular/fire/firestore';

// ── Lab Session (Firestore: labSessions/{sessionId}) ─────────────────────────

export type LabSessionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'PASSED'
  | 'FAILED'
  | 'ABANDONED';

export interface LabSession {
  id: string;
  labId: string;
  userId: string;
  /** Optional org scoping for multi-tenant isolation */
  orgId?: string;
  status: LabSessionStatus;
  startedAt: Timestamp | null;
  lastActivityAt: Timestamp | null;
  submittedAt?: Timestamp | null;
  currentTaskId?: string;
  progressPercent: number;
  score: number;
  maxScore: number;
  attempts: number;
  /** Storage path prefix, e.g. labs/sessions/{sessionId}/workspace/ */
  workspaceStoragePath: string;
  /** Storage path for exported artifact ZIP */
  artifactStoragePath?: string;
  validationSummary?: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

// ── Workspace File (Firestore: labSessions/{sessionId}/workspaceFiles/{fileId})

/**
 * Metadata-only document. Content NEVER stored here — always in Firebase Storage.
 * contentPreview is ≤500 chars only for quick display.
 */
export interface WorkspaceFile {
  id: string;
  path: string;
  language: string;
  /** Full Storage path to the actual file content */
  contentStoragePath: string;
  /** Short preview snippet (max 500 chars) — never full content */
  contentPreview?: string;
  readonly: boolean;
  modifiedAt: Timestamp | null;
  sizeBytes: number;
}

// ── Validation Run (Firestore: labSessions/{sessionId}/validationRuns/{runId})

export interface ValidationResult {
  ruleType: string;
  file: string;
  passed: boolean;
  points: number;
  pointsEarned: number;
  message: string;
  detail?: string;
}

export interface ValidationRun {
  id: string;
  labId: string;
  sessionId: string;
  userId: string;
  createdAt: Timestamp | null;
  score: number;
  maxScore: number;
  passed: boolean;
  results: ValidationResult[];
}

// ── Lab Submission (Firestore: labSubmissions/{submissionId}) ─────────────────

export type InstructorReviewStatus = 'PENDING' | 'REVIEWED' | 'NEEDS_REVISION';

export interface LabSubmission {
  id: string;
  labId: string;
  sessionId: string;
  userId: string;
  /** Learner display name for instructor review */
  displayName?: string;
  /** Optional org scoping */
  orgId?: string;
  submittedAt: Timestamp | null;
  score: number;
  maxScore: number;
  passed: boolean;
  /** Storage path to the artifact ZIP */
  artifactStoragePath: string;
  instructorReviewStatus: InstructorReviewStatus;
  instructorFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp | null;
}

// ── In-memory workspace file (not persisted to Firestore directly) ────────────

/**
 * Local in-memory representation of a file being edited.
 * Content is loaded from Storage and kept in memory only.
 */
export interface LocalWorkspaceFile {
  id: string;
  path: string;
  language: string;
  content: string;
  originalContent: string;
  readonly: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

// ── Lab session creation payload ──────────────────────────────────────────────

export interface CreateSessionPayload {
  labId: string;
  userId: string;
  orgId?: string;
}
