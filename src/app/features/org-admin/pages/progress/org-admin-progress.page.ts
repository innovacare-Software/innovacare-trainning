import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationProgressService } from '../../../../core/organization/services/organization-progress.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <div>
          <h2>Progress Management</h2>
          <p>Track progression, identify stalled learners and surface intervention priorities.</p>
        </div>
        <div class="header-badges">
          <span>{{ rows().length }} records</span>
          <span>{{ atRiskRows().length }} at risk</span>
        </div>
      </header>

      <section class="summary">
        <article><h3>{{ completionRate() }}%</h3><p>Completion rate</p></article>
        <article><h3>{{ averageProgress() }}%</h3><p>Average progress</p></article>
        <article><h3>{{ inProgressCount() }}</h3><p>In progress</p></article>
        <article><h3>{{ overdueCount() }}</h3><p>Overdue</p></article>
      </section>

      <section class="chart-card">
        <div class="chart-row" *ngFor="let item of statusChartRows()">
          <div class="chart-meta">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
          <div class="chart-track">
            <div class="chart-fill" [style.width.%]="item.width" [style.background]="item.color"></div>
          </div>
        </div>
      </section>

      <section class="filters">
        <input [(ngModel)]="search" placeholder="Search by learner or course id" />
        <select [(ngModel)]="statusFilter">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
          <option value="not_started">Not started</option>
          <option value="overdue">Overdue</option>
        </select>
        <select [(ngModel)]="sortBy">
          <option value="risk">Sort by risk</option>
          <option value="progress-desc">Highest progress</option>
          <option value="progress-asc">Lowest progress</option>
          <option value="user">Learner</option>
        </select>
      </section>

      <section class="content-grid">
        <article class="panel table-panel">
          <h3>Progress Records</h3>
          <table *ngIf="filteredRows().length; else emptyTpl">
            <thead><tr><th>Learner</th><th>Course</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of filteredRows()">
                <td>
                  <strong>{{ userLabel(row.userId) }}</strong>
                  <small>{{ row.userId }}</small>
                </td>
                <td>{{ row.courseId }}</td>
                <td><span class="status-pill" [class.warn]="row.status === 'overdue'">{{ row.status }}</span></td>
                <td>
                  <div class="mini-progress">
                    <div class="mini-progress__fill" [style.width.%]="clampPct(row.progressPct)"></div>
                  </div>
                  <small>{{ clampPct(row.progressPct) }}%</small>
                </td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="panel risk-panel">
          <h3>Users At Risk</h3>
          <ul *ngIf="atRiskRows().length; else noRiskTpl">
            <li *ngFor="let row of atRiskRows() | slice:0:8">
              <strong>{{ userLabel(row.userId) }}</strong>
              <span>{{ row.courseId }} · {{ row.status }} · {{ clampPct(row.progressPct) }}%</span>
            </li>
          </ul>
        </article>
      </section>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No progress record</h3>
          <p>Assignments and learner activity will appear here as soon as the org-scoped progress collection is populated.</p>
        </article>
      </ng-template>

      <ng-template #noRiskTpl>
        <article class="empty compact">
          <h3>No immediate risk detected</h3>
          <p>There are no overdue or critically stalled learners in the current view.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.75rem}.header-badges{display:flex;gap:.45rem;flex-wrap:wrap}.header-badges span{border:1px solid #d4e1ee;background:#f7fbff;color:#20476c;border-radius:999px;padding:.35rem .65rem;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem;margin:.8rem 0}.summary article,.panel,.chart-card{border:1px solid #dce7f2;border-radius:12px;background:#fff;padding:.8rem}.summary article{background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)}.summary h3{margin:0;color:#12395b}.summary p{margin:.2rem 0 0;color:#5f7994}.chart-card{display:grid;gap:.65rem;background:linear-gradient(135deg,#ffffff 0%,#f4f9ff 100%)}.chart-row{display:grid;gap:.35rem}.chart-meta{display:flex;justify-content:space-between;font-weight:700;color:#21496c}.chart-track,.mini-progress{height:14px;border-radius:999px;background:#e6eef7;border:1px solid #d2dfeb;overflow:hidden}.chart-fill,.mini-progress__fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#2878c4 0%,#12589a 100%)}.filters{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:.55rem;margin:.8rem 0}.filters input,.filters select{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}.content-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:.7rem}.table-panel h3,.risk-panel h3{margin:0 0 .6rem;color:#173f62}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.55rem;vertical-align:top}td strong{display:block;color:#163d61}td small{display:block;margin-top:.18rem;color:#6a829a}.status-pill{display:inline-flex;border-radius:999px;padding:.2rem .55rem;background:#eef5fc;color:#1d4b73;font-size:.78rem;font-weight:700;text-transform:capitalize}.status-pill.warn{background:#fff1ec;color:#964d11}.risk-panel ul{margin:0;padding-left:1rem}.risk-panel li{margin-bottom:.45rem;color:#294d70}.risk-panel span{display:block;color:#68839d;font-size:.82rem}.empty{border:1px dashed #c6d7e9;border-radius:10px;padding:1rem;text-align:center;color:#56708a}.compact{margin:0}@media(max-width:980px){header,.summary,.filters,.content-grid{grid-template-columns:1fr;display:grid}}`],
})
export class OrgAdminProgressPage {
  private readonly ctx = inject(OrgContextService);
  private readonly progress = inject(OrganizationProgressService);
  private readonly users = inject(OrganizationUsersService);
  search = '';
  statusFilter = 'all';
  sortBy = 'risk';
  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);
  readonly rows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.progress.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly userRows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.users.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly averageProgress = computed(() => this.rows().length ? Math.round(this.rows().reduce((sum, row) => sum + this.clampPct(row.progressPct), 0) / this.rows().length) : 0);
  readonly completionRate = computed(() => this.rows().length ? Math.round((this.rows().filter((row) => row.status === 'completed').length / this.rows().length) * 100) : 0);
  readonly inProgressCount = computed(() => this.rows().filter((row) => row.status === 'in_progress').length);
  readonly overdueCount = computed(() => this.rows().filter((row) => row.status === 'overdue').length);
  readonly atRiskRows = computed(() => this.rows().filter((row) => row.status === 'overdue' || this.clampPct(row.progressPct) < 25).sort((a, b) => this.riskWeight(b) - this.riskWeight(a)));
  readonly filteredRows = computed(() => {
    const term = this.search.trim().toLowerCase();
    const filtered = this.rows().filter((row) => {
      const byStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const bySearch = !term || `${this.userLabel(row.userId)} ${row.userId || ''} ${row.courseId || ''}`.toLowerCase().includes(term);
      return byStatus && bySearch;
    });
    return [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'progress-desc':
          return this.clampPct(b.progressPct) - this.clampPct(a.progressPct);
        case 'progress-asc':
          return this.clampPct(a.progressPct) - this.clampPct(b.progressPct);
        case 'user':
          return this.userLabel(a.userId).localeCompare(this.userLabel(b.userId));
        default:
          return this.riskWeight(b) - this.riskWeight(a);
      }
    });
  });
  readonly statusChartRows = computed(() => {
    const total = Math.max(1, this.rows().length);
    const statuses = [
      { label: 'Completed', count: this.rows().filter((row) => row.status === 'completed').length, color: 'linear-gradient(90deg,#1f9b74 0%,#158666 100%)' },
      { label: 'In Progress', count: this.rows().filter((row) => row.status === 'in_progress').length, color: 'linear-gradient(90deg,#2f78c4 0%,#1f5e9f 100%)' },
      { label: 'Not Started', count: this.rows().filter((row) => row.status === 'not_started').length, color: 'linear-gradient(90deg,#91a9bf 0%,#748da6 100%)' },
      { label: 'Overdue', count: this.rows().filter((row) => row.status === 'overdue').length, color: 'linear-gradient(90deg,#d07a1d 0%,#b35f11 100%)' },
    ];
    return statuses.map((item) => ({ label: item.label, value: item.count, width: Math.max(2, Math.round((item.count / total) * 100)), color: item.color }));
  });

  userLabel(userId: string): string {
    const user = this.userRows().find((row) => row.uid === userId);
    return user?.displayName || user?.email || userId;
  }

  clampPct(value: unknown): number {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  private riskWeight(row: any): number {
    const overdueBoost = row.status === 'overdue' ? 200 : 0;
    return overdueBoost + (100 - this.clampPct(row.progressPct));
  }
}
