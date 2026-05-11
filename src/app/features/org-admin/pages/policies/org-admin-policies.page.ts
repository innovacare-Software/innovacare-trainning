import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationPoliciesService } from '../../../../core/organization/services/organization-policies.service';
import { OrganizationAuditService } from '../../../../core/organization/services/organization-audit.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <div>
          <h2>Policies</h2>
          <p>Publish compliance references, keep versions visible and reactivate inactive policies when needed.</p>
        </div>
        <div class="header-badges">
          <span>{{ activeCount() }} active</span>
          <span>{{ inactiveCount() }} inactive</span>
        </div>
      </header>

      <section class="summary">
        <article><h3>{{ rows().length }}</h3><p>Total policies</p></article>
        <article><h3>{{ activeCount() }}</h3><p>Active</p></article>
        <article><h3>{{ latestVersion() }}</h3><p>Latest version</p></article>
        <article><h3>{{ filteredRows().length }}</h3><p>Visible in current filter</p></article>
      </section>

      <section class="composer">
        <label>Policy title
          <input [(ngModel)]="title" placeholder="Clinical safety protocol" />
        </label>
        <label>Version
          <input [(ngModel)]="version" placeholder="v1.0" />
        </label>
        <label class="full">Content
          <textarea [(ngModel)]="content" rows="4" placeholder="Enter policy guidance, expectations and rollout notes"></textarea>
        </label>
        <button type="button" (click)="createPolicy()" [disabled]="!canCreate()">Publish policy</button>
      </section>

      <section class="filters">
        <input [(ngModel)]="search" placeholder="Search by title or version" />
        <select [(ngModel)]="statusFilter">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      <table *ngIf="filteredRows().length; else emptyTpl">
        <thead><tr><th>Title</th><th>Version</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let row of filteredRows()">
            <td>
              <strong>{{ row.title }}</strong>
              <small>{{ row.content }}</small>
            </td>
            <td>{{ row.version }}</td>
            <td><span class="status-pill" [class.off]="!row.active">{{ row.active ? 'active' : 'inactive' }}</span></td>
            <td><button type="button" (click)="togglePolicy(row.id, !row.active)">{{ row.active ? 'Deactivate' : 'Activate' }}</button></td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No policy found</h3>
          <p>Create your first policy or adjust the status filter.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.75rem}.header-badges{display:flex;gap:.45rem;flex-wrap:wrap}.header-badges span{border:1px solid #d4e1ee;background:#f7fbff;color:#20476c;border-radius:999px;padding:.35rem .65rem;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem;margin:.8rem 0}.summary article,.composer,.empty{border:1px solid #dce7f2;border-radius:12px;background:#fff;padding:.8rem}.summary article{background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)}.summary h3{margin:0;color:#12395b}.summary p{margin:.2rem 0 0;color:#5f7994}.composer{display:grid;grid-template-columns:1fr 180px auto;gap:.6rem;align-items:end}.composer label{display:grid;gap:.3rem;color:#304f6b;font-weight:700}.composer .full{grid-column:1 / -2}.composer input,.composer textarea,.filters input,.filters select{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}.composer button,table button{border:0;border-radius:9px;background:#0f436e;color:#eff7ff;font-weight:700;padding:.55rem .8rem}.filters{display:grid;grid-template-columns:1.6fr 1fr;gap:.55rem;margin:.8rem 0}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.55rem;vertical-align:top}td strong{display:block;color:#163d61}td small{display:block;margin-top:.2rem;color:#6a829a;max-width:900px}.status-pill{display:inline-flex;border-radius:999px;padding:.22rem .55rem;background:#eef5fc;color:#1d4b73;font-size:.78rem;font-weight:700}.status-pill.off{background:#f4ecec;color:#8c3333}.empty{text-align:center;color:#56708a;border-style:dashed}@media(max-width:980px){header,.summary,.composer,.filters{grid-template-columns:1fr;display:grid}.composer .full{grid-column:auto}}`],
})
export class OrgAdminPoliciesPage {
  private readonly ctx = inject(OrgContextService);
  private readonly policies = inject(OrganizationPoliciesService);
  private readonly audit = inject(OrganizationAuditService);
  title = '';
  version = 'v1.0';
  content = '';
  search = '';
  statusFilter = 'all';
  private readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);
  readonly rows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.policies.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly activeCount = computed(() => this.rows().filter((row) => row.active).length);
  readonly inactiveCount = computed(() => this.rows().filter((row) => !row.active).length);
  readonly latestVersion = computed(() => this.rows()[0]?.version || '—');
  readonly filteredRows = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.rows().filter((row) => {
      const status = row.active ? 'active' : 'inactive';
      const byStatus = this.statusFilter === 'all' || status === this.statusFilter;
      const bySearch = !term || `${row.title || ''} ${row.version || ''} ${row.content || ''}`.toLowerCase().includes(term);
      return byStatus && bySearch;
    });
  });

  canCreate(): boolean {
    return !!this.orgId() && !!this.context().uid && !!this.title.trim() && !!this.version.trim() && !!this.content.trim();
  }

  async createPolicy(): Promise<void> {
    if (!this.canCreate()) {
      return;
    }
    const orgId = this.orgId();
    const actorUid = this.context().uid;
    await this.policies.create(orgId, {
      orgId,
      title: this.title.trim(),
      content: this.content.trim(),
      version: this.version.trim(),
      active: true,
      createdBy: actorUid,
    });
    await this.audit.write({
      orgId,
      actionType: 'policy_published',
      severity: 'info',
      module: 'policies',
      objectType: 'policy',
      objectId: this.title.trim(),
      actorUid,
      message: 'Policy published from org admin policies page.',
    });
    this.title = '';
    this.content = '';
    this.version = 'v1.0';
  }

  async togglePolicy(policyId: string | undefined, active: boolean): Promise<void> {
    if (!policyId || !this.orgId()) {
      return;
    }
    await this.policies.update(this.orgId(), policyId, { active });
  }
}
