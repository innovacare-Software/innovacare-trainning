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
  ProgramDashboardViewModel,
  ProgramEnrollment,
  ProgramCategory,
  ProgramEnrollmentStatus,
  ProgressStatus,
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

  buildDashboardStats(programId: string): Observable<ProgramDashboardViewModel> {
    return combineLatest([
      this.enrollments.getMyEnrollments(),
      this.getUserProgramProgress(programId),
      this.getUserModuleProgress(programId),
      this.getUserSimulationAttempts(programId),
      this.getUserAssessmentAttempts(programId),
    ]).pipe(
      map(([enrollments, progress, moduleProgress, simulationAttempts, assessmentAttempts]) => {
        const enrollment = enrollments.find((e) => e.programId === programId);
        const stats = this.computeProgressStats(
          enrollment,
          progress,
          moduleProgress,
          simulationAttempts,
          assessmentAttempts
        );

        return {
          enrollment,
          progress,
          moduleProgress,
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
    moduleProgress: UserModuleProgress[],
    simulationAttempts: UserSimulationAttempt[],
    assessmentAttempts: UserAssessmentAttempt[]
  ): DashboardStatCards {
    const isNursingNclexTrack =
      enrollment?.category === ProgramCategory.NURSING_PREP ||
      enrollment?.category === ProgramCategory.NCLEX ||
      enrollment?.category === ProgramCategory.CANADA_NCLEX;

    const averageSimulationScore =
      simulationAttempts.length > 0
        ? Math.round(
            simulationAttempts.reduce((sum, row) => sum + Number(row.score || 0), 0) /
              simulationAttempts.length
          )
        : 0;

    const domainScores = this.buildDomainScores(moduleProgress, simulationAttempts, assessmentAttempts);
    const rankedDomains = [...domainScores.entries()].sort((a, b) => a[1] - b[1]);

    const weakestDomain = rankedDomains[0]?.[0] ?? 'Fundamentals';
    const strongestDomain = rankedDomains[rankedDomains.length - 1]?.[0] ?? 'Med-Surg';

    const moduleRank = [...moduleProgress].sort((a, b) => a.progressPct - b.progressPct);
    const weakestArea = isNursingNclexTrack ? weakestDomain : moduleRank[0]?.moduleId ?? 'Fundamentals';
    const strongestArea = isNursingNclexTrack
      ? strongestDomain
      : moduleRank[moduleRank.length - 1]?.moduleId ?? 'Med-Surg';

    const firstIncomplete = moduleProgress.find((m) => m.progressPct < 100);
    const recommendedNextModule = firstIncomplete
      ? this.humanizeModuleLabel(firstIncomplete.moduleId)
      : 'Readiness Exam';
    const readiness = this.computeReadinessScore(
      Number(progress?.averageScore ?? 0),
      Number(progress?.progressPct ?? 0),
      simulationAttempts,
      Number(progress?.streakDays ?? 0)
    );

    const caseStudyCompletionRate =
      Number(progress?.totalCaseStudies ?? 0) > 0
        ? Math.round(
            ((Number(progress?.completedCaseStudies ?? 0) / Number(progress?.totalCaseStudies ?? 1)) *
              100)
          )
        : 0;

    const fallbackStatus =
      enrollment?.status === ProgramEnrollmentStatus.ACTIVE
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;

    const recommendedNextAction = this.buildRecommendedAction({
      enrollment,
      readiness,
      weakestArea,
      recommendedNextModule,
      averageSimulationScore,
      caseStudyCompletionRate,
    });

    return {
      overallProgressPct: Number(progress?.progressPct ?? 0),
      readinessScore: Number(progress?.readinessScore ?? readiness),
      averageScore: Number(progress?.averageScore ?? 0),
      modulesCompleted: Number(progress?.completedModules ?? 0),
      simulationsCompleted: Number(progress?.completedSimulations ?? 0),
      caseStudiesCompleted: Number(progress?.completedCaseStudies ?? 0),
      totalStudyMinutes: Number(progress?.totalStudyMinutes ?? 0),
      currentStreak: Number(progress?.streakDays ?? 0),
      weakestArea,
      strongestArea,
      recommendedNextModule,
      recommendedNextAction,
      averageSimulationScore,
      caseStudyCompletionRate,
    };
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
}
