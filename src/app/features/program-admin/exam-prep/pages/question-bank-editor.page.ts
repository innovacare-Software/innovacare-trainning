import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import {
  EXAM_PREP_COGNITIVE_OPTIONS,
  EXAM_PREP_DIFFICULTY_OPTIONS,
  EXAM_PREP_ITEM_TYPE_OPTIONS,
  EXAM_PREP_TRACK_OPTIONS,
  EXAM_PREP_JURISDICTION_OPTIONS,
  EXAM_PREP_WORKFLOW_OPTIONS,
  buildDefaultQuestionBankItem,
  formatChoices,
  formatCommaSeparated,
  generateExamPrepId,
  lookupCourseGroupTitle,
  lookupModuleTitle,
  lookupProgramTitle,
  parseChoices,
  parseJsonOrFallback,
  prettyJson,
  slugifyExamPrep,
  splitCommaSeparated,
} from './exam-prep-admin.defaults';
import type { QuestionBankItem } from '../models/exam-prep.models';
import { BLUEPRINT_TYPES, BLUEPRINT_TYPE_LABELS, type BlueprintType } from '../models/exam-prep.models';

@Component({
  selector: 'app-question-bank-editor-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="editor">
      <header class="head">
        <div>
          <p class="eyebrow">Question Authoring</p>
          <h1>{{ itemId ? 'Edit question item' : 'Create question item' }}</h1>
          <p>Author single-choice, SATA, ordered-response, and NGN-aligned items without exposing any learner delivery concerns.</p>
        </div>
        <div class="actions">
          <a routerLink="/program-admin/exam-prep/question-bank" class="btn">Back to bank</a>
          <button type="button" class="btn primary" (click)="save()">Save item</button>
        </div>
      </header>

      <form class="panel form-grid" [formGroup]="form">
        <label>
          Blueprint type
          <select formControlName="blueprintType">
            <option *ngFor="let option of blueprintTypes" [value]="option">{{ blueprintTypeLabel(option) }}</option>
          </select>
        </label>
        <label>
          Stem
          <textarea formControlName="stem" rows="4"></textarea>
        </label>
        <label>
          Lead-in question
          <textarea formControlName="leadInQuestion" rows="3"></textarea>
        </label>
        <label>
          Scenario text
          <textarea formControlName="scenarioText" rows="3"></textarea>
        </label>
        <label>
          Explanation
          <textarea formControlName="explanation" rows="4"></textarea>
        </label>
        <label>
          Rationale
          <textarea formControlName="rationale" rows="4"></textarea>
        </label>
        <label>
          Program
          <select formControlName="programId">
            <option *ngFor="let option of programs()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>
        <label>
          Jurisdiction
          <select formControlName="jurisdiction">
            <option *ngFor="let option of jurisdictionOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Exam track
          <select formControlName="examTrack">
            <option *ngFor="let option of trackOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Course group
          <select formControlName="courseGroupId">
            <option *ngFor="let option of courseGroups()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>
        <label>
          Module
          <select formControlName="moduleId">
            <option *ngFor="let option of modules()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>
        <label>
          Item type
          <select formControlName="itemType">
            <option *ngFor="let option of itemTypeOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Difficulty
          <select formControlName="difficulty">
            <option *ngFor="let option of difficultyOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Cognitive level
          <select formControlName="cognitiveLevel">
            <option *ngFor="let option of cognitiveOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Workflow
          <select formControlName="workflowStatus">
            <option *ngFor="let option of workflowOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Parent case id
          <input formControlName="parentCaseId" />
        </label>
        <label>
          Tags
          <input formControlName="tags" placeholder="priority, delegation, ngn" />
        </label>
        <label>
          Learning objectives
          <input formControlName="learningObjectives" placeholder="Recognize unstable rhythms, Prioritize airway" />
        </label>
        <label>
          Remediation tags
          <input formControlName="remediationTags" placeholder="pharm, airway" />
        </label>
        <label>
          Remediation module ids
          <input formControlName="remediationModuleIds" placeholder="cardiovascular, respiratory" />
        </label>
        <label>
          Remediation lesson ids
          <input formControlName="remediationLessonIds" placeholder="lesson-01, lesson-02" />
        </label>
        <label>
          Choices
          <textarea formControlName="choicesText" rows="6" placeholder="A|Choice text|Optional rationale"></textarea>
          <small>One choice per line. Format: id|text|optional rationale</small>
        </label>
        <label>
          Correct answer keys
          <input formControlName="correctAnswerKey" placeholder="A,B" />
        </label>
        <label class="interaction-field">
          Interaction config JSON
          <textarea formControlName="interactionConfig" rows="12" placeholder='{"kind":"bow_tie","parts":[]}'></textarea>
          <small>
            Utiliser pour les items NGN structurés. Pour bow_tie, définir kind="bow_tie" et un tableau parts avec id, label, prompt,
            selectionMode, minSelections, maxSelections et optionIds.
          </small>
        </label>
        <label>
          Distractor rationale JSON
          <textarea formControlName="distractorRationale" rows="5"></textarea>
        </label>
        <label>
          Source authority
          <input formControlName="sourceAuthority" />
        </label>
        <label>
          Source title
          <input formControlName="sourceReferenceTitle" />
        </label>
        <label>
          Source url
          <input formControlName="sourceReferenceUrl" />
        </label>
        <label>
          Source version date
          <input formControlName="sourceVersionDate" type="date" />
        </label>
        <label>
          Jurisdiction notes
          <textarea formControlName="jurisdictionNotes" rows="3"></textarea>
        </label>
        <label>
          Points
          <input formControlName="points" type="number" min="1" />
        </label>
        <label>
          Estimated seconds
          <input formControlName="estimatedTimeSeconds" type="number" min="15" />
        </label>
        <label class="check"><input type="checkbox" formControlName="active" /> Active</label>
      </form>

      <section class="panel preview">
        <h2>Computed metadata</h2>
        <div class="meta-grid">
          <div><span>Item id</span><strong>{{ form.get('id')?.value }}</strong></div>
          <div><span>Program title</span><strong>{{ selectedProgramTitle() }}</strong></div>
          <div><span>Course group title</span><strong>{{ selectedCourseGroupTitle() }}</strong></div>
          <div><span>Module title</span><strong>{{ selectedModuleTitle() }}</strong></div>
          <div><span>Suggested slug</span><strong>{{ suggestedSlug() }}</strong></div>
        </div>
        <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
      </section>
    </section>
  `,
  styles: [
    `
      .editor { display: grid; gap: 1rem; }
      .head, .panel {
        border: 1px solid #d6e3f1;
        border-radius: 1rem;
        background: #fff;
        padding: 1rem 1.1rem;
      }
      .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #587695; font-weight: 800; }
      .head h1 { margin: 0.25rem 0; }
      .head p { margin: 0; color: #617e99; max-width: 62ch; }
      .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .btn {
        border: 1px solid #c9dbee;
        border-radius: 0.7rem;
        background: #f8fbff;
        color: #224f7d;
        text-decoration: none;
        padding: 0.55rem 0.8rem;
        cursor: pointer;
        font-weight: 700;
      }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .form-grid { display: grid; gap: 0.8rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      label { display: grid; gap: 0.35rem; color: #20486f; font-weight: 700; }
      .interaction-field { grid-column: 1 / -1; }
      input, select, textarea {
        border: 1px solid #c9dbee;
        border-radius: 0.8rem;
        padding: 0.72rem 0.85rem;
        font: inherit;
        color: #163f68;
      }
      textarea { resize: vertical; }
      small, .status { color: #64809b; }
      .check { grid-template-columns: auto 1fr; align-items: center; }
      .preview h2 { margin-top: 0; }
      .meta-grid { display: grid; gap: 0.8rem; grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .meta-grid div { border: 1px solid #e3edf7; border-radius: 0.8rem; padding: 0.75rem; }
      .meta-grid span { display: block; color: #68839d; font-size: 0.82rem; }
      .meta-grid strong { display: block; margin-top: 0.25rem; color: #173f68; }
      @media (max-width: 980px) {
        .form-grid, .meta-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class QuestionBankEditorPage {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly examPrep = inject(ExamPrepAdminService);
  private readonly orgContext = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly itemId = this.route.snapshot.paramMap.get('itemId') ?? '';
  private readonly context = toSignal(this.orgContext.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly programs = toSignal(this.examPrep.programs$, { initialValue: [] });
  readonly courseGroups = toSignal(this.examPrep.courseGroups$, { initialValue: [] });
  readonly modules = toSignal(this.examPrep.modules$, { initialValue: [] });
  readonly item = toSignal(
    this.itemId ? this.examPrep.getQuestionBankItem(this.itemId) : of(undefined),
    { initialValue: undefined }
  );
  readonly statusMessage = signal('');

  readonly form = this.formBuilder.group({
    id: '',
    blueprintType: 'exam_prep' as BlueprintType,
    stem: '',
    leadInQuestion: '',
    scenarioText: '',
    explanation: '',
    rationale: '',
    programId: '',
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    courseGroupId: '',
    moduleId: '',
    itemType: EXAM_PREP_ITEM_TYPE_OPTIONS[0],
    difficulty: EXAM_PREP_DIFFICULTY_OPTIONS[1],
    cognitiveLevel: EXAM_PREP_COGNITIVE_OPTIONS[2],
    workflowStatus: EXAM_PREP_WORKFLOW_OPTIONS[0],
    parentCaseId: '',
    tags: '',
    learningObjectives: '',
    remediationTags: '',
    remediationModuleIds: '',
    remediationLessonIds: '',
    choicesText: 'A||\nB||',
    correctAnswerKey: 'A',
    interactionConfig: '',
    distractorRationale: '{}',
    sourceAuthority: 'Internal SME Board',
    sourceReferenceTitle: '',
    sourceReferenceUrl: '',
    sourceVersionDate: new Date().toISOString().slice(0, 10),
    jurisdictionNotes: '',
    points: 1,
    estimatedTimeSeconds: 75,
    active: true,
  });

  readonly selectedProgramTitle = computed(() => lookupProgramTitle(this.programs(), String(this.form.get('programId')?.value ?? '')));
  readonly selectedCourseGroupTitle = computed(() => lookupCourseGroupTitle(this.courseGroups(), String(this.form.get('courseGroupId')?.value ?? '')));
  readonly selectedModuleTitle = computed(() => lookupModuleTitle(this.modules(), String(this.form.get('moduleId')?.value ?? '')));
  readonly suggestedSlug = computed(() => slugifyExamPrep(String(this.form.get('stem')?.value ?? this.form.get('leadInQuestion')?.value ?? '')));

  readonly workflowOptions = EXAM_PREP_WORKFLOW_OPTIONS;
  readonly itemTypeOptions = EXAM_PREP_ITEM_TYPE_OPTIONS;
  readonly difficultyOptions = EXAM_PREP_DIFFICULTY_OPTIONS;
  readonly cognitiveOptions = EXAM_PREP_COGNITIVE_OPTIONS;
  readonly trackOptions = EXAM_PREP_TRACK_OPTIONS;
  readonly jurisdictionOptions = EXAM_PREP_JURISDICTION_OPTIONS;
  readonly blueprintTypes = BLUEPRINT_TYPES;

  blueprintTypeLabel(t: BlueprintType): string {
    return BLUEPRINT_TYPE_LABELS[t] ?? t;
  }

  constructor() {
    effect(() => {
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      if (!String(this.form.get('id')?.value ?? '') && orgId) {
        const draft = buildDefaultQuestionBankItem(orgId, actor);
        this.applyDraft(draft);
      }

      const current = this.item();
      if (current) {
        this.applyDraft(current);
      }
    });
  }

  async save(): Promise<void> {
    this.statusMessage.set('');
    try {
      const raw: any = this.form.getRawValue();
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      const current = this.item() ?? buildDefaultQuestionBankItem(orgId, actor);
      const payload: QuestionBankItem = {
        ...current,
        id: String(raw.id || '') || generateExamPrepId('qb'),
        organizationId: orgId,
        blueprintType: (raw.blueprintType as BlueprintType) || 'exam_prep',
        programId: raw.programId as QuestionBankItem['programId'],
        programTitle: this.selectedProgramTitle(),
        jurisdiction: raw.jurisdiction as QuestionBankItem['jurisdiction'],
        examTrack: raw.examTrack as QuestionBankItem['examTrack'],
        courseGroupId: raw.courseGroupId as QuestionBankItem['courseGroupId'],
        courseGroupTitle: this.selectedCourseGroupTitle(),
        moduleId: String(raw.moduleId || ''),
        moduleTitle: this.selectedModuleTitle(),
        parentCaseId: String(raw.parentCaseId || '') || null,
        itemType: raw.itemType as QuestionBankItem['itemType'],
        cognitiveLevel: raw.cognitiveLevel as QuestionBankItem['cognitiveLevel'],
        difficulty: raw.difficulty as QuestionBankItem['difficulty'],
        stem: String(raw.stem || '').trim(),
        scenarioText: String(raw.scenarioText || '').trim() || null,
        leadInQuestion: String(raw.leadInQuestion || '').trim(),
        choices: parseChoices(String(raw.choicesText || '')),
        correctAnswerKey: splitCommaSeparated(String(raw.correctAnswerKey || '')),
        interactionConfig: parseJsonOrFallback<QuestionBankItem['interactionConfig']>(String(raw.interactionConfig || ''), null),
        explanation: String(raw.explanation || '').trim(),
        rationale: String(raw.rationale || '').trim(),
        distractorRationale: parseJsonOrFallback<Record<string, string> | null>(String(raw.distractorRationale || ''), null),
        learningObjectives: splitCommaSeparated(String(raw.learningObjectives || '')),
        tags: splitCommaSeparated(String(raw.tags || '')),
        sourceAuthority: String(raw.sourceAuthority || '').trim(),
        sourceReferenceTitle: String(raw.sourceReferenceTitle || '').trim(),
        sourceReferenceUrl: String(raw.sourceReferenceUrl || '').trim() || null,
        sourceVersionDate: String(raw.sourceVersionDate || ''),
        jurisdictionNotes: String(raw.jurisdictionNotes || '').trim() || null,
        points: Number(raw.points),
        estimatedTimeSeconds: Number(raw.estimatedTimeSeconds),
        active: Boolean(raw.active),
        workflowStatus: raw.workflowStatus as QuestionBankItem['workflowStatus'],
        version: current.version || 1,
        remediationModuleIds: splitCommaSeparated(String(raw.remediationModuleIds || '')),
        remediationLessonIds: splitCommaSeparated(String(raw.remediationLessonIds || '')),
        remediationTags: splitCommaSeparated(String(raw.remediationTags || '')),
        createdBy: current.createdBy || actor,
        createdAt: current.createdAt || new Date(),
        updatedBy: actor,
        updatedAt: new Date(),
      };

      const savedId = await this.examPrep.upsertQuestionBankItem(payload);
      this.statusMessage.set('Question item saved.');
      await this.router.navigate(['/program-admin/exam-prep/question-bank', savedId, 'edit']);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save question item.');
    }
  }

  private applyDraft(item: QuestionBankItem): void {
    this.form.patchValue({
      id: item.id,
      blueprintType: item.blueprintType ?? 'exam_prep',
      stem: item.stem,
      leadInQuestion: item.leadInQuestion,
      scenarioText: item.scenarioText ?? '',
      explanation: item.explanation,
      rationale: item.rationale,
      programId: item.programId,
      jurisdiction: item.jurisdiction,
      examTrack: item.examTrack,
      courseGroupId: item.courseGroupId,
      moduleId: item.moduleId,
      itemType: item.itemType,
      difficulty: item.difficulty,
      cognitiveLevel: item.cognitiveLevel,
      workflowStatus: item.workflowStatus,
      parentCaseId: item.parentCaseId ?? '',
      tags: formatCommaSeparated(item.tags),
      learningObjectives: formatCommaSeparated(item.learningObjectives),
      remediationTags: formatCommaSeparated(item.remediationTags),
      remediationModuleIds: formatCommaSeparated(item.remediationModuleIds),
      remediationLessonIds: formatCommaSeparated(item.remediationLessonIds),
      choicesText: formatChoices(item.choices),
      correctAnswerKey: formatCommaSeparated(item.correctAnswerKey),
      interactionConfig: item.interactionConfig ? prettyJson(item.interactionConfig) : '',
      distractorRationale: prettyJson(item.distractorRationale ?? {}),
      sourceAuthority: item.sourceAuthority,
      sourceReferenceTitle: item.sourceReferenceTitle,
      sourceReferenceUrl: item.sourceReferenceUrl ?? '',
      sourceVersionDate: item.sourceVersionDate,
      jurisdictionNotes: item.jurisdictionNotes ?? '',
      points: item.points,
      estimatedTimeSeconds: item.estimatedTimeSeconds,
      active: item.active,
    }, { emitEvent: false });
  }
}