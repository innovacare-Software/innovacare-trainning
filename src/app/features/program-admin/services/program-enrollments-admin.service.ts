import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProgramEnrollment } from '../shared/program-admin.models';
import { PaymentStatus } from '../../publics/programs/program.models';
import { ProgramEnrollmentsService } from '../../publics/programs/program-enrollments.service';

@Injectable({ providedIn: 'root' })
export class ProgramEnrollmentsAdminService {
  private readonly enrollments = inject(ProgramEnrollmentsService);

  getAllEnrollments(): Observable<ProgramEnrollment[]> {
    return this.enrollments.getAllEnrollmentsForAdmin();
  }

  getEnrollmentById(enrollmentId: string): Observable<ProgramEnrollment | undefined> {
    return this.enrollments.getEnrollmentById(enrollmentId);
  }

  approveEnrollment(enrollmentId: string): Promise<void> {
    return this.enrollments.approveEnrollment(enrollmentId);
  }

  rejectEnrollment(enrollmentId: string): Promise<void> {
    return this.enrollments.rejectEnrollment(enrollmentId);
  }

  activateEnrollment(enrollmentId: string): Promise<void> {
    return this.enrollments.activateEnrollment(enrollmentId);
  }

  completeEnrollment(enrollmentId: string): Promise<void> {
    return this.enrollments.completeEnrollment(enrollmentId);
  }

  cancelEnrollment(enrollmentId: string): Promise<void> {
    return this.enrollments.cancelEnrollment(enrollmentId);
  }

  markPaid(enrollmentId: string): Promise<void> {
    return this.enrollments.updatePaymentStatus(enrollmentId, PaymentStatus.PAID);
  }

  markUnpaid(enrollmentId: string): Promise<void> {
    return this.enrollments.updatePaymentStatus(enrollmentId, PaymentStatus.UNPAID);
  }
}
