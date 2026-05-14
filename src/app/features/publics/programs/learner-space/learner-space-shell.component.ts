import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoService } from '@jsverse/transloco';
import { map, switchMap } from 'rxjs/operators';
import { LearnerDashboardExperienceService } from './services/learner-dashboard-experience.service';
import { LearnerPopupService } from './services/learner-popup.service';
import { OnboardingTriggerComponent } from '../../../../shared/onboarding/onboarding-trigger.component';
import { NotificationBellPlainComponent } from '../../../../shared/components/notifications/notification-bell-plain/notification-bell-plain';
import { AuthService, type AppRole } from '../../../../core/auth';
import { LanguageService } from '../../../../core/language.service';

@Component({
  selector: 'app-learner-space-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, OnboardingTriggerComponent, NotificationBellPlainComponent],
  templateUrl: './learner-space-shell.component.html',
  styleUrls: ['./learner-space-shell.component.css'],
})
export class LearnerSpaceShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly experienceService = inject(LearnerDashboardExperienceService);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  readonly popup = inject(LearnerPopupService);

  readonly isMobile = signal(false);
  readonly sidebarOpen = signal(true);

  private desktopSidebarOpen = true;

  constructor() {
    this.syncViewportState();
  }

  private readonly programId$ = this.route.paramMap.pipe(
    map((p) => p.get('programId') || '')
  );

  readonly programId = toSignal(this.programId$, { initialValue: '' });
  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  private readonly activeTranslation = toSignal(this.transloco.selectTranslation(), {
    initialValue: null,
  });

  readonly experience = toSignal(
    this.programId$.pipe(switchMap((id) => this.experienceService.buildExperience(id))),
    { initialValue: null }
  );

  readonly profileName = computed(
    () => this.profile()?.displayName?.trim() || this.experience()?.userName || this.t('programs.learnerSpace.shell.defaultLearner')
  );

  readonly profileInitials = computed(() => {
    const parts = this.profileName().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return 'IC';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  readonly greeting = computed(() => {
    const firstName = this.profileName().split(/\s+/).filter(Boolean)[0] || this.t('programs.learnerSpace.shell.defaultLearner');
    return this.t('programs.learnerSpace.shell.greeting', { name: firstName });
  });

  readonly appbarTitle = computed(
    () => this.experience()?.programTitle || this.t('programs.learnerSpace.shell.defaultTitle')
  );

  readonly appbarAnnouncement = computed(() => {
    const experience = this.experience();
    if (!experience) {
      return this.t('programs.learnerSpace.shell.defaultAnnouncement');
    }
    if (experience.exam.status === 'Passed') {
      return this.t('programs.learnerSpace.shell.completedAnnouncement');
    }
    return this.t('programs.learnerSpace.shell.progressAnnouncement', {
      countdown: experience.exam.countdownLabel,
      lesson: experience.continueLearning.title,
    });
  });

  readonly profileLink = computed(() => {
    switch (this.profileRole()) {
      case 'guest':
        return '/guest/profile';
      case 'learner':
        return '/learner/profile';
      default:
        return '/my-programs';
    }
  });

  readonly progressPct = computed(() => {
    const progressLabel = this.experience()?.continueLearning?.progressLabel ?? '';
    return progressLabel.includes('%') ? Number.parseInt(progressLabel, 10) || 0 : 0;
  });

  readonly navItems = computed(() => {
    const experience = this.experience();
    const liveSessions = experience?.liveSessions ?? [];
    const upcomingSessions = liveSessions.filter((item) => item.status !== 'recorded');
    const orders = experience?.orders ?? [];
    const products = experience?.products ?? [];
    const pid = this.programId();
    const ptitle = experience?.programTitle || '';
    const assistantQp: Record<string, string> = {};
    if (pid) assistantQp['programId'] = pid;
    if (ptitle) assistantQp['programTitle'] = ptitle;

    return [
      { route: 'dashboard', label: this.t('nav.dashboard'), icon: 'space_dashboard', exact: true, badge: undefined as string | undefined, queryParams: undefined as Record<string, string> | undefined },
      { route: 'modules', label: this.t('programs.learnerSpace.shell.nav.modules'), icon: 'library_books', exact: false, badge: undefined, queryParams: undefined },
      { route: 'videos', label: this.t('programs.learnerSpace.shell.nav.videoLibrary'), icon: 'smart_display', exact: false, badge: undefined, queryParams: undefined },
      { route: 'live-sessions', label: this.t('programs.learnerSpace.shell.nav.liveSessions'), icon: 'live_tv', exact: false, badge: upcomingSessions.length ? String(upcomingSessions.length) : undefined, queryParams: undefined },
      { route: 'assessments', label: this.t('programs.learnerSpace.shell.nav.assessments'), icon: 'quiz', exact: false, badge: undefined, queryParams: undefined },
      { route: 'documents', label: this.t('programs.learnerSpace.shell.nav.documents'), icon: 'description', exact: false, badge: undefined, queryParams: undefined },
      { route: 'exam-prep', label: this.t('programs.learnerSpace.shell.nav.examPrep'), icon: 'school', exact: false, badge: undefined, queryParams: undefined },
      { route: 'simulations', label: this.t('programs.learnerSpace.shell.nav.simulations'), icon: 'monitor_heart', exact: false, badge: undefined, queryParams: undefined },
      { route: 'case-studies', label: this.t('programs.learnerSpace.shell.nav.caseStudies'), icon: 'assignment', exact: false, badge: undefined, queryParams: undefined },
      { route: 'study-calendar', label: this.t('programs.learnerSpace.shell.nav.studyCalendar'), icon: 'calendar_month', exact: false, badge: undefined, queryParams: undefined },
      { route: 'assistant', label: this.t('nav.aiAssistant'), icon: 'smart_toy', exact: false, badge: undefined, queryParams: assistantQp },
      { route: 'wallet', label: this.t('programs.learnerSpace.shell.wallet'), icon: 'account_balance_wallet', exact: false, badge: experience?.walletPoints ? String(experience.walletPoints) : undefined, queryParams: undefined },
      { route: 'order-history', label: this.t('programs.learnerSpace.shell.nav.orderHistory'), icon: 'receipt_long', exact: false, badge: orders.length ? String(orders.length) : undefined, queryParams: undefined },
      { route: 'explore-products', label: this.t('programs.learnerSpace.shell.nav.exploreProducts'), icon: 'shopping_bag', exact: false, badge: products.length ? this.t('programs.learnerSpace.shell.nav.newBadge') : undefined, queryParams: undefined },
    ];
  });

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobile() && this.sidebarOpen()) {
      this.closeSidebar();
    }
  }

  toggleSidebar(): void {
    const nextValue = !this.sidebarOpen();
    this.sidebarOpen.set(nextValue);

    if (!this.isMobile()) {
      this.desktopSidebarOpen = nextValue;
    }
  }

  openSidebar(): void {
    this.sidebarOpen.set(true);
    if (!this.isMobile()) {
      this.desktopSidebarOpen = true;
    }
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
    if (!this.isMobile()) {
      this.desktopSidebarOpen = false;
    }
  }

  onNavItemActivated(): void {
    if (this.isMobile()) {
      this.closeSidebar();
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  profileRole(): AppRole {
    return this.profile()?.role ?? this.profile()?.primaryRole ?? 'programLearner';
  }

  async executePopupCta(): Promise<void> {
    const current = this.popup.current();
    if (!current?.cta) {
      return;
    }

    if (current.cta.action) {
      current.cta.action();
      this.popup.dismiss();
      return;
    }

    if (current.cta.link) {
      await this.router.navigateByUrl(current.cta.link);
      this.popup.dismiss();
    }
  }

  private syncViewportState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const mobile = window.innerWidth <= 960;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);

    if (mobile !== wasMobile) {
      this.sidebarOpen.set(mobile ? false : this.desktopSidebarOpen);
      return;
    }

    if (!mobile) {
      this.sidebarOpen.set(this.desktopSidebarOpen);
    }
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

  t(key: string, params?: Record<string, unknown>): string {
    this.activeTranslation();
    return this.language.instant(key, params);
  }
}
