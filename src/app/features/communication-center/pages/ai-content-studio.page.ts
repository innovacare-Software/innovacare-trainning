import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { CommunicationCenterService } from '../data/communication-center.service';
import { CommunicationTemplateDoc, TemplateCategory } from '../contracts/communication.models';

type TemplateEditorForm = {
  title: string;
  summary: string;
  type: TemplateCategory;
  status: CommunicationTemplateDoc['status'];
  subjectTemplate: string;
  previewTextTemplate: string;
  htmlTemplate: string;
  personalizationTokens: string;
  aiAssistEnabled: boolean;
};

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'weekly_digest',
  'organization_report',
  'course_announcement',
  'certification_notice',
  'study_reminder',
  'reactivation',
];

const TEMPLATE_STATUSES: CommunicationTemplateDoc['status'][] = ['draft', 'approval_pending', 'approved', 'archived'];

function createEmptyForm(): TemplateEditorForm {
  return {
    title: '',
    summary: '',
    type: 'weekly_digest',
    status: 'draft',
    subjectTemplate: '',
    previewTextTemplate: '',
    htmlTemplate: '',
    personalizationTokens: '',
    aiAssistEnabled: true,
  };
}

function toEditorForm(template: CommunicationTemplateDoc): TemplateEditorForm {
  return {
    title: String(template.title || ''),
    summary: String(template.summary || ''),
    type: ((template.type || 'weekly_digest') as TemplateCategory),
    status: ((template.status || 'draft') as CommunicationTemplateDoc['status']),
    subjectTemplate: String(template.subjectTemplate || ''),
    previewTextTemplate: String(template.previewTextTemplate || ''),
    htmlTemplate: String(template.htmlTemplate || ''),
    personalizationTokens: Array.isArray(template.personalizationTokens)
      ? template.personalizationTokens.join(', ')
      : '',
    aiAssistEnabled: template.aiAssistEnabled !== false,
  };
}

