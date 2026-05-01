import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, interval, map, switchMap } from 'rxjs';
import { AssessmentQuestion } from '../../program.models';
import { LearnerAssessmentsService } from '../services/learner-assessments.service';

type AssessmentResultSummary = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
};

type SavedAssessmentSession = {
  answers: Record<string, string[]>;
  flaggedQuestionIds: string[];
  currentIndex: number;
  expiresAtMs: number;
};

@Component({
  selector: 'app-assessment-runner-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (assessment(); as assessment) {
      <section class="ar-shell">
        <a class="ar-back" [routerLink]="listRoute()">← Assessments</a>

        @if (result(); as summary) {
          <article class="ar-result-card" [attr.data-state]="summary.passed ? 'pass' : 'fail'">
            <span class="ar-kicker">Assessment completed</span>
            <h1>{{ assessment.title }}</h1>
            <p>
              You answered {{ summary.correctCount }} out of {{ summary.totalQuestions }} questions correctly.
            </p>

            <div class="ar-result-grid">
              <article>
                <span>Score</span>
                <strong>{{ summary.score }}%</strong>
              </article>
              <article>
                <span>Status</span>
                <strong>{{ summary.passed ? 'Pass' : 'Needs review' }}</strong>
              </article>
              <article>
                <span>Passing score</span>
                <strong>{{ assessment.passingScore }}%</strong>
              </article>
            </div>

            <div class="ar-result-actions">
              <button type="button" class="ar-btn ar-btn--ghost" (click)="restartAssessment()">
                Retake locally
              </button>
              <button type="button" class="ar-btn ar-btn--primary" (click)="backToList()">
                Return to assessments
              </button>
            </div>
          </article>
        } @else if (hasGradableQuestions()) {
          <header class="ar-frame-header">
            <div class="ar-title-block">
              <span class="ar-kicker">Assessment player</span>
              <h1>{{ assessment.title }}</h1>
              <p>
                Question {{ currentIndex() + 1 }} of {{ totalQuestions() }}
                • {{ answeredCount() }} answered
                • {{ flaggedCount() }} flagged
              </p>
            </div>

            <div class="ar-header-meta">
              <article class="ar-meta-card" [class.ar-meta-card--warn]="remainingSeconds() <= 300">
                <span>Remaining time</span>
                <strong>{{ formatRemaining(remainingSeconds()) }}</strong>
              </article>
              <article class="ar-meta-card">
                <span>Progress</span>
                <strong>{{ completionPercent() }}%</strong>
              </article>
              <article class="ar-meta-card">
                <span>State</span>
                <strong>{{ saveStateLabel() }}</strong>
              </article>
            </div>
          </header>

          <div class="ar-integrity-strip">
            <article>
              <strong>One question at a time</strong>
              <p>Focus on the current item while keeping a full palette view for quick review.</p>
            </article>
            <article>
              <strong>Drafts autosave locally</strong>
              <p>Your selections, timer and flags are restored if you refresh this route.</p>
            </article>
            <article>
              <strong>Submit when ready</strong>
              <p>Unanswered items remain reviewable and count as incorrect if you finish now.</p>
            </article>
          </div>

          <div class="ar-workspace-grid" [class.ar-workspace-grid--review]="!!result()">
            <!-- LEFT PANEL: Metadata -->
            <aside class="ar-left-panel">
              <section class="ar-meta-panel">
                <span class="ar-panel-label">Innovacare Review</span>
                <div class="ar-meta-item">
                  <span class="ar-meta-key">Subject</span>
                  <strong class="ar-meta-val">{{ currentQuestion()?.subject || 'Nursing' }}</strong>
                </div>
                <div class="ar-meta-item">
                  <span class="ar-meta-key">Lesson</span>
                  <strong class="ar-meta-val">{{ currentQuestion()?.lesson || 'Clinical Care' }}</strong>
                </div>
                <div class="ar-meta-item">
                  <span class="ar-meta-key">Client Need Area</span>
                  <strong class="ar-meta-val">{{ currentQuestion()?.clientNeedArea || 'Health & Wellness' }}</strong>
                </div>
              </section>

              <section class="ar-difficulty-panel">
                <span class="ar-panel-label">Question Level</span>
                <div class="ar-difficulty-badge" [class]="'ar-difficulty-' + (currentQuestion()?.difficulty || 'medium')">
                  {{ (currentQuestion()?.difficulty || 'medium') | titlecase }}
                </div>
              </section>

              <section class="ar-rail-card">
                <span class="ar-rail-label">Progress</span>
                <div class="ar-progress-track">
                  @for (question of assessment.questions ?? []; track question.id; let idx = $index) {
                    <button
                      type="button"
                      class="ar-progress-node"
                      [class.ar-progress-node--active]="idx === currentIndex()"
                      [class.ar-progress-node--answered]="isAnswered(question.id)"
                      [class.ar-progress-node--flagged]="isFlagged(question.id)"
                      (click)="jumpToQuestion(idx)"
                      title="Question {{ idx + 1 }}"
                    >
                      {{ idx + 1 }}
                    </button>
                  }
                </div>
              </section>
            </aside>

            <!-- CENTER PANEL: Question -->
            <main class="ar-question-stage">
              @if (currentQuestion(); as question) {
                <div class="ar-stage-head">
                  <span class="ar-question-type">
                    {{ question.mode === 'multi' ? 'Multiple response' : 'Single response' }}
                  </span>
                  <span class="ar-status-pill" [class.ar-status-pill--flagged]="isFlagged(question.id)">
                    {{ currentStatusLabel() }}
                  </span>
                </div>

                <article class="ar-question-card">
                  <h2>{{ question.prompt }}</h2>

                  <div class="ar-choice-list">
                    @for (choice of question.choices; track choice.id; let i = $index) {
                      <label class="ar-choice-card" [class.ar-choice-card--selected]="isChoiceSelected(question.id, choice.id)">
                        <input
                          [type]="question.mode === 'multi' ? 'checkbox' : 'radio'"
                          [name]="question.id"
                          [checked]="isChoiceSelected(question.id, choice.id)"
                          [disabled]="submitting()"
                          (change)="toggleChoice(question, choice.id, $any($event.target).checked)"
                        />
                        <div>
                          <strong>{{ 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] }}</strong>
                          <p>{{ choice.text }}</p>
                        </div>
                      </label>
                    }
                  </div>

                  <section class="ar-draft-note">
                    <span class="ar-rail-label">Review control</span>
                    <p>
                      Flag this item if you want to revisit it before final submission. Your current selection is saved automatically.
                    </p>
                  </section>
                </article>

                <footer class="ar-action-bar">
                  <div class="ar-action-copy">
                    <strong>{{ unansweredCount() }} unanswered • {{ flaggedCount() }} flagged</strong>
                    <p>
                      You can move freely between questions in this classic assessment flow and submit at any time.
                    </p>
                  </div>

                  <div class="ar-action-buttons">
                    <button type="button" class="ar-btn ar-btn--ghost" (click)="toggleFlag(question.id)">
                      {{ isFlagged(question.id) ? 'Unflag question' : 'Flag question' }}
                    </button>
                    <button type="button" class="ar-btn ar-btn--ghost" (click)="previousQuestion()" [disabled]="currentIndex() === 0">
                      Previous
                    </button>
                    <button type="button" class="ar-btn ar-btn--ghost" (click)="nextQuestion()" [disabled]="currentIndex() >= totalQuestions() - 1">
                      Next
                    </button>
                    <button type="button" class="ar-btn ar-btn--primary" (click)="openSubmitConfirm()" [disabled]="submitting() || totalQuestions() === 0">
                      {{ unansweredCount() > 0 ? 'Review and submit' : 'Finish assessment' }}
                    </button>
                  </div>
                </footer>
              }
            </main>

            @if (result()) {
              <!-- RIGHT PANEL: Explanation (Review Only) -->
              <aside class="ar-right-panel ar-explanation-panel">
                <section class="ar-explanation-card">
                  <span class="ar-panel-label">Explanation</span>
                  <div class="ar-explanation-content">
                    <p>{{ currentQuestion()?.explanation || 'Review the answer choices and learn from this question.' }}</p>
                    <div class="ar-explanation-visual">
                      <div class="ar-info-box ar-info-cyan">
                        <strong>Key Concept</strong>
                        <p>Understanding clinical assessment helps in decision-making for patient care.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            }
          </div>

          @if (submitConfirmOpen()) {
            <div class="ar-modal-backdrop" (click)="submitConfirmOpen.set(false)"></div>
            <section class="ar-modal-card" role="dialog" aria-modal="true" aria-label="Submit assessment">
              <h2>Submit assessment</h2>
              <p>
                {{ unansweredCount() > 0
                  ? 'You still have unanswered items. They will be scored as incorrect if you submit now.'
                  : 'All questions have a recorded response. You can submit the assessment now.' }}
              </p>

              <div class="ar-confirm-grid">
                <span>Answered: {{ answeredCount() }}</span>
                <span>Unanswered: {{ unansweredCount() }}</span>
                <span>Flagged: {{ flaggedCount() }}</span>
              </div>

              <div class="ar-modal-actions">
                <button type="button" class="ar-btn ar-btn--ghost" (click)="submitConfirmOpen.set(false)">
                  Continue reviewing
                </button>
                <button type="button" class="ar-btn ar-btn--primary" (click)="submitAssessment()" [disabled]="submitting()">
                  {{ submitting() ? 'Submitting…' : 'Submit now' }}
                </button>
              </div>
            </section>
          }
        } @else {
          <article class="ar-empty-card">
            <span class="ar-kicker">Assessment unavailable</span>
            <h1>{{ assessment.title }}</h1>
            <p>
              This assessment needs structured answer choices in program-admin before automatic scoring can run.
            </p>
          </article>
        }
      </section>
    } @else {
      <div class="ar-loading">
        <div class="ar-spinner"></div>
        <span>Loading assessment…</span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ar-shell { display: grid; gap: 1rem; color: #1a1a1a; max-width: 1600px; margin: 0 auto; padding: 1.5rem; }
    .ar-back { color: #2c5f7e; text-decoration: none; font-size: .92rem; font-weight: 600; margin-bottom: 0.5rem; }
    
    /* Common Styles */
    h1, h2, p { margin: 0; }
    
    /* Frame Header */
    .ar-frame-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.5rem;
      background: #2c5f7e;
      border-radius: 6px;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .ar-frame-header h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
    .ar-frame-header p { color: rgba(255,255,255,.82); }
    
    .ar-title-block { flex: 1; }
    .ar-kicker { display: inline-flex; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #ffd700; margin-bottom: 0.5rem; }
    
    .ar-header-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: .75rem;
    }
    .ar-meta-card {
      padding: .8rem;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,.25);
      background: rgba(255,255,255,.1);
      color: rgba(255,255,255,.82);
    }
    .ar-meta-card strong { display: block; margin-top: .3rem; color: #fff; font-size: 1.1rem; }
    
    /* Integrity Strip */
    .ar-integrity-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: .9rem;
      padding: 1rem;
      background: #fff;
      border-radius: 6px;
      border: 1px solid #e1e5ea;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .ar-integrity-strip article {
      padding: .85rem 1rem;
      border-radius: 4px;
      border: 1px solid #e1e5ea;
      background: #f7f9fb;
    }
    .ar-integrity-strip strong { display: block; color: #1a1a1a; font-size: .95rem; margin-bottom: 0.3rem; }
    .ar-integrity-strip p { color: #666666; font-size: .85rem; line-height: 1.5; }
    
    /* Workspace Grid (3-column) */
    .ar-workspace-grid {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }
    .ar-workspace-grid--review {
      grid-template-columns: 280px minmax(0, 1fr) 320px;
    }
    
    /* LEFT PANEL */
    .ar-left-panel {
      display: grid;
      gap: 1rem;
      position: sticky;
      top: 1.5rem;
    }
    
    .ar-meta-panel,
    .ar-difficulty-panel,
    .ar-rail-card,
    .ar-question-card,
    .ar-action-bar,
    .ar-explanation-card {
      background: #fff;
      border: 1px solid #e1e5ea;
      border-radius: 6px;
      padding: 1.2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    
    .ar-panel-label {
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #990011;
      margin-bottom: 0.8rem;
    }
    
    .ar-meta-item {
      display: grid;
      gap: 0.3rem;
      margin-bottom: 0.9rem;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid #e1e5ea;
    }
    .ar-meta-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .ar-meta-key { font-size: .75rem; color: #666666; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .ar-meta-val { font-size: .95rem; color: #2c5f7e; }
    
    /* Difficulty Badge */
    .ar-difficulty-panel {
      text-align: center;
    }
    .ar-difficulty-badge {
      display: inline-flex;
      padding: 0.7rem 1.2rem;
      border-radius: 4px;
      font-weight: 700;
      font-size: .9rem;
      margin-top: 0.5rem;
    }
    .ar-difficulty-hard { background: #ffe8e8; color: #a30000; border: 1px solid #ffcccb; }
    .ar-difficulty-medium { background: #fff8e8; color: #8a5a12; border: 1px solid #ffd699; }
    .ar-difficulty-low { background: #e8f8f0; color: #0f5d3f; border: 1px solid #99dbc4; }
    
    /* Progress Track */
    .ar-progress-track {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: .5rem;
      margin-top: .8rem;
    }
    .ar-progress-node {
      min-height: 44px;
      border-radius: 4px;
      border: 1px solid #e1e5ea;
      background: #fff;
      color: #2c5f7e;
      font-weight: 700;
      cursor: pointer;
      transition: all .2s;
      font-size: .85rem;
    }
    .ar-progress-node:hover { border-color: #2c5f7e; background: rgba(44,95,126,.05); }
    .ar-progress-node--active {
      border-color: #2c5f7e;
      background: #2c5f7e;
      color: #fff;
    }
    .ar-progress-node--answered {
      background: #e8f8f0;
      border-color: #059669;
      color: #0f5d3f;
    }
    .ar-progress-node--flagged {
      background: #fff8e8;
      border-color: #edb300;
      color: #8a5a12;
    }
    
    /* CENTER PANEL */
    .ar-question-stage { display: grid; gap: 1rem; }
    
    .ar-stage-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .8rem;
      margin-bottom: 0.5rem;
    }
    .ar-question-type {
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #990011;
    }
    .ar-status-pill {
      display: inline-flex;
      padding: .5rem .8rem;
      border-radius: 3px;
      border: 1px solid #e1e5ea;
      background: #f7f9fb;
      color: #333333;
      font-size: .75rem;
      font-weight: 700;
    }
    .ar-status-pill--flagged {
      border-color: #ffd699;
      background: #fff8e8;
      color: #8a5a12;
    }
    
    .ar-question-card {
      display: grid;
      gap: 1.2rem;
    }
    .ar-question-card h2 {
      font-size: 1.25rem;
      line-height: 1.6;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }
    
    /* Choice List */
    .ar-choice-list { display: grid; gap: 0.8rem; }
    .ar-choice-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.9rem;
      align-items: start;
      padding: 1rem 1.1rem;
      border-radius: 4px;
      border: 1px solid #e1e5ea;
      background: #fff;
      cursor: pointer;
      transition: all .2s;
    }
    .ar-choice-card:hover {
      border-color: #2c5f7e;
      background: rgba(44,95,126,.04);
    }
    .ar-choice-card--selected {
      border-color: #2c5f7e;
      background: rgba(44,95,126,.06);
      box-shadow: 0 2px 6px rgba(44,95,126,.12);
    }
    .ar-choice-card input { margin-top: .35rem; cursor: pointer; }
    .ar-choice-card strong {
      display: inline-flex;
      margin-bottom: .25rem;
      color: #2c5f7e;
      font-weight: 700;
      min-width: 2rem;
    }
    .ar-choice-card p {
      color: #333333;
      line-height: 1.6;
      font-size: .95rem;
      margin: 0;
    }
    
    /* Draft Note */
    .ar-draft-note {
      padding: 1rem 1.1rem;
      border-radius: 4px;
      border: 1px solid #e1e5ea;
      background: #f7f9fb;
    }
    .ar-draft-note p { color: #666666; font-size: .85rem; margin: 0; }
    
    /* Action Bar */
    .ar-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .ar-action-copy strong { color: #1a1a1a; font-size: .95rem; }
    .ar-action-copy p { color: #666666; font-size: .85rem; margin: 0.3rem 0 0; }
    .ar-action-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: .6rem;
    }
    
    /* Buttons */
    .ar-btn {
      min-height: 44px;
      padding: 0 1.2rem;
      border-radius: 4px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all .2s;
      border: none;
    }
    .ar-btn--ghost {
      border: 1px solid #e1e5ea;
      background: transparent;
      color: #2c5f7e;
    }
    .ar-btn--ghost:hover { background: rgba(44,95,126,.06); border-color: #2c5f7e; }
    .ar-btn--primary {
      background: #2c5f7e;
      color: #fff;
    }
    .ar-btn--primary:hover { background: #1f4660; }
    .ar-btn:disabled { opacity: .5; cursor: not-allowed; }
    
    /* RIGHT PANEL */
    .ar-right-panel {
      position: sticky;
      top: 1.5rem;
      height: fit-content;
    }
    
    .ar-explanation-card {
      background: #f7f9fb;
      border: 1px solid #e1e5ea;
    }
    .ar-explanation-content {
      display: grid;
      gap: 1rem;
    }
    .ar-explanation-content p {
      color: #333333;
      line-height: 1.7;
      font-size: .95rem;
    }
    
    .ar-explanation-visual {
      display: grid;
      gap: 0.8rem;
    }
    .ar-info-box {
      padding: 1rem;
      border-radius: 4px;
      border-left: 4px solid #2c5f7e;
    }
    .ar-info-cyan {
      background: #f0f5f8;
      border-left-color: #2c5f7e;
    }
    .ar-info-box strong {
      display: block;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
      font-size: .95rem;
    }
    .ar-info-box p {
      color: #666666;
      margin: 0;
      font-size: .85rem;
      line-height: 1.6;
    }
    
    .ar-explanation-placeholder {
      padding: 2rem 1rem;
      text-align: center;
      color: #666666;
      font-size: .9rem;
      border: 1px dashed #e1e5ea;
      border-radius: 6px;
      background: #f7f9fb;
    }
    
    /* Result Card */
    .ar-result-card {
      background: #fff;
      border: 1px solid #e1e5ea;
      border-radius: 6px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .ar-result-card h1 { font-size: 1.6rem; color: #1a1a1a; margin-bottom: 1rem; }
    .ar-result-card p { color: #666666; margin-bottom: 1rem; }
    .ar-result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .ar-result-grid article {
      padding: 1rem;
      border-radius: 6px;
      background: #f7f9fb;
      border: 1px solid #e1e5ea;
      text-align: center;
    }
    .ar-result-grid span { display: block; color: #666666; font-size: .85rem; margin-bottom: 0.5rem; }
    .ar-result-grid strong { display: block; font-size: 1.3rem; color: #1a1a1a; }
    .ar-result-card[data-state='pass'] { border-top: 4px solid #0f5d3f; }
    .ar-result-card[data-state='fail'] { border-top: 4px solid #a30000; }
    
    /* Empty Card */
    .ar-empty-card {
      background: #fff;
      border: 1px solid #e1e5ea;
      border-radius: 6px;
      padding: 2rem;
      text-align: center;
    }
    .ar-empty-card h1 { color: #1a1a1a; margin-bottom: 1rem; }
    .ar-empty-card p { color: #666666; }
    
    /* Modal */
    .ar-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 40;
    }
    .ar-modal-card {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 50;
      width: min(520px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      padding: 1.5rem;
      display: grid;
      gap: 1rem;
      background: #fff;
      border-radius: 6px;
      border: 1px solid #e1e5ea;
      box-shadow: 0 12px 48px rgba(0,0,0,.15);
    }
    .ar-modal-card h2 { color: #1a1a1a; margin-bottom: 0.5rem; }
    .ar-modal-card p { color: #666666; }
    .ar-confirm-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: .85rem .95rem;
      border-radius: 4px;
      background: #f7f9fb;
      border: 1px solid #e1e5ea;
    }
    .ar-confirm-grid span { color: #666666; font-size: .85rem; }
    .ar-modal-actions {
      display: flex;
      gap: .75rem;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    
    /* Loading */
    .ar-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #9ca3af;
    }
    .ar-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e1e5ea;
      border-top-color: #2c5f7e;
      border-radius: 50%;
      animation: ar-spin .8s linear infinite;
    }
    @keyframes ar-spin { to { transform: rotate(360deg); } }
    
    /* Responsive */
    @media (max-width: 1200px) {
      .ar-workspace-grid { grid-template-columns: 1fr; }
      .ar-left-panel, .ar-right-panel { position: static; }
    }
    @media (max-width: 768px) {
      .ar-frame-header { flex-direction: column; }
      .ar-action-bar { flex-direction: column; align-items: stretch; }
      .ar-progress-track { grid-template-columns: repeat(6, 1fr); }
    }
  `],
})
export class AssessmentRunnerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentsService = inject(LearnerAssessmentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly answers = signal<Record<string, string[]>>({});
  readonly flaggedQuestionIds = signal<string[]>([]);
  readonly currentIndex = signal(0);
  readonly remainingSeconds = signal(0);
  readonly result = signal<AssessmentResultSummary | null>(null);
  readonly submitConfirmOpen = signal(false);
  readonly savePulseAt = signal(0);

  private expiresAtMs = 0;
  private initializedStorageKey = '';

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly assessmentId$ = this.route.paramMap.pipe(map((p) => p.get('assessmentId') || ''));

  readonly assessment = toSignal(
    combineLatest([this.programId$, this.assessmentId$]).pipe(
      switchMap(([pid, aid]) => this.assessmentsService.getAssessment(pid, aid))
    ),
    { initialValue: undefined }
  );

  readonly listRoute = toSignal(
    this.programId$.pipe(map((programId) => ['/my-programs', programId, 'assessments'])),
    { initialValue: ['/my-programs', '', 'assessments'] }
  );

  readonly totalQuestions = computed(() => this.assessment()?.questions?.length ?? 0);
  readonly currentQuestion = computed(() => this.assessment()?.questions?.[this.currentIndex()] ?? null);
  readonly answeredCount = computed(
    () => (this.assessment()?.questions ?? []).filter((question) => this.isAnswered(question.id)).length
  );
  readonly flaggedCount = computed(() => this.flaggedQuestionIds().length);
  readonly unansweredCount = computed(() => Math.max(0, this.totalQuestions() - this.answeredCount()));
  readonly completionPercent = computed(() => {
    const total = this.totalQuestions();
    return total ? Math.round((this.answeredCount() / total) * 100) : 0;
  });

  constructor() {
    effect(() => {
      const assessment = this.assessment();
      const key = this.storageKey();
      if (!assessment || !key || this.initializedStorageKey === key) {
        return;
      }

      this.initializedStorageKey = key;
      this.restoreProgress(assessment.durationMin);
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tickTimer();
      });
  }

  hasGradableQuestions(): boolean {
    const questions = this.assessment()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => (question.choices?.length ?? 0) >= 2);
  }

  isChoiceSelected(questionId: string, choiceId: string): boolean {
    return this.answers()[questionId]?.includes(choiceId) ?? false;
  }

  isAnswered(questionId: string): boolean {
    return (this.answers()[questionId]?.length ?? 0) > 0;
  }

  isFlagged(questionId: string): boolean {
    return this.flaggedQuestionIds().includes(questionId);
  }

  hasDraftSelection(): boolean {
    const question = this.currentQuestion();
    return question ? this.isAnswered(question.id) : false;
  }

  currentStatusLabel(): string {
    const question = this.currentQuestion();
    if (!question) {
      return 'Unavailable';
    }
    if (this.isFlagged(question.id) && this.isAnswered(question.id)) {
      return 'Flagged and answered';
    }
    if (this.isFlagged(question.id)) {
      return 'Flagged';
    }
    if (this.isAnswered(question.id)) {
      return 'Answered';
    }
    return 'Unanswered';
  }

  toggleChoice(question: AssessmentQuestion, choiceId: string, checked: boolean): void {
    this.answers.update((prev) => {
      const current = new Set(prev[question.id] ?? []);
      if (question.mode === 'multi') {
        if (checked) {
          current.add(choiceId);
        } else {
          current.delete(choiceId);
        }
        return { ...prev, [question.id]: [...current] };
      }

      return { ...prev, [question.id]: checked ? [choiceId] : [] };
    });
    this.persistProgress();
  }

  toggleFlag(questionId: string): void {
    this.flaggedQuestionIds.update((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
    this.persistProgress();
  }

  previousQuestion(): void {
    if (this.currentIndex() <= 0) {
      return;
    }
    this.currentIndex.update((value) => value - 1);
    this.persistProgress();
  }

  nextQuestion(): void {
    if (this.currentIndex() >= this.totalQuestions() - 1) {
      return;
    }
    this.currentIndex.update((value) => value + 1);
    this.persistProgress();
  }

  jumpToQuestion(index: number): void {
    if (index < 0 || index >= this.totalQuestions()) {
      return;
    }
    this.currentIndex.set(index);
    this.persistProgress();
  }

  openSubmitConfirm(): void {
    this.submitConfirmOpen.set(true);
  }

  async submitAssessment(): Promise<void> {
    const assessment = this.assessment();
    const questions = assessment?.questions ?? [];
    if (!assessment || !questions.length) {
      return;
    }

    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      const summary = this.gradeAssessment();
      await this.assessmentsService.submitAttempt({
        userId: '',
        programId,
        moduleId: assessment.moduleId,
        assessmentId: assessment.id,
        score: summary.score,
        passed: summary.passed,
        timeSpentMin: this.elapsedMinutes(assessment.durationMin),
        answers: this.answers(),
      });
      this.result.set(summary);
      this.submitConfirmOpen.set(false);
      this.clearProgress();
    } finally {
      this.submitting.set(false);
    }
  }

  restartAssessment(): void {
    const assessment = this.assessment();
    if (!assessment) {
      return;
    }
    this.result.set(null);
    this.answers.set({});
    this.flaggedQuestionIds.set([]);
    this.currentIndex.set(0);
    this.submitConfirmOpen.set(false);
    this.expiresAtMs = Date.now() + Math.max(1, assessment.durationMin || 1) * 60 * 1000;
    this.remainingSeconds.set(Math.max(1, Math.round((this.expiresAtMs - Date.now()) / 1000)));
    this.persistProgress();
  }

  backToList(): void {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    void this.router.navigate(['/my-programs', programId, 'assessments']);
  }

  formatRemaining(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  saveStateLabel(): string {
    const delta = Date.now() - this.savePulseAt();
    return delta < 1500 ? 'Draft saved' : 'Local session active';
  }

  private tickTimer(): void {
    if (this.result()) {
      return;
    }

    if (!this.expiresAtMs) {
      return;
    }

    const remaining = Math.max(0, Math.ceil((this.expiresAtMs - Date.now()) / 1000));
    this.remainingSeconds.set(remaining);
    if (remaining <= 0 && !this.submitting()) {
      void this.submitAssessment();
    }
  }

  private restoreProgress(durationMin: number): void {
    const saved = this.readSavedSession();
    const expiresAtMs = saved?.expiresAtMs ?? Date.now() + Math.max(1, durationMin || 1) * 60 * 1000;
    this.answers.set(saved?.answers ?? {});
    this.flaggedQuestionIds.set(saved?.flaggedQuestionIds ?? []);
    this.currentIndex.set(Math.max(0, Math.min(saved?.currentIndex ?? 0, Math.max(0, this.totalQuestions() - 1))));
    this.expiresAtMs = expiresAtMs;
    this.remainingSeconds.set(Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)));
    this.persistProgress();
  }

  private persistProgress(): void {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return;
    }

    const payload: SavedAssessmentSession = {
      answers: this.answers(),
      flaggedQuestionIds: this.flaggedQuestionIds(),
      currentIndex: this.currentIndex(),
      expiresAtMs: this.expiresAtMs,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
    this.savePulseAt.set(Date.now());
  }

  private clearProgress(): void {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }

  private readSavedSession(): SavedAssessmentSession | null {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as SavedAssessmentSession;
    } catch {
      return null;
    }
  }

  private storageKey(): string {
    const assessment = this.assessment();
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!assessment?.id || !programId) {
      return '';
    }
    return `assessment-session:${programId}:${assessment.id}`;
  }

  private elapsedMinutes(durationMin: number): number {
    if (!this.expiresAtMs) {
      return Math.max(1, durationMin || 1);
    }
    const totalSeconds = Math.max(
      0,
      Math.round((Math.max(1, durationMin || 1) * 60 * 1000 - (this.expiresAtMs - Date.now())) / 1000)
    );
    return Math.max(1, Math.round(totalSeconds / 60));
  }

  private gradeAssessment(): AssessmentResultSummary {
    const assessment = this.assessment();
    const questions = assessment?.questions ?? [];
    if (!questions.length) {
      return { score: 0, passed: false, correctCount: 0, totalQuestions: 0 };
    }

    let correctCount = 0;
    for (const question of questions) {
      const selected = new Set(this.answers()[question.id] ?? []);
      const correct = new Set(
        question.choices.filter((choice) => choice.correct).map((choice) => choice.id)
      );
      const isCorrect =
        selected.size === correct.size && [...selected].every((choiceId) => correct.has(choiceId));
      if (isCorrect) {
        correctCount += 1;
      }
    }

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passingScore = assessment?.passingScore ?? 70;
    return {
      score,
      passed: score >= passingScore,
      correctCount,
      totalQuestions,
    };
  }
}
