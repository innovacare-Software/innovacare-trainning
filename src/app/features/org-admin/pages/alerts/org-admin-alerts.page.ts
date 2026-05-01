import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationAlertsService } from '../../../../core/organization/services/organization-alerts.service';
import { OrganizationFollowUpService } from '../../../../core/organization/services/organization-follow-up.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-org-admin-alerts-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h2>Alerts Center</h2>
        <p>Severity-driven queue with follow-up orchestration.</p>
      </header>

      <section class="summary" *ngIf="rows() as r">
        <article><h3>{{ r.length }}</h3><p>Total alerts</p></article>
        <article><h3>{{ openCount() }}</h3><p>Open</p></article>
        <article><h3>{{ criticalCount() }}</h3><p>Critical</p></article>
      </section>

      <section class="filters">
        <label>Search
          <input [(ngModel)]="search" placeholder="Search alerts" />
        </label>
        <label>Status
          <select [(ngModel)]="statusFilter">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
        <label>Severity
          <select [(ngModel)]="severityFilter">
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </section>

      <table *ngIf="filtered().length; else emptyTpl">
        <thead><tr><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of filtered()">
            <td>{{ a.title }}</td>
            <td>{{ a.type }}</td>
            <td><span [class]="'sev ' + a.severity">{{ a.severity }}</span></td>
            <td>{{ a.status }}</td>
            <td>
              <button (click)="ack(a.id)">Ack</button>
              <button (click)="resolve(a.id)">Resolve</button>
              <button (click)="followUp(a.id)">Follow-up</button>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No alerts in this view</h3>
          <p>Adjust filters or wait for the next trigger cycle.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`
    .page { background: #fff; border: 1px solid #d8e4f0; border-radius: 12px; padding: 1rem; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .65rem; margin-top: .7rem; }
    .summary article { border: 1px solid #dce8f2; border-radius: 10px; padding: .6rem; background: #f8fbff; }
    .summary h3 { margin: 0; }
    .summary p { margin: .2rem 0 0; color: #5f7a95; }
    .filters { margin: .8rem 0; display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: .5rem; }
    label { color: #3e5b76; font-weight: 700; font-size: .85rem; display: grid; gap: .3rem; }
    select, input { border: 1px solid #c7d8e9; border-radius: 8px; padding: .45rem .55rem; width: 100%; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e6edf4; text-align: left; padding: .55rem; }
    th { text-transform: uppercase; font-size: .76rem; color: #4f6985; }
    button { border: 1px solid #c5d6e7; background: #fff; border-radius: 8px; padding: .3rem .5rem; margin-right: .3rem; }
    .sev { text-transform: uppercase; font-size: .72rem; font-weight: 700; }
    .sev.critical { color: #972020; }
    .sev.high { color: #a15b0d; }
    .empty { border: 1px dashed #c6d7e9; border-radius: 10px; padding: 1rem; text-align: center; color: #56708a; }
    @media (max-width: 980px) {
      .summary, .filters { grid-template-columns: 1fr; }
    }
  `],
})
export class OrgAdminAlertsPage {
  private readonly ctx = inject(OrgContextService);
  private readonly alerts = inject(OrganizationAlertsService);
  private readonly followUpService = inject(OrganizationFollowUpService);

  statusFilter = 'all';
  severityFilter = 'all';
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
  private readonly orgId$ = toObservable(this.orgId);
  readonly rows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.alerts.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });

  readonly filtered = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.rows().filter((x) => {
      const matchesStatus = this.statusFilter === 'all' || x.status === this.statusFilter;
      const matchesSeverity = this.severityFilter === 'all' || x.severity === this.severityFilter;
      const matchesSearch =
        !term || `${x.title || ''} ${x.type || ''} ${x.status || ''} ${x.message || ''}`.toLowerCase().includes(term);
      return matchesStatus && matchesSeverity && matchesSearch;
    });
  });

  readonly openCount = computed(() => this.rows().filter((x) => ['open', 'acknowledged', 'in_progress'].includes(x.status)).length);
  readonly criticalCount = computed(() => this.rows().filter((x) => x.severity === 'critical').length);

  async ack(id?: string) {
    if (!id) return;
    await this.alerts.updateStatus(this.orgId(), id, 'acknowledged');
  }

  async resolve(id?: string) {
    if (!id) return;
    await this.alerts.updateStatus(this.orgId(), id, 'resolved');
  }

  async followUp(id?: string) {
    if (!id || !this.context().uid) return;
    await this.followUpService.create(this.orgId(), {
      orgId: this.orgId(),
      alertId: id,
      type: 'reminder',
      status: 'open',
      assignedTo: this.context().uid,
      note: 'Auto-created from Alerts center',
    });
  }
}
