import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import {
  EXAM_PREP_TRACK_OPTIONS,
  EXAM_PREP_JURISDICTION_OPTIONS,
  EXAM_PREP_WORKFLOW_OPTIONS,
  buildDefaultCaseStudyBundle,
  formatLines,
  generateExamPrepId,
  lookupCourseGroupTitle,
  lookupModuleTitle,
  lookupProgramTitle,
  parseJsonOrFallback,
  prettyJson,
  slugifyExamPrep,
  splitCommaSeparated,
  splitLines,
} from './exam-prep-admin.defaults';
import type { CaseStudyBundle, ContentSourceReference } from '../models/exam-prep.models';

@Component({
  selector: 'app-case-study-editor-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="editor">
      <header class="head">
        <div>
          <p class="eyebrow">Case Study Authoring</p>
          <h1>{{ caseStudyId ? 'Edit case study bundle' : 'Create case study bundle' }}</h1>
          <p>Author shared patient context, define multi-item sequence order, and bind case bundles to taxonomy and jurisdiction overlays.</p>
        </div>
        <div class="actions">
          <a routerLink="/program-admin/exam-prep/question-bank" class="btn">Back to bank</a>
          <button type="button" class="btn primary" (click)="save()">Save case study</button>
        </div>
      </header>

      <form class="panel form-grid" [formGroup]="form">
        <label>
          Title
          <input formControlName="title" />
        </label>
        <label>
          Slug
          <input formControlName="slug" placeholder="auto-generated if blank" />
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
          Workflow
          <select formControlName="workflowStatus">
            <option *ngFor="let option of workflowOptions" [value]="option">{{ option }}</option>
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
          Shared vignette
          <textarea formControlName="vignette" rows="4"></textarea>
        </label>
        <label>
          Demographics
          <textarea formControlName="demographics" rows="3"></textarea>
        </label>
        <label>
          History
          <textarea formControlName="history" rows="3"></textarea>
        </label>
        <label>
          Allergies
          <textarea formControlName="allergies" rows="3"></textarea>
        </label>
        <label>
          Current meds
          <textarea formControlName="currentMeds" rows="3"></textarea>
        </label>
        <label>
          Labs
          <textarea formControlName="labs" rows="3"></textarea>
        </label>
        <label>
          Vital signs
          <textarea formControlName="vitalSigns" rows="3"></textarea>
        </label>
        <label>
          Nursing notes
          <textarea formControlName="nursingNotes" rows="3"></textarea>
        </label>
        <label>
          Provider notes
          <textarea formControlName="providerNotes" rows="3"></textarea>
        </label>
        <label>
          Imaging snippets
          <textarea formControlName="imagingSnippets" rows="3"></textarea>
        </label>
        <label>
          Trend updates
          <textarea formControlName="trendUpdates" rows="3"></textarea>
        </label>
        <label>
          Child item ids
          <textarea formControlName="childItemIds" rows="4" placeholder="One question id per line"></textarea>
        </label>
        <label>
          Sequence order
          <input formControlName="sequenceOrder" placeholder="1,2,3" />
        </label>
        <label>
          Source references JSON
          <textarea formControlName="sourceReferences" rows="8"></textarea>
        </label>
        <label>
          Author notes
          <textarea formControlName="authorNotes" rows="3"></textarea>
        </label>
        <label>
          Reviewer notes
          <textarea formControlName="reviewerNotes" rows="3"></textarea>
        </label>
        <label class="check"><input type="checkbox" formControlName="active" /> Active</label>
      </form>

      <section class="panel footer-note">
        <p>Program: {{ selectedProgramTitle() }} · Course group: {{ selectedCourseGroupTitle() }} · Module: {{ selectedModuleTitle() }}</p>
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
      .head p, .footer-note p, .status { margin: 0; color: #617e99; }
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
      input, select, textarea {
        border: 1px solid #c9dbee;
        border-radius: 0.8rem;
        padding: 0.72rem 0.85rem;
        font: inherit;
      }
      textarea { resize: vertical; }
      .check { grid-template-columns: auto 1fr; align-items: center; }
      @media (max-width: 980px) {
        .form-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class CaseStudyEditorPage {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly examPrep = inject(ExamPrepAdminService);
  private readonly orgContext = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly caseStudyId = this.route.snapshot.paramMap.get('caseStudyId') ?? '';
  readonly context = toSignal(this.orgContext.context$, {
    initialValue: {
      uid: '',
      orgId: null,
      role: 'guest',
      orgRole: null,
      isSuperAdmin: false,
      isOrgAdmin: false,
      isOrgManager: false,
      isOrgLearner: false,
    },
  });
  readonly programs = toSignal(this.examPrep.programs$, { initialValue: [] });
  readonly courseGroups = toSignal(this.examPrep.courseGroups$, { initialValue: [] });
  readonly modules = toSignal(this.examPrep.modules$, { initialValue: [] });
  readonly caseStudy = toSignal(
    this.caseStudyId ? this.examPrep.getCaseStudyBundle(this.caseStudyId) : of(undefined),
    { initialValue: undefined }
  );
  readonly statusMessage = signal('');

  readonly form = this.formBuilder.group({
    id: '',
    title: '',
    slug: '',
    programId: '',
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    workflowStatus: EXAM_PREP_WORKFLOW_OPTIONS[0],
    courseGroupId: '',
    moduleId: '',
    vignette: '',
    demographics: '',
    history: '',
    allergies: '',
    currentMeds: '',
    labs: '',
    vitalSigns: '',
    nursingNotes: '',
    providerNotes: '',
    imagingSnippets: '',
    trendUpdates: '',
    childItemIds: '',
    sequenceOrder: '1',
    sourceReferences: '[]',
    authorNotes: '',
    reviewerNotes: '',
    active: true,
  });

  readonly selectedProgramTitle = signal('');
  readonly selectedCourseGroupTitle = signal('');
  readonly selectedModuleTitle = signal('');
  readonly workflowOptions = EXAM_PREP_WORKFLOW_OPTIONS;
  readonly trackOptions = EXAM_PREP_TRACK_OPTIONS;
  readonly jurisdictionOptions = EXAM_PREP_JURISDICTION_OPTIONS;

  constructor() {
    effect(() => {
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      if (!String(this.form.get('id')?.value ?? '') && orgId) {
        this.applyDraft(buildDefaultCaseStudyBundle(orgId, actor));
      }

      const current = this.caseStudy();
      if (current) {
        this.applyDraft(current);
      }

      this.selectedProgramTitle.set(lookupProgramTitle(this.programs(), String(this.form.get('programId')?.value ?? '')));
      this.selectedCourseGroupTitle.set(lookupCourseGroupTitle(this.courseGroups(), String(this.form.get('courseGroupId')?.value ?? '')));
      this.selectedModuleTitle.set(lookupModuleTitle(this.modules(), String(this.form.get('moduleId')?.value ?? '')));
    });
  }

  async save(): Promise<void> {
    this.statusMessage.set('');
    try {
      const raw: any = this.form.getRawValue();
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      const current = this.caseStudy() ?? buildDefaultCaseStudyBundle(orgId, actor);
      const references = parseJsonOrFallback<ContentSourceReference[]>(String(raw.sourceReferences || ''), []);

      const payload: CaseStudyBundle = {
        ...current,
        id: String(raw.id || '') || generateExamPrepId('case'),
        organizationId: orgId,
        title: String(raw.title || '').trim(),
        slug: String(raw.slug || '').trim() || slugifyExamPrep(String(raw.title || '')),
        programId: raw.programId as CaseStudyBundle['programId'],
        programTitle: this.selectedProgramTitle(),
        jurisdiction: raw.jurisdiction as CaseStudyBundle['jurisdiction'],
        examTrack: raw.examTrack as CaseStudyBundle['examTrack'],
        workflowStatus: raw.workflowStatus as CaseStudyBundle['workflowStatus'],
        courseGroupId: raw.courseGroupId as CaseStudyBundle['courseGroupId'],
        courseGroupTitle: this.selectedCourseGroupTitle(),
        moduleId: String(raw.moduleId || ''),
        moduleTitle: this.selectedModuleTitle(),
        sharedContext: {
          vignette: String(raw.vignette || '').trim(),
          demographics: String(raw.demographics || '').trim(),
          history: String(raw.history || '').trim(),
          allergies: splitLines(String(raw.allergies || '')),
          currentMeds: splitLines(String(raw.currentMeds || '')),
          labs: splitLines(String(raw.labs || '')),
          vitalSigns: splitLines(String(raw.vitalSigns || '')),
          nursingNotes: splitLines(String(raw.nursingNotes || '')),
          providerNotes: splitLines(String(raw.providerNotes || '')),
          imagingSnippets: splitLines(String(raw.imagingSnippets || '')),
          trendUpdates: splitLines(String(raw.trendUpdates || '')),
        },
        childItemIds: splitLines(String(raw.childItemIds || '')),
        sequenceOrder: splitCommaSeparated(String(raw.sequenceOrder || '')).map((entry) => Number(entry)),
        sourceReferences: references,
        authorNotes: String(raw.authorNotes || '').trim() || null,
        reviewerNotes: String(raw.reviewerNotes || '').trim() || null,
        active: Boolean(raw.active),
        createdBy: current.createdBy || actor,
        createdAt: current.createdAt || new Date(),
        updatedBy: actor,
        updatedAt: new Date(),
      };

      const savedId = await this.examPrep.upsertCaseStudyBundle(payload);
      this.statusMessage.set('Case study saved.');
      await this.router.navigate(['/program-admin/exam-prep/case-studies', savedId, 'edit']);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save case study.');
    }
  }

  private applyDraft(bundle: CaseStudyBundle): void {
    this.form.patchValue({
      id: bundle.id,
      title: bundle.title,
      slug: bundle.slug,
      programId: bundle.programId,
      jurisdiction: bundle.jurisdiction,
      examTrack: bundle.examTrack,
      workflowStatus: bundle.workflowStatus,
      courseGroupId: bundle.courseGroupId,
      moduleId: bundle.moduleId,
      vignette: bundle.sharedContext.vignette,
      demographics: bundle.sharedContext.demographics,
      history: bundle.sharedContext.history,
      allergies: formatLines(bundle.sharedContext.allergies),
      currentMeds: formatLines(bundle.sharedContext.currentMeds),
      labs: formatLines(bundle.sharedContext.labs),
      vitalSigns: formatLines(bundle.sharedContext.vitalSigns),
      nursingNotes: formatLines(bundle.sharedContext.nursingNotes),
      providerNotes: formatLines(bundle.sharedContext.providerNotes),
      imagingSnippets: formatLines(bundle.sharedContext.imagingSnippets),
      trendUpdates: formatLines(bundle.sharedContext.trendUpdates),
      childItemIds: formatLines(bundle.childItemIds),
      sequenceOrder: bundle.sequenceOrder.join(','),
      sourceReferences: prettyJson(bundle.sourceReferences),
      authorNotes: bundle.authorNotes ?? '',
      reviewerNotes: bundle.reviewerNotes ?? '',
      active: bundle.active,
    }, { emitEvent: false });
  }
}