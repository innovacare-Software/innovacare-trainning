import {CommonModule} from '@angular/common';
import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NotificationCenterService} from './notification-center.service';

@Component({
  selector: 'app-admin-notification-logs-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="notification-logs">
      <h1>Email notification logs</h1>
      <p>Operational view of transactional emails sent by the notification processor.</p>

      <table *ngIf="rows().length; else emptyState">
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Provider</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows()">
            <td>{{ row.type }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.recipientEmail }}</td>
            <td>{{ row.subject }}</td>
            <td>{{ row.provider || '-' }}</td>
            <td>{{ row.errorMessage || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <p>No notification logs yet.</p>
      </ng-template>
    </section>
  `,
  styles: [`
    .notification-logs { max-width: 1100px; margin: 24px auto; padding: 16px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d8d8d8; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f6f8fb; }
  `],
})
export class AdminNotificationLogsPage {
  private readonly service = inject(NotificationCenterService);
  readonly rows = toSignal(this.service.logs$(150), {initialValue: []});
}
