import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationOverdueService } from '../../../../core/organization/services/organization-overdue.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Overdue / Compliance Follow-Up</h2>
      <table>
        <thead><tr><th>User</th><th>Course</th><th>Overdue days</th><th>Status</th></tr></thead>
        <tbody>
          <tr *ngFor="let row of rows()"><td>{{ row.userId }}</td><td>{{ row.courseId }}</td><td>{{ row.overdueDays }}</td><td>{{ row.status }}</td></tr>
          <tr *ngIf="!rows().length"><td colspan="4">No overdue record.</td></tr>
        </tbody>
      </table>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.5rem}`],
})
export class OrgAdminOverduePage {
  private readonly ctx = inject(OrgContextService);
  private readonly overdue = inject(OrganizationOverdueService);
  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  readonly rows = toSignal(this.overdue.list(this.orgId()), { initialValue: [] as any[] });
}
