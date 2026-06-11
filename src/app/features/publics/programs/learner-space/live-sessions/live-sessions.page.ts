import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map, switchMap } from 'rxjs';
import { LanguageService } from '../../../../../core/language.service';
import { ProgramEnrollmentsService } from '../../program-enrollments.service';
import {
  PROGRAM_LIVE_SESSION_ACCESS_LABELS,
  ProgramLiveSession,
  ProgramLiveSessionAccessMode,
  ProgramLiveSessionBooking,
  SESSION_TYPE_LABELS,
} from '../../program.models';
import { LearnerLiveSessionsService } from '../services/learner-live-sessions.service';

@Component({
  selector: 'app-live-sessions-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="ls-page">
      <div class="ls-hero">
        <div>
          <h1 class="ls-title">{{ t('programs.learnerSpace.liveSessions.title') }}</h1>
          <p class="ls-subtitle">
            {{ t('programs.learnerSpace.liveSessions.subtitle') }}
          </p>
        </div>
        <div class="ls-hero-note">
          <strong>{{ upcomingCount() }}</strong>
          <span>{{ t('programs.learnerSpace.liveSessions.upcomingSessions') }}</span>
        </div>
      </div>

      @if (message()) {
        <div class="ls-feedback ls-feedback--success">{{ message() }}</div>
      }

      @if (error()) {
        <div class="ls-feedback ls-feedback--error">{{ error() }}</div>
      }

      @if (sessions().length > 0) {
        <div class="ls-grid">
          @for (s of sessions(); track s.id) {
            <div class="ls-card" [class.ls-past]="isPast(s)">
              <div class="ls-card-header">
                <span class="ls-session-type">{{ sessionTypeLabel(s.sessionType) }}</span>
                <span class="ls-access-pill" [class.ls-access-pill--paid]="accessMode(s) === accessModeEnum.PAID">
                  {{ accessModeLabel(s) }}
                </span>
                @if (s.required) { <span class="ls-required">{{ t('programs.learnerSpace.liveSessions.required') }}</span> }
              </div>
              <h3 class="ls-session-title">{{ s.title }}</h3>
              @if (s.description) { <p class="ls-session-desc">{{ s.description }}</p> }
              <div class="ls-session-meta">
                <span>{{ toDate(s.startAt) | date:'MMM d, y · h:mm a' }}</span>
                @if (s.instructorName) { <span>{{ t('programs.learnerSpace.liveSessions.educator') }}: {{ s.instructorName }}</span> }
                @if (s.capacity) { <span>{{ t('programs.learnerSpace.liveSessions.seats', { count: s.capacity }) }}</span> }
                <span>{{ statusLabel(s) }}</span>
                @if (isPaidSession(s)) { <span>{{ priceLabel(s) }}</span> }
                @if (bookingFor(s); as booking) {
                  <span class="ls-booking-state">{{ t('programs.learnerSpace.liveSessions.reservation') }}: {{ bookingStateLabel(booking) }}</span>
                }
              </div>
              <div class="ls-card-footer">
                @if (canJoin(s)) {
                  <button
                    type="button"
                    class="ls-action ls-action--join"
                    [disabled]="busySessionId() === s.id"
                    (click)="joinSession(s)"
                  >
                    {{ busySessionId() === s.id ? t('programs.learnerSpace.liveSessions.opening') : t('programs.learnerSpace.liveSessions.joinSession') }}
                  </button>
                } @else if (canReserve(s)) {
                  <button
                    type="button"
                    class="ls-action ls-action--reserve"
                    [disabled]="busySessionId() === s.id"
                    (click)="reserve(s)"
                  >
                    {{ busySessionId() === s.id ? t('programs.learnerSpace.liveSessions.reserving') : reserveLabel(s) }}
                  </button>
                } @else if (canPay(s)) {
                  <button
                    type="button"
                    class="ls-action ls-action--pay"
                    [disabled]="busySessionId() === s.id"
                    (click)="pay(s)"
                  >
                    {{ busySessionId() === s.id ? t('programs.learnerSpace.liveSessions.redirecting') : t('programs.learnerSpace.liveSessions.payReserve') }}
                  </button>
                } @else {
                  <span class="ls-state-chip">{{ lockedLabel(s) }}</span>
                }
              </div>
              @if (isPast(s)) {
                <span class="ls-past-label">{{ t('programs.learnerSpace.liveSessions.sessionEnded') }}</span>
              }
            </div>
          }
        </div>
      } @else {
        <div class="ls-empty"><span>LS</span><p>{{ t('programs.learnerSpace.liveSessions.empty') }}</p></div>
      }
    </div>
  `,
  styles: [`
    .ls-page { max-width: 980px; display: grid; gap: 1rem; }
    .ls-hero {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      padding: 1.2rem 1.25rem;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(8, 47, 73, 0.96), rgba(14, 116, 144, 0.9));
      color: #f8fafc;
      box-shadow: 0 20px 45px rgba(8, 47, 73, 0.18);
    }
    .ls-title { font-size: 1.55rem; font-weight: 800; color: inherit; margin: 0 0 .35rem; }
    .ls-subtitle { font-size: .9rem; color: rgba(248, 250, 252, 0.82); margin: 0; max-width: 42rem; line-height: 1.55; }
    .ls-hero-note {
      min-width: 9rem;
      border-radius: 16px;
      padding: .85rem 1rem;
      background: rgba(255, 255, 255, 0.14);
      display: grid;
      gap: .15rem;
      text-align: center;
    }
    .ls-hero-note strong { font-size: 1.45rem; }
    .ls-hero-note span { font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
    .ls-feedback {
      border-radius: 14px;
      padding: .85rem 1rem;
      font-size: .85rem;
      font-weight: 600;
    }
    .ls-feedback--success { background: #ecfdf5; color: #166534; border: 1px solid #a7f3d0; }
    .ls-feedback--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
    .ls-card {
      background: linear-gradient(180deg, #ffffff, #f8fbff);
      border: 1px solid #d7e5f2;
      border-radius: 18px; padding: 1.2rem; display: flex; flex-direction: column; gap: .55rem;
      transition: border-color .2s, transform .2s; box-shadow: 0 14px 35px rgba(15, 23, 42, .06);
    }
    .ls-card:hover { border-color: #0ea5b7; transform: translateY(-2px); }
    .ls-past { opacity: .7; }

    .ls-card-header { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .ls-session-type {
      font-size: .62rem; font-weight: 700; text-transform: uppercase;
      padding: .22rem .55rem; border-radius: 999px; background: #dbeafe; color: #1d4ed8;
    }
    .ls-access-pill {
      font-size: .62rem; font-weight: 700; text-transform: uppercase;
      padding: .22rem .55rem; border-radius: 999px; background: #dcfce7; color: #166534;
    }
    .ls-access-pill--paid { background: #fef3c7; color: #b45309; }
    .ls-required {
      font-size: .6rem; font-weight: 700; text-transform: uppercase;
      padding: .22rem .55rem; border-radius: 999px; background: #fee2e2; color: #dc2626;
    }
    .ls-session-title { font-size: 1rem; font-weight: 800; color: #0f172a; margin: .15rem 0; }
    .ls-session-desc { font-size: .8rem; color: #64748b; line-height: 1.55; }
    .ls-session-meta { display: flex; flex-direction: column; gap: .2rem; font-size: .75rem; color: #64748b; }
    .ls-booking-state { color: #0f766e; font-weight: 700; }
    .ls-card-footer { margin-top: .4rem; display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; }
    .ls-action {
      border: none;
      cursor: pointer;
      padding: .72rem 1rem;
      border-radius: 12px;
      font-size: .82rem;
      font-weight: 800;
      transition: transform .2s, opacity .2s;
    }
    .ls-action:disabled { opacity: .7; cursor: wait; }
    .ls-action--join { background: linear-gradient(135deg, #0f766e, #14b8a6); color: #fff; }
    .ls-action--reserve { background: linear-gradient(135deg, #0f172a, #334155); color: #fff; }
    .ls-action--pay { background: linear-gradient(135deg, #b45309, #f59e0b); color: #fff; }
    .ls-state-chip {
      display: inline-flex;
      align-items: center;
      min-height: 2.55rem;
      padding: 0 .9rem;
      border-radius: 999px;
      background: #e2e8f0;
      color: #334155;
      font-size: .78rem;
      font-weight: 700;
    }

    .ls-past-label { font-size: .72rem; color: #64748b; font-style: italic; margin-top: .25rem; }

    .ls-empty { text-align: center; padding: 3rem 0; color: #9ca3af; font-size: .85rem; }
    .ls-empty span {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: .18em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: #e0f2fe;
      color: #0369a1;
      margin-bottom: .75rem;
    }

    @media (max-width: 720px) {
      .ls-hero { flex-direction: column; }
      .ls-hero-note { min-width: 0; width: 100%; }
      .ls-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class LiveSessionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(LearnerLiveSessionsService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  private readonly programId$ = this.route.paramMap.pipe(
    map(() => this.resolveProgramId()),
    distinctUntilChanged()
  );

  readonly programId = toSignal(this.programId$, { initialValue: '' });

  readonly sessions = toSignal(
    this.programId$.pipe(switchMap((id) => this.sessionsService.getSessions(id))),
    { initialValue: [] }
  );

  readonly bookings = toSignal(
    this.programId$.pipe(switchMap((id) => this.sessionsService.getMyBookings(id))),
    { initialValue: [] }
  );

  readonly enrollment = toSignal(
    this.programId$.pipe(switchMap((id) => this.enrollmentsService.getMyEnrollmentForProgram(id))),
    { initialValue: undefined }
  );

  readonly accessModeEnum = ProgramLiveSessionAccessMode;
  readonly busySessionId = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly optimisticReservedSessionIds = signal<Set<string>>(new Set());
  private readonly activeTranslation = toSignal(this.transloco.selectTranslation(), {
    initialValue: null,
  });
  readonly upcomingCount = computed(() => this.sessions().filter((session) => !this.isPast(session)).length);
  private readonly bookingMap = computed(() => new Map(this.bookings().map((booking) => [booking.sessionId, booking])));

  sessionTypeLabel(type: string): string {
    const label = (SESSION_TYPE_LABELS as Record<string, string>)[type] || type;
    const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return this.translateWithFallback(`programs.learnerSpace.liveSessions.sessionTypes.${normalized}`, label);
  }

  accessModeLabel(session: ProgramLiveSession): string {
    const label = PROGRAM_LIVE_SESSION_ACCESS_LABELS[this.accessMode(session)];
    return this.translateWithFallback(`programs.learnerSpace.liveSessions.accessModes.${label.toLowerCase()}`, label);
  }

  accessMode(session: ProgramLiveSession): ProgramLiveSessionAccessMode {
    return session.accessMode ?? ProgramLiveSessionAccessMode.INCLUDED;
  }

  bookingFor(session: ProgramLiveSession): ProgramLiveSessionBooking | undefined {
    const existing = this.bookingMap().get(session.id);
    if (existing) {
      return existing;
    }

    if (!this.optimisticReservedSessionIds().has(session.id)) {
      return undefined;
    }

    return {
      id: `optimistic-${session.id}`,
      uid: '',
      programId: this.programId(),
      sessionId: session.id,
      status: 'reserved',
      accessMode: this.accessMode(session),
    };
  }

  isPaidSession(session: ProgramLiveSession): boolean {
    return this.accessMode(session) === ProgramLiveSessionAccessMode.PAID;
  }

  priceLabel(session: ProgramLiveSession): string {
    const amount = Number(session.price ?? 0);
    const currency = session.currency ?? 'USD';
    try {
      return new Intl.NumberFormat(this.transloco.getActiveLang() === 'fr' ? 'fr-CA' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }

  statusLabel(session: ProgramLiveSession): string {
    if (this.isPast(session)) {
      return this.t('programs.learnerSpace.liveSessions.statusEnded');
    }

    const now = Date.now();
    const start = this.toDate(session.startAt).getTime();
    const end = this.toDate(session.endAt).getTime();
    if (now >= start && now <= end) {
      return this.t('programs.learnerSpace.liveSessions.statusLiveNow');
    }

    return this.t('programs.learnerSpace.liveSessions.statusUpcoming');
  }

  bookingStateLabel(booking: ProgramLiveSessionBooking): string {
    switch (booking.status) {
      case 'booked':
        return this.t('programs.learnerSpace.liveSessions.bookingStates.confirmed');
      case 'attended':
        return this.t('programs.learnerSpace.liveSessions.bookingStates.attended');
      case 'cancelled':
        return this.t('programs.learnerSpace.liveSessions.bookingStates.cancelled');
      case 'missed':
        return this.t('programs.learnerSpace.liveSessions.bookingStates.missed');
      case 'reserved':
      default:
        return this.t('programs.learnerSpace.liveSessions.bookingStates.reserved');
    }
  }

  reserveLabel(session: ProgramLiveSession): string {
    return this.accessMode(session) === ProgramLiveSessionAccessMode.INCLUDED
      ? this.t('programs.dashboard.reserveSeat')
      : this.t('programs.learnerSpace.liveSessions.reserveFreeSeat');
  }

  lockedLabel(session: ProgramLiveSession): string {
    if (this.isPast(session)) {
      return this.t('programs.learnerSpace.liveSessions.sessionEnded');
    }

    const booking = this.bookingFor(session);
    if (booking?.status === 'cancelled') {
      return this.t('programs.learnerSpace.liveSessions.reservationCancelled');
    }

    if (this.isPaidSession(session)) {
      return this.t('programs.learnerSpace.liveSessions.paymentRequired');
    }

    return this.t('programs.learnerSpace.liveSessions.reservationRequired');
  }

  canJoin(session: ProgramLiveSession): boolean {
    if (this.isPast(session) || !this.hasLearnerProgramAccess() || !session.meetingUrl?.trim()) {
      return false;
    }

    const booking = this.bookingFor(session);
    if (!booking) {
      return session.bookingRequired === false && this.accessMode(session) === ProgramLiveSessionAccessMode.INCLUDED;
    }

    return ['reserved', 'booked', 'attended'].includes(booking.status);
  }

  canReserve(session: ProgramLiveSession): boolean {
    if (this.isPast(session) || !this.hasLearnerProgramAccess() || !session.active) {
      return false;
    }

    if (this.bookingFor(session)) {
      return false;
    }

    return this.accessMode(session) !== ProgramLiveSessionAccessMode.PAID;
  }

  canPay(session: ProgramLiveSession): boolean {
    return !this.isPast(session)
      && this.hasLearnerProgramAccess()
      && !!session.active
      && this.accessMode(session) === ProgramLiveSessionAccessMode.PAID
      && !this.bookingFor(session);
  }

  async reserve(session: ProgramLiveSession): Promise<void> {
    await this.runAction(session.id, async () => {
      const programId = this.programId().trim();
      if (!programId) {
        throw new Error(this.t('programs.learnerSpace.liveSessions.genericError'));
      }

      await this.sessionsService.reserveSession(programId, session.id);
      this.optimisticReservedSessionIds.update((ids) => {
        const next = new Set(ids);
        next.add(session.id);
        return next;
      });
      this.message.set(this.t('programs.learnerSpace.liveSessions.reserveSuccess'));
    });
  }

  async pay(session: ProgramLiveSession): Promise<void> {
    await this.runAction(session.id, async () => {
      await this.sessionsService.startPaidCheckout(this.programId(), session.id);
    });
  }

  async joinSession(session: ProgramLiveSession): Promise<void> {
    await this.runAction(session.id, async () => {
      const url = await this.sessionsService.getJoinUrl(this.programId(), session.id);
      window.open(url, '_blank', 'noopener,noreferrer');
      this.message.set(this.t('programs.learnerSpace.liveSessions.openingTitle', { title: session.title }));
    });
  }

  toDate(val: unknown): Date {
    if (!val) return new Date();
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate();
    }
    if (val instanceof Date) return val;
    return new Date();
  }

  isPast(s: ProgramLiveSession): boolean {
    return this.toDate(s.endAt).getTime() < Date.now();
  }

  private resolveProgramId(): string {
    const fromCurrent = this.route.snapshot.paramMap.get('programId');
    if (fromCurrent) {
      return fromCurrent;
    }

    const fromParent = this.route.parent?.snapshot.paramMap.get('programId');
    if (fromParent) {
      return fromParent;
    }

    return this.route.parent?.parent?.snapshot.paramMap.get('programId') || '';
  }

  private hasLearnerProgramAccess(): boolean {
    return this.enrollmentsService.canAccessLearnerSpace(this.enrollment());
  }

  private async runAction(sessionId: string, action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.message.set('');
    this.busySessionId.set(sessionId);

    try {
      await action();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : this.t('programs.learnerSpace.liveSessions.genericError');
      this.error.set(message);
    } finally {
      this.busySessionId.set(null);
    }
  }

  t(key: string, params?: Record<string, unknown>): string {
    this.activeTranslation();
    return this.language.instant(key, params);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.t(key);
    return translated === key ? fallback : translated;
  }
}
