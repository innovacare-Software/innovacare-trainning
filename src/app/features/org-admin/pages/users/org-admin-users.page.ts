import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header>
        <div>
          <h2>Organization Users</h2>
          <p>{{ filtered().length }} matching users across the current organization scope</p>
        </div>
        <div class="head-badges">
          <span>Org {{ orgId() || 'n/a' }}</span>
          <span>{{ activeUsersCount() }} active</span>
        </div>
      </header>

      <section class="summary">
        <article><h3>{{ users().length }}</h3><p>Total users</p></article>
        <article><h3>{{ adminCount() }}</h3><p>Org admins</p></article>
        <article><h3>{{ managerCount() }}</h3><p>Managers</p></article>
        <article><h3>{{ learnerCount() }}</h3><p>Learners</p></article>
      </section>

      <section class="filters">
        <input [(ngModel)]="search" placeholder="Search by name or email" />
        <select [(ngModel)]="roleFilter">
          <option value="all">All roles</option>
          <option value="org_admin">Org Admin</option>
          <option value="org_manager">Org Manager</option>
          <option value="org_learner">Org Learner</option>
        </select>
        <select [(ngModel)]="statusFilter">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      <table *ngIf="paged().length; else emptyTpl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let u of paged()">
            <td>
              <strong>{{ u.displayName || 'Unnamed user' }}</strong>
              <small *ngIf="u.title">{{ u.title }}</small>
            </td>
            <td>{{ u.email }}</td>
            <td><span class="role-pill">{{ u.role }}</span></td>
            <td>{{ u.department || '—' }}</td>
            <td><span class="status-pill" [class.off]="u.active === false">{{ u.active === false ? 'inactive' : 'active' }}</span></td>
            <td><a [routerLink]="['/org-admin/users', u.uid]">View</a></td>
          </tr>
        </tbody>
      </table>

      <footer class="pager" *ngIf="totalPages() > 1">
        <button type="button" (click)="prevPage()" [disabled]="page <= 1">Previous</button>
        <span>Page {{ page }} / {{ totalPages() }}</span>
        <button type="button" (click)="nextPage()" [disabled]="page >= totalPages()">Next</button>
      </footer>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No users found</h3>
          <p>Adjust filters or onboard users in this organization scope.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.6rem}header h2{margin:0}header p{margin:.15rem 0 0;color:#5c7894}.head-badges{display:flex;gap:.45rem;flex-wrap:wrap}.head-badges span{border:1px solid #d4e1ee;background:#f8fbff;color:#20476c;border-radius:999px;padding:.35rem .65rem;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;margin:.8rem 0}.summary article{border:1px solid #dce8f2;border-radius:10px;padding:.7rem;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)}.summary h3{margin:0;color:#12395b}.summary p{margin:.2rem 0 0;color:#5f7994}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:.5rem;margin:.7rem 0}.filters input,.filters select{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.6rem .5rem;vertical-align:top}td strong{display:block;color:#163d61}td small{display:block;margin-top:.18rem;color:#6a829a}.role-pill,.status-pill{display:inline-flex;align-items:center;border-radius:999px;padding:.25rem .55rem;font-size:.78rem;font-weight:700;background:#eef5fc;color:#1d4b73}.status-pill.off{background:#f4ecec;color:#8c3333}.pager{display:flex;justify-content:flex-end;gap:.6rem;align-items:center;margin-top:.65rem}.pager button{border:1px solid #c7d8e9;background:#fff;border-radius:8px;padding:.35rem .6rem}.empty{border:1px dashed #c6d7e9;border-radius:10px;padding:1rem;text-align:center;color:#56708a}@media(max-width:900px){header,.filters,.summary{grid-template-columns:1fr;display:grid}.head-badges{justify-content:flex-start}}`],
})
export class OrgAdminUsersPage {
  private readonly ctx = inject(OrgContextService);
  private readonly usersService = inject(OrganizationUsersService);
  search = '';
  roleFilter = 'all';
  statusFilter = 'all';
  page = 1;
  pageSize = 10;

  private readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);
  readonly users = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.usersService.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly activeUsersCount = computed(() => this.users().filter((u) => u.active !== false).length);
  readonly adminCount = computed(() => this.users().filter((u) => u.role === 'org_admin').length);
  readonly managerCount = computed(() => this.users().filter((u) => u.role === 'org_manager').length);
  readonly learnerCount = computed(() => this.users().filter((u) => u.role === 'org_learner').length);
  readonly filtered = computed(() => {
    const term = this.search.toLowerCase().trim();
    return this.users().filter((u) => {
      const matchesTerm = !term || `${u.displayName || ''} ${u.email || ''}`.toLowerCase().includes(term);
      const matchesRole = this.roleFilter === 'all' || u.role === this.roleFilter;
      const status = u.active === false ? 'inactive' : 'active';
      const matchesStatus = this.statusFilter === 'all' || status === this.statusFilter;
      return matchesTerm && matchesRole && matchesStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  readonly paged = computed(() => {
    const safePage = Math.min(this.page, this.totalPages());
    const start = (safePage - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  nextPage() {
    this.page = Math.min(this.totalPages(), this.page + 1);
  }

  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }
}
