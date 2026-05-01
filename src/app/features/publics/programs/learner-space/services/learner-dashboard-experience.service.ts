import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { Order } from '../../../../../data/guest-commerce.model';
import { RewardWalletDoc } from '../../../../../data/models';
import { LanguageService } from '../../../../../core/language.service';
import {
  Program,
  ProgramLiveSession,
  ProgramLesson,
  ProgramModule,
  UserLessonProgress,
} from '../../program.models';
import { ProgramProgressService } from '../../program-progress.service';
import { ProgramsService } from '../../programs.service';
import { LearnerLessonsService } from './learner-lessons.service';
import { LearnerLiveSessionsService } from './learner-live-sessions.service';
import { LearnerModulesService } from './learner-modules.service';

export interface LearnerSessionCard {
  id: string;
  title: string;
  instructor: string;
  avatar: string;
  type: string;
  status: 'live' | 'upcoming' | 'recorded';
  startsAtLabel: string;
  actionLabel: string;
  actionLink: string | null;
}

export interface LearnerProductCard {
  id: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  originalPriceLabel?: string;
  badge?: string;
  features: string[];
  ctaLink: string[];
}

export interface LearnerStudyPlanCard {
  id: string;
  title: string;
  description: string;
  highlight: string;
  recommended: boolean;
  ctaLink: string[];
}

export interface LearnerContinueCard {
  title: string;
  moduleTitle: string;
  progressLabel: string;
  ctaLink: string[];
}

export interface LearnerExamPanel {
  status: 'Passed' | 'Upcoming' | 'In Progress';
  dateLabel: string;
  countdownLabel: string;
  countdownDays: number;
}

export interface LearnerDashboardExperience {
  userName: string;
  programTitle: string;
  heroMessage: string;
  motivationMessage: string;
  exam: LearnerExamPanel;
  continueLearning: LearnerContinueCard;
  liveSessions: LearnerSessionCard[];
  products: LearnerProductCard[];
  studyPlans: LearnerStudyPlanCard[];
  orders: Order[];
  selectedOrder?: Order;
  walletPoints: number;
}

