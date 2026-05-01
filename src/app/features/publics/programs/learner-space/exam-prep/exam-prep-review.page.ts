import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, firstValueFrom, map, switchMap } from 'rxjs';
import {
  LearnerExamPrepProgressPayload,
  LearnerExamPrepService,
  LearnerExamQuestionStatus,
} from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-review-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (session(); as session) {
      <section class="review-shell">
        <a class="back-link" routerLink="../session">Return to question player</a>

        <header class="review-header">
          <div>
            <span class="eyebrow">Review before submission</span>
            <h1>{{ session.title }}</h1>
            <p>Use the palette below to locate unanswered or flagged items before final submission.</p>
          </div>
          <div class="header-stats">
            <article>
              <span>Answered</span>
              <strong>{{ session.answeredCount }}</strong>
            </article>
            <article>
              <span>Unanswered</span>
              <strong>{{ session.unansweredCount }}</strong>
            </article>
            <article>
              <span>Flagged</span>
              <strong>{{ session.flaggedCount }}</strong>
            </article>
          </div>
        </header>

        <div class="review-grid">
          <section class="review-panel">
            <div class="filter-row">
              @for (filter of filters; track filter.id) {
                <button type="button" class="filter-btn" [class.filter-btn--active]="activeFilter() === filter.id" (click)="activeFilter.set(filter.id)">
                  {{ filter.label }}
                </button>
              }
            </div>

            <div class="question-grid">
              @for (item of filteredItems(); track item.questionId) {
                <button type="button" class="question-tile" [class.question-tile--answered]="item.status === 'answered' || item.status === 'flagged_and_answered'" [class.question-tile--flagged]="item.status === 'flagged' || item.status === 'flagged_and_answered'" (click)="resumeAt(item.index)">
                  <span>Question {{ item.index + 1 }}</span>
                  <strong>{{ statusLabel(item.status) }}</strong>
                </button>
              }
            </div>
          </section>

          <aside class="review-panel guidance-panel">
            <span class="guidance-kicker">Submission pass</span>
            <h2>Final quality check</h2>
            <p>Use the palette to revisit unanswered or flagged items, then submit once the attempt looks complete.</p>
            <div class="guidance-list">
              <article>
                <strong>Flagged</strong>
                <span>{{ session.flaggedCount }} items still marked for review</span>
              </article>
              <article>
                <strong>Unanswered</strong>
                <span>{{ session.unansweredCount }} items may still reduce the final score</span>
              </article>
              <article>
                <strong>Answered</strong>
                <span>{{ session.answeredCount }} items already captured in the secure session</span>
              </article>
            </div>
          </aside>
        </div>

        <footer class="review-footer">
          <button type="button" class="ghost-btn" routerLink="../session">Back to exam</button>
          <button type="button" class="primary-btn" (click)="confirmOpen.set(true)" [disabled]="submitting()">Submit final attempt</button>
        </footer>

        @if (confirmOpen()) {
          <div class="modal-backdrop" (click)="confirmOpen.set(false)"></div>
          <section class="modal-card" role="dialog" aria-modal="true" aria-label="Confirm final submit">
            <h2>Finalize exam submission</h2>
            <p>You will not be able to edit answers after confirming.</p>
            <div class="confirm-grid">
              <span>Answered: {{ session.answeredCount }}</span>
              <span>Unanswered: {{ session.unansweredCount }}</span>
              <span>Flagged: {{ session.flaggedCount }}</span>
            </div>
            @if (errorText()) {
              <p class="error-text">{{ errorText() }}</p>
            }
            <div class="modal-actions">
              <button type="button" class="ghost-btn" (click)="confirmOpen.set(false)">Continue reviewing</button>
              <button type="button" class="primary-btn" (click)="submit()" [disabled]="submitting()">{{ submitting() ? 'Submitting…' : 'Confirm submit' }}</button>
            </div>
          </section>
        }
      </section>
    } @else {
      <div class="loading-state">Loading review screen…</div>
    }
  `,
  styles: [
    `
      :host { display: block; min-height: 100%; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .review-shell { display: grid; gap: 1rem; color: #1a1a1a; max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
      .back-link { color: #2c5f7e; text-decoration: none; font-weight: 600; font-size: .84rem; }
      .review-header,
      .review-panel,
      .modal-card {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        background: #fff;
        padding: 1.25rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .review-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        background: #2c5f7e;
        color: #fff;
      }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.45rem;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #ffd700;
      }
      h1, h2, p { margin: 0; }
      .review-header p { margin-top: 0.35rem; color: rgba(255,255,255,.82); }
      .header-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        min-width: min(100%, 360px);
      }
      .review-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
        gap: 1rem;
      }
      .header-stats article,
      .question-tile {
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 4px;
        padding: 0.95rem 1rem;
        background: rgba(255,255,255,.1);
        color: rgba(255,255,255,.85);
      }
      .header-stats span,
      .question-tile span,
      .loading-state,
      .error-text,
      .confirm-grid span {
        color: rgba(255,255,255,.75);
        font-size: 0.84rem;
      }
      .header-stats strong,
      .question-tile strong {
        display: block;
        margin-top: 0.25rem;
        color: #fff;
      }
      .filter-row,
      .review-footer,
      .modal-actions,
      .confirm-grid {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .filter-btn,
      .ghost-btn,
      .primary-btn {
        min-height: 42px;
        padding: 0 1rem;
        border-radius: 14px;
        font-weight: 700;
      }
      .filter-btn,
      .ghost-btn {
        border: 1px solid #e1e5ea;
        background: transparent;
        color: #2c5f7e;
      }
      .filter-btn--active {
        border-color: #2c5f7e;
        background: rgba(44,95,126,.08);
        color: #2c5f7e;
      }
      .primary-btn {
        border: 0;
        background: #2c5f7e;
        color: #fff;
        box-shadow: 0 4px 12px rgba(11, 60, 93, .3);
      }
      .question-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .question-tile {
        text-align: left;
        cursor: pointer;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .question-tile:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(15, 35, 58, 0.08);
      }
      .question-tile--answered {
        background: linear-gradient(180deg, #edf8f1 0%, #f8fdf9 100%);
        border-color: #bfd8c8;
      }
      .question-tile--flagged {
        background: linear-gradient(180deg, #fff7e8 0%, #fffdf6 100%);
        border-color: #efd6a3;
      }
      .guidance-panel {
        display: grid;
        gap: 0.9rem;
        align-content: start;
        background: #f7f9fb;
      }
      .guidance-kicker {
        display: inline-flex;
        align-items: center;
        justify-self: start;
        min-height: auto;
        padding: 0;
        border-radius: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #990011;
        background: transparent;
        border: none;
      }
      .guidance-list {
        display: grid;
        gap: 0.75rem;
      }
      .guidance-list article {
        display: grid;
        gap: 0.25rem;
        padding: 0.95rem 1rem;
        border-radius: 6px;
        border: 1px solid #e1e5ea;
        background: #fff;
      }
      .guidance-list strong { color: #1a1a1a; }
      .guidance-list span {
        color: #666666;
        font-size: 0.84rem;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(11, 22, 38, 0.42);
      }
      .modal-card {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 30;
        width: min(520px, calc(100vw - 24px));
        transform: translate(-50%, -50%);
        display: grid;
        gap: 1rem;
      }
      .confirm-grid {
        padding: 0.85rem 0.95rem;
        border-radius: 4px;
        background: #f7f9fb;
        border: 1px solid #e1e5ea;
      }
      .error-text { color: #ab2f2f; font-weight: 700; }
      .loading-state { padding: 2rem; text-align: center; }
      @media (max-width: 900px) {
        .review-header,
        .header-stats,
        .review-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ExamPrepReviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examPrep = inject(LearnerExamPrepService);

  readonly confirmOpen = signal(false);
  readonly submitting = signal(false);
  readonly errorText = signal('');
  readonly activeFilter = signal<'all' | 'answered' | 'unanswered' | 'flagged'>('all');

  readonly filters = [
    { id: 'all', label: 'All items' },
    { id: 'unanswered', label: 'Unanswered' },
    { id: 'flagged', label: 'Flagged' },
    { id: 'answered', label: 'Answered' },
  ] as const;

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((params) => params.get('programId') || ''));
  private readonly assessmentId$ = this.route.paramMap.pipe(map((params) => params.get('assessmentId') || ''));

  readonly session = toSignal(
    combineLatest([this.programId$, this.assessmentId$]).pipe(
      switchMap(([programId, assessmentId]) => this.examPrep.startAttempt(programId, assessmentId))
    ),
    { initialValue: null }
  );

  constructor() {
    effect(() => {
      const session = this.session();
      const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
      if (!session) {
        return;
      }

      if (session.status === 'submitted' || session.status === 'timed_out') {
        void this.router.navigate(['/my-programs', programId, 'exam-prep', 'results', session.attemptId]);
        return;
      }

      if (session.status === 'expired') {
        void this.router.navigate(['/my-programs', programId, 'exam-prep', 'timeout', session.attemptId]);
        return;
      }

      if (!session.policy.reviewAllowed) {
        void this.router.navigate(['../session'], { relativeTo: this.route });
      }
    });
  }

  readonly filteredItems = computed(() => {
    const session = this.session();
    const filter = this.activeFilter();
    if (!session) {
      return [];
    }

    return session.questions
      .map((question, index) => ({
        index,
        questionId: question.id,
        status: session.questionStatuses[question.id] || 'unanswered',
      }))
      .filter((item) => {
        if (filter === 'answered') {
          return item.status === 'answered' || item.status === 'flagged_and_answered';
        }
        if (filter === 'flagged') {
          return item.status === 'flagged' || item.status === 'flagged_and_answered';
        }
        if (filter === 'unanswered') {
          return item.status === 'unanswered' || item.status === 'visited_unanswered' || item.status === 'flagged';
        }
        return true;
      });
  });

  statusLabel(status: LearnerExamQuestionStatus): string {
    switch (status) {
      case 'answered':
        return 'Answered';
      case 'flagged':
        return 'Flagged';
      case 'flagged_and_answered':
        return 'Flagged and answered';
      case 'visited_unanswered':
        return 'Visited, unanswered';
      default:
        return 'Unanswered';
    }
  }

  async resumeAt(index: number): Promise<void> {
    const session = this.session();
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!session) {
      return;
    }

    const payload: LearnerExamPrepProgressPayload = {
      attemptId: session.attemptId,
      answers: session.answers,
      flags: session.flags,
      visitedQuestionIds: session.visitedQuestionIds,
      currentQuestionIndex: index,
      questionDurations: session.questionDurations,
      eventType: 'review_opened',
    };
    await this.examPrep.saveProgress(payload);
    await this.router.navigate(['/my-programs', programId, 'exam-prep', session.assessmentId, 'session']);
  }

  async submit(): Promise<void> {
    const session = this.session();
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!session) {
      return;
    }

    this.submitting.set(true);
    this.errorText.set('');
    try {
      const response = await this.examPrep.submitAttempt({
        attemptId: session.attemptId,
        answers: session.answers,
        flags: session.flags,
        questionDurations: session.questionDurations,
        elapsedSeconds: Math.max(1, Math.round((Date.now() + (session.serverNowMs - Date.now()) - session.startedAtMs) / 1000)),
        submitMode: 'manual',
      });
      if (response.status === 'expired') {
        await this.router.navigate(['/my-programs', programId, 'exam-prep']);
        return;
      }
      await this.router.navigate(['/my-programs', programId, 'exam-prep', 'results', response.reviewId || response.attemptId]);
    } catch (error) {
      this.errorText.set(error instanceof Error ? error.message : 'Unable to submit this attempt.');
    } finally {
      this.submitting.set(false);
    }
  }
}
