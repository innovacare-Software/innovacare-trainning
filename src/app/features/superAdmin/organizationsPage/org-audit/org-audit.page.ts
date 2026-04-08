import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { OrganizationAuditService } from '../../../../core/organization/services/organization-audit.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Audit</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>
      <div class="panel">
        <table>
          <thead><tr><th>Action</th><th>Module</th><th>Severity</th><th>Actor</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of rows()"><td>{{ r.actionType }}</td><td>{{ r.module }}</td><td>{{ r.severity }}</td><td>{{ r.actorEmail || r.actorUid || 'system' }}</td></tr>
            <tr *ngIf="!rows().length"><td colspan="4">No audit events.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`.page{padding:1.4rem}.panel{background:#fff;border:1px solid #dce6f1;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e4ebf2;text-align:left;padding:.55rem}`],
})
export class OrgAuditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly audit = inject(OrganizationAuditService);
  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });
  rows = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || ''), switchMap((id) => this.audit.list(id))), { initialValue: [] as any[] });
}
