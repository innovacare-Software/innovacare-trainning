import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collectionGroup, collectionData } from '@angular/fire/firestore';
import { combineLatest, map, Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class ProgramAdminAnalyticsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly programs = inject(ProgramsAdminService);
  private readonly enrollments = inject(ProgramEnrollmentsAdminService);

  private inContext<T>(factory: () => Observable<T>): Observable<T> {
    return runInInjectionContext(this.injector, factory);
  }

  private readonly progressRows$ = this.inContext(
    () =>
      collectionData(collectionGroup(this.firestore, 'programProgress'), {
        idField: 'id',
      }) as Observable<UserProgramProgress[]>
  );

  getProgramAdminStats(): Observable<ProgramAdminStatCards> {
    return combineLatest([
      this.programs.getAllProgramsForAdmin(),
      this.enrollments.getAllEnrollments(),
      this.progressRows$,
    ]).pipe(
      map(([programs, enrollments, progressRows]) =>
        this.computeStatCards(programs, enrollments, progressRows)
      )
    );
  }

  getRecentPrograms(limitCount = 6): Observable<Program[]> {
    return this.programs.getAllProgramsForAdmin().pipe(
      map((rows) => rows.slice(0, Math.max(1, limitCount)))
    );
  }

  getRecentEnrollments(limitCount = 8): Observable<ProgramEnrollment[]> {
    return this.enrollments.getAllEnrollments().pipe(
      map((rows) => rows.slice(0, Math.max(1, limitCount)))
    );
  }

  getCategoryBreakdown(): Observable<CategoryBreakdownItem[]> {
    return this.programs.getAllProgramsForAdmin().pipe(
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
    return this.enrollments.getAllEnrollments().pipe(
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
        ? progressRows.reduce((acc, row) => acc + Number(row.readinessScore || 0), 0) /
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
}
