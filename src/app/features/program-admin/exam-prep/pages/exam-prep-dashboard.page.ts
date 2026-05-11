import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';

@Component({
  selector: 'app-exam-prep-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="dashboard">
      <header class="hero">
        <div>
          <p class="eyebrow">Exam Prep Control Tower</p>
          <h1>Nursing Exam Prep Engine</h1>
          <p class="hero-copy">
            Organization-scoped authoring workspace for question-bank governance, NGN case studies,
            blueprint assembly, and secure assessment definitions.
          </p>
        </div>
        <div class="hero-actions">
          <a routerLink="/program-admin/exam-prep/question-bank" class="btn primary">Question Bank</a>
          <a routerLink="/program-admin/exam-prep/library-preview" class="btn">Library Preview</a>
          <a routerLink="/program-admin/exam-prep/blueprints" class="btn">Blueprints</a>
          <a routerLink="/program-admin/exam-prep/assessments" class="btn">Assessments</a>
          <a routerLink="/program-admin/exam-prep/runtime" class="btn">Runtime</a>
        </div>
      </header>

      <section class="org-banner" *ngIf="!orgId(); else statsBlock">
        <h2>Organization context required</h2>
          <p>The exam-prep authoring layer writes inside organization-scoped collections and is disabled until an organization is selected on the current user profile.</p>
      </section>

      <ng-template #statsBlock>
        <section class="stats-grid" *ngIf="stats() as s">
          <article class="stat-card">
            <span>Questions</span>
            <strong>{{ s.questionCount }}</strong>
            <small>{{ s.publishedQuestionCount }} published</small>
          </article>
          <article class="stat-card">
            <span>Case Studies</span>
            <strong>{{ s.caseStudyCount }}</strong>
            <small>NGN bundles and shared-context sets</small>
          </article>
          <article class="stat-card">
            <span>Blueprints</span>
            <strong>{{ s.blueprintCount }}</strong>
            <small>Assembly and readiness logic</small>
          </article>
          <article class="stat-card">
            <span>Assessments</span>
            <strong>{{ s.assessmentCount }}</strong>
            <small>Module finals and pre-board engines</small>
          </article>
          <article class="stat-card">
            <span>Modules</span>
            <strong>{{ s.moduleCount }}</strong>
            <small>Canonical taxonomy in org scope</small>
          </article>
          <article class="stat-card accent">
            <span>Taxonomy Seed</span>
            <strong>{{ taxonomyStatus() }}</strong>
            <small>Programs, course groups, and modules</small>
          </article>
        </section>

        <section class="grid">
          <article class="panel">
            <div class="panel-head">
              <h2>Launch Workstreams</h2>
              <button type="button" class="btn" (click)="seedTaxonomy()">Seed Canonical Taxonomy</button>
            </div>
            <div class="link-grid">
              <a routerLink="/program-admin/exam-prep/question-bank/new">Create Question Item</a>
              <a routerLink="/program-admin/exam-prep/library-preview">Preview Seed Library</a>
              <a routerLink="/program-admin/exam-prep/case-studies/new">Create Case Study</a>
              <a routerLink="/program-admin/exam-prep/blueprints/new">Create Blueprint</a>
              <a routerLink="/program-admin/exam-prep/assessments/new">Create Assessment</a>
            </div>
            <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
          </article>

          <article class="panel">
            <h2>Governance Coverage</h2>
            <ul class="coverage-list">
              <li>Workflow states: draft, internal review, SME review, approved, published, retired</li>
              <li>Jurisdictions: US, Canada, UAE-DHA, UAE-DOH</li>
              <li>Tracks: NCLEX-RN, NCLEX-PN, DHA, DOH</li>
              <li>Assessment layers: module-bound, comprehensive mock, pre-board final</li>
            </ul>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Generated Library QA</h2>
              <a routerLink="/program-admin/exam-prep/library-preview">Open preview</a>
            </div>
            <p class="empty">Review generated items, linked case studies, and rationale quality before assigning the bank into published assessments.</p>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Runtime Inspection</h2>
              <a routerLink="/program-admin/exam-prep/runtime">Open runtime</a>
            </div>
            <p class="empty">Inspect attemptSessions, assessmentAssemblies, assembly items, and responses for live troubleshooting and migration validation.</p>
          </article>

          <article class="panel wide">
            <div class="panel-head">
              <h2>Recent Question Activity</h2>
              <a routerLink="/program-admin/exam-prep/question-bank">Open bank</a>
            </div>
            <div class="data-list" *ngIf="recentQuestions().length; else emptyQuestions">
              <div class="data-row" *ngFor="let item of recentQuestions()">
                <div>
                  <strong>{{ item.stem || 'Untitled item' }}</strong>
                  <span>{{ item.moduleTitle }} · {{ item.itemType }} · {{ item.workflowStatus }}</span>
                </div>
                <a [routerLink]="['/program-admin/exam-prep/question-bank', item.id, 'edit']">Edit</a>
              </div>
            </div>
            <ng-template #emptyQuestions>
              <p class="empty">No authored items yet.</p>
            </ng-template>
          </article>

          <article class="panel wide">
            <div class="panel-head">
              <h2>Recent Blueprints</h2>
              <a routerLink="/program-admin/exam-prep/blueprints">Open blueprints</a>
            </div>
            <div class="data-list" *ngIf="recentBlueprints().length; else emptyBlueprints">
              <div class="data-row" *ngFor="let blueprint of recentBlueprints()">
                <div>
                  <strong>{{ blueprint.title || 'Untitled blueprint' }}</strong>
                  <span>{{ blueprint.totalQuestionCount }} questions · {{ blueprint.caseStudyBundleQuota }} case studies · {{ blueprint.examTrack }}</span>
                </div>
                <a [routerLink]="['/program-admin/exam-prep/blueprints', blueprint.id, 'edit']">Edit</a>
              </div>
            </div>
            <ng-template #emptyBlueprints>
              <p class="empty">No blueprints yet.</p>
            </ng-template>
          </article>
        </section>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .dashboard { display: grid; gap: 1rem; }
      .hero, .panel, .org-banner {
        border: 1px solid #d7e2ef;
        border-radius: 1rem;
        background: #fff;
        padding: 1.1rem 1.2rem;
        box-shadow: 0 4px 16px rgba(15, 53, 92, 0.06);
      }
      .hero { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: #537595; font-weight: 800; }
      .hero h1 { margin: 0.25rem 0; }
      .hero-copy { margin: 0; color: #5e7893; max-width: 64ch; line-height: 1.55; }
      .hero-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: flex-start; }
      .btn {
        border: 1px solid #c7d8ea;
        background: #f8fbff;
        color: #1f4f7d;
        text-decoration: none;
        border-radius: 0.7rem;
        padding: 0.55rem 0.8rem;
        cursor: pointer;
        font-weight: 700;
      }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .stats-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .stat-card {
        border: 1px solid #dce7f3;
        border-radius: 0.9rem;
        background: linear-gradient(180deg, #ffffff, #f7fbff);
        padding: 0.95rem 1rem;
        display: grid;
        gap: 0.2rem;
      }
      .stat-card span, .stat-card small { color: #61809c; }
      .stat-card strong { font-size: 1.7rem; color: #163f69; }
      .stat-card.accent { background: linear-gradient(145deg, #eef7ff, #fff8ee); }
      .grid { display: grid; gap: 0.9rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .wide { grid-column: span 2; }
      .panel-head { display: flex; justify-content: space-between; gap: 0.7rem; align-items: center; }
      .panel-head h2 { margin: 0; }
      .panel-head a { color: #1a6cb5; text-decoration: none; font-weight: 700; }
      .link-grid { margin-top: 0.85rem; display: grid; gap: 0.55rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .link-grid a {
        border: 1px solid #d7e4f2;
        border-radius: 0.8rem;
        padding: 0.8rem;
        text-decoration: none;
        color: #224f7d;
        background: #f8fbff;
        font-weight: 700;
      }
      .coverage-list { margin: 0.75rem 0 0; padding-left: 1.1rem; color: #5d7792; display: grid; gap: 0.4rem; }
      .data-list { margin-top: 0.8rem; display: grid; gap: 0.5rem; }
      .data-row {
        border: 1px solid #e4edf7;
        border-radius: 0.75rem;
        padding: 0.7rem 0.8rem;
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: center;
      }
      .data-row strong, .org-banner h2 { color: #173f68; }
      .data-row span, .org-banner p, .empty, .status { color: #64809c; }
      .data-row a { color: #1a6cb5; font-weight: 700; text-decoration: none; }
      @media (max-width: 900px) {
        .stats-grid, .grid, .link-grid { grid-template-columns: 1fr; }
        .wide { grid-column: span 1; }
      }
    `,
  ],
})
export class ExamPrepDashboardPage {
  private readonly examPrep = inject(ExamPrepAdminService);
  private readonly orgContext = inject(OrgContextService);

  private readonly context = toSignal(this.orgContext.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly stats = toSignal(this.examPrep.dashboardStats$, {
    initialValue: {
      questionCount: 0,
      publishedQuestionCount: 0,
      caseStudyCount: 0,
      blueprintCount: 0,
      assessmentCount: 0,
      moduleCount: 0,
    },
  });
  readonly questions = toSignal(this.examPrep.questionBank$, { initialValue: [] });
  readonly blueprints = toSignal(this.examPrep.blueprints$, { initialValue: [] });
  readonly recentQuestions = computed(() => this.questions().slice(0, 6));
  readonly recentBlueprints = computed(() => this.blueprints().slice(0, 6));
  readonly orgId = computed(() => this.context().orgId ?? '');
  readonly taxonomyStatus = computed(() => (this.stats().moduleCount > 0 ? 'Ready' : 'Pending'));
  readonly statusMessage = signal('');

  async seedTaxonomy(): Promise<void> {
    this.statusMessage.set('');
    try {
      await this.examPrep.seedCanonicalTaxonomy();
      this.statusMessage.set('Canonical programs, course groups, and modules seeded for the current organization.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to seed canonical taxonomy.');
    }
  }
}