import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ProgramCategory,
  ProgramLevel,
  ProgramDeliveryMode,
  ProgramStatus,
  ProgramLessonType,
  type CreateProgramPayload,
  type ProgramModule,
  type ProgramModuleLessonSeed,
} from '../../publics/programs/program.models';
import { ProgramsService } from '../../publics/programs/programs.service';

/* ─────────────────────────────────────────
   JSON TEMPLATE
───────────────────────────────────────── */

const PROGRAM_JSON_TEMPLATE = JSON.stringify(
  {
    title: 'My Training Program',
    subtitle: 'Short subtitle for the program',
    description: 'Full description of this training program and its goals.',
    category: 'DEVOPS',
    level: 'BEGINNER',
    deliveryMode: 'ONLINE',
    status: 'DRAFT',
    active: false,
    isFeatured: false,
    price: 0,
    currency: 'USD',
    durationText: '12 hours',
    scheduleText: 'Self-paced',
    outcomes: [
      'Master core DevOps tools.',
      'Build a CI/CD pipeline from scratch.',
    ],
    requirements: ['Basic knowledge of the command line.'],
    tags: ['devops', 'ubuntu', 'docker'],
    imageUrl: '',
    modules: [
      {
        title: 'Module 1 — Introduction',
        description: 'Overview of the program and environment setup.',
        order: 1,
        estimatedMinutes: 90,
        lessons: [
          {
            title: 'Lesson 1 — Getting Started',
            type: 'reading',
            description: 'Introduction to the course structure.',
            durationMin: 30,
            isPreview: true,
            order: 1,
            htmlContent: '<p>Welcome! In this lesson you will learn...</p>',
          },
          {
            title: 'Lesson 2 — Environment Setup',
            type: 'mixed',
            description: 'Set up your local and cloud environment.',
            durationMin: 60,
            isPreview: false,
            order: 2,
            htmlContent: '<p>Follow the steps below to set up your environment...</p>',
          },
        ],
      },
      {
        title: 'Module 2 — Hands-on Labs',
        description: 'Practical lab exercises.',
        order: 2,
        estimatedMinutes: 180,
        lessons: [
          {
            title: 'Lab 1 — Docker Basics',
            type: 'mixed',
            description: 'Run your first Docker container.',
            durationMin: 90,
            isPreview: false,
            order: 1,
            htmlContent: '<p>In this lab you will install Docker and run...</p>',
          },
        ],
      },
    ],
  },
  null,
  2
);

/* ─────────────────────────────────────────
   PARSER
───────────────────────────────────────── */

interface ParsedProgram {
  payload: CreateProgramPayload;
  moduleCount: number;
  lessonCount: number;
}

