import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { CommunicationCenterService } from '../data/communication-center.service';
import { NewsletterCampaignDoc } from '../contracts/communication.models';

@Component({
  selector: 'app-campaigns-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cc-panel">
      <header class="cc-panel__head">
        <div>
          <p class="cc-kicker">Delivery Operations</p>
          <h2>Campaigns Studio</h2>
          <p>Deploy multi-channel campaigns (Email via SendGrid & SMS via Twilio) with dynamic segmentation and safety controls.</p>
        </div>
        <button type="button" class="cc-btn cc-btn--primary" (click)="toggleCreateForm()">
          @if (showCreateForm()) {
            Close Form
          } @else {
            ⚡ Create Campaign
          }
        </button>
      </header>

      @if (feedback()) {
        <p class="cc-message cc-message--success">{{ feedback() }}</p>
      }
      @if (errorMessage()) {
        <p class="cc-message cc-message--error">{{ errorMessage() }}</p>
      }

      @if (showCreateForm()) {
        <form [formGroup]="campaignForm" (ngSubmit)="createCampaign()" class="cc-form-drawer">
          <h3>New Campaign Setup</h3>
          
          <div class="cc-form-grid">
            <label>
              <span>Campaign Title</span>
              <input formControlName="title" placeholder="e.g. June Retention Digest" required />
            </label>

            <label>
              <span>Summary</span>
              <input formControlName="summary" placeholder="e.g. Re-engage learners inactive for 14 days" required />
            </label>

            <label>
              <span>Target Newsletter</span>
              <select formControlName="newsletterId" required>
                <option value="">-- Select Newsletter --</option>
                @for (item of newsletters(); track item.id) {
                  <option [value]="item.id">{{ item.title }} (Subject: {{ item.subject }})</option>
                }
              </select>
            </label>

            <label>
              <span>Audience Segment</span>
              <select formControlName="audienceSegmentId">
                <option value="">-- All Active Members --</option>
                @for (item of segments(); track item.id) {
                  <option [value]="item.id">{{ item.title }} ({{ item.estimatedAudienceSize }} projected)</option>
                }
              </select>
            </label>

            <label>
              <span>Delivery Channel</span>
              <select formControlName="channel" required>
                <option value="EMAIL">📧 Email (via SendGrid)</option>
                <option value="SMS">💬 SMS (via Twilio)</option>
              </select>
            </label>

            <label>
              <span>Conversion Goal</span>
              <select formControlName="conversionGoal" required>
                <option value="engagement">Engagement</option>
                <option value="completion">Completion</option>
                <option value="retention">Retention</option>
                <option value="revenue">Revenue</option>
                <option value="awareness">Awareness</option>
              </select>
            </label>

            <label class="cc-full-width">
              <span>Tags (comma separated)</span>
              <input formControlName="tagsText" placeholder="retention, risk, active" />
            </label>
          </div>

          <div class="cc-form-actions">
            <button type="submit" class="cc-btn cc-btn--primary" [disabled]="campaignForm.invalid || creating()">
              {{ creating() ? 'Creating...' : 'Save Draft Campaign' }}
            </button>
            <button type="button" class="cc-btn cc-btn--secondary" (click)="toggleCreateForm()">Cancel</button>
          </div>
        </form>
      }

      @if (!orgId()) {
        <p class="cc-message">Select an active organization scope to manage campaigns.</p>
      } @else if (state().loading) {
        <p class="cc-message">Loading campaigns...</p>
      } @else if (state().error === 'permission-denied') {
        <p class="cc-message cc-message--error">Insufficient permissions to manage campaigns for this organization.</p>
      } @else if (!state().items.length) {
        <p class="cc-message">No campaigns configured yet. Click "Create Campaign" to get started.</p>
      } @else {
        <div class="cc-list">
          @for (campaign of state().items; track campaign.id) {
            <article class="cc-card">
              <div class="cc-list__top">
                <div>
                  <div class="cc-title-row">
                    <h3>{{ campaign.title }}</h3>
                    <span class="cc-channel-badge" [class.cc-channel-badge--sms]="campaign.channel === 'SMS'">
                      {{ campaign.channel === 'SMS' ? '💬 SMS' : '📧 Email' }}
                    </span>
                  </div>
                  <p class="cc-card-desc">{{ campaign.summary }}</p>
                </div>
                <span class="cc-status cc-status--{{ campaign.status }}">{{ campaign.status }}</span>
              </div>
              
              <dl>
                <div><dt>Newsletter Source</dt><dd>{{ campaign.newsletterId }}</dd></div>
                <div><dt>Goal</dt><dd class="cc-goal">{{ campaign.conversionGoal }}</dd></div>
                <div><dt>Resolved Recipients</dt><dd>{{ campaign.estimatedRecipients || 'Dynamic resolution at send' }}</dd></div>
                <div><dt>Scheduled Delivery</dt><dd>{{ campaign.scheduledAt || 'Manual / Run Immediately' }}</dd></div>
              </dl>

              <div class="cc-actions">
                @if (campaign.status === 'draft' || campaign.status === 'approval_pending') {
                  <button
                    type="button"
                    class="cc-btn cc-btn--approve"
                    [disabled]="approvingId() === campaign.id"
                    (click)="approveCampaign(campaign)"
                  >
                    {{ approvingId() === campaign.id ? 'Approving...' : '✔️ Approve & Release' }}
                  </button>
                }

                @if (campaign.status === 'approved' || campaign.status === 'scheduled' || campaign.status === 'running') {
                  <button
                    type="button"
                    class="cc-btn cc-btn--send"
                    [disabled]="sendingCampaignId() === campaign.id"
                    (click)="sendCampaign(campaign.id)"
                  >
                    @if (sendingCampaignId() === campaign.id) {
                      Delivering...
                    } @else {
                      🚀 Send Campaign Now
                    }
                  </button>
                }

                @if (campaign.status === 'completed') {
                  <span class="cc-completed-flag">✅ Dispatched</span>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .cc-panel {
        border-radius: 20px;
        border: 1px solid rgba(224, 235, 245, 0.6);
        background: rgba(255, 255, 255, 0.95);
        padding: 1.5rem;
        box-shadow: 0 12px 36px rgba(31, 77, 120, 0.05);
      }
      .cc-panel__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        border-bottom: 1px solid #eef4fb;
        padding-bottom: 1.25rem;
        margin-bottom: 1.25rem;
      }
      .cc-kicker {
        text-transform: uppercase;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        color: #6366f1;
        margin: 0 0 0.25rem;
      }
      .cc-panel__head h2 {
        margin: 0;
        color: #1e293b;
        font-size: 1.6rem;
        font-weight: 800;
      }
      .cc-panel__head p {
        margin: 0.35rem 0 0;
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.5;
      }
      .cc-btn {
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.88rem;
        padding: 0.65rem 1.1rem;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .cc-btn--primary {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #fff;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
      }
      .cc-btn--primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
      }
      .cc-btn--secondary {
        background: #f1f5f9;
        color: #475569;
        border-color: #cbd5e1;
      }
      .cc-btn--secondary:hover:not(:disabled) {
        background: #e2e8f0;
      }
      .cc-btn--approve {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .cc-btn--approve:hover:not(:disabled) {
        background: #d1fae5;
      }
      .cc-btn--send {
        background: #e0e7ff;
        color: #4338ca;
        border-color: #c7d2fe;
      }
      .cc-btn--send:hover:not(:disabled) {
        background: #c7d2fe;
      }
      .cc-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .cc-message {
        padding: 0.9rem 1.1rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 1.25rem;
      }
      .cc-message--success {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .cc-message--error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      .cc-form-drawer {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
        animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .cc-form-drawer h3 {
        margin: 0 0 1rem;
        color: #0f172a;
        font-size: 1.15rem;
        font-weight: 800;
      }
      .cc-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .cc-form-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-weight: 700;
        font-size: 0.84rem;
        color: #334155;
      }
      .cc-form-grid label span {
        color: #475569;
      }
      .cc-form-grid input,
      .cc-form-grid select {
        padding: 0.6rem 0.8rem;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        font: inherit;
        outline: none;
        transition: border-color 0.2s;
      }
      .cc-form-grid input:focus,
      .cc-form-grid select:focus {
        border-color: #6366f1;
      }
      .cc-full-width {
        grid-column: 1 / -1;
      }
      .cc-form-actions {
        display: flex;
        gap: 0.75rem;
      }
      .cc-list {
        display: grid;
        gap: 1rem;
      }
      .cc-card {
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        background: #fff;
        padding: 1.25rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cc-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.04);
        border-color: #cbd5e1;
      }
      .cc-list__top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      .cc-title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .cc-list h3 {
        margin: 0;
        color: #0f172a;
        font-size: 1.2rem;
        font-weight: 800;
      }
      .cc-card-desc {
        margin: 0.35rem 0 0;
        color: #64748b;
        font-size: 0.9rem;
      }
      .cc-channel-badge {
        font-size: 0.72rem;
        font-weight: 800;
        padding: 0.2rem 0.5rem;
        border-radius: 6px;
        background: #e0f2fe;
        color: #0369a1;
      }
      .cc-channel-badge--sms {
        background: #faf5ff;
        color: #6b21a8;
      }
      .cc-status {
        border-radius: 999px;
        padding: 0.25rem 0.65rem;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      .cc-status--draft {
        background: #f1f5f9;
        color: #475569;
      }
      .cc-status--approved {
        background: #d1fae5;
        color: #065f46;
      }
      .cc-status--running {
        background: #fef3c7;
        color: #92400e;
      }
      .cc-status--completed {
        background: #e0e7ff;
        color: #3730a3;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
        margin: 1.1rem 0 0;
        padding: 0.9rem 0;
        border-top: 1px dashed #e2e8f0;
        border-bottom: 1px dashed #e2e8f0;
      }
      dt {
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
      }
      dd {
        margin: 0.15rem 0 0;
        color: #334155;
        font-size: 0.88rem;
        font-weight: 600;
      }
      .cc-goal {
        text-transform: capitalize;
      }
      .cc-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 0.75rem;
      }
      .cc-completed-flag {
        font-size: 0.84rem;
        font-weight: 700;
        color: #475569;
      }
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class CampaignsPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly orgContext = inject(OrgContextService);
  private readonly service = inject(CommunicationCenterService);

  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly context = toSignal(this.orgContext.context$, { initialValue: null });
  readonly orgId = computed(() => this.context()?.orgId || this.profile()?.orgId || null);

  readonly sendingCampaignId = signal<string | null>(null);
  readonly approvingId = signal<string | null>(null);
  readonly creating = signal(false);
  readonly showCreateForm = signal(false);

  readonly feedback = signal('');
  readonly errorMessage = signal('');

  readonly campaignForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    summary: ['', Validators.required],
    newsletterId: ['', Validators.required],
    audienceSegmentId: [''],
    channel: ['EMAIL', Validators.required],
    conversionGoal: ['engagement', Validators.required],
    tagsText: [''],
  });

  readonly state = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listCampaignDrafts(orgId))),
    { initialValue: { items: [] as NewsletterCampaignDoc[], loading: true, error: null } }
  );

  readonly newslettersState = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listNewsletters(orgId))),
    { initialValue: { items: [], loading: true, error: null } }
  );

  readonly newsletters = computed(() => this.newslettersState().items);

  readonly segmentsState = toSignal(
    toObservable(this.orgId).pipe(switchMap((orgId) => this.service.listSegments(orgId))),
    { initialValue: { items: [], loading: true, error: null } }
  );

  readonly segments = computed(() => this.segmentsState().items);

  toggleCreateForm() {
    this.showCreateForm.update((v) => !v);
    this.feedback.set('');
    this.errorMessage.set('');
    if (!this.showCreateForm()) {
      this.campaignForm.reset({
        channel: 'EMAIL',
        conversionGoal: 'engagement',
      });
    }
  }

  async createCampaign(): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) {
      this.errorMessage.set('Select an active organization scope to create campaigns.');
      return;
    }

    if (this.campaignForm.invalid) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    this.creating.set(true);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      const formValue = this.campaignForm.value;
      const tags = formValue.tagsText
        ? formValue.tagsText.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
      
      const payload = {
        title: formValue.title,
        summary: formValue.summary,
        newsletterId: formValue.newsletterId,
        audienceSegmentIds: formValue.audienceSegmentId ? [formValue.audienceSegmentId] : [],
        conversionGoal: formValue.conversionGoal,
        channel: formValue.channel as 'EMAIL' | 'SMS',
        tags,
      };

      await this.service.createCampaignDraft(orgId, payload);
      this.feedback.set('Campaign draft created successfully.');
      this.showCreateForm.set(false);
      this.campaignForm.reset({
        channel: 'EMAIL',
        conversionGoal: 'engagement',
      });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to create the campaign draft.');
    } finally {
      this.creating.set(false);
    }
  }

  async approveCampaign(campaign: NewsletterCampaignDoc): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) return;

    this.approvingId.set(campaign.id);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      await this.service.updateCampaign(orgId, campaign.id, {
        ...campaign,
        status: 'approved',
      });
      this.feedback.set('Campaign released and approved for sending.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to approve campaign.');
    } finally {
      this.approvingId.set(null);
    }
  }

  async sendCampaign(campaignId: string): Promise<void> {
    const orgId = this.orgId();
    if (!orgId) {
      this.errorMessage.set('An active organization is required to send a campaign.');
      return;
    }

    this.sendingCampaignId.set(campaignId);
    this.feedback.set('');
    this.errorMessage.set('');

    try {
      const result = await this.service.sendCampaign(orgId, campaignId, 50);
      this.feedback.set(`Campaign successfully dispatched: ${result.sent} delivered, ${result.failed} failed.`);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to send the campaign.');
    } finally {
      this.sendingCampaignId.set(null);
    }
  }
}
