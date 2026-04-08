import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';

@Component({
  selector: 'app-org-users-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Users</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>
      <div class="panel" *ngIf="users() as rows">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let user of rows">
              <td>{{ user.displayName || '—' }}</td>
              <td>{{ user.email || '—' }}</td>
              <td>{{ user.role }}</td>
              <td>{{ user.active === false ? 'Disabled' : 'Active' }}</td>
            </tr>
            <tr *ngIf="!rows.length"><td colspan="4">No users found.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.4rem; }
    .panel { background: #fff; border: 1px solid #dbe7f2; border-radius: 12px; padding: 1rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e6edf4; text-align: left; padding: 0.6rem; }
    th { font-size: 0.78rem; text-transform: uppercase; color: #546f89; }
  `]
})
export class OrgUsersPage {
  private route = inject(ActivatedRoute);
  private organizations = inject(SuperAdminOrganizationsService);

  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });

  users = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('orgId') || ''),
      switchMap((orgId) => this.organizations.getOrganizationUsers(orgId))
    ),
    { initialValue: [] }
  );
}
