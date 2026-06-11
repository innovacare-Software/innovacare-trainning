import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { OrganizationAdminDashboardService } from '../../../../core/organization/services/organization-admin-dashboard.service';
import { OrganizationAlertsService } from '../../../../core/organization/services/organization-alerts.service';
import { OrganizationAuditService } from '../../../../core/organization/services/organization-audit.service';
import { OrganizationFollowUpService } from '../../../../core/organization/services/organization-follow-up.service';
import { OrganizationTroubleshootingService } from '../../../../core/organization/services/organization-troubleshooting.service';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { AiCommandCenterService, CommandCenterSnapshot } from '../../../superAdmin/ai-command-center/ai-command-center.service';

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
          <p class="diag" *ngIf="diagnostics().length">Some panels are running in fallback mode. Open the console for the failing collection path.</p>
        </div>
        <div class="quick-actions">
          <a routerLink="/org-admin/assignments">Assign Missing Courses</a>
          <a routerLink="/org-admin/overdue">Open Overdue Queue</a>
          <a routerLink="/org-admin/reports">Generate Report</a>
        </div>
      </header>

      <article class="panel access-code-panel" *ngIf="organization() as org">
        <div class="ac-info">
          <h3>Organization Access Code</h3>
          <p>Share this code with your team so they can sign in via the "Organization" tab.</p>
        </div>
        <div class="ac-actions" *ngIf="org.accessCode; else noCodeTpl">
          <code class="ac-code">{{ codeRevealed() ? org.accessCode : '••••••••' }}</code>
          <button type="button" class="ac-btn" (click)="toggleCode()">{{ codeRevealed() ? 'Hide' : 'Reveal' }}</button>
          <button type="button" class="ac-btn" (click)="copyCode(org.accessCode)">{{ codeCopied() ? 'Copied' : 'Copy' }}</button>
        </div>
        <ng-template #noCodeTpl>
          <p class="ac-empty">No access code configured. Ask a super admin to set one for this organization.</p>
        </ng-template>
      </article>

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

      <section class="executive-band" *ngIf="stats() as s">
        <article class="hero-card">
          <p class="hero-kicker">Operational health</p>
          <h3>{{ healthScore() }}/100</h3>
          <p>{{ healthNarrative() }}</p>
        </article>
        <article class="hero-card muted">
          <p class="hero-kicker">Immediate focus</p>
          <ul>
            <li>{{ s.overdueCount }} overdue learners need follow-up</li>
            <li>{{ s.stalledLearners }} stalled learner records under 25%</li>
            <li>{{ s.criticalAuditEvents }} critical audit events require review</li>
          </ul>
        </article>
      </section>

      <section class="agentic-band" *ngIf="aiSnapshot() as ai">
        <article class="panel copilot-panel">
          <div class="copilot-head">
            <div>
              <p class="copilot-kicker">Instructor Copilot</p>
              <h3>AI command layer for this organization</h3>
            </div>
            <a routerLink="/org-admin/ai-command-center">Open full Command Center</a>
          </div>
          <div class="copilot-metrics">
            <div>
              <strong>{{ ai.metrics.openRecommendations }}</strong>
              <span>Open recommendations</span>
            </div>
            <div>
              <strong>{{ ai.metrics.pendingApprovals }}</strong>
              <span>Pending approvals</span>
            </div>
            <div>
              <strong>{{ ai.metrics.completedRuns7d }}</strong>
              <span>Completed runs (7d)</span>
            </div>
          </div>
          <div class="copilot-actions">
            <button type="button" class="ac-btn" (click)="runOrgAgent('student_success')" [disabled]="agentRunning() === 'student_success'">
              {{ agentRunning() === 'student_success' ? 'Running…' : 'Run learner success sweep' }}
            </button>
            <button type="button" class="ac-btn" (click)="runOrgAgent('instructor_assistant')" [disabled]="agentRunning() === 'instructor_assistant'">
              {{ agentRunning() === 'instructor_assistant' ? 'Running…' : 'Run instructor copilot' }}
            </button>
          </div>
        </article>

        <article class="panel copilot-panel">
          <h3>Top AI recommendations</h3>
          <ul class="copilot-list">
            <li *ngFor="let rec of ai.recommendations | slice:0:3">
              <strong>{{ rec.title }}</strong>
              <span class="copilot-priority" [class]="'copilot-priority ' + rec.priority">{{ rec.priority }}</span>
              <p>{{ rec.summary }}</p>
            </li>
            <li *ngIf="!ai.recommendations.length">No open AI recommendation for this organization.</li>
          </ul>
        </article>
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

      <section class="focus-grid" *ngIf="stats() as s">
        <article class="panel focus-card">
          <h3>Execution Focus</h3>
          <p>{{ focusHeadline() }}</p>
          <small>Coverage {{ s.assignmentCoverageRate }}% · follow-up {{ s.followUpCompletionRate }}%</small>
        </article>
        <article class="panel focus-card">
          <h3>Live Signals</h3>
          <p>{{ recentAlerts().length }} alerts, {{ openFollowUp().length }} open follow-ups, {{ recentAudit().length }} recent audit events.</p>
          <small>Signals are computed from active org-scoped collections.</small>
        </article>
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
    .diag { color: #9a4d10 !important; font-weight: 700; }
    .quick-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .quick-actions a { text-decoration: none; background: #fff; border: 1px solid #c9d9ea; color: #1f486c; border-radius: 9px; padding: .45rem .6rem; font-weight: 700; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: .7rem; margin-top: .8rem; }
    .kpi-grid article { background: #fff; border: 1px solid #d7e4f1; border-radius: 12px; padding: .85rem; }
    .kpi-grid.skeleton article div { height: 18px; border-radius: 8px; background: #e6edf5; }
    .kpi-grid h3 { margin: 0; color: #102f4f; }
    .kpi-grid p { margin: .28rem 0 0; color: #627f9b; }
    .executive-band { display: grid; grid-template-columns: 1.15fr .85fr; gap: .7rem; margin-top: .7rem; }
    .hero-card { border: 1px solid #c9dbed; border-radius: 14px; padding: 1rem; background: linear-gradient(135deg, #103f69 0%, #1d5d93 100%); color: #f3f8ff; }
    .hero-card.muted { background: linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%); color: #173f62; }
    .hero-card h3 { margin: .25rem 0 .35rem; font-size: 2rem; }
    .hero-card ul { margin: .5rem 0 0; padding-left: 1rem; }
    .hero-card li { color: inherit; }
    .hero-kicker { margin: 0; text-transform: uppercase; letter-spacing: .1em; font-size: .72rem; font-weight: 800; color: inherit; opacity: .82; }
    .agentic-band { display: grid; grid-template-columns: 1.15fr .85fr; gap: .7rem; margin-top: .7rem; }
    .story { display: grid; grid-template-columns: 1.2fr .8fr; gap: .7rem; margin-top: .7rem; }
    .panel { background: #fff; border: 1px solid #d9e4ef; border-radius: 12px; padding: .8rem; }
    .panel h3 { margin: 0 0 .45rem; color: #1b4062; }
    .copilot-panel { border-color: #c8dbed; background: linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%); }
    .copilot-head { display: flex; justify-content: space-between; gap: .75rem; align-items: start; }
    .copilot-head a { text-decoration: none; background: #fff; border: 1px solid #c9d9ea; color: #1f486c; border-radius: 9px; padding: .45rem .6rem; font-weight: 700; }
    .copilot-kicker { margin: 0 0 .2rem; text-transform: uppercase; letter-spacing: .1em; font-size: .72rem; font-weight: 800; color: #68839d; }
    .copilot-metrics { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .6rem; margin-top: .8rem; }
    .copilot-metrics div { background: #fff; border: 1px solid #d7e4f1; border-radius: 12px; padding: .75rem; }
    .copilot-metrics strong { display: block; color: #102f4f; font-size: 1.4rem; }
    .copilot-metrics span { color: #627f9b; font-size: .82rem; }
    .copilot-actions { display: flex; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
    .copilot-list { list-style: none; padding: 0; margin: .2rem 0 0; }
    .copilot-list li { border-top: 1px solid #dce8f3; padding: .7rem 0 0; margin-top: .7rem; }
    .copilot-list li:first-child { border-top: none; margin-top: 0; padding-top: 0; }
    .copilot-list p { margin: .28rem 0 0; color: #5a7590; }
    .copilot-priority { display: inline-flex; margin-left: .5rem; text-transform: uppercase; font-size: .68rem; font-weight: 800; border-radius: 999px; padding: .14rem .45rem; }
    .copilot-priority.critical { background: #ffe4e4; color: #9c1717; }
    .copilot-priority.high { background: #fff0dc; color: #8a4f00; }
    .copilot-priority.medium { background: #edf5ff; color: #1f4d78; }
    .copilot-priority.low { background: #eef4f9; color: #4e6b88; }
    .focus-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .7rem; margin-top: .7rem; }
    .focus-card p { margin: 0; color: #294b6d; }
    .focus-card small { display: block; margin-top: .35rem; color: #68839d; }
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
    .access-code-panel { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: .7rem; border-color: #c8dbed; background: linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%); flex-wrap: wrap; }
    .access-code-panel .ac-info h3 { margin: 0 0 .25rem; }
    .access-code-panel .ac-info p { margin: 0; color: #5a7590; font-size: .88rem; }
    .access-code-panel .ac-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .access-code-panel .ac-code { background: #fff; border: 1px solid #c9d9ea; color: #102f4f; border-radius: 8px; padding: .45rem .75rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; letter-spacing: .12em; }
    .access-code-panel .ac-btn { background: #fff; border: 1px solid #c9d9ea; color: #1f486c; border-radius: 8px; padding: .4rem .65rem; font-weight: 700; cursor: pointer; }
    .access-code-panel .ac-btn:hover { background: #f4f8fb; }
    .access-code-panel .ac-empty { margin: 0; color: #9a4d10; font-weight: 600; }
    ul { margin: 0; padding-left: 1rem; color: #2f4f6d; }
    li { margin-bottom: .28rem; }
    .sev { text-transform: uppercase; font-size: .75rem; font-weight: 700; }
    .sev.critical { color: #a12727; }
    .sev.high { color: #b45b0e; }
    @media (max-width: 980px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .executive-band, .agentic-band, .story, .focus-grid, .panels, .architecture-diagrams { grid-template-columns: 1fr; } .copilot-metrics { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminDashboardPage {
  private readonly ctx = inject(OrgContextService);
  private readonly dashboard = inject(OrganizationAdminDashboardService);
  private readonly alerts = inject(OrganizationAlertsService);
  private readonly audit = inject(OrganizationAuditService);
  private readonly followUp = inject(OrganizationFollowUpService);
  private readonly troubleshooting = inject(OrganizationTroubleshootingService);
  private readonly firestore = inject(Firestore);
  private readonly aiCommandCenter = inject(AiCommandCenterService);

  private readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });

  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);

  // Live read of the organization document so org admins can reveal/copy
  // the access code they need to share with their team for sign-in.
  readonly organization = toSignal(
    this.orgId$.pipe(
      switchMap((id) => (id
        ? docData(doc(this.firestore, `organizations/${id}`), { idField: 'id' }).pipe(
            catchError((error) => {
              this.logPanelError('organizations/{orgId}', id, error);
              return of(null as any);
            })
          )
        : of(null as any)
      ))
    ),
    { initialValue: null as any }
  );

  // Local UX state for the access code reveal/copy controls.
  readonly codeRevealed = signal(false);
  readonly codeCopied = signal(false);
  readonly aiSnapshot = signal<CommandCenterSnapshot | null>(null);
  readonly agentRunning = signal<string | null>(null);

  toggleCode(): void {
    this.codeRevealed.update((v) => !v);
  }

  async copyCode(code: string | null | undefined): Promise<void> {
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      // Clipboard API may be blocked (insecure context); silently ignore.
    }
  }

  readonly diagnostics = toSignal(this.orgId$.pipe(
    map(() => [] as string[])
  ), { initialValue: [] as string[] });

  readonly stats = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.dashboard.stats(id) : of(null as any)))),
    { initialValue: null as any }
  );

  readonly recentAlerts = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.alerts.listActive(id).pipe(
      catchError((error) => {
        this.logPanelError('organizations/{orgId}/alerts', id, error);
        return of([] as any[]);
      })
    ) : of([] as any[])))),
    { initialValue: [] as any[] }
  );

  readonly recentAudit = toSignal(
    this.orgId$.pipe(
      switchMap((id) => (id ? this.audit.list(id).pipe(
        catchError((error) => {
          this.logPanelError('organizations/{orgId}/auditLogs', id, error);
          return of([] as any[]);
        })
      ) : of([] as any[]))),
      map((rows) => rows.sort((a, b) => {
        const av = (a.createdAt as any)?.seconds || 0;
        const bv = (b.createdAt as any)?.seconds || 0;
        return bv - av;
      }))
    ),
    { initialValue: [] as any[] }
  );

  readonly openFollowUp = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.followUp.listOpen(id).pipe(
      catchError((error) => {
        this.logPanelError('organizations/{orgId}/followUpActions', id, error);
        return of([] as any[]);
      })
    ) : of([] as any[])))),
    { initialValue: [] as any[] }
  );

  readonly recommendations = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.troubleshooting.recommendations(id).pipe(
      catchError((error) => {
        this.logPanelError('organizations/{orgId}/troubleshooting aggregation', id, error);
        return of([] as string[]);
      })
    ) : of([] as string[])))),
    { initialValue: [] as string[] }
  );

  constructor() {
    this.orgId$.subscribe((id) => {
      if (!id) {
        this.aiSnapshot.set(null);
        return;
      }
      void this.refreshAiSnapshot(id);
    });
  }

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

  readonly healthScore = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return Math.max(0, Math.min(100,
      Math.round(
        (Number(s.completionRate || 0) * 0.35) +
        (Number(s.averageProgress || 0) * 0.25) +
        (Number(s.followUpCompletionRate || 0) * 0.2) +
        ((100 - Math.min(100, s.usersAtRisk * 5)) * 0.2)
      )
    ));
  });

  readonly healthNarrative = computed(() => {
    const score = this.healthScore();
    if (score >= 80) return 'The organization is running with strong completion momentum and controlled risk.';
    if (score >= 60) return 'The organization is stable, but completion and follow-up still need closer orchestration.';
    return 'The organization needs immediate intervention on risk, overdue work and learner stagnation.';
  });

  readonly focusHeadline = computed(() => {
    const s = this.stats();
    if (!s) return 'Waiting for organization data.';
    if (s.overdueCount >= s.completedLearners) {
      return 'Overdue pressure is outpacing completions. Reprioritize remediation and learner follow-up.';
    }
    if (s.stalledLearners > 0) {
      return 'Stalled learners are visible. Target low-progress cohorts before new assignments expand.';
    }
    return 'Completion momentum is currently stronger than operational drag. Keep assignment coverage disciplined.';
  });

  async runOrgAgent(agentId: 'student_success' | 'instructor_assistant'): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) {
      return;
    }
    this.agentRunning.set(agentId);
    try {
      await this.aiCommandCenter.runAgent({ agentId, organizationId: orgId });
      await this.refreshAiSnapshot(orgId);
    } catch (error) {
      this.logPanelError(`ai-command-center/${agentId}`, orgId, error);
    } finally {
      this.agentRunning.set(null);
    }
  }

  private async refreshAiSnapshot(orgId: string): Promise<void> {
    try {
      this.aiSnapshot.set(await this.aiCommandCenter.getSnapshot({ organizationId: orgId }));
    } catch (error) {
      this.logPanelError('ai-command-center snapshot', orgId, error);
      this.aiSnapshot.set(null);
    }
  }

  private logPanelError(scope: string, orgId: string, error: unknown): void {
    console.error('[OrgAdminDashboardPage] Firestore panel fallback', {
      scope,
      orgId,
      error,
      hint: 'If local firestore.rules already allow this path, deploy them or verify users/{uid}.role and users/{uid}.orgId.',
    });
  }
}
