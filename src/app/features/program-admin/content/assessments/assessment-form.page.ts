import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramAssessmentsAdminService } from '../services/program-assessments-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { AssessmentType, ContentStatus, ProgramContentModule, SimulationQuestionMode } from '../models/content-builder.models';
import {
  ASSESSMENT_JSON_TEMPLATE,
  downloadJsonTemplateFile,
  parseAssessmentJsonImport,
  readJsonFileText,
  type AssessmentJsonImport,
} from '../utils/question-import.util';

@Component({
  selector: 'app-assessment-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'assessments']" class="back-link">← Assessments</a>
        <h1>{{ isEditMode ? 'Edit Assessment' : 'New Assessment' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Module *</label>
            <select formControlName="moduleId">
              <option value="">— Select Module —</option>
              <option *ngFor="let m of modules" [value]="m.id">{{ m.title }}</option>
            </select>
          </div>
          <div class="field">
            <label>Assessment Type *</label>
            <select formControlName="assessmentType">
              <option value="QUIZ">Quiz</option>
              <option value="MOCK_EXAM">Mock Exam</option>
              <option value="READINESS_TEST">Readiness Test</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Assessment title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field">
            <label>Question Count</label>
            <input type="number" formControlName="questionCount" min="0" readonly />
          </div>
          <div class="field">
            <label>Duration (minutes)</label>
            <input type="number" formControlName="durationMin" min="0" />
          </div>
          <div class="field">
            <label>Passing Score (%)</label>
            <input type="number" formControlName="passingScore" min="0" max="100" />
          </div>
          <div class="field">
            <label>Order</label>
            <input type="number" formControlName="order" min="0" />
          </div>
          <div class="field">
            <label>Status</label>
            <select formControlName="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div class="field checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" /> Active
            </label>
          </div>
        </div>

        <div class="question-section">
          <div class="json-import-card">
            <div class="json-import-card__head">
              <div>
                <label>JSON Question Import</label>
                <p>Paste a JSON model, upload a .json file, or load the example, then import to generate the question list automatically.</p>
              </div>
              <div class="json-import-card__actions">
                <button type="button" class="btn-secondary" (click)="loadJsonTemplate()">Load JSON Model</button>
                <button type="button" class="btn-secondary" (click)="downloadJsonTemplate()">Download JSON Model</button>
                <button type="button" class="btn-secondary" (click)="jsonFileInput.click()">Upload .json File</button>
                <button type="button" class="btn-secondary" (click)="previewJsonImport()">Preview Import</button>
                <button type="button" class="btn-secondary" [disabled]="!pendingImport" (click)="applyJsonImport()">Apply Import</button>
              </div>
            </div>
            <input #jsonFileInput type="file" accept=".json,application/json" class="visually-hidden" (change)="onJsonFileSelected($event)" />
            <textarea rows="12" [value]="jsonImportText" (input)="onJsonInput($event)" placeholder='{"questions":[...]}'></textarea>
            <p class="json-import-card__hint">Supported format: an object with questions, or a direct array of questions. Each question needs prompt, mode, and at least two choices. Ready-made samples are available in docs/question-import-examples.</p>
            <p class="json-import-card__status" *ngIf="importStatus">{{ importStatus }}</p>
            <div class="json-preview" *ngIf="pendingImport as preview">
              <div class="json-preview__head">
                <strong>Import Preview</strong>
                <span>{{ preview.questions.length }} question(s)</span>
              </div>
              <div class="json-preview__meta">
                <div><span>Title</span><strong>{{ preview.title || 'No change' }}</strong></div>
                <div><span>Type</span><strong>{{ preview.assessmentType || 'No change' }}</strong></div>
                <div><span>Duration</span><strong>{{ preview.durationMin ?? 'No change' }}</strong></div>
                <div><span>Passing Score</span><strong>{{ preview.passingScore ?? 'No change' }}</strong></div>
              </div>
              <div class="json-preview__list">
                <article class="json-preview__item" *ngFor="let question of preview.questions; let i = index">
                  <strong>Question {{ i + 1 }}</strong>
                  <p>{{ question.prompt }}</p>
                  <small>{{ question.mode }} · {{ question.choices.length }} choice(s) · {{ countCorrectChoices(question.choices) }} correct</small>
                </article>
              </div>
            </div>
          </div>

          <label>Questions</label>
          <div class="question-list" formArrayName="questions">
            <article class="question-card" *ngFor="let ctrl of questionsArray.controls; let i = index" [formGroupName]="i">
              <div class="question-card__head">
                <strong>Question {{ i + 1 }}</strong>
                <button type="button" class="btn-remove" (click)="removeQuestion(i)">✕</button>
              </div>

              <div class="field full">
                <label>Prompt</label>
                <textarea formControlName="prompt" rows="2" [placeholder]="'Question ' + (i + 1)"></textarea>
              </div>

              <div class="field">
                <label>Answer mode</label>
                <select formControlName="mode">
                  <option value="single">Single choice</option>
                  <option value="multi">Multiple choice</option>
                </select>
              </div>

              <div class="choice-list" formArrayName="choices">
                <div class="choice-row" *ngFor="let choice of getChoicesArray(i).controls; let j = index" [formGroupName]="j">
                  <input type="text" formControlName="text" [placeholder]="'Choice ' + (j + 1)" />
                  <label class="choice-correct">
                    <input type="checkbox" formControlName="correct" (change)="onCorrectChoiceChange(i, j)" /> Correct
                  </label>
                  <button type="button" class="btn-remove" (click)="removeChoice(i, j)">✕</button>
                </div>
              </div>

              <button type="button" class="btn-add-question" (click)="addChoice(i)">+ Add Choice</button>

              <div class="field full">
                <label>Explanation <span class="field-hint">(why the correct answer is right — shown to learner after submission)</span></label>
                <textarea formControlName="explanation" rows="3" placeholder="Explain why the correct answer is clinically correct..."></textarea>
              </div>

              <div class="field full">
                <label>Rationale <span class="field-hint">(broader clinical / NCLEX learning rationale)</span></label>
                <textarea formControlName="rationale" rows="3" placeholder="Broader clinical or NCLEX reasoning for this question..."></textarea>
              </div>

              <div class="field full">
                <label>Distractor Rationale <span class="field-hint">(JSON object keyed by choice ID — e.g. B: reason, C: reason)</span></label>
                <textarea formControlName="distractorRationaleRaw" rows="3" placeholder="e.g. B: Why B is wrong | C: Why C is wrong (JSON object keyed by choice ID)"></textarea>
              </div>
            </article>
          </div>
          <button type="button" class="btn-add-question" (click)="addQuestion()">+ Add Question</button>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'assessments']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Assessment' : 'Create Assessment') }}
          </button>
        </div>
        <p class="error-msg" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [`
    .form-page { display: grid; gap: 1rem; }
    .form-header { background: #fff; border: 1px solid #d4e2f0; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .form-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 0.82rem; font-weight: 600; color: #4f7097; }
    input, textarea, select { padding: 0.55rem 0.75rem; border: 1px solid #c8dff7; border-radius: 0.55rem; font-size: 0.9rem; color: #1e3a5a; outline: none; width: 100%; box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { border-color: #1a74c8; }
    textarea { resize: vertical; }
    .checkboxes { flex-direction: row; align-items: center; gap: 1rem; padding-top: 1.4rem; }
    .checkbox-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: #1e3a5a; cursor: pointer; }
    .question-section { margin-top: 1.2rem; }
    .question-section > label { font-size: 0.82rem; font-weight: 600; color: #4f7097; display: block; margin-bottom: 0.5rem; }
    .json-import-card { border: 1px solid #d9e5f2; border-radius: 0.8rem; padding: 1rem; background: #f8fbff; display: grid; gap: 0.75rem; margin-bottom: 1rem; }
    .json-import-card__head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap; }
    .json-import-card__head p, .json-import-card__hint, .json-import-card__status { margin: 0; color: #5f7f9f; font-size: 0.84rem; }
    .json-import-card__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .json-import-card textarea { min-height: 220px; }
    .btn-secondary { padding: 0.5rem 0.85rem; border: 1px solid #c8dff7; border-radius: 0.55rem; background: #fff; color: #1a74c8; cursor: pointer; font-size: 0.84rem; font-weight: 600; }
    .btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .json-preview { border-top: 1px solid #d9e5f2; padding-top: 0.75rem; display: grid; gap: 0.75rem; }
    .json-preview__head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; }
    .json-preview__head span, .json-preview__item small, .json-preview__meta span { color: #5f7f9f; }
    .json-preview__meta { display: grid; gap: 0.6rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .json-preview__meta div, .json-preview__item { border: 1px solid #d9e5f2; border-radius: 0.7rem; padding: 0.75rem; background: #fff; }
    .json-preview__meta strong { display: block; color: #173f68; margin-top: 0.2rem; }
    .json-preview__item p { margin: 0.25rem 0; color: #173f68; }
    .json-preview__list { display: grid; gap: 0.6rem; }
    .question-list { display: grid; gap: 1rem; }
    .question-card { border: 1px solid #d9e5f2; border-radius: 0.8rem; padding: 1rem; background: #f8fbff; display: grid; gap: 0.8rem; }
    .question-card__head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .choice-list { display: grid; gap: 0.5rem; }
    .choice-row { display: grid; grid-template-columns: 1fr auto auto; gap: 0.5rem; align-items: center; }
    .choice-correct { display: flex; align-items: center; gap: 0.35rem; white-space: nowrap; font-size: 0.82rem; color: #1e3a5a; }
    .btn-remove { padding: 0.4rem 0.6rem; border: none; border-radius: 0.45rem; background: #fef2f2; color: #b91c1c; cursor: pointer; font-size: 0.8rem; }
    .btn-add-question { margin-top: 0.5rem; padding: 0.4rem 0.9rem; border: 1px dashed #c8dff7; border-radius: 0.5rem; background: #f0f6ff; color: #1a74c8; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
})
export class AssessmentFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly assessmentsService = inject(ProgramAssessmentsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  assessmentId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';
  importStatus = '';
  jsonImportText = '';
  pendingImport: AssessmentJsonImport | null = null;
  modules: ProgramContentModule[] = [];

  readonly form = this.fb.group({
    moduleId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    assessmentType: [AssessmentType.QUIZ, Validators.required],
    passingScore: [70],
    durationMin: [60],
    questionCount: [0],
    questions: this.fb.array([]),
    order: [0],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  get questionsArray(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  getChoicesArray(questionIndex: number): FormArray {
    return this.questionsArray.at(questionIndex).get('choices') as FormArray;
  }

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.assessmentId = this.route.snapshot.params['assessmentId'] ?? null;
    this.isEditMode = !!this.assessmentId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.questionsArray.length === 0) {
      this.addQuestion();
    }

    if (this.isEditMode && this.assessmentId) {
      this.assessmentsService.getAssessmentById(this.programId, this.assessmentId).subscribe((a) => {
        if (!a) return;
        while (this.questionsArray.length) this.questionsArray.removeAt(0);
        const sourceQuestions = a.questions?.length
          ? a.questions
          : Array.from({ length: Math.max(Number(a.questionCount || 0), 1) }, (_, index) => ({
              id: `legacy-${index + 1}`,
              prompt: '',
              mode: SimulationQuestionMode.SINGLE,
              choices: [
                { id: `legacy-${index + 1}-c1`, text: '', correct: true },
                { id: `legacy-${index + 1}-c2`, text: '', correct: false },
              ],
            }));
        sourceQuestions.forEach((question) => this.questionsArray.push(this.createQuestionGroup(question)));
        this.form.patchValue({
          moduleId: a.moduleId,
          title: a.title,
          description: a.description,
          assessmentType: a.assessmentType,
          passingScore: a.passingScore,
          durationMin: a.durationMin,
          questionCount: a.questions?.length ?? a.questionCount,
          order: a.order,
          active: a.active,
          status: a.status,
        });
      });
    }
  }

  addQuestion(): void {
    this.questionsArray.push(this.createQuestionGroup());
    this.syncQuestionCount();
  }

  onJsonInput(event: Event): void {
    this.jsonImportText = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.pendingImport = null;
    this.importStatus = '';
    this.error = '';
  }

  loadJsonTemplate(): void {
    this.jsonImportText = ASSESSMENT_JSON_TEMPLATE;
    this.pendingImport = null;
    this.importStatus = 'Example JSON model loaded. You can edit it, preview it, then apply the import.';
    this.error = '';
  }

  downloadJsonTemplate(): void {
    downloadJsonTemplateFile('assessment-template.json', ASSESSMENT_JSON_TEMPLATE);
    this.importStatus = 'Assessment JSON model downloaded.';
    this.error = '';
  }

  async onJsonFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    try {
      this.jsonImportText = await readJsonFileText(file as File);
      this.pendingImport = null;
      this.importStatus = `Loaded JSON file: ${file?.name ?? 'import.json'}. Preview it before applying the import.`;
      this.error = '';
    } catch (e: unknown) {
      this.pendingImport = null;
      this.importStatus = '';
      this.error = e instanceof Error ? e.message : 'Unable to read JSON file.';
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  previewJsonImport(): void {
    try {
      this.pendingImport = parseAssessmentJsonImport(this.jsonImportText);
      this.importStatus = `${this.pendingImport.questions.length} question(s) ready to import.`;
      this.error = '';
    } catch (e: unknown) {
      this.pendingImport = null;
      this.importStatus = '';
      this.error = e instanceof Error ? e.message : 'Unable to preview assessment JSON.';
    }
  }

  applyJsonImport(): void {
    if (!this.pendingImport) {
      this.error = 'Preview the JSON import before applying it.';
      return;
    }

    const imported = this.pendingImport;
    this.replaceQuestions(imported.questions);
    this.form.patchValue(
      {
        title: imported.title ?? this.form.get('title')?.value ?? '',
        description: imported.description ?? this.form.get('description')?.value ?? '',
        assessmentType: imported.assessmentType ?? this.form.get('assessmentType')?.value ?? AssessmentType.QUIZ,
        passingScore: imported.passingScore ?? this.form.get('passingScore')?.value ?? 70,
        durationMin: imported.durationMin ?? this.form.get('durationMin')?.value ?? 60,
        order: imported.order ?? this.form.get('order')?.value ?? 0,
        active: imported.active ?? this.form.get('active')?.value ?? true,
        status: imported.status ?? this.form.get('status')?.value ?? ContentStatus.DRAFT,
      },
      { emitEvent: false }
    );
    this.syncQuestionCount();
    this.importStatus = `${imported.questions.length} question(s) imported from JSON.`;
    this.error = '';
    this.pendingImport = null;
  }

  countCorrectChoices(choices: Array<{ correct: boolean }>): number {
    return choices.filter((choice) => choice.correct).length;
  }

  addChoice(questionIndex: number): void {
    this.getChoicesArray(questionIndex).push(this.createChoiceGroup());
  }

  removeChoice(questionIndex: number, choiceIndex: number): void {
    const choices = this.getChoicesArray(questionIndex);
    choices.removeAt(choiceIndex);
    if (choices.length < 2) {
      choices.push(this.createChoiceGroup());
    }
  }

  onCorrectChoiceChange(questionIndex: number, choiceIndex: number): void {
    const questionGroup = this.questionsArray.at(questionIndex) as FormGroup;
    const mode = String(questionGroup.get('mode')?.value || SimulationQuestionMode.SINGLE);
    if (mode !== SimulationQuestionMode.SINGLE) {
      return;
    }

    const choices = this.getChoicesArray(questionIndex);
    const changed = choices.at(choiceIndex);
    if (changed.get('correct')?.value !== true) {
      return;
    }

    choices.controls.forEach((control, index) => {
      if (index !== choiceIndex) {
        control.get('correct')?.setValue(false, { emitEvent: false });
      }
    });
  }

  removeQuestion(index: number): void {
    this.questionsArray.removeAt(index);
    if (this.questionsArray.length === 0) {
      this.addQuestion();
      return;
    }
    this.syncQuestionCount();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const questions = this.questionsArray.controls
        .map((group, index) => {
          const value = group.getRawValue() as {
            prompt?: string;
            mode?: SimulationQuestionMode;
            choices?: Array<{ text?: string; correct?: boolean }>;
            explanation?: string;
            rationale?: string;
            distractorRationaleRaw?: string;
          };
          const prompt = String(value.prompt || '').trim();
          if (!prompt) return null;

          const choices = Array.isArray(value.choices)
            ? value.choices
                .map((choice, choiceIndex) => {
                  const text = String(choice.text || '').trim();
                  if (!text) return null;
                  return {
                    id: `q${index + 1}-c${choiceIndex + 1}`,
                    text,
                    correct: choice.correct === true,
                  };
                })
                .filter((choice): choice is { id: string; text: string; correct: boolean } => !!choice)
            : [];

          if (choices.length < 2 || !choices.some((choice) => choice.correct)) {
            return null;
          }

          const explanation = String(value.explanation || '').trim() || undefined;
          const rationale = String(value.rationale || '').trim() || undefined;
          let distractorRationale: Record<string, string> | undefined;
          try {
            const raw = String(value.distractorRationaleRaw || '').trim();
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                distractorRationale = parsed as Record<string, string>;
              }
            }
          } catch { /* invalid JSON — skip */ }

          return {
            id: `q${index + 1}`,
            prompt,
            mode: value.mode === SimulationQuestionMode.MULTI ? SimulationQuestionMode.MULTI : SimulationQuestionMode.SINGLE,
            choices,
            ...(explanation ? { explanation } : {}),
            ...(rationale ? { rationale } : {}),
            ...(distractorRationale ? { distractorRationale } : {}),
          };
        })
        .filter((question): question is { id: string; prompt: string; mode: SimulationQuestionMode; choices: Array<{ id: string; text: string; correct: boolean }> } => !!question);

      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        assessmentType: raw.assessmentType as AssessmentType,
        questions,
        passingScore: raw.passingScore ?? 70,
        durationMin: raw.durationMin ?? 60,
        questionCount: questions.length,
        order: raw.order ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.assessmentId) {
        await this.assessmentsService.updateAssessment(this.programId, this.assessmentId, payload);
      } else {
        await this.assessmentsService.createAssessment(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'assessments']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }

  private createQuestionGroup(question?: {
    prompt?: string;
    mode?: SimulationQuestionMode;
    choices?: Array<{ text?: string; correct?: boolean }>;
    explanation?: string;
    rationale?: string;
    distractorRationale?: Record<string, string>;
  }): FormGroup {
    const choices = this.fb.array<FormGroup>([]);
    const sourceChoices = Array.isArray(question?.choices) && question.choices.length >= 2
      ? question.choices
      : [
          { text: '', correct: true },
          { text: '', correct: false },
        ];

    sourceChoices.forEach((choice) => choices.push(this.createChoiceGroup(choice.text || '', choice.correct === true) as FormGroup));

    return this.fb.group({
      prompt: [question?.prompt || '', Validators.required],
      mode: [question?.mode || SimulationQuestionMode.SINGLE, Validators.required],
      explanation: [question?.explanation || ''],
      rationale: [question?.rationale || ''],
      distractorRationaleRaw: [
        question?.distractorRationale ? JSON.stringify(question.distractorRationale, null, 2) : '',
      ],
      choices,
    });
  }

  private createChoiceGroup(text = '', correct = false): FormGroup {
    return this.fb.group({
      text: [text, Validators.required],
      correct: [correct],
    });
  }

  private replaceQuestions(questions: Array<{ prompt: string; mode: SimulationQuestionMode; choices: Array<{ text: string; correct: boolean }>; explanation?: string; rationale?: string; distractorRationale?: Record<string, string> }>): void {
    while (this.questionsArray.length) {
      this.questionsArray.removeAt(0);
    }

    questions.forEach((question) => this.questionsArray.push(this.createQuestionGroup(question)));

    if (this.questionsArray.length === 0) {
      this.addQuestion();
      return;
    }

    this.syncQuestionCount();
  }

  private getRequiredProgramId(): string {
    const programId = this.route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim());

    if (!programId) {
      throw new Error('Missing programId in route. Open this page from a specific program.');
    }

    return programId;
  }

  private syncQuestionCount(): void {
    this.form.patchValue({ questionCount: this.questionsArray.length }, { emitEvent: false });
  }
}