@Component({
  selector: 'app-ai-content-studio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="cc-panel">
      <header class="cc-panel__head">
        <div>
          <h2>AI Content Studio</h2>
          <p>Production content studio. Live delivery is available from Newsletters and Campaigns via SendGrid.</p>
        </div>
        <span class="cc-badge">SendGrid production active</span>
      </header>

      <p class="cc-message" *ngIf="!orgId() && !state().loading">Select an active organization to load templates.</p>
      <p class="cc-message" *ngIf="state().loading">Loading templates…</p>
      <p class="cc-message" *ngIf="state().error === 'permission-denied'">You do not have permission to read templates for this organization.</p>
      <p class="cc-message" *ngIf="feedback()" [class.cc-message--error]="feedbackTone() === 'error'">{{ feedback() }}</p>

      <div class="cc-layout" *ngIf="orgId() || state().loading">
        <form class="cc-editor" (ngSubmit)="saveTemplate()">
          <div class="cc-editor__head">
            <div>
              <h3>{{ selectedTemplateId() ? 'Edit template' : 'Create template' }}</h3>
              <p>Saves are audited. Templates can be used in newsletter and campaign sends.</p>
            </div>
            <button type="button" class="cc-secondary" (click)="resetEditor()" [disabled]="saving()">New template</button>
          </div>

          <label>
            <span>Title</span>
            <input name="title" [(ngModel)]="form.title" required maxlength="120" />
          </label>

          <label>
            <span>Summary</span>
            <textarea name="summary" [(ngModel)]="form.summary" rows="3" required></textarea>
          </label>

          <div class="cc-fields">
            <label>
              <span>Category</span>
              <select name="type" [(ngModel)]="form.type">
                <option *ngFor="let option of templateCategories" [value]="option">{{ option }}</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" [(ngModel)]="form.status">
                <option *ngFor="let option of templateStatuses" [value]="option">{{ option }}</option>
              </select>
            </label>
          </div>

          <label>
            <span>Subject template</span>
            <input name="subjectTemplate" [(ngModel)]="form.subjectTemplate" required maxlength="160" />
          </label>

          <label>
            <span>Preview text</span>
            <input name="previewTextTemplate" [(ngModel)]="form.previewTextTemplate" maxlength="180" />
          </label>

          <label>
            <span>Personalization tokens</span>
            <input name="personalizationTokens" [(ngModel)]="form.personalizationTokens" placeholder="firstName, courseTitle, certificateName" />
          </label>

          <label>
            <span>HTML template</span>
            <textarea name="htmlTemplate" [(ngModel)]="form.htmlTemplate" rows="10" required></textarea>
          </label>

          <label class="cc-toggle">
            <input type="checkbox" name="aiAssistEnabled" [(ngModel)]="form.aiAssistEnabled" />
            <span>Allow AI assistance for this template</span>
          </label>

          <div class="cc-actions">
            <button type="submit" [disabled]="saving() || !orgId()">
              {{ saving() ? 'Saving…' : (selectedTemplateId() ? 'Update template' : 'Create template') }}
            </button>
            <small>SendGrid delivery available from Newsletters and Campaigns.</small>
          </div>
        </form>

        <div>
          <p class="cc-message" *ngIf="!state().loading && !templates().length">No template exists yet for this organization.</p>
          <div class="cc-grid" *ngIf="templates().length">
            <article *ngFor="let template of templates()" [class.cc-grid__selected]="template.id === selectedTemplateId()">
              <div class="cc-card__head">
                <div>
                  <h3>{{ template.title }}</h3>
                  <p>{{ template.summary }}</p>
                </div>
                <strong>{{ template.status }}</strong>
              </div>
              <dl>
                <div><dt>Category</dt><dd>{{ template.type }}</dd></div>
                <div><dt>Updated</dt><dd>{{ template.updatedAt | date:'medium' }}</dd></div>
                <div><dt>AI assist</dt><dd>{{ template.aiAssistEnabled ? 'Enabled' : 'Disabled' }}</dd></div>
              </dl>
              <div class="cc-card__actions">
                <button type="button" class="cc-secondary" (click)="editTemplate(template)">Edit template</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .cc-panel { border-radius: 18px; border: 1px solid #d7e4f0; background: rgba(255,255,255,.94); padding: 1rem; box-shadow: 0 10px 28px rgba(31,77,120,.08); }
    .cc-panel__head { display: flex; justify-content: space-between; gap: .8rem; align-items: start; }
    .cc-panel__head h2, .cc-grid h3, .cc-editor__head h3 { margin: 0; color: #11304f; }
    .cc-panel__head p, .cc-grid p, .cc-message, .cc-editor__head p { margin: .35rem 0 0; color: #5d7c99; }
    .cc-secondary { border-radius: 10px; border: 1px solid #d8e4f0; background: #eef4fb; color: #5d7c99; padding: .5rem .7rem; font-weight: 700; cursor: pointer; }
    .cc-badge { display: inline-flex; align-items: center; border-radius: 999px; background: #dcfce7; color: #166534; border: 1px solid #a7f3d0; padding: .3rem .75rem; font-size: .76rem; font-weight: 800; white-space: nowrap; }
    .cc-layout { display: grid; grid-template-columns: minmax(320px,1.15fr) minmax(260px,.85fr); gap: 1rem; margin-top: 1rem; }
    .cc-editor, .cc-grid article { border-radius: 14px; border: 1px solid #e0ebf5; background: #fbfdff; padding: 1rem; }
    .cc-editor { display: grid; gap: .85rem; }
    .cc-editor__head, .cc-card__head, .cc-actions, .cc-card__actions { display: flex; justify-content: space-between; gap: .8rem; align-items: start; }
    label { display: grid; gap: .35rem; color: #173b5d; font-weight: 700; }
    label span, dt { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #5d7c99; }
    input, select, textarea { width: 100%; border-radius: 10px; border: 1px solid #d5e1ec; background: #fff; color: #173b5d; padding: .7rem .8rem; font: inherit; }
    textarea { resize: vertical; min-height: 120px; }
    .cc-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .8rem; }
    .cc-toggle { grid-template-columns: auto 1fr; align-items: center; gap: .65rem; }
    .cc-toggle input { width: auto; }
    .cc-actions { align-items: center; }
    .cc-actions button { background: #1f4d78; border: 1px solid #1f4d78; color: #fff; border-radius: 10px; padding: .5rem .7rem; font-weight: 700; cursor: pointer; }
    .cc-actions button:disabled { opacity: .6; cursor: not-allowed; }
    .cc-grid { display: grid; gap: .8rem; }
    .cc-grid__selected { border-color: #8cb2d6; box-shadow: 0 0 0 2px rgba(31,77,120,.08); }
    .cc-grid strong { display: inline-flex; border-radius: 999px; background: #e8f1fa; color: #1f4d78; padding: .3rem .65rem; font-size: .76rem; font-weight: 800; text-transform: uppercase; }
    dl { display: grid; grid-template-columns: repeat(auto-fit,minmax(120px,1fr)); gap: .7rem; margin: .9rem 0 0; }
    dd { margin: .25rem 0 0; color: #173b5d; }
    .cc-message--error { color: #9f2f3f; }
    @media (max-width: 980px) { .cc-layout { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .cc-fields { grid-template-columns: 1fr; } .cc-panel__head, .cc-editor__head, .cc-card__head, .cc-actions, .cc-card__actions { flex-direction: column; } }
  `],
})
export class AiContentStudioPage {
  private readonly auth = inject(AuthService);
  private readonly orgContext = inject(OrgContextService);
  private readonly service = inject(CommunicationCenterService);

  readonly templateCategories = TEMPLATE_CATEGORIES;
  readonly templateStatuses = TEMPLATE_STATUSES;
  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly context = toSignal(this.orgContext.context$, { initialValue: null });

  /** Stable orgId — once set, never reverts to null to prevent layout flicker */
  private readonly _orgId = signal<string | null>(null);
  readonly orgId = this._orgId.asReadonly();

  constructor() {
    effect(() => {
      const resolved = this.context()?.orgId || this.profile()?.orgId || null;
      if (resolved) {
        this._orgId.set(resolved);
      }
    });
  }

  readonly state = toSignal(
    toObservable(this._orgId).pipe(
      switchMap((orgId) => this.service.listTemplates(orgId)),
    ),
    { initialValue: { items: [] as CommunicationTemplateDoc[], loading: true, error: null } },
  );

  readonly templates = computed(() =>
    this.state().items.map((t) => ({
      ...t,
      title: String(t.title || 'Untitled template'),
      summary: String(t.summary || ''),
      type: ((t.type || 'weekly_digest') as TemplateCategory),
      status: ((t.status || 'draft') as CommunicationTemplateDoc['status']),
      updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
      aiAssistEnabled: t.aiAssistEnabled !== false,
    }))
  );

  readonly selectedTemplateId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly feedback = signal('');
  readonly feedbackTone = signal<'success' | 'error'>('success');

  form: TemplateEditorForm = createEmptyForm();

  editTemplate(template: CommunicationTemplateDoc): void {
    this.selectedTemplateId.set(template.id);
    this.form = toEditorForm(template);
    this.feedback.set('');
  }

  resetEditor(): void {
    this.selectedTemplateId.set(null);
    this.form = createEmptyForm();
    this.feedback.set('');
  }

  async saveTemplate(): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) {
      this.feedbackTone.set('error');
      this.feedback.set('Select an active organization before editing templates.');
      return;
    }

    if (!this.form.title.trim() || !this.form.summary.trim() || !this.form.subjectTemplate.trim() || !this.form.htmlTemplate.trim()) {
      this.feedbackTone.set('error');
      this.feedback.set('Title, summary, subject template and HTML template are required.');
      return;
    }

    const payload = {
      title: this.form.title,
      summary: this.form.summary,
      type: this.form.type,
      status: this.form.status,
      subjectTemplate: this.form.subjectTemplate,
      previewTextTemplate: this.form.previewTextTemplate,
      htmlTemplate: this.form.htmlTemplate,
      personalizationTokens: this.parseTokens(this.form.personalizationTokens),
      aiAssistEnabled: this.form.aiAssistEnabled,
    };

    this.saving.set(true);
    this.feedback.set('');

    try {
      if (this.selectedTemplateId()) {
        await this.service.updateTemplateDraft(orgId, this.selectedTemplateId()!, payload);
        this.feedback.set('Template updated successfully.');
      } else {
        const templateId = await this.service.createTemplateDraft(orgId, payload);
        this.selectedTemplateId.set(templateId);
        this.feedback.set('Template created successfully.');
      }
      this.feedbackTone.set('success');
    } catch (err) {
      console.error('Failed to save communication template', err);
      this.feedbackTone.set('error');
      this.feedback.set('Unable to save this template right now.');
    } finally {
      this.saving.set(false);
    }
  }

  private parseTokens(raw: string): string[] {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter((t, i, all) => t.length > 0 && all.indexOf(t) === i);
  }
}
