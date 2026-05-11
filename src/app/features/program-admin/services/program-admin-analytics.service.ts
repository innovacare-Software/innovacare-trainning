import { Injectable, inject, Injector, runInInjectionContext, signal } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { catchError, combineLatest, filter, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import {
  CategoryBreakdownItem,
  EnrollmentStatusBreakdownItem,
  Program,
  ProgramAdminStatCards,
  ProgramEnrollment,
  ProgramEnrollmentStatus,
  ProgramStatus,
  UserProgramProgress,
} from '../shared/program-admin.models';
import { ProgramEnrollmentsAdminService } from './program-enrollments-admin.service';
import { ProgramsAdminService } from './programs-admin.service';
import { AuthService } from '../../../core/auth';
import { AccessCapabilitiesService } from '../../../core/access-capabilities.service';
import { OrgContextService } from '../../../core/organization/org-context.service';

@Injectable({ providedIn: 'root' })
export class ProgramAdminAnalyticsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly capabilities = inject(AccessCapabilitiesService);
  private readonly orgContext = inject(OrgContextService);
  private readonly programs = inject(ProgramsAdminService);
  private readonly enrollments = inject(ProgramEnrollmentsAdminService);
  readonly deniedScopes = signal<string[]>([]);

  private inContext<T>(factory: () => Observable<T>): Observable<T> {
    return runInInjectionContext(this.injector, factory);
  }

  private readonly canReadProgramAnalytics$ = combineLatest([
    this.auth.ready$,
    this.auth.profile$,
    this.orgContext.context$,
  ]).pipe(
    filter(([ready]) => ready),
    map(([_, profile, ctx]) => this.capabilities.canAccessProgramAdmin(profile, ctx)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly programs$ = this.programs.getAllProgramsForAdmin().pipe(
    catchError((error) => {
      this.logAccessError('programs', error);
      return of([] as Program[]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly enrollments$ = this.enrollments.getAllEnrollments().pipe(
    catchError((error) => {
      this.logAccessError('programEnrollments', error);
      return of([] as ProgramEnrollment[]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly progressRows$ = combineLatest([
    this.canReadProgramAnalytics$,
    this.enrollments$,
  ]).pipe(
    switchMap(([canRead, enrollments]) => {
      if (!canRead) {
        return of([] as UserProgramProgress[]);
      }

      const trackedPairs = [...new Map(
        enrollments
          .filter((row) => !!row.userId && !!row.programId)
          .map((row) => [`${row.userId}:${row.programId}`, row] as const)
      ).values()];

      if (!trackedPairs.length) {
        return of([] as UserProgramProgress[]);
      }

      return combineLatest(
        trackedPairs.map((row) =>
          this.inContext(
            () =>
              docData(
                doc(this.firestore, `users/${row.userId}/programProgress/${row.programId}`),
                { idField: 'id' }
              ) as Observable<UserProgramProgress | undefined>
          ).pipe(
            catchError((error) => {
              this.logAccessError(`users/${row.userId}/programProgress/${row.programId}`, error);
              return of(undefined);
            })
          )
        )
      ).pipe(
        map((rows) => rows.filter((row): row is UserProgramProgress => !!row))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getProgramAdminStats(): Observable<ProgramAdminStatCards> {
    return combineLatest([
      this.programs$,
      this.enrollments$,
      this.progressRows$,
    ]).pipe(
      map(([programs, enrollments, progressRows]) =>
        this.computeStatCards(programs, enrollments, progressRows)
      )
    );
  }

  getRecentPrograms(limitCount = 6): Observable<Program[]> {
    return this.programs$.pipe(
      map((rows) => rows.slice(0, Math.max(1, limitCount)))
    );
  }

  getRecentEnrollments(limitCount = 8): Observable<ProgramEnrollment[]> {
    return this.enrollments$.pipe(
      map((rows) => rows.slice(0, Math.max(1, limitCount)))
    );
  }

  getCategoryBreakdown(): Observable<CategoryBreakdownItem[]> {
    return this.programs$.pipe(
      map((programs) => {
        const mapByCategory = new Map<string, number>();
        for (const program of programs) {
          const key = program.category;
          mapByCategory.set(key, (mapByCategory.get(key) ?? 0) + 1);
        }

        return [...mapByCategory.entries()]
          .map(([category, count]) => ({ category: category as Program['category'], count }))
          .sort((a, b) => b.count - a.count);
      })
    );
  }

  getEnrollmentStatusBreakdown(): Observable<EnrollmentStatusBreakdownItem[]> {
    return this.enrollments$.pipe(
      map((rows) => {
        const byStatus = new Map<string, number>();
        for (const enrollment of rows) {
          const key = enrollment.status;
          byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
        }

        return [...byStatus.entries()]
          .map(([status, count]) => ({
            status: status as ProgramEnrollmentStatus,
            count,
          }))
          .sort((a, b) => b.count - a.count);
      })
    );
  }

  // Explicit alias matching requested contract.
  getProgramCategoryBreakdown(): Observable<CategoryBreakdownItem[]> {
    return this.getCategoryBreakdown();
  }

  private computeStatCards(
    programs: Program[],
    enrollments: ProgramEnrollment[],
    progressRows: UserProgramProgress[]
  ): ProgramAdminStatCards {
    const completedProgress = progressRows.filter((row) => row.status === 'completed').length;
    const avgReadiness =
      progressRows.length > 0
        ? progressRows.reduce((acc, row) => acc + this.resolveReadinessScore(row), 0) /
          progressRows.length
        : 0;

    const completionRate =
      enrollments.length > 0 ? (completedProgress / enrollments.length) * 100 : 0;

    return {
      totalPrograms: programs.length,
      activePrograms: programs.filter((p) => p.active).length,
      publishedPrograms: programs.filter((p) => p.status === ProgramStatus.PUBLISHED).length,
      pendingEnrollments: enrollments.filter((e) => e.status === ProgramEnrollmentStatus.PENDING)
        .length,
      activeLearners: enrollments.filter((e) => e.status === ProgramEnrollmentStatus.ACTIVE).length,
      completedLearners: enrollments.filter(
        (e) => e.status === ProgramEnrollmentStatus.COMPLETED
      ).length,
      averageReadinessScore: Number(avgReadiness.toFixed(1)),
      completionRate: Number(completionRate.toFixed(1)),
    };
  }

  private resolveReadinessScore(row: UserProgramProgress): number {
    const stored = Number(row.readinessScore || 0);
    if (stored > 0) {
      return stored;
    }

    const derived = Number(row.averageScore || 0) * 0.6 + Number(row.progressPct || 0) * 0.4;
    return Math.max(0, Math.min(100, Math.round(derived)));
  }

  private logAccessError(scope: string, error: unknown): void {
    this.deniedScopes.update((current) =>
      current.includes(scope) ? current : [...current, scope]
    );
    console.error('[ProgramAdminAnalyticsService] Firestore access failed', {
      scope,
      error,
      hint: 'Verify deployed firestore.rules and that the signed-in user has an explicit programAdmin/programStaff role or org-admin access.',
    });
  }
}
