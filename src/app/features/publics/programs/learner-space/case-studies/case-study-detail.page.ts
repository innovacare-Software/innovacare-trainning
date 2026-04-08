import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerCaseStudiesService } from '../services/learner-case-studies.service';

@Component({
  selector: 'app-case-study-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    @if (caseStudy(); as cs) {
      <div class="cd-page">
        <a class="cd-back" routerLink="../">← Case Studies</a>

        <div class="cd-header">
          <span class="cd-scoring">{{ cs.scoringMode }} scoring</span>
          <h1 class="cd-title">{{ cs.title }}</h1>
          <p class="cd-desc">{{ cs.description }}</p>
        </div>

        <!-- Scenario -->
        <div class="cd-scenario-box">
          <h2 class="cd-section-title">📋 Clinical Scenario</h2>
          <p class="cd-scenario-text">{{ cs.scenario }}</p>
        </div>

        <!-- Questions -->
        <div class="cd-questions">
          <h2 class="cd-section-title">Questions</h2>
          @for (q of cs.questions; track q.id; let i = $index) {
            <div class="cd-question">
              <label class="cd-q-label">
                <span class="cd-q-num">Q{{ i + 1 }}</span>
                {{ q.prompt }}
              </label>
              <textarea class="cd-answer"
                [placeholder]="'Type your answer for Q' + (i + 1) + '…'"
                rows="3"
                [ngModel]="answers()[q.id] || ''"
                (ngModelChange)="updateAnswer(q.id, $event)">
              </textarea>
            </div>
          }
        </div>

        <div class="cd-submit-row">
          <button class="cd-submit-btn" (click)="submit()" [disabled]="submitting()">
            {{ submitting() ? 'Submitting…' : '✅ Submit Answers' }}
          </button>
          @if (submitted()) {
            <span class="cd-success">🎉 Case study submitted successfully!</span>
          }
        </div>
      </div>
    } @else {
      <div class="cd-loading"><div class="cd-spinner"></div><span>Loading case study…</span></div>
    }
  `,
  styles: [`
    .cd-page { max-width: 800px; }
    .cd-back { font-size: .78rem; color: #6366f1; text-decoration: none; display: inline-block; margin-bottom: 1rem; }

    .cd-header {
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border: 1px solid #d1fae5; border-radius: 14px; padding: 1.4rem; margin-bottom: 1.2rem;
    }
    .cd-scoring {
      display: inline-block; font-size: .62rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px; background: #d1fae5; color: #059669; margin-bottom: .4rem;
    }
    .cd-title { font-size: 1.3rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .cd-desc { font-size: .82rem; color: #6b7280; margin: 0; }

    .cd-scenario-box {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-left: 3px solid #6366f1; border-radius: 10px; padding: 1.2rem; margin-bottom: 1.5rem;
    }
    .cd-section-title { font-size: .9rem; font-weight: 700; color: #111827; margin: 0 0 .5rem; }
    .cd-scenario-text { font-size: .85rem; color: #374151; line-height: 1.6; margin: 0; }

    .cd-questions { margin-bottom: 1.5rem; }
    .cd-question { margin-bottom: 1rem; }
    .cd-q-label { display: flex; align-items: flex-start; gap: .4rem; font-size: .85rem; color: #111827; margin-bottom: .4rem; }
    .cd-q-num {
      font-size: .65rem; font-weight: 800; color: #4f46e5;
      background: #eef2ff; padding: .15rem .35rem; border-radius: 4px; flex-shrink: 0;
    }

    .cd-answer {
      width: 100%; padding: .6rem .8rem; background: #ffffff;
      border: 1px solid #e5e7eb; border-radius: 8px;
      color: #374151; font-size: .82rem; font-family: inherit; resize: vertical;
      transition: border-color .2s;
    }
    .cd-answer:focus { outline: none; border-color: #6366f1; }
    .cd-answer::placeholder { color: #9ca3af; }

    .cd-submit-row { display: flex; align-items: center; gap: .8rem; }
    .cd-submit-btn {
      padding: .6rem 1.5rem; background: #6366f1; color: #fff; border: none; border-radius: 8px;
      font-size: .85rem; font-weight: 700; cursor: pointer; transition: background .2s;
    }
    .cd-submit-btn:hover:not(:disabled) { background: #4f46e5; }
    .cd-submit-btn:disabled { opacity: .5; cursor: not-allowed; }
    .cd-success { font-size: .82rem; color: #059669; font-weight: 600; }

    .cd-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .cd-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class CaseStudyDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly caseStudiesService = inject(LearnerCaseStudiesService);

  submitting = signal(false);
  submitted = signal(false);
  answers = signal<Record<string, string>>({});

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly caseStudyId$ = this.route.paramMap.pipe(map((p) => p.get('caseStudyId') || ''));

  readonly caseStudy = toSignal(
    combineLatest([this.programId$, this.caseStudyId$]).pipe(
      switchMap(([pid, csid]) => this.caseStudiesService.getCaseStudy(pid, csid))
    ),
    { initialValue: undefined }
  );

  updateAnswer(questionId: string, value: string): void {
    this.answers.update((prev) => ({ ...prev, [questionId]: value }));
  }

  async submit(): Promise<void> {
    const cs = this.caseStudy();
    if (!cs) return;
    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      await this.caseStudiesService.submitAttempt({
        userId: '',
        programId,
        moduleId: cs.moduleId,
        caseStudyId: cs.id,
        score: 0,
        passed: false,
        answers: this.answers(),
      });
      this.submitted.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
