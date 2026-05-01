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
    const lessonActivity = completedLessonsSnap.docs.map((docSnap) => docSnap.data());

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

    const simulationsSnap = await getDocs(
      query(
        collection(this.firestore, `programs/${programId}/simulations`),
        where('active', '==', true)
      )
    );
    const totalSimulations = simulationsSnap.size;

    const simulationAttemptsSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/simulationAttempts`),
        where('programId', '==', programId)
      )
    );
    const simulationAttempts = simulationAttemptsSnap.docs.map((docSnap) => docSnap.data());
    const completedSimulations = this.countDistinct(
      simulationAttempts.map((row) => String(row['simulationId'] ?? ''))
    );

    const caseStudiesSnap = await getDocs(
      query(
        collection(this.firestore, `programs/${programId}/caseStudies`),
        where('active', '==', true)
      )
    );
    const totalCaseStudies = caseStudiesSnap.size;

    const caseStudyAttemptsSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/caseStudyAttempts`),
        where('programId', '==', programId)
      )
    );
    const caseStudyAttempts = caseStudyAttemptsSnap.docs.map((docSnap) => docSnap.data());
    const completedCaseStudies = this.countDistinct(
      caseStudyAttempts.map((row) => String(row['caseStudyId'] ?? ''))
    );

    const assessmentsSnap = await getDocs(
      query(
        collection(this.firestore, `programs/${programId}/assessments`),
        where('active', '==', true)
      )
    );
    const totalAssessments = assessmentsSnap.size;

    // Average assessment score
    const allAttemptsSnap = await getDocs(
      query(
        collection(this.firestore, `users/${uid}/assessmentAttempts`),
        where('programId', '==', programId)
      )
    );
    const scores = allAttemptsSnap.docs.map((d) => Number(d.data()['score'] ?? 0));
    const assessmentAttempts = allAttemptsSnap.docs.map((docSnap) => docSnap.data());
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const completedAssessments = this.countDistinct(
      assessmentAttempts.map((row) => String(row['assessmentId'] ?? ''))
    );

    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const status =
      progressPct >= 100
        ? ProgressStatus.COMPLETED
        : completedLessons > 0
          ? ProgressStatus.IN_PROGRESS
          : ProgressStatus.NOT_STARTED;
    const totalStudyMinutes =
      simulationAttempts.reduce((sum, row) => sum + Number(row['timeSpentMin'] ?? 0), 0) +
      assessmentAttempts.reduce((sum, row) => sum + Number(row['timeSpentMin'] ?? 0), 0);
    const streakDays = this.computeCurrentStreakDays([
      ...lessonActivity.map((row) => row['completedAt'] ?? row['lastOpenedAt']),
      ...simulationAttempts.map((row) => row['completedAt']),
      ...assessmentAttempts.map((row) => row['completedAt']),
      ...caseStudyAttempts.map((row) => row['completedAt']),
    ]);
    const readinessScore = this.computeReadinessScore(
      averageScore,
      progressPct,
      simulationAttempts.map((row) => Number(row['score'] ?? 0)),
      streakDays
    );

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
        completedSimulations,
        totalSimulations,
        completedCaseStudies,
        totalCaseStudies,
        completedAssessments,
        totalAssessments,
        averageScore,
        readinessScore,
        streakDays,
        totalStudyMinutes,
        status,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private computeReadinessScore(
    averageScore: number,
    progressPct: number,
    simulationScores: number[],
    streakDays: number
  ): number {
    const simulationAvg =
      simulationScores.length > 0
        ? simulationScores.reduce((sum, score) => sum + Number(score || 0), 0) / simulationScores.length
        : 0;

    const weighted = averageScore * 0.4 + progressPct * 0.3 + simulationAvg * 0.2 + streakDays * 2;
    return Math.max(0, Math.min(100, Math.round(weighted)));
  }

  private countDistinct(values: string[]): number {
    return new Set(values.filter((value) => value.trim().length > 0)).size;
  }

  private computeCurrentStreakDays(values: unknown[]): number {
    const days = [...new Set(values.map((value) => this.toDayNumber(value)).filter((value) => value > 0))]
      .sort((a, b) => b - a);

    if (!days.length) {
      return 0;
    }

    const today = this.toDayNumber(new Date());
    if (today - days[0] > 1) {
      return 0;
    }

    let streak = 1;
    for (let index = 1; index < days.length; index += 1) {
      if (days[index - 1] - days[index] !== 1) {
        break;
      }

      streak += 1;
    }

    return streak;
  }

  private toDayNumber(value: unknown): number {
    const epoch = this.toEpoch(value);
    if (!epoch) {
      return 0;
    }

    const date = new Date(epoch);
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  }

  private toEpoch(value: unknown): number {
    if (!value) {
      return 0;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'object') {
      if ('seconds' in (value as Record<string, unknown>)) {
        const seconds = Number((value as { seconds: number }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : 0;
      }

      if ('toMillis' in (value as Record<string, unknown>)) {
        return (value as { toMillis(): number }).toMillis();
      }

      if ('toDate' in (value as Record<string, unknown>)) {
        return (value as { toDate(): Date }).toDate().getTime();
      }
    }

    return 0;
  }
}
