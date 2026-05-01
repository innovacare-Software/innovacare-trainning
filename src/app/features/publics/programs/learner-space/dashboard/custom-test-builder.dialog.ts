import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { map, startWith, switchMap } from 'rxjs';
import {
  CustomExamPrepAvailabilityPayload,
  CreateCustomExamPrepAssessmentPayload,
  LearnerExamPrepService,
} from '../services/learner-exam-prep.service';

interface CustomTestBuilderDialogData {
  programId: string;
}

@Component({
  selector: 'app-custom-test-builder-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="ctb-shell">
      <div class="ctb-header">
        <div>
          <span class="ctb-eyebrow">Create Test</span>
          <h2>Build your own practice exam</h2>
          <p>Compose a focused test by difficulty, format, timing, and study area, then launch it in the exam-prep runner.</p>
        </div>
        <button type="button" class="ctb-close" (click)="close()" aria-label="Close">×</button>
      </div>

      <form class="ctb-form" [formGroup]="form" (ngSubmit)="submit()">
        <section class="ctb-grid ctb-grid--two">
          <label class="ctb-field ctb-field--wide">
            <span>Test title</span>
            <input type="text" formControlName="title" placeholder="Optional custom title" />
          </label>

          <label class="ctb-field">
            <span>Question count</span>
            <input type="number" min="5" max="120" formControlName="questionCount" />
          </label>

          <label class="ctb-field">
            <span>Duration (minutes)</span>
            <input type="number" min="10" max="180" formControlName="durationMinutes" />
          </label>
        </section>

        <section class="ctb-section">
          <span class="ctb-label">Mode</span>
          <div class="ctb-chip-row">
            @for (option of modeOptions; track option.value) {
              <label class="ctb-chip-option">
                <input type="radio" formControlName="deliveryPreset" [value]="option.value" />
                <span>
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
              </label>
            }
          </div>
        </section>

        <section class="ctb-grid ctb-grid--three">
          <label class="ctb-field">
            <span>Difficulty</span>
            <select formControlName="difficulty">
              @for (option of difficultyOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="ctb-field">
            <span>Question family</span>
            <select formControlName="questionFamily">
              @for (option of familyOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="ctb-field">
            <span>Question usage</span>
            <select formControlName="questionUsageFilter">
              @for (option of usageOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="ctb-field">
            <span>Subject / system</span>
            <select formControlName="courseGroupTitle">
              <option value="">All subjects</option>
              @for (option of courseGroupOptions(); track option.title) {
                <option [value]="option.title">{{ option.title }} ({{ option.count }})</option>
              }
            </select>
          </label>

          <label class="ctb-field ctb-field--wide">
            <span>Module focus</span>
            <select formControlName="moduleTitle">
              <option value="">All modules</option>
              @for (option of moduleOptions(); track option.title) {
                <option [value]="option.title">{{ option.title }} ({{ option.count }})</option>
              }
            </select>
          </label>
        </section>

        <div class="ctb-availability" [class.ctb-availability--warn]="isQuestionCountUnavailable()">
          <strong>{{ availabilityHeadline() }}</strong>
          <p>{{ availabilityDetail() }}</p>
        </div>

        <div class="ctb-summary">
          <strong>Preview</strong>
          <p>{{ summary() }}</p>
        </div>

        @if (error()) {
          <p class="ctb-error">{{ error() }}</p>
        }

        <div class="ctb-actions">
          <button type="button" class="ctb-btn ctb-btn--ghost" (click)="close()">Cancel</button>
          <button type="submit" class="ctb-btn ctb-btn--primary" [disabled]="loading() || form.invalid || isQuestionCountUnavailable()">
            {{ loading() ? 'Creating test…' : 'Create test' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        color: #122338;
      }

      .ctb-shell {
        display: grid;
        gap: 1.2rem;
        min-width: min(720px, calc(100vw - 2rem));
        padding: 0;
        max-height: calc(100vh - 4rem);
        overflow-y: auto;
        box-sizing: border-box;
      }

      .ctb-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        padding-bottom: 0.5rem;
      }

      .ctb-header h2 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f3659;
      }

      .ctb-header p {
        margin: 0.5rem 0 0;
        color: #5a7a92;
        line-height: 1.6;
        font-size: 0.9rem;
      }

      .ctb-eyebrow {
        display: inline-flex;
        margin-bottom: 0.45rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #157a8a;
      }

      .ctb-close {
        border: 0;
        background: transparent;
        color: #9ca3af;
        font-size: 1.8rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 2.4rem;
        height: 2.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .ctb-close:hover {
        background: #f3f4f6;
        color: #4b5563;
      }

      .ctb-form,
      .ctb-section {
        display: grid;
        gap: 0.9rem;
      }

      .ctb-grid {
        display: grid;
        gap: 0.9rem;
      }

      .ctb-grid--two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .ctb-grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .ctb-field {
        display: grid;
        gap: 0.4rem;
      }

      .ctb-field--wide {
        grid-column: 1 / -1;
      }

      .ctb-field span,
      .ctb-label {
        font-size: 0.82rem;
        font-weight: 700;
        color: #41566e;
      }

      .ctb-field input,
      .ctb-field select {
        min-height: 2.5rem;
        border-radius: 10px;
        border: 1.5px solid #d6e1eb;
        background: #ffffff;
        padding: 0.65rem 0.85rem;
        font: inherit;
        color: #122338;
        box-sizing: border-box;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .ctb-field input:focus,
      .ctb-field select:focus {
        outline: none;
        border-color: #25abc5;
        box-shadow: 0 0 0 3px rgba(37, 171, 197, 0.1);
      }

      .ctb-field input:hover:not(:focus),
      .ctb-field select:hover:not(:focus) {
        border-color: #bfd4e6;
      }

      .ctb-chip-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .ctb-chip-option {
        position: relative;
        display: grid;
      }

      .ctb-chip-option input {
        position: absolute;
        inset: 0;
        opacity: 0;
      }

      .ctb-chip-option span {
        display: grid;
        gap: 0.3rem;
        min-height: 5.5rem;
        padding: 1rem 0.9rem;
        border-radius: 12px;
        border: 1.5px solid #e2eaf2;
        background: #ffffff;
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .ctb-chip-option input:checked + span {
        border-color: #25abc5;
        background: #f0fbfd;
        box-shadow: 0 0 0 3px rgba(37, 171, 197, 0.15);
      }

      .ctb-chip-option:hover span:not(:has(input:checked)) {
        border-color: #d0dae6;
        background: #fafbfd;
      }

      .ctb-chip-option strong {
        font-size: 0.95rem;
        color: #0f3659;
      }

      .ctb-chip-option small {
        color: #5a7a92;
        line-height: 1.4;
        font-size: 0.8rem;
      }

      .ctb-summary {
        padding: 1rem;
        border-radius: 12px;
        background: linear-gradient(135deg, #f0fafb 0%, #f8fcfe 100%);
        border: 1px solid #d0e8f0;
      }

      .ctb-availability {
        padding: 1rem;
        border-radius: 12px;
        background: #f4faf6;
        border: 1.5px solid #cde9d4;
      }

      .ctb-availability--warn {
        background: #fef9f4;
        border-color: #f0d1ae;
      }

      .ctb-availability strong {
        color: #1a5a66;
        font-weight: 700;
      }

      .ctb-availability--warn strong {
        color: #8b4513;
      }

      .ctb-availability strong,
      .ctb-availability p,
      .ctb-summary strong,
      .ctb-summary p {
        display: block;
        margin: 0;
      }

      .ctb-availability p,
      .ctb-summary p {
        margin-top: 0.35rem;
        color: #45607a;
        line-height: 1.6;
      }

      .ctb-error {
        margin: 0;
        padding: 0.85rem;
        border-radius: 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .ctb-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .ctb-btn {
        min-height: 2.8rem;
        padding: 0 1.3rem;
        border-radius: 8px;
        border: 1px solid transparent;
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .ctb-btn--ghost {
        background: #ffffff;
        border-color: #d6e1eb;
        color: #16314d;
      }

      .ctb-btn--ghost:hover:not(:disabled) {
        background: #f8fbfd;
        border-color: #bfd4e6;
      }

      .ctb-btn--primary {
        background: linear-gradient(135deg, #17b7c4, #56d2f2);
        color: #062237;
      }

      .ctb-btn--primary:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(37, 171, 197, 0.25);
      }

      .ctb-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 760px) {
        .ctb-shell {
          min-width: 0;
        }

        .ctb-grid--two,
        .ctb-grid--three,
        .ctb-chip-row {
          grid-template-columns: 1fr;
        }

        .ctb-actions {
          flex-direction: column-reverse;
        }
      }

      :host ::ng-deep .ld-custom-test-dialog .mat-mdc-dialog-container {
        padding: 1.5rem !important;
      }

      :host ::ng-deep .ld-custom-test-dialog .mat-mdc-dialog-title {
        display: none;
      }
    `,
  ],
})
export class CustomTestBuilderDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CustomTestBuilderDialog>);
  private readonly examPrep = inject(LearnerExamPrepService);
  private readonly data = inject<CustomTestBuilderDialogData>(MAT_DIALOG_DATA);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly modeOptions = [
    { value: 'timed', label: 'Timed', description: 'Exam conditions with timer and immediate performance signal.' },
    { value: 'tutorial', label: 'Tutorial', description: 'Practice mode with freer navigation and fuller review.' },
    { value: 'cat_style', label: 'CAT-style', description: 'Tighter navigation and stricter exam behavior for pressure training.' },
  ] as const;

  readonly difficultyOptions = [
    { value: 'mixed', label: 'Mixed' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ] as const;

  readonly familyOptions = [
    { value: 'mixed', label: 'Mixed' },
    { value: 'classic', label: 'Classic' },
    { value: 'ngn', label: 'NGN' },
  ] as const;

  readonly usageOptions = [
    { value: 'all', label: 'All questions' },
    { value: 'unused', label: 'Unused' },
    { value: 'incorrect', label: 'Incorrect' },
    { value: 'marked', label: 'Marked' },
    { value: 'omitted', label: 'Omitted' },
    { value: 'correct_on_reattempt', label: 'Correct on reattempt' },
  ] as const;

  readonly form = this.fb.nonNullable.group({
    title: [''],
    questionCount: [25, [Validators.required, Validators.min(5), Validators.max(120)]],
    durationMinutes: [45, [Validators.required, Validators.min(10), Validators.max(180)]],
    difficulty: ['mixed' as const, Validators.required],
    deliveryPreset: ['timed' as const, Validators.required],
    questionFamily: ['mixed' as const, Validators.required],
    questionUsageFilter: ['all' as const, Validators.required],
    courseGroupTitle: [''],
    moduleTitle: [''],
  });

  private readonly selectedQuestionCount = toSignal(
    this.form.controls.questionCount.valueChanges.pipe(startWith(this.form.controls.questionCount.value)),
    { initialValue: this.form.controls.questionCount.value }
  );
  readonly availability = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.buildAvailabilityPayload(this.form.getRawValue())),
      switchMap((payload) => this.examPrep.getCustomAssessmentAvailability(payload))
    ),
    {
      initialValue: {
        availableQuestionCount: 0,
        totalEligibleQuestionCount: 0,
        availableCourseGroups: [],
        availableModules: [],
      },
    }
  );

  readonly courseGroupOptions = computed(() => this.availability().availableCourseGroups);
  readonly moduleOptions = computed(() => this.availability().availableModules);
  readonly isQuestionCountUnavailable = computed(
    () => this.availability().availableQuestionCount < Number(this.selectedQuestionCount() || 0)
  );
  readonly availabilityHeadline = computed(() => {
    const available = this.availability().availableQuestionCount;
    return available === 1
      ? '1 question usable with the current filters.'
      : `${available} questions are usable with the current filters.`;
  });
  readonly availabilityDetail = computed(() => {
    const availability = this.availability();
    if (!availability.availableQuestionCount) {
      return 'This combination does not currently match any published question in this program. Relax the filters or lower the requested count.';
    }

    if (this.isQuestionCountUnavailable()) {
      return `Your current count is higher than the available pool. You can build up to ${availability.availableQuestionCount} questions with these filters.`;
    }

    return `${availability.totalEligibleQuestionCount} published questions match before the final test assembly rules are applied.`;
  });

  constructor() {
    effect(() => {
      const selectedCourseGroup = String(this.form.controls.courseGroupTitle.value || '').trim();
      const availableCourseGroups = new Set(this.courseGroupOptions().map((option) => option.title));
      if (selectedCourseGroup && !availableCourseGroups.has(selectedCourseGroup)) {
        this.form.controls.courseGroupTitle.setValue('');
      }
    });

    effect(() => {
      const selectedModule = String(this.form.controls.moduleTitle.value || '').trim();
      const availableModules = new Set(this.moduleOptions().map((option) => option.title));
      if (selectedModule && !availableModules.has(selectedModule)) {
        this.form.controls.moduleTitle.setValue('');
      }
    });
  }

  readonly summary = computed(() => {
    const raw = this.form.getRawValue();
    const focus = raw.moduleTitle || raw.courseGroupTitle || 'all available subjects';
    const mode = this.modeOptions.find((option) => option.value === raw.deliveryPreset)?.label || 'Timed';
    const difficulty = this.difficultyOptions.find((option) => option.value === raw.difficulty)?.label || 'Mixed';
    const family = this.familyOptions.find((option) => option.value === raw.questionFamily)?.label || 'Mixed';
    const usage = this.usageOptions.find((option) => option.value === raw.questionUsageFilter)?.label || 'All questions';
    const available = this.availability().availableQuestionCount;
    return `${mode} test with ${raw.questionCount} questions over ${raw.durationMinutes} minutes, focused on ${focus}, ${difficulty.toLowerCase()} difficulty, ${family.toLowerCase()} format, filtered to ${usage.toLowerCase()}. ${available} usable questions are currently available in this program.`;
  });

  private buildAvailabilityPayload(raw: {
    title: string;
    questionCount: number;
    durationMinutes: number;
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
    deliveryPreset: 'timed' | 'tutorial' | 'cat_style';
    questionFamily: 'mixed' | 'classic' | 'ngn';
    questionUsageFilter: 'all' | 'unused' | 'incorrect' | 'marked' | 'omitted' | 'correct_on_reattempt';
    courseGroupTitle: string;
    moduleTitle: string;
  }): CustomExamPrepAvailabilityPayload {
    return {
      programSpaceId: this.data.programId,
      difficulty: raw.difficulty,
      questionFamily: raw.questionFamily,
      questionUsageFilter: raw.questionUsageFilter,
      courseGroupTitle: raw.courseGroupTitle || undefined,
      moduleTitle: raw.moduleTitle || undefined,
    };
  }

  close(): void {
    this.dialogRef.close();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const raw = this.form.getRawValue();
      if (this.isQuestionCountUnavailable()) {
        this.error.set(`Only ${this.availability().availableQuestionCount} questions are currently usable with these filters in this program.`);
        return;
      }

      const payload: CreateCustomExamPrepAssessmentPayload = {
        title: raw.title.trim(),
        programSpaceId: this.data.programId,
        questionCount: Number(raw.questionCount),
        durationMinutes: Number(raw.durationMinutes),
        difficulty: raw.difficulty,
        deliveryPreset: raw.deliveryPreset,
        questionFamily: raw.questionFamily,
        questionUsageFilter: raw.questionUsageFilter,
        courseGroupTitle: raw.courseGroupTitle || undefined,
        moduleTitle: raw.moduleTitle || undefined,
      };

      const result = await this.examPrep.createCustomAssessment(payload);
      this.dialogRef.close(result);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to create the test right now.');
    } finally {
      this.loading.set(false);
    }
  }
}