import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import {
  ListeningTestAssessment,
  ListeningTestResult,
  ListeningAnswer,
  ListeningErrorReflection,
  ListeningCompletionMode,
} from '../models/listening-test.models';

@Injectable({ providedIn: 'root' })
export class ListeningTestService {
  private db = inject(Firestore);

  // ── Collection helpers ──────────────────────────────────────

  private assessmentCol() {
    return collection(this.db, 'listeningTestAssessments');
  }

  private resultCol() {
    return collection(this.db, 'listeningTestResults');
  }

  private progressRef(learnerId: string, assessmentId: string) {
    return doc(this.db, `users/${learnerId}/listeningProgress/${assessmentId}`);
  }

  // ── Assessment CRUD (admin/manager) ─────────────────────────

  async getAssessment(assessmentId: string): Promise<ListeningTestAssessment | null> {
    const snap = await getDoc(doc(this.db, 'listeningTestAssessments', assessmentId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ListeningTestAssessment;
  }

  getAssessment$(assessmentId: string): Observable<ListeningTestAssessment | undefined> {
    return docData(doc(this.db, 'listeningTestAssessments', assessmentId), {
      idField: 'id',
    }) as Observable<ListeningTestAssessment | undefined>;
  }

  async getAllAssessments(): Promise<ListeningTestAssessment[]> {
    const snaps = await getDocs(this.assessmentCol());
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() } as ListeningTestAssessment));
  }

  async saveAssessment(assessment: Omit<ListeningTestAssessment, 'id'>): Promise<string> {
    const payload = {
      ...assessment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(this.assessmentCol(), payload);
    return ref.id;
  }

  async updateAssessment(id: string, patch: Partial<ListeningTestAssessment>): Promise<void> {
    await updateDoc(doc(this.db, 'listeningTestAssessments', id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Results (learner submit) ─────────────────────────────────

  async submitResult(
    result: Omit<ListeningTestResult, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const payload = {
      ...result,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(this.resultCol(), payload);

    // Track progress per learner
    await this.markProgress(result.learnerId, result.assessmentId, {
      submitted: true,
      passed: result.passed,
      percentage: result.percentage,
      submittedAt: serverTimestamp(),
      completionMode: result.passed
        ? ListeningCompletionMode.LISTENING_TEST_PASSED
        : ListeningCompletionMode.LISTENING_TEST_SUBMITTED,
    });

    return ref.id;
  }

  async updateErrorLog(
    resultId: string,
    errorLog: ListeningErrorReflection[],
    learnerId: string,
    assessmentId: string
  ): Promise<void> {
    await updateDoc(doc(this.db, 'listeningTestResults', resultId), {
      errorLog,
      errorLogCompleted: true,
      updatedAt: serverTimestamp(),
    });

    await this.markProgress(learnerId, assessmentId, {
      errorLogCompleted: true,
      completionMode: ListeningCompletionMode.LISTENING_ERROR_LOG_COMPLETED,
    });
  }

  async addInstructorNote(resultId: string, note: string, reviewerUid: string): Promise<void> {
    const existing = await getDoc(doc(this.db, 'listeningTestResults', resultId));
    const prev: { note: string; reviewerUid: string; createdAt: unknown }[] =
      existing.data()?.['instructorNotes'] ?? [];
    await updateDoc(doc(this.db, 'listeningTestResults', resultId), {
      instructorNotes: [...prev, { note, reviewerUid, createdAt: serverTimestamp() }],
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // ── Progress ─────────────────────────────────────────────────

  private async markProgress(
    learnerId: string,
    assessmentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const ref = this.progressRef(learnerId, assessmentId);
    await setDoc(ref, { learnerId, assessmentId, ...data }, { merge: true });
  }

  // ── Queries — Learner ─────────────────────────────────────────

  async getMyResults(learnerId: string): Promise<ListeningTestResult[]> {
    const q = query(
      this.resultCol(),
      where('learnerId', '==', learnerId),
      orderBy('submittedAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() } as ListeningTestResult));
  }

  async getMyResultForAssessment(
    learnerId: string,
    assessmentId: string
  ): Promise<ListeningTestResult | null> {
    const q = query(
      this.resultCol(),
      where('learnerId', '==', learnerId),
      where('assessmentId', '==', assessmentId),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    const d = snaps.docs[0];
    return { id: d.id, ...d.data() } as ListeningTestResult;
  }

  // ── Queries — Instructor ──────────────────────────────────────

  async getAllResults(filters?: {
    courseId?: string;
    moduleId?: string;
    targetTest?: string;
    learnerId?: string;
  }): Promise<ListeningTestResult[]> {
    let q = query(this.resultCol(), orderBy('submittedAt', 'desc'));

    // Apply one equality filter at a time (Firestore composite index)
    if (filters?.courseId) {
      q = query(this.resultCol(), where('courseId', '==', filters.courseId), orderBy('submittedAt', 'desc'));
    } else if (filters?.learnerId) {
      q = query(this.resultCol(), where('learnerId', '==', filters.learnerId), orderBy('submittedAt', 'desc'));
    } else if (filters?.targetTest) {
      q = query(this.resultCol(), where('targetTest', '==', filters.targetTest), orderBy('submittedAt', 'desc'));
    }

    const snaps = await getDocs(q);
    let results = snaps.docs.map((d) => ({ id: d.id, ...d.data() } as ListeningTestResult));

    // Client-side filter for remaining conditions
    if (filters?.courseId && filters?.learnerId) {
      results = results.filter((r) => r.learnerId === filters.learnerId);
    }
    if (filters?.moduleId) {
      results = results.filter((r) => r.moduleId === filters.moduleId);
    }

    return results;
  }

  async getResultById(resultId: string): Promise<ListeningTestResult | null> {
    const snap = await getDoc(doc(this.db, 'listeningTestResults', resultId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ListeningTestResult;
  }

  // ── Seed (admin import) ──────────────────────────────────────

  async seedAssessment(data: unknown): Promise<string> {
    const ref = await addDoc(this.assessmentCol(), {
      ...(data as object),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }
}
