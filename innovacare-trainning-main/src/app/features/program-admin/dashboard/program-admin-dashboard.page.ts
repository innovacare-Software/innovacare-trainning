import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramAdminAnalyticsService } from '../services/program-admin-analytics.service';
import { PROGRAM_CATEGORY_LABELS, PROGRAM_ENROLLMENT_STATUS_LABELS } from '../shared/program-admin.models';

@Component({
  selector: 'app-program-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="dashboard">
      <header class="hero">
        <div>
          <p class="eyebrow">Program Platform</p>
          <h1>Program Admin Dashboard</h1>
          <p>Dedicated admin surface for public programs, fully separated from organization tenant dashboards.</p>
        </div>
        <div class="quick-actions">
          <a routerLink="/program-admin/programs/new">New Program</a>
          <a routerLink="/program-admin/enrollments">Review Enrollments</a>
        </div>
      </header>

      <section class="stats" *ngIf="stats() as s">
        <article><h3>Total Programs</h3><strong>{{ s.totalPrograms }}</strong></article>
        <article><h3>Active Programs</h3><strong>{{ s.activePrograms }}</strong></article>
        <article><h3>Published Programs</h3><strong>{{ s.publishedPrograms }}</strong></article>
        <article><h3>Pending Enrollments</h3><strong>{{ s.pendingEnrollments }}</strong></article>
        <article><h3>Active Learners</h3><strong>{{ s.activeLearners }}</strong></article>
        <article><h3>Completed Learners</h3><strong>{{ s.completedLearners }}</strong></article>
        <article><h3>Average Readiness</h3><strong>{{ s.averageReadinessScore | number:'1.0-1' }}%</strong></article>
        <article><h3>Completion Rate</h3><strong>{{ s.completionRate | number:'1.0-1' }}%</strong></article>
      </section>

      <section class="grid-two">
        <article class="card">
          <h2>Recent Programs</h2>
          <ul *ngIf="recentPrograms().length; else noProgram">
            <li *ngFor="let item of recentPrograms()">
              <strong>{{ item.title }}</strong>
              <span>{{ PROGRAM_CATEGORY_LABELS[item.category] }} · {{ item.status }}</span>
            </li>
          </ul>
          <ng-template #noProgram><p class="empty">No program data yet.</p></ng-template>
        </article>

        <article class="card">
          <h2>Recent Enrollments</h2>
          <ul *ngIf="recentEnrollments().length; else noEnrollment">
            <li *ngFor="let item of recentEnrollments()">
              <strong>{{ item.learnerName }} - {{ item.programTitle }}</strong>
              <span>{{ PROGRAM_ENROLLMENT_STATUS_LABELS[item.status] }}</span>
            </li>
          </ul>
          <ng-template #noEnrollment><p class="empty">No enrollment data yet.</p></ng-template>
        </article>
      </section>

      <section class="grid-two">
        <article class="card">
          <h2>Category Breakdown</h2>
          <ul *ngIf="categoryBreakdown().length; else noCategory">
            <li *ngFor="let row of categoryBreakdown()">
              <span>{{ PROGRAM_CATEGORY_LABELS[row.category] }}</span>
              <strong>{{ row.count }}</strong>
            </li>
          </ul>
          <ng-template #noCategory><p class="empty">No category insights available.</p></ng-template>
        </article>

        <article class="card">
          <h2>Enrollment Status Breakdown</h2>
          <ul *ngIf="statusBreakdown().length; else noStatus">
            <li *ngFor="let row of statusBreakdown()">
              <span>{{ PROGRAM_ENROLLMENT_STATUS_LABELS[row.status] }}</span>
              <strong>{{ row.count }}</strong>
            </li>
          </ul>
          <ng-template #noStatus><p class="empty">No status insights available.</p></ng-template>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .dashboard {
        display: grid;
        gap: 0.9rem;
      }

      .hero {
        border: 1px solid #d4e2f0;
        border-radius: 1rem;
        background: #fff;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        font-weight: 800;
        color: #4f7097;
      }

      h1 {
        margin: 0.3rem 0;
      }

      .hero p {
        margin: 0;
        color: #5f7a96;
      }

      .quick-actions {
        display: flex;
        gap: 0.45rem;
        align-items: flex-start;
      }

      .quick-actions a {
        text-decoration: none;
        border-radius: 0.7rem;
        padding: 0.48rem 0.75rem;
        color: #fff;
        background: linear-gradient(135deg, #0f5ca6, #1a74c8);
      }

      .stats {
        display: grid;
        gap: 0.65rem;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .stats article {
        border: 1px solid #d9e5f2;
        border-radius: 0.85rem;
        padding: 0.8rem;
        background: #ffffff;
      }

      .stats h3 {
        margin: 0;
        color: #5f7a97;
        font-size: 0.8rem;
      }

      .stats strong {
        display: block;
        margin-top: 0.3rem;
        color: #153d66;
        font-size: 1.48rem;
      }

      .grid-two {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .card {
        border: 1px solid #d9e5f2;
        border-radius: 0.9rem;
        background: #fff;
        padding: 0.85rem;
      }

      .card h2 {
        margin: 0;
        font-size: 1rem;
      }

      .card ul {
        list-style: none;
        margin: 0.75rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.4rem;
      }

      .card li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid #e7eef8;
        border-radius: 0.7rem;
        padding: 0.45rem 0.6rem;
      }

      .card li strong {
        color: #173f68;
      }

      .card li span {
        color: #607b97;
        font-size: 0.85rem;
      }

      .empty {
        margin: 0.65rem 0 0;
        color: #6d849d;
      }

      @media (max-width: 1100px) {
        .stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .grid-two {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProgramAdminDashboardPage {
  private readonly analytics = inject(ProgramAdminAnalyticsService);

  readonly stats = toSignal(this.analytics.getProgramAdminStats());
  readonly recentPrograms = toSignal(this.analytics.getRecentPrograms(), { initialValue: [] });
  readonly recentEnrollments = toSignal(this.analytics.getRecentEnrollments(), {
    initialValue: [],
  });
  readonly categoryBreakdown = toSignal(this.analytics.getCategoryBreakdown(), {
    initialValue: [],
  });
  readonly statusBreakdown = toSignal(this.analytics.getEnrollmentStatusBreakdown(), {
    initialValue: [],
  });

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;
  protected readonly PROGRAM_ENROLLMENT_STATUS_LABELS = PROGRAM_ENROLLMENT_STATUS_LABELS;
}
