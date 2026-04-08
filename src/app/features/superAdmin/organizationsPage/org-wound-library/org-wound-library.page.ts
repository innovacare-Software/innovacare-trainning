import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';

@Component({
  selector: 'app-org-wound-library-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Wound Library</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>

      <div class="panel">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Updated</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of items()">
              <td>{{ item.name || item.id }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ item.updatedAt?.toDate ? (item.updatedAt.toDate() | date:'short') : '—' }}</td>
            </tr>
            <tr *ngIf="!items().length"><td colspan="3">No wound library items found.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.4rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .panel { background: #fff; border: 1px solid #dce6f1; border-radius: 12px; padding: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e4ebf2; text-align: left; padding: 0.55rem; }
    th { color: #4f6782; text-transform: uppercase; font-size: 0.78rem; }
  `]
})
export class OrgWoundLibraryPage {
  private route = inject(ActivatedRoute);
  private organizations = inject(SuperAdminOrganizationsService);

  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });

  items = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('orgId') || ''),
      switchMap((orgId) => this.organizations.getOrganizationWoundLibrary(orgId))
    ),
    { initialValue: [] }
  );
}
