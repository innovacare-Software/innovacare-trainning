import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { LearnerExamPrepService } from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-results-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (result(); as result) {
      <section class="results-shell">
        <a class="back-link" [routerLink]="catalogueLink()">Back to exam catalogue</a>

        <header class="results-card headline">
          <span class="eyebrow">{{ result.submissionMode === 'timeout' ? 'Timed completion' : 'Assessment completed' }}</span>
          <h1>{{ result.assessmentTitle }}</h1>
          @if (result.submissionMode === 'timeout') {
            <p>Your time expired and the attempt was submitted automatically using the saved responses.</p>
          } @else {
            <p>Your attempt has been securely submitted.</p>
          }
        </header>

        @if (result.scoreVisible) {
          <section class="results-card performance-panel">
            <article class="gauge-card">
              <div class="gauge-copy">
                <span class="section-kicker">Performance gauge</span>
                <h2>Achievement level</h2>
                <p>The indicator places this attempt on a four-band scale from Low to Very high.</p>
              </div>

              <div class="gauge-shell" [style.--needle-rotation]="gaugeNeedleRotation(result.scorePercent)">
                <svg viewBox="0 0 240 150" class="gauge-svg" aria-hidden="true">
                  <path class="gauge-track" d="M 32 120 A 88 88 0 0 1 208 120" />
                  <path class="gauge-band gauge-band--low" d="M 32 120 A 88 88 0 0 1 57.77 57.77" />
                  <path class="gauge-band gauge-band--moderate" d="M 57.77 57.77 A 88 88 0 0 1 120 32" />
                  <path class="gauge-band gauge-band--high" d="M 120 32 A 88 88 0 0 1 182.23 57.77" />
                  <path class="gauge-band gauge-band--very-high" d="M 182.23 57.77 A 88 88 0 0 1 208 120" />
                  <g class="needle-group">
                    <line class="gauge-needle" x1="120" y1="120" x2="36" y2="120" />
                    <circle class="needle-core" cx="120" cy="120" r="8" />
                  </g>
                </svg>

                <div class="gauge-labels">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Very high</span>
                </div>
              </div>
            </article>

            <article
              class="performance-summary"
              [class.performance-summary--low]="successLevelKey(result.scorePercent) === 'low'"
              [class.performance-summary--moderate]="successLevelKey(result.scorePercent) === 'moderate'"
              [class.performance-summary--high]="successLevelKey(result.scorePercent) === 'high'"
              [class.performance-summary--very-high]="successLevelKey(result.scorePercent) === 'very-high'">
              <span class="section-kicker">Current band</span>
              <strong>{{ successLevelLabel(result.scorePercent) }}</strong>
              <p>{{ successLevelDescription(result.scorePercent) }}</p>
            </article>
          </section>

          <section class="results-card score-grid">
            <article>
              <span>Score</span>
              <strong>{{ result.scorePercent }}%</strong>
            </article>
            <article>
              <span>Status</span>
              <strong [class.pass]="result.passed === true">{{ result.passed ? 'Pass' : 'Needs review' }}</strong>
            </article>
            <article>
              <span>Time used</span>
              <strong>{{ formatElapsed(result.elapsedSeconds) }}</strong>
            </article>
            <article>
              <span>Flagged / unanswered</span>
              <strong>{{ result.flaggedCount }} / {{ result.unansweredCount }}</strong>
            </article>
          </section>

          <section class="results-card breakdown-grid">
            <article>
              <h2>Domain breakdown</h2>
              <div class="score-list">
                @for (entry of entries(result.domainScores); track entry.key) {
                  <div><span>{{ entry.key }}</span><strong>{{ entry.value }}%</strong></div>
                }
              </div>
            </article>
            <article>
              <h2>Module breakdown</h2>
              <div class="score-list">
                @for (entry of entries(result.moduleScores); track entry.key) {
                  <div><span>{{ entry.key }}</span><strong>{{ entry.value }}%</strong></div>
                }
              </div>
            </article>
          </section>
        } @else {
          <section class="results-card restricted-card">
            <h2>Result visibility restricted</h2>
            <p>This assessment does not expose score details immediately. Your attempt has been recorded successfully.</p>
            <div class="restricted-meta">
              <span>Answered: {{ result.answeredCount }}</span>
              <span>Unanswered: {{ result.unansweredCount }}</span>
              <span>Flagged: {{ result.flaggedCount }}</span>
              <span>Time used: {{ formatElapsed(result.elapsedSeconds) }}</span>
            </div>
          </section>
        }

        @if (result.reviewUnlocked && result.items.length) {
          <section class="results-card items-card">
            <div class="section-head">
              <h2>Item review</h2>
              <span>Question {{ activeReviewNumber(result.items.length) }} / {{ result.items.length }}</span>
            </div>
            <div class="review-shell">
              <aside class="review-rail" aria-label="Review progress">
                <div class="review-rail__copy">
                  <span class="section-kicker">Review flow</span>
                  <strong>One question at a time</strong>
                  <p>Move through the completed attempt with the same focused cadence as the exam player.</p>
                </div>
                <div class="review-track">
                  @for (item of result.items; track item.itemId; let idx = $index) {
                    <button
                      type="button"
                      class="review-node"
                      [class.review-node--active]="idx === activeReviewIndex()"
                      [class.review-node--correct]="item.isCorrect"
                      [class.review-node--incorrect]="!item.isCorrect"
                      (click)="goToReviewIndex(idx)">
                      {{ idx + 1 }}
                    </button>
                  }
                </div>
              </aside>

              @if (activeReviewItem(); as item) {
                <article class="item-card">
                  <div class="item-head">
                    <strong>{{ item.stem }}</strong>
                    @if (result.scoreVisible) {
                      <span [class.pass]="item.isCorrect">{{ item.isCorrect ? 'Correct' : 'Incorrect' }}</span>
                    } @else {
                      <span>{{ item.questionStatus || 'recorded' }}</span>
                    }
                  </div>
                  <section class="review-details">
                    <div class="review-details__left">
                      <div class="review-pane review-pane--question">
                        <span class="section-kicker">Question</span>
                        <p>{{ item.leadInQuestion }}</p>
                        <div class="item-meta">
                          <span>Votre réponse: {{ choiceLabels(item, item.selectedAnswerKeys) || 'Aucune réponse' }}</span>
                          @if (result.showCorrectAnswers && item.correctAnswerKeys?.length) {
                            <span>Bonne réponse: {{ choiceLabels(item, item.correctAnswerKeys || []) }}</span>
                          }
                        </div>
                      </div>

                      <div class="review-pane review-pane--answers">
                        <span class="section-kicker">Review details</span>
                        <div class="choice-analysis-list">
                          @for (choice of item.choices; track choice.id) {
                            <article class="choice-analysis"
                              [class.choice-analysis--correct]="isCorrectChoice(item, choice.id)"
                              [class.choice-analysis--selected]="isSelectedChoice(item, choice.id)"
                              [class.choice-analysis--missed]="isMissedCorrectChoice(item, choice.id)"
                              [class.choice-analysis--wrong]="isWrongSelectedChoice(item, choice.id)">
                              <div class="choice-analysis__head">
                                <strong>{{ choice.label }}</strong>
                                <span class="choice-chip" [class.choice-chip--correct]="isCorrectChoice(item, choice.id)" [class.choice-chip--selected]="isSelectedChoice(item, choice.id)" [class.choice-chip--missed]="isMissedCorrectChoice(item, choice.id)" [class.choice-chip--wrong]="isWrongSelectedChoice(item, choice.id)">
                                  {{ choiceStatusLabel(item, choice.id) }}
                                </span>
                              </div>
                              <p>{{ choice.text }}</p>
                              <small>{{ choiceTeachingNote(item, choice.id) }}</small>
                            </article>
                          }
                        </div>
                      </div>
                    </div>

                    <aside class="review-details__right">
                      <div class="review-pane review-pane--rationale">
                        <span class="section-kicker">Rationale</span>
                        <div class="teaching-stack">
                          @if (result.showRationales && item.explanation) {
                            <article>
                              <strong>Why this question matters</strong>
                              <p>{{ item.explanation }}</p>
                            </article>
                          }
                          @if (result.showRationales && item.rationale) {
                            <article>
                              <strong>Clinical explanation</strong>
                              <p>{{ item.rationale }}</p>
                            </article>
                          }
                          <article>
                            <strong>Learning focus</strong>
                            <p>{{ learningFocus(item) }}</p>
                          </article>
                        </div>
                      </div>
                    </aside>
                  </section>

                  <footer class="review-footer">
                    <button type="button" class="review-nav-btn" (click)="previousReviewItem()" [disabled]="activeReviewIndex() === 0">
                      Previous question
                    </button>
                    <div class="review-footer__summary">
                      <span>{{ activeReviewNumber(result.items.length) }} / {{ result.items.length }}</span>
                      <strong>{{ item.isCorrect ? 'Correct review' : 'Incorrect review' }}</strong>
                    </div>
                    <button type="button" class="review-nav-btn review-nav-btn--primary" (click)="nextReviewItem(result.items.length)" [disabled]="activeReviewIndex() >= result.items.length - 1">
                      Next question
                    </button>
                  </footer>
                </article>
              }
            </div>
          </section>
        }
      </section>
    } @else {
      <div class="loading-state">Loading assessment results…</div>
    }
  `,
  styles: [
    `
      :host { display: block; min-height: 100%; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .results-shell { display: grid; gap: 1rem; color: #1a1a1a; max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
      .back-link { color: #2c5f7e; text-decoration: none; font-weight: 600; font-size: .84rem; }
      .results-card {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        background: #fff;
        padding: 1.25rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .headline {
        background: #2c5f7e;
        color: #fff;
        border-color: #2c5f7e;
      }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.55rem;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #ffd700;
      }
      .section-kicker {
        display: inline-flex;
        margin-bottom: 0.4rem;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #990011;
      }
      h1, h2, p { margin: 0; }
      .headline h1 { color: #fff; }
      .headline p { color: rgba(255,255,255,.82); margin-top: .4rem; }
      p { color: #666666; }
      .performance-panel {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
        gap: 1rem;
        background: #f7f9fb;
      }
      .gauge-card,
      .performance-summary {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        padding: 1.1rem;
        background: #fff;
      }
      .gauge-card {
        display: grid;
        gap: 1rem;
      }
      .gauge-shell {
        display: grid;
        gap: 0.35rem;
        justify-items: center;
      }
      .gauge-svg {
        width: min(100%, 430px);
        height: auto;
        overflow: visible;
      }
      .gauge-track,
      .gauge-band {
        fill: none;
        stroke-linecap: round;
        stroke-width: 18;
      }
      .gauge-track { stroke: #e8edf3; }
      .gauge-band--low { stroke: #ea6b5f; }
      .gauge-band--moderate { stroke: #f0a53b; }
      .gauge-band--high { stroke: #7cb96d; }
      .gauge-band--very-high { stroke: #189b7d; }
      .needle-group {
        transform-origin: 120px 120px;
        transform: rotate(var(--needle-rotation, 0deg));
        transition: transform 420ms ease;
      }
      .gauge-needle {
        stroke: #2c5f7e;
        stroke-width: 5;
        stroke-linecap: round;
      }
      .needle-core {
        fill: #2c5f7e;
        stroke: #fff;
        stroke-width: 4;
      }
      .gauge-labels {
        width: min(100%, 430px);
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #5f748a;
        text-align: center;
      }
      .performance-summary {
        display: grid;
        align-content: center;
        gap: 0.6rem;
      }
      .performance-summary strong {
        font-size: clamp(1.8rem, 4vw, 2.7rem);
        line-height: 1;
        color: #1a1a1a;
      }
      .performance-summary--low {
        background: #fff;
        border-color: #f0c1bc;
      }
      .performance-summary--moderate {
        background: #fff;
        border-color: #efd6a3;
      }
      .performance-summary--high {
        background: #fff;
        border-color: #c9dfbf;
      }
      .performance-summary--very-high {
        background: #fff;
        border-color: #b6dfd2;
      }
      .score-grid,
      .breakdown-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.8rem;
      }
      .breakdown-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .score-grid article,
      .breakdown-grid article,
      .item-card {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        padding: 1rem;
        background: #fff;
      }
      .score-grid span,
      .item-meta,
      .restricted-meta,
      .section-head span {
        color: #666666;
        font-size: 0.84rem;
      }
      .score-grid strong,
      .score-list strong,
      .item-head strong {
        display: block;
        margin-top: 0.25rem;
        color: #1a1a1a;
      }
      .score-grid article:nth-child(1) { background: #fff; }
      .score-grid article:nth-child(2) { background: #fff; }
      .score-grid article:nth-child(3) { background: #fff; }
      .score-grid article:nth-child(4) { background: #fff; }
      .pass { color: #17643b; }
      .restricted-card { display: grid; gap: 0.8rem; }
      .restricted-meta { display: flex; flex-wrap: wrap; gap: 0.9rem; }
      .score-list { display: grid; gap: 0.7rem; margin-top: 0.9rem; }
      .score-list div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 0.6rem;
        border-bottom: 1px solid #edf1f5;
      }
      .section-head,
      .item-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: baseline;
      }
      .review-shell {
        display: grid;
        grid-template-columns: minmax(210px, 0.34fr) minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .review-rail {
        display: grid;
        gap: 0.9rem;
        position: sticky;
        top: 1rem;
      }
      .review-rail__copy {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        padding: 1rem;
        background: #f7f9fb;
        display: grid;
        gap: 0.45rem;
      }
      .review-track {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(46px, 1fr));
        gap: 0.55rem;
        padding: 0.9rem;
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        background: #f7f9fb;
      }
      .review-node {
        min-height: 44px;
        border-radius: 4px;
        border: 1px solid #e1e5ea;
        background: #fff;
        color: #2c5f7e;
        font-weight: 800;
        cursor: pointer;
      }
      .review-node--active {
        border-color: #2c5f7e;
        background: #2c5f7e;
        color: #fff;
      }
      .review-node--correct:not(.review-node--active) {
        border-color: #c7dfcf;
        background: rgba(237, 249, 242, 0.95);
        color: #17643b;
      }
      .review-node--incorrect:not(.review-node--active) {
        border-color: #efc1c1;
        background: rgba(255, 241, 241, 0.95);
        color: #a12f2f;
      }
      .item-card { display: grid; gap: 0.6rem; }
      .review-details {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
        gap: 0.9rem;
        align-items: start;
      }
      .review-details__left {
        display: grid;
        gap: 0.9rem;
      }
      .review-pane {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        padding: 1rem;
        background: #fff;
      }
      .review-pane--question { background: #fff; }
      .review-pane--answers { background: #fff; }
      .review-pane--rationale {
        position: sticky;
        top: 1rem;
        background: #f7f9fb;
      }
      .item-meta { display: flex; flex-wrap: wrap; gap: 0.8rem; }
      .choice-analysis-list,
      .teaching-stack {
        display: grid;
        gap: 0.7rem;
      }
      .choice-analysis {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        padding: 0.85rem;
        background: #fff;
        display: grid;
        gap: 0.35rem;
      }
      .choice-analysis__head {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
      }
      .choice-chip {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 0.7rem;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 800;
        background: #edf2f7;
        color: #4a6078;
      }
      .choice-chip--correct {
        background: rgba(222, 244, 231, 0.96);
        color: #17643b;
      }
      .choice-chip--selected {
        background: rgba(227, 238, 252, 0.96);
        color: #245f93;
      }
      .choice-chip--missed {
        background: rgba(255, 241, 219, 0.96);
        color: #8d6118;
      }
      .choice-chip--wrong {
        background: rgba(255, 233, 233, 0.96);
        color: #a12f2f;
      }
      .choice-analysis--correct {
        border-color: #c7dfcf;
      }
      .choice-analysis--selected {
        border-color: #c6d8ee;
      }
      .choice-analysis--missed {
        border-color: #edd7ab;
      }
      .choice-analysis--wrong {
        border-color: #efc1c1;
      }
      .choice-analysis small {
        color: #5f7288;
        line-height: 1.55;
      }
      .teaching-stack article {
        border: 1px solid rgba(207, 223, 231, 0.95);
        border-radius: 16px;
        padding: 0.9rem;
        background: rgba(255, 255, 255, 0.84);
        display: grid;
        gap: 0.4rem;
      }
      .review-footer {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.8rem;
        align-items: center;
        border-top: 1px solid #e1e8f0;
        padding-top: 0.95rem;
      }
      .review-footer__summary {
        display: grid;
        justify-items: center;
        gap: 0.2rem;
        text-align: center;
      }
      .review-footer__summary span {
        color: #66788c;
        font-size: 0.84rem;
      }
      .review-nav-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 1rem;
        border-radius: 4px;
        border: 1px solid #e1e5ea;
        background: transparent;
        color: #2c5f7e;
        font-weight: 700;
        cursor: pointer;
      }
      .review-nav-btn--primary {
        border: 0;
        background: #2c5f7e;
        color: #fff;
      }
      .review-nav-btn:hover:not(:disabled) { opacity: .85; }
      .review-nav-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .loading-state { padding: 2rem; color: #666666; text-align: center; }
      @media (max-width: 960px) {
        .performance-panel,
        .score-grid,
        .breakdown-grid,
        .review-shell,
        .review-details { grid-template-columns: 1fr; }
        .review-rail {
          position: static;
        }
        .review-pane--rationale {
          position: static;
        }
        .review-footer {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ExamPrepResultsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly examPrep = inject(LearnerExamPrepService);
  readonly activeReviewIndex = signal(0);

  readonly result = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('attemptId') || ''),
      switchMap((attemptId) => this.examPrep.getReview(attemptId))
    ),
    { initialValue: null }
  );
  readonly activeReviewItem = computed(() => {
    const items = this.result()?.items || [];
    if (!items.length) {
      return null;
    }
    const index = Math.min(this.activeReviewIndex(), items.length - 1);
    return items[index] ?? null;
  });

  entries(record: Record<string, number>): Array<{ key: string; value: number }> {
    return Object.entries(record || {}).map(([key, value]) => ({ key, value }));
  }

  catalogueLink(): string[] {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    return ['/my-programs', programId, 'exam-prep'];
  }

  formatElapsed(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  gaugeNeedleRotation(score: number | null): string {
    const normalized = this.normalizedScore(score);
    return `${normalized * 1.8}deg`;
  }

  successLevelKey(score: number | null): 'low' | 'moderate' | 'high' | 'very-high' {
    const normalized = this.normalizedScore(score);
    if (normalized < 40) {
      return 'low';
    }
    if (normalized < 60) {
      return 'moderate';
    }
    if (normalized < 80) {
      return 'high';
    }
    return 'very-high';
  }

  successLevelLabel(score: number | null): string {
    switch (this.successLevelKey(score)) {
      case 'low':
        return 'Low';
      case 'moderate':
        return 'Moderate';
      case 'high':
        return 'High';
      default:
        return 'Very high';
    }
  }

  successLevelDescription(score: number | null): string {
    switch (this.successLevelKey(score)) {
      case 'low':
        return 'The current result shows a low mastery level and needs a focused remediation pass before the next attempt.';
      case 'moderate':
        return 'The attempt is in a moderate band: foundations are present, but several domains still need reinforcement.';
      case 'high':
        return 'The result lands in a high band with strong overall control, while still leaving room to tighten weaker sections.';
      default:
        return 'The attempt sits in the very high band and reflects a strong success level across the assessment.';
    }
  }

  choiceLabels(item: { choices: Array<{ id: string; label: string }>; }, choiceIds: string[]): string {
    return choiceIds
      .map((choiceId) => item.choices.find((choice) => choice.id === choiceId)?.label || choiceId)
      .join(', ');
  }

  isSelectedChoice(item: { selectedAnswerKeys: string[] }, choiceId: string): boolean {
    return item.selectedAnswerKeys.includes(choiceId);
  }

  isCorrectChoice(item: { correctAnswerKeys?: string[] }, choiceId: string): boolean {
    return (item.correctAnswerKeys || []).includes(choiceId);
  }

  isMissedCorrectChoice(item: { selectedAnswerKeys: string[]; correctAnswerKeys?: string[] }, choiceId: string): boolean {
    return this.isCorrectChoice(item, choiceId) && !this.isSelectedChoice(item, choiceId);
  }

  isWrongSelectedChoice(item: { selectedAnswerKeys: string[]; correctAnswerKeys?: string[] }, choiceId: string): boolean {
    return this.isSelectedChoice(item, choiceId) && !this.isCorrectChoice(item, choiceId);
  }

  choiceStatusLabel(item: { selectedAnswerKeys: string[]; correctAnswerKeys?: string[] }, choiceId: string): string {
    if (this.isWrongSelectedChoice(item, choiceId)) {
      return 'Choisie à tort';
    }
    if (this.isMissedCorrectChoice(item, choiceId)) {
      return 'Bonne réponse manquée';
    }
    if (this.isCorrectChoice(item, choiceId) && this.isSelectedChoice(item, choiceId)) {
      return 'Bonne réponse';
    }
    if (this.isSelectedChoice(item, choiceId)) {
      return 'Choisie';
    }
    return 'Non retenue';
  }

  choiceTeachingNote(
    item: { selectedAnswerKeys: string[]; correctAnswerKeys?: string[]; choices: Array<{ id: string; rationale?: string }> },
    choiceId: string
  ): string {
    const choice = item.choices.find((entry) => entry.id === choiceId);
    const storedRationale = typeof choice?.rationale === 'string' ? choice.rationale.trim() : '';
    if (storedRationale) {
      return storedRationale;
    }

    if (this.isWrongSelectedChoice(item, choiceId)) {
      return "Cette option a été sélectionnée, mais elle ne faisait pas partie de la réponse attendue. Reliez-la au rationale clinique à droite pour identifier l'indice qui devait vous faire l'écarter.";
    }
    if (this.isMissedCorrectChoice(item, choiceId)) {
      return "Cette option faisait partie de la réponse correcte. Reprenez les mots-clés du stem et du lead-in pour comprendre pourquoi elle devait être retenue.";
    }
    if (this.isCorrectChoice(item, choiceId) && this.isSelectedChoice(item, choiceId)) {
      return "Cette option faisait bien partie de la réponse attendue. Elle s'aligne avec le raisonnement clinique visé par la question.";
    }
    return "Cette option n'était pas attendue dans la correction finale. Utilisez l'explication générale pour renforcer votre tri clinique entre distracteurs plausibles et éléments déterminants.";
  }

  learningFocus(item: { isCorrect: boolean; selectedAnswerKeys: string[]; correctAnswerKeys?: string[]; explanation?: string | null; rationale?: string | null }): string {
    if (item.explanation || item.rationale) {
      return item.isCorrect
        ? "Bonne logique globale. Utilisez l'explication et le rationale ci-dessus pour consolider les indices cliniques qui ont validé votre choix."
        : "Concentrez votre révision sur les indices cliniques qui différencient la bonne réponse des distracteurs retenus. Rejouez mentalement la question en reliant le stem, le lead-in et la correction attendue.";
    }

    return item.isCorrect
      ? "Réponse correcte. Gardez le même schéma de lecture: repérer les indices clés, éliminer les distracteurs plausibles, puis confirmer l'option la plus sûre."
      : "Réponse incorrecte. Reprenez la question en identifiant d'abord la demande exacte, puis comparez chaque option à la cible clinique réellement testée.";
  }

  activeReviewNumber(total: number): number {
    return total ? Math.min(this.activeReviewIndex() + 1, total) : 0;
  }

  goToReviewIndex(index: number): void {
    this.activeReviewIndex.set(Math.max(0, index));
  }

  previousReviewItem(): void {
    this.activeReviewIndex.update((index) => Math.max(0, index - 1));
  }

  nextReviewItem(total: number): void {
    this.activeReviewIndex.update((index) => Math.min(Math.max(total - 1, 0), index + 1));
  }

  private normalizedScore(score: number | null): number {
    return Math.max(0, Math.min(100, Number(score || 0)));
  }
}
