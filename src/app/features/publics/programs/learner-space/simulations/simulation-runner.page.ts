import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, interval, map, switchMap } from 'rxjs';
import { SimulationQuestion } from '../../program.models';
import { LearnerSimulationsService } from '../services/learner-simulations.service';

type SimulationResultSummary = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
};

type SavedSimulationSession = {
  answers: Record<string, string[]>;
  flaggedQuestionIds: string[];
  currentIndex: number;
  expiresAtMs: number;
};

@Component({
  selector: 'app-simulation-runner-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (simulation(); as simulation) {
      <section class="sr-shell">
        <a class="sr-back" [routerLink]="listRoute()">← Simulations</a>

        @if (result(); as summary) {
          <article class="sr-result-card" [attr.data-state]="summary.passed ? 'pass' : 'fail'">
            <span class="sr-kicker">Simulation completed</span>
            <h1>{{ simulation.title }}</h1>
            <p>
              You answered {{ summary.correctCount }} out of {{ summary.totalQuestions }} questions correctly.
            </p>

            <div class="sr-result-grid">
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
                <strong>{{ simulation.passingScore }}%</strong>
              </article>
            </div>

            <div class="sr-result-actions">
              <button type="button" class="sr-btn sr-btn--ghost" (click)="restartSimulation()">
                Retake locally
              </button>
              <button type="button" class="sr-btn sr-btn--primary" (click)="backToList()">
                Return to simulations
              </button>
            </div>
          </article>
        } @else if (hasGradableQuestions()) {
          <header class="sr-frame-header">
            <div class="sr-title-block">
              <span class="sr-kicker">Simulation player</span>
              <h1>{{ simulation.title }}</h1>
              <p>
                Question {{ currentIndex() + 1 }} of {{ totalQuestions() }}
                • {{ answeredCount() }} answered
                • {{ flaggedCount() }} flagged
              </p>
            </div>

            <div class="sr-header-meta">
              <article class="sr-meta-card" [class.sr-meta-card--warn]="remainingSeconds() <= 300">
                <span>Remaining time</span>
                <strong>{{ formatRemaining(remainingSeconds()) }}</strong>
              </article>
              <article class="sr-meta-card">
                <span>Progress</span>
                <strong>{{ completionPercent() }}%</strong>
              </article>
              <article class="sr-meta-card">
                <span>State</span>
                <strong>{{ saveStateLabel() }}</strong>
              </article>
            </div>
          </header>

          <div class="sr-integrity-strip">
            <article>
              <strong>One question at a time</strong>
              <p>Work in a focused simulation shell with quick navigation from the palette.</p>
            </article>
            <article>
              <strong>Drafts autosave locally</strong>
              <p>Your answers, flags and timer are restored if this route reloads.</p>
            </article>
            <article>
              <strong>Submit when ready</strong>
              <p>Unanswered items remain reviewable and count as incorrect after submission.</p>
            </article>
          </div>

          <div class="sr-workspace-grid">
            <!-- LEFT PANEL: Metadata -->
            <aside class="sr-left-panel">
              <section class="sr-meta-panel">
                <span class="sr-panel-label">Innovacare Review</span>
                <div class="sr-meta-item">
                  <span class="sr-meta-key">Subject</span>
                  <strong class="sr-meta-val">{{ currentQuestion()?.subject || 'Nursing' }}</strong>
                </div>
                <div class="sr-meta-item">
                  <span class="sr-meta-key">Lesson</span>
                  <strong class="sr-meta-val">{{ currentQuestion()?.lesson || 'Clinical Care' }}</strong>
                </div>
                <div class="sr-meta-item">
                  <span class="sr-meta-key">Client Need Area</span>
                  <strong class="sr-meta-val">{{ currentQuestion()?.clientNeedArea || 'Health & Wellness' }}</strong>
                </div>
              </section>

              <section class="sr-difficulty-panel">
                <span class="sr-panel-label">Question Level</span>
                <div class="sr-difficulty-badge" [class]="'sr-difficulty-' + (currentQuestion()?.difficulty || 'medium')">
                  {{ (currentQuestion()?.difficulty || 'medium') | titlecase }}
                </div>
              </section>

              <section class="sr-rail-card">
                <span class="sr-rail-label">Progress</span>
                <div class="sr-progress-track">
                  @for (question of simulation.questions; track question.id; let idx = $index) {
                    <button
                      type="button"
                      class="sr-progress-node"
                      [class.sr-progress-node--active]="idx === currentIndex()"
                      [class.sr-progress-node--answered]="isAnswered(question.id)"
                      [class.sr-progress-node--flagged]="isFlagged(question.id)"
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
            <main class="sr-question-stage">
              @if (currentQuestion(); as question) {
                <div class="sr-stage-head">
                  <span class="sr-question-type">
                    {{ question.mode === 'multi' ? 'Multiple response' : 'Single response' }}
                  </span>
                  <span class="sr-status-pill" [class.sr-status-pill--flagged]="isFlagged(question.id)">
                    {{ currentStatusLabel() }}
                  </span>
                </div>

                <article class="sr-question-card">
                  <h2>{{ question.prompt }}</h2>

                  <div class="sr-choice-list">
                    @for (choice of question.choices; track choice.id; let i = $index) {
                      <label class="sr-choice-card" [class.sr-choice-card--selected]="isChoiceSelected(question.id, choice.id)">
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

                  <section class="sr-draft-note">
                    <span class="sr-rail-label">Review control</span>
                    <p>
                      Flag this item if you want to revisit it before final submission. Your current selection is saved automatically.
                    </p>
                  </section>
                </article>

                <footer class="sr-action-bar">
                  <div class="sr-action-copy">
                    <strong>{{ unansweredCount() }} unanswered • {{ flaggedCount() }} flagged</strong>
                    <p>
                      You can move freely between questions in this classic simulation flow and submit at any time.
                    </p>
                  </div>

                  <div class="sr-action-buttons">
                    <button type="button" class="sr-btn sr-btn--ghost" (click)="toggleFlag(question.id)">
                      {{ isFlagged(question.id) ? 'Unflag question' : 'Flag question' }}
                    </button>
                    <button type="button" class="sr-btn sr-btn--ghost" (click)="previousQuestion()" [disabled]="currentIndex() === 0">
                      Previous
                    </button>
                    <button type="button" class="sr-btn sr-btn--ghost" (click)="nextQuestion()" [disabled]="currentIndex() >= totalQuestions() - 1">
                      Next
                    </button>
                    <button type="button" class="sr-btn sr-btn--primary" (click)="openSubmitConfirm()" [disabled]="submitting() || totalQuestions() === 0">
                      {{ unansweredCount() > 0 ? 'Review and submit' : 'Finish simulation' }}
                    </button>
                  </div>
                </footer>
              }
            </main>

            <!-- RIGHT PANEL: Explanation (Review Only) -->
            <aside class="sr-right-panel sr-explanation-panel">
              @if (result(); as summary) {
                <section class="sr-explanation-card">
                  <span class="sr-panel-label">Explanation</span>
                  <div class="sr-explanation-content">
                    <p>{{ currentQuestion()?.explanation || 'Review the answer choices and learn from this simulation scenario.' }}</p>
                    <div class="sr-explanation-visual">
                      <div class="sr-info-box sr-info-cyan">
                        <strong>Key Learning Point</strong>
                        <p>Clinical simulations help develop critical thinking and real-world decision-making skills.</p>
                      </div>
                    </div>
                  </div>
                </section>
              } @else {
                <div class="sr-explanation-placeholder">
                  <span>Submit to review explanation</span>
                </div>
              }
            </aside>
          </div>

          @if (submitConfirmOpen()) {
            <div class="sr-modal-backdrop" (click)="submitConfirmOpen.set(false)"></div>
            <section class="sr-modal-card" role="dialog" aria-modal="true" aria-label="Submit simulation">
              <h2>Submit simulation</h2>
              <p>
                {{ unansweredCount() > 0
                  ? 'You still have unanswered items. They will be scored as incorrect if you submit now.'
                  : 'All questions have a recorded response. You can submit the simulation now.' }}
              </p>

              <div class="sr-confirm-grid">
                <span>Answered: {{ answeredCount() }}</span>
                <span>Unanswered: {{ unansweredCount() }}</span>
                <span>Flagged: {{ flaggedCount() }}</span>
              </div>

              <div class="sr-modal-actions">
                <button type="button" class="sr-btn sr-btn--ghost" (click)="submitConfirmOpen.set(false)">
                  Continue reviewing
                </button>
                <button type="button" class="sr-btn sr-btn--primary" (click)="submitSimulation()" [disabled]="submitting()">
                  {{ submitting() ? 'Submitting…' : 'Submit now' }}
                </button>
              </div>
            </section>
          }
        } @else {
          <article class="sr-empty-card">
            <span class="sr-kicker">Simulation unavailable</span>
            <h1>{{ simulation.title }}</h1>
            <p>
              This simulation needs structured answer choices in program-admin before automatic scoring can run.
            </p>
          </article>
        }
      </section>
    } @else {
      <div class="sr-loading"><div class="sr-spinner"></div><span>Loading simulation…</span></div>
    }
  `,
  styles: [`
    :host { display: block; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .sr-shell { display: grid; gap: 1rem; color: #1a1a1a; max-width: 1600px; margin: 0 auto; padding: 1.5rem; }
    .sr-back { color: #2c5f7e; text-decoration: none; font-size: .92rem; font-weight: 600; margin-bottom: 0.5rem; }
    h1, h2, p { margin: 0; }
    .sr-frame-header {
      display: flex; justify-content: space-between; gap: 1rem; padding: 1.5rem;
      background: #2c5f7e; border-radius: 6px; color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .sr-frame-header h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
    .sr-frame-header p { color: rgba(255,255,255,.82); }
    .sr-kicker { display: inline-flex; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #ffd700; margin-bottom: 0.5rem; }
    .sr-integrity-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .9rem; padding: 1rem;
      background: #fff; border-radius: 6px; border: 1px solid #e1e5ea; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .sr-integrity-strip article { padding: .85rem 1rem; border-radius: 4px; border: 1px solid #e1e5ea; background: #f7f9fb; }
    .sr-integrity-strip strong { display: block; color: #1a1a1a; font-size: .95rem; margin-bottom: 0.3rem; }
    .sr-integrity-strip p { color: #666666; font-size: .85rem; line-height: 1.5; }
    .sr-workspace-grid { display: grid; grid-template-columns: 280px 1fr 320px; gap: 1rem; align-items: start; }
    .sr-left-panel { display: grid; gap: 1rem; position: sticky; top: 1.5rem; }
    .sr-meta-panel, .sr-difficulty-panel, .sr-rail-card, .sr-question-card, .sr-action-bar, .sr-explanation-card {
      background: #fff; border: 1px solid #e1e5ea; border-radius: 6px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .sr-panel-label { display: inline-flex; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #990011; margin-bottom: 0.8rem; }
    .sr-meta-item { display: grid; gap: 0.3rem; margin-bottom: 0.9rem; padding-bottom: 0.9rem; border-bottom: 1px solid #e1e5ea; }
    .sr-meta-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .sr-meta-key { font-size: .75rem; color: #666666; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .sr-meta-val { font-size: .95rem; color: #2c5f7e; }
    .sr-difficulty-panel { text-align: center; }
    .sr-difficulty-badge { display: inline-flex; padding: 0.7rem 1.2rem; border-radius: 4px; font-weight: 700; font-size: .9rem; margin-top: 0.5rem; }
    .sr-difficulty-hard { background: #ffe8e8; color: #a30000; border: 1px solid #ffcccb; }
    .sr-difficulty-medium { background: #fff8e8; color: #8a5a12; border: 1px solid #ffd699; }
    .sr-difficulty-low { background: #e8f8f0; color: #0f5d3f; border: 1px solid #99dbc4; }
    .sr-progress-track { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; margin-top: .8rem; }
    .sr-progress-node {
      min-height: 44px; border-radius: 4px; border: 1px solid #e1e5ea; background: #fff; color: #2c5f7e; font-weight: 700;
      cursor: pointer; transition: all .2s; font-size: .85rem;
    }
    .sr-progress-node:hover { border-color: #2c5f7e; background: rgba(44,95,126,.05); }
    .sr-progress-node--active { border-color: #2c5f7e; background: #2c5f7e; color: #fff; }
    .sr-progress-node--answered { background: #e8f8f0; border-color: #059669; color: #0f5d3f; }
    .sr-progress-node--flagged { background: #fff8e8; border-color: #edb300; color: #8a5a12; }
    .sr-question-stage { display: grid; gap: 1rem; }
    .sr-stage-head { display: flex; justify-content: space-between; align-items: flex-start; gap: .8rem; margin-bottom: 0.5rem; }
    .sr-question-type { display: inline-flex; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #990011; }
    .sr-status-pill { display: inline-flex; padding: .5rem .8rem; border-radius: 3px; border: 1px solid #e1e5ea; background: #f7f9fb; color: #333333; font-size: .75rem; font-weight: 700; }
    .sr-status-pill--flagged { border-color: #ffd699; background: #fff8e8; color: #8a5a12; }
    .sr-question-card { display: grid; gap: 1.2rem; }
    .sr-question-card h2 { font-size: 1.25rem; line-height: 1.6; color: #1a1a1a; margin-bottom: 0.5rem; }
    .sr-choice-list { display: grid; gap: 0.8rem; }
    .sr-choice-card {
      display: grid; grid-template-columns: auto 1fr; gap: 0.9rem; align-items: start; padding: 1rem 1.1rem;
      border-radius: 4px; border: 1px solid #e1e5ea; background: #fff; cursor: pointer; transition: all .2s;
    }
    .sr-choice-card:hover { border-color: #2c5f7e; background: rgba(44,95,126,.04); }
    .sr-choice-card--selected { border-color: #2c5f7e; background: rgba(44,95,126,.06); box-shadow: 0 2px 6px rgba(44,95,126,.12); }
    .sr-choice-card input { margin-top: .35rem; cursor: pointer; }
    .sr-choice-card strong { display: inline-flex; margin-bottom: .25rem; color: #2c5f7e; font-weight: 700; min-width: 2rem; }
    .sr-choice-card p { color: #333333; line-height: 1.6; font-size: .95rem; margin: 0; }
    .sr-draft-note { padding: 1rem 1.1rem; border-radius: 4px; border: 1px solid #e1e5ea; background: #f7f9fb; }
    .sr-draft-note p { color: #666666; font-size: .85rem; margin: 0; }
    .sr-action-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
    .sr-action-copy strong { color: #1a1a1a; font-size: .95rem; }
    .sr-action-copy p { color: #666666; font-size: .85rem; margin: 0.3rem 0 0; }
    .sr-action-buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .6rem; }
    .sr-btn { min-height: 44px; padding: 0 1.2rem; border-radius: 4px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all .2s; border: none; }
    .sr-btn--ghost { border: 1px solid #e1e5ea; background: transparent; color: #2c5f7e; }
    .sr-btn--ghost:hover { background: rgba(44,95,126,.06); border-color: #2c5f7e; }
    .sr-btn--primary { background: #2c5f7e; color: #fff; }
    .sr-btn--primary:hover { background: #1f4660; }
    .sr-btn:disabled { opacity: .5; cursor: not-allowed; }
    .sr-right-panel { position: sticky; top: 1.5rem; height: fit-content; }
    .sr-explanation-card { background: #f7f9fb; border: 1px solid #e1e5ea; }
    .sr-explanation-content { display: grid; gap: 1rem; }
    .sr-explanation-content p { color: #333333; line-height: 1.7; font-size: .95rem; }
    .sr-explanation-visual { display: grid; gap: 0.8rem; }
    .sr-info-box { padding: 1rem; border-radius: 4px; border-left: 4px solid #2c5f7e; }
    .sr-info-cyan { background: #f0f5f8; border-left-color: #2c5f7e; }
    .sr-info-box strong { display: block; color: #1a1a1a; margin-bottom: 0.5rem; font-size: .95rem; }
    .sr-info-box p { color: #666666; margin: 0; font-size: .85rem; line-height: 1.6; }
    .sr-explanation-placeholder { padding: 2rem 1rem; text-align: center; color: #666666; font-size: .9rem; border: 1px dashed #e1e5ea; border-radius: 6px; background: #f7f9fb; }
    .sr-result-card { background: #fff; border: 1px solid #e1e5ea; border-radius: 6px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04); }
    .sr-result-card h1 { font-size: 1.6rem; color: #1a1a1a; margin-bottom: 1rem; }
    .sr-result-card p { color: #666666; margin-bottom: 1rem; }
    .sr-result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .sr-result-grid article { padding: 1rem; border-radius: 6px; background: #f7f9fb; border: 1px solid #e1e5ea; text-align: center; }
    .sr-result-grid span { display: block; color: #666666; font-size: .85rem; margin-bottom: 0.5rem; }
    .sr-result-grid strong { display: block; font-size: 1.3rem; color: #1a1a1a; }
    .sr-result-card[data-state='pass'] { border-top: 4px solid #0f5d3f; }
    .sr-result-card[data-state='fail'] { border-top: 4px solid #a30000; }
    .sr-empty-card { background: #fff; border: 1px solid #e1e5ea; border-radius: 6px; padding: 2rem; text-align: center; }
    .sr-empty-card h1 { color: #1a1a1a; margin-bottom: 1rem; }
    .sr-empty-card p { color: #666666; }
    .sr-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 40; }
    .sr-modal-card {
      position: fixed; top: 50%; left: 50%; z-index: 50; width: min(520px, calc(100vw - 32px)); transform: translate(-50%, -50%);
      padding: 1.5rem; display: grid; gap: 1rem; background: #fff; border-radius: 6px; border: 1px solid #e1e5ea;
      box-shadow: 0 12px 48px rgba(0,0,0,.15);
    }
    .sr-modal-card h2 { color: #1a1a1a; margin-bottom: 0.5rem; }
    .sr-modal-card p { color: #666666; }
    .sr-confirm-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; padding: .85rem .95rem; border-radius: 4px; background: #f7f9fb; border: 1px solid #e1e5ea; }
    .sr-confirm-grid span { color: #666666; font-size: .85rem; }
    .sr-modal-actions { display: flex; gap: .75rem; justify-content: flex-end; flex-wrap: wrap; }
    .sr-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .sr-spinner { width: 40px; height: 40px; border: 4px solid #e1e5ea; border-top-color: #2c5f7e; border-radius: 50%; animation: sr-spin .8s linear infinite; }
    @keyframes sr-spin { to { transform: rotate(360deg); } }
    @media (max-width: 1200px) { .sr-workspace-grid { grid-template-columns: 1fr; } .sr-left-panel, .sr-right-panel { position: static; } }
    @media (max-width: 768px) { .sr-frame-header { flex-direction: column; } .sr-action-bar { flex-direction: column; align-items: stretch; } .sr-progress-track { grid-template-columns: repeat(6, 1fr); } }
  `],
})
export class SimulationRunnerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly simsService = inject(LearnerSimulationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly answers = signal<Record<string, string[]>>({});
  readonly flaggedQuestionIds = signal<string[]>([]);
  readonly currentIndex = signal(0);
  readonly remainingSeconds = signal(0);
  readonly result = signal<SimulationResultSummary | null>(null);
  readonly submitConfirmOpen = signal(false);
  readonly savePulseAt = signal(0);

  private expiresAtMs = 0;
  private initializedStorageKey = '';

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly simulationId$ = this.route.paramMap.pipe(map((p) => p.get('simulationId') || ''));

  readonly simulation = toSignal(
    combineLatest([this.programId$, this.simulationId$]).pipe(
      switchMap(([pid, sid]) => this.simsService.getSimulation(pid, sid))
    ),
    { initialValue: undefined }
  );

  readonly listRoute = toSignal(
    this.programId$.pipe(map((programId) => ['/my-programs', programId, 'simulations'])),
    { initialValue: ['/my-programs', '', 'simulations'] }
  );

  readonly totalQuestions = computed(() => this.simulation()?.questions?.length ?? 0);
  readonly currentQuestion = computed(() => this.simulation()?.questions?.[this.currentIndex()] ?? null);
  readonly answeredCount = computed(
    () => (this.simulation()?.questions ?? []).filter((question) => this.isAnswered(question.id)).length
  );
  readonly flaggedCount = computed(() => this.flaggedQuestionIds().length);
  readonly unansweredCount = computed(() => Math.max(0, this.totalQuestions() - this.answeredCount()));
  readonly completionPercent = computed(() => {
    const total = this.totalQuestions();
    return total ? Math.round((this.answeredCount() / total) * 100) : 0;
  });

  constructor() {
    effect(() => {
      const simulation = this.simulation();
      const key = this.storageKey();
      if (!simulation || !key || this.initializedStorageKey === key) {
        return;
      }

      this.initializedStorageKey = key;
      this.restoreProgress(simulation.durationMin);
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tickTimer();
      });
  }

  hasGradableQuestions(): boolean {
    const questions = this.simulation()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => (question.choices?.length ?? 0) >= 2);
  }

  isChoiceSelected(questionId: string, choiceId: string): boolean {
    return (this.answers()[questionId] ?? []).includes(choiceId);
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

  toggleChoice(question: SimulationQuestion, choiceId: string, checked: boolean): void {
    this.answers.update((prev) => {
      const current = new Set(prev[question.id] ?? []);

      if (question.mode === 'multi') {
        if (checked) {
          current.add(choiceId);
        } else {
          current.delete(choiceId);
        }
        return { ...prev, [question.id]: Array.from(current) };
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

  async submitSimulation(): Promise<void> {
    const simulation = this.simulation();
    const questions = simulation?.questions ?? [];
    if (!simulation || !questions.length) {
      return;
    }

    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      const summary = this.gradeSimulation();

      await this.simsService.submitAttempt({
        userId: '',
        programId,
        moduleId: simulation.moduleId,
        simulationId: simulation.id,
        score: summary.score,
        passed: summary.passed,
        timeSpentMin: this.elapsedMinutes(simulation.durationMin),
        analytics: {
          answers: this.answers(),
          correctCount: summary.correctCount,
          totalQuestions: summary.totalQuestions,
        },
      });
      this.result.set(summary);
      this.submitConfirmOpen.set(false);
      this.clearProgress();
    } finally {
      this.submitting.set(false);
    }
  }

  restartSimulation(): void {
    const simulation = this.simulation();
    if (!simulation) {
      return;
    }
    this.result.set(null);
    this.answers.set({});
    this.flaggedQuestionIds.set([]);
    this.currentIndex.set(0);
    this.submitConfirmOpen.set(false);
    this.expiresAtMs = Date.now() + Math.max(1, simulation.durationMin || 1) * 60 * 1000;
    this.remainingSeconds.set(Math.max(1, Math.round((this.expiresAtMs - Date.now()) / 1000)));
    this.persistProgress();
  }

  backToList(): void {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    void this.router.navigate(['/my-programs', programId, 'simulations']);
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
      void this.submitSimulation();
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

    const payload: SavedSimulationSession = {
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

  private readSavedSession(): SavedSimulationSession | null {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as SavedSimulationSession;
    } catch {
      return null;
    }
  }

  private storageKey(): string {
    const simulation = this.simulation();
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!simulation?.id || !programId) {
      return '';
    }
    return `simulation-session:${programId}:${simulation.id}`;
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

  private gradeSimulation(): SimulationResultSummary {
    const simulation = this.simulation();
    const questions = simulation?.questions ?? [];

    let correctCount = 0;
    for (const question of questions) {
      const selected = new Set(this.answers()[question.id] ?? []);
      const correctChoices = new Set(question.choices.filter((choice) => choice.correct).map((choice) => choice.id));
      const isCorrect = selected.size === correctChoices.size && Array.from(selected).every((choiceId) => correctChoices.has(choiceId));
      if (isCorrect) {
        correctCount += 1;
      }
    }

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return {
      score,
      passed: score >= Number(simulation?.passingScore ?? 0),
      correctCount,
      totalQuestions,
    };
  }
}
