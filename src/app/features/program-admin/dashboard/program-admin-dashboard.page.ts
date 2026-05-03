import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
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
      <!-- HERO -->
      <header class="hero">
        <div class="hero-left">
          <p class="eyebrow">Program Platform &middot; Admin Intelligence</p>
          <h1>Program Admin Dashboard</h1>
          <p class="hero-desc"> </p>
          <div class="diag-banner" *ngIf="diagnostics().length">
            <strong>Firestore access fallback active.</strong>
            <span>Denied source(s): {{ diagnostics().join(', ') }}</span>
          </div>
        </div>
        <div class="quick-actions">
          <a routerLink="/program-admin/programs/new" class="btn-action primary">+ New Program</a>
          <a routerLink="/program-admin/enrollments" class="btn-action outline">Review Enrollments</a>
          <a routerLink="/program-admin/analytics" class="btn-action outline">Analytics</a>
          <a routerLink="/africa-mode" class="btn-action business">Switch to Business Mode</a>
        </div>
      </header>

      <!-- EXECUTIVE KPIs -->
      <section class="kpi-row" *ngIf="stats() as s">
        <article class="kpi-card"><span class="kpi-icon">📦</span><div><p class="kpi-label">Total Programs</p><strong>{{ s.totalPrograms }}</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">✅</span><div><p class="kpi-label">Active Programs</p><strong>{{ s.activePrograms }}</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">🌐</span><div><p class="kpi-label">Published</p><strong>{{ s.publishedPrograms }}</strong></div></article>
        <article class="kpi-card accent-warn"><span class="kpi-icon">⏳</span><div><p class="kpi-label">Pending Enrollments</p><strong>{{ s.pendingEnrollments }}</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">👤</span><div><p class="kpi-label">Active Learners</p><strong>{{ s.activeLearners }}</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">🎓</span><div><p class="kpi-label">Completed</p><strong>{{ s.completedLearners }}</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">🎯</span><div><p class="kpi-label">Avg Readiness</p><strong>{{ s.averageReadinessScore | number:'1.0-1' }}%</strong></div></article>
        <article class="kpi-card"><span class="kpi-icon">📈</span><div><p class="kpi-label">Completion Rate</p><strong>{{ s.completionRate | number:'1.0-1' }}%</strong></div></article>
      </section>

      <!-- CHARTS ROW -->
      <section class="chart-row">
        <article class="chart-card">
          <h2>Category Distribution</h2>
          <div class="hbar-list" *ngIf="categoryBreakdown().length; else noCategory">
            <div class="hbar-item" *ngFor="let row of categoryBreakdown(); let i = index">
              <span class="hbar-label">{{ PROGRAM_CATEGORY_LABELS[row.category] }}</span>
              <div class="hbar-track">
                <div class="hbar-fill" [style.width.%]="catPct(row.count)" [class]="'hbar-color-' + (i % 6)"></div>
              </div>
              <strong class="hbar-value">{{ row.count }}</strong>
            </div>
          </div>
          <ng-template #noCategory><p class="empty-msg">No category data yet.</p></ng-template>
        </article>

        <article class="chart-card">
          <h2>Enrollment Funnel</h2>
          <div class="funnel" *ngIf="statusBreakdown().length; else noStatus">
            <div class="funnel-step" *ngFor="let row of statusBreakdown(); let i = index">
              <div class="funnel-bar" [style.width.%]="funnelPct(row.count)" [class]="'funnel-color-' + (i % 7)"></div>
              <span class="funnel-label">{{ PROGRAM_ENROLLMENT_STATUS_LABELS[row.status] }}</span>
              <strong>{{ row.count }}</strong>
            </div>
          </div>
          <ng-template #noStatus><p class="empty-msg">No enrollment data yet.</p></ng-template>
        </article>
      </section>

      <!-- DATA ROWS -->
      <section class="data-row">
        <article class="data-card">
          <div class="data-head">
            <h2>Recent Programs</h2>
            <a routerLink="/program-admin/programs" class="see-all">View all →</a>
          </div>
          <div class="data-list" *ngIf="recentPrograms().length; else noProgram">
            <div class="data-item" *ngFor="let item of recentPrograms()">
              <div class="data-item-left">
                <strong>{{ item.title }}</strong>
                <span>{{ PROGRAM_CATEGORY_LABELS[item.category] }} · {{ item.status }}</span>
              </div>
              <a [routerLink]="['/program-admin/programs', item.id, 'edit']" class="mini-action">Edit</a>
            </div>
          </div>
          <ng-template #noProgram><p class="empty-msg">No programs created yet.</p></ng-template>
        </article>

        <article class="data-card">
          <div class="data-head">
            <h2>Recent Enrollments</h2>
            <a routerLink="/program-admin/enrollments" class="see-all">View all →</a>
          </div>
          <div class="data-list" *ngIf="recentEnrollments().length; else noEnrollment">
            <div class="data-item" *ngFor="let item of recentEnrollments()">
              <div class="data-item-left">
                <strong>{{ item.learnerName }}</strong>
                <span>{{ item.programTitle }} · {{ PROGRAM_ENROLLMENT_STATUS_LABELS[item.status] }}</span>
              </div>
              <a [routerLink]="['/program-admin/enrollments', item.id]" class="mini-action">Open</a>
            </div>
          </div>
          <ng-template #noEnrollment><p class="empty-msg">No enrollments yet.</p></ng-template>
        </article>
      </section>
    </section>
  `,
  styles: [`
    .dashboard { display: grid; gap: 1rem; }

    /* HERO */
    .hero {
      border: 1.5px solid #d4e2f0; border-radius: 1.1rem;
      background: linear-gradient(145deg, #ffffff, #f3f8ff);
      padding: 1.4rem 1.6rem; display: flex; justify-content: space-between;
      gap: 1.2rem; flex-wrap: wrap; box-shadow: 0 6px 20px rgba(15,53,92,0.06);
    }
    .eyebrow { margin: 0; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.12em; font-weight: 800; color: #4f7097; }
    h1 { margin: 0.3rem 0 0.2rem; font-size: 1.45rem; }
    .hero-desc { margin: 0; color: #5f7a96; line-height: 1.55; max-width: 56ch; }
    .diag-banner {
      margin-top: 0.8rem; display: grid; gap: 0.2rem; padding: 0.7rem 0.85rem;
      border: 1px solid #f7d08a; border-radius: 0.8rem; background: #fff8e8; color: #8a4c00;
      font-size: 0.84rem;
    }
    .diag-banner strong { color: #7a3f00; }
    .quick-actions { display: flex; gap: 0.45rem; align-items: flex-start; flex-wrap: wrap; }
    .btn-action {
      text-decoration: none; border-radius: 0.7rem; padding: 0.5rem 0.8rem;
      font-weight: 700; font-size: 0.85rem; transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-action:hover { transform: translateY(-1px); }
    .btn-action.primary { color: #fff; background: linear-gradient(135deg, #0f5ca6, #1a74c8); box-shadow: 0 6px 16px rgba(15,92,166,0.25); }
    .btn-action.outline { color: #1a5a94; border: 1.5px solid #c2d8f0; background: #f8fbff; }
    .btn-action.business { color: #0f6c46; border: 1.5px solid #9dd7be; background: #effcf6; }

    /* KPI ROW */
    .kpi-row { display: grid; gap: 0.65rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpi-card {
      border: 1.5px solid #d9e5f2; border-radius: 0.9rem; padding: 0.85rem 1rem;
      background: #ffffff; display: flex; gap: 0.6rem; align-items: flex-start;
      box-shadow: 0 4px 14px rgba(15,53,90,0.05); transition: transform 0.15s, box-shadow 0.15s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(15,53,90,0.10); }
    .kpi-card.accent-warn { border-color: #fde68a; background: linear-gradient(145deg, #fffbeb, #fff); }
    .kpi-icon { font-size: 1.5rem; }
    .kpi-label { margin: 0; color: #5f7a97; font-size: 0.76rem; font-weight: 700; }
    .kpi-card strong { display: block; margin-top: 0.15rem; color: #153d66; font-size: 1.5rem; }

    /* CHARTS */
    .chart-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
    .chart-card {
      border: 1.5px solid #d9e5f2; border-radius: 0.95rem; background: #fff;
      padding: 1rem; box-shadow: 0 4px 14px rgba(15,53,90,0.05);
    }
    .chart-card h2 { margin: 0 0 0.8rem; font-size: 1rem; }
    .hbar-list { display: grid; gap: 0.5rem; }
    .hbar-item { display: grid; grid-template-columns: 120px 1fr auto; gap: 0.55rem; align-items: center; }
    .hbar-label { font-size: 0.82rem; color: #3b5f82; font-weight: 600; }
    .hbar-track { height: 14px; border-radius: 99px; background: #f1f5f9; border: 1px solid #e2e8f0; overflow: hidden; }
    .hbar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; min-width: 4px; }
    .hbar-color-0 { background: linear-gradient(90deg, #0ea5e9, #0284c7); }
    .hbar-color-1 { background: linear-gradient(90deg, #10b981, #059669); }
    .hbar-color-2 { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .hbar-color-3 { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
    .hbar-color-4 { background: linear-gradient(90deg, #f43f5e, #e11d48); }
    .hbar-color-5 { background: linear-gradient(90deg, #06b6d4, #0891b2); }
    .hbar-value { font-size: 0.88rem; color: #173f68; min-width: 28px; text-align: right; }

    /* FUNNEL */
    .funnel { display: grid; gap: 0.45rem; }
    .funnel-step { display: grid; grid-template-columns: minmax(60px, 1fr) 1fr auto; gap: 0.5rem; align-items: center; }
    .funnel-bar { height: 16px; border-radius: 99px; transition: width 0.5s ease; min-width: 6px; }
    .funnel-label { font-size: 0.82rem; color: #4b6a8c; font-weight: 600; }
    .funnel-step strong { font-size: 0.88rem; color: #173f68; }
    .funnel-color-0 { background: linear-gradient(90deg, #3b82f6, #2563eb); }
    .funnel-color-1 { background: linear-gradient(90deg, #10b981, #059669); }
    .funnel-color-2 { background: linear-gradient(90deg, #06b6d4, #0891b2); }
    .funnel-color-3 { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .funnel-color-4 { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
    .funnel-color-5 { background: linear-gradient(90deg, #f43f5e, #e11d48); }
    .funnel-color-6 { background: linear-gradient(90deg, #64748b, #475569); }

    /* DATA ROWS */
    .data-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
    .data-card {
      border: 1.5px solid #d9e5f2; border-radius: 0.95rem; background: #fff;
      padding: 1rem; box-shadow: 0 4px 14px rgba(15,53,90,0.05);
    }
    .data-head { display: flex; justify-content: space-between; align-items: center; }
    .data-head h2 { margin: 0; font-size: 1rem; }
    .see-all { font-size: 0.8rem; color: #1a6cb5; text-decoration: none; font-weight: 700; }
    .data-list { margin-top: 0.7rem; display: grid; gap: 0.4rem; }
    .data-item {
      display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
      border: 1px solid #e7eef8; border-radius: 0.7rem; padding: 0.55rem 0.7rem;
      transition: background 0.12s;
    }
    .data-item:hover { background: #f7faff; }
    .data-item-left { display: flex; flex-direction: column; gap: 0.15rem; }
    .data-item-left strong { color: #173f68; font-size: 0.88rem; }
    .data-item-left span { color: #607b97; font-size: 0.8rem; }
    .mini-action {
      text-decoration: none; border: 1px solid #c9dbef; border-radius: 0.55rem;
      padding: 0.25rem 0.5rem; color: #224f7d; font-size: 0.76rem; font-weight: 700;
      background: #f8fbff;
    }
    .empty-msg { margin: 0.65rem 0 0; color: #6d849d; font-style: italic; }

    @media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .chart-row, .data-row { grid-template-columns: 1fr; } }
    @media (max-width: 700px) { .kpi-row { grid-template-columns: 1fr; } }
  `],
})
export class ProgramAdminDashboardPage {
  private readonly analytics = inject(ProgramAdminAnalyticsService);

  readonly stats = toSignal(this.analytics.getProgramAdminStats());
  readonly recentPrograms = toSignal(this.analytics.getRecentPrograms(), { initialValue: [] });
  readonly recentEnrollments = toSignal(this.analytics.getRecentEnrollments(), { initialValue: [] });
  readonly categoryBreakdown = toSignal(this.analytics.getCategoryBreakdown(), { initialValue: [] });
  readonly statusBreakdown = toSignal(this.analytics.getEnrollmentStatusBreakdown(), { initialValue: [] });
  readonly diagnostics = this.analytics.deniedScopes;

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;
  protected readonly PROGRAM_ENROLLMENT_STATUS_LABELS = PROGRAM_ENROLLMENT_STATUS_LABELS;

  private maxCat = computed(() => Math.max(...this.categoryBreakdown().map(r => r.count), 1));
  private maxFunnel = computed(() => Math.max(...this.statusBreakdown().map(r => r.count), 1));

  catPct(count: number): number { return Math.max(4, (count / this.maxCat()) * 100); }
  funnelPct(count: number): number { return Math.max(4, (count / this.maxFunnel()) * 100); }
}
