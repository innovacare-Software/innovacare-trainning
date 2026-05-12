import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import {
  EXAM_PREP_ASSESSMENT_FAMILIES,
  EXAM_PREP_TRACK_OPTIONS,
  EXAM_PREP_JURISDICTION_OPTIONS,
  buildDefaultBlueprint,
  generateExamPrepId,
  parseJsonOrFallback,
  prettyJson,
  slugifyExamPrep,
  splitLines,
} from './exam-prep-admin.defaults';
import {
  BLUEPRINT_TYPES,
  BLUEPRINT_TYPE_LABELS,
  type BlueprintType,
  type ExamBlueprint,
  type BlueprintDifficultySection,
  type BlueprintDistributionRule,
} from '../models/exam-prep.models';
import type { BlueprintAssemblyPreview } from '../utils/exam-blueprint-assembly';

const DELIVERY_MODE_OPTIONS = ['self_paced', 'live', 'hybrid', 'in_person'] as const;
const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

@Component({
  selector: 'app-blueprint-editor-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="editor">
      <header class="head">
        <div>
          <p class="eyebrow">Blueprint Authoring</p>
          <h1>{{ blueprintId ? 'Edit blueprint' : 'Create blueprint' }}</h1>
          <p>Define blueprint distributions before learner-facing delivery is assembled.</p>
        </div>
        <div class="actions">
          <a routerLink="/program-admin/exam-prep/blueprints" class="btn">Back to blueprints</a>
          <button type="button" class="btn" (click)="previewBlueprint()" [disabled]="!isExamPrep()">Preview assembly</button>
          <button type="button" class="btn primary" (click)="save()">Save blueprint</button>
        </div>
      </header>

      <form class="panel form-grid" [formGroup]="form">
        <label class="full">
          Blueprint type
          <select formControlName="blueprintType">
            <option *ngFor="let option of blueprintTypes" [value]="option">{{ blueprintTypeLabel(option) }}</option>
          </select>
          <small class="hint" *ngIf="!isExamPrep()">General training blueprint — NCLEX/exam-prep specific fields are hidden.</small>
        </label>

        <label>Title<input formControlName="title" /></label>
        <label>Slug<input formControlName="slug" placeholder="auto-generated if blank" /></label>
        <label class="full">Description<textarea formControlName="description" rows="3"></textarea></label>
        <label>
          Assessment family
          <select formControlName="assessmentFamily">
            <option *ngFor="let option of assessmentFamilies" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Program
          <select formControlName="programId">
            <option *ngFor="let option of programs()" [value]="option.id">{{ option.title }}</option>
          </select>
        </label>

        <!-- ===== NCLEX / exam-prep specific (hidden for general training) ===== -->
        <ng-container *ngIf="isExamPrep()">
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
          <label>Clinical judgment quota<input formControlName="clinicalJudgmentQuota" type="number" min="0" /></label>
          <label>Case study quota<input formControlName="caseStudyBundleQuota" type="number" min="0" /></label>
        </ng-container>

        <label>Total question count<input formControlName="totalQuestionCount" type="number" min="1" /></label>
        <label>Time budget minutes<input formControlName="timeBudgetMinutes" type="number" min="1" /></label>
      </form>

      <!-- ===== General training fields (visible for non-exam_prep) ===== -->
      <section class="panel form-grid" *ngIf="!isExamPrep()" [formGroup]="form">
        <h2 class="full section-title">General training settings</h2>
        <label>Category<input formControlName="category" placeholder="e.g. Compliance, AI, Accounting" /></label>
        <label>Target audience<input formControlName="targetAudience" placeholder="e.g. Junior nurses, Public servants" /></label>
        <label>
          Level
          <select formControlName="level">
            <option *ngFor="let option of levelOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>
          Delivery mode
          <select formControlName="deliveryMode">
            <option *ngFor="let option of deliveryModeOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label>Language<input formControlName="language" placeholder="e.g. fr, en" /></label>
        <label>Duration (hours)<input formControlName="durationHours" type="number" min="0" step="0.5" /></label>
        <label>Passing score (%)<input formControlName="passingScore" type="number" min="0" max="100" /></label>
        <label class="check"><input type="checkbox" formControlName="certificateEnabled" /> Certificate enabled</label>
        <label class="check"><input type="checkbox" formControlName="assessmentRequired" /> Assessment required</label>
        <label class="check"><input type="checkbox" formControlName="finalAssessmentEnabled" /> Final assessment</label>
        <label class="full">Completion requirements (one per line)<textarea formControlName="completionRequirements" rows="4"></textarea></label>
        <label class="full">Practical checklist (one per line, optional)<textarea formControlName="practicalChecklist" rows="4"></textarea></label>
      </section>

      <!-- ===== Distribution rules (advanced — kept for both modes, NCLEX-only sections gated) ===== -->
      <section class="panel form-grid" [formGroup]="form">
        <h2 class="full section-title">Distribution rules</h2>
        <label class="full">Sequencing rules<textarea formControlName="sequencingRules" rows="3"></textarea></label>
        <label class="full">Course group distributions JSON<textarea formControlName="courseGroupDistributions" rows="6"></textarea></label>
        <label class="full">Module distributions JSON<textarea formControlName="moduleDistributions" rows="6"></textarea></label>
        <label class="full">Tag distributions JSON<textarea formControlName="tagDistributions" rows="6"></textarea></label>
        <label class="full" *ngIf="isExamPrep()">Item type distributions JSON<textarea formControlName="itemTypeDistributions" rows="6"></textarea></label>
        <label class="full">Difficulty distributions JSON<textarea formControlName="difficultyDistributions" rows="6"></textarea></label>
        <label class="full" *ngIf="isExamPrep()">Progressive sections JSON<textarea formControlName="progressiveSections" rows="6"></textarea></label>
        <label class="check"><input type="checkbox" formControlName="noDuplicateRules" /> No duplicates</label>
        <label class="check"><input type="checkbox" formControlName="exposureBalancing" /> Exposure balancing</label>
        <label class="check"><input type="checkbox" formControlName="active" /> Active</label>
      </section>

      <section class="panel preview-block" *ngIf="preview() as state">
        <div class="panel-head">
          <h2>Assembly Preview</h2>
          <span>{{ state.poolStats.eligibleItems }} eligible items</span>
        </div>
        <div class="preview-grid">
          <div><span>Eligible items</span><strong>{{ state.poolStats.eligibleItems }}</strong></div>
          <div><span>Eligible case studies</span><strong>{{ state.poolStats.eligibleCaseStudies }}</strong></div>
          <div><span>Clinical judgment items</span><strong>{{ state.poolStats.clinicalJudgmentItems }}</strong></div>
          <div><span>Generated ids</span><strong>{{ state.generatedQuestionIds.length }}</strong></div>
        </div>
        <div class="warning-list" *ngIf="state.shortageMessages.length; else healthyPool">
          <p *ngFor="let warning of state.shortageMessages">{{ warning }}</p>
        </div>
        <ng-template #healthyPool>
          <p class="status">No shortages detected in the currently published pool.</p>
        </ng-template>
      </section>

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
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .form-grid { display: grid; gap: 0.8rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .full { grid-column: 1 / -1; }
      .section-title { margin: 0; color: #173f68; font-size: 1rem; }
      .hint { color: #617e99; font-weight: 500; font-size: 0.78rem; }
      label { display: grid; gap: 0.35rem; color: #20486f; font-weight: 700; }
      input, select, textarea { border: 1px solid #c9dbee; border-radius: 0.8rem; padding: 0.72rem 0.85rem; font: inherit; }
      textarea { resize: vertical; }
      .check { grid-template-columns: auto 1fr; align-items: center; }
      .panel-head { display: flex; justify-content: space-between; gap: 0.7rem; }
      .preview-grid { display: grid; gap: 0.7rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .preview-grid div { border: 1px solid #e3edf7; border-radius: 0.8rem; padding: 0.75rem; }
      .preview-grid span { display: block; color: #68839d; font-size: 0.82rem; }
      .preview-grid strong { display: block; margin-top: 0.25rem; color: #173f68; }
      .warning-list { margin-top: 0.8rem; display: grid; gap: 0.45rem; }
      .warning-list p { margin: 0; color: #8a3344; background: #fff4f6; border: 1px solid #f3d1d8; border-radius: 0.7rem; padding: 0.6rem 0.75rem; }
      @media (max-width: 980px) { .form-grid, .preview-grid { grid-template-columns: 1fr; } .full { grid-column: 1; } }
    `,
  ],
})
export class BlueprintEditorPage {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly examPrep = inject(ExamPrepAdminService);
  private readonly orgContext = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly blueprintId = this.route.snapshot.paramMap.get('blueprintId') ?? '';
  private readonly context = toSignal(this.orgContext.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly programs = toSignal(this.examPrep.programs$, { initialValue: [] });
  readonly blueprint = toSignal(this.blueprintId ? this.examPrep.getBlueprint(this.blueprintId) : of(undefined), { initialValue: undefined });
  readonly statusMessage = signal('');
  readonly preview = signal<BlueprintAssemblyPreview | null>(null);
  readonly blueprintTypeSignal = signal<BlueprintType>('exam_prep');
  readonly isExamPrep = computed(() => this.blueprintTypeSignal() === 'exam_prep');

  readonly form = this.formBuilder.group({
    id: '',
    blueprintType: 'exam_prep' as BlueprintType,
    title: '',
    slug: '',
    description: '',
    assessmentFamily: EXAM_PREP_ASSESSMENT_FAMILIES[1],
    programId: '',
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    totalQuestionCount: 25,
    caseStudyBundleQuota: 2,
    clinicalJudgmentQuota: 5,
    timeBudgetMinutes: 45,
    sequencingRules: 'Start medium\nIncrease difficulty by section',
    courseGroupDistributions: '[]',
    moduleDistributions: '[]',
    tagDistributions: '[]',
    itemTypeDistributions: '[]',
    difficultyDistributions: '[]',
    progressiveSections: '[]',
    noDuplicateRules: true,
    exposureBalancing: true,
    active: true,
    // ---- General training fields ----
    category: '',
    targetAudience: '',
    level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    deliveryMode: 'self_paced' as 'self_paced' | 'live' | 'hybrid' | 'in_person',
    language: '',
    certificateEnabled: false,
    assessmentRequired: true,
    passingScore: 70,
    durationHours: 0,
    completionRequirements: '',
    practicalChecklist: '',
    finalAssessmentEnabled: true,
  });

  readonly assessmentFamilies = EXAM_PREP_ASSESSMENT_FAMILIES;
  readonly trackOptions = EXAM_PREP_TRACK_OPTIONS;
  readonly jurisdictionOptions = EXAM_PREP_JURISDICTION_OPTIONS;
  readonly blueprintTypes = BLUEPRINT_TYPES;
  readonly levelOptions = LEVEL_OPTIONS;
  readonly deliveryModeOptions = DELIVERY_MODE_OPTIONS;

  blueprintTypeLabel(t: BlueprintType): string {
    return BLUEPRINT_TYPE_LABELS[t] ?? t;
  }

  constructor() {
    // Keep the local signal in sync with the form control so *ngIf reacts.
    this.form.get('blueprintType')?.valueChanges.subscribe((v) => {
      this.blueprintTypeSignal.set((v as BlueprintType) ?? 'exam_prep');
    });

    effect(() => {
      const orgId = this.context().orgId ?? '';
      const actor = this.context().uid || 'system';
      if (!String(this.form.get('id')?.value ?? '') && orgId) {
        this.applyDraft(buildDefaultBlueprint(orgId, actor));
      }
      const current = this.blueprint();
      if (current) {
        this.applyDraft(current);
      }
    });
  }

  async previewBlueprint(): Promise<void> {
    this.statusMessage.set('');
    try {
      const preview = await firstValueFrom(this.examPrep.previewBlueprint(this.composePayload(false)));
      this.preview.set(preview);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to generate blueprint preview.');
    }
  }

  async save(): Promise<void> {
    this.statusMessage.set('');
    try {
      const savedId = await this.examPrep.upsertBlueprint(this.composePayload(true));
      this.statusMessage.set('Blueprint saved.');
      await this.router.navigate(['/program-admin/exam-prep/blueprints', savedId, 'edit']);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save blueprint.');
    }
  }

  private composePayload(preserveAudit: boolean): ExamBlueprint {
    const raw: any = this.form.getRawValue();
    const orgId = this.context().orgId ?? '';
    const actor = this.context().uid || 'system';
    const current = preserveAudit ? this.blueprint() ?? buildDefaultBlueprint(orgId, actor) : buildDefaultBlueprint(orgId, actor);
    const blueprintType = (raw['blueprintType'] as BlueprintType) || 'exam_prep';
    const isExamPrep = blueprintType === 'exam_prep';

    return {
      ...current,
      id: String(raw['id'] || '') || generateExamPrepId('bp'),
      organizationId: orgId,
      blueprintType,
      title: String(raw['title'] || '').trim(),
      slug: String(raw['slug'] || '').trim() || slugifyExamPrep(String(raw['title'] || '')),
      description: String(raw['description'] || '').trim(),
      assessmentFamily: raw['assessmentFamily'] as ExamBlueprint['assessmentFamily'],
      programId: raw['programId'] as ExamBlueprint['programId'],
      jurisdiction: raw['jurisdiction'] as ExamBlueprint['jurisdiction'],
      examTrack: raw['examTrack'] as ExamBlueprint['examTrack'],
      totalQuestionCount: Number(raw['totalQuestionCount']),
      caseStudyBundleQuota: isExamPrep ? Number(raw['caseStudyBundleQuota']) : 0,
      clinicalJudgmentQuota: isExamPrep ? Number(raw['clinicalJudgmentQuota']) : 0,
      timeBudgetMinutes: Number(raw['timeBudgetMinutes']),
      sequencingRules: splitLines(String(raw['sequencingRules'] || '')),
      courseGroupDistributions: parseJsonOrFallback<BlueprintDistributionRule[]>(String(raw['courseGroupDistributions'] || ''), []),
      moduleDistributions: parseJsonOrFallback<BlueprintDistributionRule[]>(String(raw['moduleDistributions'] || ''), []),
      tagDistributions: parseJsonOrFallback<BlueprintDistributionRule[]>(String(raw['tagDistributions'] || ''), []),
      itemTypeDistributions: isExamPrep
        ? parseJsonOrFallback<BlueprintDistributionRule[]>(String(raw['itemTypeDistributions'] || ''), [])
        : [],
      difficultyDistributions: parseJsonOrFallback<BlueprintDistributionRule[]>(String(raw['difficultyDistributions'] || ''), []),
      progressiveSections: isExamPrep
        ? parseJsonOrFallback<BlueprintDifficultySection[]>(String(raw['progressiveSections'] || ''), [])
        : [],
      noDuplicateRules: Boolean(raw['noDuplicateRules']),
      exposureBalancing: Boolean(raw['exposureBalancing']),
      active: Boolean(raw['active']),
      // ---- General training fields ----
      category: String(raw['category'] || '').trim() || undefined,
      targetAudience: String(raw['targetAudience'] || '').trim() || undefined,
      level: (raw['level'] as ExamBlueprint['level']) || undefined,
      deliveryMode: (raw['deliveryMode'] as ExamBlueprint['deliveryMode']) || undefined,
      language: String(raw['language'] || '').trim() || undefined,
      certificateEnabled: Boolean(raw['certificateEnabled']),
      assessmentRequired: Boolean(raw['assessmentRequired']),
      passingScore: Number(raw['passingScore']) || undefined,
      durationHours: Number(raw['durationHours']) || undefined,
      completionRequirements: splitLines(String(raw['completionRequirements'] || '')),
      practicalChecklist: splitLines(String(raw['practicalChecklist'] || '')),
      finalAssessmentEnabled: Boolean(raw['finalAssessmentEnabled']),
      createdBy: current.createdBy || actor,
      createdAt: current.createdAt || new Date(),
      updatedBy: actor,
      updatedAt: new Date(),
    };
  }

  private applyDraft(blueprint: ExamBlueprint): void {
    const blueprintType = blueprint.blueprintType ?? 'exam_prep';
    this.blueprintTypeSignal.set(blueprintType);
    this.form.patchValue({
      id: blueprint.id,
      blueprintType,
      title: blueprint.title,
      slug: blueprint.slug,
      description: blueprint.description,
      assessmentFamily: blueprint.assessmentFamily,
      programId: blueprint.programId,
      jurisdiction: blueprint.jurisdiction,
      examTrack: blueprint.examTrack,
      totalQuestionCount: blueprint.totalQuestionCount,
      caseStudyBundleQuota: blueprint.caseStudyBundleQuota,
      clinicalJudgmentQuota: blueprint.clinicalJudgmentQuota,
      timeBudgetMinutes: blueprint.timeBudgetMinutes,
      sequencingRules: blueprint.sequencingRules.join('\n'),
      courseGroupDistributions: prettyJson(blueprint.courseGroupDistributions),
      moduleDistributions: prettyJson(blueprint.moduleDistributions),
      tagDistributions: prettyJson(blueprint.tagDistributions),
      itemTypeDistributions: prettyJson(blueprint.itemTypeDistributions),
      difficultyDistributions: prettyJson(blueprint.difficultyDistributions),
      progressiveSections: prettyJson(blueprint.progressiveSections),
      noDuplicateRules: blueprint.noDuplicateRules,
      exposureBalancing: blueprint.exposureBalancing,
      active: blueprint.active,
      category: blueprint.category ?? '',
      targetAudience: blueprint.targetAudience ?? '',
      level: blueprint.level ?? 'intermediate',
      deliveryMode: blueprint.deliveryMode ?? 'self_paced',
      language: blueprint.language ?? '',
      certificateEnabled: blueprint.certificateEnabled ?? false,
      assessmentRequired: blueprint.assessmentRequired ?? true,
      passingScore: blueprint.passingScore ?? 70,
      durationHours: blueprint.durationHours ?? 0,
      completionRequirements: (blueprint.completionRequirements ?? []).join('\n'),
      practicalChecklist: (blueprint.practicalChecklist ?? []).join('\n'),
      finalAssessmentEnabled: blueprint.finalAssessmentEnabled ?? true,
    }, { emitEvent: false });
  }
}
