import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationPoliciesService } from '../../../../core/organization/services/organization-policies.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Policies</h2>
      <table>
        <thead><tr><th>Title</th><th>Version</th><th>Status</th></tr></thead>
        <tbody>
          <tr *ngFor="let row of rows()"><td>{{ row.title }}</td><td>{{ row.version }}</td><td>{{ row.active ? 'active' : 'inactive' }}</td></tr>
          <tr *ngIf="!rows().length"><td colspan="3">No policy found.</td></tr>
        </tbody>
      </table>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.5rem}`],
})
export class OrgAdminPoliciesPage {
  private readonly ctx = inject(OrgContextService);
  private readonly policies = inject(OrganizationPoliciesService);
  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  readonly rows = toSignal(this.policies.list(this.orgId()), { initialValue: [] as any[] });
}
