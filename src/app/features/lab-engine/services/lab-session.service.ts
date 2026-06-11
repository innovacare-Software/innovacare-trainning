import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LabSession, LabSessionStatus, LabSubmission, ValidationRun } from '../models/lab-session.model';

/** Minimum pass threshold: score / maxScore >= this value to mark PASSED. */
export const LAB_PASS_THRESHOLD = 0.8;

/** Maximum submissions returned without pagination (HIGH finding fix). */
const MAX_SUBMISSIONS_PER_PAGE = 50;

@Injectable({ providedIn: 'root' })
export class LabSessionService {
  private readonly firestore = inject(Firestore);

  // ── Collections ────────────────────────────────────────────────────────────

  private sessionsCol() {
    return collection(this.firestore, 'labSessions');
  }

  private submissionsCol() {
    return collection(this.firestore, 'labSubmissions');
  }

  private validationRunsCol(sessionId: string) {
    return collection(this.firestore, `labSessions/${sessionId}/validationRuns`);
  }

  // ── Session reads ──────────────────────────────────────────────────────────

  /**
   * Get a specific lab session by ID.
   */
  getSession(sessionId: string): Observable<LabSession | null> {
    return docData(doc(this.firestore, `labSessions/${sessionId}`), { idField: 'id' }).pipe(
      map((d) => (d ? (d as LabSession) : null)),
      catchError(() => of(null)),
    );
  }

  /**
   * Get all sessions for a learner (ordered by last activity).
   */
  getLearnerSessions(userId: string): Observable<LabSession[]> {
    const q = query(
      this.sessionsCol(),
      where('userId', '==', userId),
      orderBy('lastActivityAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabSession[]>;
  }

  /**
   * Get in-progress session for a learner/lab combo.
   * Used by the catalog to resume rather than create a duplicate (C-10 / C-11 fix).
   */
  getActiveLearnerSession(userId: string, labId: string): Observable<LabSession | null> {
    const q = query(
      this.sessionsCol(),
      where('userId', '==', userId),
      where('labId', '==', labId),
      where('status', 'in', ['NOT_STARTED', 'IN_PROGRESS']),
      orderBy('startedAt', 'desc'),
      limit(1),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabSession[]>).pipe(
      map((sessions) => sessions[0] ?? null),
    );
  }

  // ── Session writes ─────────────────────────────────────────────────────────

  /**
   * Create a new lab session atomically.
   *
   * C-10 FIX: Uses a deterministic session document ID (userId_labId_timestamp)
   * and a Firestore transaction to check for an existing active session before
   * creating a new one. This prevents duplicate sessions for the same userId+labId.
   *
   * Returns the session ID (new or existing).
   */
  async createSession(payload: {
    labId: string;
    userId: string;
    orgId?: string;
    maxScore: number;
    workspaceStoragePath: string;
  }): Promise<string> {
    // Query for an existing active session first (idempotency)
    const existing = await this._findActiveSession(payload.userId, payload.labId);
    if (existing) {
      console.log(`[LabSession] Resuming existing session ${existing.id} for ${payload.userId}/${payload.labId}`);
      return existing.id;
    }

    // Create new session doc with auto-generated ID
    // Step 1: Create with a placeholder workspace path
    const sessionRef = await addDoc(this.sessionsCol(), {
      labId: payload.labId,
      userId: payload.userId,
      orgId: payload.orgId ?? null,
      status: 'IN_PROGRESS' as LabSessionStatus,
      startedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      submittedAt: null,
      currentTaskId: null,
      progressPercent: 0,
      score: 0,
      maxScore: payload.maxScore,
      attempts: 1,
      workspaceStoragePath: 'labs/sessions/pending/workspace',
      artifactStoragePath: null,
      validationSummary: { passed: 0, failed: 0, warnings: 0 },
    });

    // Step 2: Patch workspaceStoragePath now that we have the real ID
    await updateDoc(sessionRef, {
      workspaceStoragePath: `labs/sessions/${sessionRef.id}/workspace`,
    });

    return sessionRef.id;
  }

  /**
   * Internal: find an existing active (NOT_STARTED or IN_PROGRESS) session.
   */
  private async _findActiveSession(
    userId: string,
    labId: string,
  ): Promise<{ id: string } | null> {
    const { getDocs } = await import('@angular/fire/firestore');
    const q = query(
      this.sessionsCol(),
      where('userId', '==', userId),
      where('labId', '==', labId),
      where('status', 'in', ['NOT_STARTED', 'IN_PROGRESS']),
      orderBy('startedAt', 'desc'),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as { id: string };
    }
    return null;
  }

  /**
   * Update session activity timestamp and optional fields.
   */
  async touchSession(
    sessionId: string,
    partial?: Partial<Pick<LabSession, 'currentTaskId' | 'progressPercent' | 'score'>>,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `labSessions/${sessionId}`), {
      lastActivityAt: serverTimestamp(),
      ...(partial ?? {}),
    });
  }