@Injectable({ providedIn: 'root' })
export class LearnerDashboardExperienceService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly language = inject(LanguageService);
  private readonly programsService = inject(ProgramsService);
  private readonly progressService = inject(ProgramProgressService);
  private readonly lessonsService = inject(LearnerLessonsService);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly sessionsService = inject(LearnerLiveSessionsService);
  private readonly transloco = inject(TranslocoService);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  buildExperience(programId: string): Observable<LearnerDashboardExperience | null> {
    if (!programId?.trim()) {
      return of(null);
    }

    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) =>
        combineLatest([
          of(user),
          this.transloco.selectTranslation(),
          this.programsService.getProgramById(programId),
          this.progressService.buildDashboardStats(programId),
          this.modulesService.getModules(programId),
          this.lessonsService.getLessons(programId),
          this.lessonsService.getMyLessonProgress(programId),
          this.sessionsService.getSessions(programId),
          this.programsService.getPublishedPrograms(),
          this.getWallet(user?.uid),
          this.getOrders(user?.uid),
        ])
      ),
      map(([
        user,
        _lang,
        program,
        dashboard,
        modules,
        lessons,
        lessonProgress,
        sessions,
        catalog,
        wallet,
        orders,
      ]) => {
        if (!dashboard) {
          return null;
        }

        const exam = this.buildExamPanel(program, dashboard.enrollment?.completedAt, dashboard.stats.readinessScore);
        const continueLearning = this.buildContinueLearning(programId, modules, lessons, lessonProgress);
        const liveSessions = this.buildLiveSessions(sessions, programId);
        const products = this.buildProducts(program, catalog);
        const studyPlans = this.buildStudyPlans(exam.countdownDays, programId);

        const userName =
          user?.displayName?.trim() ||
          dashboard.enrollment?.learnerName?.trim() ||
          dashboard.enrollment?.learnerEmail?.split('@')[0] ||
          this.t('programs.learnerSpace.shell.defaultLearner');

        const readiness = dashboard.stats.readinessScore;

        return {
          userName,
          programTitle:
            dashboard.enrollment?.programTitle ||
            program?.title ||
            this.t('programs.learnerSpace.shell.defaultProgramTitle'),
          heroMessage: program?.category
            ? this.t('programs.learnerSpace.experience.readyForCategory', {
                readiness,
                category: program.category,
              })
            : this.t('programs.learnerSpace.experience.readyGeneric', { readiness }),
          motivationMessage:
            readiness >= 75
              ? this.t('programs.learnerSpace.experience.momentumStrong')
              : readiness >= 45
              ? this.t('programs.learnerSpace.experience.foundationBuilding')
              : this.t('programs.learnerSpace.experience.startSmall'),
          exam,
          continueLearning,
          liveSessions,
          products,
          studyPlans,
          orders,
          selectedOrder: orders[0],
          walletPoints: wallet?.totalPoints ?? 0,
        } satisfies LearnerDashboardExperience;
      })
    );
  }

  private getWallet(uid?: string): Observable<RewardWalletDoc | undefined> {
    if (!uid) {
      return of(undefined);
    }

    return this.inContext(
      () => docData(doc(this.firestore, `users/${uid}/wallet/main`)) as Observable<RewardWalletDoc | undefined>
    );
  }

  private getOrders(uid?: string): Observable<Order[]> {
    if (!uid) {
      return of([]);
    }

    const ref = collection(this.firestore, `users/${uid}/orders`);
    const q = query(ref, orderBy('createdAt', 'desc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<Order[]>);
  }

  private buildContinueLearning(
    programId: string,
    modules: ProgramModule[],
    lessons: ProgramLesson[],
    progressRows: UserLessonProgress[]
  ): LearnerContinueCard {
    const moduleOrder = new Map(modules.map((item, index) => [item.id, item.order ?? index]));
    const lessonById = new Map(lessons.map((item) => [item.id, item]));
    const moduleById = new Map(modules.map((item) => [item.id, item]));

    const orderedLessons = lessons.slice().sort((left, right) => {
      const leftModuleOrder = moduleOrder.get(left.moduleId) ?? Number.MAX_SAFE_INTEGER;
      const rightModuleOrder = moduleOrder.get(right.moduleId) ?? Number.MAX_SAFE_INTEGER;
      if (leftModuleOrder !== rightModuleOrder) {
        return leftModuleOrder - rightModuleOrder;
      }
      return (left.order ?? 0) - (right.order ?? 0);
    });

    const rankedProgress = progressRows
      .slice()
      .sort((left, right) => this.toEpoch(right.lastOpenedAt ?? right.completedAt) - this.toEpoch(left.lastOpenedAt ?? left.completedAt));

    const resumed = rankedProgress.find((row) => !row.completed && lessonById.has(row.lessonId));
    const resumedLesson = resumed ? lessonById.get(resumed.lessonId) : undefined;
    const firstIncomplete = orderedLessons.find((lesson) => {
      const row = progressRows.find((item) => item.lessonId === lesson.id);
      return !row?.completed;
    });
    const selectedLesson = resumedLesson || firstIncomplete || orderedLessons[0];
    const selectedModule = selectedLesson ? moduleById.get(selectedLesson.moduleId) : undefined;
    const selectedProgress = selectedLesson
      ? progressRows.find((row) => row.lessonId === selectedLesson.id)
      : undefined;

    return {
      title: selectedLesson?.title || this.t('programs.learnerSpace.experience.firstLesson'),
      moduleTitle: selectedModule?.title || this.t('programs.learnerSpace.experience.orientationModule'),
      progressLabel: selectedProgress?.completed
        ? this.t('programs.learnerSpace.experience.completedReviewAnytime')
        : this.t('programs.learnerSpace.experience.watchedPct', {
            value: Math.max(0, Math.min(100, Math.round(selectedProgress?.watchedPct ?? 0))),
          }),
      ctaLink: selectedLesson ? ['/my-programs', programId, 'lessons', selectedLesson.id] : ['/my-programs', programId, 'modules'],
    };
  }

  private buildLiveSessions(sessions: ProgramLiveSession[], programId: string): LearnerSessionCard[] {
    return sessions.slice(0, 3).map((session) => {
      const now = Date.now();
      const start = this.toDate(session.startAt)?.getTime() ?? now;
      const end = this.toDate(session.endAt)?.getTime() ?? start;
      const status: LearnerSessionCard['status'] = now >= start && now <= end ? 'live' : start > now ? 'upcoming' : 'recorded';

      return {
        id: session.id,
        title: session.title,
        instructor: session.instructorName || this.t('programs.learnerSpace.experience.defaultInstructor'),
        avatar: this.initials(session.instructorName || session.title),
        type: session.sessionType,
        status,
        startsAtLabel: this.formatDate(session.startAt),
        actionLabel:
          status === 'recorded'
            ? this.t('programs.learnerSpace.experience.reviewSchedule')
            : this.t('programs.learnerSpace.experience.openSchedule'),
        actionLink: `/my-programs/${programId}/live-sessions`,
      };
    });
  }

  private buildProducts(currentProgram: Program | undefined, catalog: Program[]): LearnerProductCard[] {
    const filtered = catalog
      .filter((item) => item.id !== currentProgram?.id)
      .sort((left, right) => {
        const leftScore = (left.category === currentProgram?.category ? 2 : 0) + (left.isFeatured ? 1 : 0);
        const rightScore = (right.category === currentProgram?.category ? 2 : 0) + (right.isFeatured ? 1 : 0);
        return rightScore - leftScore;
      })
      .slice(0, 3);

    return filtered.map((item, index) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle || item.durationText,
      priceLabel: this.currencyLabel(item.discountPrice ?? item.price, item.currency),
      originalPriceLabel: item.discountPrice != null ? this.currencyLabel(item.price, item.currency) : undefined,
      badge:
        index === 0
          ? this.t('programs.learnerSpace.experience.productRecommended')
          : item.isFeatured
          ? this.t('programs.learnerSpace.experience.productPopular')
          : undefined,
      features: [...(item.outcomes || []), ...(item.requirements || [])].filter(Boolean).slice(0, 3),
      ctaLink: ['/programs', item.id, 'enroll'],
    }));
  }

  private buildStudyPlans(countdownDays: number, programId: string): LearnerStudyPlanCard[] {
    const recommendedWeeks = countdownDays > 0 && countdownDays <= 21 ? 3 : countdownDays > 21 && countdownDays <= 56 ? 6 : 4;

    return [3, 4, 6, 12].map((weeks) => ({
      id: `${weeks}-weeks`,
      title: this.t('programs.learnerSpace.experience.planTitle', { weeks }),
      description:
        weeks <= 4
          ? this.t('programs.learnerSpace.experience.planDescriptionSprint')
          : weeks <= 6
          ? this.t('programs.learnerSpace.experience.planDescriptionBalanced')
          : this.t('programs.learnerSpace.experience.planDescriptionMastery'),
      highlight:
        weeks <= 4
          ? this.t('programs.learnerSpace.experience.planHighlightUrgent')
          : weeks === 6
          ? this.t('programs.learnerSpace.experience.planHighlightMost')
          : this.t('programs.learnerSpace.experience.planHighlightMastery'),
      recommended: weeks === recommendedWeeks,
      ctaLink: ['/my-programs', programId, 'study-calendar'],
    }));
  }

  private buildExamPanel(program: Program | undefined, completedAt: unknown, readinessScore: number): LearnerExamPanel {
    const targetDate = this.toDate(program?.endDate) || this.toDate(program?.startDate) || this.futureDate(readinessScore >= 70 ? 14 : 28);
    const diffDays = Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));

    if (completedAt) {
      return {
        status: 'Passed',
        dateLabel: this.formatDate(completedAt),
        countdownLabel: this.t('programs.learnerSpace.experience.examCompleted'),
        countdownDays: 0,
      };
    }

    return {
      status: diffDays <= 10 ? 'Upcoming' : 'In Progress',
      dateLabel: this.formatDate(targetDate),
      countdownLabel:
        diffDays <= 1
          ? this.t('programs.learnerSpace.experience.examTomorrow')
          : diffDays < 14
          ? this.t('programs.learnerSpace.experience.examDaysLeft', { count: diffDays })
          : this.t('programs.learnerSpace.experience.examWeeksLeft', { count: Math.ceil(diffDays / 7) }),
      countdownDays: diffDays,
    };
  }

  private currencyLabel(amount: number, currency: string): string {
    return new Intl.NumberFormat(this.localeTag(), {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  private futureDate(daysAhead: number): Date {
    return new Date(Date.now() + daysAhead * 86400000);
  }

  private formatDate(value: unknown): string {
    const date = this.toDate(value) ?? new Date();
    return new Intl.DateTimeFormat(this.localeTag(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private initials(input: string): string {
    return input
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      if ('toDate' in value) {
        return (value as { toDate(): Date }).toDate();
      }
      if ('seconds' in value) {
        return new Date(Number((value as { seconds: number }).seconds) * 1000);
      }
    }
    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toEpoch(value: unknown): number {
    return this.toDate(value)?.getTime() ?? 0;
  }

  private localeTag(): string {
    return this.transloco.getActiveLang() === 'fr' ? 'fr-CA' : 'en-US';
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.language.instant(key, params);
  }
}