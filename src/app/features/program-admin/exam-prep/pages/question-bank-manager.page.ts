import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
  selector: 'app-question-bank-manager-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="eyebrow">Question Governance</p>
          <h1>Question Bank and Case Study Manager</h1>
          <p>Filter authored content, duplicate items, publish review-ready entries, and import/export JSON snapshots for QA and migration workflows.</p>
        </div>
        <div class="actions">
          <a routerLink="/program-admin/exam-prep/library-preview" class="btn">Library Preview</a>
          <a routerLink="/program-admin/exam-prep/question-bank/new" class="btn primary">New Question</a>
          <a routerLink="/program-admin/exam-prep/case-studies/new" class="btn">New Case Study</a>
        </div>
      </header>

      <section class="filters panel">
        <input [formControl]="searchControl" placeholder="Search stem, lead-in, tags, source title" />
        <select [formControl]="workflowControl">
          <option value="all">All workflow states</option>
          <option *ngFor="let option of workflowOptions" [value]="option">{{ option }}</option>
        </select>
        <select [formControl]="itemTypeControl">
          <option value="all">All item types</option>
          <option *ngFor="let option of itemTypeOptions" [value]="option">{{ option }}</option>
        </select>
        <input [formControl]="tagControl" placeholder="Tag contains" />
      </section>

      <section class="grid">
        <article class="panel">
          <div class="panel-head">
            <h2>Question Items</h2>
            <span>{{ filteredItems().length }} results</span>
          </div>
          <div class="list" *ngIf="filteredItems().length; else emptyItems">
            <div class="row" *ngFor="let item of filteredItems(); trackBy: trackById">
              <div>
                <strong>{{ item.stem || 'Untitled question' }}</strong>
                <span>{{ item.moduleTitle }} · {{ item.itemType }} · {{ item.workflowStatus }}</span>
                <small>Tags: {{ commaList(item.tags) || 'none' }}</small>
              </div>
              <div class="row-actions">
                <a [routerLink]="['/program-admin/exam-prep/question-bank', item.id, 'edit']">Edit</a>
                <button type="button" (click)="duplicateItem(item)">Duplicate</button>
                <button type="button" (click)="publishItem(item.id)">Publish</button>
                <button type="button" class="warn" (click)="retireItem(item.id)">Retire</button>
                <button type="button" class="warn" (click)="deleteItem(item.id)">Delete</button>
              </div>
            </div>
          </div>
          <ng-template #emptyItems>
            <p class="empty">No question items match the current filters.</p>
          </ng-template>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Case Study Bundles</h2>
            <span>{{ filteredCaseStudies().length }} results</span>
          </div>
          <div class="list" *ngIf="filteredCaseStudies().length; else emptyCases">
            <div class="row" *ngFor="let bundle of filteredCaseStudies(); trackBy: trackById">
              <div>
                <strong>{{ bundle.title || 'Untitled case study' }}</strong>
                <span>{{ bundle.moduleTitle }} · {{ bundle.childItemIds.length }} child items · {{ bundle.workflowStatus }}</span>
                <small>Sequence: {{ bundle.sequenceOrder.join(', ') || 'n/a' }}</small>
              </div>
              <div class="row-actions">
                <a [routerLink]="['/program-admin/exam-prep/case-studies', bundle.id, 'edit']">Edit</a>
                <button type="button" (click)="publishCase(bundle.id)">Publish</button>
                <button type="button" class="warn" (click)="retireCase(bundle.id)">Retire</button>
                <button type="button" class="warn" (click)="deleteCase(bundle.id)">Delete</button>
              </div>
            </div>
          </div>
          <ng-template #emptyCases>
            <p class="empty">No case studies match the current filters.</p>
          </ng-template>
        </article>
      </section>

      <section class="panel io-panel">
        <div class="panel-head">
          <h2>JSON Import / Export</h2>
          <div class="actions">
            <button type="button" class="btn" (click)="exportJson()">Export Current Snapshot</button>
            <button type="button" class="btn primary" (click)="importJson()">Import JSON</button>
          </div>
        </div>
        <textarea [formControl]="jsonControl" rows="14" placeholder="Paste { items: [...], caseStudies: [...] } JSON here"></textarea>
        <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
      </section>
    </section>
  `,
  styles: [
    `
      .page { display: grid; gap: 1rem; }
      .head, .panel {
        border: 1px solid #d6e3f1;
        border-radius: 1rem;
        background: #fff;
        padding: 1rem 1.1rem;
      }
      .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #587695; font-weight: 800; }
      .head h1 { margin: 0.25rem 0; }
      .head p { margin: 0; color: #617e99; max-width: 60ch; }
      .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .btn {
        border: 1px solid #c8d9eb;
        border-radius: 0.7rem;
        background: #f8fbff;
        color: #224f7d;
        text-decoration: none;
        padding: 0.55rem 0.8rem;
        cursor: pointer;
        font-weight: 700;
      }
      .btn.primary { background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; border-color: transparent; }
      .filters { display: grid; gap: 0.65rem; grid-template-columns: 2fr 1fr 1fr 1fr; }
      .filters input, .filters select, textarea {
        border: 1px solid #c9dbee;
        border-radius: 0.8rem;
        padding: 0.75rem 0.85rem;
        font: inherit;
      }
      .grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel-head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; }
      .panel-head h2 { margin: 0; }
      .panel-head span { color: #64809b; font-weight: 700; }
      .list { margin-top: 0.8rem; display: grid; gap: 0.6rem; }
      .row {
        border: 1px solid #e2ebf5;
        border-radius: 0.8rem;
        padding: 0.8rem;
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
      }
      .row strong { display: block; color: #173f68; }
      .row span, .row small, .empty, .status { display: block; color: #64809b; margin-top: 0.2rem; }
      .row-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: flex-start; }
      .row-actions a, .row-actions button {
        border: 1px solid #c9dbee;
        border-radius: 0.58rem;
        background: #f8fbff;
        color: #224f7d;
        text-decoration: none;
        padding: 0.35rem 0.55rem;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .row-actions .warn { color: #8a3344; border-color: #efc5ce; background: #fff4f6; }
      .io-panel textarea { width: 100%; min-height: 240px; margin-top: 0.75rem; }
      @media (max-width: 980px) {
        .filters, .grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class QuestionBankManagerPage {
  private readonly examPrep = inject(ExamPrepAdminService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly workflowControl = new FormControl<'all' | string>('all', { nonNullable: true });
  readonly itemTypeControl = new FormControl<'all' | string>('all', { nonNullable: true });
  readonly tagControl = new FormControl('', { nonNullable: true });
  readonly jsonControl = new FormControl('', { nonNullable: true });
  readonly statusMessage = signal('');

  readonly questionBank = toSignal(this.examPrep.questionBank$, { initialValue: [] });
  readonly caseStudies = toSignal(this.examPrep.caseStudies$, { initialValue: [] });
  readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)), { initialValue: '' });
  readonly workflowValue = toSignal(this.workflowControl.valueChanges.pipe(startWith(this.workflowControl.value)), { initialValue: 'all' });
  readonly itemTypeValue = toSignal(this.itemTypeControl.valueChanges.pipe(startWith(this.itemTypeControl.value)), { initialValue: 'all' });
  readonly tagValue = toSignal(this.tagControl.valueChanges.pipe(startWith(this.tagControl.value)), { initialValue: '' });

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const workflow = this.workflowValue();
    const itemType = this.itemTypeValue();
    const tag = this.tagValue().trim().toLowerCase();

    return this.questionBank().filter((item) => {
      const haystack = [item.stem, item.leadInQuestion, item.moduleTitle, item.sourceReferenceTitle, ...item.tags]
        .join(' ')
        .toLowerCase();

      return (
        (!term || haystack.includes(term)) &&
        (workflow === 'all' || item.workflowStatus === workflow) &&
        (itemType === 'all' || item.itemType === itemType) &&
        (!tag || item.tags.some((entry) => entry.toLowerCase().includes(tag)))
      );
    });
  });

  readonly filteredCaseStudies = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const workflow = this.workflowValue();
    const tag = this.tagValue().trim().toLowerCase();

    return this.caseStudies().filter((bundle) => {
      const haystack = [bundle.title, bundle.moduleTitle, bundle.slug].join(' ').toLowerCase();
      return (
        (!term || haystack.includes(term)) &&
        (workflow === 'all' || bundle.workflowStatus === workflow) &&
        (!tag || bundle.sharedContext.trendUpdates.some((entry) => entry.toLowerCase().includes(tag)))
      );
    });
  });

  readonly workflowOptions = EXAM_PREP_WORKFLOW_OPTIONS;
  readonly itemTypeOptions = EXAM_PREP_ITEM_TYPE_OPTIONS;

  commaList(values: string[]): string {
    return formatCommaSeparated(values);
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  async duplicateItem(item: QuestionBankItem): Promise<void> {
    await this.wrapAction(() => this.examPrep.duplicateQuestionBankItem(item), 'Question duplicated.');
  }

  async publishItem(itemId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.bulkUpdateWorkflowStatus('questionBank', [itemId], 'published'), 'Question published.');
  }

  async retireItem(itemId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.bulkUpdateWorkflowStatus('questionBank', [itemId], 'retired'), 'Question retired.');
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.deleteQuestionBankItem(itemId), 'Question deleted.');
  }

  async publishCase(caseStudyId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.bulkUpdateWorkflowStatus('caseStudies', [caseStudyId], 'published'), 'Case study published.');
  }

  async retireCase(caseStudyId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.bulkUpdateWorkflowStatus('caseStudies', [caseStudyId], 'retired'), 'Case study retired.');
  }

  async deleteCase(caseStudyId: string): Promise<void> {
    await this.wrapAction(() => this.examPrep.deleteCaseStudyBundle(caseStudyId), 'Case study deleted.');
  }

  exportJson(): void {
    this.jsonControl.setValue(this.examPrep.exportQuestionBankJson(this.filteredItems(), this.filteredCaseStudies()));
    this.statusMessage.set('Exported the currently filtered question-bank snapshot.');
  }

  async importJson(): Promise<void> {
    await this.wrapAction(async () => {
      const result = await this.examPrep.importQuestionBankJson(this.jsonControl.value);
      this.statusMessage.set(`Imported ${result.importedItems} question items and ${result.importedCaseStudies} case studies.`);
    });
  }

  private async wrapAction(action: () => Promise<unknown>, successMessage?: string): Promise<void> {
    this.statusMessage.set('');
    try {
      await action();
      if (successMessage) {
        this.statusMessage.set(successMessage);
      }
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Operation failed.');
    }
  }
}