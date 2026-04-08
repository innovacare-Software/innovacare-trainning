import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramAssessmentsAdminService } from '../services/program-assessments-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { AssessmentType, ContentStatus, ProgramContentModule } from '../models/content-builder.models';

@Component({
  selector: 'app-assessment-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'assessments']" class="back-link">← Assessments</a>
        <h1>{{ isEditMode ? 'Edit Assessment' : 'New Assessment' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Module *</label>
            <select formControlName="moduleId">
              <option value="">— Select Module —</option>
              <option *ngFor="let m of modules" [value]="m.id">{{ m.title }}</option>
            </select>
          </div>
          <div class="field">
            <label>Assessment Type *</label>
            <select formControlName="assessmentType">
              <option value="QUIZ">Quiz</option>
              <option value="MOCK_EXAM">Mock Exam</option>
              <option value="READINESS_TEST">Readiness Test</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Assessment title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field">
            <label>Question Count</label>
            <input type="number" formControlName="questionCount" min="0" />
          </div>
          <div class="field">
            <label>Duration (minutes)</label>
            <input type="number" formControlName="durationMin" min="0" />
          </div>
          <div class="field">
            <label>Passing Score (%)</label>
            <input type="number" formControlName="passingScore" min="0" max="100" />
          </div>
          <div class="field">
            <label>Order</label>
            <input type="number" formControlName="order" min="0" />
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
              <input type="checkbox" formControlName="active" /> Active
            </label>
          </div>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'assessments']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Assessment' : 'Create Assessment') }}
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
export class AssessmentFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly assessmentsService = inject(ProgramAssessmentsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  assessmentId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';
  modules: ProgramContentModule[] = [];

  readonly form = this.fb.group({
    moduleId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    assessmentType: [AssessmentType.QUIZ, Validators.required],
    passingScore: [70],
    durationMin: [60],
    questionCount: [0],
    order: [0],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  ngOnInit(): void {
    this.programId = this.route.snapshot.params['programId'];
    this.assessmentId = this.route.snapshot.params['assessmentId'] ?? null;
    this.isEditMode = !!this.assessmentId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.isEditMode && this.assessmentId) {
      this.assessmentsService.getAssessmentById(this.programId, this.assessmentId).subscribe((a) => {
        if (!a) return;
        this.form.patchValue({
          moduleId: a.moduleId,
          title: a.title,
          description: a.description,
          assessmentType: a.assessmentType,
          passingScore: a.passingScore,
          durationMin: a.durationMin,
          questionCount: a.questionCount,
          order: a.order,
          active: a.active,
          status: a.status,
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
      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        assessmentType: raw.assessmentType as AssessmentType,
        passingScore: raw.passingScore ?? 70,
        durationMin: raw.durationMin ?? 60,
        questionCount: raw.questionCount ?? 0,
        order: raw.order ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.assessmentId) {
        await this.assessmentsService.updateAssessment(this.programId, this.assessmentId, payload);
      } else {
        await this.assessmentsService.createAssessment(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'assessments']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }
}
