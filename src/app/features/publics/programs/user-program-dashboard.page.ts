import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  ProgramEnrollmentStatus,
} from './program.models';
import { ProgramProgressService } from './program-progress.service';
import { CustomTestBuilderDialog } from './learner-space/dashboard/custom-test-builder.dialog';

@Component({
  selector: 'app-user-program-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-program-dashboard.page.html',
  styleUrls: ['./user-program-dashboard.page.css'],
})
export class UserProgramDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly progressService = inject(ProgramProgressService);

  readonly programId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || params.get('id') || '')
    ),
    { initialValue: '' }
  );

  readonly vm = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || params.get('id') || ''),
      switchMap((programId) => this.progressService.buildDashboardStats(programId))
    ),
    {
      initialValue: {
        enrollment: undefined,
        progress: undefined,
        modules: [],
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
          weakestArea: 'No focus area yet',
          strongestArea: 'No focus area yet',
          recommendedNextModule: 'Start your first module',
          recommendedNextAction: 'Complete your first module and take a readiness baseline test.',
          averageSimulationScore: 0,
          caseStudyCompletionRate: 0,
        },
      },
    }
  );

  readonly enrollmentStatusText = computed(() => {
    const status = this.vm()?.enrollment?.status;
    return status ? PROGRAM_ENROLLMENT_STATUS_LABELS[status] : 'Pending';
  });

  readonly enrollmentMessage = computed(() => {
    const status = this.vm()?.enrollment?.status;

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
    (this.vm()?.moduleProgress || [])
      .slice()
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map((item) => ({
        label: item.moduleId,
        value: Math.max(0, Math.min(100, Math.round(Number(item.progressPct || 0)))),
      }))
  );

  readonly scoreTrend = computed(() => {
    const values = (this.vm()?.assessmentAttempts || [])
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((item) => Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))));

    return values.length ? values : [0, 0, 0, 0];
  });

  readonly simulationTrend = computed(() => {
    const values = (this.vm()?.simulationAttempts || [])
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((item) => Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))));

    return values.length ? values : [0, 0, 0, 0];
  });

  readonly learningSections = computed(() => {
    const programId = this.programId();
    const stats = this.vm()?.stats ?? {
      overallProgressPct: 0,
      readinessScore: 0,
      averageScore: 0,
      modulesCompleted: 0,
      simulationsCompleted: 0,
      caseStudiesCompleted: 0,
      totalStudyMinutes: 0,
      currentStreak: 0,
      weakestArea: 'No focus area yet',
      strongestArea: 'No focus area yet',
      recommendedNextModule: 'Start your first module',
      recommendedNextAction: 'Complete your first module and take a readiness baseline test.',
      averageSimulationScore: 0,
      caseStudyCompletionRate: 0,
    };

    return [
      {
        title: 'Learner dashboard',
        description: 'Open the guided workspace with your live progress and current study plan.',
        metric: `${stats.readinessScore}% readiness`,
        route: this.learnerRoute(programId, 'dashboard'),
        tone: 'sea',
      },
      {
        title: 'Modules',
        description: 'Continue your modules and lessons in the recommended learning order.',
        metric: `${stats.modulesCompleted} completed`,
        route: this.learnerRoute(programId, 'modules'),
        tone: 'forest',
      },
      {
        title: 'Assessments',
        description: 'Review your quizzes and track score evolution across evaluation sessions.',
        metric: `${stats.averageScore}% average`,
        route: this.learnerRoute(programId, 'assessments'),
        tone: 'ink',
      },
      {
        title: 'Simulations',
        description: 'Practice timed scenarios and benchmark yourself against readiness targets.',
        metric: `${stats.simulationsCompleted} attempts`,
        route: this.learnerRoute(programId, 'simulations'),
        tone: 'copper',
      },
      {
        title: 'Case studies',
        description: 'Work on clinical reasoning and applied decision-making case by case.',
        metric: `${stats.caseStudiesCompleted} completed`,
        route: this.learnerRoute(programId, 'case-studies'),
        tone: 'sand',
      },
      {
        title: 'Documents and live sessions',
        description: 'Access supporting files, schedules, resources, and instructor touchpoints.',
        metric: `${stats.currentStreak} day streak`,
        route: this.learnerRoute(programId, 'documents'),
        secondaryRoute: this.learnerRoute(programId, 'live-sessions'),
        secondaryLabel: 'Open live sessions',
        tone: 'plum',
      },
    ];
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

  formatStudyTime(minutes: number): string {
    if (minutes >= 120) {
      return `${Math.round(minutes / 60)} h`;
    }

    if (minutes >= 60) {
      return `${(minutes / 60).toFixed(1)} h`;
    }

    return `${minutes} min`;
  }

  private learnerRoute(programId: string, segment: string): string[] {
    return programId ? ['/my-programs', programId, segment] : ['/my-programs'];
  }

  protected formatModuleLabel(value: string): string {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async openCustomTestBuilder(): Promise<void> {
    const programId = this.programId();
    if (!programId) {
      return;
    }

    const dialogRef = this.dialog.open(CustomTestBuilderDialog, {
      width: '760px',
      maxWidth: 'calc(100vw - 1rem)',
      panelClass: 'ld-custom-test-dialog',
      data: { programId },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result || typeof result !== 'object' || !result.assessmentId) {
      return;
    }

    await this.router.navigate(['/my-programs', programId, 'exam-prep', result.assessmentId]);
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
