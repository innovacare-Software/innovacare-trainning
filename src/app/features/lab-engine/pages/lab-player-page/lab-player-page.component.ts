import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LabDefinitionService } from '../../services/lab-definition.service';
import { LabSessionService } from '../../services/lab-session.service';
import { LabWorkspaceService } from '../../services/lab-workspace.service';
import { LabStorageService } from '../../services/lab-storage.service';
import { LabValidatorService } from '../../services/lab-validator.service';
import { LabAiCoachService } from '../../services/lab-ai-coach.service';
import { AuthService } from '../../../../core/auth';

import { LabHeaderComponent } from '../../components/lab-header/lab-header.component';
import { LabInstructionsPanelComponent } from '../../components/lab-instructions-panel/lab-instructions-panel.component';
import { LabCodeEditorComponent } from '../../components/lab-code-editor/lab-code-editor.component';
import { LabPreviewPanelComponent } from '../../components/lab-preview-panel/lab-preview-panel.component';
import { LabValidationPanelComponent } from '../../components/lab-validation-panel/lab-validation-panel.component';
import { LabAiCoachPanelComponent } from '../../components/lab-ai-coach-panel/lab-ai-coach-panel.component';

import { LabDefinition, LabTask, LabFileDefinition } from '../../models/lab-definition.model';
import { LabSession, ValidationResult } from '../../models/lab-session.model';

type RightPanel = 'preview' | 'validation' | 'coach';

