import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Organization, OrganizationDashboardStats } from '../org.models';
import { OrganizationAdminDashboardService } from './organization-admin-dashboard.service';
import { OrganizationHierarchyService } from './organization-hierarchy.service';

export interface RegionRollupRow {
  org: Organization;
  stats: OrganizationDashboardStats;
}

export interface CouncilRollup {
  regions: RegionRollupRow[];
  totals: {
    regionCount: number;
    totalUsers: number;
    activeLearners: number;
    completedLearners: number;
    overdueCount: number;
    criticalAuditEvents: number;
  };
  /** Unweighted average across regions — a fair "how are we doing overall" number regardless of region size. */
  averageCompletionRate: number;
}

const EMPTY_ROLLUP: CouncilRollup = {
  regions: [],
  totals: {
    regionCount: 0,
    totalUsers: 0,
    activeLearners: 0,
    completedLearners: 0,
    overdueCount: 0,
    criticalAuditEvents: 0,
  },
  averageCompletionRate: 0,
};

/**
 * Aggregates OrganizationDashboardStats across a council's direct regions.
 * Reads fan out live per region — fine at the ~10-region scale this design
 * targets (see docs/organization-architecture.md §10); switch to a
 * scheduled Cloud Function pre-aggregate if a council ever grows past
 * ~30-50 regions.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationCouncilRollupService {
  private readonly hierarchy = inject(OrganizationHierarchyService);
  private readonly dashboard = inject(OrganizationAdminDashboardService);

  rollup(councilOrgId: string): Observable<CouncilRollup> {
    if (!councilOrgId?.trim()) {
      return of(EMPTY_ROLLUP);
    }

    return this.hierarchy.listChildren(councilOrgId).pipe(
      switchMap((regions) => {
        if (regions.length === 0) {
          return of(EMPTY_ROLLUP);
        }
        const rows$ = regions.map((org) =>
          this.dashboard.stats(org.orgId || org.id).pipe(map((stats): RegionRollupRow => ({ org, stats })))
        );
        return combineLatest(rows$).pipe(map((regionRows) => this.combine(regionRows)));
      })
    );
  }

  private combine(regions: RegionRollupRow[]): CouncilRollup {
    const totals = regions.reduce(
      (acc, { stats }) => ({
        regionCount: acc.regionCount + 1,
        totalUsers: acc.totalUsers + stats.totalUsers,
        activeLearners: acc.activeLearners + stats.activeLearners,
        completedLearners: acc.completedLearners + stats.completedLearners,
        overdueCount: acc.overdueCount + stats.overdueCount,
        criticalAuditEvents: acc.criticalAuditEvents + stats.criticalAuditEvents,
      }),
      { ...EMPTY_ROLLUP.totals }
    );

    const averageCompletionRate = regions.length
      ? Math.round((regions.reduce((sum, r) => sum + r.stats.completionRate, 0) / regions.length) * 10) / 10
      : 0;

    return { regions, totals, averageCompletionRate };
  }
}
