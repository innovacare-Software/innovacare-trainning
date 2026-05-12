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
import { AuthService } from '../../../core/auth';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProgramAdminUsersService } from '../users/program-admin-users.service';
import { ProgramsService } from '../../publics/programs/programs.service';

@Component({
  selector: 'app-program-enrollments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, StatusPillComponent],
  template: `
    <section class="panel">
      <header class="head">
        <h1>Program Enrollments</h1>
        <span class="scope-pill" *ngIf="orgScopeLabel() as scope">{{ scope }}</span>
        <button type="button" class="btn-add" (click)="openInvite()">+ Add learner</button>
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
                <button type="button" (click)="delete(row.id)" class="warn">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <section class="empty">No enrollments found.</section>
      </ng-template>

      <!-- Invite learner modal -->
      <div class="modal-back" *ngIf="inviteOpen()" (click)="closeInvite()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Invite a learner to a program</h2>
            <button type="button" class="icon" (click)="closeInvite()" aria-label="Close">×</button>
          </header>
          <div class="form-grid">
            <label>Program
              <select [(ngModel)]="invite.programId">
                <option value="">— Select a program —</option>
                <option *ngFor="let p of programOptions()" [value]="p.id">{{ p.title }}</option>
              </select>
            </label>
            <label>Email
              <input type="email" [(ngModel)]="invite.email" />
            </label>
            <label>Display name
              <input type="text" [(ngModel)]="invite.displayName" />
            </label>
            <label>Initial password (blank = auto)
              <input type="text" [(ngModel)]="invite.password" placeholder="min. 8 chars" />
            </label>
            <label>Enrollment status
              <select [(ngModel)]="invite.enrollmentStatus">
                <option value="ACTIVE">Active</option>
                <option value="PENDING_REVIEW">Pending review</option>
              </select>
            </label>
            <label>Payment status
              <select [(ngModel)]="invite.paymentStatus">
                <option value="WAIVED">Waived</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </label>
          </div>
          <p class="err" *ngIf="inviteError()">{{ inviteError() }}</p>
          <p class="ok" *ngIf="inviteOk()">{{ inviteOk() }}</p>
          <footer class="modal-foot">
            <button type="button" class="btn-secondary" (click)="closeInvite()" [disabled]="inviteLoading()">Cancel</button>
            <button type="button" class="btn-primary" (click)="submitInvite()" [disabled]="inviteLoading()">
              {{ inviteLoading() ? 'Inviting…' : 'Invite & enroll' }}
            </button>
          </footer>
        </div>
      </div>
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
      .scope-pill { display: inline-block; margin-left: 0.6rem; background: #eef4fb; color: #224f7d; border-radius: 999px; padding: 0.18rem 0.7rem; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; vertical-align: middle; }
      .head { display: flex; align-items: center; gap: 0.6rem; }
      .head h1 { flex: 1; }
      .btn-add { border: 0; cursor: pointer; border-radius: 0.7rem; padding: 0.5rem 0.85rem; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); font-weight: 600; }
      .modal-back { position: fixed; inset: 0; background: rgba(15,40,75,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
      .modal-card { background: #fff; border-radius: 1rem; max-width: 640px; width: 100%; max-height: 92vh; overflow: auto; padding: 1.1rem 1.3rem; box-shadow: 0 30px 60px rgba(15,40,75,0.25); }
      .modal-head { display: flex; justify-content: space-between; align-items: center; }
      .modal-head h2 { margin: 0; color: #173f68; }
      .modal-head .icon { background: transparent; border: 0; font-size: 1.6rem; color: #5f7a96; cursor: pointer; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem 0.75rem; margin-top: 0.6rem; }
      .form-grid label { display: flex; flex-direction: column; font-size: 0.8rem; color: #224f7d; font-weight: 600; gap: 0.25rem; }
      .form-grid input, .form-grid select { border: 1px solid #c9dbee; border-radius: 0.55rem; padding: 0.45rem 0.6rem; font-size: 0.88rem; }
      .err { color: #8a3344; background: #fef2f4; border: 1px solid #efc5ce; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; margin-top: 0.7rem; }
      .ok { color: #0f6c46; background: #effcf6; border: 1px solid #9dd7be; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; margin-top: 0.7rem; }
      .modal-foot { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.9rem; }
      .btn-primary { border: 0; cursor: pointer; border-radius: 0.7rem; padding: 0.5rem 0.85rem; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); font-weight: 600; }
      .btn-secondary { border: 1px solid #c8dff7; cursor: pointer; border-radius: 0.7rem; padding: 0.5rem 0.85rem; color: #1a74c8; background: #fff; font-weight: 600; }
      @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
      @media (max-width: 1320px) { .filters { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 760px) { .filters { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramEnrollmentsPage {
  private readonly service = inject(ProgramEnrollmentsAdminService);
  private readonly authService = inject(AuthService);

  readonly profile = toSignal(this.authService.profile$, { initialValue: null as any });
  readonly orgScopeLabel = computed(() => {
    const p: any = this.profile();
    if (!p) return '';
    if (p.platformRole === 'super_admin' || p.role === 'super_admin') return 'All organizations';
    return p.orgId ? `Org: ${p.orgId}` : '';
  });

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

  async delete(id: string): Promise<void> {
    if (!confirm('Delete this enrollment permanently? This cannot be undone.')) {
      return;
    }
    try {
      await this.service.deleteEnrollment(id);
    } catch (error) {
      console.error('Failed to delete enrollment', error);
      alert('Failed to delete enrollment. Please try again.');
    }
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

  // ---- Invite learner modal ----
  private readonly usersService = inject(ProgramAdminUsersService);
  private readonly programsService = inject(ProgramsService);

  readonly programOptions = toSignal(
    this.programsService.getAdminPrograms().pipe(
      map((list) => list.map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title)))
    ),
    { initialValue: [] as Array<{ id: string; title: string }> }
  );

  readonly inviteOpen = signal(false);
  readonly inviteLoading = signal(false);
  readonly inviteError = signal('');
  readonly inviteOk = signal('');
  invite = this.blankInvite();

  blankInvite() {
    return {
      programId: '',
      email: '',
      displayName: '',
      password: '',
      enrollmentStatus: 'ACTIVE' as 'ACTIVE' | 'PENDING_REVIEW',
      paymentStatus: 'WAIVED' as 'WAIVED' | 'PAID' | 'UNPAID',
    };
  }

  openInvite(): void {
    this.invite = this.blankInvite();
    this.inviteError.set('');
    this.inviteOk.set('');
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    if (this.inviteLoading()) return;
    this.inviteOpen.set(false);
  }

  async submitInvite(): Promise<void> {
    this.inviteError.set('');
    this.inviteOk.set('');
    if (!this.invite.programId) { this.inviteError.set('Select a program.'); return; }
    if (!this.invite.email.trim() || !this.invite.email.includes('@')) {
      this.inviteError.set('Valid learner email required.');
      return;
    }
    this.inviteLoading.set(true);
    try {
      const res = await this.usersService.inviteLearner({
        programId: this.invite.programId,
        email: this.invite.email.trim().toLowerCase(),
        displayName: this.invite.displayName.trim(),
        password: this.invite.password || undefined,
        enrollmentStatus: this.invite.enrollmentStatus,
        paymentStatus: this.invite.paymentStatus,
      });
      this.inviteOk.set(
        `${res.created ? 'User created and enrolled' : 'Existing user enrolled'} (enrollment ${res.enrollmentId}).`
      );
      this.invite = this.blankInvite();
    } catch (err: any) {
      this.inviteError.set(err?.message || 'Invite failed.');
    } finally {
      this.inviteLoading.set(false);
    }
  }
}
