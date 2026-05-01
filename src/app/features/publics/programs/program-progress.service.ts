import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import {
  DashboardStatCards,
  NursingNclexDomain,
  ProgramLesson,
  ProgramDashboardViewModel,
  ProgramEnrollment,
  ProgramCategory,
  ProgramEnrollmentStatus,
  ProgramModule,
  ProgressStatus,
  UserCaseStudyAttempt,
  UserLessonProgress,
  UserAssessmentAttempt,
  UserModuleProgress,
  UserProgramProgress,
  UserSimulationAttempt,
} from './program.models';
import { ProgramEnrollmentsService } from './program-enrollments.service';

@Injectable({ providedIn: 'root' })
export class ProgramProgressService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly enrollments = inject(ProgramEnrollmentsService);

  getUserProgramProgress(programId: string): Observable<UserProgramProgress | undefined> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of(undefined);
        }

        const ref = doc(this.firestore, `users/${user.uid}/programProgress/${programId}`);
        return docData(ref, { idField: 'id' }) as Observable<UserProgramProgress | undefined>;
      })
    );
  }

  getUserModuleProgress(programId: string): Observable<UserModuleProgress[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of([] as UserModuleProgress[]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/moduleProgress`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserModuleProgress[]>;
      })
    );
  }

  getUserLessonProgress(programId: string): Observable<UserLessonProgress[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of([] as UserLessonProgress[]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/lessonProgress`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserLessonProgress[]>;
      })
    );
  }

  getUserSimulationAttempts(programId: string): Observable<UserSimulationAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of([] as UserSimulationAttempt[]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/simulationAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserSimulationAttempt[]>;
      })
    );
  }

  getUserAssessmentAttempts(programId: string): Observable<UserAssessmentAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of([] as UserAssessmentAttempt[]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/assessmentAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserAssessmentAttempt[]>;
      })
    );
  }

  getUserCaseStudyAttempts(programId: string): Observable<UserCaseStudyAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) {
          return of([] as UserCaseStudyAttempt[]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/caseStudyAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserCaseStudyAttempt[]>;
      })
    );
  }

  getProgramModules(programId: string): Observable<ProgramModule[]> {
    if (!programId) {
      return of([] as ProgramModule[]);
    }

    return collectionData(
      query(collection(this.firestore, `programs/${programId}/modules`), where('active', '==', true)),
      { idField: 'id' }
    ) as Observable<ProgramModule[]>;
  }

  getProgramLessons(programId: string): Observable<ProgramLesson[]> {
    if (!programId) {
      return of([] as ProgramLesson[]);
    }

    return collectionData(
      query(collection(this.firestore, `programs/${programId}/lessons`), where('active', '==', true)),
      { idField: 'id' }
    ) as Observable<ProgramLesson[]>;
  }

  getProgramContentTotals(programId: string): Observable<{
    totalLessons: number;
    totalModules: number;
    totalSimulations: number;
    totalAssessments: number;
    totalCaseStudies: number;
  }> {
    if (!programId) {
      return of({
        totalLessons: 0,
        totalModules: 0,
        totalSimulations: 0,
        totalAssessments: 0,
        totalCaseStudies: 0,
      });
    }

    return combineLatest([
      collectionData(query(collection(this.firestore, `programs/${programId}/lessons`), where('active', '==', true))),
      collectionData(query(collection(this.firestore, `programs/${programId}/modules`), where('active', '==', true))),
      collectionData(query(collection(this.firestore, `programs/${programId}/simulations`), where('active', '==', true))),
      collectionData(query(collection(this.firestore, `programs/${programId}/assessments`), where('active', '==', true))),
      collectionData(query(collection(this.firestore, `programs/${programId}/caseStudies`), where('active', '==', true))),
    ]).pipe(
      map(([lessons, modules, simulations, assessments, caseStudies]) => ({
        totalLessons: lessons.length,
        totalModules: modules.length,
        totalSimulations: simulations.length,
        totalAssessments: assessments.length,
        totalCaseStudies: caseStudies.length,
      }))
    );
  }

  buildDashboardStats(programId: string): Observable<ProgramDashboardViewModel> {
    return combineLatest([
      this.enrollments.getMyEnrollments(),
      this.getUserProgramProgress(programId),
      this.getUserLessonProgress(programId),
      this.getUserModuleProgress(programId),
      this.getUserSimulationAttempts(programId),
      this.getUserAssessmentAttempts(programId),
      this.getUserCaseStudyAttempts(programId),
      this.getProgramModules(programId),
      this.getProgramLessons(programId),
      this.getProgramContentTotals(programId),
    ]).pipe(
      map(([
        enrollments,
        progress,
        lessonProgress,
        moduleProgress,
        simulationAttempts,
        assessmentAttempts,
        caseStudyAttempts,
        modules,
        lessons,
        contentTotals,
      ]) => {
        const enrollment = this.enrollments.selectPrimaryEnrollment(enrollments, programId);
        const alignedModuleProgress = this.deriveModuleProgress(modules, lessons, lessonProgress, moduleProgress);
        const stats = this.computeProgressStats(
          enrollment,
          progress,
          lessonProgress,
          alignedModuleProgress,
          simulationAttempts,
          assessmentAttempts,
          caseStudyAttempts,
          modules,
          contentTotals
        );

        return {
          enrollment,
          progress,
          modules,
          moduleProgress: alignedModuleProgress,
          simulationAttempts,
          assessmentAttempts,
          stats,
        };
      })
    );
  }

  computeReadinessScore(
    averageScore: number,
    progressPct: number,
    simulationAttempts: UserSimulationAttempt[],
    streakDays: number
  ): number {
    const simulationAvg =
      simulationAttempts.length > 0
        ? simulationAttempts.reduce((sum, row) => sum + Number(row.score || 0), 0) /
          simulationAttempts.length
        : 0;

    const weighted = averageScore * 0.4 + progressPct * 0.3 + simulationAvg * 0.2 + streakDays * 2;
    return Math.max(0, Math.min(100, Math.round(weighted)));
  }

  computeProgressStats(
    enrollment: ProgramEnrollment | undefined,
    progress: UserProgramProgress | undefined,
    lessonProgress: UserLessonProgress[],
    moduleProgress: UserModuleProgress[],
    simulationAttempts: UserSimulationAttempt[],
    assessmentAttempts: UserAssessmentAttempt[],
    caseStudyAttempts: UserCaseStudyAttempt[],
    modules: ProgramModule[],
    contentTotals: {
      totalLessons: number;
      totalModules: number;
      totalSimulations: number;
      totalAssessments: number;
      totalCaseStudies: number;
    }
  ): DashboardStatCards {
    const completedLessons = this.countDistinct(
      lessonProgress.filter((row) => row.completed).map((row) => row.lessonId)
    );
    const totalLessons = contentTotals.totalLessons;
    const derivedProgressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const modulesCompleted = moduleProgress.filter(
      (row) => Number(row.progressPct ?? 0) >= 100 || row.status === ProgressStatus.COMPLETED
    ).length;
    const averageAssessmentScore =
      assessmentAttempts.length > 0
        ? Math.round(
            assessmentAttempts.reduce((sum, row) => sum + Number(row.score || 0), 0) /
              assessmentAttempts.length
          )
        : 0;
    const averageSimulationScore =
      simulationAttempts.length > 0
        ? Math.round(
            simulationAttempts.reduce((sum, row) => sum + Number(row.score || 0), 0) /
              simulationAttempts.length
          )
        : 0;

    const moduleTitleById = new Map(modules.map((module) => [module.id, module.title]));
    const rankedModules = this.rankModuleAreas(
      modules,
      moduleProgress,
      simulationAttempts,
      assessmentAttempts
    );

    const weakestArea = rankedModules.length
      ? this.resolveModuleAreaLabel(rankedModules[0].moduleId, moduleTitleById)
      : this.resolveModuleAreaLabel(modules[0]?.id, moduleTitleById);
    const strongestArea = rankedModules.length
      ? this.resolveModuleAreaLabel(rankedModules[rankedModules.length - 1].moduleId, moduleTitleById)
      : this.resolveModuleAreaLabel(modules[modules.length - 1]?.id, moduleTitleById);

    const firstIncomplete = moduleProgress.find((m) => m.progressPct < 100);
    const recommendedNextModule = firstIncomplete
      ? this.resolveModuleAreaLabel(firstIncomplete.moduleId, moduleTitleById)
      : this.resolveModuleAreaLabel(modules[0]?.id, moduleTitleById, 'Readiness Exam');
    const averageScore = averageAssessmentScore;
    const currentStreak = this.computeCurrentStreakDays([
      ...lessonProgress.map((row) => row.completedAt ?? row.lastOpenedAt),
      ...simulationAttempts.map((row) => row.completedAt),
      ...assessmentAttempts.map((row) => row.completedAt),
      ...caseStudyAttempts.map((row) => row.completedAt),
    ]);
    const totalStudyMinutes =
      simulationAttempts.reduce((sum, row) => sum + Number(row.timeSpentMin || 0), 0) +
      assessmentAttempts.reduce((sum, row) => sum + Number(row.timeSpentMin || 0), 0);
    const simulationsCompleted = this.countDistinct(simulationAttempts.map((row) => row.simulationId));
    const caseStudiesCompleted = this.countDistinct(caseStudyAttempts.map((row) => row.caseStudyId));
    const totalCaseStudies = contentTotals.totalCaseStudies;

    const readiness = this.computeReadinessScore(
      averageScore,
      derivedProgressPct,
      simulationAttempts,
      currentStreak
    );

    const caseStudyCompletionRate =
      totalCaseStudies > 0
        ? Math.round(
            ((caseStudiesCompleted / totalCaseStudies) * 100)
          )
        : 0;

    const recommendedNextAction = this.buildRecommendedAction({
      enrollment,
      readiness,
      weakestArea,
      recommendedNextModule,
      averageSimulationScore,
      caseStudyCompletionRate,
    });

    return {
      overallProgressPct: derivedProgressPct,
      readinessScore: readiness,
      averageScore,
      modulesCompleted,
      simulationsCompleted,
      caseStudiesCompleted,
      totalStudyMinutes,
      currentStreak,
      weakestArea,
      strongestArea,
      recommendedNextModule,
      recommendedNextAction,
      averageSimulationScore,
      caseStudyCompletionRate,
    };
  }

  private deriveModuleProgress(
    modules: ProgramModule[],
    lessons: ProgramLesson[],
    lessonProgress: UserLessonProgress[],
    storedModuleProgress: UserModuleProgress[]
  ): UserModuleProgress[] {
    const storedByModuleId = new Map(storedModuleProgress.map((row) => [row.moduleId, row]));

    return modules.map((module) => {
      const stored = storedByModuleId.get(module.id);
      const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
      const moduleLessonIds = new Set(moduleLessons.map((lesson) => lesson.id));
      const completedLessons = this.countDistinct(
        lessonProgress
          .filter((row) => row.completed && moduleLessonIds.has(row.lessonId))
          .map((row) => row.lessonId)
      );
      const totalLessons = moduleLessons.length || Math.max(0, Number(stored?.totalLessons ?? 0));
      const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const status =
        progressPct >= 100
          ? ProgressStatus.COMPLETED
          : completedLessons > 0
            ? ProgressStatus.IN_PROGRESS
            : ProgressStatus.NOT_STARTED;

      return {
        id: stored?.id || module.id,
        userId: stored?.userId || '',
        programId: stored?.programId || '',
        moduleId: module.id,
        progressPct,
        completedLessons,
        totalLessons,
        averageScore: Number(stored?.averageScore ?? 0),
        status,
        updatedAt: stored?.updatedAt,
      };
    });
  }

  private buildDomainScores(
    moduleProgress: UserModuleProgress[],
    simulationAttempts: UserSimulationAttempt[],
    assessmentAttempts: UserAssessmentAttempt[]
  ): Map<NursingNclexDomain, number> {
    const domains: NursingNclexDomain[] = [
      'Fundamentals',
      'Med-Surg',
      'Pharmacology',
      'Pediatrics',
      'Maternity',
      'Mental Health',
      'Leadership / Prioritization',
    ];

    const scores = new Map<NursingNclexDomain, number>(domains.map((d) => [d, 0]));
    const counts = new Map<NursingNclexDomain, number>(domains.map((d) => [d, 0]));

    for (const row of moduleProgress) {
      const domain = this.inferDomainFromModuleId(row.moduleId);
      scores.set(domain, (scores.get(domain) ?? 0) + Number(row.averageScore || row.progressPct || 0));
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    for (const row of simulationAttempts) {
      const domain = this.inferDomainFromModuleId(row.moduleId);
      scores.set(domain, (scores.get(domain) ?? 0) + Number(row.score || 0));
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    for (const row of assessmentAttempts) {
      const domain = this.inferDomainFromModuleId(row.moduleId);
      scores.set(domain, (scores.get(domain) ?? 0) + Number(row.score || 0));
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    for (const domain of domains) {
      const count = counts.get(domain) ?? 0;
      const total = scores.get(domain) ?? 0;
      scores.set(domain, count > 0 ? Math.round(total / count) : 0);
    }

    return scores;
  }

  private inferDomainFromModuleId(moduleId: string): NursingNclexDomain {
    const key = String(moduleId || '').toLowerCase();

    if (key.includes('fund')) return 'Fundamentals';
    if (key.includes('med') || key.includes('surg')) return 'Med-Surg';
    if (key.includes('pharma')) return 'Pharmacology';
    if (key.includes('pedia')) return 'Pediatrics';
    if (key.includes('mater')) return 'Maternity';
    if (key.includes('mental') || key.includes('psych')) return 'Mental Health';
    if (key.includes('leader') || key.includes('priorit')) return 'Leadership / Prioritization';

    return 'Fundamentals';
  }

  private humanizeModuleLabel(moduleId: string): string {
    const raw = String(moduleId || '').trim();
    if (!raw) return 'Readiness Exam';

    return raw
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private rankModuleAreas(
    modules: ProgramModule[],
    moduleProgress: UserModuleProgress[],
    simulationAttempts: UserSimulationAttempt[],
    assessmentAttempts: UserAssessmentAttempt[]
  ): Array<{ moduleId: string; score: number }> {
    const moduleIds = modules.length
      ? modules.map((module) => module.id)
      : [...new Set(moduleProgress.map((row) => row.moduleId))];

    return moduleIds
      .map((moduleId) => {
        const progressRow = moduleProgress.find((row) => row.moduleId === moduleId);
        const values: number[] = [];

        if (progressRow) {
          if (Number(progressRow.averageScore ?? 0) > 0) {
            values.push(Number(progressRow.averageScore ?? 0));
          } else if (Number(progressRow.progressPct ?? 0) > 0) {
            values.push(Number(progressRow.progressPct ?? 0));
          }
        }

        for (const row of simulationAttempts) {
          if (row.moduleId === moduleId && Number(row.score ?? 0) > 0) {
            values.push(Number(row.score ?? 0));
          }
        }

        for (const row of assessmentAttempts) {
          if (row.moduleId === moduleId && Number(row.score ?? 0) > 0) {
            values.push(Number(row.score ?? 0));
          }
        }

        const score = values.length
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : Number(progressRow?.progressPct ?? 0);

        return {
          moduleId,
          score,
        };
      })
      .filter((row) => row.moduleId)
      .sort((a, b) => a.score - b.score);
  }

  private resolveModuleAreaLabel(
    moduleId: string | undefined,
    moduleTitleById: Map<string, string>,
    fallback = 'No activity yet'
  ): string {
    const normalizedId = String(moduleId || '').trim();
    if (!normalizedId) {
      return fallback;
    }

    const title = String(moduleTitleById.get(normalizedId) || '').trim();
    return title || this.humanizeModuleLabel(normalizedId);
  }

  private buildRecommendedAction(input: {
    enrollment: ProgramEnrollment | undefined;
    readiness: number;
    weakestArea: string;
    recommendedNextModule: string;
    averageSimulationScore: number;
    caseStudyCompletionRate: number;
  }): string {
    if (!input.enrollment) {
      return 'Submit your enrollment request to unlock the full learning pathway.';
    }

    if (input.enrollment.status === ProgramEnrollmentStatus.PENDING) {
      return 'Enrollment pending: complete profile details and wait for review approval.';
    }

    if (input.enrollment.status === ProgramEnrollmentStatus.APPROVED) {
      return `Start with ${input.recommendedNextModule} and complete the onboarding diagnostic.`;
    }

    if (input.enrollment.status === ProgramEnrollmentStatus.CANCELLED || input.enrollment.status === ProgramEnrollmentStatus.REJECTED) {
      return 'Access is currently restricted. Contact support to reactivate your pathway.';
    }

    if (input.readiness < 55) {
      return `Focus on ${input.weakestArea}, then run one timed simulation and one readiness quiz.`;
    }

    if (input.averageSimulationScore < 65) {
      return 'Increase simulation frequency: complete 2 timed mocks this week and review mistakes.';
    }

    if (input.caseStudyCompletionRate < 60) {
      return 'Prioritize case studies to strengthen clinical reasoning before the next mock exam.';
    }

    return `Continue with ${input.recommendedNextModule} and target readiness above 80% this cycle.`;
  }

  private countDistinct(values: Array<string | undefined | null>): number {
    return new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)).size;
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
