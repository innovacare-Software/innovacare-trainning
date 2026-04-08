import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';

@Component({
  selector: 'app-org-progress-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header>
        <h1>Organization Progress</h1>
        <a [routerLink]="['/super-admin/organizations', orgId()]">Back to details</a>
      </header>

      <div class="cards" *ngIf="progress() as p">
        <article><h3>{{ p.totalEnrollments }}</h3><p>Total enrollments</p></article>
        <article><h3>{{ p.completedEnrollments }}</h3><p>Completed</p></article>
        <article><h3>{{ p.inProgressEnrollments }}</h3><p>In progress</p></article>
        <article><h3>{{ p.completionRate }}%</h3><p>Completion rate</p></article>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.4rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.8rem; }
    article { background: #fff; border: 1px solid #d8e4ef; border-radius: 12px; padding: 1rem; }
    h3 { margin: 0; color: #11365a; }
    p { margin: 0.3rem 0 0; color: #5e7691; }
    @media (max-width: 840px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `]
})
export class OrgProgressPage {
  private route = inject(ActivatedRoute);
  private organizations = inject(SuperAdminOrganizationsService);

  orgId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orgId') || '')), { initialValue: '' });

  progress = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('orgId') || ''),
      switchMap((orgId) => this.organizations.getOrganizationProgressOverview(orgId))
    ),
    {
      initialValue: {
        totalEnrollments: 0,
        completedEnrollments: 0,
        inProgressEnrollments: 0,
        completionRate: 0,
      },
    }
  );
}
