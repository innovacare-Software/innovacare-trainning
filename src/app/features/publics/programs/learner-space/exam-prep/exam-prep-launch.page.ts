import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerExamPrepAssessmentSummary, LearnerExamPrepService } from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-launch-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (vm(); as data) {
      @if (data.assessment) {
        <section class="launch-shell">
          <a class="back-link" routerLink="../">Back to exam catalogue</a>

          <header class="hero-card">
            <div class="hero-copy">
              <span class="eyebrow">{{ data.assessment.isCustom ? 'Custom Exam Delivery' : 'Exam Delivery' }}</span>
              <h1>{{ data.assessment.title }}</h1>
              <p>{{ data.assessment.description }}</p>
              <div class="hero-pills">
                <span>{{ deliveryModeLabel(data.assessment.policy.deliveryMode) }}</span>
                <span>{{ data.assessment.policy.reviewAllowed ? 'Review screen enabled' : 'No review screen' }}</span>
                <span>{{ data.assessment.autoSubmitOnTimeout ? 'Auto submit on timeout' : 'Locks on timeout' }}</span>
                @if (data.assessment.policy.allowPauseScreen) {
                  <span>Quitter et reprendre plus tard</span>
                }
              </div>
            </div>
            <div class="hero-stats" aria-label="Assessment overview">
              <article>
                <span>Duration</span>
                <strong>{{ data.assessment.durationMinutes }} min</strong>
              </article>
              <article>
                <span>Items</span>
                <strong>{{ data.assessment.drawCount }}</strong>
              </article>
              <article>
                <span>Passing score</span>
                <strong>{{ data.assessment.passingScorePercent }}%</strong>
              </article>
              <article>
                <span>Navigation</span>
                <strong>{{ navigationLabel(data.assessment.policy.navigationMode) }}</strong>
              </article>
            </div>
          </header>

          <div class="launch-grid">
            <section class="panel">
              <h2>Instructions</h2>
              <p>{{ data.assessment.instructions }}</p>
              <ul class="rules-list">
                <li>Questions are delivered one at a time in a focused player.</li>
                <li>The timer starts only after readiness confirmation and never pauses.</li>
                @if (data.assessment.policy.allowPauseScreen) {
                  <li>Vous pouvez quitter le player et reprendre plus tard la même tentative depuis la question sauvegardée pendant que le chronomètre continue de tourner.</li>
                  <li>Vous pouvez aussi abandonner la tentative en cours pour recommencer plus tard sur une nouvelle tentative, si le nombre d'essais restants le permet.</li>
                }
                <li>Responses and your current item are restored after refresh from the persisted session.</li>
                <li>{{ data.assessment.policy.strictNoBacktrack ? 'Once you confirm an item and continue, you cannot return to it.' : 'Navigation rules depend on the selected delivery mode.' }}</li>
                <li>
                  {{ data.assessment.policy.autoSubmitOnTimeout ? 'When the timer reaches zero, the attempt is submitted automatically.' : 'When the timer reaches zero, the attempt expires and answers are locked.' }}
                </li>
                <li>
                  {{ data.assessment.policy.deliveryMode === 'strict_nclex_mode' ? 'You must select and confirm an answer before advancing to the next item.' : (data.assessment.requireAllQuestionsAnswered ? 'All questions must be answered before manual submission.' : 'You may leave items unanswered and return later if navigation allows it.') }}
                </li>
              </ul>
            </section>

            <aside class="panel policy-panel">
              <h2>Attempt policy</h2>
              <dl>
                <div>
                  <dt>Attempt limit</dt>
                  <dd>{{ data.assessment.maxAttempts }}</dd>
                </div>
                <div>
                  <dt>Retake</dt>
                  <dd>{{ data.assessment.allowRetake ? 'Allowed' : 'Disabled' }}</dd>
                </div>
                <div>
                  <dt>Delivery mode</dt>
                  <dd>{{ deliveryModeLabel(data.assessment.policy.deliveryMode) }}</dd>
                </div>
                <div>
                  <dt>Flagging</dt>
                  <dd>{{ data.assessment.policy.allowQuestionFlagging ? 'Enabled' : 'Disabled' }}</dd>
                </div>
                <div>
                  <dt>Score visibility</dt>
                  <dd>{{ data.assessment.showScoreImmediately ? 'Immediate results' : 'Restricted results' }}</dd>
                </div>
              </dl>
              <a class="primary-btn" [routerLink]="['rules']" [state]="{ sourceKind: sourceKind() }">Continue to exam rules</a>
            </aside>
          </div>

          @if (data.history.length) {
            <section class="panel history-panel">
              <div class="section-head">
                <h2>Previous attempts</h2>
                <span>{{ data.history.length }} completed</span>
              </div>
              <div class="history-list">
                @for (attempt of data.history; track attempt.id) {
                  <article class="history-item">
                    <div class="history-copy">
                      <strong>{{ attempt.assessmentTitle }}</strong>
                      <p>{{ historyStatusLabel(attempt.passed, attempt.timedOut) }}</p>
                    </div>
                    <div class="history-actions">
                      <a class="history-link" [routerLink]="attemptResultsLink(attempt.id)">Review details</a>
                      <span class="history-score" [class.history-score--pass]="attempt.passed">{{ attempt.score }}%</span>
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        </section>
      } @else {
        <section class="empty-state">
          <h1>Assessment unavailable</h1>
          <p>This exam is not currently published for your learner space.</p>
          <a class="primary-btn" routerLink="../">Return to catalogue</a>
        </section>
      }
    } @else {
      <div class="loading-state">Loading exam briefing…</div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(255, 191, 105, 0.18), transparent 22%),
          radial-gradient(circle at top right, rgba(10, 162, 148, 0.14), transparent 24%),
          linear-gradient(180deg, #fff8ef 0%, #f7fbff 36%, #ffffff 100%);
      }
      .launch-shell { display: grid; gap: 1rem; color: #132238; }
      .back-link {
        color: #39506b;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 700;
      }
      .hero-card,
      .panel,
      .empty-state {
        border: 1px solid rgba(215, 222, 231, 0.92);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 18px 42px rgba(15, 35, 58, 0.08);
        backdrop-filter: blur(6px);
      }
      .hero-card {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.95fr);
        gap: 1rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, rgba(255, 229, 196, 0.82), rgba(255, 255, 255, 0.96) 42%, rgba(213, 245, 239, 0.88));
      }
      .hero-copy { display: grid; gap: 0.9rem; }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.55rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #45607d;
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      h1 { font-size: clamp(1.7rem, 2vw, 2.2rem); }
      .hero-card p {
        max-width: 70ch;
        color: #50657d;
        line-height: 1.6;
      }
      .hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .hero-pills span {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 0.85rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(215, 222, 231, 0.92);
        color: #2d4961;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .hero-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
        align-content: start;
      }
      .hero-stats article,
      .history-item {
        padding: 0.95rem 1rem;
        border-radius: 16px;
        border: 1px solid #dde5ee;
        background: linear-gradient(180deg, #fbfcfd 0%, #ffffff 100%);
      }
      .hero-stats span,
      dt,
      .history-item p,
      .section-head span {
        color: #66788c;
        font-size: 0.83rem;
      }
      .hero-stats strong,
      dd,
      .history-item strong {
        display: block;
        margin-top: 0.3rem;
        font-size: 1rem;
        color: #0f1d31;
      }
      .launch-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
        gap: 1rem;
      }
      .panel {
        padding: 1.35rem;
        background: rgba(255, 255, 255, 0.92);
      }
      .panel h2 {
        margin-bottom: 0.8rem;
        font-size: 1.05rem;
      }
      .rules-list {
        margin: 0;
        padding-left: 1.2rem;
        color: #42566f;
        line-height: 1.65;
      }
      .rules-list li + li { margin-top: 0.45rem; }
      .policy-panel dl {
        display: grid;
        gap: 0.75rem;
        margin: 0 0 1.1rem;
      }
      .policy-panel div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 0.7rem;
        border-bottom: 1px solid #edf1f5;
      }
      dt,
      dd {
        margin: 0;
      }
      .primary-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        width: 100%;
        border-radius: 16px;
        background: linear-gradient(135deg, #17324f 0%, #1e5b7a 52%, #00a39b 100%);
        color: #ffffff;
        text-decoration: none;
        font-weight: 700;
        box-shadow: 0 14px 28px rgba(20, 63, 93, 0.2);
      }
      .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }
      .history-list {
        display: grid;
        gap: 0.75rem;
      }
      .history-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .history-copy {
        display: grid;
        gap: 0.2rem;
      }
      .history-actions {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .history-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 0.95rem;
        border-radius: 999px;
        border: 1px solid #d7dee7;
        background: #fff;
        color: #17324f;
        text-decoration: none;
        font-weight: 700;
      }
      .history-score {
        font-weight: 800;
        color: #996316;
      }
      .history-score--pass {
        color: #17643b;
      }
      .empty-state,
      .loading-state {
        padding: 2rem;
        text-align: center;
      }
      .loading-state { color: #66788c; }
      @media (max-width: 960px) {
        .launch-grid,
        .hero-card,
        .hero-stats {
          grid-template-columns: 1fr;
        }
        .history-item {
          align-items: flex-start;
          flex-direction: column;
        }
        .history-actions {
          width: 100%;
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class ExamPrepLaunchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly examPrep = inject(LearnerExamPrepService);

  /** Assessment pré-chargé via l'état de navigation (création custom test). */
  private readonly preloadedAssessment: LearnerExamPrepAssessmentSummary | null = (() => {
    const state = window.history.state as { preloadedAssessment?: LearnerExamPrepAssessmentSummary };
    return state?.preloadedAssessment ?? null;
  })();

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((params) => params.get('programId') || ''));
  private readonly assessmentId$ = this.route.paramMap.pipe(map((params) => params.get('assessmentId') || ''));

  readonly vm = toSignal(
    combineLatest([
      this.programId$,
      this.assessmentId$,
      this.programId$.pipe(switchMap((programId) => this.examPrep.getAttemptSummaries(programId))),
    ]).pipe(
      switchMap(([programId, assessmentId, history]) =>
        this.examPrep.getAssessment(programId, assessmentId).pipe(
          map((fetched) => {
            const assessment = fetched ?? this.preloadedAssessment;
            return {
              assessment,
              history: history.filter((attempt) => attempt.assessmentId === (assessment?.id || assessmentId)),
            };
          })
        )
      )
    ),
    { initialValue: null }
  );

  navigationLabel(mode: string): string {
    switch (mode) {
      case 'forward_only':
        return 'Forward only';
      case 'strict_no_backtrack':
        return 'No backtracking';
      default:
        return 'Free navigation';
    }
  }

  deliveryModeLabel(mode: string): string {
    switch (mode) {
      case 'strict_nclex_mode':
        return 'Strict NCLEX-like';
      case 'flaggable_mock_mode':
        return 'Flaggable mock';
      case 'review_mode':
        return 'Review mode';
      default:
        return 'Practice mode';
    }
  }

  historyStatusLabel(passed: boolean, timedOut?: boolean): string {
    return timedOut ? 'Timed out' : passed ? 'Passed' : 'Completed';
  }

  attemptResultsLink(attemptId: string): string[] {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    return ['/my-programs', programId, 'exam-prep', 'results', attemptId];
  }

  sourceKind(): 'assessment' | 'simulation' | undefined {
    const state = window.history.state as { sourceKind?: 'assessment' | 'simulation' };
    return state?.sourceKind;
  }
}
