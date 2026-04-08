import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { combineLatest, map, Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationTroubleshootingIssue } from '../org.models';
import { OrganizationAlertsService } from './organization-alerts.service';
import { OrganizationOverdueService } from './organization-overdue.service';
import { OrganizationPoliciesService } from './organization-policies.service';
import { OrganizationProgressService } from './organization-progress.service';
import { OrganizationUsersService } from './organization-users.service';

@Injectable({ providedIn: 'root' })
export class OrganizationTroubleshootingService {
  private readonly afs = inject(Firestore);
  private readonly users = inject(OrganizationUsersService);
  private readonly progress = inject(OrganizationProgressService);
  private readonly overdue = inject(OrganizationOverdueService);
  private readonly policies = inject(OrganizationPoliciesService);
  private readonly alerts = inject(OrganizationAlertsService);

  list(orgId: string): Observable<OrganizationTroubleshootingIssue[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.troubleshootingIssues(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationTroubleshootingIssue[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationTroubleshootingIssue, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.troubleshootingIssues(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async setStatus(orgId: string, issueId: string, status: OrganizationTroubleshootingIssue['status']): Promise<void> {
    await updateDoc(doc(this.afs, OrgFirestorePaths.troubleshootingIssue(orgId, issueId)), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  recommendations(orgId: string): Observable<string[]> {
    if (!orgId?.trim()) return of([]);
    return combineLatest([
      this.users.list(orgId),
      this.progress.list(orgId),
      this.overdue.list(orgId),
      this.policies.list(orgId),
      this.alerts.list(orgId),
    ]).pipe(
      map(([users, progressRows, overdueRows, policies, alerts]) => {
        const tips: string[] = [];

        const inactiveUsers = users.filter((u) => u.active === false).length;
        const stalled = progressRows.filter((x) => (x.progressPct ?? 0) > 0 && (x.progressPct ?? 0) < 20).length;
        const noPolicy = policies.length === 0;
        const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;

        if (overdueRows.length > 0) tips.push(`Open overdue queue (${overdueRows.length}) and send reminders.`);
        if (stalled > 0) tips.push(`Relance stalled learners (${stalled}) and verify assignment fit.`);
        if (inactiveUsers > 0) tips.push(`Review inactive users (${inactiveUsers}) with active assignments.`);
        if (noPolicy) tips.push('Publish at least one active policy and track acknowledgments.');
        if (criticalAlerts > 0) tips.push(`Resolve critical alerts (${criticalAlerts}) before next compliance export.`);

        if (!tips.length) {
          tips.push('No critical blockers detected. Keep monitoring trends and follow-up throughput.');
        }

        return tips;
      })
    );
  }
}
