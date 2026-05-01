import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerCaseStudiesService } from '../services/learner-case-studies.service';
import { CaseStudyQuestionStatus, CaseStudyScoringMode, ProgramCaseStudy } from '../../program.models';

type CaseStudyResultSummary = {
  score: number;
  passed: boolean;
  matchedKeywords: number;
  totalKeywords: number;
  note: string;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  completionPercent: number;
};

type SavedCaseStudySession = {
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  visitedQuestionIds: string[];
  questionStatuses: Record<string, CaseStudyQuestionStatus>;
  currentQuestionIndex: number;
  startedAtMs: number;
};

@Component({
  selector: 'app-case-study-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    @if (caseStudy(); as cs) {
      <div class="cd-page">
        <a class="cd-back" routerLink="../">← Case Studies</a>

        <header class="cd-header">
          <div>
            <span class="cd-scoring">{{ cs.scoringMode }} scoring</span>
            <h1 class="cd-title">{{ cs.title }}</h1>
            <p class="cd-desc">{{ cs.description }}</p>
          </div>
          <div class="cd-header-meta">
            <span>{{ answeredCount() }} answered</span>
            <span>{{ unansweredCount() }} unanswered</span>
            <span>{{ flaggedCount() }} flagged</span>
            <strong>{{ completionPercent() }}% complete</strong>
          </div>
        </header>

        <section class="cd-scenario-box">
          <h2 class="cd-section-title">Clinical Scenario</h2>
          <p class="cd-scenario-text">{{ cs.scenario }}</p>
        </section>

        <section class="cd-workspace" [class.cd-workspace--review]="!!result()">
          <!-- LEFT PANEL: Metadata -->
          <aside class="cd-left-panel">
            <div class="cd-meta-panel">
              <strong class="cd-panel-label">Innovacare Review</strong>
              <div class="cd-meta-item">
                <span class="cd-meta-key">Subject</span>
                <strong class="cd-meta-val">{{ currentQuestion()?.subject || 'Nursing' }}</strong>
              </div>
              <div class="cd-meta-item">
                <span class="cd-meta-key">Lesson</span>
                <strong class="cd-meta-val">{{ currentQuestion()?.lesson || 'Clinical Care' }}</strong>
              </div>
              <div class="cd-meta-item">
                <span class="cd-meta-key">Client Need Area</span>
                <strong class="cd-meta-val">{{ currentQuestion()?.clientNeedArea || 'Health & Wellness' }}</strong>
              </div>
            </div>

            <div class="cd-difficulty-panel">
              <strong class="cd-panel-label">Question Level</strong>
              <div class="cd-difficulty-badge" [class]="'cd-difficulty-' + (currentQuestion()?.difficulty || 'medium')">
                {{ (currentQuestion()?.difficulty || 'medium') | titlecase }}
              </div>
            </div>

            <div class="cd-progress-card">
              <strong>Progress</strong>
              <p>{{ answeredCount() }} answered • {{ flaggedCount() }} flagged</p>
              <small>{{ saveStateLabel() }}</small>
            </div>

            <div class="cd-progress-track">
              @for (question of cs.questions; track question.id; let i = $index) {
                <button
                  type="button"
                  class="cd-progress-pill"
                  [class.is-current]="currentIndex() === i"
                  [attr.data-state]="questionStatus(question.id)"
                  (click)="jumpToQuestion(i)"
                  title="Question {{ i + 1 }}"
                >
                  <span>Q{{ i + 1 }}</span>
                </button>
              }
            </div>
          </aside>

          <!-- CENTER PANEL: Question -->
          <div class="cd-main-panel">
            <div class="cd-stage-head">
              <div>
                <span class="cd-stage-eyebrow">Question {{ currentIndex() + 1 }} of {{ totalQuestions() }}</span>
                <h2 class="cd-question-title">{{ currentQuestion()?.prompt }}</h2>
              </div>
              <div class="cd-stage-actions">
                <span class="cd-status-badge" [attr.data-state]="currentStatus()">{{ currentStatusLabel() }}</span>
                <button type="button" class="cd-flag-btn" [class.is-active]="currentQuestionFlagged()" (click)="toggleCurrentFlag()">
                  {{ currentQuestionFlagged() ? 'Unflag question' : 'Flag question' }}
                </button>
              </div>
            </div>

            <label class="cd-answer-shell">
              <span class="cd-answer-label">Your clinical response</span>
              <textarea
                class="cd-answer"
                rows="8"
                [placeholder]="'Type your answer for question ' + (currentIndex() + 1) + '…'"
                [ngModel]="currentAnswer()"
                (ngModelChange)="updateCurrentAnswer($event)">
              </textarea>
            </label>

            <div class="cd-action-bar">
              <button type="button" class="cd-nav-btn cd-nav-btn--ghost" (click)="previousQuestion()" [disabled]="currentIndex() === 0">
                Previous
              </button>
              <button type="button" class="cd-nav-btn cd-nav-btn--ghost" (click)="nextQuestion()" [disabled]="currentIndex() >= totalQuestions() - 1">
                Next
              </button>
              <button type="button" class="cd-submit-btn" (click)="submit()" [disabled]="submitting() || !hasAnyProgress()">
                {{ submitting() ? 'Submitting…' : unansweredCount() > 0 ? 'Review and submit' : 'Finish case study' }}
              </button>
            </div>
          </div>

          @if (result()) {
            <!-- RIGHT PANEL: Explanation (Review Only) -->
            <aside class="cd-right-panel cd-explanation-panel">
              <section class="cd-explanation-card">
                <strong class="cd-panel-label">Explanation</strong>
                <div class="cd-explanation-content">
                  <p>{{ currentQuestion()?.explanation || 'Review your clinical response and the expected answer pattern.' }}</p>
                  <div class="cd-explanation-visual">
                    <div class="cd-info-box cd-info-cyan">
                      <strong>Key Learning Point</strong>
                      <p>Clinical case studies build critical thinking in real-world scenarios.</p>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          }
        </section>

        @if (result(); as summary) {
          <section class="cd-result" [attr.data-state]="summary.passed ? 'pass' : 'review'">
            <h2 class="cd-section-title">Result</h2>
            <p>{{ summary.note }}</p>
            <div class="cd-result-meta">
              <span>Score: {{ summary.score }}%</span>
              <span>Answered: {{ summary.answeredCount }}</span>
              <span>Unanswered: {{ summary.unansweredCount }}</span>
              <span>Flagged: {{ summary.flaggedCount }}</span>
              <span>Matched keywords: {{ summary.matchedKeywords }}/{{ summary.totalKeywords }}</span>
            </div>
          </section>
        }
      </div>
    } @else {
      <div class="cd-loading"><div class="cd-spinner"></div><span>Loading case study…</span></div>
    }
  `,
  styles: [`
    .cd-page { display: grid; gap: 1.25rem; max-width: 1160px; }
    .cd-back { font-size: .78rem; color: #0f6cbd; text-decoration: none; display: inline-block; }
    .cd-header {
      display: flex; justify-content: space-between; gap: 1rem; align-items: start;
      background: linear-gradient(135deg, #f0fdf4, #eff6ff);
      border: 1px solid #d9f2e4; border-radius: 18px; padding: 1.4rem;
    }
    .cd-scoring {
      display: inline-flex; margin-bottom: .45rem; font-size: .68rem; font-weight: 800; letter-spacing: .08em;
      text-transform: uppercase; color: #0f766e;
    }
    .cd-title { margin: 0 0 .3rem; font-size: 1.45rem; font-weight: 800; color: #122338; }
    .cd-desc { margin: 0; color: #5f7186; line-height: 1.6; }
    .cd-header-meta {
      display: grid; gap: .35rem; min-width: 220px; padding: .95rem 1rem;
      border-radius: 16px; background: rgba(255,255,255,.72); color: #25425f;
    }
    .cd-header-meta strong { font-size: 1.1rem; color: #122338; }
    .cd-scenario-box {
      background: #f9fbff; border: 1px solid #dfe8f2; border-left: 4px solid #0f6cbd;
      border-radius: 16px; padding: 1.2rem;
    }
    .cd-section-title { margin: 0 0 .55rem; font-size: .95rem; font-weight: 800; color: #122338; }
    .cd-scenario-text { margin: 0; line-height: 1.7; color: #35506b; }
    .cd-workspace { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 1rem; }
    .cd-progress-rail { display: grid; gap: .9rem; align-content: start; }
    .cd-progress-card {
      display: grid; gap: .35rem; padding: 1rem; border-radius: 16px;
      border: 1px solid #d8e6ef; background: #fff;
    }
    .cd-progress-card p, .cd-progress-card small, .cd-progress-card strong { margin: 0; }
    .cd-progress-card small { color: #6b7e91; }
    .cd-workspace { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 1rem; align-items: start; }
    .cd-workspace--review { grid-template-columns: 280px minmax(0, 1fr) 320px; }
    .cd-left-panel { display: grid; gap: 1rem; position: sticky; top: 1.5rem; }
    .cd-meta-panel, .cd-difficulty-panel, .cd-progress-card, .cd-main-panel, .cd-explanation-card {
      background: #fff; border: 1px solid #e1e5ea; border-radius: 6px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .cd-panel-label { display: inline-flex; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #990011; margin-bottom: 0.8rem; }
    .cd-meta-item { display: grid; gap: 0.3rem; margin-bottom: 0.9rem; padding-bottom: 0.9rem; border-bottom: 1px solid #e1e5ea; }
    .cd-meta-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .cd-meta-key { font-size: .75rem; color: #666666; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .cd-meta-val { font-size: .95rem; color: #2c5f7e; }
    .cd-difficulty-panel { text-align: center; }
    .cd-difficulty-badge { display: inline-flex; padding: 0.7rem 1.2rem; border-radius: 4px; font-weight: 700; font-size: .9rem; margin-top: 0.5rem; }
    .cd-difficulty-hard { background: #ffe8e8; color: #a30000; border: 1px solid #ffcccb; }
    .cd-difficulty-medium { background: #fff8e8; color: #8a5a12; border: 1px solid #ffd699; }
    .cd-difficulty-low { background: #e8f8f0; color: #0f5d3f; border: 1px solid #99dbc4; }
    .cd-progress-card { display: grid; gap: .35rem; }
    .cd-progress-card strong, .cd-progress-card p, .cd-progress-card small { margin: 0; }
    .cd-progress-card small { color: #666666; font-size: .8rem; }
    .cd-progress-track { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .55rem; }
    .cd-progress-pill {
      min-height: 3rem; border-radius: 4px; border: 1px solid #e1e5ea; background: #fff; cursor: pointer;
      font-weight: 700; color: #2c5f7e; transition: all .2s;
    }
    .cd-progress-pill:hover { border-color: #2c5f7e; background: rgba(44,95,126,.05); }
    .cd-progress-pill.is-current { border-color: #2c5f7e; background: #2c5f7e; color: #fff; }
    .cd-progress-pill[data-state='answered'] { background: #e8f8f0; border-color: #059669; color: #0f5d3f; }
    .cd-progress-pill[data-state='flagged'] { background: #fff8e8; border-color: #edb300; color: #8a5a12; }
    .cd-progress-pill[data-state='flagged_and_answered'] { background: rgba(44,95,126,.08); border-color: #2c5f7e; color: #2c5f7e; }
    .cd-progress-pill[data-state='visited_unanswered'] { background: #f7f9fb; border-color: #c5d3e0; color: #666666; }
    .cd-main-panel { display: grid; gap: 1rem; }
    .cd-stage-head { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
    .cd-stage-eyebrow { display: inline-flex; margin-bottom: .45rem; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #990011; }
    .cd-question-title { margin: 0; font-size: 1.08rem; line-height: 1.5; color: #1a1a1a; }
    .cd-stage-actions { display: flex; gap: .7rem; align-items: center; flex-wrap: wrap; }
    .cd-status-badge { display: inline-flex; align-items: center; min-height: 2.1rem; padding: 0 .85rem; border-radius: 3px; background: #f7f9fb; color: #333333; font-size: .75rem; font-weight: 700; }
    .cd-status-badge[data-state='answered'] { background: #e8f8f0; color: #0f5d3f; }
    .cd-status-badge[data-state='flagged'] { background: #fff8e8; color: #8a5a12; }
    .cd-status-badge[data-state='flagged_and_answered'] { background: rgba(44,95,126,.08); color: #2c5f7e; }
    .cd-status-badge[data-state='visited_unanswered'] { background: #f7f9fb; color: #666666; }
    .cd-flag-btn, .cd-nav-btn, .cd-submit-btn { min-height: 2.8rem; padding: 0 1rem; border-radius: 4px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; }
    .cd-flag-btn, .cd-nav-btn { background: transparent; border: 1px solid #e1e5ea; color: #2c5f7e; }
    .cd-flag-btn:hover, .cd-nav-btn:hover { background: rgba(44,95,126,.06); border-color: #2c5f7e; }
    .cd-flag-btn.is-active { background: #fff8e8; border-color: #edb300; color: #8a5a12; }
    .cd-submit-btn { background: #2c5f7e; color: #fff; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }
    .cd-submit-btn:hover { background: #1f4660; }
    .cd-submit-btn:disabled { opacity: .5; cursor: not-allowed; }
    .cd-answer-shell { display: grid; gap: 0.5rem; }
    .cd-answer-label { font-size: .85rem; font-weight: 600; color: #1a1a1a; }
    .cd-answer { padding: 1rem; border-radius: 4px; border: 1px solid #e1e5ea; font-family: inherit; font-size: .95rem; resize: vertical; }
    .cd-answer:focus { outline: none; border-color: #2c5f7e; box-shadow: 0 0 0 3px rgba(44,95,126,.1); }
    .cd-action-bar { display: flex; gap: .75rem; justify-content: flex-end; flex-wrap: wrap; }
    .cd-right-panel { position: sticky; top: 1.5rem; height: fit-content; }
    .cd-explanation-card { background: #f7f9fb; border: 1px solid #e1e5ea; }
    .cd-explanation-content { display: grid; gap: 1rem; }
    .cd-explanation-content p { color: #333333; line-height: 1.7; font-size: .95rem; margin: 0; }
    .cd-explanation-visual { display: grid; gap: 0.8rem; }
    .cd-info-box { padding: 1rem; border-radius: 4px; border-left: 4px solid #2c5f7e; }
    .cd-info-cyan { background: #f0f5f8; border-left-color: #2c5f7e; }
    .cd-info-box strong { display: block; color: #1a1a1a; margin-bottom: 0.5rem; font-size: .95rem; }
    .cd-info-box p { color: #666666; margin: 0; font-size: .85rem; line-height: 1.6; }
    .cd-explanation-placeholder { padding: 2rem 1rem; text-align: center; color: #666666; font-size: .9rem; border: 1px dashed #e1e5ea; border-radius: 6px; background: #f7f9fb; }
    .cd-result { background: #fff; border: 1px solid #e1e5ea; border-radius: 6px; padding: 1.5rem; margin-top: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04); }
    .cd-result[data-state='pass'] { border-top: 4px solid #0f5d3f; }
    .cd-result[data-state='review'] { border-top: 4px solid #8a5a12; }
    .cd-result h2 { color: #1a1a1a; margin-bottom: 0.5rem; }
    .cd-result p { color: #666666; margin-bottom: 1rem; }
    .cd-result-meta { display: flex; flex-wrap: wrap; gap: 1.5rem; font-size: .9rem; color: #666666; }
    .cd-back { font-size: .78rem; color: #2c5f7e; text-decoration: none; display: inline-block; margin-bottom: 0.5rem; font-weight: 600; }
    .cd-header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; background: #2c5f7e; border: 1px solid #2c5f7e; border-radius: 6px; padding: 1.4rem; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04); }
    .cd-scoring { display: inline-flex; margin-bottom: .45rem; font-size: .65rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #a8c5d9; }
    .cd-title { margin: 0 0 .3rem; font-size: 1.45rem; font-weight: 800; color: #fff; }
    .cd-desc { margin: 0; color: rgba(255,255,255,.82); line-height: 1.6; }
    .cd-header-meta { display: grid; gap: .35rem; min-width: 220px; padding: .95rem 1rem; border-radius: 4px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.82); border: 1px solid rgba(255,255,255,.25); }
    .cd-header-meta strong { font-size: 1.1rem; color: #fff; }
    .cd-scenario-box { background: #f7f9fb; border: 1px solid #e1e5ea; border-left: 4px solid #2c5f7e; border-radius: 6px; padding: 1.2rem; }
    .cd-section-title { margin: 0 0 .55rem; font-size: .95rem; font-weight: 700; color: #1a1a1a; }
    .cd-scenario-text { margin: 0; line-height: 1.7; color: #666666; }
    .cd-page { display: grid; gap: 1.25rem; max-width: 1600px; margin: 0 auto; padding: 1.5rem; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .cd-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .cd-spinner { width: 40px; height: 40px; border: 4px solid #e1e5ea; border-top-color: #2c5f7e; border-radius: 50%; animation: cd-spin .8s linear infinite; }
    @keyframes cd-spin { to { transform: rotate(360deg); } }
    @media (max-width: 1200px) { .cd-workspace { grid-template-columns: 1fr; } .cd-left-panel, .cd-right-panel { position: static; } }
    @media (max-width: 768px) { .cd-header { flex-direction: column; } .cd-action-bar { flex-direction: column; align-items: stretch; } .cd-progress-track { grid-template-columns: repeat(6, 1fr); } }
  `],
})
export class CaseStudyDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly caseStudiesService = inject(LearnerCaseStudiesService);

  readonly submitting = signal(false);
  readonly answers = signal<Record<string, string>>({});
  readonly flags = signal<Record<string, boolean>>({});
  readonly visitedQuestionIds = signal<string[]>([]);
  readonly questionStatuses = signal<Record<string, CaseStudyQuestionStatus>>({});
  readonly currentIndex = signal(0);
  readonly result = signal<CaseStudyResultSummary | null>(null);
  readonly savePulseAt = signal(0);

  private startedAtMs = Date.now();
  private initializedStorageKey = '';

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly caseStudyId$ = this.route.paramMap.pipe(map((p) => p.get('caseStudyId') || ''));

  readonly caseStudy = toSignal(
    combineLatest([this.programId$, this.caseStudyId$]).pipe(
      switchMap(([pid, csid]) => this.caseStudiesService.getCaseStudy(pid, csid))
    ),
    { initialValue: undefined }
  );

  readonly totalQuestions = computed(() => this.caseStudy()?.questions.length ?? 0);
  readonly currentQuestion = computed(() => this.caseStudy()?.questions?.[this.currentIndex()] ?? null);
  readonly currentAnswer = computed(() => {
    const question = this.currentQuestion();
    return question ? this.answers()[question.id] || '' : '';
  });
  readonly answeredCount = computed(
    () => (this.caseStudy()?.questions ?? []).filter((question) => this.isAnswered(question.id)).length
  );
  readonly flaggedCount = computed(() => Object.values(this.flags()).filter(Boolean).length);
  readonly unansweredCount = computed(() => Math.max(0, this.totalQuestions() - this.answeredCount()));
  readonly completionPercent = computed(() => {
    const total = this.totalQuestions();
    return total ? Math.round((this.answeredCount() / total) * 100) : 0;
  });
  readonly currentStatus = computed(() => {
    const question = this.currentQuestion();
    return question ? this.questionStatus(question.id) : 'unanswered';
  });
  readonly currentQuestionFlagged = computed(() => {
    const question = this.currentQuestion();
    return question ? this.flags()[question.id] === true : false;
  });

  constructor() {
    effect(() => {
      const caseStudy = this.caseStudy();
      const key = this.storageKey();
      if (!caseStudy || !key || this.initializedStorageKey === key) {
        return;
      }

      this.initializedStorageKey = key;
      this.restoreProgress(caseStudy);
    });
  }

  hasAnyProgress(): boolean {
    return this.answeredCount() > 0 || this.flaggedCount() > 0 || this.visitedQuestionIds().length > 0;
  }

  questionStatus(questionId: string): CaseStudyQuestionStatus {
    return this.questionStatuses()[questionId] || 'unanswered';
  }

  currentStatusLabel(): string {
    switch (this.currentStatus()) {
      case 'answered':
        return 'Answered';
      case 'flagged':
        return 'Flagged';
      case 'flagged_and_answered':
        return 'Flagged and answered';
      case 'visited_unanswered':
        return 'Visited';
      default:
        return 'Unanswered';
    }
  }

  updateCurrentAnswer(value: string): void {
    const question = this.currentQuestion();
    if (!question) {
      return;
    }

    this.answers.update((current) => ({ ...current, [question.id]: value }));
    this.markVisited(question.id);
    this.syncQuestionStatus(question.id);
    this.persistProgress();
  }

  toggleCurrentFlag(): void {
    const question = this.currentQuestion();
    if (!question) {
      return;
    }

    this.flags.update((current) => ({
      ...current,
      [question.id]: current[question.id] !== true,
    }));
    this.markVisited(question.id);
    this.syncQuestionStatus(question.id);
    this.persistProgress();
  }

  previousQuestion(): void {
    if (this.currentIndex() <= 0) {
      return;
    }
    this.currentIndex.update((value) => value - 1);
    this.focusCurrentQuestion();
    this.persistProgress();
  }

  nextQuestion(): void {
    if (this.currentIndex() >= this.totalQuestions() - 1) {
      return;
    }
    this.currentIndex.update((value) => value + 1);
    this.focusCurrentQuestion();
    this.persistProgress();
  }

  jumpToQuestion(index: number): void {
    if (index < 0 || index >= this.totalQuestions()) {
      return;
    }
    this.currentIndex.set(index);
    this.focusCurrentQuestion();
    this.persistProgress();
  }

  async submit(): Promise<void> {
    const cs = this.caseStudy();
    if (!cs || !this.hasAnyProgress()) {
      return;
    }

    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      const summary = this.gradeCaseStudy();
      await this.caseStudiesService.submitAttempt({
        userId: '',
        programId,
        moduleId: cs.moduleId,
        caseStudyId: cs.id,
        score: summary.score,
        passed: summary.passed,
        answers: this.answers(),
        flags: this.flags(),
        visitedQuestionIds: this.visitedQuestionIds(),
        questionStatuses: this.questionStatuses(),
        answeredCount: summary.answeredCount,
        unansweredCount: summary.unansweredCount,
        flaggedCount: summary.flaggedCount,
        currentQuestionIndex: this.currentIndex(),
        completionPercent: summary.completionPercent,
        elapsedSeconds: this.elapsedSeconds(),
        evaluatorNotes: summary.note,
      });
      this.result.set(summary);
      this.clearProgress();
    } finally {
      this.submitting.set(false);
    }
  }

  saveStateLabel(): string {
    const delta = Date.now() - this.savePulseAt();
    return delta < 1500 ? 'Draft saved' : 'Local session active';
  }

  private isAnswered(questionId: string): boolean {
    return String(this.answers()[questionId] || '').trim().length > 0;
  }

  private focusCurrentQuestion(): void {
    const question = this.currentQuestion();
    if (!question) {
      return;
    }
    this.markVisited(question.id);
    this.syncQuestionStatus(question.id);
  }

  private markVisited(questionId: string): void {
    this.visitedQuestionIds.update((current) => (current.includes(questionId) ? current : [...current, questionId]));
  }

  private syncQuestionStatus(questionId: string): void {
    const answered = this.isAnswered(questionId);
    const flagged = this.flags()[questionId] === true;
    const visited = this.visitedQuestionIds().includes(questionId);

    let nextStatus: CaseStudyQuestionStatus = 'unanswered';
    if (flagged && answered) {
      nextStatus = 'flagged_and_answered';
    } else if (flagged) {
      nextStatus = 'flagged';
    } else if (answered) {
      nextStatus = 'answered';
    } else if (visited) {
      nextStatus = 'visited_unanswered';
    }

    this.questionStatuses.update((current) => ({ ...current, [questionId]: nextStatus }));
  }

  private gradeCaseStudy(): CaseStudyResultSummary {
    const caseStudy = this.caseStudy();
    if (!caseStudy?.questions.length) {
      return {
        score: 0,
        passed: false,
        matchedKeywords: 0,
        totalKeywords: 0,
        note: 'No case study questions were configured.',
        answeredCount: 0,
        unansweredCount: 0,
        flaggedCount: 0,
        completionPercent: 0,
      };
    }

    let matchedKeywords = 0;
    let totalKeywords = 0;
    let earnedPoints = 0;
    let maxPoints = 0;

    for (const question of caseStudy.questions) {
      const answer = String(this.answers()[question.id] || '').trim().toLowerCase();
      const keywords = (question.expectedKeywords ?? []).map((keyword) => keyword.toLowerCase()).filter(Boolean);
      const questionMax = Math.max(Number(question.maxScore || 1), 1);
      maxPoints += questionMax;

      if (!keywords.length) {
        if (answer) {
          earnedPoints += questionMax;
        }
        continue;
      }

      totalKeywords += keywords.length;
      const keywordMatches = keywords.filter((keyword) => answer.includes(keyword)).length;
      matchedKeywords += keywordMatches;
      earnedPoints += (keywordMatches / keywords.length) * questionMax;
    }

    const answeredCount = this.answeredCount();
    const unansweredCount = Math.max(0, caseStudy.questions.length - answeredCount);
    const flaggedCount = this.flaggedCount();
    const completionPercent = caseStudy.questions.length
      ? Math.round((answeredCount / caseStudy.questions.length) * 100)
      : 0;
    const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
    const autoGraded = caseStudy.scoringMode !== CaseStudyScoringMode.MANUAL || totalKeywords > 0;
    const note = autoGraded
      ? `Keyword-based scoring completed for ${caseStudy.questions.length} questions. ${flaggedCount} question(s) remained flagged at submission.`
      : 'Submitted for manual review because no expected keywords were configured.';

    return {
      score,
      passed: autoGraded ? score >= 70 : false,
      matchedKeywords,
      totalKeywords,
      note,
      answeredCount,
      unansweredCount,
      flaggedCount,
      completionPercent,
    };
  }

  private elapsedSeconds(): number {
    return Math.max(0, Math.round((Date.now() - this.startedAtMs) / 1000));
  }

  private restoreProgress(caseStudy: ProgramCaseStudy): void {
    const saved = this.readSavedSession();
    this.answers.set(saved?.answers ?? {});
    this.flags.set(saved?.flags ?? {});
    this.visitedQuestionIds.set(saved?.visitedQuestionIds ?? []);
    this.questionStatuses.set(saved?.questionStatuses ?? {});
    this.currentIndex.set(Math.max(0, Math.min(saved?.currentQuestionIndex ?? 0, Math.max(0, caseStudy.questions.length - 1))));
    this.startedAtMs = saved?.startedAtMs ?? Date.now();
    this.focusCurrentQuestion();
    this.persistProgress();
  }

  private persistProgress(): void {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return;
    }

    const payload: SavedCaseStudySession = {
      answers: this.answers(),
      flags: this.flags(),
      visitedQuestionIds: this.visitedQuestionIds(),
      questionStatuses: this.questionStatuses(),
      currentQuestionIndex: this.currentIndex(),
      startedAtMs: this.startedAtMs,
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

  private readSavedSession(): SavedCaseStudySession | null {
    const key = this.storageKey();
    if (!key || typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SavedCaseStudySession;
    } catch {
      return null;
    }
  }

  private storageKey(): string {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    const caseStudyId = this.route.snapshot.paramMap.get('caseStudyId') || '';
    return programId && caseStudyId ? `case-study-session:${programId}:${caseStudyId}` : '';
  }
}