@Component({
  selector: 'app-lab-player-page',
  imports: [
    CommonModule,
    LabHeaderComponent,
    LabInstructionsPanelComponent,
    LabCodeEditorComponent,
    LabPreviewPanelComponent,
    LabValidationPanelComponent,
    LabAiCoachPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-player" [class.lab-player--loading]="isLoading()">
      <!-- Loading Overlay -->
      @if (isLoading()) {
        <div class="loading-overlay">
          <div class="loading-card">
            <div class="loading-spinner"></div>
            <h3>Loading Lab Environment</h3>
            <p>{{ loadingMessage() }}</p>
            <div class="loading-steps">
              <div class="loading-step" [class.loading-step--done]="loadStage() >= 1">
                ✓ Loading lab definition
              </div>
              <div class="loading-step" [class.loading-step--done]="loadStage() >= 2">
                ✓ Initializing session
              </div>
              <div class="loading-step" [class.loading-step--done]="loadStage() >= 3">
                ✓ Loading workspace files
              </div>
            </div>
          </div>
        </div>
      }

      <!-- C-8 Error States: Lab not found -->
      @if (!isLoading() && labNotFound()) {
        <div class="error-state">
          <div class="error-state__icon">🔍</div>
          <h2>Lab Not Found</h2>
          <p>The lab you requested does not exist or has not been published yet.</p>
          <button class="error-state__btn" (click)="router.navigate([backToLabsUrl()])" id="btn-back-to-catalog">
            ← Back to Labs
          </button>
        </div>
      }

      <!-- C-8 Error States: Session unavailable -->
      @if (!isLoading() && sessionUnavailable()) {
        <div class="error-state">
          <div class="error-state__icon">🔒</div>
          <h2>Session Unavailable</h2>
          <p>This session could not be loaded. It may not exist or may belong to another user.</p>
          <button class="error-state__btn" (click)="router.navigate([backToLabsUrl()])" id="btn-back-from-session">
            ← Back to Labs
          </button>
        </div>
      }

      <!-- C-8 Error States: Empty task list (seed not run) -->
      @if (!isLoading() && emptyTaskList()) {
        <div class="error-state">
          <div class="error-state__icon">📋</div>
          <h2>Lab Not Ready</h2>
          <p>This lab has no tasks configured yet. Please run the seed script to initialize lab content.</p>
          <p class="error-state__hint"><code>node scripts/seed-labs.mjs</code></p>
          <button class="error-state__btn" (click)="router.navigate([backToLabsUrl()])" id="btn-back-from-empty">
            ← Back to Labs
          </button>
        </div>
      }

      @if (!isLoading()) {
        <!-- Top Header -->
        <app-lab-header
          [lab]="lab()"
          [session]="session()"
          [backUrl]="backToLabsUrl()"
          (onSave)="saveAll()"
          (onValidate)="validateLab()"
          [isSubmitting]="isSubmitting()"
          (onSubmit)="submitLab()">
        </app-lab-header>

        <!-- 4-Panel IDE Layout -->
        <div class="ide-layout">

          <!-- Panel 1: Instructions + Task Stepper -->
          <aside class="ide-panel ide-panel--instructions" [class.ide-panel--collapsed]="instructionsCollapsed()">
            <button class="panel-collapse-btn" (click)="toggleInstructions()" [title]="instructionsCollapsed() ? 'Expand' : 'Collapse'">
              {{ instructionsCollapsed() ? '▶' : '◀' }}
            </button>
            @if (!instructionsCollapsed()) {
              <app-lab-instructions-panel
                [lab]="lab()"
                [tasks]="tasks()"
                [activeTaskId]="activeTaskId()"
                [passedTaskIds]="passedTaskIds()"
                (onTaskSelect)="selectTask($event)">
              </app-lab-instructions-panel>
            }
          </aside>

          <!-- Panel 2: Code Editor -->
          <div class="ide-panel ide-panel--editor">
            <app-lab-code-editor
              [sessionId]="sessionId()"
              [files]="workspace.files()">
            </app-lab-code-editor>
          </div>

          <!-- Panel 3: Right Side (Preview / Validation / Coach) -->
          <div class="ide-panel ide-panel--right">
            <!-- Right Panel Tab Bar -->
            <div class="right-tabs">
              <button class="right-tab" [class.right-tab--active]="activeRightPanel() === 'preview'"
                (click)="setRightPanel('preview')" id="rtab-preview">
                🌐 Preview
              </button>
              <button class="right-tab" [class.right-tab--active]="activeRightPanel() === 'validation'"
                (click)="setRightPanel('validation')" id="rtab-validate">
                ✓ Validate
                @if (validationResults().length > 0) {
                  <span class="result-badge" [class.result-badge--pass]="validationPassed()">
                    {{ validationScore() }}/{{ validationMaxScore() }}
                  </span>
                }
              </button>
              <button class="right-tab" [class.right-tab--active]="activeRightPanel() === 'coach'"
                (click)="setRightPanel('coach')" id="rtab-coach">
                🤖 AI Coach
                @if (aiCoach.requestCount() > 0) {
                  <span class="result-badge">{{ aiCoach.requestCount() }}</span>
                }
              </button>
            </div>

            <!-- Right Panel Content -->
            <div class="right-panel-content">
              @switch (activeRightPanel()) {
                @case ('preview') {
                  <app-lab-preview-panel
                    [lab]="lab()"
                    [files]="workspace.files()">
                  </app-lab-preview-panel>
                }
                @case ('validation') {
                  <app-lab-validation-panel
                    [results]="validationResults()"
                    [isRunning]="isValidating()"
                    [score]="validationScore()"
                    [maxScore]="validationMaxScore()">
                  </app-lab-validation-panel>
                }
                @case ('coach') {
                  <app-lab-ai-coach-panel
                    [labId]="labId()"
                    [sessionId]="sessionId()"
                    [filePath]="workspace.activeFile()?.path ?? null">
                  </app-lab-ai-coach-panel>
                }
              }
            </div>
          </div>
        </div>

        <!-- Submit Success Toast -->
        @if (submitSuccess()) {
          <div class="toast toast--success">
            🎉 Lab submitted! Check your XP and feedback in the learner dashboard.
          </div>
        }

        <!-- Error Toast -->
        @if (errorMessage()) {
          <div class="toast toast--error">⚠ {{ errorMessage() }}</div>
        }
      }
    </div>
  `,
  styles: [`
    /* ── Lab Player Shell ─────────────────────────────────────────────────── */
    .lab-player {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #0a0d14;
      font-family: 'Inter', system-ui, sans-serif;
      position: relative;
    }

    /* ── Error States (C-8) ──────────────────────────────────────────────── */
    .error-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0a0d14;
      color: #94a3b8;
      text-align: center;
      padding: 3rem;
      gap: 0.75rem;
    }
    .error-state__icon { font-size: 3rem; }
    .error-state h2 { color: #e2e8f0; font-size: 1.4rem; margin: 0; }
    .error-state p  { font-size: 0.9rem; color: #64748b; max-width: 400px; margin: 0; }
    .error-state__hint code {
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.2);
      color: #a5b4fc;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .error-state__btn {
      margin-top: 0.5rem;
      padding: 0.6rem 1.5rem;
      border: 1px solid rgba(99,102,241,0.4);
      background: rgba(99,102,241,0.1);
      color: #a5b4fc;
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .error-state__btn:hover { background: rgba(99,102,241,0.2); }

    /* ── Loading Overlay ──────────────────────────────────────────────────── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: #0a0d14;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }
    .loading-card {
      text-align: center;
      padding: 3rem;
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
    }
    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(99,102,241,0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-card h3 { color: #e2e8f0; margin: 0 0 0.5rem; font-size: 1.1rem; }
    .loading-card p  { color: #64748b; font-size: 0.85rem; margin: 0 0 1.5rem; }
    .loading-steps { display: flex; flex-direction: column; gap: 0.4rem; }
    .loading-step  { font-size: 0.78rem; color: #334155; }
    .loading-step--done { color: #4ade80; }

    /* ── IDE Layout ───────────────────────────────────────────────────────── */
    .ide-layout {
      display: grid;
      grid-template-columns: 280px 1fr 380px;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .ide-panel {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #21262d;
      position: relative;   /* anchor for :host { position:absolute } children */
      min-height: 0;        /* grid cell: prevent auto-expanding beyond grid row */
    }
    /* Instructions panel: let it scroll internally */
    .ide-panel--instructions {
      min-width: 40px;
      max-width: 350px;
      transition: all 0.25s ease;
      overflow: hidden;
    }
    .ide-panel--instructions.ide-panel--collapsed {
      grid-column: auto;
      min-width: 40px;
      max-width: 40px;
    }
    .ide-panel--editor { flex: 1; min-width: 0; position: relative; }
    .ide-panel--right  { border-right: none; min-width: 0; }

    .panel-collapse-btn {
      position: absolute;
      top: 50%;
      right: 0;
      transform: translateY(-50%) translateX(50%);
      width: 20px;
      height: 40px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 4px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.7rem;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel-collapse-btn:hover { color: #e2e8f0; background: #30363d; }

    /* ── Right Tabs ───────────────────────────────────────────────────────── */
    .right-tabs {
      display: flex;
      border-bottom: 1px solid #21262d;
      background: #010409;
      flex-shrink: 0;
    }
    .right-tab {
      flex: 1;
      padding: 0.6rem 0.5rem;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      border-bottom: 2px solid transparent;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
    .right-tab:hover { color: #e2e8f0; }
    .right-tab--active { color: #a5b4fc; border-bottom-color: #6366f1; }

    .result-badge {
      font-size: 0.65rem;
      font-weight: 800;
      background: rgba(245,158,11,0.15);
      color: #fbbf24;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .result-badge--pass { background: rgba(34,197,94,0.15); color: #4ade80; }

    .right-panel-content {
      flex: 1;
      min-height: 0;          /* prevent grid/flex overflow */
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;     /* anchor for :host { position:absolute } children */
    }

    /* ── Toasts ───────────────────────────────────────────────────────────── */
    .toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 0.9rem 1.5rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      z-index: 9999;
      animation: slide-in 0.3s ease;
      max-width: 400px;
    }
    @keyframes slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .toast--success { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    .toast--error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }

    /* ── Responsive ───────────────────────────────────────────────────────── */
    @media (max-width: 1024px) {
      .ide-layout { grid-template-columns: 240px 1fr 320px; }
    }
    @media (max-width: 768px) {
      .ide-layout { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
      .ide-panel--instructions { display: none; }
      .ide-panel--right { max-height: 40vh; }
    }
  `],
})
export class LabPlayerPageComponent implements OnInit, OnDestroy {
  private readonly route     = inject(ActivatedRoute);
  readonly router             = inject(Router);
  private readonly labDefSvc = inject(LabDefinitionService);
  private readonly sessionSvc= inject(LabSessionService);
  private readonly storageSvc= inject(LabStorageService);
  private readonly validator = inject(LabValidatorService);
  private readonly auth      = inject(AuthService);

  readonly workspace = inject(LabWorkspaceService);
  readonly aiCoach   = inject(LabAiCoachService);

  // ── Route Params ───────────────────────────────────────────────────────────
  readonly labId     = signal('');
  readonly sessionId = signal('');

  // ── Loaded data ────────────────────────────────────────────────────────────
  readonly lab      = signal<LabDefinition | null>(null);
  readonly tasks    = signal<LabTask[]>([]);
  readonly fileDefs = signal<LabFileDefinition[]>([]);
  readonly session  = signal<LabSession | null>(null);

  // ── UI State ───────────────────────────────────────────────────────────────
  readonly isLoading            = signal(true);
  readonly loadingMessage       = signal('Connecting to lab environment...');
  readonly loadStage            = signal(0);
  readonly instructionsCollapsed= signal(false);
  readonly activeRightPanel     = signal<RightPanel>('preview');
  readonly activeTaskId         = signal<string | null>(null);
  readonly passedTaskIds        = signal<string[]>([]);
  readonly isValidating         = signal(false);
  readonly isSubmitting         = signal(false);
  readonly validationResults    = signal<ValidationResult[]>([]);
  readonly validationScore      = signal(0);
  readonly validationMaxScore   = signal(0);
  readonly validationPassed     = signal(false);
  readonly submitSuccess        = signal(false);
  readonly errorMessage         = signal<string | null>(null);

  // ── Error States (C-8 fix) ─────────────────────────────────────────────────
  /** Set when the labId in the URL does not correspond to any Firestore document */
  readonly labNotFound          = signal(false);
  /** Set when the sessionId in the URL is missing or belongs to another user */
  readonly sessionUnavailable   = signal(false);
  /** Set when lab exists but has no tasks seeded yet */
  readonly emptyTaskList        = signal(false);

  // ── Program context ───────────────────────────────────────────────────────
  /** The programId passed via query param when navigating from a program's labs list */
  readonly programId = signal<string>('');

  /** Returns the correct 'Back to Labs' URL: program-scoped if programId is known */
  readonly backToLabsUrl = computed(() => {
    const pid = this.programId();
    return pid ? `/my-programs/${pid}/labs` : '/labs';
  });

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.params;
    const queryParams = this.route.snapshot.queryParams;
    this.labId.set(params['labId'] ?? '');
    this.sessionId.set(params['sessionId'] ?? '');
    // Capture programId from query param (set by ProgramLabsPage when starting a lab)
    const pid = queryParams['programId'] ?? '';
    if (pid) this.programId.set(pid);

    if (!this.labId() || !this.sessionId()) {
      this.router.navigate([this.backToLabsUrl()]);
      return;
    }

    await this.initializeLab();
  }

  ngOnDestroy(): void {
    this.aiCoach.resetSession();
  }

  private async initializeLab(): Promise<void> {
    // Guard: 15-second init timeout prevents permanent loading spinner (C-8)
    const initTimeout = setTimeout(() => {
      if (this.isLoading()) {
        console.error('[LabPlayer] Init timeout after 15s');
        this.errorMessage.set('Lab environment took too long to load. Please refresh the page.');
        this.isLoading.set(false);
      }
    }, 15_000);

    try {
      this.isLoading.set(true);
      this.labNotFound.set(false);
      this.sessionUnavailable.set(false);
      this.emptyTaskList.set(false);

      // Stage 1 — Load lab definition using firstValueFrom() (no zombie subscription)
      this.loadingMessage.set('Loading lab definition...');
      const lab = await firstValueFrom(this.labDefSvc.getLab(this.labId()));

      if (!lab) {
        // Lab does not exist in Firestore — show clear error state
        this.labNotFound.set(true);
        this.isLoading.set(false);
        clearTimeout(initTimeout);
        return;
      }
      this.lab.set(lab);
      this.loadStage.set(1);

      // Load tasks and fileDefs in parallel
      const [tasks, fileDefs] = await Promise.all([
        firstValueFrom(this.labDefSvc.getTasks(this.labId())),
        firstValueFrom(this.labDefSvc.getFileDefinitions(this.labId())),
      ]);
      this.tasks.set(tasks ?? []);
      this.fileDefs.set(fileDefs ?? []);

      // Guard: empty task list means seed script hasn't run sub-collections yet
      if (!tasks || tasks.length === 0) {
        this.emptyTaskList.set(true);
        this.isLoading.set(false);
        clearTimeout(initTimeout);
        return;
      }
      this.activeTaskId.set(tasks[0].id);

      // Stage 2 — Load session
      this.loadingMessage.set('Loading your session...');
      this.loadStage.set(2);
      const session = await firstValueFrom(this.sessionSvc.getSession(this.sessionId()));

      if (!session) {
        // Session not found or belongs to another user
        this.sessionUnavailable.set(true);
        this.isLoading.set(false);
        clearTimeout(initTimeout);
        return;
      }

      // Ownership check: ensure session belongs to the current user
      const currentUid = this.auth.currentUid ?? '';
      if (session.userId !== currentUid) {
        this.sessionUnavailable.set(true);
        this.isLoading.set(false);
        clearTimeout(initTimeout);
        return;
      }
      this.session.set(session);

      // Stage 3 — Load workspace files from Storage
      this.loadingMessage.set('Loading workspace files...');
      this.loadStage.set(3);
      await this.workspace.loadSessionFiles(this.sessionId(), fileDefs ?? []);

      // Calculate maxScore from tasks
      const maxScore = tasks.reduce(
        (sum, t) => sum + t.validationRules.reduce((rs, r) => rs + r.points, 0),
        0,
      );
      this.validationMaxScore.set(maxScore);

      this.isLoading.set(false);
    } catch (err) {
      console.error('[LabPlayer] Init error', err);
      this.errorMessage.set('Failed to load lab environment. Please try again.');
      this.isLoading.set(false);
    } finally {
      clearTimeout(initTimeout);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  selectTask(taskId: string): void {
    this.activeTaskId.set(taskId);
  }

  toggleInstructions(): void {
    this.instructionsCollapsed.update((v) => !v);
  }

  setRightPanel(panel: RightPanel): void {
    this.activeRightPanel.set(panel);
  }

  async saveAll(): Promise<void> {
    await this.workspace.saveAll(this.sessionId());
    await this.sessionSvc.touchSession(this.sessionId());
  }

  async validateLab(): Promise<void> {
    this.isValidating.set(true);
    this.setRightPanel('validation');

    // Save all dirty files first
    await this.workspace.saveAll(this.sessionId());

    // Run client-side validation
    const fileContents = this.workspace.getAllFileContents();
    const { results, score, maxScore, passed } = this.validator.validateAll(this.tasks(), fileContents);

    this.validationResults.set(results);
    this.validationScore.set(score);
    this.validationMaxScore.set(maxScore);
    this.validationPassed.set(passed);

    // Persist validation run to Firestore
    const userId = this.auth.currentUid ?? '';
    await this.sessionSvc.saveValidationRun(this.sessionId(), {
      labId: this.labId(),
      sessionId: this.sessionId(),
      userId,
      createdAt: null,
      score,
      maxScore,
      passed,
      results,
    });

    // Update passed tasks based on results
    this.updatePassedTasks(results);

    // Update session progress
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    await this.sessionSvc.touchSession(this.sessionId(), {
      progressPercent: pct,
      score,
    });

    this.session.update((s) => s ? { ...s, score, progressPercent: pct } : s);
    this.isValidating.set(false);
  }

  async submitLab(): Promise<void> {
    const session = this.session();
    if (!session) return;

    // C-11 fix: idempotency guard — don't submit if already submitted/passed
    if (session.status === 'SUBMITTED' || session.status === 'PASSED') {
      this.errorMessage.set('This lab has already been submitted.');
      setTimeout(() => this.errorMessage.set(null), 4000);
      return;
    }

    // C-11 fix: disable button while submission is in progress
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    try {
      // Flush all pending autosave before submitting (Phase 5 autosave fix)
      await this.workspace.saveAll(this.sessionId());

      // Export workspace artifact
      const files = this.workspace.files().map((f) => ({ path: f.path, content: f.content }));
      const artifactPath = await this.storageSvc.exportWorkspaceAsText(this.sessionId(), files);

      // Update session signal with artifact path
      this.session.update((s) => s ? { ...s, artifactStoragePath: artifactPath } : s);

      // displayName fix: use uid as fallback (no separate profile read needed)
      const displayName = this.auth.currentUid ?? 'unknown';
      await this.sessionSvc.submitSession({ ...session, artifactStoragePath: artifactPath }, displayName);

      this.submitSuccess.set(true);
      setTimeout(() => this.submitSuccess.set(false), 5000);
    } catch (err) {
      console.error('[LabPlayer] Submit error', err);
      this.errorMessage.set('Submission failed. Please try again.');
      setTimeout(() => this.errorMessage.set(null), 4000);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private updatePassedTasks(results: ValidationResult[]): void {
    const tasks = this.tasks();
    const passed: string[] = [];

    for (const task of tasks) {
      const taskResults = results.filter((r) =>
        task.validationRules.some((rule) =>
          (rule as { file?: string }).file === r.file && rule.type === r.ruleType,
        ),
      );
      const taskPassed = taskResults.length > 0 && taskResults.every((r) => r.passed);
      if (taskPassed) passed.push(task.id);
    }

    this.passedTaskIds.set(passed);
  }
}
