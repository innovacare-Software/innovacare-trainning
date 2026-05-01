import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  ProgramEnrollmentStatus,
} from '../../program.models';
import {
  LearnerDashboardExperienceService,
  LearnerSessionCard,
} from '../services/learner-dashboard-experience.service';
import { LanguageService } from '../../../../../core/language.service';
import { LearnerPopupService } from '../services/learner-popup.service';
import { ProgramProgressService } from '../../program-progress.service';
import { CustomTestBuilderDialog } from './custom-test-builder.dialog';

@Component({
  selector: 'app-learner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './learner-dashboard.page.html',
  styleUrls: ['./learner-dashboard.page.css'],
})
export class LearnerDashboardPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly progressService = inject(ProgramProgressService);
  private readonly experienceService = inject(LearnerDashboardExperienceService);
  private readonly language = inject(LanguageService);
  private readonly popup = inject(LearnerPopupService);
  private readonly transloco = inject(TranslocoService);

  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private readonly hasShownMotivation = signal(false);
  private readonly hasShownReminder = signal(false);
  private readonly hasShownUpsell = signal(false);

  readonly selectedOrderId = signal<string | null>(null);
  private readonly activeTranslation = toSignal(this.transloco.selectTranslation(), {
    initialValue: null,
  });

  private readonly programId$ = this.route.parent!.paramMap.pipe(
    map((params) => params.get('programId') || '')
  );

  readonly programId = toSignal(this.programId$, { initialValue: '' });

  readonly vm = toSignal(
    this.route.parent!.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((id) => this.progressService.buildDashboardStats(id))
    ),
    {
      initialValue: undefined,
    }
  );

  readonly experience = toSignal(
    this.programId$.pipe(switchMap((id) => this.experienceService.buildExperience(id))),
    { initialValue: null }
  );

  readonly enrollmentStatusText = computed(() => {
    const status = this.vm()?.enrollment?.status;
    return this.programEnrollmentStatusLabel(status);
  });

  readonly enrollmentMessage = computed(() => {
    const status = this.vm()?.enrollment?.status;
    if (status === ProgramEnrollmentStatus.ACTIVE) return this.t('programs.learnerSpace.dashboard.enrollmentActive');
    if (status === ProgramEnrollmentStatus.COMPLETED) return this.t('programs.learnerSpace.dashboard.enrollmentCompleted');
    if (status === ProgramEnrollmentStatus.PENDING) return this.t('programs.learnerSpace.dashboard.enrollmentPending');
    return this.t('programs.learnerSpace.dashboard.enrollmentContinue');
  });

  readonly ringDash = computed(() => {
    const pct = this.vm()?.stats?.readinessScore ?? 0;
    const circ = 2 * Math.PI * 52;
    return `${(pct / 100) * circ} ${circ}`;
  });

  readonly kpis = computed(() => {
    const s = this.vm()?.stats;
    if (!s) return [];
    return [
      { icon: 'trending_up', value: s.overallProgressPct + '%', label: 'Overall', emoji: '📈', tip: 'Overall lesson completion across your active program.' },
      { icon: 'inventory_2', value: s.modulesCompleted + '', label: 'Modules Done', emoji: '🧩', tip: 'Modules fully completed from your current learning path.' },
      { icon: 'science', value: s.simulationsCompleted + '', label: 'Simulations', emoji: '🧪', tip: 'Unique simulations you have already finished.' },
      { icon: 'assignment', value: s.caseStudiesCompleted + '', label: 'Case Studies', emoji: '📝', tip: 'Case studies completed and counted in your training flow.' },
      { icon: 'schedule', value: s.totalStudyMinutes + ' min', label: 'Study Time', emoji: '⏱️', tip: 'Tracked practice time from timed study experiences.' },
      { icon: 'local_fire_department', value: s.currentStreak + ' days', label: 'Streak', emoji: '🔥', tip: 'Consecutive active days recorded in your learning activity.' },
      { icon: 'track_changes', value: s.averageScore + '%', label: 'Avg Score', emoji: '🎯', tip: 'Average score across completed assessments.' },
      { icon: 'neurology', value: s.averageSimulationScore + '%', label: 'Sim Score', emoji: '🧠', tip: 'Average performance inside simulation exercises.' },
    ];
  });

  readonly moduleBars = computed(() =>
    (() => {
      const vm = this.vm();
      const moduleTitleById = new Map((vm?.modules || []).map((module) => [module.id, module.title]));

      return (vm?.moduleProgress || [])
      .slice()
      .sort((a, b) => {
        const leftTitle = moduleTitleById.get(a.moduleId) || a.moduleId;
        const rightTitle = moduleTitleById.get(b.moduleId) || b.moduleId;
        return leftTitle.localeCompare(rightTitle);
      })
      .map((m) => ({
        label: moduleTitleById.get(m.moduleId) || this.formatModuleLabel(m.moduleId),
        value: Math.max(0, Math.min(100, Math.round(Number(m.progressPct || 0)))),
        emoji: Number(m.progressPct || 0) >= 100 ? '✅' : Number(m.progressPct || 0) > 0 ? '🚀' : '🌱',
        tip: `${moduleTitleById.get(m.moduleId) || this.formatModuleLabel(m.moduleId)}: ${Math.max(0, Math.min(100, Math.round(Number(m.progressPct || 0))))}% completion for this module.`,
      }));
    })()
  );

  readonly scoreTrend = computed(() => {
    const attempts = (this.vm()?.assessmentAttempts || [])
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((a) => Math.max(0, Math.min(100, Math.round(Number(a.score || 0)))));

    if (attempts.length < 2) return { line: '', area: '', points: [] as { x: number; y: number }[] };

    const W = 400, H = 160, pad = 12;
    const stepX = (W - 2 * pad) / (attempts.length - 1);
    const pts = attempts.map((val, i) => ({
      x: pad + i * stepX,
      y: H - pad - ((val / 100) * (H - 2 * pad)),
    }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const area = `${pad},${H - pad} ${line} ${pts[pts.length - 1].x},${H - pad}`;
    return { line, area, points: pts };
  });

  readonly selectedOrder = computed(() => {
    const orders = this.experience()?.orders ?? [];
    if (!orders.length) {
      return undefined;
    }

    const experience = this.experience();
    return orders.find((order) => order.id === this.selectedOrderId()) || experience?.selectedOrder;
  });

  constructor() {
    effect(() => {
      const experience = this.experience();
      const stats = this.vm()?.stats;

      if (experience?.selectedOrder?.id && !this.selectedOrderId()) {
        this.selectedOrderId.set(experience.selectedOrder.id);
      }

      if (stats && !this.hasShownMotivation() && stats.readinessScore >= 35) {
        this.hasShownMotivation.set(true);
        queueMicrotask(() => this.popup.showMotivation(stats.readinessScore));
      }

      if (experience && !this.hasShownReminder() && experience.exam.status !== 'Passed' && experience.exam.countdownDays > 0 && experience.exam.countdownDays <= 10) {
        this.hasShownReminder.set(true);
        queueMicrotask(() => this.popup.showStudyReminder());
      }
    });
  }

  ngOnInit(): void {
    this.resetInactivityTimer();
    window.addEventListener('mousemove', this.resetInactivityTimer, { passive: true });
    window.addEventListener('keydown', this.resetInactivityTimer, { passive: true });
    window.addEventListener('click', this.resetInactivityTimer, { passive: true });
  }

  ngOnDestroy(): void {
    clearTimeout(this.inactivityTimer);
    window.removeEventListener('mousemove', this.resetInactivityTimer);
    window.removeEventListener('keydown', this.resetInactivityTimer);
    window.removeEventListener('click', this.resetInactivityTimer);
  }

  selectOrder(orderId?: string): void {
    this.selectedOrderId.set(orderId || null);
  }

  formatModuleLabel(value: string): string {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatOrderAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat(this.localeTag(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  formatOrderDate(value: unknown): string {
    const date = this.toDate(value);
    return date
      ? new Intl.DateTimeFormat(this.localeTag(), { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
      : this.t('programs.learnerSpace.dashboard.pendingDate');
  }

  orderStatusLabel(status?: string): string {
    return this.localizedValue('programs.learnerSpace.orderStatuses', status, this.t('programs.learnerSpace.statuses.pending'));
  }

  orderItemTypeLabel(value?: string): string {
    return this.localizedValue('programs.learnerSpace.orderTypes', value, '');
  }

  sessionBadge(session: LearnerSessionCard): string {
    if (session.status === 'live') {
      return this.t('programs.learnerSpace.dashboard.joinNow');
    }
    if (session.status === 'upcoming') {
      return this.t('programs.learnerSpace.dashboard.reserveSeat');
    }
    return this.t('programs.learnerSpace.dashboard.replayAvailable');
  }

  translateExamStatus(status: 'Passed' | 'Upcoming' | 'In Progress'): string {
    if (status === 'Passed') {
      return this.t('programs.learnerSpace.experience.examPassed');
    }
    if (status === 'Upcoming') {
      return this.t('programs.learnerSpace.experience.examUpcoming');
    }
    return this.t('programs.learnerSpace.experience.examInProgress');
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

    await this.router.navigate(['../exam-prep', result.assessmentId], { relativeTo: this.route });
  }

  private readonly resetInactivityTimer = () => {
    clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      if (this.hasShownUpsell()) {
        return;
      }

      const product = this.experience()?.products[0];
      if (!product) {
        return;
      }

      this.hasShownUpsell.set(true);
      this.popup.showUpsell(product.title, this.t('programs.learnerSpace.dashboard.upsellMessage', { title: product.title }));
    }, 45000);
  };

  private toDate(val: unknown): Date | null {
    if (!val) return null;
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate();
    }
    if (val instanceof Date) return val;
    const parsed = new Date(val as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toEpoch(val: unknown): number {
    return this.toDate(val)?.getTime() ?? 0;
  }

  private localeTag(): string {
    return this.transloco.getActiveLang() === 'fr' ? 'fr-CA' : 'en-US';
  }

  private programEnrollmentStatusLabel(status?: ProgramEnrollmentStatus): string {
    switch (status) {
      case ProgramEnrollmentStatus.APPROVED:
        return this.t('programs.learnerSpace.statuses.approved');
      case ProgramEnrollmentStatus.CONFIRMED:
        return this.t('programs.learnerSpace.statuses.confirmed');
      case ProgramEnrollmentStatus.ACTIVE:
        return this.t('programs.learnerSpace.statuses.active');
      case ProgramEnrollmentStatus.COMPLETED:
        return this.t('programs.learnerSpace.statuses.completed');
      case ProgramEnrollmentStatus.CANCELLED:
        return this.t('programs.learnerSpace.statuses.cancelled');
      case ProgramEnrollmentStatus.REJECTED:
        return this.t('programs.learnerSpace.statuses.rejected');
      case ProgramEnrollmentStatus.PENDING:
      default:
        return this.t('programs.learnerSpace.statuses.pending');
    }
  }

  private localizedValue(prefix: string, value: string | undefined, fallback: string): string {
    const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!normalized) {
      return fallback;
    }

    const key = `${prefix}.${normalized}`;
    const localized = this.t(key);
    if (localized !== key) {
      return localized;
    }

    return value!
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  t(key: string, params?: Record<string, unknown>): string {
    this.activeTranslation();
    return this.language.instant(key, params);
  }
}
