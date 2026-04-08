import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { OrganizationTroubleshootingService } from '../../../../core/organization/services/organization-troubleshooting.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Troubleshooting</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>
      <div class="columns">
        <article class="panel">
          <h3>Issues</h3>
          <ul>
            <li *ngFor="let i of issues()">{{ i.title }} ({{ i.status }})</li>
            <li *ngIf="!issues().length">No troubleshooting issue.</li>
          </ul>
        </article>
        <article class="panel">
          <h3>Recommendations</h3>
          <ul>
            <li *ngFor="let r of recommendations()">{{ r }}</li>
            <li *ngIf="!recommendations().length">No recommendation.</li>
          </ul>
        </article>
      </div>
    </section>
  `,
  styles: [`.page{padding:1.4rem}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem}.columns{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.panel{background:#fff;border:1px solid #dce6f1;border-radius:12px;padding:1rem}ul{margin:0;padding-left:1rem}`],
})
export class OrgTroubleshootingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly troubleshooting = inject(OrganizationTroubleshootingService);
  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });
  issues = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || ''), switchMap((id) => this.troubleshooting.list(id))), { initialValue: [] as any[] });
  recommendations = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || ''), switchMap((id) => this.troubleshooting.recommendations(id))), { initialValue: [] as string[] });
}
