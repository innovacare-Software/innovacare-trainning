import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramCaseStudiesAdminService } from '../services/program-case-studies-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { CaseStudyScoringMode, ContentStatus, ProgramContentModule } from '../models/content-builder.models';
import {
  CASE_STUDY_JSON_TEMPLATE,
  downloadJsonTemplateFile,
  parseCaseStudyJsonImport,
  readJsonFileText,
  type CaseStudyJsonImport,
} from '../utils/question-import.util';

@Component({
  selector: 'app-case-study-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'case-studies']" class="back-link">← Case Studies</a>
        <h1>{{ isEditMode ? 'Edit Case Study' : 'New Case Study' }}</h1>
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
            <label>Scoring Mode</label>
            <select formControlName="scoringMode">
              <option value="MANUAL">Manual</option>
              <option value="AUTO">Auto</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Case study title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field full">
            <label>Scenario *</label>
            <textarea formControlName="scenario" rows="5" placeholder="Detailed clinical or practice scenario..."></textarea>
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

        <div class="prompts-section">
          <div class="json-import-card">
            <div class="json-import-card__head">
              <div>
                <label>JSON Question Import</label>
                <p>Paste a JSON model, upload a .json file, or load the example, then import to generate the case-study prompts automatically.</p>
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
            <p class="json-import-card__hint">Supported format: an object with questions, or a direct array of prompts. Each question supports prompt, expectedKeywords, and maxScore. Ready-made samples are available in docs/question-import-examples.</p>
            <p class="json-import-card__status" *ngIf="importStatus">{{ importStatus }}</p>
            <div class="json-preview" *ngIf="pendingImport as preview">
              <div class="json-preview__head">
                <strong>Import Preview</strong>
                <span>{{ preview.questions.length }} question(s)</span>
              </div>
              <div class="json-preview__meta">
                <div><span>Title</span><strong>{{ preview.title || 'No change' }}</strong></div>
                <div><span>Scoring</span><strong>{{ preview.scoringMode || 'No change' }}</strong></div>
                <div><span>Scenario</span><strong>{{ preview.scenario || 'No change' }}</strong></div>
                <div><span>Status</span><strong>{{ preview.status || 'No change' }}</strong></div>
              </div>
              <div class="json-preview__list">
                <article class="json-preview__item" *ngFor="let question of preview.questions; let i = index">
                  <strong>Question {{ i + 1 }}</strong>
                  <p>{{ question.prompt }}</p>
                  <small>{{ question.expectedKeywords.length }} keyword(s) · max score {{ question.maxScore }}</small>
                </article>
              </div>
            </div>
          </div>

          <label>Questions / Prompts</label>
          <div class="prompts-list" formArrayName="questions">
            <div class="prompt-row prompt-row--stack" *ngFor="let ctrl of questionsArray.controls; let i = index" [formGroupName]="i">
              <input type="text" formControlName="prompt" placeholder="Question {{ i + 1 }}" />
              <input type="text" formControlName="expectedKeywordsText" placeholder="Expected keywords (comma separated, optional)" />
              <input type="number" formControlName="maxScore" min="1" placeholder="Max score" />
              <button type="button" class="btn-remove" (click)="removeQuestion(i)">✕</button>
              <div style="grid-column: 1/-1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.25rem;">
                <div>
                  <label style="font-size:0.78rem;">Explanation <span style="font-weight:400; color:#8fa5bf;">(why the correct answer is right)</span></label>
                  <textarea formControlName="explanation" rows="2" placeholder="Why the answer is correct..."></textarea>
                </div>
                <div>
                  <label style="font-size:0.78rem;">Model Answer <span style="font-weight:400; color:#8fa5bf;">(ideal response for graders)</span></label>
                  <textarea formControlName="modelAnswer" rows="2" placeholder="Model/ideal answer for graders..."></textarea>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn-add-prompt" (click)="addQuestion()">+ Add Question</button>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'case-studies']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Case Study' : 'Create Case Study') }}
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
    .prompts-section { margin-top: 1.2rem; }
    .prompts-section > label { font-size: 0.82rem; font-weight: 600; color: #4f7097; display: block; margin-bottom: 0.5rem; }
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
    .prompts-list { display: grid; gap: 0.4rem; margin-bottom: 0.5rem; }
    .prompt-row { display: flex; gap: 0.4rem; }
    .prompt-row--stack { display: grid; grid-template-columns: 1fr 1fr 120px auto; align-items: start; }
    .prompt-row input { flex: 1; }
    .btn-remove { padding: 0.4rem 0.6rem; border: none; border-radius: 0.45rem; background: #fef2f2; color: #b91c1c; cursor: pointer; font-size: 0.8rem; }
    .btn-add-prompt { padding: 0.4rem 0.9rem; border: 1px dashed #c8dff7; border-radius: 0.5rem; background: #f0f6ff; color: #1a74c8; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
})
export class CaseStudyFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly caseStudiesService = inject(ProgramCaseStudiesAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  caseStudyId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';
  importStatus = '';
  jsonImportText = '';
  pendingImport: CaseStudyJsonImport | null = null;
  modules: ProgramContentModule[] = [];

  readonly form = this.fb.group({
    moduleId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    scenario: ['', Validators.required],
    questions: this.fb.array([]),
    scoringMode: [CaseStudyScoringMode.MANUAL],
    order: [0],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  get questionsArray(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.caseStudyId = this.route.snapshot.params['caseStudyId'] ?? null;
    this.isEditMode = !!this.caseStudyId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.questionsArray.length === 0) {
      this.addQuestion();
    }

    if (this.isEditMode && this.caseStudyId) {
      this.caseStudiesService.getCaseStudyById(this.programId, this.caseStudyId).subscribe((cs) => {
        if (!cs) return;
        while (this.questionsArray.length) this.questionsArray.removeAt(0);
        const sourceQuestions: Array<{ id: string; prompt: string; expectedKeywords?: string[]; maxScore?: number; explanation?: string; modelAnswer?: string }> = cs.questions?.length
          ? cs.questions
          : (cs.prompts ?? []).map((prompt, index) => ({ id: `legacy-${index + 1}`, prompt, expectedKeywords: [], maxScore: 1 }));
        sourceQuestions.forEach((question) => this.questionsArray.push(this.createQuestionGroup(question.prompt, question.expectedKeywords?.join(', ') ?? '', question.maxScore ?? 1, question.explanation ?? '', question.modelAnswer ?? '')));
        this.form.patchValue({
          moduleId: cs.moduleId,
          title: cs.title,
          description: cs.description,
          scenario: cs.scenario,
          scoringMode: cs.scoringMode,
          order: cs.order,
          active: cs.active,
          status: cs.status,
        });
      });
    }
  }

  addQuestion(): void {
    this.questionsArray.push(this.createQuestionGroup());
  }

  onJsonInput(event: Event): void {
    this.jsonImportText = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.pendingImport = null;
    this.importStatus = '';
    this.error = '';
  }

  loadJsonTemplate(): void {
    this.jsonImportText = CASE_STUDY_JSON_TEMPLATE;
    this.pendingImport = null;
    this.importStatus = 'Example JSON model loaded. You can edit it, preview it, then apply the import.';
    this.error = '';
  }

  downloadJsonTemplate(): void {
    downloadJsonTemplateFile('case-study-template.json', CASE_STUDY_JSON_TEMPLATE);
    this.importStatus = 'Case study JSON model downloaded.';
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
      this.pendingImport = parseCaseStudyJsonImport(this.jsonImportText);
      this.importStatus = `${this.pendingImport.questions.length} question(s) ready to import.`;
      this.error = '';
    } catch (e: unknown) {
      this.pendingImport = null;
      this.importStatus = '';
      this.error = e instanceof Error ? e.message : 'Unable to preview case study JSON.';
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
        scenario: imported.scenario ?? this.form.get('scenario')?.value ?? '',
        scoringMode: imported.scoringMode ?? this.form.get('scoringMode')?.value ?? CaseStudyScoringMode.MANUAL,
        order: imported.order ?? this.form.get('order')?.value ?? 0,
        active: imported.active ?? this.form.get('active')?.value ?? true,
        status: imported.status ?? this.form.get('status')?.value ?? ContentStatus.DRAFT,
      },
      { emitEvent: false }
    );
    this.importStatus = `${imported.questions.length} question(s) imported from JSON.`;
    this.error = '';
    this.pendingImport = null;
  }

  removeQuestion(i: number): void {
    this.questionsArray.removeAt(i);
    if (this.questionsArray.length === 0) {
      this.addQuestion();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const questions = this.questionsArray.controls
        .map((group, index) => {
          const value = group.getRawValue() as { prompt?: string; expectedKeywordsText?: string; maxScore?: number; explanation?: string; modelAnswer?: string };
          const prompt = String(value.prompt || '').trim();
          const expectedKeywords = String(value.expectedKeywordsText || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          if (!prompt) return null;
          const explanation = String(value.explanation || '').trim() || undefined;
          const modelAnswer = String(value.modelAnswer || '').trim() || undefined;
          return {
            id: `q${index + 1}`,
            prompt,
            expectedKeywords,
            maxScore: Math.max(Number(value.maxScore || 1), 1),
            ...(explanation ? { explanation } : {}),
            ...(modelAnswer ? { modelAnswer } : {}),
          };
        })
        .filter((question): question is { id: string; prompt: string; expectedKeywords: string[]; maxScore: number; explanation?: string; modelAnswer?: string } => !!question);

      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        scenario: raw.scenario ?? '',
        prompts: questions.map((question) => question.prompt),
        questions,
        scoringMode: raw.scoringMode as CaseStudyScoringMode,
        order: raw.order ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.caseStudyId) {
        await this.caseStudiesService.updateCaseStudy(this.programId, this.caseStudyId, payload);
      } else {
        await this.caseStudiesService.createCaseStudy(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'case-studies']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }

  private createQuestionGroup(prompt = '', expectedKeywordsText = '', maxScore = 1, explanation = '', modelAnswer = ''): FormGroup {
    return this.fb.group({
      prompt: [prompt, Validators.required],
      expectedKeywordsText: [expectedKeywordsText],
      maxScore: [maxScore, [Validators.required, Validators.min(1)]],
      explanation: [explanation],
      modelAnswer: [modelAnswer],
    });
  }

  private replaceQuestions(questions: Array<{ prompt: string; expectedKeywords: string[]; maxScore: number; explanation?: string; modelAnswer?: string }>): void {
    while (this.questionsArray.length) {
      this.questionsArray.removeAt(0);
    }

    questions.forEach((question) => {
      this.questionsArray.push(this.createQuestionGroup(question.prompt, question.expectedKeywords.join(', '), question.maxScore, question.explanation ?? '', question.modelAnswer ?? ''));
    });

    if (this.questionsArray.length === 0) {
      this.addQuestion();
    }
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
}
