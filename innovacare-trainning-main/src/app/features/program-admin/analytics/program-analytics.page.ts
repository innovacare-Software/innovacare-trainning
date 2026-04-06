import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramAdminAnalyticsService } from '../services/program-admin-analytics.service';
import { PROGRAM_CATEGORY_LABELS, PROGRAM_ENROLLMENT_STATUS_LABELS } from '../shared/program-admin.models';

@Component({
  selector: 'app-program-analytics-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="analytics-shell">
      <header>
        <p class="eyebrow">Program Platform</p>
        <h1>Program Analytics</h1>
        <p>Global analytics across public programs and enrollments.</p>
      </header>

      <section class="kpis" *ngIf="stats() as s">
        <article><h3>Total Programs</h3><strong>{{ s.totalPrograms }}</strong></article>
        <article><h3>Published</h3><strong>{{ s.publishedPrograms }}</strong></article>
        <article><h3>Pending Enrollments</h3><strong>{{ s.pendingEnrollments }}</strong></article>
        <article><h3>Active Learners</h3><strong>{{ s.activeLearners }}</strong></article>
        <article><h3>Completed Learners</h3><strong>{{ s.completedLearners }}</strong></article>
        <article><h3>Avg Readiness</h3><strong>{{ s.averageReadinessScore | number:'1.0-1' }}%</strong></article>
        <article><h3>Completion Rate</h3><strong>{{ s.completionRate | number:'1.0-1' }}%</strong></article>
      </section>

      <section class="grid-two">
        <article class="card">
          <h2>Program Category Breakdown</h2>
          <ul *ngIf="categories().length; else noCategories">
            <li *ngFor="let row of categories()">
              <span>{{ PROGRAM_CATEGORY_LABELS[row.category] }}</span>
              <strong>{{ row.count }}</strong>
            </li>
          </ul>
          <ng-template #noCategories><p class="empty">No category data available.</p></ng-template>
        </article>

        <article class="card">
          <h2>Enrollment Status Breakdown</h2>
          <ul *ngIf="statuses().length; else noStatuses">
            <li *ngFor="let row of statuses()">
              <span>{{ PROGRAM_ENROLLMENT_STATUS_LABELS[row.status] }}</span>
              <strong>{{ row.count }}</strong>
            </li>
          </ul>
          <ng-template #noStatuses><p class="empty">No enrollment data available.</p></ng-template>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .analytics-shell { border: 1px solid #d4e2ef; border-radius: 1rem; background: #fff; padding: 1rem; }
      .eyebrow { margin: 0; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.1em; font-weight: 800; color: #507096; }
      h1 { margin: 0.35rem 0; }
      p { margin: 0; color: #617d99; }
      .kpis { margin-top: 0.9rem; display: grid; gap: 0.7rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .kpis article { border: 1px solid #dce7f3; border-radius: 0.8rem; padding: 0.8rem; background: #f8fbff; }
      .kpis article h3 { margin: 0; color: #5a7898; font-size: 0.8rem; }
      .kpis article strong { display: block; margin-top: 0.35rem; font-size: 1.5rem; color: #123a62; }
      .grid-two { margin-top: 0.9rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
      .card { border: 1px solid #dce7f3; border-radius: 0.8rem; padding: 0.8rem; background: #fff; }
      .card h2 { margin: 0; font-size: 1rem; }
      .card ul { margin: 0.7rem 0 0; list-style: none; padding: 0; display: grid; gap: 0.4rem; }
      .card li { display: flex; justify-content: space-between; align-items: center; border: 1px solid #ecf2fa; border-radius: 0.7rem; padding: 0.45rem 0.6rem; }
      .card li span { color: #5e7897; }
      .card li strong { color: #173d64; }
      .empty { color: #6b819b; margin-top: 0.7rem; }
      @media (max-width: 1080px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid-two { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramAnalyticsPage {
  private readonly analytics = inject(ProgramAdminAnalyticsService);

  readonly stats = toSignal(this.analytics.getProgramAdminStats());
  readonly categories = toSignal(this.analytics.getCategoryBreakdown(), { initialValue: [] });
  readonly statuses = toSignal(this.analytics.getEnrollmentStatusBreakdown(), { initialValue: [] });

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;
  protected readonly PROGRAM_ENROLLMENT_STATUS_LABELS = PROGRAM_ENROLLMENT_STATUS_LABELS;
}
