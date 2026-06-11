import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { CommunicationCenterService } from '../data/communication-center.service';
import { NewsletterDoc } from '../contracts/communication.models';

@Component({
  selector: 'app-newsletter-builder-page',
  imports: [CommonModule, DatePipe, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cc-panel">
      <header class="cc-panel__head">
        <div>
          <h2>Newsletters</h2>
          <p>Firestore-backed newsletter drafts with controlled SendGrid email & Twilio SMS test delivery.</p>
        </div>
        <div class="cc-head-actions">
          <button type="button" class="cc-btn-primary" (click)="startCreate()" [disabled]="!orgId()">
            ⚡ Create Newsletter
          </button>
        </div>
      </header>

      @if (!orgId()) {
        <p class="cc-message">Select an active organization to list persisted newsletter drafts.</p>
      }

      @if (feedback()) {
        <p class="cc-message cc-message--success">{{ feedback() }}</p>
      }
      @if (errorMessage()) {
        <p class="cc-message cc-message--error">{{ errorMessage() }}</p>
      }

      @if (showForm()) {
        <form [formGroup]="newsletterForm" (ngSubmit)="saveNewsletter()" class="cc-form-drawer">
          <div class="cc-drawer-header">
            <h3>{{ editingNewsletterId() ? 'Edit Newsletter Draft' : 'Create New Newsletter Draft' }}</h3>
            <button type="button" class="cc-btn-close" (click)="showForm.set(false)">✕</button>
          </div>
          
          <div class="cc-form-grid">
            <label>
              <span>Newsletter Title (Internal) *</span>
              <input formControlName="title" placeholder="e.g. Q3 Wound Care Best Practices Update" required />
            </label>

            <label>
              <span>Summary *</span>
              <input formControlName="summary" placeholder="e.g. Summary of recent guidelines and pressure injury updates" required />
            </label>

            <label>
              <span>Subject Line *</span>
              <input formControlName="subject" placeholder="e.g. Essential Wound Care Tips for Nurses" required />
            </label>

            <label>
              <span>Preview Text</span>
              <input formControlName="previewText" placeholder="e.g. Inside: New staging guidelines, nutrition tips, and debridement notes." />
            </label>

            <label>
              <span>Linked Template</span>
              <select formControlName="templateId">
                <option [ngValue]="null">-- Custom Draft --</option>
                @for (tpl of templatesState().items; track tpl.id) {
                  <option [value]="tpl.id">{{ tpl.title }}</option>
                }
              </select>
            </label>

            <label>
              <span>Audience Segments</span>
              <select formControlName="audienceSegmentIds" multiple class="cc-select-multiple">
                @for (seg of segmentsState().items; track seg.id) {
                  <option [value]="seg.id">{{ seg.title }}</option>
                }
              </select>
              <small class="cc-hint">Hold Ctrl / Cmd to select multiple segments.</small>
            </label>
          </div>

          <label class="cc-textarea-label">
            <span>HTML Body Content *</span>
            <textarea formControlName="html" rows="12" placeholder="<h1>New Guidelines Available</h1><p>Learn more about staging...</p>" required></textarea>
          </label>

          <div class="cc-form-actions">
            <button type="button" class="cc-btn-secondary" (click)="showForm.set(false)">Cancel</button>
            <button type="submit" class="cc-btn-primary" [disabled]="newsletterForm.invalid || loading()">
              {{ loading() ? 'Saving...' : 'Save Draft' }}
            </button>
          </div>
        </form>
      }

      @if (state().loading) {
        <p class="cc-message">Loading newsletter drafts…</p>
      }
      @if (state().error === 'permission-denied') {
        <p class="cc-message cc-message--error">You do not have permission to read newsletter drafts for this organization.</p>
      }
      @if (!state().loading && !state().error && orgId() && !state().items.length) {
        <p class="cc-message">No newsletter draft exists yet for this organization.</p>
      }

      @if (state().items.length) {
        <div class="cc-list">
          @for (newsletter of state().items; track newsletter.id) {
            <article [class.approved]="newsletter.status === 'approved'">
              <div class="cc-list__top">
                <div>
                  <h3>{{ newsletter.title }}</h3>
                  <p>{{ newsletter.summary }}</p>
                </div>
                <span class="cc-status" [class.approved]="newsletter.status === 'approved'">
                  {{ newsletter.status }}
                </span>
              </div>
              <dl>
                <div><dt>Subject</dt><dd>{{ newsletter.subject }}</dd></div>
                <div><dt>Template</dt><dd>{{ getTemplateTitle(newsletter.templateId) }}</dd></div>
                <div><dt>Segments</dt><dd>{{ getSegmentTitles(newsletter.audienceSegmentIds) }}</dd></div>
                <div><dt>Updated</dt><dd>{{ newsletter.updatedAt | date:'medium' }}</dd></div>
              </dl>
              <div class="cc-actions-row">
                <div class="cc-action-group">
                  <button type="button" class="cc-btn-action" (click)="startEdit(newsletter)" [disabled]="loading()">
                    ✏️ Edit Draft
                  </button>
                  @if (newsletter.status !== 'approved') {
                    <button type="button" class="cc-btn-approve" (click)="approveNewsletter(newsletter.id)" [disabled]="loading()">
                      ✅ Approve
                    </button>
                  }
                </div>
                <div class="cc-test-group">
                  <button type="button" class="cc-btn-test" (click)="sendEmailTest(newsletter.id)" [disabled]="sendingNewsletterId() === newsletter.id">
                    📧 SendGrid Email Test
                  </button>
                  <button type="button" class="cc-btn-test" (click)="sendSmsTest(newsletter.id)" [disabled]="sendingNewsletterId() === newsletter.id">
                    💬 Twilio SMS Test
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .cc-panel { border-radius: 18px; border: 1px solid #d7e4f0; background: rgba(255,255,255,.94); padding: 1rem; box-shadow: 0 10px 28px rgba(31, 77, 120, .08); }
      .cc-panel__head, .cc-list__top { display: flex; justify-content: space-between; gap: .8rem; align-items: start; }
      .cc-panel__head h2, .cc-list h3 { margin: 0; color: #11304f; }
      .cc-panel__head p, .cc-list p { margin: .35rem 0 0; color: #5d7c99; }
      .cc-list { display: grid; gap: .8rem; margin-top: 1rem; }
      .cc-list article { border-radius: 14px; border: 1px solid #e0ebf5; background: #fbfdff; padding: 1rem; transition: border-color 0.2s; }
      .cc-list article.approved { border-left: 4px solid #10b981; }
      .cc-status { border-radius: 999px; background: #e8f1fa; color: #1e4b74; padding: .3rem .65rem; font-size: .76rem; font-weight: 800; text-transform: uppercase; }
      .cc-status.approved { background: #d1fae5; color: #065f46; }
      dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .7rem; margin: .9rem 0 0; }
      dt { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #5d7c99; }
      dd { margin: .25rem 0 0; color: #173b5d; }
      .cc-message { margin: 1rem 0 0; color: #5d7c99; }
      .cc-message--success { color: #17603a; font-weight: 600; }
      .cc-message--error { color: #8e1f3f; font-weight: 600; }
      
      .cc-head-actions { display: flex; gap: 0.5rem; }
      .cc-btn-primary {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }
      .cc-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
      }
      .cc-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .cc-btn-secondary {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .cc-btn-secondary:hover {
        background: #e2e8f0;
      }
      .cc-form-drawer {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem;
        margin: 1rem 0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      }
      .cc-drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .cc-btn-close {
        background: none;
        border: none;
        font-size: 1.1rem;
        cursor: pointer;
        color: #64748b;
      }
      .cc-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .cc-form-grid label, .cc-textarea-label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-weight: 700;
        font-size: 0.84rem;
        color: #334155;
      }
      .cc-form-grid input, .cc-form-grid select, .cc-textarea-label textarea {
        padding: 0.6rem 0.8rem;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        font: inherit;
        outline: none;
      }
      .cc-select-multiple {
        min-height: 80px;
      }
      .cc-hint {
        font-size: 0.75rem;
        font-weight: 400;
        color: #64748b;
      }
      .cc-textarea-label {
        margin-bottom: 1.25rem;
      }
      .cc-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }
      .cc-actions-row {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f5f9;
      }
      .cc-action-group, .cc-test-group {
        display: flex;
        gap: 0.5rem;
      }
      .cc-btn-action, .cc-btn-approve, .cc-btn-test {
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        padding: 0.45rem 0.75rem;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        background: #fff;
        transition: all 0.2s ease;
      }
      .cc-btn-action:hover {
        background: #f8fafc;
      }
      .cc-btn-approve {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .cc-btn-approve:hover {
        background: #d1fae5;
      }
      .cc-btn-test {
        background: #f0f9ff;
        color: #0369a1;
        border-color: #bae6fd;
      }
      .cc-btn-test:hover {
        background: #e0f2fe;
      }
    `,
  ],
})
export class NewsletterBuilderPage {
  private readonly auth = inject(AuthService);
  private readonly orgContext = inject(OrgContextService);
  private readonly service = inject(CommunicationCenterService);
  private readonly fb = inject(FormBuilder);

  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly context = toSignal(this.orgContext.context$, { initialValue: null });
  readonly orgId = computed(() => this.context()?.orgId || this.profile()?.orgId || null);
  
  readonly sendingNewsletterId = signal<string | null>(null);
  readonly feedback = signal('');
  readonly errorMessage = signal('');
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly editingNewsletterId = signal<string | null>(null);

  readonly state = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listNewsletters(orgId))),
    { initialValue: { items: [], loading: true, error: null } },
  );

  readonly segmentsState = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listSegments(orgId))),
    { initialValue: { items: [], loading: true, error: null } },
  );

  readonly templatesState = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listTemplates(orgId))),
    { initialValue: { items: [], loading: true, error: null } },
  );

  newsletterForm = this.fb.group({
    title: ['', Validators.required],
    summary: ['', Validators.required],
    subject: ['', Validators.required],
    previewText: [''],
    html: ['', Validators.required],
    templateId: [null as string | null],
    audienceSegmentIds: [[] as string[]],
  });

  startCreate() {
    this.editingNewsletterId.set(null);
    this.newsletterForm.reset({
      title: '',
      summary: '',
      subject: '',
      previewText: '',
      html: '',
      templateId: null,
      audienceSegmentIds: [],
    });
    this.showForm.set(true);
    this.feedback.set('');
    this.errorMessage.set('');
  }

  startEdit(newsletter: NewsletterDoc) {
    this.editingNewsletterId.set(newsletter.id);
    this.newsletterForm.patchValue({
      title: newsletter.title || '',
      summary: newsletter.summary || '',
      subject: newsletter.subject || '',
      previewText: newsletter.previewText || '',
      html: newsletter.html || '',
      templateId: newsletter.templateId || null,
      audienceSegmentIds: newsletter.audienceSegmentIds || [],
    });
    this.showForm.set(true);
    this.feedback.set('');
    this.errorMessage.set('');
  }

  async saveNewsletter(): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) return;

    if (this.newsletterForm.invalid) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    this.loading.set(true);
    this.feedback.set('');
    this.errorMessage.set('');

    const formVal = this.newsletterForm.value;
    const payload = {
      title: formVal.title || '',
      summary: formVal.summary || '',
      subject: formVal.subject || '',
      previewText: formVal.previewText || '',
      html: formVal.html || '',
      templateId: formVal.templateId || null,
      audienceSegmentIds: formVal.audienceSegmentIds || [],
    };

    try {
      const nid = this.editingNewsletterId();
      if (nid) {
        await this.service.updateNewsletterDraft(orgId, nid, payload);
        this.feedback.set('Newsletter draft updated successfully.');
      } else {
        const newId = await this.service.createNewsletterDraft(orgId, payload);
        this.feedback.set(`Newsletter draft created successfully (ID: ${newId}).`);
      }
      this.showForm.set(false);
      this.newsletterForm.reset();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to save newsletter draft.');
    } finally {
      this.loading.set(false);
    }
  }

  async approveNewsletter(newsletterId: string): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) return;

    this.loading.set(true);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      await this.service.updateNewsletterDraft(orgId, newsletterId, { status: 'approved' });
      this.feedback.set('Newsletter approved successfully.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to approve newsletter.');
    } finally {
      this.loading.set(false);
    }
  }

  async sendEmailTest(newsletterId: string): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) return;

    const defaultEmail = String(this.profile()?.email || '').trim();
    const email = window.prompt('Enter recipient email for SendGrid test:', defaultEmail);
    if (email === null) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      this.errorMessage.set('Email is required for testing.');
      return;
    }

    this.sendingNewsletterId.set(newsletterId);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      const result = await this.service.sendNewsletterTest(orgId, newsletterId, cleanEmail);
      this.feedback.set(`Test email sent to ${result.sentTo} via ${result.provider}.`);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to send the test email.');
    } finally {
      this.sendingNewsletterId.set(null);
    }
  }

  async sendSmsTest(newsletterId: string): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) return;

    const phone = window.prompt('Enter mobile number to send Twilio SMS test (e.g. +1234567890):');
    if (phone === null) return;

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      this.errorMessage.set('Phone number is required for SMS test.');
      return;
    }

    this.sendingNewsletterId.set(newsletterId);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      const result = await this.service.sendNewsletterTestSms(orgId, newsletterId, cleanPhone);
      this.feedback.set(`Test SMS sent to ${result.sentTo} via ${result.provider}.`);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to send the test SMS.');
    } finally {
      this.sendingNewsletterId.set(null);
    }
  }

  getTemplateTitle(templateId?: string | null): string {
    if (!templateId) return 'Custom draft';
    const match = this.templatesState().items.find((t) => t.id === templateId);
    return match ? match.title : templateId;
  }

  getSegmentTitles(segmentIds?: string[]): string {
    if (!segmentIds || !segmentIds.length) return 'None';
    return segmentIds
      .map((sid) => {
        const match = this.segmentsState().items.find((s) => s.id === sid);
        return match ? match.title : sid;
      })
      .join(', ');
  }
}
