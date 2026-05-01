import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ContentModuleStatus } from '../models/content-builder.models';

@Component({
  selector: 'app-module-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'modules']" class="back-link">← Modules</a>
        <h1>{{ isEditMode ? 'Edit Module' : 'New Module' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Module title" />
          </div>
          <div class="field">
            <label>Slug</label>
            <input type="text" formControlName="slug" placeholder="module-slug" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="3" placeholder="Brief description"></textarea>
          </div>
          <div class="field">
            <label>Order</label>
            <input type="number" formControlName="order" min="0" />
          </div>
          <div class="field">
            <label>Estimated Hours</label>
            <input type="number" formControlName="estimatedHours" min="0" step="0.5" />
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
              <input type="checkbox" formControlName="required" />
              Required
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" />
              Active
            </label>
          </div>
        </div>

        <div class="objectives-section">
          <label>Learning Objectives</label>
          <div class="objectives-list" formArrayName="objectives">
            <div class="objective-row" *ngFor="let ctrl of objectivesArray.controls; let i = index">
              <input type="text" [formControlName]="i" placeholder="Objective {{ i + 1 }}" />
              <button type="button" class="btn-remove" (click)="removeObjective(i)">✕</button>
            </div>
          </div>
          <button type="button" class="btn-add-objective" (click)="addObjective()">+ Add Objective</button>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'modules']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Module' : 'Create Module') }}
          </button>
        </div>

        <p class="error-msg" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [`
    .form-page { display: grid; gap: 1rem; }

    .form-header {
      background: #fff;
      border: 1px solid #d4e2f0;
      border-radius: 1rem;
      padding: 1.2rem 1.4rem;
    }

    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }

    h1 { margin: 0.25rem 0; color: #0f3659; }

    .form-card {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field.full { grid-column: 1 / -1; }

    label { font-size: 0.82rem; font-weight: 600; color: #4f7097; }

    input[type="text"], input[type="number"], textarea, select {
      padding: 0.55rem 0.75rem;
      border: 1px solid #c8dff7;
      border-radius: 0.55rem;
      font-size: 0.9rem;
      color: #1e3a5a;
      outline: none;
      transition: border-color 0.15s;
      width: 100%;
      box-sizing: border-box;
    }

    input:focus, textarea:focus, select:focus { border-color: #1a74c8; }

    textarea { resize: vertical; }

    .checkboxes { flex-direction: row; align-items: center; gap: 1.2rem; padding-top: 1.4rem; }

    .checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; color: #1e3a5a; cursor: pointer; }

    .objectives-section { margin-top: 1.2rem; }

    .objectives-section > label { font-size: 0.82rem; font-weight: 600; color: #4f7097; display: block; margin-bottom: 0.5rem; }

    .objectives-list { display: grid; gap: 0.4rem; margin-bottom: 0.5rem; }

    .objective-row { display: flex; gap: 0.4rem; }

    .objective-row input { flex: 1; }

    .btn-remove {
      padding: 0.4rem 0.6rem;
      border: none;
      border-radius: 0.45rem;
      background: #fef2f2;
      color: #b91c1c;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-add-objective {
      padding: 0.4rem 0.9rem;
      border: 1px dashed #c8dff7;
      border-radius: 0.5rem;
      background: #f0f6ff;
      color: #1a74c8;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e8f0fb;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      border-radius: 0.55rem;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      background: #f1f5fb;
      color: #4f7097;
    }

    .btn-save {
      padding: 0.55rem 1.4rem;
      border-radius: 0.65rem;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 700;
      background: linear-gradient(135deg, #0f3659, #1a74c8);
      color: #fff;
    }

    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
})
export class ModuleFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  moduleId: string | null = null;
  isEditMode = false;
  saving = false;
  error = '';

  readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    description: [''],
    order: [0],
    estimatedHours: [0],
    objectives: this.fb.array([] as string[]),
    required: [false],
    active: [true],
    status: [ContentModuleStatus.DRAFT],
  });

  get objectivesArray(): FormArray {
    return this.form.get('objectives') as FormArray;
  }

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.moduleId = this.route.snapshot.params['moduleId'] ?? null;
    this.isEditMode = !!this.moduleId;

    if (this.isEditMode && this.moduleId) {
      this.modulesService.getModuleById(this.programId, this.moduleId).subscribe((mod) => {
        if (!mod) return;
        while (this.objectivesArray.length) this.objectivesArray.removeAt(0);
        (mod.objectives ?? []).forEach((o) => this.objectivesArray.push(this.fb.control(o)));
        this.form.patchValue({
          title: mod.title,
          slug: mod.slug,
          description: mod.description,
          order: mod.order,
          estimatedHours: mod.estimatedHours,
          required: mod.required,
          active: mod.active,
          status: mod.status,
        });
      });
    }
  }

  addObjective(): void {
    this.objectivesArray.push(this.fb.control(''));
  }

  removeObjective(i: number): void {
    this.objectivesArray.removeAt(i);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const payload = {
        programId: this.programId,
        slug: raw.slug ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        order: raw.order ?? 0,
        estimatedHours: raw.estimatedHours ?? 0,
        objectives: (raw.objectives as string[]).filter((o) => o.trim() !== ''),
        required: raw.required ?? false,
        active: raw.active ?? true,
        status: raw.status as ContentModuleStatus,
      };
      if (this.isEditMode && this.moduleId) {
        await this.modulesService.updateModule(this.programId, this.moduleId, payload);
      } else {
        await this.modulesService.createModule(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'modules']);
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
}
