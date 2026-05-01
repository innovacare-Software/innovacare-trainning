import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';

import {
  ListeningTestAssessment,
  ListeningAnswer,
  ListeningErrorReflection,
  ListeningMode,
  TARGET_TEST_LABELS,
  GradingResult,
} from '../models/listening-test.models';
import { ListeningTestService } from '../services/listening-test.service';
import { ListeningGradingService } from '../services/listening-grading.service';

import { ListeningAudioPlayerComponent } from '../components/audio-player/listening-audio-player.component';
import { ListeningTimerComponent } from '../components/timer/listening-timer.component';
import { ListeningQuestionRendererComponent } from '../components/question-renderer/listening-question-renderer.component';
import { ListeningResultPanelComponent } from '../components/result-panel/listening-result-panel.component';
import { ListeningErrorReflectionComponent } from '../components/error-reflection/listening-error-reflection.component';
import { ListeningTranscriptPanelComponent } from '../components/transcript-panel/listening-transcript-panel.component';

type RunnerPhase =
  | 'loading'
  | 'error'
  | 'prestart'
  | 'active'
  | 'confirming'
  | 'submitting'
  | 'results'
  | 'reflection'
  | 'done';

@Component({
  selector: 'app-listening-test-runner',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ListeningAudioPlayerComponent,
    ListeningTimerComponent,
    ListeningQuestionRendererComponent,
    ListeningResultPanelComponent,
    ListeningErrorReflectionComponent,
    ListeningTranscriptPanelComponent,
  ],
  template: `
    <div class="runner-wrap">

      <!-- ══ LOADING ══ -->
      @if (phase() === 'loading') {
        <div class="state-card state-card--loading">
          <div class="spinner"></div>
          <p>Loading listening test…</p>
        </div>
      }

      <!-- ══ ERROR ══ -->
      @if (phase() === 'error') {
        <div class="state-card state-card--error">
          <div class="error-icon">⚠</div>
          <h2>Test not found</h2>
          <p>{{ errorMsg() }}</p>
          <a routerLink="/learner" class="btn-secondary">Return to Dashboard</a>
        </div>
      }

      <!-- ══ PRE-START ══ -->
      @if (phase() === 'prestart' && assessment()) {
        <div class="prestart-wrap">

          <!-- Test header -->
          <div class="test-header">
            <div class="header-badges">
              <span class="badge badge--test">{{ TARGET_TEST_LABELS[assessment()!.targetTest] }}</span>
              <span class="badge" [class.badge--practice]="assessment()!.mode === 'PRACTICE'" [class.badge--mock]="assessment()!.mode === 'MOCK_EXAM'">
                {{ assessment()!.mode === 'PRACTICE' ? 'Practice' : 'Mock Exam' }}
              </span>
              <span class="badge badge--lang">{{ assessment()!.language.toUpperCase() }}</span>
            </div>
            <h1>{{ assessment()!.title }}</h1>
            <p class="test-description">{{ assessment()!.description }}</p>
            @if (assessment()!.scenario) {
              <div class="scenario-block">
                <span class="scenario-label">Scenario</span>
                <p>{{ assessment()!.scenario }}</p>
              </div>
            }
            @if (assessment()!.professionalContext) {
              <div class="context-pill">👩‍⚕️ {{ assessment()!.professionalContext }}</div>
            }
          </div>

          <!-- Rules card -->
          <div class="rules-card">
            <h3>📋 Test Rules</h3>
            <div class="rules-grid">
              <div class="rule-item">
                <span class="rule-icon">⏱</span>
                <div>
                  <strong>{{ assessment()!.durationMin }} minutes</strong>
                  <small>Time limit</small>
                </div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">🎯</span>
                <div>
                  <strong>{{ assessment()!.passingScore }}%</strong>
                  <small>Passing score</small>
                </div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">🔊</span>
                <div>
                  <strong>{{ assessment()!.audioSettings.maxPlays }} play{{ assessment()!.audioSettings.maxPlays === 1 ? '' : 's' }}</strong>
                  <small>{{ assessment()!.audioSettings.allowReplay ? 'Replay allowed' : 'No replay' }}</small>
                </div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">⏭</span>
                <div>
                  <strong>{{ assessment()!.audioSettings.disableSeeking ? 'No seeking' : 'Seeking allowed' }}</strong>
                  <small>Audio controls</small>
                </div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">📄</span>
                <div>
                  <strong>{{ assessment()!.audioSettings.showTranscriptAfterSubmit ? 'After submission' : 'Not shown' }}</strong>
                  <small>Transcript</small>
                </div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">📝</span>
                <div>
                  <strong>{{ assessment()!.questions.length }} question{{ assessment()!.questions.length === 1 ? '' : 's' }}</strong>
                  <small>Total</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Instructions -->
          <div class="instructions-card">
            <h3>📌 Instructions</h3>
            <ul class="instructions-list">
              <li>Make sure you are in a quiet environment before starting.</li>
              @if (assessment()!.audioSettings.requireHeadphonesConfirmation) {
                <li>Use headphones for the best experience.</li>
              }
              <li>The timer starts as soon as you click "Start Test".</li>
              @if (!assessment()!.audioSettings.allowReplay) {
                <li><strong>You may only play the audio once.</strong></li>
              } @else {
                <li>You may play the audio up to <strong>{{ assessment()!.audioSettings.maxPlays }} times</strong>.</li>
              }
              @if (assessment()!.audioSettings.disableSeeking) {
                <li>You cannot fast-forward or rewind the audio.</li>
              }
              <li>Answer all questions before the time expires.</li>
              @if (assessment()!.errorLogRequired) {
                <li>After submission you will complete an error reflection for missed questions.</li>
              }
            </ul>
          </div>

          <button type="button" class="btn-start" (click)="startTest()">▶ Start Test</button>
        </div>
      }

      <!-- ══ ACTIVE TEST ══ -->
      @if ((phase() === 'active' || phase() === 'confirming') && assessment()) {
        <div class="active-wrap">

          <!-- Sticky header -->
          <div class="active-header">
            <div class="active-title">
              <span class="badge badge--test">{{ TARGET_TEST_LABELS[assessment()!.targetTest] }}</span>
              <strong>{{ assessment()!.title }}</strong>
            </div>
            <app-listening-timer
              [durationMin]="assessment()!.durationMin"
              (timesUp)="onTimesUp($event)"
              (tickSeconds)="onTick($event)"
              #timerRef
            ></app-listening-timer>
            <span class="answered-indicator">{{ answeredCount() }}/{{ assessment()!.questions.length }} answered</span>
          </div>

          <!-- Audio player -->
          <div class="audio-section">
            <app-listening-audio-player
              [audioUrl]="assessment()!.audioUrl"
              [settings]="assessment()!.audioSettings"
              [title]="assessment()!.title"
              (playCountChange)="audioPlayCount.set($event)"
            ></app-listening-audio-player>
          </div>

          <!-- Questions -->
          <div class="questions-section">
            @for (q of assessment()!.questions; track q.id; let i = $index) {
              <app-listening-question-renderer
                [question]="q"
                [index]="i"
                [showUnansweredWarning]="phase() === 'confirming'"
                [initialAnswer]="answers().get(q.id) ?? null"
                (answerChange)="onAnswerChange($event)"
              ></app-listening-question-renderer>
            }
          </div>

          <!-- Confirmation modal -->
          @if (phase() === 'confirming') {
            <div class="confirm-overlay">
              <div class="confirm-modal">
                <h3>Submit answers?</h3>
                @if (unansweredCount() > 0) {
                  <p class="confirm-warn">⚠ You have <strong>{{ unansweredCount() }}</strong> unanswered question(s). Unanswered questions will be marked incorrect.</p>
                }
                <p class="confirm-msg">Once submitted you cannot change your answers.</p>
                <div class="confirm-actions">
                  <button type="button" class="btn-secondary" (click)="cancelConfirm()">Cancel — Keep answering</button>
                  <button type="button" class="btn-submit" (click)="submitAnswers()">Submit Now</button>
                </div>
              </div>
            </div>
          }

          <!-- Submit bar -->
          @if (phase() === 'active') {
            <div class="submit-bar">
              <p class="submit-hint">{{ answeredCount() }}/{{ assessment()!.questions.length }} answered</p>
              <button type="button" class="btn-submit-bar" (click)="confirmSubmit()">Submit Answers →</button>
            </div>
          }
        </div>
      }

      <!-- ══ SUBMITTING ══ -->
      @if (phase() === 'submitting') {
        <div class="state-card state-card--loading">
          <div class="spinner"></div>
          <p>Saving your results…</p>
        </div>
      }

      <!-- ══ RESULTS ══ -->
      @if ((phase() === 'results' || phase() === 'reflection' || phase() === 'done') && assessment() && gradingResult() && savedResult()) {

        <!-- Results header -->
        <div class="results-header">
          <div class="rh-badges">
            <span class="badge badge--test">{{ TARGET_TEST_LABELS[assessment()!.targetTest] }}</span>
            <span class="badge" [class.badge--pass]="savedResult()!.passed" [class.badge--fail]="!savedResult()!.passed">
              {{ savedResult()!.passed ? 'PASSED' : 'FAILED' }}
            </span>
          </div>
          <h2>{{ assessment()!.title }}</h2>
        </div>

        <!-- Result panel -->
        <app-listening-result-panel
          [assessment]="assessment()!"
          [result]="savedResult()!"
          [grading]="gradingResult()!"
        ></app-listening-result-panel>

        <!-- Transcript -->
        @if (assessment()!.postSubmissionReview.showTranscript && assessment()!.audioSettings.showTranscriptAfterSubmit && assessment()!.transcript) {
          <app-listening-transcript-panel
            [transcript]="assessment()!.transcript!"
          ></app-listening-transcript-panel>
        }

        <!-- Error reflection -->
        @if (phase() === 'reflection' && assessment()!.errorLogRequired && gradingResult()!.incorrectCount > 0) {
          <app-listening-error-reflection
            [questions]="assessment()!.questions"
            [grading]="gradingResult()!"
            [errorCategories]="assessment()!.errorCategories"
            [showCorrectAnswers]="assessment()!.postSubmissionReview.showCorrectAnswers"
            (logSaved)="onErrorLogSaved($event)"
          ></app-listening-error-reflection>
        }

        <!-- Done state: navigation -->
        @if (phase() === 'done' || (phase() === 'results' && (!assessment()!.errorLogRequired || gradingResult()!.incorrectCount === 0))) {
          <div class="done-card">
            @if (assessment()!.errorLogRequired && gradingResult()!.incorrectCount > 0 && phase() === 'results') {
              <button type="button" class="btn-reflect" (click)="goToReflection()">🔍 Complete Error Reflection</button>
            }
            <div class="done-actions">
              <a routerLink="/learner/courses" class="btn-secondary">Back to Courses</a>
              @if (savedResult()!.passed) {
                <a [routerLink]="['/learner/courses', courseId()]" class="btn-primary">Continue Course →</a>
              } @else {
                <button type="button" class="btn-primary" (click)="retryTest()">Try Again</button>
              }
            </div>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    .runner-wrap { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem; display: grid; gap: 1.25rem; }

    /* States */
    .state-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; min-height: 240px; background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 2rem; text-align: center; }
    .state-card--error { border-color: #fca5a5; }
    .state-card--loading { color: #5f7f9f; }
    .error-icon { font-size: 3rem; }
    .state-card h2 { margin: 0; color: #0f3659; }
    .state-card p { margin: 0; color: #5f7f9f; }
    .spinner { width: 2.5rem; height: 2.5rem; border: 3px solid #d9e5f2; border-top-color: #1a74c8; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Badges */
    .badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
    .badge--test { background: #e8f0fb; color: #1a74c8; }
    .badge--practice { background: #e0f2fe; color: #0284c7; }
    .badge--mock { background: #ede9fe; color: #7c3aed; }
    .badge--lang { background: #f0fdf4; color: #16a34a; }
    .badge--pass { background: #dcfce7; color: #16a34a; }
    .badge--fail { background: #fee2e2; color: #dc2626; }

    /* Pre-start */
    .prestart-wrap { display: grid; gap: 1.1rem; }
    .test-header { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.4rem 1.5rem; display: grid; gap: 0.6rem; }
    .header-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .test-header h1 { margin: 0; color: #0f3659; font-size: 1.4rem; }
    .test-description { margin: 0; color: #5f7f9f; font-size: 0.9rem; line-height: 1.6; }
    .scenario-block { background: #f4f9ff; border-left: 3px solid #1a74c8; padding: 0.65rem 0.85rem; border-radius: 0 0.5rem 0.5rem 0; }
    .scenario-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #1a74c8; display: block; margin-bottom: 0.2rem; }
    .scenario-block p { margin: 0; color: #1e3a5a; font-size: 0.88rem; }
    .context-pill { display: inline-block; padding: 0.25rem 0.7rem; background: #fef3c7; color: #92400e; border-radius: 999px; font-size: 0.78rem; font-weight: 600; }

    .rules-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.2rem 1.4rem; display: grid; gap: 0.9rem; }
    .rules-card h3 { margin: 0; color: #0f3659; font-size: 0.97rem; }
    .rules-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .rule-item { display: flex; align-items: center; gap: 0.6rem; background: #f8fbff; border: 1px solid #e8f0fb; border-radius: 0.65rem; padding: 0.65rem 0.75rem; }
    .rule-icon { font-size: 1.3rem; flex-shrink: 0; }
    .rule-item strong { display: block; color: #0f3659; font-size: 0.9rem; }
    .rule-item small { display: block; color: #7fa3c8; font-size: 0.72rem; }

    .instructions-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .instructions-card h3 { margin: 0 0 0.75rem; color: #0f3659; font-size: 0.97rem; }
    .instructions-list { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.35rem; }
    .instructions-list li { color: #1e3a5a; font-size: 0.9rem; line-height: 1.6; }

    .btn-start { padding: 0.75rem 2rem; border: none; border-radius: 0.75rem; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; font-weight: 800; font-size: 1rem; cursor: pointer; align-self: flex-start; }
    .btn-start:hover { opacity: 0.9; }

    /* Active */
    .active-wrap { display: grid; gap: 1rem; }
    .active-header { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 1px solid #d9e5f2; border-radius: 0.85rem; padding: 0.75rem 1rem; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
    .active-title { display: flex; align-items: center; gap: 0.5rem; flex: 1; }
    .active-title strong { color: #0f3659; font-size: 0.92rem; }
    .answered-indicator { color: #5f7f9f; font-size: 0.83rem; font-weight: 600; white-space: nowrap; }
    .audio-section { background: #fff; border-radius: 0.85rem; overflow: hidden; }
    .questions-section { display: grid; gap: 0.85rem; }

    /* Confirm */
    .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .confirm-modal { background: #fff; border-radius: 1rem; padding: 1.8rem; max-width: 440px; width: 90%; display: grid; gap: 1rem; }
    .confirm-modal h3 { margin: 0; color: #0f3659; font-size: 1.1rem; }
    .confirm-warn { margin: 0; color: #ea580c; font-size: 0.88rem; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 0.55rem; padding: 0.6rem 0.8rem; }
    .confirm-msg { margin: 0; color: #5f7f9f; font-size: 0.88rem; }
    .confirm-actions { display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; }

    .submit-bar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.1rem; background: #fff; border: 1px solid #d9e5f2; border-radius: 0.85rem; }
    .submit-hint { margin: 0; color: #5f7f9f; font-size: 0.85rem; }

    /* Results */
    .results-header { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.2rem 1.4rem; display: grid; gap: 0.5rem; }
    .rh-badges { display: flex; gap: 0.4rem; }
    .results-header h2 { margin: 0; color: #0f3659; font-size: 1.3rem; }

    .done-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.2rem 1.4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .done-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

    /* Buttons */
    .btn-primary { padding: 0.6rem 1.3rem; border: none; border-radius: 0.65rem; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-secondary { padding: 0.55rem 1.1rem; border: 1.5px solid #c8dff7; border-radius: 0.65rem; background: #fff; color: #1a74c8; font-weight: 600; font-size: 0.88rem; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-submit { padding: 0.6rem 1.3rem; border: none; border-radius: 0.65rem; background: linear-gradient(135deg, #065f46, #16a34a); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-submit-bar { padding: 0.6rem 1.3rem; border: none; border-radius: 0.65rem; background: linear-gradient(135deg, #065f46, #16a34a); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-reflect { padding: 0.55rem 1.1rem; border: 1.5px solid #f59e0b; border-radius: 0.65rem; background: #fffbeb; color: #92400e; font-weight: 700; font-size: 0.88rem; cursor: pointer; }

    @media (max-width: 680px) {
      .rules-grid { grid-template-columns: 1fr 1fr; }
      .active-header { flex-wrap: wrap; }
    }
    @media (max-width: 480px) {
      .rules-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ListeningTestRunnerPage implements OnInit {
  @ViewChild('timerRef') timerRef?: ListeningTimerComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private testSvc = inject(ListeningTestService);
  private gradingSvc = inject(ListeningGradingService);

  readonly TARGET_TEST_LABELS = TARGET_TEST_LABELS;

  // State
  readonly phase = signal<RunnerPhase>('loading');
  readonly errorMsg = signal('');
  readonly assessment = signal<ListeningTestAssessment | null>(null);
  readonly answers = signal<Map<string, ListeningAnswer>>(new Map());
  readonly audioPlayCount = signal(0);
  readonly durationUsedSeconds = signal(0);
  readonly gradingResult = signal<GradingResult | null>(null);
  readonly savedResult = signal<import('../models/listening-test.models').ListeningTestResult | null>(null);
  readonly savedResultId = signal('');

  // Route params
  readonly assessmentId = signal('');
  readonly courseId = signal('');
  readonly moduleId = signal('');
  readonly lessonId = signal('');

  private startedAt!: Date;

  readonly answeredCount = computed(() => this.answers().size);
  readonly unansweredCount = computed(() =>
    (this.assessment()?.questions.length ?? 0) - this.answeredCount()
  );

  async ngOnInit(): Promise<void> {
    this.assessmentId.set(this.route.snapshot.paramMap.get('assessmentId') ?? '');
    this.courseId.set(this.route.snapshot.paramMap.get('courseId') ?? '');
    this.moduleId.set(this.route.snapshot.paramMap.get('moduleId') ?? '');
    this.lessonId.set(this.route.snapshot.paramMap.get('lessonId') ?? '');

    if (!this.assessmentId()) {
      this.errorMsg.set('Missing assessment ID in the URL.');
      this.phase.set('error');
      return;
    }

    try {
      const a = await this.testSvc.getAssessment(this.assessmentId());
      if (!a || a.status === 'ARCHIVED') {
        this.errorMsg.set('This listening test is not available.');
        this.phase.set('error');
        return;
      }
      this.assessment.set(a);
      this.phase.set('prestart');
    } catch (e) {
      console.error(e);
      this.errorMsg.set('Failed to load the listening test. Please try again.');
      this.phase.set('error');
    }
  }

  startTest(): void {
    this.startedAt = new Date();
    this.phase.set('active');
  }

  onAnswerChange(answer: ListeningAnswer): void {
    const m = new Map(this.answers());
    m.set(answer.questionId, answer);
    this.answers.set(m);
  }

  onTick(seconds: number): void {
    this.durationUsedSeconds.set(seconds);
  }

  onTimesUp(secondsUsed: number): void {
    this.durationUsedSeconds.set(secondsUsed);
    this.submitAnswers();
  }

  confirmSubmit(): void {
    this.phase.set('confirming');
  }

  cancelConfirm(): void {
    this.phase.set('active');
  }

  async submitAnswers(): Promise<void> {
    this.timerRef?.stopTimer();
    this.phase.set('submitting');

    const a = this.assessment();
    if (!a) return;

    const answerList = [...this.answers().values()];
    const grading = this.gradingSvc.grade(a.questions, answerList, a.passingScore);
    this.gradingResult.set(grading);

    const user = this.auth.currentUser;
    const learnerId = user?.uid ?? 'anonymous';

    const now = new Date();
    const resultPayload = {
      learnerId,
      courseId: this.courseId(),
      moduleId: this.moduleId(),
      lessonId: this.lessonId(),
      assessmentId: this.assessmentId(),
      targetTest: a.targetTest,
      mode: a.mode,
      title: a.title,
      score: grading.score,
      maxScore: grading.maxScore,
      percentage: grading.percentage,
      passed: grading.passed,
      answers: grading.answers,
      audioPlayCount: this.audioPlayCount(),
      durationUsedSeconds: this.durationUsedSeconds(),
      errorLogCompleted: false,
      startedAt: Timestamp.fromDate(this.startedAt),
      submittedAt: Timestamp.fromDate(now),
    };

    try {
      const resultId = await this.testSvc.submitResult(resultPayload);
      this.savedResultId.set(resultId);
      this.savedResult.set({ id: resultId, ...resultPayload } as unknown as import('../models/listening-test.models').ListeningTestResult);
      this.phase.set('results');
    } catch (e) {
      console.error('[ListeningRunner] submitResult failed:', e);
      // Still show results even if save fails
      this.savedResult.set({ id: 'unsaved', ...resultPayload } as unknown as import('../models/listening-test.models').ListeningTestResult);
      this.phase.set('results');
    }
  }

  goToReflection(): void {
    this.phase.set('reflection');
  }

  async onErrorLogSaved(log: ListeningErrorReflection[]): Promise<void> {
    const rid = this.savedResultId();
    if (rid && rid !== 'unsaved') {
      try {
        await this.testSvc.updateErrorLog(
          rid,
          log,
          this.auth.currentUser?.uid ?? '',
          this.assessmentId()
        );
      } catch (e) {
        console.error('[ListeningRunner] updateErrorLog failed:', e);
      }
    }
    this.phase.set('done');
  }

  retryTest(): void {
    this.answers.set(new Map());
    this.audioPlayCount.set(0);
    this.durationUsedSeconds.set(0);
    this.gradingResult.set(null);
    this.savedResult.set(null);
    this.savedResultId.set('');
    this.phase.set('prestart');
  }
}
