import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ProgramLiveSessionsAdminService } from '../services/program-live-sessions-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import {
  ContentStatus,
  LiveSessionType,
  ProgramContentModule,
  ProgramLiveSessionAccessMode,
} from '../models/content-builder.models';

@Component({
  selector: 'app-live-session-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'live-sessions']" class="back-link">← Live Sessions</a>
        <h1>{{ isEditMode ? 'Edit Live Session' : 'New Live Session' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Module (optional)</label>
            <select formControlName="moduleId">
              <option value="">— No Module —</option>
              <option *ngFor="let m of modules" [value]="m.id">{{ m.title }}</option>
            </select>
          </div>
          <div class="field">
            <label>Session Type *</label>
            <select formControlName="sessionType">
              <option value="LIVE_CLASS">Live Class</option>
              <option value="WEEKEND_PRACTICE">Weekend Practice</option>
              <option value="REVIEW_SESSION">Review Session</option>
              <option value="COACHING">Coaching</option>
              <option value="GROUP_QA">Group Q&amp;A</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Session title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field">
            <label>Start Date &amp; Time *</label>
            <input type="datetime-local" formControlName="startAt" />
          </div>
          <div class="field">
            <label>End Date &amp; Time *</label>
            <input type="datetime-local" formControlName="endAt" />
          </div>
          <div class="field">
            <label>Timezone</label>
            <input type="text" formControlName="timezone" placeholder="America/New_York" />
          </div>
          <div class="field">
            <label>Meeting URL</label>
            <input type="text" formControlName="meetingUrl" placeholder="https://zoom.us/..." />
          </div>
          <div class="field">
            <label>Instructor Name</label>
            <input type="text" formControlName="instructorName" placeholder="Instructor name" />
          </div>
          <div class="field">
            <label>Access Mode</label>
            <select formControlName="accessMode">
              <option [value]="accessModeEnum.INCLUDED">Included in program</option>
              <option [value]="accessModeEnum.FREE">Free ($0)</option>
              <option [value]="accessModeEnum.PAID">Paid reservation</option>
            </select>
          </div>
          <div class="field">
            <label>Capacity</label>
            <input type="number" formControlName="capacity" min="0" />
          </div>
          <div class="field" *ngIf="isPaidAccessMode()">
            <label>Price *</label>
            <input type="number" formControlName="price" min="0" step="0.01" />
          </div>
          <div class="field" *ngIf="isPaidAccessMode()">
            <label>Currency</label>
            <select formControlName="currency">
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div class="field">
            <label>Status</label>
            <select formControlName="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div class="field checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="required" /> Required
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="bookingRequired" /> Reservation required
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" /> Active
            </label>
          </div>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'live-sessions']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Session' : 'Create Session') }}
          </button>
        </div>
        <p class="error-msg" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [`
    .form-page { display: grid; gap: 1rem; }
    .form-header { background: #fff; border: 1px solid #d4e2f0; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .form-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 0.82rem; font-weight: 600; color: #4f7097; }
    input, textarea, select { padding: 0.55rem 0.75rem; border: 1px solid #c8dff7; border-radius: 0.55rem; font-size: 0.9rem; color: #1e3a5a; outline: none; width: 100%; box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { border-color: #1a74c8; }
    textarea { resize: vertical; }
    .checkboxes { flex-direction: row; align-items: center; gap: 1rem; padding-top: 1.4rem; }
    .checkbox-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: #1e3a5a; cursor: pointer; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
})
export class LiveSessionFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sessionsService = inject(ProgramLiveSessionsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  sessionId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';
  modules: ProgramContentModule[] = [];
  readonly accessModeEnum = ProgramLiveSessionAccessMode;

  readonly form = this.fb.group({
    moduleId: [''],
    title: ['', Validators.required],
    description: [''],
    sessionType: [LiveSessionType.LIVE_CLASS, Validators.required],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
    timezone: ['UTC'],
    meetingUrl: [''],
    instructorName: [''],
    accessMode: [ProgramLiveSessionAccessMode.INCLUDED, Validators.required],
    bookingRequired: [true],
    price: [0],
    currency: ['USD'],
    required: [false],
    capacity: [0],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.sessionId = this.route.snapshot.params['sessionId'] ?? null;
    this.isEditMode = !!this.sessionId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.isEditMode && this.sessionId) {
      this.sessionsService.getLiveSessionById(this.programId, this.sessionId).subscribe((s) => {
        if (!s) return;
        const toLocal = (v: unknown): string => {
          if (!v) return '';
          try {
            const d = (v as { toDate?: () => Date }).toDate?.() ?? new Date(v as string);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
          } catch {
            return '';
          }
        };
        this.form.patchValue({
          moduleId: s.moduleId ?? '',
          title: s.title,
          description: s.description,
          sessionType: s.sessionType,
          startAt: toLocal(s.startAt),
          endAt: toLocal(s.endAt),
          timezone: s.timezone,
          meetingUrl: s.meetingUrl,
          instructorName: s.instructorName,
          accessMode: s.accessMode ?? ProgramLiveSessionAccessMode.INCLUDED,
          bookingRequired: s.bookingRequired ?? true,
          price: s.price ?? 0,
          currency: s.currency ?? 'USD',
          required: s.required,
          capacity: s.capacity,
          active: s.active,
          status: s.status,
        });
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const isPaid = raw.accessMode === ProgramLiveSessionAccessMode.PAID;
      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        sessionType: raw.sessionType as LiveSessionType,
        startAt: Timestamp.fromDate(new Date(raw.startAt!)),
        endAt: Timestamp.fromDate(new Date(raw.endAt!)),
        timezone: raw.timezone ?? 'UTC',
        meetingUrl: raw.meetingUrl ?? '',
        instructorName: raw.instructorName ?? '',
        accessMode: raw.accessMode as ProgramLiveSessionAccessMode,
        bookingRequired: raw.bookingRequired ?? true,
        price: isPaid ? Number(raw.price ?? 0) : 0,
        currency: (raw.currency ?? 'USD') as 'USD' | 'CAD' | 'AED' | 'EUR' | 'GBP',
        required: raw.required ?? false,
        capacity: raw.capacity ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.sessionId) {
        await this.sessionsService.updateLiveSession(this.programId, this.sessionId, payload);
      } else {
        await this.sessionsService.createLiveSession(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'live-sessions']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }

  private getRequiredProgramId(): string {
    const programId = this.route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim());

    if (!programId) {
      throw new Error('Missing programId in route. Open this page from a specific program.');
    }

    return programId;
  }

  isPaidAccessMode(): boolean {
    return this.form.controls.accessMode.value === ProgramLiveSessionAccessMode.PAID;
  }
}
