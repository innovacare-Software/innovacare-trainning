import {CommonModule} from '@angular/common';
import {Component, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {NotificationCenterService} from './notification-center.service';

@Component({
  selector: 'app-notification-preferences-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="notification-preferences">
      <h1>Email notification preferences</h1>
      <p>Configure which transactional emails you want to receive.</p>

      <label class="toggle-row">
        <input type="checkbox" [(ngModel)]="emailEnabled" />
        <span>Enable email notifications</span>
      </label>

      <div class="grid">
        <label class="toggle-row" *ngFor="let item of categoryEntries">
          <input type="checkbox" [(ngModel)]="categoryState[item.key]" [disabled]="!emailEnabled" />
          <span>{{ item.label }}</span>
        </label>
      </div>

      <label class="toggle-row">
        <input type="checkbox" [(ngModel)]="unsubscribedFromMarketing" [disabled]="!emailEnabled" />
        <span>Unsubscribe from marketing messages</span>
      </label>

      <button type="button" (click)="save()">Save preferences</button>
      <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
    </section>
  `,
  styles: [`
    .notification-preferences { max-width: 760px; margin: 24px auto; padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin: 12px 0; }
    .toggle-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .status { margin-top: 12px; color: #0b6b2d; }
    button { margin-top: 8px; }
  `],
})
export class NotificationPreferencesPage {
  private readonly service = inject(NotificationCenterService);
  private readonly preferences = toSignal(this.service.preferences$(), {initialValue: null});

  readonly statusMessage = signal('');

  emailEnabled = true;
  unsubscribedFromMarketing = false;
  categoryState: Record<string, boolean> = {
    purchases: true,
    courseProgress: true,
    assessments: true,
    instructorReview: true,
    liveSessions: true,
    marketing: true,
    adminAlerts: false,
  };

  readonly categoryEntries = [
    {key: 'purchases', label: 'Purchases'},
    {key: 'courseProgress', label: 'Course progress'},
    {key: 'assessments', label: 'Assessments'},
    {key: 'instructorReview', label: 'Instructor review'},
    {key: 'liveSessions', label: 'Live sessions'},
    {key: 'marketing', label: 'Marketing'},
  ];

  constructor() {
    const pref = this.preferences();
    if (pref) {
      this.hydrate(pref);
    }
  }

  private hydrate(pref: any): void {
    this.emailEnabled = pref.emailEnabled !== false;
    this.unsubscribedFromMarketing = pref.unsubscribedFromMarketing === true;
    this.categoryState = {
      ...this.categoryState,
      ...(pref.categories || {}),
    };
  }

  async save(): Promise<void> {
    try {
      await this.service.savePreferences({
        id: '',
        userId: '',
        emailEnabled: this.emailEnabled,
        categories: {
          purchases: !!this.categoryState['purchases'],
          courseProgress: !!this.categoryState['courseProgress'],
          assessments: !!this.categoryState['assessments'],
          instructorReview: !!this.categoryState['instructorReview'],
          liveSessions: !!this.categoryState['liveSessions'],
          marketing: !!this.categoryState['marketing'],
          adminAlerts: !!this.categoryState['adminAlerts'],
        },
        unsubscribedFromMarketing: this.unsubscribedFromMarketing,
      });
      this.statusMessage.set('Preferences saved.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save preferences.');
    }
  }
}
