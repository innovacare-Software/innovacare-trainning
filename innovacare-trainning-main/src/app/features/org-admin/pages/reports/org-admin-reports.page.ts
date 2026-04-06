import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationReportType } from '../../../../core/organization/org.models';
import { OrganizationReportsService } from '../../../../core/organization/services/organization-reports.service';

@Component({
  standalone: true,
  selector: 'app-org-admin-reports-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h2>Organization Reports</h2>
        <p>Action-oriented reporting with KPI snapshot and trend context.</p>
      </header>

      <section class="builder">
        <label>Report Type
          <select [(ngModel)]="selectedType">
            <option *ngFor="let t of types" [value]="t">{{ t }}</option>
          </select>
        </label>
        <label>Report Name
          <input [(ngModel)]="reportName" placeholder="Weekly compliance pulse" />
        </label>
        <button (click)="create()" [disabled]="creating()">{{ creating() ? 'Generating…' : 'Generate report' }}</button>
      </section>

      <section class="kpi" *ngIf="kpi() as k">
        <article *ngFor="let key of kpiKeys()"><h3>{{ k[key] }}</h3><p>{{ key }}</p></article>
      </section>

      <section class="chart-card" *ngIf="kpiChartRows().length">
        <h3>Visible KPI Charts</h3>
        <div class="chart-list">
          <div class="chart-row" *ngFor="let c of kpiChartRows()">
            <div class="chart-meta">
              <span>{{ c.label }}</span>
              <strong>{{ c.raw }}</strong>
            </div>
            <div class="chart-track">
              <div class="chart-fill" [style.width.%]="c.value" [style.background]="c.color"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="filters">
        <label>Search reports
          <input [(ngModel)]="search" placeholder="Name, type, status" />
        </label>
        <label>Status
          <select [(ngModel)]="statusFilter">
            <option value="all">All</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </section>

      <section class="tables">
        <article>
          <h3>Recent Reports ({{ filteredReports().length }})</h3>
          <table *ngIf="filteredReports().length; else reportsEmpty">
            <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of filteredReports()">
                <td>{{ r.name }}</td>
                <td>{{ r.type }}</td>
                <td>{{ r.status || 'ready' }}</td>
                <td>{{ r.createdAt?.toDate ? (r.createdAt.toDate() | date:'short') : '—' }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #reportsEmpty>
            <article class="empty">
              <h4>No reports match the current filters</h4>
              <p>Adjust status or search to find a previous run.</p>
            </article>
          </ng-template>
        </article>

        <article>
          <h3>Preview ({{ selectedType }})</h3>
          <ul *ngIf="previewRows().length; else previewEmpty">
            <li *ngFor="let row of previewRows()">{{ row.label }}: <strong>{{ row.value }}</strong></li>
          </ul>
          <ng-template #previewEmpty>
            <article class="empty compact">
              <h4>No preview rows yet</h4>
              <p>Generate report data or switch the report type.</p>
            </article>
          </ng-template>
        </article>
      </section>
    </section>
  `,
  styles: [`
    .page { background: #fff; border: 1px solid #d8e4f0; border-radius: 12px; padding: 1rem; }
    .builder { display: grid; grid-template-columns: 1fr 1fr auto; gap: .65rem; margin-top: .8rem; }
    label { display: grid; gap: .3rem; font-weight: 700; color: #304f6b; }
    input, select { border: 1px solid #c7d8e9; border-radius: 8px; padding: .45rem .55rem; }
    button { border: 0; border-radius: 9px; background: #0f436e; color: #eff7ff; font-weight: 700; padding: .55rem .8rem; align-self: end; }
    .kpi { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: .55rem; margin-top: .8rem; }
    .kpi article { border: 1px solid #dce7f2; border-radius: 10px; padding: .6rem; background: #f8fbff; }
    .kpi h3 { margin: 0; color: #11385a; }
    .kpi p { margin: .2rem 0 0; color: #58738f; text-transform: capitalize; }
    .chart-card { margin-top: .8rem; border: 1px solid #cfe0ef; border-radius: 10px; padding: .7rem; background: linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%); }
    .chart-card h3 { margin: 0 0 .6rem; color: #153f62; }
    .chart-list { display: grid; gap: .65rem; }
    .chart-row { display: grid; gap: .35rem; }
    .chart-meta { display: flex; justify-content: space-between; align-items: center; color: #204a6d; font-weight: 700; }
    .chart-track { height: 16px; border-radius: 999px; border: 1px solid #cedfed; background: #e7f0f8; overflow: hidden; }
    .chart-fill { height: 100%; min-width: 2%; border-radius: 999px; }
    .filters { display: grid; grid-template-columns: 1.6fr 1fr; gap: .55rem; margin-top: .8rem; }
    .tables { display: grid; grid-template-columns: 1.15fr .85fr; gap: .7rem; margin-top: .8rem; }
    article { border: 1px solid #dce7f2; border-radius: 10px; padding: .7rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e6edf4; text-align: left; padding: .5rem; }
    th { color: #4f6985; text-transform: uppercase; font-size: .76rem; }
    ul { margin: 0; padding-left: 1rem; }
    li { margin-bottom: .26rem; }
    .empty { border: 1px dashed #c6d8e9; border-radius: 10px; padding: .85rem; text-align: center; color: #5b7692; background: #fbfdff; }
    .empty.compact { margin-top: .3rem; }
    .empty h4 { margin: 0 0 .3rem; color: #234969; }
    .empty p { margin: 0; color: #607d98; }
    @media (max-width: 980px) { .builder, .tables, .kpi, .filters { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminReportsPage {
  private readonly ctx = inject(OrgContextService);
  private readonly reportsService = inject(OrganizationReportsService);

  types: OrganizationReportType[] = [
    'training_completion',
    'overdue_training',
    'policy_acknowledgment',
    'course_assignment',
    'user_compliance',
    'progress_summary',
    'alerts_follow_up',
    'audit_activity',
    'custom',
  ];

  selectedType: OrganizationReportType = 'progress_summary';
  reportName = 'Org Performance Pulse';
  creating = signal(false);
  statusFilter = 'all';
  search = '';

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
  readonly reports = toSignal(this.reportsService.list(this.orgId()), { initialValue: [] as any[] });
  readonly kpi = toSignal(this.reportsService.kpiSnapshot(this.orgId()), { initialValue: {} as Record<string, number> });
  readonly previewRows = toSignal(this.reportsService.previewRows(this.orgId(), this.selectedType), { initialValue: [] as any[] });

  readonly kpiKeys = computed(() => Object.keys(this.kpi()));
  readonly filteredReports = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.reports().filter((r) => {
      const status = r.status || 'ready';
      const byStatus = this.statusFilter === 'all' || status === this.statusFilter;
      const bySearch = !term || `${r.name || ''} ${r.type || ''} ${status}`.toLowerCase().includes(term);
      return byStatus && bySearch;
    });
  });

  readonly kpiChartRows = computed(() => {
    const entries = Object.entries(this.kpi() || {}).filter(([, v]) => typeof v === 'number') as Array<[string, number]>;
    const max = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
    const palette = [
      'linear-gradient(90deg, #2a7ec6 0%, #1f5f98 100%)',
      'linear-gradient(90deg, #1f9b74 0%, #158666 100%)',
      'linear-gradient(90deg, #7b5cd4 0%, #5f46b0 100%)',
      'linear-gradient(90deg, #c67a1d 0%, #ab5e13 100%)',
      'linear-gradient(90deg, #b64343 0%, #8f2e2e 100%)',
    ];
    return entries.map(([label, raw], i) => ({
      label,
      raw,
      value: Math.max(2, Math.round((raw / max) * 100)),
      color: palette[i % palette.length],
    }));
  });

  async create() {
    if (!this.orgId() || !this.context().uid) return;
    this.creating.set(true);
    try {
      await this.reportsService.createReport(this.orgId(), {
        type: this.selectedType,
        name: this.reportName || 'Organization Report',
        createdBy: this.context().uid,
      });
    } finally {
      this.creating.set(false);
    }
  }
}
