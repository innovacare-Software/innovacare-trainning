import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  ProgramEnrollmentStatus,
} from './program.models';
import { ProgramProgressService } from './program-progress.service';

@Component({
  selector: 'app-user-program-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-program-dashboard.page.html',
  styleUrls: ['./user-program-dashboard.page.css'],
})
export class UserProgramDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly progressService = inject(ProgramProgressService);

  readonly vm = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || params.get('id') || ''),
      switchMap((programId) => this.progressService.buildDashboardStats(programId))
    ),
    {
      initialValue: {
        enrollment: undefined,
        progress: undefined,
        moduleProgress: [],
        simulationAttempts: [],
        assessmentAttempts: [],
        stats: {
          overallProgressPct: 0,
          readinessScore: 0,
          averageScore: 0,
          modulesCompleted: 0,
          simulationsCompleted: 0,
          caseStudiesCompleted: 0,
          totalStudyMinutes: 0,
          currentStreak: 0,
          weakestArea: 'Fundamentals',
          strongestArea: 'Med-Surg',
          recommendedNextModule: 'Fundamentals',
          recommendedNextAction: 'Complete your first module and take a readiness baseline test.',
          averageSimulationScore: 0,
          caseStudyCompletionRate: 0,
        },
      },
    }
  );

  readonly enrollmentStatusText = computed(() => {
    const status = this.vm().enrollment?.status;
    return status ? PROGRAM_ENROLLMENT_STATUS_LABELS[status] : 'Pending';
  });

  readonly enrollmentMessage = computed(() => {
    const status = this.vm().enrollment?.status;

    if (status === ProgramEnrollmentStatus.PENDING) {
      return 'Enrollment pending validation. Access is limited until admin approval.';
    }

    if (status === ProgramEnrollmentStatus.APPROVED || status === ProgramEnrollmentStatus.CONFIRMED) {
      return 'Enrollment approved. Activate your pathway to unlock full learning modules.';
    }

    if (status === ProgramEnrollmentStatus.ACTIVE) {
      return 'Learning pathway active. Continue modules, simulations, and case studies.';
    }

    if (status === ProgramEnrollmentStatus.COMPLETED) {
      return 'Program completed. Review your analytics and final readiness outcomes.';
    }

    if (status === ProgramEnrollmentStatus.CANCELLED || status === ProgramEnrollmentStatus.REJECTED) {
      return 'Enrollment is not active. Contact support for reactivation options.';
    }

    return 'Submit your enrollment to start this premium learning pathway.';
  });

  readonly moduleBars = computed(() =>
    this.vm().moduleProgress
      .slice()
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map((item) => ({
        label: item.moduleId,
        value: Math.max(0, Math.min(100, Math.round(Number(item.progressPct || 0)))),
      }))
  );

  readonly scoreTrend = computed(() => {
    const values = this.vm().assessmentAttempts
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((item) => Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))));

    return values.length ? values : [0, 0, 0, 0];
  });

  readonly simulationTrend = computed(() => {
    const values = this.vm().simulationAttempts
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((item) => Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))));

    return values.length ? values : [0, 0, 0, 0];
  });

  scorePolyline(values: number[]): string {
    const safe = values.length ? values : [0, 0, 0, 0];
    return safe
      .map((value, index) => {
        const x = safe.length === 1 ? 0 : (index / (safe.length - 1)) * 100;
        const y = 100 - value;
        return `${x},${y}`;
      })
      .join(' ');
  }

  private toEpoch(value: unknown): number {
    if (!value || typeof value !== 'object') {
      return 0;
    }

    if ('seconds' in (value as Record<string, unknown>)) {
      const seconds = Number((value as { seconds: number }).seconds);
      return Number.isFinite(seconds) ? seconds * 1000 : 0;
    }

    if ('toDate' in (value as Record<string, unknown>)) {
      const date = (value as { toDate: () => Date }).toDate();
      return date?.getTime?.() ?? 0;
    }

    return 0;
  }
}
