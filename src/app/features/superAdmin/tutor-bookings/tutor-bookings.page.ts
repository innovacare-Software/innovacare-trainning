import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TutorBooking } from '../../publics/private-tutors/tutor.model';
import { TutorsService } from '../../publics/private-tutors/tutors.service';

@Component({
  standalone: true,
  selector: 'app-super-admin-tutor-bookings-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Tutor Bookings</h1>
        <p>Monitor tutor session commerce, payment state, and fulfillment from a single queue.</p>
      </div>

      <div class="panel filters">
        <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
          <option value="all">All statuses</option>
          <option value="payment_pending">Payment pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="payment_failed">Payment failed</option>
        </select>
        <p class="notice" *ngIf="notice()">{{ notice() }}</p>
      </div>

      <div class="panel bookings" *ngIf="filteredBookings().length; else emptyState">
        <article class="booking" *ngFor="let booking of filteredBookings()">
          <div class="booking__head">
            <div>
              <strong>{{ booking.tutorName || booking.tutorId }}</strong>
              <small>{{ booking.studentName || booking.studentEmail || booking.studentId }}</small>
            </div>
            <span class="booking__status" [attr.data-status]="booking.status">{{ booking.status }}</span>
          </div>
          <div class="booking__meta">
            <span>{{ booking.subject }}</span>
            <span>{{ booking.sessionDate }} {{ booking.sessionTime }}</span>
            <span>{{ booking.durationMinutes }} min</span>
            <span>&#36;{{ booking.totalPrice | number:'1.2-2' }}</span>
          </div>
          <p class="booking__notes" *ngIf="booking.notes">{{ booking.notes }}</p>
          <div class="booking__actions">
            <button class="btn" type="button" *ngIf="booking.status === 'payment_pending'" (click)="markCancelled(booking)">Cancel</button>
            <button class="btn" type="button" *ngIf="booking.status === 'confirmed'" (click)="markCompleted(booking)">Complete</button>
          </div>
        </article>
      </div>

      <ng-template #emptyState>
        <div class="panel empty-state">No tutor bookings matched the current filter.</div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .page { display: grid; gap: 1rem; }
      .page-head h1 { margin: 0; font-size: 1.9rem; }
      .page-head p { margin: 0.35rem 0 0; color: #607080; }
      .panel { background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; box-shadow: 0 8px 20px rgba(2,6,23,.06); }
      .filters { display: flex; align-items: center; gap: 1rem; justify-content: space-between; }
      .filters select { min-width: 220px; padding: 0.7rem 0.9rem; border-radius: 12px; border: 1px solid #dbe3ef; }
      .notice { margin: 0; color: #234a84; font-weight: 600; }
      .bookings { display: grid; gap: 0.9rem; }
      .booking { border: 1px solid #eef2f7; border-radius: 14px; padding: 1rem; background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%); }
      .booking__head { display: flex; justify-content: space-between; gap: 1rem; }
      .booking__head strong { display: block; color: #133659; }
      .booking__head small { color: #607080; }
      .booking__status { text-transform: uppercase; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; padding: 0.35rem 0.65rem; border-radius: 999px; background: #eef2f7; }
      .booking__status[data-status='confirmed'] { background: #eafaf3; color: #17603b; }
      .booking__status[data-status='completed'] { background: #edf6ff; color: #20588d; }
      .booking__status[data-status='cancelled'] { background: #fff2f2; color: #9f2d2d; }
      .booking__status[data-status='payment_pending'] { background: #fff7e8; color: #9a5a00; }
      .booking__meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; }
      .booking__meta span { padding: 0.35rem 0.65rem; border-radius: 999px; background: #edf5fb; color: #24516e; font-size: 0.78rem; font-weight: 700; }
      .booking__notes { margin: 0.8rem 0 0; color: #455a64; }
      .booking__actions { display: flex; gap: 0.6rem; margin-top: 0.85rem; }
      .btn { border: 0; background: linear-gradient(135deg, #0288d1 0%, #01579b 100%); color: white; border-radius: 999px; padding: 0.6rem 0.9rem; font-weight: 800; cursor: pointer; }
      .empty-state { color: #607080; }
      @media (max-width: 720px) { .filters, .booking__head { flex-direction: column; align-items: flex-start; } }
    `,
  ],
})
export class SuperAdminTutorBookingsPage {
  private readonly tutorsSvc = inject(TutorsService);

  readonly statusFilter = signal<'all' | TutorBooking['status']>('all');
  readonly notice = signal('');
  readonly bookings = toSignal(this.tutorsSvc.listAllBookings$(), { initialValue: [] as TutorBooking[] });

  filteredBookings() {
    const status = this.statusFilter();
    return status === 'all'
      ? this.bookings()
      : this.bookings().filter((booking) => booking.status === status);
  }

  async markCancelled(booking: TutorBooking): Promise<void> {
    await this.tutorsSvc.updateBookingStatus(booking.id, 'cancelled');
    this.notice.set('Tutor booking cancelled.');
  }

  async markCompleted(booking: TutorBooking): Promise<void> {
    await this.tutorsSvc.updateBookingStatus(booking.id, 'completed');
    this.notice.set('Tutor booking marked as completed.');
  }
}