import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramAdminAnalyticsService } from '../services/program-admin-analytics.service';
import { PROGRAM_CATEGORY_LABELS, PROGRAM_ENROLLMENT_STATUS_LABELS } from '../shared/program-admin.models';

@Component({
  selector: 'app-program-analytics-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="analytics">
      <!-- HERO -->
      <header class="hero">
        <div>
          <p class="eyebrow">Program Platform &middot; Advanced Analytics</p>
          <h1>Program Analytics &amp; Intelligence</h1>
          <p class="hero-desc">Comprehensive BI view — enrollment funnel, completion rates, category insights, and operational KPIs.</p>
        </div>
        <a routerLink="/program-admin" class="btn-back">← Dashboard</a>
      </header>

      <!-- INSIGHT STRIP -->
      <section class="insight-strip" *ngIf="stats() as s">
        <div class="insight green">
          <span class="insight-icon">✅</span>
          <div><p class="insight-label">Conversion</p><strong>{{ s.activeLearners }} active</strong><span class="insight-sub">of {{ s.pendingEnrollments + s.activeLearners + s.completedLearners }} total</span></div>
        </div>
        <div class="insight blue">
          <span class="insight-icon">🎯</span>
          <div><p class="insight-label">Avg Readiness</p><strong>{{ s.averageReadinessScore | number:'1.0-1' }}%</strong><span class="insight-sub">across all learners</span></div>
        </div>
        <div class="insight teal">
          <span class="insight-icon">🎓</span>
          <div><p class="insight-label">Completion Rate</p><strong>{{ s.completionRate | number:'1.0-1' }}%</strong><span class="insight-sub">of active enrollments</span></div>
        </div>
        <div class="insight warn" *ngIf="s.pendingEnrollments > 0">
          <span class="insight-icon">⏳</span>
          <div><p class="insight-label">Pending Review</p><strong>{{ s.pendingEnrollments }} enrollments</strong><span class="insight-sub">need approval</span></div>
        </div>
      </section>

      <!-- EXECUTIVE KPIs -->
      <section class="kpi-row" *ngIf="stats() as s">
        <article class="kpi"><span class="kpi-icon">📦</span><div><p class="kpi-label">Total Programs</p><strong>{{ s.totalPrograms }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">🌐</span><div><p class="kpi-label">Published</p><strong>{{ s.publishedPrograms }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">✅</span><div><p class="kpi-label">Active</p><strong>{{ s.activePrograms }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">⏳</span><div><p class="kpi-label">Pending</p><strong>{{ s.pendingEnrollments }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">👤</span><div><p class="kpi-label">Active Learners</p><strong>{{ s.activeLearners }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">🎓</span><div><p class="kpi-label">Completed</p><strong>{{ s.completedLearners }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon">🎯</span><div><p class="kpi-label">Readiness</p><strong>{{ s.averageReadinessScore | number:'1.0-1' }}%</strong></div></article>
        <article class="kpi"><span class="kpi-icon">📈</span><div><p class="kpi-label">Completion %</p><strong>{{ s.completionRate | number:'1.0-1' }}%</strong></div></article>
      </section>

      <!-- CHART PANELS -->
      <section class="chart-row">
        <!-- Category Distribution -->
        <article class="chart-panel">
          <h2>Category Distribution</h2>
          <div class="donut-section" *ngIf="categories().length; else noCat">
            <!-- SVG Donut -->
            <svg viewBox="0 0 200 200" class="donut-svg">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#e7ecf4" stroke-width="22"/>
              <circle *ngFor="let seg of donutSegments(); let i = index"
                cx="100" cy="100" r="80"
                fill="none" [attr.stroke]="donutColors[i % donutColors.length]"
                stroke-width="22"
                [attr.stroke-dasharray]="seg.dash"
                [attr.stroke-dashoffset]="seg.offset"
                stroke-linecap="round"/>
              <text x="100" y="96" text-anchor="middle" font-size="28" font-weight="700" fill="#153d66">{{ totalCategories() }}</text>
              <text x="100" y="116" text-anchor="middle" font-size="11" fill="#6d849d">programs</text>
            </svg>
            <!-- Legend -->
            <div class="donut-legend">
              <div *ngFor="let row of categories(); let i = index" class="legend-item">
                <span class="legend-dot" [style.background]="donutColors[i % donutColors.length]"></span>
                <span class="legend-label">{{ PROGRAM_CATEGORY_LABELS[row.category] }}</span>
                <strong>{{ row.count }}</strong>
              </div>
            </div>
          </div>
          <ng-template #noCat><p class="empty-msg">No category data yet.</p></ng-template>
        </article>

        <!-- Enrollment Funnel -->
        <article class="chart-panel">
          <h2>Enrollment Funnel</h2>
          <div class="funnel-list" *ngIf="statuses().length; else noStat">
            <div class="funnel-row" *ngFor="let row of statuses(); let i = index">
              <span class="funnel-label">{{ PROGRAM_ENROLLMENT_STATUS_LABELS[row.status] }}</span>
              <div class="funnel-track">
                <div class="funnel-fill" [style.width.%]="funnelPct(row.count)" [class]="'fc-' + (i % 7)"></div>
              </div>
              <strong class="funnel-val">{{ row.count }}</strong>
            </div>
          </div>
          <ng-template #noStat><p class="empty-msg">No enrollment data yet.</p></ng-template>
        </article>
      </section>

      <!-- RATE GAUGES -->
      <section class="gauge-row" *ngIf="stats() as s">
        <article class="gauge-card">
          <h2>Readiness Score</h2>
          <svg viewBox="0 0 120 120" class="gauge-svg">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e7ecf4" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#readGrad)" stroke-width="10"
              [attr.stroke-dasharray]="gaugeArc(s.averageReadinessScore)" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <defs><linearGradient id="readGrad"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs>
            <text x="60" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="#153d66">{{ s.averageReadinessScore | number:'1.0-0' }}%</text>
          </svg>
          <p class="gauge-desc">Avg learner readiness</p>
        </article>
        <article class="gauge-card">
          <h2>Completion Rate</h2>
          <svg viewBox="0 0 120 120" class="gauge-svg">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e7ecf4" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#compGrad)" stroke-width="10"
              [attr.stroke-dasharray]="gaugeArc(s.completionRate)" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <defs><linearGradient id="compGrad"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs>
            <text x="60" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="#153d66">{{ s.completionRate | number:'1.0-0' }}%</text>
          </svg>
          <p class="gauge-desc">Enrollment completion</p>
        </article>
        <article class="gauge-card">
          <h2>Publish Rate</h2>
          <svg viewBox="0 0 120 120" class="gauge-svg">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e7ecf4" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#pubGrad)" stroke-width="10"
              [attr.stroke-dasharray]="gaugeArc(publishRate())" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <defs><linearGradient id="pubGrad"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs>
            <text x="60" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="#153d66">{{ publishRate() | number:'1.0-0' }}%</text>
          </svg>
          <p class="gauge-desc">Published / Total</p>
        </article>
      </section>
    </section>
  `,
  styles: [`
    .analytics { display: grid; gap: 1rem; }

    /* HERO */
    .hero {
      border: 1.5px solid #d4e2f0; border-radius: 1.1rem;
      background: linear-gradient(145deg, #ffffff, #f3f8ff);
      padding: 1.4rem 1.6rem; display: flex; justify-content: space-between;
      gap: 1.2rem; flex-wrap: wrap; box-shadow: 0 6px 20px rgba(15,53,92,0.06);
    }
    .eyebrow { margin: 0; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.12em; font-weight: 800; color: #4f7097; }
    h1 { margin: 0.3rem 0 0.2rem; font-size: 1.45rem; }
    .hero-desc { margin: 0; color: #5f7a96; line-height: 1.55; max-width: 58ch; }
    .btn-back { text-decoration: none; border: 1.5px solid #c2d8f0; border-radius: 0.7rem; padding: 0.45rem 0.8rem; color: #1a5a94; font-weight: 700; font-size: 0.85rem; background: #f8fbff; align-self: flex-start; }

    /* INSIGHT STRIP */
    .insight-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; }
    .insight {
      display: flex; gap: 0.6rem; padding: 0.85rem 1rem; border-radius: 0.9rem;
      border: 1.5px solid transparent; box-shadow: 0 4px 14px rgba(15,53,90,0.06);
    }
    .insight.green { background: linear-gradient(145deg, #ecfdf5, #f0fdf4); border-color: #a7f3d0; }
    .insight.blue { background: linear-gradient(145deg, #eff6ff, #f0f7ff); border-color: #bfdbfe; }
    .insight.teal { background: linear-gradient(145deg, #f0fdfa, #ecfeff); border-color: #99f6e4; }
    .insight.warn { background: linear-gradient(145deg, #fffbeb, #fefce8); border-color: #fde68a; }
    .insight-icon { font-size: 1.4rem; }
    .insight-label { margin: 0; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #4b6a8c; }
    .insight strong { display: block; font-size: 1.1rem; color: #153d66; }
    .insight-sub { font-size: 0.76rem; color: #6d849d; }

    /* KPI ROW */
    .kpi-row { display: grid; gap: 0.6rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpi {
      border: 1.5px solid #d9e5f2; border-radius: 0.9rem; padding: 0.8rem 1rem;
      background: #fff; display: flex; gap: 0.55rem; align-items: flex-start;
      box-shadow: 0 4px 14px rgba(15,53,90,0.05); transition: transform 0.15s, box-shadow 0.15s;
    }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(15,53,90,0.10); }
    .kpi-icon { font-size: 1.4rem; }
    .kpi-label { margin: 0; color: #5f7a97; font-size: 0.73rem; font-weight: 700; }
    .kpi strong { display: block; margin-top: 0.12rem; color: #153d66; font-size: 1.4rem; }

    /* CHARTS */
    .chart-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
    .chart-panel {
      border: 1.5px solid #d9e5f2; border-radius: 0.95rem; background: #fff;
      padding: 1.1rem; box-shadow: 0 4px 14px rgba(15,53,90,0.05);
    }
    .chart-panel h2 { margin: 0 0 0.8rem; font-size: 1rem; }

    /* DONUT */
    .donut-section { display: flex; gap: 1.2rem; align-items: center; flex-wrap: wrap; }
    .donut-svg { width: 160px; height: 160px; flex-shrink: 0; }
    .donut-legend { display: grid; gap: 0.35rem; flex: 1; min-width: 140px; }
    .legend-item { display: flex; align-items: center; gap: 0.45rem; font-size: 0.85rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
    .legend-label { color: #4b6a8c; flex: 1; }
    .legend-item strong { color: #153d66; }

    /* FUNNEL */
    .funnel-list { display: grid; gap: 0.5rem; }
    .funnel-row { display: grid; grid-template-columns: 140px 1fr auto; gap: 0.5rem; align-items: center; }
    .funnel-label { font-size: 0.82rem; color: #3b5f82; font-weight: 600; }
    .funnel-track { height: 16px; border-radius: 99px; background: #f1f5f9; border: 1px solid #e2e8f0; overflow: hidden; }
    .funnel-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; min-width: 6px; }
    .fc-0 { background: linear-gradient(90deg, #3b82f6, #2563eb); }
    .fc-1 { background: linear-gradient(90deg, #10b981, #059669); }
    .fc-2 { background: linear-gradient(90deg, #06b6d4, #0891b2); }
    .fc-3 { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .fc-4 { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
    .fc-5 { background: linear-gradient(90deg, #f43f5e, #e11d48); }
    .fc-6 { background: linear-gradient(90deg, #64748b, #475569); }
    .funnel-val { font-size: 0.88rem; color: #173f68; min-width: 28px; text-align: right; }

    /* GAUGE ROW */
    .gauge-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
    .gauge-card {
      border: 1.5px solid #d9e5f2; border-radius: 0.95rem; background: #fff;
      padding: 1rem; text-align: center; box-shadow: 0 4px 14px rgba(15,53,90,0.05);
    }
    .gauge-card h2 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .gauge-svg { width: 110px; height: 110px; }
    .gauge-desc { margin: 0.4rem 0 0; color: #6d849d; font-size: 0.8rem; }

    .empty-msg { margin: 0.65rem 0 0; color: #6d849d; font-style: italic; }

    @media (max-width: 1100px) {
      .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .chart-row, .gauge-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .kpi-row { grid-template-columns: 1fr; }
      .funnel-row { grid-template-columns: 100px 1fr auto; }
    }
  `],
})
export class ProgramAnalyticsPage {
  private readonly analytics = inject(ProgramAdminAnalyticsService);

  readonly stats = toSignal(this.analytics.getProgramAdminStats());
  readonly categories = toSignal(this.analytics.getCategoryBreakdown(), { initialValue: [] });
  readonly statuses = toSignal(this.analytics.getEnrollmentStatusBreakdown(), { initialValue: [] });

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;
  protected readonly PROGRAM_ENROLLMENT_STATUS_LABELS = PROGRAM_ENROLLMENT_STATUS_LABELS;

  readonly donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#64748b'];

  readonly totalCategories = computed(() => this.categories().reduce((a, r) => a + r.count, 0));

  readonly donutSegments = computed(() => {
    const total = this.totalCategories() || 1;
    const circ = 2 * Math.PI * 80;
    let cumOffset = 0;
    return this.categories().map(r => {
      const pct = r.count / total;
      const dash = `${pct * circ} ${circ}`;
      const offset = -cumOffset;
      cumOffset += pct * circ;
      return { dash, offset };
    });
  });

  readonly publishRate = computed(() => {
    const s = this.stats();
    if (!s || !s.totalPrograms) return 0;
    return (s.publishedPrograms / s.totalPrograms) * 100;
  });

  private readonly maxFunnel = computed(() => Math.max(...this.statuses().map(r => r.count), 1));

  funnelPct(count: number): number { return Math.max(4, (count / this.maxFunnel()) * 100); }

  gaugeArc(pct: number): string {
    const circ = 2 * Math.PI * 50;
    return `${(pct / 100) * circ} ${circ}`;
  }
}