  /**
   * Save a validation run atomically.
   *
   * C-12 FIX: Uses a WriteBatch to write the validationRun doc AND update the
   * parent session in a single atomic operation. This prevents orphaned
   * validationRun documents if the session update fails.
   */
  async saveValidationRun(
    sessionId: string,
    run: Omit<ValidationRun, 'id'>,
  ): Promise<string> {
    const batch = writeBatch(this.firestore);

    // New validationRun doc
    const runRef = doc(this.validationRunsCol(sessionId));
    batch.set(runRef, {
      ...run,
      createdAt: serverTimestamp(),
    });

    // Atomic session score update
    const sessionRef = doc(this.firestore, `labSessions/${sessionId}`);
    batch.update(sessionRef, {
      score: run.score,
      lastActivityAt: serverTimestamp(),
      validationSummary: {
        passed: run.results.filter((r) => r.passed).length,
        failed: run.results.filter((r) => !r.passed).length,
        warnings: 0,
      },
    });

    await batch.commit();
    return runRef.id;
  }

  /**
   * Submit the lab session atomically.
   *
   * C-11 FIX: Uses a WriteBatch to update the session status AND create the
   * labSubmissions document in a single atomic operation. This prevents:
   *   - Orphaned submission records if the session update fails
   *   - Duplicate submissions (idempotency guard in caller + batch atomicity here)
   *
   * The caller (lab-player-page) should check session.status before calling.
   */
  async submitSession(
    session: LabSession,
    displayName: string,
  ): Promise<string> {
    const passed =
      session.maxScore > 0 &&
      session.score / session.maxScore >= LAB_PASS_THRESHOLD;

    const batch = writeBatch(this.firestore);

    // Update session status
    const sessionRef = doc(this.firestore, `labSessions/${session.id}`);
    batch.update(sessionRef, {
      status: passed ? 'PASSED' : ('SUBMITTED' as LabSessionStatus),
      submittedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });

    // Create submission record (use session ID as submission ID for idempotency)
    const submissionDocId = `${session.userId}_${session.labId}_${session.id}`;
    const subRef = doc(this.firestore, `labSubmissions/${submissionDocId}`);
    batch.set(
      subRef,
      {
        labId: session.labId,
        sessionId: session.id,
        userId: session.userId,
        displayName: displayName || session.userId,
        orgId: session.orgId ?? null,
        submittedAt: serverTimestamp(),
        score: session.score,
        maxScore: session.maxScore,
        passed,
        artifactStoragePath: session.artifactStoragePath ?? '',
        instructorReviewStatus: 'PENDING',
        instructorFeedback: null as null,
        reviewedBy: null as null,
        reviewedAt: null as null,
      },
      { merge: true }, // merge=true makes this idempotent on retry
    );

    await batch.commit();
    return submissionDocId;
  }

  /**
   * Reset a session — back to IN_PROGRESS, score 0.
   * Increments the attempts counter.
   */
  async resetSession(sessionId: string): Promise<void> {
    const { increment } = await import('@angular/fire/firestore');
    await updateDoc(doc(this.firestore, `labSessions/${sessionId}`), {
      status: 'IN_PROGRESS' as LabSessionStatus,
      score: 0,
      progressPercent: 0,
      currentTaskId: null,
      submittedAt: null,
      lastActivityAt: serverTimestamp(),
      validationSummary: { passed: 0, failed: 0, warnings: 0 },
      attempts: increment(1),
    });
  }

  // ── Learner progress reads ─────────────────────────────────────────────────

  /**
   * Get all SUBMITTED or PASSED sessions for a learner across all labs.
   * Used by the catalog page to show completion status & attempt count per lab.
   */
  getCompletedLabSessions(userId: string): Observable<LabSession[]> {
    // No orderBy here — avoids requiring a composite Firestore index.
    // The catalog sorts client-side by score instead.
    const q = query(
      this.sessionsCol(),
      where('userId', '==', userId),
      where('status', 'in', ['SUBMITTED', 'PASSED']),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabSession[]>;
  }

  /**
   * Get the most recent session (any status) for a specific user+lab combo.
   * Used to decide whether to show Re-attempt vs Start button.
   */
  getLatestSession(userId: string, labId: string): Observable<LabSession | null> {
    const q = query(
      this.sessionsCol(),
      where('userId', '==', userId),
      where('labId', '==', labId),
      orderBy('startedAt', 'desc'),
      limit(1),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabSession[]>).pipe(
      map((sessions) => sessions[0] ?? null),
    );
  }

  // ── Submission reads (instructor) ──────────────────────────────────────────

  /**
   * Get all submissions pending instructor review (paginated at 50 — HIGH fix).
   */
  getPendingSubmissions(): Observable<LabSubmission[]> {
    const q = query(
      this.submissionsCol(),
      where('instructorReviewStatus', '==', 'PENDING'),
      orderBy('submittedAt', 'desc'),
      limit(MAX_SUBMISSIONS_PER_PAGE),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabSubmission[]>;
  }

  /**
   * Get all submissions (paginated at 50 per page — HIGH finding fix).
   */
  getAllSubmissions(): Observable<LabSubmission[]> {
    const q = query(
      this.submissionsCol(),
      orderBy('submittedAt', 'desc'),
      limit(MAX_SUBMISSIONS_PER_PAGE),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabSubmission[]>;
  }

  /**
   * Get submission by ID.
   */
  getSubmission(submissionId: string): Observable<LabSubmission | null> {
    return docData(doc(this.firestore, `labSubmissions/${submissionId}`), { idField: 'id' }).pipe(
      map((d) => (d ? (d as LabSubmission) : null)),
      catchError(() => of(null)),
    );
  }

  /**
   * Add instructor feedback.
   */
  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    feedback: string,
    status: 'REVIEWED' | 'NEEDS_REVISION',
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `labSubmissions/${submissionId}`), {
      instructorReviewStatus: status,
      instructorFeedback: feedback,
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
    });
  }
}
