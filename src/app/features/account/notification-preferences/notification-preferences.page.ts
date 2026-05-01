import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Auth} from '@angular/fire/auth';
import {
  DEFAULT_EMAIL_PREFERENCES,
  EmailNotificationPreference,
  EmailNotificationPreferenceService,
} from './email-notification-preference.service';

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4" style="max-width:620px">
      <h2 class="mb-1 fw-bold">Email Notification Preferences</h2>
      <p class="text-muted mb-4">Manage which email notifications you receive.</p>

      @if (saving()) {
        <div class="alert alert-info">Saving…</div>
      }
      @if (saved()) {
        <div class="alert alert-success">Preferences saved.</div>
      }

      <div class="card mb-3">
        <div class="card-body">
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" id="emailEnabled"
              [(ngModel)]="prefs.emailEnabled" />
            <label class="form-check-label fw-semibold" for="emailEnabled">
              Receive email notifications
            </label>
          </div>

          @if (prefs.emailEnabled) {
            <hr />
            <p class="text-muted small mb-3">Choose which categories to receive:</p>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-purchases"
                [(ngModel)]="prefs.categories.purchases" />
              <label class="form-check-label" for="pref-purchases">
                Purchases &amp; payments
              </label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-courseProgress"
                [(ngModel)]="prefs.categories.courseProgress" />
              <label class="form-check-label" for="pref-courseProgress">
                Course progress
              </label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-assessments"
                [(ngModel)]="prefs.categories.assessments" />
              <label class="form-check-label" for="pref-assessments">
                Assessments &amp; exams
              </label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-instructorReview"
                [(ngModel)]="prefs.categories.instructorReview" />
              <label class="form-check-label" for="pref-instructorReview">
                Instructor review &amp; submissions
              </label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-liveSessions"
                [(ngModel)]="prefs.categories.liveSessions" />
              <label class="form-check-label" for="pref-liveSessions">
                Live sessions
              </label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="pref-marketing"
                [(ngModel)]="prefs.categories.marketing" />
              <label class="form-check-label" for="pref-marketing">
                News &amp; promotions
              </label>
            </div>
          }
        </div>
      </div>

      <button class="btn btn-primary px-4" (click)="save()">
        Save preferences
      </button>
    </div>
  `,
})
export class NotificationPreferencesPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly service = inject(EmailNotificationPreferenceService);

  prefs: EmailNotificationPreference = {...DEFAULT_EMAIL_PREFERENCES, categories: {...DEFAULT_EMAIL_PREFERENCES.categories}};
  saving = signal(false);
  saved = signal(false);

  ngOnInit(): void {
    this.service.preferences$().subscribe((p) => {
      if (p) {
        this.prefs = {
          ...DEFAULT_EMAIL_PREFERENCES,
          ...p,
          categories: {
            ...DEFAULT_EMAIL_PREFERENCES.categories,
            ...(p.categories || {}),
          },
        };
      }
    });
  }

  async save(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.service.savePreferences(uid, this.prefs);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } finally {
      this.saving.set(false);
    }
  }
}
