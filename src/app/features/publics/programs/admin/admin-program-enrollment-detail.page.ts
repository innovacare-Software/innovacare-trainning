import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
} from '../program.models';
import { ProgramEnrollmentsService } from '../program-enrollments.service';

@Component({
  selector: 'app-admin-program-enrollment-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-program-enrollment-detail.page.html',
  styleUrls: ['./admin-program-enrollment-detail.page.css'],
})
export class AdminProgramEnrollmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProgramEnrollmentsService);

  readonly adminNotes = signal('');

  readonly item = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') || ''),
      switchMap((id) => this.service.getEnrollmentById(id))
    ),
    { initialValue: undefined }
  );

  statusLabel = PROGRAM_ENROLLMENT_STATUS_LABELS;
  paymentLabel = PAYMENT_STATUS_LABELS;

  async approve(id: string): Promise<void> {
    await this.service.approveEnrollment(id);
  }

  async reject(id: string): Promise<void> {
    await this.service.rejectEnrollment(id);
  }

  async setActive(id: string): Promise<void> {
    await this.service.activateEnrollment(id);
  }

  async setCompleted(id: string): Promise<void> {
    await this.service.completeEnrollment(id);
  }

  async setCancelled(id: string): Promise<void> {
    await this.service.cancelEnrollment(id);
  }

  async setPayment(id: string, status: string): Promise<void> {
    await this.service.updatePaymentStatus(id, status as PaymentStatus);
  }

  paymentStatuses = Object.values(PaymentStatus);
  async markAsPaid(id: string): Promise<void> {
    await this.service.updatePaymentStatus(id, PaymentStatus.PAID);
  }
}
