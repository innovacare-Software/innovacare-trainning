import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ListeningTestAssessment,
  ListeningTestResult,
  GradingResult,
  TARGET_TEST_LABELS,
} from '../../models/listening-test.models';

@Component({
  selector: 'app-listening-result-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="result-panel">

      <!-- Score circle -->
      <div class="score-hero">
        <div class="score-circle" [class.score-circle--pass]="result.passed" [class.score-circle--fail]="!result.passed">
          <span class="score-pct">{{ result.percentage }}%</span>
          <span class="score-label">{{ result.passed ? 'PASSED' : 'FAILED' }}</span>
        </div>
        <div class="score-stats">
          <div class="stat-item">
            <span class="stat-val">{{ grading.correctCount }}</span>
            <span class="stat-key">Correct</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ grading.incorrectCount }}</span>
            <span class="stat-key">Incorrect</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ result.score }} / {{ result.maxScore }}</span>
            <span class="stat-key">Score</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ formatDuration(result.durationUsedSeconds) }}</span>
            <span class="stat-key">Time Used</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ result.audioPlayCount }}</span>
            <span class="stat-key">Audio Plays</span>
          </div>
        </div>
      </div>

      <!-- Per-question review -->
      @if (assessment.postSubmissionReview.showCorrectAnswers) {
        <div class="questions-review">
          <h3 class="section-title">Question Review</h3>
          @for (a of grading.answers; track a.questionId; let i = $index) {
            @let q = getQuestion(a.questionId);
            @if (q) {
              <div class="review-card" [class.review-card--correct]="a.isCorrect" [class.review-card--wrong]="!a.isCorrect">
                <div class="review-header">
                  <div class="review-num" [class.rn--correct]="a.isCorrect" [class.rn--wrong]="!a.isCorrect">
                    {{ a.isCorrect ? '✓' : '✗' }}
                  </div>
                  <div class="review-prompt">Q{{ i + 1 }}: {{ q.prompt }}</div>
                  <div class="review-pts">{{ a.pointsAwarded ?? 0 }}/{{ q.points ?? 1 }}pt</div>
                </div>

                <!-- Your answer -->
                <div class="answer-row">
                  <span class="answer-label">Your answer:</span>
                  <span class="answer-val answer-val--yours" [class.answer-val--correct]="a.isCorrect" [class.answer-val--wrong]="!a.isCorrect">
                    {{ formatAnswer(a) }}
                  </span>
                </div>

                <!-- Correct answer -->
                @if (!a.isCorrect) {
                  <div class="answer-row">
                    <span class="answer-label">Correct answer:</span>
                    <span class="answer-val answer-val--correct-key">{{ formatCorrect(q) }}</span>
                  </div>
                }

                <!-- Explanation -->
                @if (assessment.postSubmissionReview.showExplanations && q.explanation) {
                  <div class="explanation-block">
                    <span class="explanation-label">📖 Explanation</span>
                    <p>{{ q.explanation }}</p>
                  </div>
                }

                @if (assessment.postSubmissionReview.showExplanations && q.rationale) {
                  <div class="rationale-block">
                    <span class="rationale-label">💡 Rationale</span>
                    <p>{{ q.rationale }}</p>
                  </div>
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .result-panel { display: grid; gap: 1.5rem; }

    /* Score hero */
    .score-hero { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.5rem; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 6px solid #d9e5f2; flex-shrink: 0; }
    .score-circle--pass { border-color: #4ade80; background: radial-gradient(circle, #dcfce7 0%, #f0fdf4 70%); }
    .score-circle--fail { border-color: #f87171; background: radial-gradient(circle, #fee2e2 0%, #fff5f5 70%); }
    .score-pct { font-size: 1.6rem; font-weight: 900; line-height: 1; color: #0f3659; }
    .score-label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; margin-top: 0.2rem; }
    .score-circle--pass .score-label { color: #16a34a; }
    .score-circle--fail .score-label { color: #dc2626; }

    .score-stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .stat-item { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
    .stat-val { font-size: 1.3rem; font-weight: 900; color: #0f3659; }
    .stat-key { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #5f7f9f; }

    /* Questions review */
    .section-title { margin: 0 0 0.75rem; color: #0f3659; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; }
    .questions-review { display: grid; gap: 0.85rem; }
    .review-card { border-radius: 0.85rem; border: 1.5px solid #d9e5f2; overflow: hidden; }
    .review-card--correct { border-color: #86efac; }
    .review-card--wrong { border-color: #fca5a5; }
    .review-header { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; background: #f8fbff; }
    .review-card--correct .review-header { background: #f0fdf4; }
    .review-card--wrong .review-header { background: #fff5f5; }
    .review-num { width: 1.8rem; height: 1.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
    .rn--correct { background: #4ade80; color: #fff; }
    .rn--wrong { background: #f87171; color: #fff; }
    .review-prompt { flex: 1; color: #0f2d4d; font-size: 0.92rem; font-weight: 500; line-height: 1.5; }
    .review-pts { color: #7fa3c8; font-size: 0.78rem; white-space: nowrap; }
    .answer-row { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.55rem 1rem; border-top: 1px solid #eef3fb; flex-wrap: wrap; }
    .answer-label { font-size: 0.78rem; font-weight: 700; color: #5f7f9f; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    .answer-val { font-size: 0.88rem; color: #1e3a5a; }
    .answer-val--correct { color: #16a34a; font-weight: 600; }
    .answer-val--wrong { color: #dc2626; font-weight: 600; text-decoration: line-through; }
    .answer-val--correct-key { color: #16a34a; font-weight: 700; }
    .explanation-block, .rationale-block { padding: 0.65rem 1rem; border-top: 1px solid #eef3fb; display: grid; gap: 0.25rem; }
    .explanation-block { background: #eff8ff; }
    .rationale-block { background: #fefce8; }
    .explanation-label { font-size: 0.75rem; font-weight: 700; color: #1a74c8; text-transform: uppercase; letter-spacing: 0.05em; }
    .rationale-label { font-size: 0.75rem; font-weight: 700; color: #ca8a04; text-transform: uppercase; letter-spacing: 0.05em; }
    .explanation-block p, .rationale-block p { margin: 0; color: #1e3a5a; font-size: 0.88rem; line-height: 1.6; }
  `],
})
export class ListeningResultPanelComponent {
  @Input({ required: true }) assessment!: ListeningTestAssessment;
  @Input({ required: true }) result!: ListeningTestResult;
  @Input({ required: true }) grading!: GradingResult;

  readonly TARGET_TEST_LABELS = TARGET_TEST_LABELS;

  getQuestion(qId: string) {
    return this.assessment.questions.find((q) => q.id === qId) ?? null;
  }

  formatAnswer(a: import('../../models/listening-test.models').ListeningAnswer): string {
    if (a.textAnswer !== undefined) return a.textAnswer || '(no answer)';
    if (a.matchingAnswers?.length) {
      return a.matchingAnswers.map((m) => `${m.left} → ${m.selectedRight}`).join(' | ');
    }
    return a.selectedAnswerKeys?.join(', ') || '(no answer)';
  }

  formatCorrect(q: import('../../models/listening-test.models').ListeningQuestion): string {
    if (q.acceptedAnswers?.length) return q.acceptedAnswers.join(' / ');
    if (q.matchingPairs?.length) return q.matchingPairs.map((p) => `${p.left} → ${p.right}`).join(' | ');
    const keys = q.correctAnswerKey ?? [];
    if (!keys.length) return '—';
    const choice = q.choices?.find((c) => c.id === keys[0]);
    return choice ? `${keys[0]}: ${choice.text}` : keys.join(', ');
  }

  formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  }
}
