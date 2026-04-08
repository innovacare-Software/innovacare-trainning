import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { LearnerDashboardService } from './learner-dashboard.service';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-learner-dashboard',
  imports: [RouterModule, CurrencyPipe, DatePipe],
  templateUrl: './learner-dashboard.html',
  styleUrl: './learner-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerDashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(LearnerDashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly activePopup = signal<'upsell' | 'reminder' | 'motivation' | null>(null);
  readonly examDaysLeft = signal(42);
  readonly currentMessage = signal(0);

  readonly motivationalMessages = [
    '🎯 You are closer than you think!',
    '🔥 Consistency beats perfection.',
    '⭐ Every module mastered is a step forward.',
    '💪 Champions study when no one is watching.',
    '🚀 Your NCLEX success story starts today!',
  ];

  readonly studyPlans = signal([
    { weeks: 3,  label: '3-Week Sprint',    desc: 'Intensive daily sessions — 4 hrs/day', color: '#ef4444' },
    { weeks: 4,  label: '4-Week Power Plan',desc: 'Focused & effective — 3 hrs/day',      color: '#f59e0b' },
    { weeks: 6,  label: '6-Week Balanced',  desc: 'Steady & sustainable — 2 hrs/day',     color: '#10b981' },
    { weeks: 12, label: '12-Week Mastery',  desc: 'Deep mastery — 1–1.5 hrs/day',         color: '#3b82f6' },
  ]);

  readonly currentUser = toSignal(this.authService.profile$, { initialValue: null });

  private readonly enrollments$ = this.dashboardService.getMyProgramEnrollments();
  readonly enrollments = toSignal(this.enrollments$, { initialValue: [] });

  private readonly liveSessions$ = this.enrollments$.pipe(
    switchMap(enrs => {
      const ids = enrs.map(e => e.programId);
      return this.dashboardService.getUpcomingLiveSessions(ids);
    })
  );
  readonly liveSessions = toSignal(this.liveSessions$, { initialValue: [] });
  readonly products = toSignal(this.dashboardService.getProductsForUpsell(), { initialValue: [] });
  readonly continueLearning = toSignal(this.dashboardService.getContinueLearning(), { initialValue: null });

  readonly progressPercent = computed(() => {
    const enrs = this.enrollments();
    if (!enrs.length) return 0;
    const completed = enrs.filter(e => e.status === 'completed').length;
    return Math.round((completed / enrs.length) * 100);
  });

  readonly greetingMessage = computed(() => {
    const hour = new Date().getHours();
    const name = this.currentUser()?.displayName?.split(' ')[0] ?? 'Learner';
    if (hour < 12) return `Good morning, ${name} ☀️`;
    if (hour < 17) return `Good afternoon, ${name} 🌤️`;
    return `Good evening, ${name} 🌙`;
  });

  readonly userInitials = computed(() => {
    const name = (this.currentUser()?.displayName ?? '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  });

  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private messageTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.resetInactivityTimer();
    this.startMessageRotation();
  }

  ngOnDestroy(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.messageTimer) clearInterval(this.messageTimer);
  }

  private startMessageRotation(): void {
    this.messageTimer = setInterval(() => {
      this.currentMessage.update(i => (i + 1) % this.motivationalMessages.length);
    }, 5_000);
  }

  resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      if (!this.activePopup()) this.showPopup('motivation');
    }, 3 * 60 * 1_000);
  }

  showPopup(type: 'upsell' | 'reminder' | 'motivation'): void {
    this.activePopup.set(type);
  }

  closePopup(): void {
    this.activePopup.set(null);
    this.resetInactivityTimer();
  }

  getInitials(name: string): string {
    if (!name?.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      active:    '#10b981',
      completed: '#3b82f6',
      pending:   '#f59e0b',
      approved:  '#10b981',
      confirmed: '#06b6d4',
      cancelled: '#ef4444',
      rejected:  '#ef4444',
    };
    return map[status] ?? '#6b7280';
  }

  formatSessionDate(date: unknown): string {
    if (!date) return 'TBD';
    const d = date instanceof Date
      ? date
      : new Date((date as any)?.seconds ? (date as any).seconds * 1_000 : (date as any));
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  navigateToProgram(programId: string): void {
    this.router.navigate(['/learner/programs', programId]);
  }

  selectStudyPlan(weeks: number): void {
    this.router.navigate(['/learner/calendar'], { queryParams: { plan: weeks } });
  }
}