function parseProgramJson(raw: string): ParsedProgram {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste or upload a program JSON before importing.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON — could not parse file.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The JSON must be a top-level object.');
  }

  const r = parsed as Record<string, unknown>;

  const title = str(r['title'], 'title');
  const subtitle = str(r['subtitle'] ?? '', 'subtitle', false);
  const description = str(r['description'] ?? '', 'description', false);

  // category
  const catRaw = String(r['category'] ?? 'OTHER').toUpperCase();
  const category = (Object.values(ProgramCategory).includes(catRaw as ProgramCategory)
    ? catRaw
    : ProgramCategory.OTHER) as ProgramCategory;

  // level
  const lvlRaw = String(r['level'] ?? 'BEGINNER').toUpperCase();
  const level = (Object.values(ProgramLevel).includes(lvlRaw as ProgramLevel)
    ? lvlRaw
    : ProgramLevel.BEGINNER) as ProgramLevel;

  // deliveryMode
  const modeRaw = String(r['deliveryMode'] ?? r['delivery_mode'] ?? 'ONLINE').toUpperCase();
  const deliveryMode = (Object.values(ProgramDeliveryMode).includes(modeRaw as ProgramDeliveryMode)
    ? modeRaw
    : ProgramDeliveryMode.ONLINE) as ProgramDeliveryMode;

  // status
  const statusRaw = String(r['status'] ?? 'DRAFT').toUpperCase();
  const status = (Object.values(ProgramStatus).includes(statusRaw as ProgramStatus)
    ? statusRaw
    : ProgramStatus.DRAFT) as ProgramStatus;

  const active = r['active'] === true;
  const isFeatured = r['isFeatured'] === true || r['featured'] === true;
  const price = num(r['price'], 0);
  const currency = (str(r['currency'] ?? 'USD', 'currency', false) || 'USD') as 'USD' | 'CAD' | 'AED' | 'EUR' | 'GBP';
  const durationText = str(r['durationText'] ?? r['duration'] ?? '', 'durationText', false);
  const scheduleText = str(r['scheduleText'] ?? r['schedule'] ?? '', 'scheduleText', false);
  const imageUrl = str(r['imageUrl'] ?? '', 'imageUrl', false);

  const outcomes = strArray(r['outcomes'] ?? r['learningObjectives'] ?? []);
  const requirements = strArray(r['requirements'] ?? []);
  const tags = strArray(r['tags'] ?? []);

  // modules
  const rawModules = Array.isArray(r['modules']) ? r['modules'] : [];
  let lessonCount = 0;
  const modules: ProgramModule[] = rawModules.map((m: unknown, mi: number) => {
    const mod = (typeof m === 'object' && m !== null ? m : {}) as Record<string, unknown>;
    const modTitle = str(mod['title'] ?? `Module ${mi + 1}`, `modules[${mi}].title`, false);
    const lessons: ProgramModuleLessonSeed[] = parseModuleLessons(mod['lessons'], mi);
    lessonCount += lessons.length;
    return {
      id: slugify(`${modTitle}-${mi + 1}`),
      title: modTitle,
      description: str(mod['description'] ?? '', `modules[${mi}].description`, false),
      order: typeof mod['order'] === 'number' ? mod['order'] : mi + 1,
      estimatedMinutes: num(mod['estimatedMinutes'] ?? mod['estimatedHours'], 0) * (mod['estimatedHours'] ? 60 : 1),
      active,
      lessons,
    } as ProgramModule;
  });

  const payload: CreateProgramPayload = {
    title,
    subtitle,
    description,
    category,
    level,
    deliveryMode,
    status,
    active,
    isFeatured,
    price,
    currency,
    durationText,
    scheduleText,
    imageUrl,
    outcomes,
    requirements,
    tags,
    modules,
  };

  return { payload, moduleCount: modules.length, lessonCount };
}

function parseModuleLessons(raw: unknown, mi: number): ProgramModuleLessonSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((l: unknown, li: number) => {
    const lesson = (typeof l === 'object' && l !== null ? l : {}) as Record<string, unknown>;
    const typeRaw = String(lesson['type'] ?? lesson['lessonType'] ?? 'reading').toLowerCase();
    const type = mapLessonType(typeRaw);
    return {
      title: str(lesson['title'] ?? `Lesson ${li + 1}`, `modules[${mi}].lessons[${li}].title`, false),
      type,
      description: str(lesson['description'] ?? '', 'desc', false),
      contentHtml: str(lesson['htmlContent'] ?? lesson['contentHtml'] ?? lesson['content'] ?? '', 'html', false),
      videoUrl: str(lesson['videoUrl'] ?? '', 'videoUrl', false),
      durationMin: num(lesson['durationMin'] ?? lesson['estimatedMinutes'], 0),
      isPreview: lesson['isPreview'] === true,
      downloadable: lesson['downloadable'] === true,
      active: lesson['active'] !== false,
      status: str(lesson['status'] ?? 'DRAFT', 'status', false),
      order: typeof lesson['order'] === 'number' ? lesson['order'] : li + 1,
    } as ProgramModuleLessonSeed;
  });
}

