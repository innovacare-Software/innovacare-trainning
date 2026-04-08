import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';

@Component({
  selector: 'app-org-policies-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Policies</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>
      <div class="panel">
        <ul>
          <li *ngFor="let policy of policies()">
            <strong>{{ policy.title || policy.id }}</strong>
            <span>{{ policy.status || 'draft' }}</span>
          </li>
          <li *ngIf="!policies().length">No policies found.</li>
        </ul>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.4rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .panel { background: #fff; border: 1px solid #dce6f1; border-radius: 12px; padding: 1rem; }
    ul { margin: 0; padding-left: 1rem; }
    li { margin-bottom: 0.45rem; color: #2f4964; }
    span { margin-left: 0.5rem; color: #6f859b; font-size: 0.84rem; text-transform: capitalize; }
  `]
})
export class OrgPoliciesPage {
  private route = inject(ActivatedRoute);
  private organizations = inject(SuperAdminOrganizationsService);

  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });

  policies = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('orgId') || ''),
      switchMap((orgId) => this.organizations.getOrganizationPolicies(orgId))
    ),
    { initialValue: [] }
  );
}
