import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LabAdminService } from '../../services/lab-admin.service';
import { LabSessionService } from '../../services/lab-session.service';
import { LabDefinitionService } from '../../services/lab-definition.service';
import { AuthService } from '../../../../core/auth';
import { LabSubmission } from '../../models/lab-session.model';

@Component({
  selector: 'app-lab-submission-review-page',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="review-page">
      <!-- Header -->
      <header class="review-header">
        <div class="review-header__inner">
          <h1>📋 Lab Submission Review</h1>
          <div class="review-tabs">
            <button class="rtab" [class.rtab--active]="filter() === 'PENDING'"
              (click)="filter.set('PENDING')" id="filter-pending">
              Pending Review
              @if (pendingCount() > 0) {
                <span class="rtab-badge">{{ pendingCount() }}</span>
              }
            </button>
            <button class="rtab" [class.rtab--active]="filter() === 'REVIEWED'"
              (click)="filter.set('REVIEWED')" id="filter-reviewed">
              Reviewed
            </button>
            <button class="rtab" [class.rtab--active]="filter() === 'NEEDS_REVISION'"
              (click)="filter.set('NEEDS_REVISION')" id="filter-revision">
              Needs Revision
            </button>
            <button class="rtab" [class.rtab--active]="filter() === 'ALL'"
              (click)="filter.set('ALL')" id="filter-all">
              All
            </button>
          </div>
        </div>
      </header>

      <!-- Submission List -->
      <div class="review-body">
        @if (filteredSubmissions().length === 0) {
          <div class="review-empty">
            <div class="review-empty__icon">📭</div>
            <h3>No submissions to review</h3>
            <p>All caught up! Learner submissions will appear here when labs are submitted.</p>
          </div>
        } @else {
          <div class="submission-grid">
            @for (sub of filteredSubmissions(); track sub.id) {
              <article class="submission-card" [class.submission-card--passed]="sub.passed" [class.submission-card--failed]="!sub.passed">
                <div class="submission-card__header">
                  <div class="sub-user">
                    <span class="sub-avatar">👤</span>
                    <div>
                      <span class="sub-name">{{ sub.displayName ?? sub.userId }}</span>
                      <span class="sub-lab">Lab: {{ sub.labId }}</span>
                    </div>
                  </div>
                  <span class="sub-status" [class]="'sub-status--' + sub.instructorReviewStatus.toLowerCase()">
                    {{ sub.instructorReviewStatus }}
                  </span>
                </div>

                <div class="submission-card__score">
                  <div class="score-ring" [class.score-ring--pass]="sub.passed">
                    {{ sub.maxScore > 0 ? ((sub.score / sub.maxScore) * 100 | number:'1.0-0') : 0 }}%
                  </div>
                  <div class="score-detail">
                    <span class="score-pts">{{ sub.score }} / {{ sub.maxScore }} pts</span>
                    <span class="score-result" [class.pass-text]="sub.passed" [class.fail-text]="!sub.passed">
                      {{ sub.passed ? '✓ PASSED' : '✗ FAILED' }}
                    </span>
                    <span class="sub-date">
                      {{ sub.submittedAt?.toDate ? (sub.submittedAt!.toDate() | date:'MMM d, y HH:mm') : 'Unknown date' }}
                    </span>
                  </div>
                </div>

                <!-- Existing Feedback -->
                @if (sub.instructorFeedback) {
                  <div class="existing-feedback">
                    <span class="feedback-label">Instructor Feedback:</span>
                    <p class="feedback-text">{{ sub.instructorFeedback }}</p>
                  </div>
                }

                <!-- Review Form (shown when not yet reviewed) -->
                @if (sub.instructorReviewStatus === 'PENDING' || reviewingId() === sub.id) {
                  <div class="review-form">
                    <textarea
                      class="feedback-input"
                      [(ngModel)]="feedbackTexts[sub.id]"
                      placeholder="Write instructor feedback for this learner..."
                      rows="3"
                      [id]="'feedback-' + sub.id">
                    </textarea>
                    <div class="review-form-actions">
                      <button class="review-btn review-btn--approve"
                        (click)="review(sub, 'REVIEWED')"
                        [disabled]="isReviewing()"
                        [id]="'approve-' + sub.id">
                        ✓ Approve & Send Feedback
                      </button>
                      <button class="review-btn review-btn--revision"
                        (click)="review(sub, 'NEEDS_REVISION')"
                        [disabled]="isReviewing()"
                        [id]="'revise-' + sub.id">
                        ↩ Request Revision
                      </button>
                    </div>
                  </div>
                }

                @if (sub.instructorReviewStatus !== 'PENDING' && reviewingId() !== sub.id) {
                  <button class="re-review-btn" (click)="reviewingId.set(sub.id)" [id]="'rereview-' + sub.id">
                    ✏️ Edit Feedback
                  </button>
                }
              </article>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .review-page { min-height: 100vh; background: #0a0d14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }

    .review-header { background: #0d1117; border-bottom: 1px solid #21262d; padding: 1.5rem 2rem; }
    .review-header__inner { max-width: 1200px; margin: 0 auto; }
    .review-header h1 { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0 0 1rem; }
    .review-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .rtab {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: #64748b; padding: 0.4rem 0.9rem; border-radius: 6px; font-size: 0.8rem;
      cursor: pointer; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 0.4rem;
    }
    .rtab:hover, .rtab--active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
    .rtab-badge {
      background: #ef4444; color: white; font-size: 0.65rem; font-weight: 800;
      padding: 0.1rem 0.4rem; border-radius: 100px;
    }

    .review-body { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .review-empty {
      text-align: center; padding: 4rem 2rem; color: #475569;
    }
    .review-empty__icon { font-size: 3rem; margin-bottom: 1rem; }
    .review-empty h3 { color: #94a3b8; margin: 0 0 0.5rem; }
    .review-empty p { font-size: 0.85rem; }

    .submission-grid { display: grid; gap: 1.25rem; }
    .submission-card {
      background: #0d1117; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem;
      transition: border-color 0.15s;
    }
    .submission-card--passed { border-left: 3px solid #4ade80; }
    .submission-card--failed { border-left: 3px solid #f87171; }

    .submission-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .sub-user { display: flex; align-items: center; gap: 0.75rem; }
    .sub-avatar { font-size: 1.5rem; }
    .sub-name { display: block; font-size: 0.9rem; font-weight: 700; color: #e2e8f0; }
    .sub-lab  { display: block; font-size: 0.72rem; color: #64748b; font-family: 'JetBrains Mono', monospace; }

    .sub-status {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 0.25rem 0.6rem; border-radius: 100px;
    }
    .sub-status--pending       { background: rgba(245,158,11,0.12); color: #fbbf24; }
    .sub-status--reviewed      { background: rgba(34,197,94,0.12);  color: #4ade80; }
    .sub-status--needs_revision{ background: rgba(239,68,68,0.12);  color: #f87171; }

    .submission-card__score { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1rem; }
    .score-ring {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(239,68,68,0.1); border: 3px solid rgba(239,68,68,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 800; color: #f87171; flex-shrink: 0;
    }
    .score-ring--pass { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #4ade80; }
    .score-detail { display: flex; flex-direction: column; gap: 0.2rem; }
    .score-pts { font-size: 0.875rem; font-weight: 700; color: #e2e8f0; }
    .score-result { font-size: 0.78rem; font-weight: 700; }
    .pass-text { color: #4ade80; } .fail-text { color: #f87171; }
    .sub-date { font-size: 0.72rem; color: #475569; }

    .existing-feedback {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem;
    }
    .feedback-label { font-size: 0.7rem; font-weight: 700; color: #475569; text-transform: uppercase; }
    .feedback-text { font-size: 0.82rem; color: #94a3b8; margin: 0.4rem 0 0; line-height: 1.5; }

    .review-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .feedback-input {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: #e2e8f0; padding: 0.6rem 0.9rem; font-size: 0.85rem;
      outline: none; font-family: inherit; resize: vertical; line-height: 1.5;
    }
    .feedback-input:focus { border-color: rgba(99,102,241,0.4); }
    .review-form-actions { display: flex; gap: 0.75rem; }
    .review-btn {
      padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; border: none; font-family: inherit; transition: all 0.15s;
    }
    .review-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .review-btn--approve   { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    .review-btn--revision  { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; }

    .re-review-btn {
      background: none; border: none; color: #475569; font-size: 0.78rem; cursor: pointer;
      padding: 0; font-family: inherit;
    }
    .re-review-btn:hover { color: #94a3b8; }
  `],
})
export class LabSubmissionReviewPageComponent {
  private readonly adminSvc = inject(LabAdminService);
  private readonly auth     = inject(AuthService);

  readonly allSubmissions = toSignal(this.adminSvc.getAllSubmissions(), { initialValue: [] });
  readonly filter       = signal<string>('PENDING');
  readonly reviewingId  = signal<string | null>(null);
  readonly isReviewing  = signal(false);
  feedbackTexts: Record<string, string> = {};

  readonly filteredSubmissions = computed(() => {
    const f = this.filter();
    const all = this.allSubmissions();
    if (f === 'ALL') return all;
    return all.filter((s) => s.instructorReviewStatus === f);
  });

  readonly pendingCount = computed(
    () => this.allSubmissions().filter((s) => s.instructorReviewStatus === 'PENDING').length,
  );

  async review(sub: LabSubmission, status: 'REVIEWED' | 'NEEDS_REVISION'): Promise<void> {
    this.isReviewing.set(true);
    const feedback = this.feedbackTexts[sub.id] ?? '';
    const reviewerId = this.auth.currentUid ?? '';
    try {
      await this.adminSvc.reviewSubmission(sub.id, reviewerId, feedback, status);
      this.reviewingId.set(null);
      delete this.feedbackTexts[sub.id];
    } catch {
      console.error('Review failed');
    } finally {
      this.isReviewing.set(false);
    }
  }
}
