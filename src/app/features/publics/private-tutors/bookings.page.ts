import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState } from '@angular/fire/auth';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { TutorBooking } from './tutor.model';
import { TutorsService } from './tutors.service';

@Component({
  standalone: true,
  selector: 'app-tutor-bookings-page',
  imports: [CommonModule, RouterModule],
  template: `
    <section class="tb-page">
      <div class="tb-head">
        <div>
          <a routerLink="/private-tutors" class="tb-back">← Back to tutors</a>
          <h1>My Tutor Bookings</h1>
          <p>Track paid sessions as a learner and manage them when you are the assigned tutor owner.</p>
        </div>
      </div>

      <p class="tb-notice" *ngIf="notice()">{{ notice() }}</p>

      <div class="tb-empty" *ngIf="!bookings().length">
        No tutor bookings found yet.
      </div>

      <div class="tb-list" *ngIf="bookings().length">
        <article class="tb-card" *ngFor="let booking of bookings()">
          <div class="tb-card__top">
            <div>
              <strong>{{ booking.tutorName || 'Private tutoring session' }}</strong>
              <small>{{ booking.subject }} · {{ booking.sessionDate }} · {{ booking.sessionTime }}</small>
            </div>
            <span class="tb-status" [attr.data-status]="booking.status">{{ labelForStatus(booking.status) }}</span>
          </div>

          <div class="tb-meta">
            <span>{{ booking.durationMinutes }} min</span>
            <span>{{ booking.sessionType === 'group' ? 'Group' : '1-on-1' }}</span>
            <span>&#36;{{ booking.totalPrice | number:'1.2-2' }}</span>
            <span *ngIf="isTutorOwner(booking)">Tutor view</span>
            <span *ngIf="!isTutorOwner(booking)">Learner view</span>
          </div>

          <p class="tb-notes" *ngIf="booking.notes">{{ booking.notes }}</p>

          <div class="tb-actions">
            <a *ngIf="booking.meetingUrl" [href]="booking.meetingUrl" target="_blank" rel="noreferrer" class="tb-link">Open meeting</a>
            <button type="button" class="tb-btn tb-btn--ghost" *ngIf="canCancelAsLearner(booking)" (click)="cancelBooking(booking)">Cancel</button>
            <button type="button" class="tb-btn" *ngIf="canCancelAsTutor(booking)" (click)="cancelBooking(booking)">Cancel as tutor</button>
            <button type="button" class="tb-btn" *ngIf="canCompleteAsTutor(booking)" (click)="completeBooking(booking)">Mark completed</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .tb-page { max-width: 1080px; margin: 0 auto; padding: 2rem 1.25rem 4rem; display: grid; gap: 1rem; }
      .tb-head h1 { margin: 0.35rem 0 0; font-size: 2rem; color: #10253f; }
      .tb-head p { margin: 0.45rem 0 0; color: #5b6d81; }
      .tb-back { color: #0a9db8; text-decoration: none; font-weight: 700; }
      .tb-notice { margin: 0; padding: 0.85rem 1rem; border-radius: 0.9rem; background: #eef7ff; color: #1b4d78; }
      .tb-empty { padding: 1.25rem; border: 1px dashed #c9d6e3; border-radius: 1rem; background: white; color: #5b6d81; }
      .tb-list { display: grid; gap: 1rem; }
      .tb-card { background: white; border: 1px solid #e2ebf3; border-radius: 1.2rem; padding: 1.15rem; box-shadow: 0 12px 28px rgba(11,31,58,0.06); }
      .tb-card__top { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
      .tb-card__top strong { display: block; color: #10253f; font-size: 1rem; }
      .tb-card__top small { color: #5b6d81; }
      .tb-status { border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; background: #eef2f7; color: #425569; }
      .tb-status[data-status='confirmed'] { background: #eafaf3; color: #17603b; }
      .tb-status[data-status='completed'] { background: #edf6ff; color: #20588d; }
      .tb-status[data-status='cancelled'] { background: #fff2f2; color: #9f2d2d; }
      .tb-status[data-status='payment_pending'] { background: #fff7e8; color: #9a5a00; }
      .tb-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
      .tb-meta span { padding: 0.32rem 0.65rem; border-radius: 999px; background: #f4f8fb; color: #4a5e78; font-size: 0.78rem; font-weight: 700; }
      .tb-notes { margin: 0.85rem 0 0; color: #445569; }
      .tb-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.95rem; }
      .tb-btn, .tb-link { border: 0; border-radius: 999px; padding: 0.62rem 0.9rem; font-weight: 800; cursor: pointer; text-decoration: none; }
      .tb-btn { background: linear-gradient(135deg, #0a9db8, #12b5d0); color: white; }
      .tb-btn--ghost { background: #f4f8fb; color: #204866; }
      .tb-link { background: #eef7ff; color: #20588d; }
      @media (max-width: 720px) { .tb-card__top { flex-direction: column; } }
    `,
  ],
})
export class TutorBookingsPage {
  private readonly tutorsSvc = inject(TutorsService);
  private readonly auth = inject(Auth);

  readonly notice = signal<string>('');
  readonly currentUid = toSignal(authState(this.auth).pipe(map((user) => user?.uid ?? '')), {
    initialValue: '',
  });
  readonly bookings = toSignal(this.tutorsSvc.listCurrentUserBookings$(), { initialValue: [] as TutorBooking[] });

  labelForStatus(status: TutorBooking['status']): string {
    switch (status) {
      case 'payment_pending':
        return 'Payment pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Payment issue';
    }
  }

  isTutorOwner(booking: TutorBooking): boolean {
    return !!this.currentUid() && booking.tutorOwnerUid === this.currentUid();
  }

  canCancelAsLearner(booking: TutorBooking): boolean {
    return booking.studentId === this.currentUid() && ['payment_pending', 'confirmed'].includes(booking.status);
  }

  canCancelAsTutor(booking: TutorBooking): boolean {
    return this.isTutorOwner(booking) && ['payment_pending', 'confirmed'].includes(booking.status);
  }

  canCompleteAsTutor(booking: TutorBooking): boolean {
    return this.isTutorOwner(booking) && booking.status === 'confirmed';
  }

  async cancelBooking(booking: TutorBooking): Promise<void> {
    await this.tutorsSvc.updateBookingStatus(booking.id, 'cancelled');
    this.notice.set('Booking updated.');
  }

  async completeBooking(booking: TutorBooking): Promise<void> {
    await this.tutorsSvc.updateBookingStatus(booking.id, 'completed');
    this.notice.set('Booking marked as completed.');
  }
}