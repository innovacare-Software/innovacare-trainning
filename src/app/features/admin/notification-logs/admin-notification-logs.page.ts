import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  collectionData,
  where,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import {Functions, httpsCallable} from '@angular/fire/functions';
import {Observable, of} from 'rxjs';

type NotificationLog = {
  id: string;
  eventId: string;
  type: string;
  channel: string;
  status: string;
  provider: string;
  providerMessageId: string;
  recipientEmail: string;
  recipientUserId: string;
  subject: string;
  sentAt: unknown;
  failedAt: unknown;
  errorMessage: string;
  retryCount: number;
  orgId: string;
};

@Component({
  selector: 'app-admin-notification-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h2 class="fw-bold mb-0">Notification Logs</h2>
        <span class="badge bg-secondary">Last 100</span>
      </div>

      @if (loading()) {
        <div class="text-muted py-4 text-center">Loading logs…</div>
      }

      <div class="card">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-dark">
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Provider</th>
                <th>Retries</th>
                <th>Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.id) {
                <tr>
                  <td>
                    <span [class]="statusBadge(log.status)">{{ log.status }}</span>
                  </td>
                  <td><small class="text-muted">{{ log.type }}</small></td>
                  <td><small>{{ log.recipientEmail }}</small></td>
                  <td><small>{{ log.subject }}</small></td>
                  <td><small>{{ log.provider || '—' }}</small></td>
                  <td>{{ log.retryCount || 0 }}</td>
                  <td><small class="text-danger">{{ log.errorMessage || '' }}</small></td>
                  <td>
                    @if (log.status === 'FAILED') {
                      <button class="btn btn-sm btn-outline-warning"
                        (click)="retry(log.eventId)"
                        [disabled]="retrying()">
                        Retry
                      </button>
                    }
                  </td>
                </tr>
              }
              @if (!loading() && logs().length === 0) {
                <tr>
                  <td colspan="8" class="text-center text-muted py-4">No notification logs found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AdminNotificationLogsPage implements OnInit {
  private readonly afs = inject(Firestore);
  private readonly fns = inject(Functions);

  logs = signal<NotificationLog[]>([]);
  loading = signal(true);
  retrying = signal(false);

  ngOnInit(): void {
    const q = query(
      collection(this.afs, 'notificationLogs'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    (collectionData(q, {idField: 'id'}) as Observable<NotificationLog[]>).subscribe((items) => {
      this.logs.set(items);
      this.loading.set(false);
    });
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      SENT: 'badge bg-success',
      FAILED: 'badge bg-danger',
      PENDING: 'badge bg-warning text-dark',
      SKIPPED: 'badge bg-secondary',
      PROCESSING: 'badge bg-info text-dark',
    };
    return map[status] ?? 'badge bg-light text-dark';
  }

  async retry(eventId: string): Promise<void> {
    if (!eventId) return;
    this.retrying.set(true);
    try {
      const fn = httpsCallable(this.fns, 'retryNotificationEvent');
      await fn({eventId});
    } catch (err) {
      console.error('retry notification error', err);
    } finally {
      this.retrying.set(false);
    }
  }
}
