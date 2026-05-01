import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { CheckoutService } from '../../../../core/checkout.service';
import { TutorsService } from '../tutors.service';
import type { Tutor } from '../tutor.model';
import { LanguageService } from '../../../../core/language.service';
import { LocalizedFieldPipe } from '../../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, LocalizedFieldPipe],
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.css'],
})
export class BookingPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly tutorsSvc = inject(TutorsService);
  private readonly checkoutSvc = inject(CheckoutService);
  private readonly lang = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  readonly tutor = signal<Tutor | null | undefined>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly availableSlots = signal<string[]>([]);

  readonly subjects = [
    'Med-Surg', 'Pharmacology', 'Pathophysiology',
    'Maternal-Newborn', 'Mental Health', 'Pediatrics',
    'NCLEX Prep', 'ATI/HESI Prep', 'Fundamentals', 'Other',
  ];

  form = this.fb.group({
    subject: ['', Validators.required],
    sessionDate: ['', Validators.required],
    sessionTime: ['', Validators.required],
    durationMinutes: [60, [Validators.required, Validators.min(60)]],
    sessionType: ['individual', Validators.required],
    notes: [''],
  });

  get durationOptions() {
    return [60, 90, 120];
  }

  ngOnInit(): void {
    const tutorId = this.route.snapshot.paramMap.get('tutorId') ?? '';
    if (!tutorId) {
      this.router.navigate(['/private-tutors']);
      return;
    }
    this.tutorsSvc
      .getTutorById(tutorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: t => {
          this.tutor.set(t);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMsg.set(this.lang.instant('COMMON.empty'));
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  showError(name: string): boolean {
    const c = this.ctrl(name);
    return c.invalid && (c.dirty || c.touched);
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = input.value;
    const tutor = this.tutor();
    if (!tutor || !date) return;
    this.tutorsSvc
      .getAvailableSlots(tutor.id, date)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.availableSlots.set(data);
      });
  }

  calcTotal(): number {
    const tutor = this.tutor();
    if (!tutor) return 0;
    const mins = this.form.value.durationMinutes ?? 60;
    return tutor.hourlyRate * (mins / 60);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const tutor = this.tutor();
    if (!tutor) return;

    this.submitting.set(true);
    this.errorMsg.set(null);

    try {
      if (!this.auth.currentUser?.uid) {
        await this.router.navigate(['/register'], {
          queryParams: { returnUrl: this.router.url },
        });
        return;
      }

      await this.checkoutSvc.startTutorBookingCheckout({
        tutorId: tutor.id,
        subject: this.form.value.subject!,
        sessionDate: this.form.value.sessionDate!,
        sessionTime: this.form.value.sessionTime!,
        durationMinutes: this.form.value.durationMinutes!,
        sessionType: this.form.value.sessionType as 'individual' | 'group',
        notes: this.form.value.notes || '',
      });
    } catch {
      this.errorMsg.set(this.lang.instant('COMMON.error'));
    } finally {
      this.submitting.set(false);
    }
  }

  get minDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
}
