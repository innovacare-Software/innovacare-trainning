import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { PaymentService } from '../../../core/payment.service';
import { Program } from './program.models';
import { ProgramEnrollmentsService } from './program-enrollments.service';
import { ProgramsService } from './programs.service';

const DEFAULT_IMAGE =
  'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png';

@Component({
  selector: 'app-public-program-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="public-course-page">
      <article class="course-card" *ngIf="program(); else loadingOrNotFound">
        <div class="course-hero">
          <img
            [src]="program()!.imageUrl || defaultImage"
            [alt]="program()!.title"
            class="course-image"
            loading="lazy"
            decoding="async"
            (error)="onImageError($event)"
          />
        </div>

        <div class="course-content">
          <p class="course-badge">Training Course</p>
          <h1 class="course-title">{{ program()!.title }}</h1>
          <p class="course-description" *ngIf="program()!.description">
            {{ program()!.description }}
          </p>

          <div class="course-meta">
            <span class="meta-chip" *ngIf="program()!.level">{{ program()!.level }}</span>
            <span class="meta-chip" *ngIf="program()!.durationText">{{ program()!.durationText }}</span>
            <span class="meta-chip" *ngIf="program()!.deliveryMode">{{ program()!.deliveryMode }}</span>
          </div>

          <div class="price-block">
            <span class="price-amount" *ngIf="program()!.price > 0; else freePrice">
              {{ program()!.price | number:'1.0-2' }}
              <span class="price-currency">{{ program()!.currency }}</span>
            </span>
            <ng-template #freePrice>
              <span class="price-free">Free</span>
            </ng-template>
          </div>

          <button class="btn-enroll" type="button" (click)="showPaymentModal.set(true)">
            Enroll Now
          </button>

          <p class="trust-note">
            🔒 Secure enrollment &nbsp;·&nbsp; 📱 Mobile-friendly &nbsp;·&nbsp; 🎓 Professional certificate
          </p>

          <p class="payment-feedback payment-feedback--success" *ngIf="paymentNotice()">
            {{ paymentNotice() }}
          </p>
          <p class="payment-feedback payment-feedback--error" *ngIf="paymentError()">
            {{ paymentError() }}
          </p>
        </div>
      </article>

      <div class="sticky-enroll-bar" *ngIf="program()">
        <div class="sticky-enroll-meta">
          <p>{{ program()!.title }}</p>
          <strong *ngIf="program()!.price > 0; else stickyFreePrice">{{ program()!.price | number:'1.0-2' }} {{ program()!.currency }}</strong>
          <ng-template #stickyFreePrice><strong>Free</strong></ng-template>
        </div>
        <button class="btn-enroll btn-enroll--sticky" type="button" (click)="showPaymentModal.set(true)">
          Enroll Now
        </button>
      </div>

      <div class="payment-modal-backdrop" *ngIf="showPaymentModal()" (click)="closePaymentModal()">
        <div class="payment-modal" (click)="$event.stopPropagation()">
          <button type="button" class="payment-close" (click)="closePaymentModal()" aria-label="Close payment options">
            ×
          </button>

          <h2>Choose Payment Method</h2>
          <p class="payment-copy">
            Pick the easiest way to join {{ program()!.title }}.
          </p>

          <button type="button" class="payment-option payment-option--primary" (click)="payWithStripe()" [disabled]="paymentBusy()">
            {{ paymentBusy() === 'stripe' ? 'Preparing your card payment...' : '💳 Pay with Card' }}
          </button>

          <button type="button" class="payment-option payment-option--secondary" (click)="manualPayment()" [disabled]="paymentBusy()">
            {{ paymentBusy() === 'manual' ? 'Saving your request...' : '📝 I have paid / Pay offline' }}
          </button>

          <button type="button" class="payment-option payment-option--contact" (click)="contactTrainer()" [disabled]="paymentBusy() !== null">
            📞 Contact Trainer
          </button>

          <p class="payment-help">
            Card for instant access, manual if you pay offline, WhatsApp if you want to talk to the trainer first.
          </p>
        </div>
      </div>

      <ng-template #loadingOrNotFound>
        <div class="loading-state" *ngIf="!notFound(); else notFoundBlock">
          <div class="spinner"></div>
          <p>Loading course…</p>
        </div>
        <ng-template #notFoundBlock>
          <div class="not-found-state">
            <p class="not-found-icon">🔍</p>
            <h2>Course not found</h2>
            <p>This training may no longer be available or the link may be incorrect.</p>
            <a routerLink="/" class="btn-home">Go to homepage</a>
          </div>
        </ng-template>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(160deg, #f0f6ff 0%, #f9fbff 60%, #ffffff 100%);
      font-family: 'Manrope', 'Segoe UI', sans-serif;
    }

    .public-course-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 1rem 1rem calc(6.8rem + env(safe-area-inset-bottom));
    }

    .course-card {
      background: #ffffff;
      border: 1px solid #dde9f5;
      border-radius: 1.25rem;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(15, 54, 89, 0.09);
    }

    .course-hero {
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: #d8e9f8;
    }

    .course-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .course-content {
      padding: 1.5rem;
      display: grid;
      gap: 0.85rem;
    }

    .course-badge {
      margin: 0;
      display: inline-block;
      background: #e8f2fd;
      color: #1c5fa8;
      border-radius: 999px;
      padding: 0.3rem 0.75rem;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      width: fit-content;
    }

    .course-title {
      margin: 0;
      font-size: clamp(1.4rem, 5vw, 1.9rem);
      font-weight: 800;
      color: #0d2d4a;
      line-height: 1.2;
    }

    .course-description {
      margin: 0;
      color: #3d5a72;
      font-size: 1rem;
      line-height: 1.6;
    }

    .course-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .meta-chip {
      background: #f0f6ff;
      border: 1px solid #cde0f5;
      border-radius: 999px;
      padding: 0.25rem 0.65rem;
      font-size: 0.76rem;
      color: #2d5580;
      font-weight: 600;
      text-transform: capitalize;
    }

    .price-block {
      padding: 0.75rem 1rem;
      background: #f7faff;
      border: 1px solid #d8eaf8;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .price-amount {
      font-size: 2rem;
      font-weight: 800;
      color: #0d2d4a;
      line-height: 1;
    }

    .price-currency {
      font-size: 1rem;
      font-weight: 700;
      color: #4f7197;
      vertical-align: middle;
    }

    .price-free {
      font-size: 1.6rem;
      font-weight: 800;
      color: #166534;
    }

    .btn-enroll {
      display: block;
      width: 100%;
      min-height: 48px;
      padding: 1rem;
      border: none;
      border-radius: 0.9rem;
      background: linear-gradient(135deg, #1565c0, #1e88e5);
      color: #ffffff;
      font-size: 1.1rem;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 18px rgba(21, 101, 192, 0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .btn-enroll:hover,
    .btn-enroll:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(21, 101, 192, 0.45);
      outline: none;
    }

    .btn-enroll:active {
      transform: translateY(0);
    }

    .trust-note {
      margin: 0;
      text-align: center;
      color: #6b8fac;
      font-size: 0.78rem;
    }

    .payment-feedback {
      margin: 0;
      padding: 0.85rem 1rem;
      border-radius: 0.9rem;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .payment-feedback--success {
      background: #eefbf3;
      color: #166534;
      border: 1px solid #c7f0d4;
    }

    .payment-feedback--error {
      background: #fff3f2;
      color: #b42318;
      border: 1px solid #f3c7c2;
    }

    .payment-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgba(13, 45, 74, 0.42);
      padding: 0.75rem;
    }

    .payment-modal {
      position: relative;
      width: 100%;
      max-width: 640px;
      background: #ffffff;
      padding: 1.4rem 1rem calc(1.1rem + env(safe-area-inset-bottom));
      border-radius: 1.1rem 1.1rem 0 0;
      box-shadow: 0 -10px 30px rgba(15, 54, 89, 0.18);
      display: grid;
      gap: 0.8rem;
    }

    .sticky-enroll-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      display: none;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem calc(0.7rem + env(safe-area-inset-bottom));
      border-top: 1px solid #cfe1f2;
      background: #ffffff;
      box-shadow: 0 -8px 22px rgba(13, 45, 74, 0.12);
    }

    .sticky-enroll-meta {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: 0.12rem;
    }

    .sticky-enroll-meta p {
      margin: 0;
      color: #334155;
      font-size: 0.78rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sticky-enroll-meta strong {
      color: #0f3158;
      font-size: 0.98rem;
    }

    .btn-enroll--sticky {
      width: auto;
      min-width: 148px;
      margin: 0;
      box-shadow: none;
    }

    .payment-modal h2 {
      margin: 0;
      color: #0d2d4a;
      font-size: 1.35rem;
    }

    .payment-copy,
    .payment-help {
      margin: 0;
      color: #5b7fa8;
      line-height: 1.5;
    }

    .payment-help {
      font-size: 0.82rem;
      text-align: center;
    }

    .payment-close {
      position: absolute;
      top: 0.8rem;
      right: 0.8rem;
      width: 2rem;
      height: 2rem;
      border: 1px solid #d6e3ef;
      border-radius: 999px;
      background: #ffffff;
      color: #46617f;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .payment-option {
      width: 100%;
      margin-top: 0.1rem;
      min-height: 52px;
      padding: 0.95rem 1rem;
      border-radius: 0.9rem;
      border: 1px solid transparent;
      font-size: 1rem;
      font-weight: 800;
      text-align: left;
      cursor: pointer;
    }

    .payment-option:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .payment-option--primary {
      background: linear-gradient(135deg, #1565c0, #1e88e5);
      color: #ffffff;
    }

    .payment-option--secondary {
      background: #fff8eb;
      color: #9a6700;
      border-color: #f4d9a6;
    }

    .payment-option--contact {
      background: #effbf5;
      color: #13795b;
      border-color: #bfe8d4;
    }

    /* Loading state */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 1rem;
      color: #5b7fa8;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #d0e4f5;
      border-top-color: #1565c0;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Not found */
    .not-found-state {
      text-align: center;
      padding: 4rem 1rem;
      display: grid;
      gap: 0.75rem;
      justify-items: center;
    }

    .not-found-icon {
      font-size: 3rem;
      margin: 0;
    }

    .not-found-state h2 {
      margin: 0;
      color: #0d2d4a;
    }

    .not-found-state p {
      color: #5b7fa8;
      max-width: 320px;
    }

    .btn-home {
      display: inline-block;
      padding: 0.6rem 1.4rem;
      border-radius: 999px;
      background: #1565c0;
      color: #fff;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .public-course-page {
        max-width: 100%;
        padding-inline: 0.85rem;
      }

      .course-content {
        padding: 1rem;
        gap: 0.7rem;
      }

      .course-description {
        font-size: 0.94rem;
        line-height: 1.45;
      }

      .btn-enroll {
        display: none;
      }

      .sticky-enroll-bar {
        display: flex;
      }

      .payment-modal-backdrop {
        padding: 0;
      }

      .payment-modal {
        max-width: none;
        height: 100dvh;
        border-radius: 1rem 1rem 0 0;
        overflow-y: auto;
      }
    }
  `],
})
export class PublicProgramPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(PaymentService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);
  private readonly programsService = inject(ProgramsService);

  readonly defaultImage = DEFAULT_IMAGE;
  readonly notFound = signal(false);
  readonly showPaymentModal = signal(false);
  readonly paymentBusy = signal<null | 'stripe' | 'manual'>(null);
  readonly paymentError = signal('');
  readonly paymentNotice = signal('');
  readonly profile = toSignal(this.authService.profile$, { initialValue: null });

  readonly program = toSignal<Program | undefined>(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id') ?? '';
        return this.programsService.getProgramById(id);
      }),
    ),
    { initialValue: undefined },
  );

  closePaymentModal(): void {
    if (this.paymentBusy()) {
      return;
    }

    this.showPaymentModal.set(false);
  }

  async payWithStripe(): Promise<void> {
    const selectedProgram = this.program();
    if (!selectedProgram) {
      return;
    }

    this.paymentError.set('');
    this.paymentNotice.set('');
    this.paymentBusy.set('stripe');

    try {
      await this.ensureAuthenticated();
      const enrollmentId = await this.ensureEnrollment(selectedProgram);
      const payment = await this.paymentService.createProgramPaymentIntent({
        programId: selectedProgram.id,
        enrollmentId,
        paymentMethod: 'stripe',
        provider: 'stripe',
      });

      const checkoutUrl = String(payment.checkoutUrl || '').trim();
      if (!checkoutUrl) {
        throw new Error('Unable to start card payment right now.');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      this.paymentError.set(
        error instanceof Error ? error.message : 'Unable to start card payment right now.'
      );
      this.paymentBusy.set(null);
    }
  }

  async manualPayment(): Promise<void> {
    const selectedProgram = this.program();
    if (!selectedProgram) {
      return;
    }

    this.paymentError.set('');
    this.paymentNotice.set('');
    this.paymentBusy.set('manual');

    try {
      await this.ensureAuthenticated();
      const enrollmentId = await this.ensureEnrollment(selectedProgram);
      await this.enrollmentsService.markManualPaymentPending(enrollmentId);
      this.showPaymentModal.set(false);
      this.paymentNotice.set('Your enrollment is pending validation. We will confirm your payment shortly.');
    } catch (error) {
      this.paymentError.set(
        error instanceof Error ? error.message : 'Unable to save your manual payment request.'
      );
    } finally {
      this.paymentBusy.set(null);
    }
  }

  contactTrainer(): void {
    const selectedProgram = this.program();
    if (!selectedProgram) {
      return;
    }

    const rawPhone = selectedProgram.adminPhone || '+123456789';
    const phone = rawPhone.replace(/\D+/g, '');
    const message = encodeURIComponent(`Hello, I want to enroll in ${selectedProgram.title}`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.auth.currentUser?.uid) {
      return;
    }

    await this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
    throw new Error('Please sign in first to continue your enrollment.');
  }

  private async ensureEnrollment(program: Program): Promise<string> {
    const authUser = this.auth.currentUser;
    const profile = this.profile();
    const learnerEmail = String(profile?.email || authUser?.email || '').trim().toLowerCase();

    if (!learnerEmail) {
      throw new Error('Please add an email address to continue.');
    }

    const learnerName =
      String(profile?.displayName || authUser?.displayName || learnerEmail.split('@')[0] || 'Learner').trim() ||
      'Learner';
    const learnerPhone = String(authUser?.phoneNumber || 'Pending phone confirmation').trim();

    return this.enrollmentsService.createEnrollment(program, {
      learnerName,
      learnerEmail,
      learnerPhone,
      notes: 'Enrollment started from public program page.',
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = DEFAULT_IMAGE;
  }
}
