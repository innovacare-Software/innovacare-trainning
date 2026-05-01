import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { startWith } from 'rxjs';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import {
  EXAM_PREP_ITEM_TYPE_OPTIONS,
  EXAM_PREP_WORKFLOW_OPTIONS,
  formatCommaSeparated,
} from './exam-prep-admin.defaults';
import type { CaseStudyBundle, QuestionBankItem } from '../models/exam-prep.models';

@Component({
  selector: 'app-exam-prep-library-preview-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="page">
      <header class="hero">
        <div>
          <p class="eyebrow">Seed Library Preview</p>
          <h1>Generated Question Library Explorer</h1>
          <p>
            Review generated questions and linked case studies before mapping them into learner-facing assessments.
            This view is tuned for rapid QA on large seeded batches.
          </p>
        </div>
        <div class="hero-actions">
          <a routerLink="/program-admin/exam-prep/question-bank" class="btn">Question Manager</a>
          <a routerLink="/program-admin/exam-prep/assessments" class="btn primary">Assessment Catalog</a>
        </div>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <span>Filtered questions</span>
          <strong>{{ filteredItems().length }}</strong>
          <small>{{ generatedItemsCount() }} generated items in org scope</small>
        </article>
        <article class="stat-card">
          <span>Generated case studies</span>
          <strong>{{ generatedCaseStudiesCount() }}</strong>
          <small>{{ linkedCaseStudyCount() }} linked to current filter</small>
        </article>
        <article class="stat-card">
          <span>Programs</span>
          <strong>{{ uniqueProgramCount() }}</strong>
          <small>Published coverage across generated banks</small>
        </article>
        <article class="stat-card accent">
          <span>Preview selection</span>
          <strong>{{ activeItem() ? activeItem()!.itemType : 'none' }}</strong>
          <small>{{ activeItem() ? activeItem()!.moduleTitle : 'Select an item to preview' }}</small>
        </article>
      </section>

      <section class="filters panel">
        <input [formControl]="searchControl" placeholder="Search stem, lead-in, tags, module, source title" />
        <select [formControl]="programControl">
          <option value="all">All programs</option>
          <option *ngFor="let program of programOptions()" [value]="program.id">{{ program.title }}</option>
        </select>
        <select [formControl]="courseGroupControl">
          <option value="all">All course groups</option>
          <option *ngFor="let group of courseGroupOptions()" [value]="group.id">{{ group.title }}</option>
        </select>
        <select [formControl]="moduleControl">
          <option value="all">All modules</option>
          <option *ngFor="let module of moduleOptions()" [value]="module.id">{{ module.title }}</option>
        </select>
        <select [formControl]="itemTypeControl">
          <option value="all">All item types</option>
          <option *ngFor="let option of itemTypeOptions" [value]="option">{{ option }}</option>
        </select>
        <select [formControl]="workflowControl">
          <option value="all">All workflow states</option>
          <option *ngFor="let option of workflowOptions" [value]="option">{{ option }}</option>
        </select>
        <select [formControl]="waveControl">
          <option value="all">All waves</option>
          <option *ngFor="let option of waveOptions()" [value]="option">{{ option }}</option>
        </select>
        <select [formControl]="libraryControl">
          <option value="generated">Generated only</option>
          <option value="all">All sources</option>
          <option value="case-linked">Case-linked only</option>
          <option value="standalone">Standalone only</option>
        </select>
      </section>

      <section class="content-grid">
        <article class="panel list-panel">
          <div class="panel-head">
            <h2>Questions</h2>
            <span>{{ filteredItems().length }} results</span>
          </div>
          <div class="list" *ngIf="filteredItems().length; else emptyState">
            <button
              type="button"
              class="row"
              [class.row--active]="item.id === selectedItemId()"
              *ngFor="let item of filteredItems(); trackBy: trackById"
              (click)="selectItem(item.id)"
            >
              <div>
                <strong>{{ item.stem }}</strong>
                <span>{{ item.programTitle }} · {{ item.moduleTitle }} · {{ item.itemType }}</span>
                <small>{{ item.parentCaseId ? 'Case-linked' : 'Standalone' }} · {{ item.workflowStatus }} · Wave: {{ detectWave(item) }} · Tags: {{ commaList(item.tags) }}</small>
              </div>
            </button>
          </div>
          <ng-template #emptyState>
            <p class="empty">No items match the current generated-library filters.</p>
          </ng-template>
        </article>

        <article class="panel preview-panel" *ngIf="activeItem() as item; else selectPrompt">
          <div class="panel-head">
            <h2>Item Preview</h2>
            <a [routerLink]="['/program-admin/exam-prep/question-bank', item.id, 'edit']">Edit item</a>
          </div>
          <div class="meta-ribbon">
            <span>{{ item.programTitle }}</span>
            <span>{{ item.courseGroupTitle }}</span>
            <span>{{ item.moduleTitle }}</span>
            <span>{{ item.difficulty }}</span>
            <span>{{ item.cognitiveLevel }}</span>
            <span>{{ detectWave(item) }}</span>
          </div>
          <p class="lead">{{ item.leadInQuestion }}</p>
          <p class="stem">{{ item.stem }}</p>
          <p class="scenario" *ngIf="item.scenarioText">{{ item.scenarioText }}</p>

          <section class="choice-block">
            <h3>Choices</h3>
            <div class="choice-list">
              <div class="choice" *ngFor="let choice of item.choices">
                <strong>{{ choice.id }}</strong>
                <div>
                  <p>{{ choice.text }}</p>
                  <small [class.correct]="item.correctAnswerKey.includes(choice.id)">
                    {{ item.correctAnswerKey.includes(choice.id) ? 'Correct' : 'Distractor' }}
                    <span *ngIf="choice.rationale"> · {{ choice.rationale }}</span>
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section class="detail-grid">
            <div>
              <span>Learning objectives</span>
              <strong>{{ commaList(item.learningObjectives) }}</strong>
            </div>
            <div>
              <span>Remediation tags</span>
              <strong>{{ commaList(item.remediationTags) }}</strong>
            </div>
            <div>
              <span>Reference</span>
              <strong>{{ item.sourceReferenceTitle }}</strong>
            </div>
            <div>
              <span>Workflow</span>
              <strong>{{ item.workflowStatus }}</strong>
            </div>
          </section>

          <section class="case-block" *ngIf="activeCaseStudy() as caseStudy">
            <div class="panel-head">
              <h3>Linked Case Study</h3>
              <a [routerLink]="['/program-admin/exam-prep/case-studies', caseStudy.id, 'edit']">Edit case</a>
            </div>
            <p class="case-title">{{ caseStudy.title }}</p>
            <p>{{ caseStudy.sharedContext.vignette }}</p>
            <small>{{ caseStudy.childItemIds.length }} linked child items · Sequence {{ caseStudy.sequenceOrder.join(', ') }}</small>
          </section>
        </article>

        <ng-template #selectPrompt>
          <article class="panel preview-panel empty-card">
            <h2>Select a question</h2>
            <p>Choose a generated question from the list to inspect stem, choices, rationale, and linked case-study context.</p>
          </article>
        </ng-template>
      </section>
    </section>
  `,
  styles: [
    `
      .page { display: grid; gap: 1rem; }
      .hero, .panel {
        border: 1px solid #d7e3ef;
        border-radius: 1rem;
        background: #fff;
        padding: 1.05rem 1.15rem;
        box-shadow: 0 6px 18px rgba(15, 53, 92, 0.06);
      }
      .hero { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: #567697; font-weight: 800; }
      .hero h1 { margin: 0.25rem 0; }
      .hero p { margin: 0; max-width: 66ch; color: #5d7994; line-height: 1.55; }
      .hero-actions { display: flex; gap: 0.55rem; flex-wrap: wrap; align-items: flex-start; }
      .btn {
        border: 1px solid #c7d8ea;
        border-radius: 0.7rem;
        background: #f8fbff;
        color: #1f4f7d;
        text-decoration: none;
        padding: 0.55rem 0.8rem;
        font-weight: 700;
      }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .stats-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .stat-card {
        border: 1px solid #dce8f3;
        border-radius: 0.9rem;
        background: linear-gradient(180deg, #ffffff, #f8fbff);
        padding: 0.95rem 1rem;
        display: grid;
        gap: 0.2rem;
      }
      .stat-card span, .stat-card small { color: #64809b; }
      .stat-card strong { font-size: 1.55rem; color: #163f69; }
      .stat-card.accent { background: linear-gradient(145deg, #eef7ff, #fff8ee); }
      .filters {
        display: grid;
        gap: 0.65rem;
        grid-template-columns: 2fr repeat(6, minmax(0, 1fr));
      }
      .filters input, .filters select {
        border: 1px solid #c9dbee;
        border-radius: 0.8rem;
        padding: 0.72rem 0.85rem;
        font: inherit;
      }
      .content-grid { display: grid; gap: 1rem; grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.35fr); }
      .panel-head { display: flex; justify-content: space-between; gap: 0.7rem; align-items: center; }
      .panel-head h2, .panel-head h3 { margin: 0; }
      .panel-head a { color: #1a6cb5; text-decoration: none; font-weight: 700; }
      .list { margin-top: 0.8rem; display: grid; gap: 0.55rem; max-height: 70vh; overflow: auto; }
      .row {
        border: 1px solid #e2ebf5;
        border-radius: 0.85rem;
        padding: 0.8rem;
        text-align: left;
        background: #fbfdff;
        cursor: pointer;
      }
      .row--active { border-color: #89b8e6; background: linear-gradient(180deg, #eef6ff, #fbfdff); }
      .row strong { display: block; color: #173f68; }
      .row span, .row small, .empty { display: block; color: #64809b; margin-top: 0.22rem; }
      .preview-panel { display: grid; gap: 0.95rem; align-content: start; }
      .meta-ribbon, .detail-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .meta-ribbon span {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 0.75rem;
        border-radius: 999px;
        background: #f4f9ff;
        border: 1px solid #d9e7f4;
        color: #305270;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .lead, .stem, .scenario, .case-title, .empty-card p { margin: 0; color: #45617c; line-height: 1.6; }
      .stem { color: #173f68; font-size: 1.02rem; }
      .choice-block h3 { margin: 0; }
      .choice-list { display: grid; gap: 0.55rem; }
      .choice {
        border: 1px solid #e3edf7;
        border-radius: 0.85rem;
        padding: 0.75rem 0.8rem;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.8rem;
        align-items: start;
      }
      .choice strong { color: #173f68; }
      .choice p, .choice small { margin: 0; color: #5f7c97; }
      .choice small.correct { color: #1c7a51; font-weight: 700; }
      .detail-grid div {
        flex: 1 1 220px;
        border: 1px solid #e3edf7;
        border-radius: 0.8rem;
        padding: 0.75rem;
      }
      .detail-grid span { display: block; color: #68839d; font-size: 0.82rem; }
      .detail-grid strong { display: block; margin-top: 0.22rem; color: #173f68; }
      .case-block {
        border: 1px solid #dce8f3;
        border-radius: 0.9rem;
        background: linear-gradient(180deg, #fbfdff, #f6fbff);
        padding: 0.9rem;
        display: grid;
        gap: 0.45rem;
      }
      .case-block small { color: #64809b; }
      .empty-card { min-height: 280px; align-content: center; }
      @media (max-width: 1200px) {
        .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .content-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 720px) {
        .filters, .stats-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ExamPrepLibraryPreviewPage {
  private readonly examPrep = inject(ExamPrepAdminService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly programControl = new FormControl('all', { nonNullable: true });
  readonly courseGroupControl = new FormControl('all', { nonNullable: true });
  readonly moduleControl = new FormControl('all', { nonNullable: true });
  readonly itemTypeControl = new FormControl('all', { nonNullable: true });
  readonly workflowControl = new FormControl('all', { nonNullable: true });
  readonly waveControl = new FormControl('all', { nonNullable: true });
  readonly libraryControl = new FormControl<'generated' | 'all' | 'case-linked' | 'standalone'>('generated', {
    nonNullable: true,
  });
  readonly selectedItemId = signal('');

  readonly questionBank = toSignal(this.examPrep.questionBank$, { initialValue: [] });
  readonly caseStudies = toSignal(this.examPrep.caseStudies$, { initialValue: [] });
  readonly programs = toSignal(this.examPrep.programs$, { initialValue: [] });
  readonly courseGroups = toSignal(this.examPrep.courseGroups$, { initialValue: [] });
  readonly modules = toSignal(this.examPrep.modules$, { initialValue: [] });
  readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)), { initialValue: '' });
  readonly selectedProgram = toSignal(this.programControl.valueChanges.pipe(startWith(this.programControl.value)), { initialValue: 'all' });
  readonly selectedCourseGroup = toSignal(this.courseGroupControl.valueChanges.pipe(startWith(this.courseGroupControl.value)), { initialValue: 'all' });
  readonly selectedModule = toSignal(this.moduleControl.valueChanges.pipe(startWith(this.moduleControl.value)), { initialValue: 'all' });
  readonly selectedItemType = toSignal(this.itemTypeControl.valueChanges.pipe(startWith(this.itemTypeControl.value)), { initialValue: 'all' });
  readonly selectedWorkflow = toSignal(this.workflowControl.valueChanges.pipe(startWith(this.workflowControl.value)), { initialValue: 'all' });
  readonly selectedWave = toSignal(this.waveControl.valueChanges.pipe(startWith(this.waveControl.value)), { initialValue: 'all' });
  readonly selectedLibraryMode = toSignal(this.libraryControl.valueChanges.pipe(startWith(this.libraryControl.value)), {
    initialValue: 'generated' as const,
  });

  readonly generatedItems = computed(() =>
    this.questionBank().filter((item) => (item.sourceAuthority || '').toLowerCase().includes('generated'))
  );
  readonly generatedCaseStudies = computed(() =>
    this.caseStudies().filter((bundle) => bundle.sourceReferences.some((ref) => (ref.sourceAuthority || '').toLowerCase().includes('generated')))
  );
  readonly caseStudyMap = computed(() => new Map(this.caseStudies().map((bundle) => [bundle.id, bundle])));
  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const program = this.selectedProgram();
    const courseGroup = this.selectedCourseGroup();
    const module = this.selectedModule();
    const itemType = this.selectedItemType();
    const workflow = this.selectedWorkflow();
    const wave = this.selectedWave();
    const libraryMode = this.selectedLibraryMode();

    return this.questionBank().filter((item) => {
      const isGenerated = (item.sourceAuthority || '').toLowerCase().includes('generated');
      const detectedWave = this.detectWave(item);
      const matchesLibrary =
        libraryMode === 'all'
          ? true
          : libraryMode === 'generated'
            ? isGenerated
            : libraryMode === 'case-linked'
              ? Boolean(item.parentCaseId)
              : !item.parentCaseId;
      const haystack = [
        item.stem,
        item.leadInQuestion,
        item.moduleTitle,
        item.programTitle,
        item.courseGroupTitle,
        item.sourceReferenceTitle,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase();

      return (
        matchesLibrary &&
        (!term || haystack.includes(term)) &&
        (program === 'all' || item.programId === program) &&
        (courseGroup === 'all' || item.courseGroupId === courseGroup) &&
        (module === 'all' || item.moduleId === module) &&
        (itemType === 'all' || item.itemType === itemType) &&
        (wave === 'all' || detectedWave === wave) &&
        (workflow === 'all' || item.workflowStatus === workflow)
      );
    });
  });
  readonly activeItem = computed(() => this.filteredItems().find((item) => item.id === this.selectedItemId()) ?? this.filteredItems()[0] ?? null);
  readonly activeCaseStudy = computed(() => {
    const activeItem = this.activeItem();
    if (!activeItem?.parentCaseId) {
      return null;
    }
    return this.caseStudyMap().get(activeItem.parentCaseId) ?? null;
  });
  readonly generatedItemsCount = computed(() => this.generatedItems().length);
  readonly generatedCaseStudiesCount = computed(() => this.generatedCaseStudies().length);
  readonly linkedCaseStudyCount = computed(() => {
    const caseIds = new Set(this.filteredItems().map((item) => item.parentCaseId).filter(Boolean));
    return caseIds.size;
  });
  readonly uniqueProgramCount = computed(() => new Set(this.generatedItems().map((item) => item.programId)).size);
  readonly waveOptions = computed(() => {
    const waves = new Set(this.generatedItems().map((item) => this.detectWave(item)));
    return [...waves].sort((left, right) => left.localeCompare(right));
  });
  readonly programOptions = computed(() => this.programs());
  readonly courseGroupOptions = computed(() => this.courseGroups());
  readonly moduleOptions = computed(() => {
    const selectedCourseGroup = this.selectedCourseGroup();
    return this.modules().filter((module) => selectedCourseGroup === 'all' || module.courseGroupId === selectedCourseGroup);
  });
  readonly itemTypeOptions = EXAM_PREP_ITEM_TYPE_OPTIONS;
  readonly workflowOptions = EXAM_PREP_WORKFLOW_OPTIONS;

  constructor() {
    effect(() => {
      const filtered = this.filteredItems();
      const selectedId = this.selectedItemId();
      if (!filtered.length) {
        if (selectedId) {
          this.selectedItemId.set('');
        }
        return;
      }
      if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
        this.selectedItemId.set(filtered[0].id);
      }
    });
  }

  selectItem(itemId: string): void {
    this.selectedItemId.set(itemId);
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  commaList(values: string[] | undefined | null): string {
    return formatCommaSeparated(values ?? []);
  }

  detectWave(item: QuestionBankItem): string {
    const explicitWaveTag = (item.tags || []).find((tag) => tag.includes('wave') || tag.includes('targeted'));
    if (explicitWaveTag) {
      return explicitWaveTag;
    }

    const reference = String(item.sourceReferenceTitle || '').toLowerCase();
    if (reference.includes('targeted clinical wave')) {
      return 'targeted-clinical-wave';
    }

    return 'core-library';
  }
}