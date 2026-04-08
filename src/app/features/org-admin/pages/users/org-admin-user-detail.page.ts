import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';
import { OrganizationAssignmentsService } from '../../../../core/organization/services/organization-assignments.service';
import { OrganizationProgressService } from '../../../../core/organization/services/organization-progress.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page" *ngIf="user() as u">
      <h2>User Detail</h2>
      <div class="grid">
        <article><h3>{{ u.displayName }}</h3><p>{{ u.email }}</p><p>{{ u.role }}</p></article>
        <article><h3>Assignments</h3><p>{{ assignments().length }}</p></article>
        <article><h3>Progress Records</h3><p>{{ progress().length }}</p></article>
      </div>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}article{border:1px solid #e1eaf3;border-radius:10px;padding:.7rem}`],
})
export class OrgAdminUserDetailPage {
  private readonly ctx = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(OrganizationUsersService);
  private readonly assignmentsService = inject(OrganizationAssignmentsService);
  private readonly progressService = inject(OrganizationProgressService);

  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  readonly uid = toSignal(this.route.paramMap.pipe(map((p) => p.get('uid') || '')), { initialValue: '' });
  readonly user = toSignal(this.route.paramMap.pipe(map((p) => p.get('uid') || ''), switchMap((uid) => this.users.getByUid(this.orgId(), uid))), { initialValue: null as any });
  readonly assignments = toSignal(this.route.paramMap.pipe(map((p) => p.get('uid') || ''), switchMap((uid) => this.assignmentsService.listByUser(this.orgId(), uid))), { initialValue: [] as any[] });
  readonly progress = toSignal(this.route.paramMap.pipe(map((p) => p.get('uid') || ''), switchMap((uid) => this.progressService.listByUser(this.orgId(), uid))), { initialValue: [] as any[] });
}
