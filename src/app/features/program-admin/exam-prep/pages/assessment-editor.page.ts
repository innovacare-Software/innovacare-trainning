import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import {
  EXAM_PREP_ASSESSMENT_FAMILIES,
  EXAM_PREP_ASSESSMENT_MODES,
  EXAM_PREP_BLUEPRINT_MODES,
  EXAM_PREP_REVIEW_MODES,
  EXAM_PREP_SOURCE_MODES,
  EXAM_PREP_TRACK_OPTIONS,
  EXAM_PREP_JURISDICTION_OPTIONS,
  EXAM_PREP_WORKFLOW_OPTIONS,
  buildDefaultAssessment,
  formatCommaSeparated,
  generateExamPrepId,
  parseJsonOrFallback,
  prettyJson,
  slugifyExamPrep,
  splitCommaSeparated,
} from './exam-prep-admin.defaults';
import type { AssessmentDefinition, AssessmentSectionDefinition } from '../models/exam-prep.models';

@Component({
  selector: 'app-assessment-editor-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="editor">
      <header class="head">
        <div>
          <p class="eyebrow">Assessment Authoring</p>
          <h1>{{ assessmentId ? 'Edit assessment' : 'Create assessment' }}</h1>
          <p>Configure module quizzes, finals, and licensure readiness assessments with review-mode and source-mode controls.</p>
        </div>
        <div class="actions">
          <a routerLink="/program-admin/exam-prep/assessments" class="btn">Back to assessments</a>
          <button type="button" class="btn primary" (click)="save()">Save assessment</button>
        </div>
      </header>

      <form class="panel form-grid" [formGroup]="form">
        <label>Title<input formControlName="title" /></label>
        <label>Slug<input formControlName="slug" placeholder="auto-generated if blank" /></label>
        <label>Description<textarea formControlName="description" rows="3"></textarea></label>
        <label>Instructions<textarea formControlName="instructions" rows="4"></textarea></label>
        <label>
          Assessment family
          <select formControlName="assessmentFamily">
            <option *ngFor="let option of assessmentFamilies" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Assessment mode
          <select formControlName="assessmentMode">
            <option *ngFor="let option of assessmentModes" [value]="option">{{ option }}</option>
          </select>
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
            <option value="">No course-group lock</option>
            <option *ngFor="let option of courseGroups()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>
        <label>
          Module
          <select formControlName="moduleId">
            <option value="">No module lock</option>
            <option *ngFor="let option of modules()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>
        <label>
          Source mode
          <select formControlName="sourceMode">
            <option *ngFor="let option of sourceModes" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Blueprint mode
          <select formControlName="blueprintMode">
            <option *ngFor="let option of blueprintModes" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Blueprint id
          <select formControlName="blueprintId">
            <option value="">No blueprint selected</option>
            <option *ngFor="let option of blueprints()" [value]="option.id">{{ option.title || option.id }}</option>
          </select>
        </label>
        <label>Fixed question ids<input formControlName="fixedQuestionIds" placeholder="qb-001,qb-002" /></label>
        <label>Draw count<input formControlName="drawCount" type="number" min="0" /></label>
        <label>Case study count<input formControlName="caseStudyCount" type="number" min="0" /></label>
        <label>Duration minutes<input formControlName="durationMinutes" type="number" min="1" /></label>
        <label>Passing score percent<input formControlName="passingScorePercent" type="number" min="1" max="100" /></label>
        <label>Max attempts<input formControlName="maxAttempts" type="number" min="1" /></label>
        <label>
          Review mode
          <select formControlName="reviewMode">
            <option *ngFor="let option of reviewModes" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Publish status
          <select formControlName="publishStatus">
            <option *ngFor="let option of workflowOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>Sections JSON<textarea formControlName="sections" rows="8"></textarea></label>
        <label class="check"><input type="checkbox" formControlName="allowRetake" /> Allow retake</label>
        <label class="check"><input type="checkbox" formControlName="requireAllQuestionsAnswered" /> Require all questions answered</label>
        <label class="check"><input type="checkbox" formControlName="autoSubmitOnTimeout" /> Auto submit on timeout</label>
        <label class="check"><input type="checkbox" formControlName="showScoreImmediately" /> Show score immediately</label>
        <label class="check"><input type="checkbox" formControlName="showCorrectAnswersAfterSubmit" /> Show correct answers after submit</label>
        <label class="check"><input type="checkbox" formControlName="showRationalesAfterSubmit" /> Show rationales after submit</label>
        <label class="check"><input type="checkbox" formControlName="showCategoryBreakdown" /> Show category breakdown</label>
        <label class="check"><input type="checkbox" formControlName="strictNavigation" /> Strict navigation</label>
        <label class="check"><input type="checkbox" formControlName="allowQuestionFlagging" /> Allow flagging</label>
        <label class="check"><input type="checkbox" formControlName="allowBackNavigation" /> Allow back navigation</label>
        <label class="check"><input type="checkbox" formControlName="randomizeQuestionOrder" /> Randomize question order</label>
        <label class="check"><input type="checkbox" formControlName="randomizeChoiceOrder" /> Randomize choice order</label>
        <label class="check"><input type="checkbox" formControlName="active" /> Active</label>
      </form>

      <section class="panel" *ngIf="statusMessage()"><p class="status">{{ statusMessage() }}</p></section>
    </section>
  `,
  styles: [
    `
      .editor { display: grid; gap: 1rem; }
      .head, .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem 1.1rem; }
      .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #587695; font-weight: 800; }
      .head h1 { margin: 0.25rem 0; }
      .head p, .status { margin: 0; color: #617e99; }
      .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .btn { border: 1px solid #c9dbee; border-radius: 0.7rem; background: #f8fbff; color: #224f7d; text-decoration: none; padding: 0.55rem 0.8rem; cursor: pointer; font-weight: 700; }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .form-grid { display: grid; gap: 0.8rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      label { display: grid; gap: 0.35rem; color: #20486f; font-weight: 700; }
      input, select, textarea { border: 1px solid #c9dbee; border-radius: 0.8rem; padding: 0.72rem 0.85rem; font: inherit; }
      textarea { resize: vertical; }
      .check { grid-template-columns: auto 1fr; align-items: center; }
      @media (max-width: 980px) { .form-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class AssessmentEditorPage {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly examPrep = inject(ExamPrepAdminService);
  private readonly orgContext = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId') ?? '';
  private readonly context = toSignal(this.orgContext.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly programs = toSignal(this.examPrep.programs$, { initialValue: [] });
  readonly courseGroups = toSignal(this.examPrep.courseGroups$, { initialValue: [] });
  readonly modules = toSignal(this.examPrep.modules$, { initialValue: [] });
  readonly blueprints = toSignal(this.examPrep.blueprints$, { initialValue: [] });
  readonly assessment = toSignal(this.assessmentId ? this.examPrep.getAssessment(this.assessmentId) : of(undefined), { initialValue: undefined });
  readonly statusMessage = signal('');

  readonly form = this.formBuilder.group({
    id: '',
    title: '',
    slug: '',
    description: '',
    instructions: 'Read each item carefully and select the safest nursing action.',
    assessmentFamily: EXAM_PREP_ASSESSMENT_FAMILIES[1],
    assessmentMode: EXAM_PREP_ASSESSMENT_MODES[0],
    programId: '',
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    courseGroupId: '',
    moduleId: '',
    sourceMode: EXAM_PREP_SOURCE_MODES[2],
    blueprintMode: EXAM_PREP_BLUEPRINT_MODES[0],
    blueprintId: '',
    fixedQuestionIds: '',
    drawCount: 25,
    caseStudyCount: 2,
    durationMinutes: 45,
    passingScorePercent: 70,
    maxAttempts: 3,
    allowRetake: true,
    requireAllQuestionsAnswered: true,
    autoSubmitOnTimeout: true,
    showScoreImmediately: true,
    showCorrectAnswersAfterSubmit: false,
    showRationalesAfterSubmit: false,
    showCategoryBreakdown: true,
    reviewMode: EXAM_PREP_REVIEW_MODES[1],
    publishStatus: EXAM_PREP_WORKFLOW_OPTIONS[0],
    sections: '[]',
    strictNavigation: false,
    allowQuestionFlagging: true,
    allowBackNavigation: true,
    randomizeQuestionOrder: true,
    randomizeChoiceOrder: false,
    active: true,
  });

  readonly assessmentFamilies = EXAM_PREP_ASSESSMENT_FAMILIES;
  readonly assessmentModes = EXAM_PREP_ASSESSMENT_MODES;
  readonly sourceModes = EXAM_PREP_SOURCE_MODES;
  readonly blueprintModes = EXAM_PREP_BLUEPRINT_MODES;
  readonly reviewModes = EXAM_PREP_REVIEW_MODES;
  readonly workflowOptions = EXAM_PREP_WORKFLOW_OPTIONS;
  readonly trackOptions = EXAM_PREP_TRACK_OPTIONS;
  readonly jurisdictionOptions = EXAM_PREP_JURISDICTION_OPTIONS;

  constructor() {
    effect(() => {
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      if (!String(this.form.get('id')?.value ?? '') && orgId) {
        this.applyDraft(buildDefaultAssessment(orgId, actor));
      }
      const current = this.assessment();
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
      const current = this.assessment() ?? buildDefaultAssessment(orgId, actor);
      const payload: AssessmentDefinition = {
        ...current,
        id: String(raw['id'] || '') || generateExamPrepId('asm'),
        organizationId: orgId,
        title: String(raw['title'] || '').trim(),
        slug: String(raw['slug'] || '').trim() || slugifyExamPrep(String(raw['title'] || '')),
        description: String(raw['description'] || '').trim(),
        instructions: String(raw['instructions'] || '').trim(),
        assessmentFamily: raw['assessmentFamily'] as AssessmentDefinition['assessmentFamily'],
        assessmentMode: raw['assessmentMode'] as AssessmentDefinition['assessmentMode'],
        programId: raw['programId'] as AssessmentDefinition['programId'],
        jurisdiction: raw['jurisdiction'] as AssessmentDefinition['jurisdiction'],
        examTrack: raw['examTrack'] as AssessmentDefinition['examTrack'],
        courseGroupId: (raw['courseGroupId'] || null) as AssessmentDefinition['courseGroupId'],
        moduleId: String(raw['moduleId'] || '') || null,
        sourceMode: raw['sourceMode'] as AssessmentDefinition['sourceMode'],
        blueprintMode: raw['blueprintMode'] as AssessmentDefinition['blueprintMode'],
        blueprintId: String(raw['blueprintId'] || '') || null,
        fixedQuestionIds: splitCommaSeparated(String(raw['fixedQuestionIds'] || '')),
        drawCount: Number(raw['drawCount']),
        caseStudyCount: Number(raw['caseStudyCount']),
        durationMinutes: Number(raw['durationMinutes']),
        passingScorePercent: Number(raw['passingScorePercent']),
        maxAttempts: Number(raw['maxAttempts']),
        allowRetake: Boolean(raw['allowRetake']),
        requireAllQuestionsAnswered: Boolean(raw['requireAllQuestionsAnswered']),
        autoSubmitOnTimeout: Boolean(raw['autoSubmitOnTimeout']),
        showScoreImmediately: Boolean(raw['showScoreImmediately']),
        showCorrectAnswersAfterSubmit: Boolean(raw['showCorrectAnswersAfterSubmit']),
        showRationalesAfterSubmit: Boolean(raw['showRationalesAfterSubmit']),
        showCategoryBreakdown: Boolean(raw['showCategoryBreakdown']),
        reviewMode: raw['reviewMode'] as AssessmentDefinition['reviewMode'],
        publishStatus: raw['publishStatus'] as AssessmentDefinition['publishStatus'],
        sections: parseJsonOrFallback<AssessmentSectionDefinition[]>(String(raw['sections'] || ''), []),
        strictNavigation: Boolean(raw['strictNavigation']),
        allowQuestionFlagging: Boolean(raw['allowQuestionFlagging']),
        allowBackNavigation: Boolean(raw['allowBackNavigation']),
        randomizeQuestionOrder: Boolean(raw['randomizeQuestionOrder']),
        randomizeChoiceOrder: Boolean(raw['randomizeChoiceOrder']),
        active: Boolean(raw['active']),
        createdBy: current.createdBy || actor,
        createdAt: current.createdAt || new Date(),
        updatedBy: actor,
        updatedAt: new Date(),
      };

      const savedId = await this.examPrep.upsertAssessment(payload);
      this.statusMessage.set('Assessment saved.');
      await this.router.navigate(['/program-admin/exam-prep/assessments', savedId, 'edit']);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save assessment.');
    }
  }

  private applyDraft(assessment: AssessmentDefinition): void {
    this.form.patchValue({
      id: assessment.id,
      title: assessment.title,
      slug: assessment.slug,
      description: assessment.description,
      instructions: assessment.instructions,
      assessmentFamily: assessment.assessmentFamily,
      assessmentMode: assessment.assessmentMode,
      programId: assessment.programId,
      jurisdiction: assessment.jurisdiction,
      examTrack: assessment.examTrack,
      courseGroupId: assessment.courseGroupId ?? '',
      moduleId: assessment.moduleId ?? '',
      sourceMode: assessment.sourceMode,
      blueprintMode: assessment.blueprintMode,
      blueprintId: assessment.blueprintId ?? '',
      fixedQuestionIds: formatCommaSeparated(assessment.fixedQuestionIds ?? []),
      drawCount: assessment.drawCount,
      caseStudyCount: assessment.caseStudyCount,
      durationMinutes: assessment.durationMinutes,
      passingScorePercent: assessment.passingScorePercent,
      maxAttempts: assessment.maxAttempts,
      allowRetake: assessment.allowRetake,
      requireAllQuestionsAnswered: assessment.requireAllQuestionsAnswered,
      autoSubmitOnTimeout: assessment.autoSubmitOnTimeout,
      showScoreImmediately: assessment.showScoreImmediately,
      showCorrectAnswersAfterSubmit: assessment.showCorrectAnswersAfterSubmit,
      showRationalesAfterSubmit: assessment.showRationalesAfterSubmit,
      showCategoryBreakdown: assessment.showCategoryBreakdown,
      reviewMode: assessment.reviewMode,
      publishStatus: assessment.publishStatus,
      sections: prettyJson(assessment.sections),
      strictNavigation: assessment.strictNavigation,
      allowQuestionFlagging: assessment.allowQuestionFlagging,
      allowBackNavigation: assessment.allowBackNavigation,
      randomizeQuestionOrder: assessment.randomizeQuestionOrder,
      randomizeChoiceOrder: assessment.randomizeChoiceOrder,
      active: assessment.active,
    }, { emitEvent: false });
  }
}