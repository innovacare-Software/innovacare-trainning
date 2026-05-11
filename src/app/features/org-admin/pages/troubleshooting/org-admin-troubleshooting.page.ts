import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationTroubleshootingService } from '../../../../core/organization/services/organization-troubleshooting.service';

@Component({
  standalone: true,
  selector: 'app-org-admin-troubleshooting-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h2>Troubleshooting Panel</h2>
        <p>Risk-first diagnostics with action-oriented remediation.</p>
      </header>

      <section class="summary">
        <article><h3>{{ issues().length }}</h3><p>Total issues</p></article>
        <article><h3>{{ openCount() }}</h3><p>Open/In progress</p></article>
        <article><h3>{{ highRiskCount() }}</h3><p>High/Critical risk</p></article>
      </section>

      <section class="filters">
        <label>Search
          <input [(ngModel)]="search" placeholder="Issue title, type, risk" />
        </label>
        <label>Status
          <select [(ngModel)]="statusFilter">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>Risk
          <select [(ngModel)]="riskFilter">
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </section>

      <section class="columns">
        <article class="panel">
          <h3>Detected Issues ({{ filteredIssues().length }})</h3>
          <ul *ngIf="filteredIssues().length; else issuesEmpty">
            <li *ngFor="let issue of filteredIssues()">
              <strong>{{ issue.title }}</strong>
              <span>{{ issue.type }} · {{ issue.status }} · {{ issue.riskLevel }}</span>
              <p>{{ issue.description }}</p>
            </li>
          </ul>
          <ng-template #issuesEmpty>
            <article class="empty">
              <h4>No issues match current filters</h4>
              <p>Clear filters to inspect all tracked incidents.</p>
            </article>
          </ng-template>
        </article>

        <article class="panel">
          <h3>Recommended Quick Fixes</h3>
          <ul *ngIf="recommendations().length; else recEmpty">
            <li *ngFor="let tip of recommendations()">{{ tip }}</li>
          </ul>
          <ng-template #recEmpty>
            <article class="empty">
              <h4>No recommendation generated</h4>
              <p>Recommendations appear once issue patterns are detected.</p>
            </article>
          </ng-template>
        </article>
      </section>
    </section>
  `,
  styles: [`
    .page { background: #fff; border: 1px solid #d8e4f0; border-radius: 12px; padding: 1rem; }
    .summary { margin-top: .75rem; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; }
    .summary article { border: 1px solid #dce8f2; border-radius: 10px; padding: .6rem; background: #f8fbff; }
    .summary h3 { margin: 0; color: #143f64; }
    .summary p { margin: .2rem 0 0; color: #5d7894; }
    .filters { margin-top: .7rem; display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: .6rem; }
    label { display: grid; gap: .3rem; font-weight: 700; color: #304f6b; }
    select, input { border: 1px solid #c7d8e9; border-radius: 8px; padding: .45rem .55rem; width: 100%; }
    .columns { margin-top: .8rem; display: grid; grid-template-columns: 1.1fr .9fr; gap: .75rem; }
    .panel { border: 1px solid #dce8f2; border-radius: 10px; padding: .7rem; background: #f9fcff; }
    .panel h3 { margin: 0 0 .45rem; color: #153d60; }
    ul { margin: 0; padding-left: 1rem; }
    li { margin-bottom: .4rem; color: #2d4e6d; }
    li span { display: block; color: #5f7a95; font-size: .84rem; }
    li p { margin: .2rem 0 0; font-size: .88rem; }
    .empty { border: 1px dashed #c7d8e9; border-radius: 10px; padding: .9rem; text-align: center; color: #607d98; background: #fbfdff; }
    .empty h4 { margin: 0 0 .3rem; color: #214768; }
    .empty p { margin: 0; }
    @media (max-width: 900px) { .columns, .summary, .filters { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminTroubleshootingPage {
  private readonly ctx = inject(OrgContextService);
  private readonly troubleshooting = inject(OrganizationTroubleshootingService);

  statusFilter = 'all';
  riskFilter = 'all';
  search = '';

  private readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });

  readonly orgId = computed(() => this.context().orgId || '');
  readonly issues = toSignal(this.troubleshooting.list(this.orgId()), { initialValue: [] as any[] });
  readonly recommendations = toSignal(this.troubleshooting.recommendations(this.orgId()), { initialValue: [] as string[] });

  readonly filteredIssues = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.issues().filter((issue) => {
      const byStatus = this.statusFilter === 'all' || issue.status === this.statusFilter;
      const byRisk = this.riskFilter === 'all' || issue.riskLevel === this.riskFilter;
      const bySearch =
        !term || `${issue.title || ''} ${issue.type || ''} ${issue.description || ''} ${issue.riskLevel || ''}`.toLowerCase().includes(term);
      return byStatus && byRisk && bySearch;
    });
  });

  readonly openCount = computed(() => this.issues().filter((x) => x.status === 'open' || x.status === 'in_progress').length);
  readonly highRiskCount = computed(() => this.issues().filter((x) => x.riskLevel === 'critical' || x.riskLevel === 'high').length);
}
