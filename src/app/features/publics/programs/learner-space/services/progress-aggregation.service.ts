/**
 * ProgressAggregationService
 *
 * Called after every lesson completion or assessment submission to recompute
 * UserModuleProgress and UserProgramProgress in Firestore.  Keeps the
 * learner dashboard, module list, and readiness ring in sync without requiring
 * Cloud Functions.
 *
 * Firestore paths written:
 *   users/{uid}/moduleProgress/{moduleId}
 *   users/{uid}/programProgress/{programId}
 */
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { ProgressStatus } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class ProgressAggregationService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  /**
   * Call this immediately after a lesson is marked complete.
   * Recomputes the parent module's progress, then the full program progress.
   */
  async aggregateAfterLessonComplete(programId: string, moduleId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.uid || !programId || !moduleId) return;

    await this.updateModuleProgress(programId, moduleId, user.uid);
    await this.updateProgramProgress(programId, user.uid);
  }

  /**
   * Call this after an assessment attempt is submitted.
   * Updates the program-level averageScore.
   */
  async aggregateAfterAssessment(programId: string, moduleId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.uid || !programId) return;

    await this.updateModuleAverageScore(programId, moduleId, user.uid);
    await this.updateProgramProgress(programId, user.uid);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async updateModuleProgress(programId: string, moduleId: string, uid: string): Promise<void> {
    // Count total active lessons in this module
    const lessonsRef = collection(this.firestore, `programs/${programId}/lessons`);
    const lessonsSnap = await getDocs(
      query(lessonsRef, where('active', '==', true), where('moduleId', '==', moduleId))
    );
    const totalLessons = lessonsSnap.size;

    // Count completed lessons in this module for this user
    const progressRef = collection(this.firestore, `users/${uid}/lessonProgress`);
    const completedSnap = await getDocs(
      query(
        progressRef,
        where('programId', '==', programId),
        where('moduleId', '==', moduleId),
        where('completed', '==', true)
      )
    );
    const completedLessons = completedSnap.size;

    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const status =
      progressPct >= 100
        ? ProgressStatus.COMPLETED
        : completedLessons > 0
          ? ProgressStatus.IN_PROGRESS
          : ProgressStatus.NOT_STARTED;

    const moduleProgressRef = doc(this.firestore, `users/${uid}/moduleProgress/${moduleId}`);
    await setDoc(
      moduleProgressRef,
      {
        userId: uid,
        programId,
        moduleId,
        progressPct,
        completedLessons,
        totalLessons,
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private async updateModuleAverageScore(programId: string, moduleId: string, uid: string): Promise<void> {
    const attemptsRef = collection(this.firestore, `users/${uid}/assessmentAttempts`);
    const attemptsSnap = await getDocs(
      query(
        attemptsRef,
        where('programId', '==', programId),
        where('moduleId', '==', moduleId)
      )
    );

    if (attemptsSnap.empty) return;

    const scores = attemptsSnap.docs.map((d) => Number(d.data()['score'] ?? 0));
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const moduleProgressRef = doc(this.firestore, `users/${uid}/moduleProgress/${moduleId}`);
    await setDoc(moduleProgressRef, { averageScore, updatedAt: serverTimestamp() }, { merge: true });
  }

  private async updateProgramProgress(programId: string, uid: string): Promise<void> {
    // Total lessons in program
    const allLessonsSnap = await getDocs(
      query(
        collection(this.firestore, `programs/${programId}/lessons`),
        where('active', '==', true)
      )
    );
    const totalLessons = allLessonsSnap.size;

    // Completed lessons
    const completedLessonsSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/lessonProgress`),
        where('programId', '==', programId),
        where('completed', '==', true)
      )
    );
    const completedLessons = completedLessonsSnap.size;

    // Total modules
    const allModulesSnap = await getDocs(
      query(
        collection(this.firestore, `programs/${programId}/modules`),
        where('active', '==', true)
      )
    );
    const totalModules = allModulesSnap.size;

    // Completed modules (progressPct === 100)
    const completedModulesSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/moduleProgress`),
        where('programId', '==', programId),
        where('status', '==', ProgressStatus.COMPLETED)
      )
    );
    const completedModules = completedModulesSnap.size;

    // Average assessment score
    const allAttemptsSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/assessmentAttempts`),
        where('programId', '==', programId)
      )
    );
    const scores = allAttemptsSnap.docs.map((d) => Number(d.data()['score'] ?? 0));
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const status =
      progressPct >= 100
        ? ProgressStatus.COMPLETED
        : completedLessons > 0
          ? ProgressStatus.IN_PROGRESS
          : ProgressStatus.NOT_STARTED;

    const programProgressRef = doc(this.firestore, `users/${uid}/programProgress/${programId}`);
    await setDoc(
      programProgressRef,
      {
        userId: uid,
        programId,
        progressPct,
        completedLessons,
        totalLessons,
        completedModules,
        totalModules,
        averageScore,
        status,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}