function mapLessonType(raw: string): ProgramLessonType {
  if (raw === 'video') return ProgramLessonType.VIDEO;
  if (raw === 'document') return ProgramLessonType.DOCUMENT;
  if (raw === 'mixed' || raw === 'practical_lab' || raw === 'lab') return ProgramLessonType.MIXED;
  if (raw === 'web') return ProgramLessonType.WEB;
  return ProgramLessonType.READING;
}

function str(v: unknown, _field: string, required = true): string {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (required && !v) throw new Error(`Missing required field: ${_field}`);
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */

@Component({
  selector: 'app-program-import-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="import-page">

      <!-- Header -->
      <header class="import-header">
        <a routerLink="/program-admin/programs" class="back-link">← Programs</a>
        <h1>Import Program from JSON</h1>
        <p class="subtitle">
          Paste or upload a program seed JSON to create a <strong>program + all its modules + all lessons</strong> in one operation.
        </p>
      </header>

      <!-- Step 1 — JSON Input -->
      <div class="import-card">
        <div class="import-card__head">
          <div>
            <span class="step-badge">Step 1</span>
            <strong>Provide JSON</strong>
            <p>The JSON must have a <code>modules[]</code> array — each module has a <code>lessons[]</code> array.</p>
          </div>
          <div class="import-card__actions">
            <button type="button" class="btn-secondary" (click)="loadTemplate()">Load Template</button>
            <button type="button" class="btn-secondary" (click)="downloadTemplate()">Download Template</button>
            <button type="button" class="btn-secondary" (click)="fileInput.click()">Upload .json</button>
          </div>
        </div>

        <input #fileInput type="file" accept=".json,application/json" class="visually-hidden" (change)="onFileSelected($event)" />

        <textarea
          class="json-textarea"
          rows="18"
          [value]="jsonText()"
          (input)="onJsonInput($event)"
          placeholder='{ "title": "My Program", "modules": [{ "title": "Module 1", "lessons": [...] }] }'
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
              {{ parsed()!.moduleCount }} module(s) · {{ parsed()!.lessonCount }} lesson(s)
            </span>
          </div>

          <!-- Program meta -->
          <div class="program-summary">
            <div class="meta-grid">
              <div class="meta-item"><span>Title</span><strong>{{ parsed()!.payload.title }}</strong></div>
              <div class="meta-item"><span>Subtitle</span><strong>{{ parsed()!.payload.subtitle || '—' }}</strong></div>
              <div class="meta-item"><span>Category</span><strong>{{ parsed()!.payload.category }}</strong></div>
              <div class="meta-item"><span>Level</span><strong>{{ parsed()!.payload.level }}</strong></div>
              <div class="meta-item"><span>Delivery</span><strong>{{ parsed()!.payload.deliveryMode }}</strong></div>
              <div class="meta-item"><span>Status</span><strong>{{ parsed()!.payload.status }}</strong></div>
              <div class="meta-item"><span>Price</span><strong>{{ parsed()!.payload.price | currency: parsed()!.payload.currency }}</strong></div>
              <div class="meta-item"><span>Duration</span><strong>{{ parsed()!.payload.durationText || '—' }}</strong></div>
              <div class="meta-item"><span>Active</span><strong>{{ parsed()!.payload.active ? 'Yes' : 'No' }}</strong></div>
            </div>

            <div *ngIf="parsed()!.payload.outcomes?.length" class="outcomes-block">
              <strong>Learning Outcomes ({{ parsed()!.payload.outcomes!.length }})</strong>
              <ul><li *ngFor="let o of parsed()!.payload.outcomes">{{ o }}</li></ul>
            </div>
          </div>

          <!-- Modules + lessons -->
          <div class="modules-preview">
            <strong class="section-label">Modules & Lessons</strong>
            <div class="module-list">
              <div class="module-item" *ngFor="let mod of parsed()!.payload.modules; let mi = index">
                <div class="module-item__head">
                  <span class="module-badge">M{{ mi + 1 }}</span>
                  <div>
                    <strong>{{ mod.title }}</strong>
                    <small *ngIf="mod.description">{{ mod.description }}</small>
                  </div>
                  <span class="lesson-count">{{ mod.lessons?.length ?? 0 }} lesson(s)</span>
                </div>
                <div class="lesson-list" *ngIf="mod.lessons?.length">
                  <div class="lesson-row" *ngFor="let lesson of asLessons(mod.lessons)">
                    <span class="lesson-type-badge">{{ lesson.type }}</span>
                    <div class="lesson-info">
                      <strong>{{ lesson.title }}</strong>
                      <small>{{ lesson.durationMin }}min · order {{ lesson.order }}</small>
                      <span class="html-flag" *ngIf="lesson.contentHtml">HTML ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Import action -->
          <div class="preview-card__footer">
            <p class="import-note">
              Creates <strong>1 program</strong> + <strong>{{ parsed()!.moduleCount }} modules</strong> + <strong>{{ parsed()!.lessonCount }} lessons</strong> in Firestore.
            </p>
            <button
              type="button"
              class="btn-import"
              [disabled]="importing()"
              (click)="runImport()"
            >
              {{ importing() ? importProgress() : '🚀 Create Program' }}
            </button>
          </div>
          <p class="error-msg" *ngIf="importError()">{{ importError() }}</p>
        </div>
      }

      <!-- Step 3 — Success -->
      @if (importDone()) {
        <div class="success-card">
          <div class="success-icon">✅</div>
          <h2>Program created!</h2>
          <p>
            Program ID: <code>{{ createdProgramId() }}</code>
          </p>
          <div class="success-actions">
            <a [routerLink]="['/program-admin/programs', createdProgramId(), 'content']" class="btn-primary">Go to Content</a>
            <a [routerLink]="['/program-admin/programs', createdProgramId(), 'edit']" class="btn-secondary">Edit Program</a>
            <a routerLink="/program-admin/programs" class="btn-secondary">All Programs</a>
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

    .import-card__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .import-card__head p { margin: 0.25rem 0 0; color: #5f7f9f; font-size: 0.85rem; }
    .import-card__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .import-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }

    .step-badge {
      display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px;
      background: #e8f0fb; color: #1a74c8; font-size: 0.72rem; font-weight: 800;
      letter-spacing: 0.06em; text-transform: uppercase; margin-right: 0.5rem;
    }
    .step-badge--green { background: #dcfce7; color: #16a34a; }

    .json-textarea {
      width: 100%; box-sizing: border-box; padding: 0.75rem;
      border: 1px solid #c8dff7; border-radius: 0.65rem;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 0.82rem; color: #1e3a5a; resize: vertical; outline: none;
    }
    .json-textarea:focus { border-color: #1a74c8; }

    code { font-family: 'JetBrains Mono', Consolas, monospace; background: #f0f6ff; padding: 0.1rem 0.35rem; border-radius: 0.3rem; font-size: 0.82rem; color: #0f3659; }
    .hint { margin: 0; color: #5f7f9f; font-size: 0.83rem; }

    /* Preview */
    .preview-card__head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .preview-summary { margin-left: auto; color: #5f7f9f; font-size: 0.85rem; }

    .program-summary { background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 0.75rem; padding: 1rem; display: grid; gap: 0.75rem; }

    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .meta-item { background: #fff; border: 1px solid #d9e5f2; border-radius: 0.55rem; padding: 0.6rem 0.75rem; }
    .meta-item span { display: block; font-size: 0.7rem; font-weight: 700; color: #5f7f9f; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.2rem; }
    .meta-item strong { color: #0f3659; font-size: 0.9rem; }

    .outcomes-block { display: grid; gap: 0.4rem; }
    .outcomes-block strong { font-size: 0.82rem; font-weight: 700; color: #4f7097; text-transform: uppercase; letter-spacing: 0.06em; }
    .outcomes-block ul { margin: 0; padding-left: 1.2rem; }
    .outcomes-block li { color: #253244; font-size: 0.9rem; line-height: 1.65; }

    .section-label { font-size: 0.82rem; font-weight: 700; color: #4f7097; text-transform: uppercase; letter-spacing: 0.06em; }

    .module-list { display: grid; gap: 0.75rem; }
    .module-item { border: 1px solid #d9e5f2; border-radius: 0.75rem; overflow: hidden; }
    .module-item__head { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; background: #f4f9ff; }
    .module-badge { flex-shrink: 0; width: 2.2rem; height: 2.2rem; display: flex; align-items: center; justify-content: center; background: #e8f0fb; color: #1a74c8; border-radius: 0.5rem; font-weight: 800; font-size: 0.85rem; }
    .module-item__head div { flex: 1; }
    .module-item__head strong { color: #0f3659; font-size: 0.95rem; }
    .module-item__head small { display: block; color: #5f7f9f; font-size: 0.8rem; margin-top: 0.1rem; }
    .lesson-count { color: #5f7f9f; font-size: 0.8rem; white-space: nowrap; }

    .lesson-list { display: grid; gap: 0; }
    .lesson-row { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 1rem; border-top: 1px solid #eef3fb; }
    .lesson-type-badge { flex-shrink: 0; padding: 0.15rem 0.45rem; border-radius: 0.35rem; background: #e8f0fb; color: #1a74c8; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    .lesson-info { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
    .lesson-info strong { color: #0f3659; font-size: 0.88rem; }
    .lesson-info small { color: #5f7f9f; font-size: 0.78rem; }
    .html-flag { padding: 0.1rem 0.35rem; background: #dcfce7; color: #16a34a; border-radius: 0.3rem; font-size: 0.7rem; font-weight: 700; }

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
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

    @media (max-width: 768px) {
      .meta-grid { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class ProgramImportPage {
  private readonly programsService = inject(ProgramsService);

  readonly jsonText = signal('');
  readonly inputStatus = signal('');
  readonly parseError = signal('');
  readonly parsed = signal<ParsedProgram | null>(null);
  readonly importing = signal(false);
  readonly importProgress = signal('Creating program…');
  readonly importError = signal('');
  readonly importDone = signal(false);
  readonly createdProgramId = signal('');

  onJsonInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.jsonText.set(value);
    this.parsed.set(null);
    this.parseError.set('');
    this.inputStatus.set('');
  }

  loadTemplate(): void {
    this.jsonText.set(PROGRAM_JSON_TEMPLATE);
    this.parsed.set(null);
    this.parseError.set('');
    this.inputStatus.set('Template loaded. Edit it, then click Preview Import.');
  }

  downloadTemplate(): void {
    const blob = new Blob([PROGRAM_JSON_TEMPLATE], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'program-template.json';
    a.click();
    URL.revokeObjectURL(a.href);
    this.inputStatus.set('Template downloaded.');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await this.readFile(file);
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

  preview(): void {
    this.parseError.set('');
    this.parsed.set(null);
    try {
      const result = parseProgramJson(this.jsonText());
      this.parsed.set(result);
      this.inputStatus.set(`Ready: ${result.moduleCount} modules · ${result.lessonCount} lessons.`);
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Parse error.');
    }
  }

  async runImport(): Promise<void> {
    const data = this.parsed();
    if (!data) {
      this.importError.set('No parsed data. Click Preview first.');
      return;
    }

    this.importing.set(true);
    this.importError.set('');
    this.importProgress.set('Creating program + modules + lessons…');

    try {
      const programId = await this.programsService.createProgram(data.payload);
      this.createdProgramId.set(programId);
      this.importDone.set(true);
    } catch (e: unknown) {
      console.error('[ProgramImport] createProgram failed:', e);
      this.importError.set(e instanceof Error ? e.message : 'Import failed.');
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
    this.importProgress.set('Creating program…');
    this.importError.set('');
    this.importDone.set(false);
    this.createdProgramId.set('');
  }

  asLessons(lessons: unknown): ProgramModuleLessonSeed[] {
    return Array.isArray(lessons) ? (lessons as ProgramModuleLessonSeed[]) : [];
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file, 'utf-8');
    });
  }
}
