import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ProgramLessonsAdminService } from '../services/program-lessons-admin.service';
import {
  parseModuleJsonImport,
  MODULE_JSON_TEMPLATE,
  type ModuleJsonImport,
} from '../utils/module-import.util';
import { downloadJsonTemplateFile } from '../utils/question-import.util';

@Component({
  selector: 'app-module-import-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="import-page">

      <!-- Header -->
      <header class="import-header">
        <a [routerLink]="['/program-admin/programs', programId(), 'modules']" class="back-link">← Modules</a>
        <h1>Import Module from JSON</h1>
        <p class="subtitle">Upload or paste a module seed JSON to create a module and all its lessons in one operation.</p>
      </header>

      <!-- Step 1 — JSON Input -->
      <div class="import-card">
        <div class="import-card__head">
          <div>
            <span class="step-badge">Step 1</span>
            <strong>Provide JSON</strong>
            <p>Paste JSON directly, upload a <code>.json</code> file, or download the template to get started.</p>
          </div>
          <div class="import-card__actions">
            <button type="button" class="btn-secondary" (click)="loadTemplate()">Load Template</button>
            <button type="button" class="btn-secondary" (click)="downloadTemplate()">Download Template</button>
            <button type="button" class="btn-secondary" (click)="fileInput.click()">Upload .json File</button>
          </div>
        </div>

        <input #fileInput type="file" accept=".json,application/json" class="visually-hidden" (change)="onFileSelected($event)" />

        <textarea
          class="json-textarea"
          rows="16"
          [value]="jsonText()"
          (input)="onJsonInput($event)"
          placeholder='{ "title": "My Module", "lessons": [...] }'
        ></textarea>

        <div class="import-card__footer">
          <p class="hint" *ngIf="inputStatus()">{{ inputStatus() }}</p>
          <button type="button" class="btn-primary" (click)="preview()">Preview Import</button>
        </div>

        <p class="error-msg" *ngIf="parseError()">{{ parseError() }}</p>
      </div>

      <!-- Step 2 — Preview -->
      @if (parsed()) {
        <div class="preview-card">
          <div class="preview-card__head">
            <span class="step-badge step-badge--green">Step 2</span>
            <strong>Preview</strong>
            <span class="preview-summary">
              1 module · {{ parsed()!.lessons.length }} lesson(s)
            </span>
          </div>

          <!-- Module summary -->
          <div class="module-summary">
            <div class="meta-grid">
              <div class="meta-item"><span>Title</span><strong>{{ parsed()!.title }}</strong></div>
              <div class="meta-item"><span>Slug</span><strong>{{ parsed()!.slug }}</strong></div>
              <div class="meta-item"><span>Est. Hours</span><strong>{{ parsed()!.estimatedHours }}h</strong></div>
              <div class="meta-item"><span>Status</span><strong>{{ parsed()!.status }}</strong></div>
              <div class="meta-item"><span>Required</span><strong>{{ parsed()!.isRequired ? 'Yes' : 'No' }}</strong></div>
              <div class="meta-item"><span>Active</span><strong>{{ parsed()!.isActive ? 'Yes' : 'No' }}</strong></div>
            </div>

            <div *ngIf="parsed()!.objectives.length > 0" class="objectives-block">
              <strong>Learning Objectives ({{ parsed()!.objectives.length }})</strong>
              <ul>
                <li *ngFor="let obj of parsed()!.objectives">{{ obj }}</li>
              </ul>
            </div>

            <div *ngIf="parsed()!.description" class="desc-block">
              <strong>Description</strong>
              <p>{{ parsed()!.description }}</p>
            </div>
          </div>

          <!-- Lessons list -->
          <div class="lessons-preview">
            <strong class="lessons-title">Lessons</strong>
            <div class="lesson-list">
              <div class="lesson-row" *ngFor="let lesson of parsed()!.lessons">
                <span class="lesson-order">{{ lesson.order + 1 }}</span>
                <div class="lesson-info">
                  <strong>{{ lesson.title }}</strong>
                  <small>{{ lesson.slug }} · {{ lesson.lessonType }} · {{ lesson.durationMin }}min · {{ lesson.status }}</small>
                  <span class="html-indicator" *ngIf="lesson.contentHtml">HTML content included</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Import action -->
          <div class="preview-card__footer">
            <p class="import-note">
              This will create <strong>1 module</strong> and <strong>{{ parsed()!.lessons.length }} lesson(s)</strong> in Firestore under program <code>{{ programId() }}</code>.
            </p>
            <button
              type="button"
              class="btn-import"
              [disabled]="importing()"
              (click)="runImport()"
            >
              {{ importing() ? importProgress() : 'Import Module + Lessons' }}
            </button>
          </div>

          <p class="error-msg" *ngIf="importError()">{{ importError() }}</p>
        </div>
      }

      <!-- Step 3 — Success -->
      @if (importDone()) {
        <div class="success-card">
          <div class="success-icon">{{ importResult()!.failed === 0 ? '✅' : '⚠️' }}</div>
          <h2>{{ importResult()!.failed === 0 ? 'Import complete!' : 'Import finished with errors' }}</h2>
          <p>
            Module created &nbsp;·&nbsp;
            <strong>{{ importResult()!.created }} / {{ importResult()!.created + importResult()!.failed }} lessons</strong> imported successfully.
          </p>

          @if (importResult()!.errors.length > 0) {
            <div class="error-list">
              <strong>Failed lessons:</strong>
              <ul>
                <li *ngFor="let err of importResult()!.errors">{{ err }}</li>
              </ul>
            </div>
          }

          <div class="success-actions">
            <a [routerLink]="['/program-admin/programs', programId(), 'modules']" class="btn-primary">View Modules</a>
            <a [routerLink]="['/program-admin/programs', programId(), 'lessons']" class="btn-secondary">View Lessons</a>
            <button type="button" class="btn-secondary" (click)="reset()">Import Another</button>
          </div>
        </div>
      }

    </section>
  `,
  styles: [`
    .import-page { display: grid; gap: 1.25rem; }

    .import-header {
      background: #fff;
      border: 1px solid #d4e2f0;
      border-radius: 1rem;
      padding: 1.25rem 1.5rem;
    }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.3rem 0 0.2rem; color: #0f3659; font-size: 1.4rem; }
    .subtitle { margin: 0; color: #5f7f9f; font-size: 0.9rem; }

    .import-card, .preview-card, .success-card {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 1.4rem;
      display: grid;
      gap: 1rem;
    }

    .import-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .import-card__head p { margin: 0.25rem 0 0; color: #5f7f9f; font-size: 0.85rem; }
    .import-card__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .import-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }

    .step-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: #e8f0fb;
      color: #1a74c8;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-right: 0.5rem;
    }
    .step-badge--green { background: #dcfce7; color: #16a34a; }

    .json-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem;
      border: 1px solid #c8dff7;
      border-radius: 0.65rem;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 0.82rem;
      color: #1e3a5a;
      resize: vertical;
      outline: none;
    }
    .json-textarea:focus { border-color: #1a74c8; }

    .hint { margin: 0; color: #5f7f9f; font-size: 0.83rem; }

    code { font-family: 'JetBrains Mono', Consolas, monospace; background: #f0f6ff; padding: 0.1rem 0.35rem; border-radius: 0.3rem; font-size: 0.82rem; color: #0f3659; }

    /* Preview */
    .preview-card__head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .preview-summary { margin-left: auto; color: #5f7f9f; font-size: 0.85rem; }

    .module-summary { background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 0.75rem; padding: 1rem; display: grid; gap: 0.75rem; }

    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .meta-item { background: #fff; border: 1px solid #d9e5f2; border-radius: 0.55rem; padding: 0.6rem 0.75rem; }
    .meta-item span { display: block; font-size: 0.7rem; font-weight: 700; color: #5f7f9f; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.2rem; }
    .meta-item strong { color: #0f3659; font-size: 0.9rem; }

    .objectives-block, .desc-block { display: grid; gap: 0.4rem; }
    .objectives-block strong, .desc-block strong { font-size: 0.82rem; font-weight: 700; color: #4f7097; text-transform: uppercase; letter-spacing: 0.06em; }
    .objectives-block ul { margin: 0; padding-left: 1.2rem; }
    .objectives-block li, .desc-block p { color: #253244; font-size: 0.9rem; line-height: 1.65; margin: 0; }

    .lessons-preview { display: grid; gap: 0.65rem; }
    .lessons-title { font-size: 0.82rem; font-weight: 700; color: #4f7097; text-transform: uppercase; letter-spacing: 0.06em; }
    .lesson-list { display: grid; gap: 0.5rem; }
    .lesson-row { display: flex; align-items: flex-start; gap: 0.75rem; background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 0.65rem; padding: 0.75rem; }
    .lesson-order { flex-shrink: 0; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; background: #e8f0fb; color: #1a74c8; border-radius: 0.45rem; font-weight: 800; font-size: 0.85rem; }
    .lesson-info { display: grid; gap: 0.15rem; }
    .lesson-info strong { color: #0f3659; font-size: 0.92rem; }
    .lesson-info small { color: #5f7f9f; font-size: 0.78rem; }
    .html-indicator { display: inline-block; margin-top: 0.2rem; padding: 0.1rem 0.4rem; background: #dcfce7; color: #16a34a; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 700; }

    .preview-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid #e8f0fb; }
    .import-note { margin: 0; color: #5f7f9f; font-size: 0.85rem; }

    /* Success */
    .success-card { text-align: center; padding: 2.5rem 1.5rem; }
    .success-icon { font-size: 3rem; margin-bottom: 0.75rem; }
    .success-card h2 { color: #0f3659; margin: 0 0 0.5rem; }
    .success-card p { color: #5f7f9f; margin: 0 0 1.5rem; }
    .success-actions { display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; }

    /* Buttons */
    .btn-primary { padding: 0.55rem 1.25rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; text-decoration: none; display: inline-block; }
    .btn-secondary { padding: 0.5rem 0.9rem; border: 1px solid #c8dff7; border-radius: 0.55rem; background: #fff; color: #1a74c8; cursor: pointer; font-size: 0.84rem; font-weight: 600; text-decoration: none; display: inline-block; }
    .btn-import { padding: 0.65rem 1.6rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.92rem; font-weight: 700; background: linear-gradient(135deg, #065f46, #16a34a); color: #fff; }
    .btn-import:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-msg { color: #b91c1c; font-size: 0.85rem; margin: 0; }
    .error-list { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 0.65rem; padding: 0.75rem 1rem; text-align: left; max-width: 600px; margin: 0 auto; }
    .error-list strong { color: #b91c1c; font-size: 0.82rem; }
    .error-list ul { margin: 0.4rem 0 0; padding-left: 1.2rem; }
    .error-list li { color: #7f1d1d; font-size: 0.82rem; line-height: 1.6; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

    @media (max-width: 768px) {
      .meta-grid { grid-template-columns: 1fr 1fr; }
      .import-card__head, .preview-card__head { flex-direction: column; }
    }
  `],
})
export class ModuleImportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modulesService = inject(ProgramModulesAdminService);
  private readonly lessonsService = inject(ProgramLessonsAdminService);

  readonly programId = signal(this.getRequiredProgramId());

  readonly jsonText = signal('');
  readonly inputStatus = signal('');
  readonly parseError = signal('');
  readonly parsed = signal<ModuleJsonImport | null>(null);
  readonly importing = signal(false);
  readonly importProgress = signal('Importing…');
  readonly importError = signal('');
  readonly importResult = signal<{ moduleId: string; created: number; failed: number; errors: string[] } | null>(null);
  readonly importDone = signal(false);

  onJsonInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.jsonText.set(value);
    this.parsed.set(null);
    this.parseError.set('');
    this.inputStatus.set('');
  }

  loadTemplate(): void {
    this.jsonText.set(MODULE_JSON_TEMPLATE);
    this.parsed.set(null);
    this.parseError.set('');
    this.inputStatus.set('Template loaded. Edit it, then click Preview Import.');
  }

  downloadTemplate(): void {
    downloadJsonTemplateFile('module-template.json', MODULE_JSON_TEMPLATE);
    this.inputStatus.set('Template downloaded.');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await this.readJsonFileText(file);
      this.jsonText.set(text);
      this.parsed.set(null);
      this.parseError.set('');
      this.inputStatus.set(`Loaded: ${file.name}. Click Preview Import.`);
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Unable to read file.');
    } finally {
      input.value = '';
    }
  }

  private readJsonFileText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  preview(): void {
    this.parseError.set('');
    this.parsed.set(null);
    try {
      const result = parseModuleJsonImport(this.jsonText());
      this.parsed.set(result);
      this.inputStatus.set(`Ready: 1 module + ${result.lessons.length} lesson(s).`);
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Parse error.');
    }
  }

  async runImport(): Promise<void> {
    const data = this.parsed();
    const programId = this.programId();

    if (!data || !programId) {
      this.importError.set('Missing parsed data or program ID.');
      return;
    }

    this.importing.set(true);
    this.importError.set('');
    this.importResult.set(null);

    try {
      // 1. Create module
      this.importProgress.set('Creating module…');
      let moduleId: string;
      try {
        moduleId = await this.modulesService.createModule(programId, {
          programId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          order: 0,
          estimatedHours: data.estimatedHours,
          objectives: data.objectives,
          required: data.isRequired,
          active: data.isActive,
          status: data.status,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[ModuleImport] createModule failed:', e);
        this.importError.set(`Module creation failed: ${msg}`);
        this.importing.set(false);
        return;
      }

      // 2. Create lessons — continue even if individual lessons fail
      const total = data.lessons.length;
      let created = 0;
      const errors: string[] = [];

      for (let i = 0; i < total; i++) {
        const lesson = data.lessons[i];
        this.importProgress.set(`Importing lesson ${i + 1} / ${total}: "${lesson.title}"…`);
        try {
          await this.lessonsService.createLesson(programId, {
            programId,
            moduleId,
            slug: lesson.slug,
            title: lesson.title,
            description: lesson.description,
            lessonType: lesson.lessonType,
            contentHtml: lesson.contentHtml,
            videoUrl: '',
            durationMin: lesson.durationMin,
            order: lesson.order,
            isPreview: false,
            downloadable: false,
            active: true,
            status: lesson.status,
          });
          created++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[ModuleImport] createLesson ${i + 1} failed:`, e);
          errors.push(`Lesson ${i + 1} "${lesson.title}": ${msg}`);
        }
      }

      this.importResult.set({ moduleId, created, failed: total - created, errors });
      this.importDone.set(true);
    } finally {
      this.importing.set(false);
    }
  }

  reset(): void {
    this.jsonText.set('');
    this.inputStatus.set('');
    this.parseError.set('');
    this.parsed.set(null);
    this.importing.set(false);
    this.importProgress.set('Importing…');
    this.importError.set('');
    this.importResult.set(null);
    this.importDone.set(false);
  }

  private getRequiredProgramId(): string {
    return this.route.snapshot.pathFromRoot
      .map((s) => s.paramMap.get('programId'))
      .find((v): v is string => !!v?.trim()) ?? '';
  }
}
