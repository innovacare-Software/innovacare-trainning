import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { Program } from './program.models';
import { ProgramsService } from './programs.service';
import { ProgramEnrollmentsService } from './program-enrollments.service';
import { CheckoutService } from '../../../core/checkout.service';

@Component({
  selector: 'app-program-booking-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './program-booking-page.component.html',
  styleUrls: ['./program-booking-page.component.css'],
})
export class ProgramBookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly programsService = inject(ProgramsService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);
  private readonly checkoutService = inject(CheckoutService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly bookingForm = this.fb.group({
    learnerName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    learnerEmail: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    learnerPhone: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(8)]),
    notes: this.fb.nonNullable.control('', [Validators.maxLength(600)]),
  });

  readonly program = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((programId) => this.programsService.getProgramById(programId))
    ),
    { initialValue: undefined as Program | undefined }
  );

  isFieldInvalid(controlName: 'learnerName' | 'learnerEmail' | 'learnerPhone' | 'notes'): boolean {
    const control = this.bookingForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  async submitBooking(): Promise<void> {
    const selectedProgram = this.program();
    if (!selectedProgram) {
      this.errorMessage.set('The selected program is not available.');
      return;
    }

    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const enrollmentId = await this.enrollmentsService.createEnrollment(selectedProgram, {
        learnerName: this.bookingForm.controls.learnerName.value,
        learnerEmail: this.bookingForm.controls.learnerEmail.value,
        learnerPhone: this.bookingForm.controls.learnerPhone.value,
        notes: this.bookingForm.controls.notes.value,
      });

      const price = selectedProgram.discountPrice ?? selectedProgram.price ?? 0;

      if (price > 0) {
        this.successMessage.set('Redirecting to payment...');
        await this.checkoutService.startProgramCheckout(enrollmentId);
      } else {
        this.successMessage.set('Enrollment submitted! Redirecting to your enrollments...');
        this.bookingForm.reset({
          learnerName: '',
          learnerEmail: '',
          learnerPhone: '',
          notes: '',
        });
        setTimeout(() => this.router.navigate(['/my-programs']), 2000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit enrollment.';
      this.errorMessage.set(message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goToCatalog(): void {
    this.router.navigate(['/programs']);
  }
}
