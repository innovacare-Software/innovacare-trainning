import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import {
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  ProgramCategory,
  ProgramEnrollmentStatus,
} from '../program.models';
import { ProgramEnrollmentsService } from '../program-enrollments.service';

@Component({
  selector: 'app-admin-program-enrollments-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-program-enrollments-list.page.html',
  styleUrls: ['./admin-program-enrollments-list.page.css'],
})
export class AdminProgramEnrollmentsListPage {
  private readonly service = inject(ProgramEnrollmentsService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', {
    nonNullable: true,
  });
  readonly statusControl = new FormControl<ProgramEnrollmentStatus | 'ALL'>('ALL', {
    nonNullable: true,
  });
  readonly paymentControl = new FormControl<PaymentStatus | 'ALL'>('ALL', {
    nonNullable: true,
  });

  readonly items = toSignal(this.service.getAllEnrollmentsForAdmin(), { initialValue: [] });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      map((v) => v.trim().toLowerCase())
    ),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(
    this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)),
    { initialValue: 'ALL' as ProgramCategory | 'ALL' }
  );

  readonly selectedStatus = toSignal(
    this.statusControl.valueChanges.pipe(startWith(this.statusControl.value)),
    { initialValue: 'ALL' as ProgramEnrollmentStatus | 'ALL' }
  );

  readonly selectedPayment = toSignal(
    this.paymentControl.valueChanges.pipe(startWith(this.paymentControl.value)),
    { initialValue: 'ALL' as PaymentStatus | 'ALL' }
  );

  readonly rows = computed(() => {
    const term = this.searchTerm();
    const category = this.selectedCategory();
    const status = this.selectedStatus();
    const payment = this.selectedPayment();

    return this.items().filter((row) => {
      const byCategory = category === 'ALL' || row.category === category;
      const byStatus = status === 'ALL' || row.status === status;
      const byPayment = payment === 'ALL' || row.paymentStatus === payment;
      const byTerm =
        !term ||
        [row.learnerName, row.learnerEmail, row.programTitle]
          .join(' ')
          .toLowerCase()
          .includes(term);
      return byCategory && byStatus && byPayment && byTerm;
    });
  });

  categories = Object.values(ProgramCategory);
  statuses = Object.values(ProgramEnrollmentStatus);
  payments = Object.values(PaymentStatus);

  categoryLabel = PROGRAM_CATEGORY_LABELS;
  enrollmentStatusLabel = PROGRAM_ENROLLMENT_STATUS_LABELS;
  paymentLabel = PAYMENT_STATUS_LABELS;

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  formatCreatedAt(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (typeof maybeTimestamp.toDate === 'function') {
        return maybeTimestamp.toDate();
      }
    }

    return null;
  }
}
