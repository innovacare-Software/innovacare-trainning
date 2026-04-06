import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramCaseStudiesAdminService } from '../../services/program-case-studies-admin.service';
import { ProgramModulesAdminService } from '../../services/program-modules-admin.service';
import { CaseStudyScoringMode, ContentItemStatus, ProgramModule } from '../../shared/content-builder.models';

@Component({
  selector: 'app-case-study-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'case-studies']" class="back-link">← Case Studies</a>
        <h1>{{ isEditMode ? 'Edit Case Study' : 'New Case Study' }}</h1>
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
            <label>Scoring Mode</label>
            <select formControlName="scoringMode">
              <option value="MANUAL">Manual</option>
              <option value="AUTO">Auto</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Case study title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field full">
            <label>Scenario *</label>
            <textarea formControlName="scenario" rows="5" placeholder="Detailed clinical or practice scenario..."></textarea>
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

        <div class="prompts-section">
          <label>Discussion Prompts</label>
          <div class="prompts-list" formArrayName="prompts">
            <div class="prompt-row" *ngFor="let ctrl of promptsArray.controls; let i = index">
              <input type="text" [formControlName]="i" placeholder="Prompt {{ i + 1 }}" />
              <button type="button" class="btn-remove" (click)="removePrompt(i)">✕</button>
            </div>
          </div>
          <button type="button" class="btn-add-prompt" (click)="addPrompt()">+ Add Prompt</button>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'case-studies']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Case Study' : 'Create Case Study') }}
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
    .prompts-section { margin-top: 1.2rem; }
    .prompts-section > label { font-size: 0.82rem; font-weight: 600; color: #4f7097; display: block; margin-bottom: 0.5rem; }
    .prompts-list { display: grid; gap: 0.4rem; margin-bottom: 0.5rem; }
    .prompt-row { display: flex; gap: 0.4rem; }
    .prompt-row input { flex: 1; }
    .btn-remove { padding: 0.4rem 0.6rem; border: none; border-radius: 0.45rem; background: #fef2f2; color: #b91c1c; cursor: pointer; font-size: 0.8rem; }
    .btn-add-prompt { padding: 0.4rem 0.9rem; border: 1px dashed #c8dff7; border-radius: 0.5rem; background: #f0f6ff; color: #1a74c8; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
})
export class CaseStudyFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly caseStudiesService = inject(ProgramCaseStudiesAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  caseStudyId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';
  modules: ProgramModule[] = [];

  readonly form = this.fb.group({
    moduleId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    scenario: ['', Validators.required],
    prompts: this.fb.array([] as string[]),
    scoringMode: [CaseStudyScoringMode.MANUAL],
    order: [0],
    active: [true],
    status: [ContentItemStatus.DRAFT],
  });

  get promptsArray(): FormArray {
    return this.form.get('prompts') as FormArray;
  }

  ngOnInit(): void {
    this.programId = this.route.snapshot.params['programId'];
    this.caseStudyId = this.route.snapshot.params['caseStudyId'] ?? null;
    this.isEditMode = !!this.caseStudyId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.isEditMode && this.caseStudyId) {
      this.caseStudiesService.getCaseStudyById(this.programId, this.caseStudyId).subscribe((cs) => {
        if (!cs) return;
        while (this.promptsArray.length) this.promptsArray.removeAt(0);
        (cs.prompts ?? []).forEach((p) => this.promptsArray.push(this.fb.control(p)));
        this.form.patchValue({
          moduleId: cs.moduleId,
          title: cs.title,
          description: cs.description,
          scenario: cs.scenario,
          scoringMode: cs.scoringMode,
          order: cs.order,
          active: cs.active,
          status: cs.status,
        });
      });
    }
  }

  addPrompt(): void {
    this.promptsArray.push(this.fb.control(''));
  }

  removePrompt(i: number): void {
    this.promptsArray.removeAt(i);
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
        scenario: raw.scenario ?? '',
        prompts: (raw.prompts as string[]).filter((p) => p.trim() !== ''),
        scoringMode: raw.scoringMode as CaseStudyScoringMode,
        order: raw.order ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentItemStatus,
      };
      if (this.isEditMode && this.caseStudyId) {
        await this.caseStudiesService.updateCaseStudy(this.programId, this.caseStudyId, payload);
      } else {
        await this.caseStudiesService.createCaseStudy(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'case-studies']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }
}
