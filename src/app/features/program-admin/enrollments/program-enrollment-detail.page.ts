import { CommonModule } from '@angular/common';
import { Component, inject, Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { map, Observable, of, switchMap } from 'rxjs';
import {
  PAYMENT_STATUS_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  ProgramEnrollment,
} from '../shared/program-admin.models';
import { ProgramEnrollmentsAdminService } from '../services/program-enrollments-admin.service';

interface BasicProgressSummary {
  progressPct?: number;
  readinessScore?: number;
  averageScore?: number;
  status?: string;
}

@Component({
  selector: 'app-program-enrollment-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="panel" *ngIf="enrollment() as row; else notFound">
      <header class="head">
        <h1>Enrollment Detail</h1>
        <a routerLink="/program-admin/enrollments">Back</a>
      </header>

      <div class="grid">
        <article class="card">
          <h3>Learner Info</h3>
          <p><strong>{{ row.learnerName }}</strong></p>
          <p>{{ row.learnerEmail }}</p>
          <p>{{ row.learnerPhone }}</p>
        </article>

        <article class="card">
          <h3>Program Info</h3>
          <p><strong>{{ row.programTitle }}</strong></p>
          <p>Category: {{ row.category }}</p>
          <p>Amount: {{ row.amount | currency: row.currency:'symbol':'1.0-0' }}</p>
        </article>

        <article class="card">
          <h3>Status</h3>
          <p>Enrollment: {{ PROGRAM_ENROLLMENT_STATUS_LABELS[row.status] }}</p>
          <p>Payment: {{ PAYMENT_STATUS_LABELS[row.paymentStatus] }}</p>
          <p>Review: {{ row.reviewStatus }}</p>
          <p>Created: {{ asDate(row.createdAt) ? (asDate(row.createdAt) | date:'medium') : '-' }}</p>
        </article>
      </div>

      <section class="notes">
        <h3>Notes</h3>
        <p>{{ row.notes || 'No learner notes.' }}</p>
      </section>

      <section class="progress" *ngIf="progressSummary() as progress; else noProgress">
        <h3>Basic Learner Progress</h3>
        <div class="progress-grid">
          <p><strong>Progress:</strong> {{ progress.progressPct ?? 0 }}%</p>
          <p><strong>Readiness:</strong> {{ progress.readinessScore ?? 0 }}%</p>
          <p><strong>Average Score:</strong> {{ progress.averageScore ?? 0 }}%</p>
          <p><strong>Status:</strong> {{ progress.status || '-' }}</p>
        </div>
      </section>

      <ng-template #noProgress>
        <section class="progress empty">No progress data available yet.</section>
      </ng-template>

      <section class="actions">
        <button type="button" (click)="approve(row.id)">Approve</button>
        <button type="button" (click)="reject(row.id)" class="warn">Reject</button>
        <button type="button" (click)="activate(row.id)">Activate</button>
        <button type="button" (click)="complete(row.id)">Complete</button>
        <button type="button" (click)="cancel(row.id)" class="warn">Cancel</button>
        @if (row.paymentStatus !== 'paid') {
          <button type="button" (click)="markPaid(row.id)" class="success">Mark Paid</button>
        } @else {
          <button type="button" (click)="markUnpaid(row.id)" class="warn">Mark Unpaid</button>
        }
      </section>
    </section>

    <ng-template #notFound>
      <section class="not-found">
        <h2>Enrollment not found</h2>
        <a routerLink="/program-admin/enrollments">Return</a>
      </section>
    </ng-template>
  `,
  styles: [
    `
      .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 0.7rem; }
      .head h1 { margin: 0; }
      .head a { text-decoration: none; border: 1px solid #c9dbef; border-radius: 0.65rem; padding: 0.4rem 0.6rem; color: #24517c; }
      .grid { margin-top: 0.8rem; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
      .card { border: 1px solid #dce7f3; border-radius: 0.8rem; background: #f9fbff; padding: 0.75rem; }
      .card h3 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #567598; }
      .card p { margin: 0.45rem 0 0; color: #1f4467; }
      .notes, .progress { margin-top: 0.8rem; border: 1px solid #dce7f3; border-radius: 0.8rem; padding: 0.75rem; background: #f9fbff; }
      .notes h3, .progress h3 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #567598; }
      .notes p { margin: 0.45rem 0 0; color: #1f4467; }
      .progress-grid { margin-top: 0.5rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; }
      .progress.empty { color: #607b98; }
      .actions { margin-top: 0.8rem; display: flex; gap: 0.35rem; flex-wrap: wrap; }
      .actions button { border: 1px solid #c9dbee; border-radius: 0.65rem; padding: 0.4rem 0.55rem; background: #f8fbff; color: #234f7b; cursor: pointer; }
      .actions button.warn { color: #8b3344; border-color: #efc5ce; background: #fef2f4; }
      .actions button.success { color: #1a5e35; border-color: #a3d4b5; background: #f0faf4; font-weight: 600; }
      .not-found { border: 1px dashed #c7d8ea; border-radius: 0.8rem; text-align: center; padding: 1.2rem; }
      .not-found a { text-decoration: none; color: #24517d; }
      @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } .progress-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramEnrollmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProgramEnrollmentsAdminService);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private readonly enrollmentId$ = this.route.paramMap.pipe(
    map((params) => params.get('id') || '')
  );

  readonly enrollment = toSignal(
    this.enrollmentId$.pipe(switchMap((id) => this.service.getEnrollmentById(id)))
  );

  readonly progressSummary = toSignal(
    this.enrollmentId$.pipe(
      switchMap((id) => this.service.getEnrollmentById(id)),
      switchMap((row) => {
        if (!row?.userId || !row.programId) {
          return of(undefined);
        }

        const ref = doc(this.firestore, `users/${row.userId}/programProgress/${row.programId}`);
        return runInInjectionContext(this.injector, () =>
          docData(ref) as Observable<BasicProgressSummary | undefined>
        );
      })
    ),
    { initialValue: undefined }
  );

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

  async markPaid(id: string): Promise<void> {
    await this.service.markPaid(id);
  }

  async markUnpaid(id: string): Promise<void> {
    await this.service.markUnpaid(id);
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
}
