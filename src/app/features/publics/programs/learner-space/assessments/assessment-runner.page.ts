import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerAssessmentsService } from '../services/learner-assessments.service';

@Component({
  selector: 'app-assessment-runner-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (assessment(); as a) {
      <div class="ar-page">
        <a class="ar-back" routerLink="../">← Assessments</a>
        <div class="ar-header">
          <span class="ar-type">{{ a.type }}</span>
          <h1 class="ar-title">{{ a.title }}</h1>
          <p class="ar-desc">{{ a.description }}</p>
          <div class="ar-meta">
            <span>⏱ {{ a.durationMin }} min</span>
            <span>🎯 Passing Score: {{ a.passingScore }}%</span>
          </div>
        </div>

        <div class="ar-placeholder">
          <div class="ar-placeholder-icon">📝</div>
          <h2>Assessment Environment</h2>
          <p>This assessment contains questions that will test your knowledge of the module content.</p>
          <p class="ar-info">Questions and answer tracking will be rendered here once assessment content is configured by your program administrator.</p>
          <button class="ar-start-btn" (click)="simulateComplete()" [disabled]="submitting()">
            {{ submitting() ? 'Submitting…' : 'Complete Assessment (Demo)' }}
          </button>
        </div>
      </div>
    } @else {
      <div class="ar-loading"><div class="ar-spinner"></div><span>Loading assessment…</span></div>
    }
  `,
  styles: [`
    .ar-page { max-width: 800px; }
    .ar-back { font-size: .78rem; color: #6366f1; text-decoration: none; display: inline-block; margin-bottom: 1rem; }
    .ar-header {
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.4rem; margin-bottom: 1.5rem;
    }
    .ar-type {
      display: inline-block; font-size: .62rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px; background: #eef2ff; color: #4f46e5; margin-bottom: .4rem;
    }
    .ar-title { font-size: 1.3rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .ar-desc { font-size: .82rem; color: #6b7280; margin: 0 0 .5rem; }
    .ar-meta { display: flex; gap: .8rem; font-size: .72rem; color: #9ca3af; }

    .ar-placeholder {
      text-align: center; padding: 3rem 2rem;
      background: #ffffff; border: 1px dashed #d1d5db;
      border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ar-placeholder-icon { font-size: 3rem; margin-bottom: .5rem; }
    .ar-placeholder h2 { font-size: 1.1rem; color: #111827; margin: 0 0 .5rem; }
    .ar-placeholder p { font-size: .82rem; color: #6b7280; margin: 0 0 .3rem; }
    .ar-info { font-size: .75rem; color: #9ca3af; font-style: italic; margin-bottom: 1rem !important; }

    .ar-start-btn {
      padding: .6rem 1.5rem; background: #6366f1; color: #fff; border: none; border-radius: 8px;
      font-size: .85rem; font-weight: 700; cursor: pointer; transition: background .2s;
    }
    .ar-start-btn:hover:not(:disabled) { background: #4f46e5; }
    .ar-start-btn:disabled { opacity: .5; cursor: not-allowed; }

    .ar-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .ar-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AssessmentRunnerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentsService = inject(LearnerAssessmentsService);
  submitting = signal(false);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly assessmentId$ = this.route.paramMap.pipe(map((p) => p.get('assessmentId') || ''));

  readonly assessment = toSignal(
    combineLatest([this.programId$, this.assessmentId$]).pipe(
      switchMap(([pid, aid]) => this.assessmentsService.getAssessment(pid, aid))
    ),
    { initialValue: undefined }
  );

  async simulateComplete(): Promise<void> {
    const a = this.assessment();
    if (!a) return;
    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      await this.assessmentsService.submitAttempt({
        userId: '',
        programId,
        moduleId: a.moduleId,
        assessmentId: a.id,
        score: Math.round(60 + Math.random() * 40),
        passed: true,
        timeSpentMin: a.durationMin,
      });
      this.router.navigate(['../'], { relativeTo: this.route });
    } finally {
      this.submitting.set(false);
    }
  }
}
