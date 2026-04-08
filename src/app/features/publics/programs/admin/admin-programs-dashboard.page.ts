import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramEnrollmentStatus, ProgramStatus } from '../program.models';
import { ProgramEnrollmentsService } from '../program-enrollments.service';
import { ProgramsService } from '../programs.service';

@Component({
  selector: 'app-admin-programs-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="dash">
      <header>
        <p class="eyebrow">Admin Dashboard</p>
        <h1>Programs Control Center</h1>
      </header>

      <div class="kpis">
        <article>
          <h3>Total Programs</h3>
          <p>{{ programs().length }}</p>
        </article>
        <article>
          <h3>Published Programs</h3>
          <p>{{ publishedCount() }}</p>
        </article>
        <article>
          <h3>Enrollments</h3>
          <p>{{ enrollments().length }}</p>
        </article>
        <article>
          <h3>Pending Review</h3>
          <p>{{ pendingReviewCount() }}</p>
        </article>
      </div>

      <div class="actions">
        <a routerLink="/program-admin/programs/list">Manage Programs</a>
        <a routerLink="/program-admin/programs/new">Create Program</a>
        <a routerLink="/program-admin/enrollments">Review Enrollments</a>
        <a routerLink="/program-admin/analytics">Analytics</a>
      </div>
    </section>
  `,
  styles: [
    `
      .dash {
        border: 1px solid #d6e2ef;
        border-radius: 1rem;
        background: #fff;
        padding: 1rem;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.72rem;
        color: #547296;
        font-weight: 800;
      }

      h1 {
        margin: 0.45rem 0 0;
      }

      .kpis {
        margin-top: 0.9rem;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.7rem;
      }

      article {
        border: 1px solid #d9e5f2;
        border-radius: 0.8rem;
        padding: 0.75rem;
        background: #f8fbff;
      }

      article h3 {
        margin: 0;
        font-size: 0.8rem;
        color: #5f7c9a;
      }

      article p {
        margin: 0.35rem 0 0;
        font-size: 1.6rem;
        font-weight: 800;
        color: #153d66;
      }

      .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
      }

      .actions a {
        text-decoration: none;
        border-radius: 0.7rem;
        padding: 0.52rem 0.8rem;
        color: #fff;
        background: linear-gradient(135deg, #1a74c8, #0f5ca6);
      }

      @media (max-width: 980px) {
        .kpis {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class AdminProgramsDashboardPage {
  private readonly programsService = inject(ProgramsService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);

  readonly programs = toSignal(this.programsService.getAdminPrograms(), { initialValue: [] });
  readonly enrollments = toSignal(this.enrollmentsService.getAllEnrollmentsForAdmin(), {
    initialValue: [],
  });

  readonly publishedCount = computed(
    () => this.programs().filter((p) => p.status === ProgramStatus.PUBLISHED && p.active).length
  );

  readonly pendingReviewCount = computed(
    () =>
      this.enrollments().filter((s) => s.status === ProgramEnrollmentStatus.PENDING).length
  );
}
