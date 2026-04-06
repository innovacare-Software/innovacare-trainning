import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  docData,
  serverTimestamp,
} from '@angular/fire/firestore';
import { combineLatest, map, Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import {
  OrganizationProgressRecord,
  OrganizationReport,
  OrganizationReportRow,
  OrganizationReportSummary,
  OrganizationReportType,
} from '../org.models';
import { OrganizationAlertsService } from './organization-alerts.service';
import { OrganizationAuditService } from './organization-audit.service';
import { OrganizationOverdueService } from './organization-overdue.service';
import { OrganizationProgressService } from './organization-progress.service';

@Injectable({ providedIn: 'root' })
export class OrganizationReportsService {
  private readonly afs = inject(Firestore);
  private readonly progress = inject(OrganizationProgressService);
  private readonly overdue = inject(OrganizationOverdueService);
  private readonly alerts = inject(OrganizationAlertsService);
  private readonly audit = inject(OrganizationAuditService);

  list(orgId: string): Observable<OrganizationReport[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.reports(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationReport[]>;
  }

  getById(orgId: string, reportId: string): Observable<OrganizationReport | null> {
    if (!orgId?.trim() || !reportId?.trim()) return of(null);
    const ref = doc(this.afs, OrgFirestorePaths.report(orgId, reportId));
    return docData(ref, { idField: 'id' }) as Observable<OrganizationReport | null>;
  }

  async createReport(orgId: string, payload: {
    type: OrganizationReportType;
    name: string;
    createdBy: string;
    filters?: Record<string, unknown>;
  }): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.reports(orgId));
    const summary = await this.computeSummarySnapshot(orgId, payload.type);

    await addDoc(ref, {
      orgId,
      type: payload.type,
      name: payload.name,
      filters: payload.filters || {},
      summary,
      rowsCount: summary.kpi['total'] || 0,
      status: 'ready',
      createdBy: payload.createdBy,
      createdAt: serverTimestamp(),
    } as any as OrganizationReport);
  }

  previewRows(orgId: string, type: OrganizationReportType): Observable<OrganizationReportRow[]> {
    if (!orgId?.trim()) return of([]);
    return this.progress.list(orgId).pipe(
      map((rows) => {
        const data = rows as OrganizationProgressRecord[];
        const byStatus = new Map<string, number>();
        for (const row of data) {
          const key = row.status || 'unknown';
          byStatus.set(key, (byStatus.get(key) || 0) + 1);
        }

        const head: OrganizationReportRow[] = [
          { key: 'type', label: 'Report Type', value: type },
          { key: 'scope', label: 'Scope', value: 'organization' },
        ];

        const body = Array.from(byStatus.entries()).map(([key, value]) => ({
          key,
          label: `Learners ${key}`,
          value,
          segment: 'progress',
        }));

        return [...head, ...body];
      })
    );
  }

  kpiSnapshot(orgId: string): Observable<Record<string, number>> {
    if (!orgId?.trim()) return of({});
    return combineLatest([
      this.progress.list(orgId),
      this.overdue.list(orgId),
      this.alerts.list(orgId),
      this.audit.list(orgId),
    ]).pipe(
      map(([progressRows, overdueRows, alertRows, auditRows]) => {
        const total = progressRows.length;
        const completed = progressRows.filter((x) => x.status === 'completed').length;
        const inProgress = progressRows.filter((x) => x.status === 'in_progress').length;
        const notStarted = progressRows.filter((x) => x.status === 'not_started').length;
        const stalled = progressRows.filter((x) => (x.progressPct ?? 0) > 0 && (x.progressPct ?? 0) < 25).length;

        return {
          total,
          completed,
          inProgress,
          notStarted,
          stalled,
          overdue: overdueRows.length,
          alerts: alertRows.length,
          criticalAudit: auditRows.filter((x) => x.severity === 'critical').length,
          completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
        };
      })
    );
  }

  private async computeSummarySnapshot(orgId: string, _type: OrganizationReportType): Promise<OrganizationReportSummary> {
    const kpi = await new Promise<Record<string, number>>((resolve) => {
      const sub = this.kpiSnapshot(orgId).subscribe((value) => {
        resolve(value);
        sub.unsubscribe();
      });
    });

    const strongestArea = (kpi['completionRate'] || 0) >= 80 ? 'Completion' : 'N/A';
    const weakestArea = (kpi['overdue'] || 0) > 0 ? 'Overdue compliance' : 'N/A';

    return {
      kpi,
      strongestArea,
      weakestArea,
      recommendation:
        (kpi['overdue'] || 0) > 0
          ? 'Priorize overdue learners and relaunch policy acknowledgments.'
          : 'Maintain cadence and monitor stalled progress segments.',
    };
  }
}
