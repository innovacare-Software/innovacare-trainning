import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import {
  PAYMENT_STATUS_LABELS,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  PaymentStatus,
  ProgramCategory,
  ProgramEnrollmentStatus,
  ReviewStatus,
} from '../shared/program-admin.models';
import { ProgramEnrollmentsAdminService } from '../services/program-enrollments-admin.service';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-program-enrollments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StatusPillComponent],
  template: `
    <section class="panel">
      <header class="head">
        <h1>Program Enrollments</h1>
      </header>

      <div class="filters">
        <input [formControl]="searchControl" placeholder="Search learner, email, program" />
        <select [formControl]="categoryControl">
          <option value="ALL">All categories</option>
          <option *ngFor="let c of categories" [value]="c">{{ PROGRAM_CATEGORY_LABELS[c] }}</option>
        </select>
        <select [formControl]="paymentControl">
          <option value="ALL">All payments</option>
          <option *ngFor="let p of payments" [value]="p">{{ PAYMENT_STATUS_LABELS[p] }}</option>
        </select>
        <select [formControl]="reviewControl">
          <option value="ALL">All reviews</option>
          <option *ngFor="let r of reviews" [value]="r">{{ r }}</option>
        </select>
        <select [formControl]="statusControl">
          <option value="ALL">All statuses</option>
          <option *ngFor="let s of statuses" [value]="s">{{ PROGRAM_ENROLLMENT_STATUS_LABELS[s] }}</option>
        </select>
      </div>

      <div class="table-wrap" *ngIf="rows().length; else emptyState">
        <table>
          <thead>
            <tr>
              <th>Learner</th>
              <th>Program</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Review</th>
              <th>Enrollment Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows(); trackBy: trackById">
              <td>
                <strong>{{ row.learnerName }}</strong>
                <p>{{ row.learnerEmail }}</p>
              </td>
              <td>{{ row.programTitle }}</td>
              <td>{{ PROGRAM_CATEGORY_LABELS[row.category] }}</td>
              <td>{{ row.amount | currency: row.currency:'symbol':'1.0-0' }}</td>
              <td><app-status-pill [label]="PAYMENT_STATUS_LABELS[row.paymentStatus]"></app-status-pill></td>
              <td><app-status-pill [label]="row.reviewStatus"></app-status-pill></td>
              <td><app-status-pill [label]="PROGRAM_ENROLLMENT_STATUS_LABELS[row.status]"></app-status-pill></td>
              <td>{{ asDate(row.createdAt) ? (asDate(row.createdAt) | date:'medium') : '-' }}</td>
              <td class="actions">
                <a [routerLink]="['/program-admin/enrollments', row.id]">Open</a>
                <button type="button" (click)="approve(row.id)">Approve</button>
                <button type="button" (click)="reject(row.id)" class="warn">Reject</button>
                <button type="button" (click)="activate(row.id)">Activate</button>
                <button type="button" (click)="complete(row.id)">Complete</button>
                <button type="button" (click)="cancel(row.id)" class="warn">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <section class="empty">No enrollments found.</section>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem; }
      .head h1 { margin: 0; }
      .filters { margin-top: 0.8rem; display: grid; grid-template-columns: 1fr repeat(4, 170px); gap: 0.55rem; }
      .filters input, .filters select { border: 1px solid #c9dbee; border-radius: 0.7rem; height: 2.6rem; padding: 0 0.75rem; }
      .table-wrap { margin-top: 0.75rem; overflow: auto; border: 1px solid #dce7f3; border-radius: 0.8rem; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #ebf1f8; padding: 0.65rem; text-align: left; }
      th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5e7898; background: #f6faff; }
      td p { margin: 0.2rem 0 0; color: #65809f; font-size: 0.84rem; }
      .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
      .actions a, .actions button { border: 1px solid #c9dbef; border-radius: 0.58rem; padding: 0.3rem 0.5rem; background: #f8fbff; text-decoration: none; color: #224f7d; cursor: pointer; font-size: 0.78rem; }
      .actions .warn { color: #8a3344; border-color: #efc5ce; background: #fef2f4; }
      .empty { margin-top: 0.8rem; border: 1px dashed #c7d8ea; border-radius: 0.8rem; text-align: center; padding: 1rem; }
      @media (max-width: 1320px) { .filters { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 760px) { .filters { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramEnrollmentsPage {
  private readonly service = inject(ProgramEnrollmentsAdminService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', { nonNullable: true });
  readonly paymentControl = new FormControl<PaymentStatus | 'ALL'>('ALL', { nonNullable: true });
  readonly reviewControl = new FormControl<ReviewStatus | 'ALL'>('ALL', { nonNullable: true });
  readonly statusControl = new FormControl<ProgramEnrollmentStatus | 'ALL'>('ALL', { nonNullable: true });

  readonly items = toSignal(this.service.getAllEnrollments(), { initialValue: [] });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value), map((v) => v.trim().toLowerCase())),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)), {
    initialValue: 'ALL' as ProgramCategory | 'ALL',
  });
  readonly selectedPayment = toSignal(this.paymentControl.valueChanges.pipe(startWith(this.paymentControl.value)), {
    initialValue: 'ALL' as PaymentStatus | 'ALL',
  });
  readonly selectedReview = toSignal(this.reviewControl.valueChanges.pipe(startWith(this.reviewControl.value)), {
    initialValue: 'ALL' as ReviewStatus | 'ALL',
  });
  readonly selectedStatus = toSignal(this.statusControl.valueChanges.pipe(startWith(this.statusControl.value)), {
    initialValue: 'ALL' as ProgramEnrollmentStatus | 'ALL',
  });

  readonly rows = computed(() => {
    const term = this.searchTerm();
    const category = this.selectedCategory();
    const payment = this.selectedPayment();
    const review = this.selectedReview();
    const status = this.selectedStatus();

    return [...this.items()]
      .filter((row) => {
        const byCategory = category === 'ALL' || row.category === category;
        const byPayment = payment === 'ALL' || row.paymentStatus === payment;
        const byReview = review === 'ALL' || row.reviewStatus === review;
        const byStatus = status === 'ALL' || row.status === status;
        const byTerm =
          !term ||
          [row.learnerName, row.learnerEmail, row.programTitle]
            .join(' ')
            .toLowerCase()
            .includes(term);

        return byCategory && byPayment && byReview && byStatus && byTerm;
      })
      .sort((a, b) => this.dateSortDesc(a.createdAt, b.createdAt));
  });

  categories = Object.values(ProgramCategory);
  payments = Object.values(PaymentStatus);
  reviews = Object.values(ReviewStatus);
  statuses = Object.values(ProgramEnrollmentStatus);

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;
  protected readonly PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;
  protected readonly PROGRAM_ENROLLMENT_STATUS_LABELS = PROGRAM_ENROLLMENT_STATUS_LABELS;

  async approve(id: string): Promise<void> {
    await this.service.approveEnrollment(id);
  }

  async reject(id: string): Promise<void> {
    await this.service.rejectEnrollment(id);
  }

  async activate(id: string): Promise<void> {
    await this.service.activateEnrollment(id);
  }

  async complete(id: string): Promise<void> {
    await this.service.completeEnrollment(id);
  }

  async cancel(id: string): Promise<void> {
    await this.service.cancelEnrollment(id);
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  asDate(value: unknown): Date | null {
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

  private dateSortDesc(a: unknown, b: unknown): number {
    const da = this.asDate(a)?.getTime() ?? 0;
    const db = this.asDate(b)?.getTime() ?? 0;
    return db - da;
  }
}
