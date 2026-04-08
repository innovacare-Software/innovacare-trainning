import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header>
        <h2>Organization Users</h2>
        <p>{{ filtered().length }} matching users</p>
      </header>

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
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let u of paged()">
            <td>{{ u.displayName }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.active === false ? 'inactive' : 'active' }}</td>
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
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.6rem}header h2{margin:0}header p{margin:0;color:#5c7894}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:.5rem;margin:.7rem 0}.filters input,.filters select{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.5rem}.pager{display:flex;justify-content:flex-end;gap:.6rem;align-items:center;margin-top:.65rem}.pager button{border:1px solid #c7d8e9;background:#fff;border-radius:8px;padding:.35rem .6rem}.empty{border:1px dashed #c6d7e9;border-radius:10px;padding:1rem;text-align:center;color:#56708a}@media(max-width:900px){.filters{grid-template-columns:1fr}}`],
})
export class OrgAdminUsersPage {
  private readonly ctx = inject(OrgContextService);
  private readonly usersService = inject(OrganizationUsersService);
  search = '';
  roleFilter = 'all';
  statusFilter = 'all';
  page = 1;
  pageSize = 10;

  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  readonly users = toSignal(this.usersService.list(this.orgId()), { initialValue: [] as any[] });
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
