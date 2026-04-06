import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramProgressService } from '../program-progress.service';
import { ProgramEnrollmentsService } from '../program-enrollments.service';

@Component({
  selector: 'app-program-admin-analytics-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="analytics-shell">
      <header>
        <p class="eyebrow">Program Platform</p>
        <h1>Program Admin Analytics</h1>
        <p>Public learning pathway analytics, isolated from organization tenant dashboards.</p>
      </header>

      <div class="kpi-grid">
        <article>
          <h3>Total Enrollments</h3>
          <strong>{{ enrollments().length }}</strong>
        </article>
        <article>
          <h3>Active Enrollments</h3>
          <strong>{{ activeCount() }}</strong>
        </article>
        <article>
          <h3>Approved Pending Activation</h3>
          <strong>{{ approvedCount() }}</strong>
        </article>
      </div>

      <div class="actions">
        <a routerLink="/program-admin/enrollments">Open Enrollments</a>
        <a routerLink="/program-admin/programs/list">Open Programs List</a>
      </div>
    </section>
  `,
  styles: [
    `
      .analytics-shell {
        border: 1px solid #d4e2ef;
        border-radius: 1rem;
        background: #fff;
        padding: 1rem;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        font-weight: 800;
        color: #507096;
      }

      h1 {
        margin: 0.35rem 0;
      }

      p {
        margin: 0;
        color: #617d99;
      }

      .kpi-grid {
        margin-top: 0.9rem;
        display: grid;
        gap: 0.7rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      article {
        border: 1px solid #dce7f3;
        border-radius: 0.8rem;
        padding: 0.8rem;
        background: #f8fbff;
      }

      article h3 {
        margin: 0;
        color: #5a7898;
        font-size: 0.8rem;
      }

      article strong {
        display: block;
        margin-top: 0.35rem;
        font-size: 1.5rem;
        color: #123a62;
      }

      .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .actions a {
        text-decoration: none;
        border-radius: 0.65rem;
        color: #fff;
        padding: 0.5rem 0.8rem;
        background: linear-gradient(135deg, #0f5ca6, #1a74c8);
      }

      @media (max-width: 940px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProgramAdminAnalyticsPage {
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);
  private readonly progressService = inject(ProgramProgressService);

  readonly enrollments = toSignal(this.enrollmentsService.getAllEnrollmentsForAdmin(), {
    initialValue: [],
  });

  readonly activeCount = computed(
    () => this.enrollments().filter((row) => row.status === 'active').length
  );

  readonly approvedCount = computed(
    () => this.enrollments().filter((row) => row.status === 'approved').length
  );

  protected readonly _progressService = this.progressService;
}
