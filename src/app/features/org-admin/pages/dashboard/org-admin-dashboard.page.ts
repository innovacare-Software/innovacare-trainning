import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { OrganizationAdminDashboardService } from '../../../../core/organization/services/organization-admin-dashboard.service';
import { OrganizationAlertsService } from '../../../../core/organization/services/organization-alerts.service';
import { OrganizationAuditService } from '../../../../core/organization/services/organization-audit.service';
import { OrganizationFollowUpService } from '../../../../core/organization/services/organization-follow-up.service';
import { OrganizationTroubleshootingService } from '../../../../core/organization/services/organization-troubleshooting.service';
import { OrgContextService } from '../../../../core/organization/org-context.service';

@Component({
  standalone: true,
  selector: 'app-org-admin-dashboard-page',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page" *ngIf="orgId() as oid; else missingOrgTpl">
      <header class="head">
        <div>
          <h2>Organization Admin Cockpit</h2>
          <p>Decision-centric analytics for {{ oid }}</p>
        </div>
        <div class="quick-actions">
          <a routerLink="/org-admin/assignments">Assign Missing Courses</a>
          <a routerLink="/org-admin/overdue">Open Overdue Queue</a>
          <a routerLink="/org-admin/reports">Generate Report</a>
        </div>
      </header>

      <section class="kpi-grid" *ngIf="stats() as s; else loadingKpiTpl">
        <article><h3>{{ s.totalUsers }}</h3><p>Total users</p></article>
        <article><h3>{{ s.activeLearners }}</h3><p>Active learners</p></article>
        <article><h3>{{ s.assignedCourses }}</h3><p>Assigned courses</p></article>
        <article><h3>{{ s.averageProgress }}%</h3><p>Average progress</p></article>
        <article><h3>{{ s.completionRate }}%</h3><p>Completion rate</p></article>
        <article><h3>{{ s.overdueCount }}</h3><p>Overdue training</p></article>
        <article><h3>{{ s.activeAlerts }}</h3><p>Active alerts</p></article>
        <article><h3>{{ s.usersAtRisk }}</h3><p>Users at risk</p></article>
      </section>

      <section class="story" *ngIf="stats() as s">
        <article class="panel">
          <h3>Progress Story</h3>
          <p>
            {{ s.completedLearners }} completed, {{ s.learnersInProgress }} in progress, {{ s.notStartedLearners }} not started.
            Follow-up throughput: {{ s.followUpCompletionRate }}%.
          </p>
          <p class="note">
            Priority signal: {{ s.overdueCount > s.completedLearners ? 'overdue pressure is higher than completion volume' : 'completion momentum is stronger than overdue pressure' }}.
          </p>
          <div class="bars">
            <div class="bar done" [style.width.%]="completionSeg().completed"></div>
            <div class="bar running" [style.width.%]="completionSeg().inProgress"></div>
            <div class="bar idle" [style.width.%]="completionSeg().notStarted"></div>
          </div>
        </article>

        <article class="panel risk" *ngIf="riskSummary() as r">
          <h3>Risk Indicators</h3>
          <ul>
            <li>Strongest area: <strong>{{ r.strongest }}</strong></li>
            <li>Weakest area: <strong>{{ r.weakest }}</strong></li>
            <li>Stalled learners: <strong>{{ s.stalledLearners }}</strong></li>
            <li>Critical audit events: <strong>{{ s.criticalAuditEvents }}</strong></li>
            <li>Follow-up completion rate: <strong>{{ s.followUpCompletionRate }}%</strong></li>
          </ul>
        </article>
      </section>

      <section class="panel chart-panel" *ngIf="stats() as s">
        <h3>Visible Performance Charts</h3>
        <div class="chart-list">
          <div class="chart-row" *ngFor="let c of chartRows()">
            <div class="chart-meta">
              <span>{{ c.label }}</span>
              <strong>{{ c.value }}%</strong>
            </div>
            <div class="chart-track">
              <div class="chart-fill" [style.width.%]="c.value" [style.background]="c.color"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="architecture-diagrams">
        <article class="panel diagram">
          <h3>Data Flow Map</h3>
          <pre>
[Org Admin UI]
     |
     v
[Domain Services]
     |
     v
[organizations/org-id/...]
     |
     v
[Rules + Role Checks]
          </pre>
        </article>

        <article class="panel diagram">
          <h3>Learning Analytics Model</h3>
          <pre>
[Assignments] + [Enrollments] + [Policies]
                   |
                   v
          [Progress Aggregation]
              |             |
              v             v
         [Completion]   [Overdue]
              \             /
               \           /
                v         v
             [Dashboard KPIs]
          </pre>
        </article>

        <article class="panel diagram">
          <h3>Enrollment Lifecycle</h3>
          <pre>
Enroll -> Assign -> Learn -> Measure
        -> Detect Risk -> Alert
        -> Follow-up -> KPI Refresh
          </pre>
        </article>
      </section>

      <section class="panels">
        <article class="panel">
          <h3>Recent Alerts</h3>
          <ul>
            <li *ngFor="let a of recentAlerts() | slice:0:6">{{ a.title }} - <span [class]="'sev ' + a.severity">{{ a.severity }}</span></li>
            <li *ngIf="!recentAlerts().length">No active alerts.</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Recent Audit Activity</h3>
          <ul>
            <li *ngFor="let row of recentAudit() | slice:0:6">{{ row.actionType }} · {{ row.module }}</li>
            <li *ngIf="!recentAudit().length">No recent audit event.</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Follow-Up Needed</h3>
          <ul>
            <li *ngFor="let f of openFollowUp() | slice:0:6">{{ f.type }} · {{ f.status }}</li>
            <li *ngIf="!openFollowUp().length">No open follow-up action.</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Recommendation Panel</h3>
          <ul>
            <li *ngFor="let rec of recommendations()">{{ rec }}</li>
            <li *ngIf="!recommendations().length">No recommendation available.</li>
          </ul>
        </article>
      </section>
    </section>

    <ng-template #loadingKpiTpl>
      <section class="kpi-grid skeleton">
        <article *ngFor="let s of [1,2,3,4,5,6,7,8]"><div></div><p>Loading KPI...</p></article>
      </section>
    </ng-template>

    <ng-template #missingOrgTpl>
      <section class="page empty-state">
        <h3>No organization context</h3>
        <p>Your session is not bound to an organization. Please re-authenticate with an org account.</p>
      </section>
    </ng-template>
  `,
  styles: [`
    .page { background: #f4f8fb; border: 1px solid #dbe7f2; border-radius: 14px; padding: 1rem; }
    .empty-state { text-align: center; padding: 2rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .head h2 { margin: 0; color: #153b5d; }
    .head p { margin: .35rem 0 0; color: #5a7590; }
    .quick-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .quick-actions a { text-decoration: none; background: #fff; border: 1px solid #c9d9ea; color: #1f486c; border-radius: 9px; padding: .45rem .6rem; font-weight: 700; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: .7rem; margin-top: .8rem; }
    .kpi-grid article { background: #fff; border: 1px solid #d7e4f1; border-radius: 12px; padding: .85rem; }
    .kpi-grid.skeleton article div { height: 18px; border-radius: 8px; background: #e6edf5; }
    .kpi-grid h3 { margin: 0; color: #102f4f; }
    .kpi-grid p { margin: .28rem 0 0; color: #627f9b; }
    .story { display: grid; grid-template-columns: 1.2fr .8fr; gap: .7rem; margin-top: .7rem; }
    .panel { background: #fff; border: 1px solid #d9e4ef; border-radius: 12px; padding: .8rem; }
    .panel h3 { margin: 0 0 .45rem; color: #1b4062; }
    .chart-panel { margin-top: .7rem; border: 1px solid #c8dbed; background: linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%); }
    .chart-list { display: grid; gap: .65rem; }
    .chart-row { display: grid; gap: .35rem; }
    .chart-meta { display: flex; justify-content: space-between; align-items: center; color: #244968; font-weight: 700; }
    .chart-track { height: 18px; border-radius: 999px; background: #e4edf6; border: 1px solid #d0deeb; overflow: hidden; }
    .chart-fill { height: 100%; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.28); min-width: 2%; }
    .architecture-diagrams { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .7rem; margin-top: .7rem; }
    .diagram { border-color: #c7dbef; background: linear-gradient(135deg, #fff 0%, #f4f9ff 100%); }
    .diagram pre { margin: 0; background: #ffffff; border: 1px solid #cfe0f0; border-radius: 10px; padding: .75rem; color: #173f61; font-size: .84rem; line-height: 1.45; overflow: auto; font-weight: 600; }
    .note { margin-top: .45rem; color: #5f7c98; font-size: .87rem; }
    .bars { height: 14px; border-radius: 999px; overflow: hidden; display: flex; margin-top: .6rem; background: #edf2f7; }
    .bar { height: 100%; }
    .bar.done { background: #0f8d69; }
    .bar.running { background: #2f78c4; }
    .bar.idle { background: #a4b8ca; }
    .panels { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .7rem; margin-top: .7rem; }
    ul { margin: 0; padding-left: 1rem; color: #2f4f6d; }
    li { margin-bottom: .28rem; }
    .sev { text-transform: uppercase; font-size: .75rem; font-weight: 700; }
    .sev.critical { color: #a12727; }
    .sev.high { color: #b45b0e; }
    @media (max-width: 980px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .story, .panels, .architecture-diagrams { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminDashboardPage {
  private readonly ctx = inject(OrgContextService);
  private readonly dashboard = inject(OrganizationAdminDashboardService);
  private readonly alerts = inject(OrganizationAlertsService);
  private readonly audit = inject(OrganizationAuditService);
  private readonly followUp = inject(OrganizationFollowUpService);
  private readonly troubleshooting = inject(OrganizationTroubleshootingService);

  private readonly context = toSignal(this.ctx.context$, {
    initialValue: {
      uid: '',
      orgId: null,
      role: '',
      orgRole: null,
      isSuperAdmin: false,
      isOrgAdmin: false,
      isOrgManager: false,
      isOrgLearner: false,
    },
  });

  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);

  readonly stats = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.dashboard.stats(id) : of(null as any)))),
    { initialValue: null as any }
  );

  readonly recentAlerts = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.alerts.listActive(id) : of([] as any[])))),
    { initialValue: [] as any[] }
  );

  readonly recentAudit = toSignal(
    this.orgId$.pipe(
      switchMap((id) => (id ? this.audit.list(id) : of([] as any[]))),
      map((rows) => rows.sort((a, b) => {
        const av = (a.createdAt as any)?.seconds || 0;
        const bv = (b.createdAt as any)?.seconds || 0;
        return bv - av;
      }))
    ),
    { initialValue: [] as any[] }
  );

  readonly openFollowUp = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.followUp.listOpen(id) : of([] as any[])))),
    { initialValue: [] as any[] }
  );

  readonly recommendations = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.troubleshooting.recommendations(id) : of([] as string[])))),
    { initialValue: [] as string[] }
  );

  readonly riskSummary = computed(() => {
    const s = this.stats();
    return s ? this.dashboard.strongestWeakest(s) : null;
  });

  readonly completionSeg = computed(() => {
    const s = this.stats();
    if (!s) return { completed: 0, inProgress: 0, notStarted: 0 };
    const total = Math.max(1, s.completedLearners + s.learnersInProgress + s.notStartedLearners);
    return {
      completed: (s.completedLearners / total) * 100,
      inProgress: (s.learnersInProgress / total) * 100,
      notStarted: (s.notStartedLearners / total) * 100,
    };
  });

  readonly chartRows = computed(() => {
    const s = this.stats();
    if (!s) return [] as Array<{ label: string; value: number; color: string }>;
    return [
      { label: 'Completion Rate', value: Math.max(0, Math.min(100, Number(s.completionRate || 0))), color: 'linear-gradient(90deg, #1f9b74 0%, #127f5f 100%)' },
      { label: 'Average Progress', value: Math.max(0, Math.min(100, Number(s.averageProgress || 0))), color: 'linear-gradient(90deg, #2f78c4 0%, #1f5e9f 100%)' },
      { label: 'Follow-up Completion', value: Math.max(0, Math.min(100, Number(s.followUpCompletionRate || 0))), color: 'linear-gradient(90deg, #7a59d1 0%, #5b3fb0 100%)' },
    ];
  });
}
