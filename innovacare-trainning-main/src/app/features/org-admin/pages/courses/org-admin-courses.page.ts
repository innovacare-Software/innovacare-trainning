import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationCoursesVisibilityService } from '../../../../core/organization/services/organization-courses-visibility.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Organization Courses</h2>
      <table>
        <thead><tr><th>CourseId</th><th>Title</th><th>Status</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of rows()"><td>{{ c.courseId }}</td><td>{{ c.title || '—' }}</td><td>{{ c.active === false ? 'inactive' : 'active' }}</td></tr>
          <tr *ngIf="!rows().length"><td colspan="3">No visible course assigned to this organization.</td></tr>
        </tbody>
      </table>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem} table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.5rem}`],
})
export class OrgAdminCoursesPage {
  private readonly ctx = inject(OrgContextService);
  private readonly service = inject(OrganizationCoursesVisibilityService);
  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  readonly rows = toSignal(this.ctx.context$.pipe(
    switchMap((context) => this.service.listVisibleCourses(context.orgId || ''))
  ), { initialValue: [] });
}
