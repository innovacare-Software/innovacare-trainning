import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  PAYMENT_STATUS_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
} from './program.models';
import { ProgramEnrollmentsService } from './program-enrollments.service';

@Component({
  selector: 'app-my-program-enrollments-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-program-enrollments-page.component.html',
  styleUrls: ['./my-program-enrollments-page.component.css'],
})
export class MyProgramEnrollmentsPageComponent {
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);

  readonly enrollments = toSignal(this.enrollmentsService.getMyEnrollments(), {
    initialValue: [],
  });

  readonly hasData = computed(() => this.enrollments().length > 0);

  statusLabel = PROGRAM_ENROLLMENT_STATUS_LABELS;
  paymentLabel = PAYMENT_STATUS_LABELS;
  reviewLabel = REVIEW_STATUS_LABELS;

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }
}
