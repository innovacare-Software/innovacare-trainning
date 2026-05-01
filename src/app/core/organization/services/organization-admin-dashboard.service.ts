import { Injectable, inject } from '@angular/core';
import { catchError, combineLatest, map, Observable, of } from 'rxjs';
import { OrganizationDashboardStats } from '../org.models';
import { OrganizationAlertsService } from './organization-alerts.service';
import { OrganizationAuditService } from './organization-audit.service';
import { OrganizationAssignmentsService } from './organization-assignments.service';
import { OrganizationFollowUpService } from './organization-follow-up.service';
import { OrganizationOverdueService } from './organization-overdue.service';
import { OrganizationProgressService } from './organization-progress.service';
import { OrganizationUsersService } from './organization-users.service';

@Injectable({ providedIn: 'root' })
export class OrganizationAdminDashboardService {
  private readonly users = inject(OrganizationUsersService);
  private readonly assignments = inject(OrganizationAssignmentsService);
  private readonly progress = inject(OrganizationProgressService);
  private readonly overdue = inject(OrganizationOverdueService);
  private readonly alerts = inject(OrganizationAlertsService);
  private readonly followUp = inject(OrganizationFollowUpService);
  private readonly audit = inject(OrganizationAuditService);

  private readonly emptyStats: OrganizationDashboardStats = {
    totalUsers: 0,
    activeLearners: 0,
    assignedCourses: 0,
    learnersInProgress: 0,
    completionRate: 0,
    overdueCount: 0,
    pendingPolicyAcknowledgments: 0,
    activeAlerts: 0,
    criticalAuditEvents: 0,
    usersAtRisk: 0,
    averageProgress: 0,
    followUpCompletionRate: 0,
    stalledLearners: 0,
    notStartedLearners: 0,
    completedLearners: 0,
    assignmentCoverageRate: 0,
  };

  stats(orgId: string): Observable<OrganizationDashboardStats> {
    if (!orgId?.trim()) {
      return of(this.emptyStats);
    }

    return combineLatest([
      this.safeList('organizations/{orgId}/users', orgId, this.users.list(orgId)),
      this.safeList('organizations/{orgId}/courseAssignments', orgId, this.assignments.list(orgId)),
      this.safeList('organizations/{orgId}/progress', orgId, this.progress.list(orgId)),
      this.safeList('organizations/{orgId}/overdue', orgId, this.overdue.list(orgId)),
      this.safeList('organizations/{orgId}/alerts', orgId, this.alerts.list(orgId)),
      this.safeList('organizations/{orgId}/followUpActions', orgId, this.followUp.list(orgId)),
      this.safeList('organizations/{orgId}/auditLogs', orgId, this.audit.list(orgId)),
    ]).pipe(
      map(([users, assignments, progressRows, overdueRows, alerts, followUpRows, auditRows]) => {
        const totalUsers = users.length;
        const activeLearners = users.filter((u) => u.active !== false && u.role === 'org_learner').length;
        const assignedCourses = new Set(assignments.map((x) => x.courseId)).size;

        const notStartedLearners = progressRows.filter((x) => x.status === 'not_started').length;
        const learnersInProgress = progressRows.filter((x) => x.status === 'in_progress').length;
        const completedLearners = progressRows.filter((x) => x.status === 'completed').length;
        const stalledLearners = progressRows.filter((x) => (x.progressPct ?? 0) > 0 && (x.progressPct ?? 0) < 25).length;

        const averageProgress = progressRows.length
          ? Math.round((progressRows.reduce((sum, x) => sum + Number(x.progressPct || 0), 0) / progressRows.length) * 10) / 10
          : 0;

        const completionRate = progressRows.length
          ? Math.round((completedLearners / progressRows.length) * 1000) / 10
          : 0;

        const openFollowUps = followUpRows.filter((x) => x.status === 'open').length;
        const doneFollowUps = followUpRows.filter((x) => x.status === 'done').length;
        const followUpCompletionRate = followUpRows.length
          ? Math.round((doneFollowUps / followUpRows.length) * 1000) / 10
          : 0;

        const usersAtRisk = overdueRows.filter((x) => x.overdueDays >= 14).length + stalledLearners;

        return {
          totalUsers,
          activeLearners,
          assignedCourses,
          learnersInProgress,
          completionRate,
          overdueCount: overdueRows.length,
          pendingPolicyAcknowledgments: 0,
          activeAlerts: alerts.filter((x) => x.status !== 'resolved' && x.status !== 'dismissed').length,
          criticalAuditEvents: auditRows.filter((x) => x.severity === 'critical').length,
          usersAtRisk,
          averageProgress,
          followUpCompletionRate,
          stalledLearners,
          notStartedLearners,
          completedLearners,
          assignmentCoverageRate: totalUsers ? Math.round((assignments.length / totalUsers) * 1000) / 10 : 0,
        };
      }),
      catchError((error) => {
        this.logAccessError('dashboard aggregate', orgId, error);
        return of(this.emptyStats);
      })
    );
  }

  private safeList<T>(label: string, orgId: string, source: Observable<T[]>): Observable<T[]> {
    return source.pipe(
      catchError((error) => {
        this.logAccessError(label, orgId, error);
        return of([] as T[]);
      })
    );
  }

  private logAccessError(scope: string, orgId: string, error: unknown): void {
    console.error('[OrgAdminDashboardService] Firestore access failed', {
      scope,
      orgId,
      error,
      hint: 'Verify deployed firestore.rules and the signed-in user document role/orgId.',
    });
  }

  completionBreakdown(stats: OrganizationDashboardStats): Array<{ label: string; value: number }> {
    return [
      { label: 'Completed', value: stats.completedLearners },
      { label: 'In Progress', value: stats.learnersInProgress },
      { label: 'Not Started', value: stats.notStartedLearners },
    ];
  }

  strongestWeakest(stats: OrganizationDashboardStats): { strongest: string; weakest: string } {
    const strongest =
      stats.completionRate >= 80
        ? 'Training completion'
        : stats.followUpCompletionRate >= 70
          ? 'Follow-up execution'
          : 'Operational baseline';

    const weakest =
      stats.overdueCount > stats.learnersInProgress
        ? 'Overdue compliance'
        : stats.stalledLearners > 0
          ? 'Stalled learner progression'
          : 'Policy compliance visibility';

    return { strongest, weakest };
  }
}
