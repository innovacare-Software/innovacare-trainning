import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationAuditService } from '../../../../core/organization/services/organization-audit.service';

@Component({
  standalone: true,
  selector: 'app-org-admin-audit-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h2>Organization Audit Trail</h2>
        <p>Traceability: who did what, when, where, and impact level.</p>
      </header>

      <section class="summary" *ngIf="rows() as list">
        <article><h3>{{ list.length }}</h3><p>Total events</p></article>
        <article><h3>{{ criticalCount() }}</h3><p>Critical</p></article>
        <article><h3>{{ warningCount() }}</h3><p>Warnings</p></article>
      </section>

      <section class="filter-bar">
        <label>Search
          <input [(ngModel)]="search" placeholder="Action, object, actor" />
        </label>
        <label>Severity
          <select [(ngModel)]="severityFilter">
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label>Module
          <select [(ngModel)]="moduleFilter">
            <option *ngFor="let m of modules()" [value]="m">{{ m }}</option>
          </select>
        </label>
      </section>

      <section class="table-wrap">
        <table *ngIf="filtered().length; else emptyTpl">
          <thead>
            <tr><th>Action</th><th>Module</th><th>Object</th><th>Severity</th><th>Actor</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filtered()">
              <td>{{ row.actionType }}</td>
              <td>{{ row.module }}</td>
              <td>{{ row.objectType }} / {{ row.objectId }}</td>
              <td><span [class]="'badge ' + row.severity">{{ row.severity }}</span></td>
              <td>{{ row.actorEmail || row.actorUid || 'system' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #emptyTpl>
          <article class="empty">
            <h3>No audit events match your filters</h3>
            <p>Broaden severity/module filters to restore visibility.</p>
          </article>
        </ng-template>
      </section>
    </section>
  `,
  styles: [`
    .page { background: #fff; border: 1px solid #d8e4f0; border-radius: 12px; padding: 1rem; }
    h2 { margin: 0; color: #173f62; }
    p { margin: .35rem 0 0; color: #5f7994; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .7rem; margin-top: .8rem; }
    .summary article { border: 1px solid #dfe9f3; border-radius: 10px; padding: .7rem; background: #f8fbfe; }
    .summary h3 { margin: 0; }
    .summary p { margin: .22rem 0 0; }
    .filter-bar { margin: .8rem 0; display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: .7rem; }
    label { display: grid; gap: .3rem; font-weight: 700; color: #304f6b; }
    select, input { border: 1px solid #c7d8e9; border-radius: 8px; padding: .45rem .55rem; width: 100%; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e6edf4; text-align: left; padding: .55rem; }
    th { text-transform: uppercase; font-size: .76rem; color: #4f6985; }
    .badge { border-radius: 999px; border: 1px solid #cad8e7; padding: .15rem .45rem; text-transform: uppercase; font-size: .72rem; font-weight: 700; }
    .badge.critical { border-color: #edb1b1; color: #8d1e1e; background: #fff1f1; }
    .badge.warning { border-color: #efcf9c; color: #975a11; background: #fff8ec; }
    .empty { border: 1px dashed #c7d8e9; border-radius: 10px; padding: 1rem; text-align: center; color: #5e7a96; }
    .empty h3 { margin: 0 0 .3rem; color: #1f4668; }
    .empty p { margin: 0; }
    @media (max-width: 980px) { .summary, .filter-bar { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminAuditPage {
  private readonly ctx = inject(OrgContextService);
  private readonly audit = inject(OrganizationAuditService);

  severityFilter = 'all';
  moduleFilter = 'all';
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

  readonly rows = toSignal(this.audit.list(this.context()?.orgId || ''), { initialValue: [] as any[] });
  readonly modules = computed(() => ['all', ...new Set(this.rows().map((x) => x.module).filter(Boolean))]);

  readonly filtered = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.rows().filter((x) => {
      const bySeverity = this.severityFilter === 'all' || x.severity === this.severityFilter;
      const byModule = this.moduleFilter === 'all' || x.module === this.moduleFilter;
      const bySearch =
        !term || `${x.actionType || ''} ${x.objectType || ''} ${x.objectId || ''} ${x.actorEmail || ''}`.toLowerCase().includes(term);
      return bySeverity && byModule && bySearch;
    });
  });

  readonly criticalCount = computed(() => this.rows().filter((x) => x.severity === 'critical').length);
  readonly warningCount = computed(() => this.rows().filter((x) => x.severity === 'warning').length);
}
