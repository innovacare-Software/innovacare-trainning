import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  ProgramEnrollmentStatus,
} from '../../program.models';
import { ProgramProgressService } from '../../program-progress.service';

@Component({
  selector: 'app-learner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (vm(); as data) {
      <!-- Hero Banner -->
      <div class="ld-hero">
        <div class="ld-hero-glow"></div>
        <div class="ld-hero-content">
          <div class="ld-hero-left">
            <h1 class="ld-title">My Learning Dashboard</h1>
            <p class="ld-subtitle">{{ enrollmentMessage() }}</p>
            <span class="ld-status" [attr.data-status]="data.enrollment?.status">
              {{ enrollmentStatusText() }}
            </span>
          </div>
          <!-- Readiness Ring -->
          <div class="ld-readiness-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#ringGrad)"
                stroke-width="8" stroke-linecap="round"
                [attr.stroke-dasharray]="ringDash()"
                stroke-dashoffset="0"
                transform="rotate(-90 60 60)"/>
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#a78bfa"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="ld-ring-center">
              <span class="ld-ring-pct">{{ data.stats.readinessScore }}</span>
              <span class="ld-ring-label">Readiness</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Strip -->
      <div class="ld-kpi-strip">
        @for (kpi of kpis(); track kpi.label) {
          <div class="ld-kpi-card">
            <span class="ld-kpi-icon">{{ kpi.icon }}</span>
            <div class="ld-kpi-data">
              <span class="ld-kpi-value">{{ kpi.value }}</span>
              <span class="ld-kpi-label">{{ kpi.label }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Insights Row -->
      <div class="ld-insights">
        <div class="ld-insight green">
          <span class="ld-insight-icon">💪</span>
          <div>
            <span class="ld-insight-label">Strongest Area</span>
            <span class="ld-insight-val">{{ data.stats.strongestArea }}</span>
          </div>
        </div>
        <div class="ld-insight amber">
          <span class="ld-insight-icon">⚠️</span>
          <div>
            <span class="ld-insight-label">Weakest Area</span>
            <span class="ld-insight-val">{{ data.stats.weakestArea }}</span>
          </div>
        </div>
        <div class="ld-insight blue">
          <span class="ld-insight-icon">🎯</span>
          <div>
            <span class="ld-insight-label">Next Action</span>
            <span class="ld-insight-val">{{ data.stats.recommendedNextAction }}</span>
          </div>
        </div>
        <div class="ld-insight purple">
          <span class="ld-insight-icon">📘</span>
          <div>
            <span class="ld-insight-label">Recommended Module</span>
            <span class="ld-insight-val">{{ data.stats.recommendedNextModule }}</span>
          </div>
        </div>
      </div>

      <!-- Module Progress Bars -->
      <section class="ld-section">
        <h2 class="ld-section-title">Module Progress</h2>
        @if (moduleBars().length > 0) {
          <div class="ld-bars">
            @for (bar of moduleBars(); track bar.label) {
              <div class="ld-bar-row">
                <span class="ld-bar-label">{{ bar.label }}</span>
                <div class="ld-bar-track">
                  <div class="ld-bar-fill" [style.width.%]="bar.value"
                    [class.ld-bar-complete]="bar.value >= 100"
                    [class.ld-bar-mid]="bar.value >= 40 && bar.value < 100"
                    [class.ld-bar-low]="bar.value < 40">
                  </div>
                </div>
                <span class="ld-bar-pct">{{ bar.value }}%</span>
              </div>
            }
          </div>
        } @else {
          <p class="ld-empty">No module progress yet. Start your first module to begin tracking.</p>
        }
      </section>

      <!-- Score Trend Chart -->
      <section class="ld-section">
        <h2 class="ld-section-title">Assessment Score Trend</h2>
        @if (scoreTrend().points.length > 1) {
          <div class="ld-chart-container">
            <svg class="ld-chart" viewBox="0 0 400 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <polygon [attr.points]="scoreTrend().area" fill="url(#trendFill)"/>
              <polyline [attr.points]="scoreTrend().line" fill="none" stroke="#818cf8" stroke-width="2" stroke-linejoin="round"/>
              @for (pt of scoreTrend().points; track $index) {
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" fill="#6366f1" stroke="#ffffff" stroke-width="1.5"/>
              }
            </svg>
          </div>
        } @else {
          <p class="ld-empty">Take at least 2 assessments to see your score trend.</p>
        }
      </section>

      <!-- Quick Action Cards -->
      <div class="ld-actions">
        <a class="ld-action-card" routerLink="../modules">
          <span class="ld-action-icon">📚</span>
          <span class="ld-action-text">Continue Modules</span>
        </a>
        <a class="ld-action-card" routerLink="../assessments">
          <span class="ld-action-icon">📝</span>
          <span class="ld-action-text">Take Assessment</span>
        </a>
        <a class="ld-action-card" routerLink="../simulations">
          <span class="ld-action-icon">🧪</span>
          <span class="ld-action-text">CBT Practice</span>
        </a>
        <a class="ld-action-card" routerLink="../live-sessions">
          <span class="ld-action-icon">🎥</span>
          <span class="ld-action-text">Live Sessions</span>
        </a>
      </div>
    } @else {
      <div class="ld-loading">
        <div class="ld-spinner"></div>
        <span>Loading dashboard…</span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .ld-hero {
      position: relative;
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f0f9ff 100%);
      border-radius: 16px;
      padding: 2rem 2.2rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .ld-hero-glow {
      position: absolute; top: -40%; right: -10%; width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .ld-hero-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
    .ld-hero-left { flex: 1; }
    .ld-title { font-size: 1.6rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .ld-subtitle { font-size: .85rem; color: #6b7280; margin: 0 0 .6rem; max-width: 480px; }
    .ld-status {
      display: inline-block; font-size: .7rem; font-weight: 700; text-transform: uppercase;
      padding: .25rem .7rem; border-radius: 20px; letter-spacing: .04em;
      background: #eef2ff; color: #4f46e5;
    }
    .ld-status[data-status="active"] { background: #d1fae5; color: #059669; }
    .ld-status[data-status="completed"] { background: #cffafe; color: #0891b2; }

    .ld-readiness-ring { width: 120px; height: 120px; position: relative; flex-shrink: 0; }
    .ld-readiness-ring svg { width: 100%; height: 100%; }
    .ld-ring-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .ld-ring-pct { font-size: 1.6rem; font-weight: 800; color: #4f46e5; }
    .ld-ring-label { font-size: .6rem; color: #6366f1; text-transform: uppercase; letter-spacing: .08em; }

    .ld-kpi-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: .8rem; margin-bottom: 1.5rem;
    }
    .ld-kpi-card {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: .8rem; display: flex; gap: .6rem; align-items: center;
      transition: border-color .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ld-kpi-card:hover { border-color: #c7d2fe; }
    .ld-kpi-icon { font-size: 1.3rem; }
    .ld-kpi-data { display: flex; flex-direction: column; }
    .ld-kpi-value { font-size: 1.1rem; font-weight: 800; color: #111827; }
    .ld-kpi-label { font-size: .65rem; color: #9ca3af; text-transform: uppercase; letter-spacing: .04em; }

    .ld-insights {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: .7rem; margin-bottom: 1.5rem;
    }
    .ld-insight {
      display: flex; gap: .5rem; align-items: flex-start; padding: .7rem;
      border-radius: 10px; border-left: 3px solid; background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ld-insight.green { background: #f0fdf4; border-color: #059669; }
    .ld-insight.amber { background: #fffbeb; border-color: #d97706; }
    .ld-insight.blue { background: #f0f9ff; border-color: #0284c7; }
    .ld-insight.purple { background: #faf5ff; border-color: #7c3aed; }
    .ld-insight-icon { font-size: 1.1rem; }
    .ld-insight-label { font-size: .62rem; color: #9ca3af; text-transform: uppercase; display: block; }
    .ld-insight-val { font-size: .8rem; color: #374151; font-weight: 600; }

    .ld-section { margin-bottom: 1.8rem; }
    .ld-section-title { font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 .8rem; }

    .ld-bars { display: flex; flex-direction: column; gap: .5rem; }
    .ld-bar-row { display: flex; align-items: center; gap: .5rem; }
    .ld-bar-label { font-size: .72rem; color: #6b7280; width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ld-bar-track { flex: 1; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; }
    .ld-bar-fill { height: 100%; border-radius: 5px; transition: width .6s ease; }
    .ld-bar-complete { background: linear-gradient(90deg, #059669, #34d399); }
    .ld-bar-mid { background: linear-gradient(90deg, #6366f1, #818cf8); }
    .ld-bar-low { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .ld-bar-pct { font-size: .7rem; color: #6366f1; font-weight: 700; width: 36px; text-align: right; }

    .ld-chart-container { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .ld-chart { width: 100%; height: 160px; }

    .ld-actions {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: .8rem; margin-top: 1rem;
    }
    .ld-action-card {
      display: flex; flex-direction: column; align-items: center; gap: .4rem;
      padding: 1rem; background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 12px; text-decoration: none; color: #374151; transition: all .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ld-action-card:hover { border-color: #6366f1; background: #eef2ff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
    .ld-action-icon { font-size: 1.5rem; }
    .ld-action-text { font-size: .78rem; font-weight: 600; }

    .ld-empty { font-size: .82rem; color: #9ca3af; font-style: italic; }

    .ld-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .ld-spinner {
      width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #6366f1;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .ld-hero-content { flex-direction: column; gap: 1rem; text-align: center; }
      .ld-kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .ld-insights { grid-template-columns: 1fr; }
    }
  `],
})
export class LearnerDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly progressService = inject(ProgramProgressService);

  readonly vm = toSignal(
    this.route.parent!.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((id) => this.progressService.buildDashboardStats(id))
    ),
    {
      initialValue: undefined,
    }
  );

  readonly enrollmentStatusText = computed(() => {
    const status = this.vm()?.enrollment?.status;
    return status ? PROGRAM_ENROLLMENT_STATUS_LABELS[status] : 'Pending';
  });

  readonly enrollmentMessage = computed(() => {
    const status = this.vm()?.enrollment?.status;
    if (status === ProgramEnrollmentStatus.ACTIVE) return 'Your learning pathway is active. Keep going!';
    if (status === ProgramEnrollmentStatus.COMPLETED) return 'Congratulations — program completed!';
    if (status === ProgramEnrollmentStatus.PENDING) return 'Enrollment pending approval.';
    return 'Continue your learning journey.';
  });

  readonly ringDash = computed(() => {
    const pct = this.vm()?.stats?.readinessScore ?? 0;
    const circ = 2 * Math.PI * 52;
    return `${(pct / 100) * circ} ${circ}`;
  });

  readonly kpis = computed(() => {
    const s = this.vm()?.stats;
    if (!s) return [];
    return [
      { icon: '📈', value: s.overallProgressPct + '%', label: 'Overall' },
      { icon: '📦', value: s.modulesCompleted + '', label: 'Modules Done' },
      { icon: '🧪', value: s.simulationsCompleted + '', label: 'Simulations' },
      { icon: '📋', value: s.caseStudiesCompleted + '', label: 'Case Studies' },
      { icon: '⏱️', value: s.totalStudyMinutes + ' min', label: 'Study Time' },
      { icon: '🔥', value: s.currentStreak + ' days', label: 'Streak' },
      { icon: '🎯', value: s.averageScore + '%', label: 'Avg Score' },
      { icon: '🧠', value: s.averageSimulationScore + '%', label: 'Sim Score' },
    ];
  });

  readonly moduleBars = computed(() =>
    (this.vm()?.moduleProgress || [])
      .slice()
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map((m) => ({
        label: m.moduleId,
        value: Math.max(0, Math.min(100, Math.round(Number(m.progressPct || 0)))),
      }))
  );

  readonly scoreTrend = computed(() => {
    const attempts = (this.vm()?.assessmentAttempts || [])
      .slice()
      .sort((a, b) => this.toEpoch(a.completedAt) - this.toEpoch(b.completedAt))
      .map((a) => Math.max(0, Math.min(100, Math.round(Number(a.score || 0)))));

    if (attempts.length < 2) return { line: '', area: '', points: [] as { x: number; y: number }[] };

    const W = 400, H = 160, pad = 12;
    const stepX = (W - 2 * pad) / (attempts.length - 1);
    const pts = attempts.map((val, i) => ({
      x: pad + i * stepX,
      y: H - pad - ((val / 100) * (H - 2 * pad)),
    }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const area = `${pad},${H - pad} ${line} ${pts[pts.length - 1].x},${H - pad}`;
    return { line, area, points: pts };
  });

  private toEpoch(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'object' && val !== null && 'toMillis' in val) {
      return (val as { toMillis(): number }).toMillis();
    }
    if (val instanceof Date) return val.getTime();
    return 0;
  }
}
