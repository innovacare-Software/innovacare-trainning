import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiContentGenerationService } from './ai-content-generation.service';
import {
  AI_ACTION_META,
  AiContentAction,
  AiContentDifficulty,
  AiContentDomain,
  AiContentLocale,
  GeneratedLessonHtml,
} from './ai-content.models';

@Component({
  selector: 'app-ai-content-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop -->
    <div class="acs-backdrop" (click)="close()" aria-hidden="true"></div>

    <!-- Drawer panel -->
    <aside class="acs-drawer" role="dialog" aria-modal="true" aria-label="AI Content Studio">

      <!-- ── Header ── -->
      <header class="acs-header">
        <div class="acs-header-identity">
          <div class="acs-header-icon" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none"><defs>
              <linearGradient id="acs-hg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#0f3659"/><stop offset="1" stop-color="#1a74c8"/>
              </linearGradient></defs>
              <rect width="36" height="36" rx="10" fill="url(#acs-hg)"/>
              <path d="M11 24l4-8 4 5 3-4 4 7H11z" fill="white" opacity=".9"/>
              <circle cx="26" cy="11" r="3.5" fill="#60e0e8"/>
            </svg>
          </div>
          <div>
            <h2 class="acs-title">AI Content Studio</h2>
            <p class="acs-subtitle">{{ currentTitle || 'Untitled lesson' }}</p>
          </div>
        </div>
        <button type="button" class="acs-close" (click)="close()" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </header>

      <!-- ── Action chips ── -->
      <div class="acs-section">
        <p class="acs-label">What do you want to do?</p>
        <div class="acs-action-grid">
          <button
            *ngFor="let entry of actionEntries"
            type="button"
            class="acs-action-chip"
            [class.acs-action-chip--active]="selectedAction() === entry.key"
            (click)="selectAction(entry.key)">
            <span class="acs-action-chip-icon">{{ entry.icon }}</span>
            <span>{{ entry.label }}</span>
          </button>
        </div>
      </div>

      <!-- ── Config row ── -->
      <div class="acs-section acs-config-row">
        <div class="acs-field">
          <label class="acs-field-label">Domain</label>
          <select class="acs-select" [ngModel]="selectedDomain()" (ngModelChange)="selectedDomain.set($event)">
            <option value="general">General</option>
            <option value="nclex">NCLEX</option>
            <option value="woundCare">Wound care</option>
            <option value="devops">DevOps / IT</option>
            <option value="english">English / Language</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>
        <div class="acs-field">
          <label class="acs-field-label">Difficulty</label>
          <select class="acs-select" [ngModel]="selectedDifficulty()" (ngModelChange)="selectedDifficulty.set($event)">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div class="acs-field">
          <label class="acs-field-label">Language</label>
          <select class="acs-select" [ngModel]="selectedLocale()" (ngModelChange)="selectedLocale.set($event)">
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>

      <!-- ── Custom prompt ── -->
      <div class="acs-section">
        <label class="acs-field-label">Additional instructions <span class="acs-optional">(optional)</span></label>
        <textarea
          class="acs-textarea"
          rows="3"
          [placeholder]="promptPlaceholder()"
          [ngModel]="customPrompt()"
          (ngModelChange)="customPrompt.set($event)"
        ></textarea>
      </div>

      <!-- ── Generate button ── -->
      <div class="acs-section acs-generate-row">
        <button
          type="button"
          class="acs-btn-generate"
          [disabled]="generating()"
          (click)="generate()">
          <span *ngIf="!generating()">
            <span aria-hidden="true">✦</span> {{ actionLabel() }}
          </span>
          <span *ngIf="generating()" class="acs-generating-label">
            <span class="acs-spin" aria-hidden="true"></span> Generating…
          </span>
        </button>
      </div>

      <!-- ── Error ── -->
      <div *ngIf="errorMsg()" class="acs-section">
        <div class="acs-error" role="alert">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 6v4M10 13.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          {{ errorMsg() }}
        </div>
      </div>

      <!-- ── Result ── -->
      <ng-container *ngIf="result()">
        <!-- Validation warnings -->
        <div *ngIf="result()!.validationWarnings?.length" class="acs-section">
          <div
            *ngFor="let w of result()!.validationWarnings"
            class="acs-warning">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M9.07 3.5l-6.6 11.44A1 1 0 003.34 17h13.32a1 1 0 00.87-1.5L11 3.5a1 1 0 00-1.74-.01z"
                stroke="currentColor" stroke-width="1.4"/>
              <path d="M10 8v4M10 13.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ w }}
          </div>
        </div>

        <!-- Generated title / description (if returned) -->
        <div *ngIf="result()!.title || result()!.description" class="acs-section acs-meta-result">
          <div *ngIf="result()!.title" class="acs-meta-row">
            <span class="acs-meta-key">Title</span>
            <span class="acs-meta-val">{{ result()!.title }}</span>
          </div>
          <div *ngIf="result()!.description" class="acs-meta-row">
            <span class="acs-meta-key">Description</span>
            <span class="acs-meta-val">{{ result()!.description }}</span>
          </div>
        </div>

        <!-- Learning objectives -->
        <div *ngIf="result()!.objectives?.length" class="acs-section">
          <p class="acs-label">Learning objectives</p>
          <ul class="acs-objectives">
            <li *ngFor="let o of result()!.objectives">{{ o }}</li>
          </ul>
        </div>

        <!-- Quiz questions -->
        <div *ngIf="result()!.quizQuestions?.length" class="acs-section">
          <p class="acs-label">Quiz questions ({{ result()!.quizQuestions!.length }})</p>
          <div *ngFor="let q of result()!.quizQuestions; let qi = index" class="acs-quiz-item">
            <p class="acs-quiz-q"><strong>Q{{ qi + 1 }}.</strong> {{ q.question }}</p>
            <ul class="acs-quiz-options">
              <li
                *ngFor="let opt of q.options; let oi = index"
                [class.acs-correct]="oi === q.correctAnswerIndex">
                {{ optionLetter(oi) }}. {{ opt }}
              </li>
            </ul>
            <p class="acs-quiz-rationale">
              <em>Rationale:</em> {{ q.rationale }}
            </p>
          </div>
        </div>

        <!-- HTML preview -->
        <div class="acs-section">
          <div class="acs-preview-header">
            <p class="acs-label">HTML preview</p>
            <div class="acs-preview-tabs">
              <button
                type="button"
                class="acs-tab"
                [class.acs-tab--active]="previewTab() === 'rendered'"
                (click)="previewTab.set('rendered')">Rendered</button>
              <button
                type="button"
                class="acs-tab"
                [class.acs-tab--active]="previewTab() === 'source'"
                (click)="previewTab.set('source')">Source</button>
            </div>
          </div>

          <div *ngIf="previewTab() === 'rendered'" class="acs-preview-rendered">
            <div [innerHTML]="safePreviewHtml()"></div>
          </div>
          <pre *ngIf="previewTab() === 'source'" class="acs-preview-source">{{ result()!.html }}</pre>
        </div>

        <!-- Insert button -->
        <div class="acs-section acs-insert-row">
          <button type="button" class="acs-btn-insert" (click)="insertIntoLesson()">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Insert into Lesson
          </button>
          <button type="button" class="acs-btn-regenerate" (click)="generate()">Regenerate</button>
        </div>
      </ng-container>

    </aside>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      pointer-events: auto;
    }

    /* ── Backdrop ── */
    .acs-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 25, 40, 0.42);
      backdrop-filter: blur(3px);
      animation: acs-fade-in 0.22s ease;
    }
    @keyframes acs-fade-in { from { opacity: 0; } to { opacity: 1; } }

    /* ── Drawer ── */
    .acs-drawer {
      position: relative;
      z-index: 1;
      width: min(600px, 100vw);
      height: 100%;
      background: #fff;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      box-shadow: -12px 0 48px rgba(15, 54, 89, 0.14);
      animation: acs-slide-in 0.28s cubic-bezier(.22,.68,0,1.2);
      scrollbar-width: thin;
    }
    .acs-drawer::-webkit-scrollbar { width: 5px; }
    .acs-drawer::-webkit-scrollbar-thumb { background: rgba(11,45,87,0.12); border-radius: 99px; }
    @keyframes acs-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }

    /* ── Header ── */
    .acs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 22px;
      background: linear-gradient(135deg, #0f3659 0%, #1a74c8 100%);
      flex-shrink: 0;
    }
    .acs-header-identity { display: flex; align-items: center; gap: 14px; }
    .acs-header-icon svg { width: 36px; height: 36px; display: block; }
    .acs-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #fff; }
    .acs-subtitle { margin: 2px 0 0; font-size: 0.75rem; color: rgba(255,255,255,.65); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
    .acs-close {
      background: rgba(255,255,255,0.12); border: none; width: 34px; height: 34px; border-radius: 9px;
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 0.15s;
    }
    .acs-close:hover { background: rgba(255,255,255,0.22); }
    .acs-close svg { width: 16px; height: 16px; }

    /* ── Sections ── */
    .acs-section { padding: 16px 22px; border-bottom: 1px solid #eef2f9; }
    .acs-section:last-child { border-bottom: none; }

    /* ── Labels ── */
    .acs-label { margin: 0 0 10px; font-size: 0.78rem; font-weight: 700; color: #3f6891; text-transform: uppercase; letter-spacing: 0.05em; }
    .acs-field-label { font-size: 0.78rem; font-weight: 600; color: #4f7097; display: block; margin-bottom: 5px; }
    .acs-optional { font-weight: 400; opacity: .6; }

    /* ── Action chips ── */
    .acs-action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .acs-action-chip {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      padding: 10px 12px; border-radius: 11px; border: 1.5px solid #dce8f8;
      background: #f5f9ff; font-size: 0.78rem; font-weight: 600; color: #2d5a8a; cursor: pointer;
      transition: all 0.15s;
    }
    .acs-action-chip:hover { border-color: #1a74c8; background: #eef6ff; }
    .acs-action-chip--active { border-color: #1a74c8 !important; background: linear-gradient(135deg, #0f3659, #1a74c8) !important; color: #fff !important; box-shadow: 0 4px 14px rgba(26,116,200,.3); }
    .acs-action-chip-icon { font-size: 1rem; }

    /* ── Config row ── */
    .acs-config-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .acs-field { display: flex; flex-direction: column; }
    .acs-select {
      padding: 7px 10px; border: 1px solid #c8dff7; border-radius: 8px;
      font-size: 0.84rem; color: #1e3a5a; outline: none; background: #fff; cursor: pointer;
    }
    .acs-select:focus { border-color: #1a74c8; }

    /* ── Textarea ── */
    .acs-textarea {
      width: 100%; padding: 9px 12px; border: 1px solid #c8dff7; border-radius: 9px;
      font-size: 0.87rem; color: #1e3a5a; outline: none; resize: vertical; font-family: inherit; box-sizing: border-box;
    }
    .acs-textarea:focus { border-color: #1a74c8; }

    /* ── Generate button ── */
    .acs-generate-row { border-bottom: none; }
    .acs-btn-generate {
      width: 100%; padding: 13px; border: none; border-radius: 12px; cursor: pointer;
      background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff;
      font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.15s, transform 0.15s;
      box-shadow: 0 5px 18px rgba(26,116,200,.32);
    }
    .acs-btn-generate:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
    .acs-btn-generate:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .acs-generating-label { display: flex; align-items: center; gap: 8px; }
    .acs-spin {
      display: block; width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%;
      animation: acs-spin 0.65s linear infinite;
    }
    @keyframes acs-spin { to { transform: rotate(360deg); } }

    /* ── Error ── */
    .acs-error {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 9px;
      padding: 10px 14px; font-size: 0.85rem;
    }
    .acs-error svg { width: 16px; height: 16px; flex-shrink: 0; }

    /* ── Warning ── */
    .acs-warning {
      display: flex; align-items: flex-start; gap: 8px;
      background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 9px;
      padding: 10px 14px; font-size: 0.83rem; margin-bottom: 8px;
    }
    .acs-warning:last-child { margin-bottom: 0; }
    .acs-warning svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }

    /* ── Meta result ── */
    .acs-meta-result { background: #f8fbff; border-radius: 9px; padding: 12px 14px !important; }
    .acs-meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .acs-meta-row:last-child { margin-bottom: 0; }
    .acs-meta-key { font-size: 0.75rem; font-weight: 700; color: #4f7097; min-width: 80px; }
    .acs-meta-val { font-size: 0.85rem; color: #1e3a5a; }

    /* ── Objectives ── */
    .acs-objectives { margin: 0; padding-left: 20px; }
    .acs-objectives li { font-size: 0.87rem; color: #1e3a5a; margin-bottom: 5px; line-height: 1.5; }

    /* ── Quiz ── */
    .acs-quiz-item {
      background: #f5f9ff; border: 1px solid #d6e7f9; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 10px;
    }
    .acs-quiz-item:last-child { margin-bottom: 0; }
    .acs-quiz-q { margin: 0 0 8px; font-size: 0.88rem; color: #1e3a5a; }
    .acs-quiz-options { margin: 0 0 8px; padding-left: 20px; }
    .acs-quiz-options li { font-size: 0.84rem; color: #3a5f7d; margin-bottom: 3px; }
    .acs-quiz-options li.acs-correct { font-weight: 700; color: #15803d; }
    .acs-quiz-rationale { margin: 0; font-size: 0.8rem; color: #6b8aaa; line-height: 1.5; }

    /* ── Preview ── */
    .acs-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .acs-preview-header .acs-label { margin-bottom: 0; }
    .acs-preview-tabs { display: flex; gap: 4px; }
    .acs-tab {
      padding: 4px 12px; border-radius: 7px; border: 1px solid #d6e7f9;
      background: #f5f9ff; font-size: 0.78rem; font-weight: 600; color: #4f7097; cursor: pointer;
    }
    .acs-tab--active { background: #1a74c8; color: #fff; border-color: #1a74c8; }

    .acs-preview-rendered {
      border: 1px solid #d6e7f9; border-radius: 10px; padding: 16px 18px;
      min-height: 120px; background: #fafcff;
      font-size: 0.9rem; color: #1e3a5a; line-height: 1.6;
      overflow-x: auto;
    }
    .acs-preview-source {
      background: #f1f5fb; border: 1px solid #d6e7f9; border-radius: 10px;
      padding: 14px; font-size: 0.76rem; color: #2d5a8a;
      overflow: auto; max-height: 360px; white-space: pre-wrap; word-break: break-all; margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    /* ── Insert row ── */
    .acs-insert-row { display: flex; gap: 10px; }
    .acs-btn-insert {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
      padding: 11px; border: none; border-radius: 11px; cursor: pointer;
      background: linear-gradient(135deg, #064e3b, #059669); color: #fff;
      font-size: 0.9rem; font-weight: 700;
      box-shadow: 0 4px 14px rgba(5,150,105,.28);
      transition: opacity 0.15s, transform 0.15s;
    }
    .acs-btn-insert svg { width: 17px; height: 17px; }
    .acs-btn-insert:hover { opacity: .92; transform: translateY(-1px); }
    .acs-btn-regenerate {
      padding: 11px 18px; border-radius: 11px; border: 1.5px solid #c8dff7;
      background: #fff; color: #1a74c8; font-size: 0.88rem; font-weight: 700; cursor: pointer;
      transition: background 0.15s;
    }
    .acs-btn-regenerate:hover { background: #eef6ff; }

    @media (max-width: 640px) {
      .acs-drawer { width: 100vw; }
      .acs-action-grid { grid-template-columns: repeat(2, 1fr); }
      .acs-config-row { grid-template-columns: 1fr; }
    }
  `],
})
export class AiContentStudioComponent implements OnChanges {
  /* ── Injections ── */
  private readonly gen = inject(AiContentGenerationService);
  private readonly sanitizer = inject(DomSanitizer);

  /* ── Required inputs ── */
  @Input({ required: true }) orgId!: string;
  @Input({ required: true }) programId!: string;

  /* ── Optional context inputs ── */
  @Input() moduleId = '';
  @Input() lessonId = '';
  @Input() currentTitle = '';
  @Input() currentDescription = '';
  @Input() currentContentHtml = '';
  @Input() domain: AiContentDomain = 'general';
  @Input() locale: AiContentLocale = 'en';

  /* ── Output ── */
  @Output() generatedHtmlSelected = new EventEmitter<string>();
  @Output() studioClose = new EventEmitter<void>();

  /* ── Internal state (signals) ── */
  readonly selectedAction = signal<AiContentAction>('generateLesson');
  readonly selectedDomain = signal<AiContentDomain>('general');
  readonly selectedDifficulty = signal<AiContentDifficulty>('intermediate');
  readonly selectedLocale = signal<AiContentLocale>('en');
  readonly customPrompt = signal('');
  readonly generating = signal(false);
  readonly result = signal<GeneratedLessonHtml | null>(null);
  readonly errorMsg = signal('');
  readonly previewTab = signal<'rendered' | 'source'>('rendered');

  /* ── Derived ── */
  readonly actionLabel = computed(() => AI_ACTION_META[this.selectedAction()].label);

  readonly promptPlaceholder = computed(() => {
    switch (this.selectedAction()) {
      case 'generateLesson':
        return 'e.g. Focus on clinical decision-making; include 3 case scenarios';
      case 'improveHtml':
        return 'e.g. Add a key takeaways section; simplify language for beginners';
      case 'generateQuiz':
        return 'e.g. Create 5 NCLEX-style questions focusing on priority';
      case 'translate':
        return 'e.g. Keep medical terminology as-is; adapt tone for nurses';
      case 'summarize':
        return 'e.g. Bullet-point format; max 200 words';
      case 'createObjectives':
        return 'e.g. Bloom\'s taxonomy; use action verbs; 4–6 objectives';
    }
  });

  /** Static list of action entries for the template */
  readonly actionEntries = (
    Object.entries(AI_ACTION_META) as [AiContentAction, (typeof AI_ACTION_META)[AiContentAction]][]
  ).map(([key, meta]) => ({ key, ...meta }));

  /* Sync input signals with @Input values when component opens */
  ngOnChanges(): void {
    this.selectedDomain.set(this.domain ?? 'general');
    this.selectedLocale.set(this.locale ?? 'en');
  }

  selectAction(action: AiContentAction): void {
    this.selectedAction.set(action);
    this.result.set(null);
    this.errorMsg.set('');
  }

  async generate(): Promise<void> {
    if (this.generating()) return;
    this.generating.set(true);
    this.errorMsg.set('');
    this.result.set(null);

    try {
      const action = this.selectedAction();
      let builtPrompt = this.customPrompt().trim();

      if (!builtPrompt) {
        builtPrompt = this.buildDefaultPrompt(action);
      }

      const output = await this.gen.generateLessonHtml({
        orgId: this.orgId,
        programId: this.programId,
        moduleId: this.moduleId || undefined,
        lessonId: this.lessonId || undefined,
        title: this.currentTitle,
        description: this.currentDescription,
        currentContentHtml: action === 'improveHtml' || action === 'summarize' || action === 'translate'
          ? this.currentContentHtml
          : undefined,
        prompt: builtPrompt,
        domain: this.selectedDomain(),
        difficulty: this.selectedDifficulty(),
        locale: this.selectedLocale(),
        action,
      });

      this.result.set(output);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred. Please try again.';
      this.errorMsg.set(msg);
    } finally {
      this.generating.set(false);
    }
  }

  safePreviewHtml(): SafeHtml {
    const html = this.result()?.html ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  insertIntoLesson(): void {
    const html = this.result()?.html;
    if (html) {
      this.generatedHtmlSelected.emit(html);
      this.close();
    }
  }

  close(): void {
    this.studioClose.emit();
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  private buildDefaultPrompt(action: AiContentAction): string {
    switch (action) {
      case 'generateLesson':
        return `Generate a complete, well-structured lesson on "${this.currentTitle}". ${this.currentDescription || ''}`.trim();
      case 'improveHtml':
        return 'Improve the structure, clarity, and visual organisation of the existing lesson content.';
      case 'generateQuiz':
        return `Create a 5-question multiple-choice quiz for the lesson titled "${this.currentTitle}".`;
      case 'translate':
        return `Translate the lesson content to ${this.localeLabel(this.selectedLocale())}.`;
      case 'summarize':
        return 'Write a concise summary of the key points covered in this lesson.';
      case 'createObjectives':
        return `Write 4–6 SMART learning objectives for the lesson titled "${this.currentTitle}".`;
    }
  }

  private localeLabel(locale: AiContentLocale): string {
    return { en: 'English', fr: 'French', es: 'Spanish' }[locale];
  }
}
