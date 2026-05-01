import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { ProgramContentDashboardService } from '../services/program-content-dashboard.service';
import { ProgramsAdminService } from '../../services/programs-admin.service';

@Component({
  selector: 'app-program-content-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="content-dashboard">
      <header class="page-header">
        <a routerLink="/program-admin/programs" class="back-link">← Programs</a>
        <div class="prog-info" *ngIf="program() as p">
          <p class="eyebrow">{{ p.category }} · {{ p.status }}</p>
          <h1>{{ p.title }}</h1>
          <p class="subtitle">{{ p.subtitle }}</p>
          <span class="badge" [class.active]="p.active">{{ p.active ? 'Active' : 'Inactive' }}</span>
        </div>
      </header>

      <section class="kpi-grid" *ngIf="stats() as s">
        <article class="kpi-card">
          <span class="kpi-icon">📦</span>
          <strong>{{ s.modulesCount }}</strong>
          <p>Modules</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">📖</span>
          <strong>{{ s.lessonsCount }}</strong>
          <p>Lessons</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">📄</span>
          <strong>{{ s.documentsCount }}</strong>
          <p>Documents</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">📡</span>
          <strong>{{ s.liveSessionsCount }}</strong>
          <p>Live Sessions</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">📝</span>
          <strong>{{ s.assessmentsCount }}</strong>
          <p>Assessments</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">🖥️</span>
          <strong>{{ s.simulationsCount }}</strong>
          <p>Simulations</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">🔬</span>
          <strong>{{ s.caseStudiesCount }}</strong>
          <p>Case Studies</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon">📁</span>
          <strong>{{ s.resourcesCount }}</strong>
          <p>Resources</p>
        </article>
      </section>

      <div class="two-col">
        <section class="readiness-panel" *ngIf="readiness() as r">
          <h2>Content Readiness</h2>
          <div class="readiness-score">
            <div class="score-header">
              <span>Completeness</span>
              <strong>{{ r.score }}%</strong>
            </div>
            <div class="score-bar">
              <div class="score-fill" [style.width.%]="r.score"
                   [class.high]="r.score >= 80"
                   [class.mid]="r.score >= 40 && r.score < 80"></div>
            </div>
          </div>
          <ul class="readiness-checks">
            <li *ngFor="let item of r.items" [class.ok]="item.ok">
              <span class="check-icon">{{ item.ok ? '✓' : '✗' }}</span>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </section>

        <section class="quick-actions">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <a [routerLink]="['/program-admin/programs', programId(), 'modules', 'new']" class="action-btn primary">+ Add Module</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'lessons', 'new']" class="action-btn">+ Add Lesson</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'documents', 'new']" class="action-btn">+ Add Document</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'live-sessions', 'new']" class="action-btn">+ Add Live Session</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'assessments', 'new']" class="action-btn">+ Add Assessment</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'simulations', 'new']" class="action-btn">+ Add Simulation</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'case-studies', 'new']" class="action-btn">+ Add Case Study</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'preview']" class="action-btn accent">👁 Preview</a>
          </div>

          <h3 class="section-subtitle">Browse Content</h3>
          <div class="actions-grid">
            <a [routerLink]="['/program-admin/programs', programId(), 'modules']" class="nav-link">📦 Modules</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'lessons']" class="nav-link">📖 Lessons</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'documents']" class="nav-link">📄 Documents</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'live-sessions']" class="nav-link">📡 Live Sessions</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'assessments']" class="nav-link">📝 Assessments</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'simulations']" class="nav-link">🖥️ Simulations</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'case-studies']" class="nav-link">🔬 Case Studies</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'resources']" class="nav-link">📁 Resources</a>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      .content-dashboard { display: grid; gap: 1rem; }

      .page-header {
        background: #fff;
        border: 1px solid #d4e2f0;
        border-radius: 1rem;
        padding: 1.2rem 1.4rem;
      }

      .back-link {
        color: #1a74c8;
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
      }

      .prog-info { margin-top: 0.6rem; }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        font-weight: 700;
        color: #4f7097;
      }

      h1 { margin: 0.25rem 0; color: #0f3659; }

      .subtitle { margin: 0; color: #5f7a96; }

      .badge {
        display: inline-block;
        margin-top: 0.4rem;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        background: #f1f5fb;
        color: #6b8aaa;
      }
      .badge.active { background: #d1fadf; color: #027a48; }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .kpi-card {
        background: #fff;
        border: 1px solid #d9e5f2;
        border-radius: 0.9rem;
        padding: 1rem;
        text-align: center;
      }

      .kpi-icon { font-size: 1.5rem; }

      .kpi-card strong {
        display: block;
        font-size: 1.8rem;
        color: #0f3659;
        margin: 0.2rem 0;
      }

      .kpi-card p { margin: 0; color: #5f7a96; font-size: 0.85rem; }

      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .readiness-panel, .quick-actions {
        background: #fff;
        border: 1px solid #d9e5f2;
        border-radius: 1rem;
        padding: 1.2rem;
      }

      h2 { margin: 0 0 1rem; color: #0f3659; font-size: 1.05rem; }

      .readiness-score { margin-bottom: 1rem; }

      .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.4rem;
        font-size: 0.9rem;
        color: #4f7097;
      }

      .score-header strong { color: #0f3659; font-size: 1rem; }

      .score-bar {
        height: 8px;
        background: #e8f0fb;
        border-radius: 4px;
        overflow: hidden;
      }

      .score-fill {
        height: 100%;
        background: #e74c3c;
        border-radius: 4px;
        transition: width 0.4s ease;
      }
      .score-fill.mid { background: #f39c12; }
      .score-fill.high { background: #27ae60; }

      .readiness-checks {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
      }

      .readiness-checks li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.6rem;
        border-radius: 0.5rem;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 0.88rem;
      }

      .readiness-checks li.ok {
        background: #f0fdf4;
        color: #166534;
      }

      .check-icon { font-weight: 700; }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .action-btn {
        display: block;
        text-align: center;
        padding: 0.5rem 0.75rem;
        border-radius: 0.6rem;
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
        background: #f0f6ff;
        color: #1a74c8;
        border: 1px solid #c8dff7;
        transition: background 0.15s;
      }

      .action-btn:hover { background: #dceeff; }

      .action-btn.primary {
        background: linear-gradient(135deg, #0f3659, #1a74c8);
        color: #fff;
        border-color: transparent;
      }

      .action-btn.accent {
        background: #f0fdf4;
        color: #166534;
        border-color: #bbf7d0;
      }

      .nav-link {
        display: block;
        text-align: center;
        padding: 0.45rem 0.6rem;
        border-radius: 0.55rem;
        text-decoration: none;
        font-size: 0.82rem;
        font-weight: 500;
        background: #fafbfd;
        color: #3a5a7a;
        border: 1px solid #e3ecf6;
        transition: background 0.15s;
      }

      .nav-link:hover { background: #edf3fc; }

      .section-subtitle {
        font-size: 0.85rem;
        color: #5f7a96;
        margin: 0.75rem 0 0.5rem;
        font-weight: 600;
      }

      @media (max-width: 1100px) {
        .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .two-col { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ProgramContentDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardService = inject(ProgramContentDashboardService);
  private readonly programsService = inject(ProgramsAdminService);

  readonly programId = signal(this.getRequiredProgramId());

  readonly program = toSignal(
    this.programId() ? this.programsService.getProgramById(this.programId()) : of(null)
  );

  readonly stats = toSignal(
    this.programId() ? this.dashboardService.getProgramContentStats(this.programId()) : of(undefined)
  );

  readonly readiness = toSignal(
    this.programId() ? this.dashboardService.getProgramContentReadiness(this.programId()) : of(undefined)
  );

  private getRequiredProgramId(): string {
    return this.route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim()) ?? '';
  }
}
