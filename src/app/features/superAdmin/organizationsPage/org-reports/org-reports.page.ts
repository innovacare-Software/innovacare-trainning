import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { OrganizationReportsService } from '../../../../core/organization/services/organization-reports.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Reports</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>
      <div class="panel">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of reports()"><td>{{ r.name }}</td><td>{{ r.type }}</td><td>{{ r.status || 'ready' }}</td></tr>
            <tr *ngIf="!reports().length"><td colspan="3">No report found.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`.page{padding:1.4rem}.panel{background:#fff;border:1px solid #dce6f1;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e4ebf2;text-align:left;padding:.55rem}`],
})
export class OrgReportsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(OrganizationReportsService);
  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });
  reports = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || ''), switchMap((id) => this.reportsService.list(id))), { initialValue: [] as any[] });
}
