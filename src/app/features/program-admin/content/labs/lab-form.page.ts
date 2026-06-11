import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramLabsAdminService } from '../services/program-labs-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ProgramContentModule } from '../models/content-builder.models';
import { LabCategory, LabDifficulty, LabType, ValidationMode } from '../../../lab-engine/models/lab-definition.model';
import {
  LAB_JSON_TEMPLATE,
  LabJsonImport,
  downloadLabTemplateFile,
  parseLabJsonImport,
} from '../utils/lab-import.util';

const CATEGORIES: LabCategory[] = [
  'devops', 'cloud', 'linux', 'web-development',
  'agentic-ai', 'ai-agent-creation', 'rag-prompt-stack', 'sysadmin-aiops',
];
const DIFFICULTIES: LabDifficulty[] = ['beginner', 'intermediate', 'advanced', 'enterprise'];
const LAB_TYPES: LabType[] = ['browser', 'agent-config', 'cloud-guided', 'container-future'];
const VALIDATION_MODES: ValidationMode[] = ['rules', 'ai-rubric', 'hybrid'];

@Component({
  selector: 'app-lab-form-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lab-form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'labs']" class="back-link">
          ← Labs
        </a>
        <h1>{{ isEdit() ? 'Edit Lab' : 'Create Lab' }}</h1>
        <p class="subtitle">Labs are visible only to learners enrolled in this program.</p>
      </header>

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!-- JSON IMPORT PANEL                                           -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <div class="json-import-card">
        <div class="json-import-card__head">
          <div>
            <span class="json-import-card__icon">&#123; &#125;</span>
            <div>
              <label>JSON Lab Import</label>
              <p>Download the JSON model, fill in your lab details, then upload or paste and click <strong>Apply to Form</strong> to auto-fill all fields in one click.</p>
            </div>
          </div>
          <div class="json-import-card__actions">
            <button type="button" class="btn-json" (click)="loadTemplate()">
              <span>📄</span> Load Template
            </button>
            <button type="button" class="btn-json" (click)="downloadTemplate()">
              <span>⬇</span> Download JSON Model
            </button>
            <button type="button" class="btn-json" (click)="jsonFileInput.click()">
              <span>📂</span> Upload .json File
            </button>
            <button type="button" class="btn-json btn-json--preview" (click)="preview()">
              <span>👁</span> Preview
            </button>
            <button type="button" class="btn-json btn-json--apply"
              [disabled]="!parsedImport()" (click)="applyImport()">
              <span>✓</span> Apply to Form
            </button>
          </div>
        </div>

        <input #jsonFileInput type="file" accept=".json,application/json"
          class="visually-hidden" (change)="onFileSelected($event)" />

        <textarea
          class="json-textarea"
          rows="10"
          [value]="jsonText()"
          (input)="onJsonInput($event)"
          placeholder='Paste your lab JSON here, or use the buttons above…'
          spellcheck="false">
        </textarea>

        @if (importStatus()) {
          <p class="json-status">{{ importStatus() }}</p>
        }
        @if (parseError()) {
          <p class="json-error">⚠ {{ parseError() }}</p>
        }

        <!-- Preview Card -->
        @if (parsedImport(); as preview) {
          <div class="json-preview">
            <div class="json-preview__head">
              <strong>✓ Preview — ready to apply</strong>
              <button type="button" class="btn-json btn-json--apply" (click)="applyImport()">
                Apply to Form →
              </button>
            </div>
            <div class="json-preview__grid">
              @if (preview.title) {
                <div><span>Title</span><strong>{{ preview.title }}</strong></div>
              }
              @if (preview.slug) {
                <div><span>Slug</span><strong>{{ preview.slug }}</strong></div>
              }
              @if (preview.category) {
                <div><span>Category</span><strong>{{ preview.category }}</strong></div>
              }
              @if (preview.difficulty) {
                <div><span>Difficulty</span><strong>{{ preview.difficulty }}</strong></div>
              }
              @if (preview.labType) {
                <div><span>Lab Type</span><strong>{{ preview.labType }}</strong></div>
              }
              @if (preview.xp !== undefined) {
                <div><span>XP</span><strong>{{ preview.xp }}</strong></div>
              }
              @if (preview.estimatedMinutes !== undefined) {
                <div><span>Est. Minutes</span><strong>{{ preview.estimatedMinutes }}</strong></div>
              }
              @if (preview.learningOutcomes?.length) {
                <div class="preview-full"><span>Outcomes</span><strong>{{ preview.learningOutcomes!.length }} items</strong></div>
              }
              @if (preview.tags?.length) {
                <div class="preview-full"><span>Tags</span><strong>{{ preview.tags!.join(', ') }}</strong></div>
              }
              @if (preview.prerequisites?.length) {
                <div class="preview-full"><span>Prerequisites</span><strong>{{ preview.prerequisites!.length }} items</strong></div>
              }
            </div>
          </div>
        }

        @if (applySuccess()) {
          <p class="json-success">✓ JSON applied! Review the fields below and save.</p>
        }
      </div>

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!-- MANUAL FORM                                                  -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <form [formGroup]="form" (ngSubmit)="save()" class="lab-form">

        <!-- Row 1: Title + Slug -->
        <div class="form-row form-row--2col">
          <div class="form-field">
            <label for="lab-title">Title *</label>
            <input id="lab-title" type="text" formControlName="title"
              placeholder="e.g. Build a CI/CD Pipeline with GitHub Actions" />
          </div>
          <div class="form-field">
            <label for="lab-slug">Slug *</label>
            <input id="lab-slug" type="text" formControlName="slug"
              placeholder="build-cicd-pipeline-github-actions" />
          </div>
        </div>

        <!-- Row 2: Subtitle -->
        <div class="form-field">
          <label for="lab-subtitle">Subtitle</label>
          <input id="lab-subtitle" type="text" formControlName="subtitle"
            placeholder="Short summary shown on lab card" />
        </div>

        <!-- Row 3: Description -->
        <div class="form-field">
          <label for="lab-description">Description *</label>
          <textarea id="lab-description" formControlName="description"
            rows="3" placeholder="Detailed description of this lab's mission and objectives"></textarea>
        </div>

        <!-- Row 4: Module + Category + Difficulty -->
        <div class="form-row form-row--3col">
          <div class="form-field">
            <label for="lab-module">Module *</label>
            <select id="lab-module" formControlName="moduleId">
              <option value="">— Select Module —</option>
              @for (mod of modules(); track mod.id) {
                <option [value]="mod.id">{{ mod.title }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="lab-category">Category *</label>
            <select id="lab-category" formControlName="category">
              @for (cat of CATEGORIES; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="lab-difficulty">Difficulty *</label>
            <select id="lab-difficulty" formControlName="difficulty">
              @for (d of DIFFICULTIES; track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Row 5: Lab Type + Validation Mode + Order -->
        <div class="form-row form-row--3col">
          <div class="form-field">
            <label for="lab-type">Lab Type *</label>
            <select id="lab-type" formControlName="labType">
              @for (t of LAB_TYPES; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="lab-validation">Validation Mode *</label>
            <select id="lab-validation" formControlName="validationMode">
              @for (v of VALIDATION_MODES; track v) {
                <option [value]="v">{{ v }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="lab-order">Order</label>
            <input id="lab-order" type="number" formControlName="order" min="0" />
          </div>
        </div>

        <!-- Row 6: XP + Duration -->
        <div class="form-row form-row--2col">
          <div class="form-field">
            <label for="lab-xp">XP Reward</label>
            <input id="lab-xp" type="number" formControlName="xp" min="0" />
          </div>
          <div class="form-field">
            <label for="lab-duration">Estimated Minutes</label>
            <input id="lab-duration" type="number" formControlName="estimatedMinutes" min="5" />
          </div>
        </div>

        <!-- Row 7: Tags -->
        <div class="form-field">
          <label for="lab-tags">Tags (comma-separated)</label>
          <input id="lab-tags" type="text" formControlName="tagsRaw"
            placeholder="docker, ci-cd, github-actions, yaml" />
        </div>

        <!-- Row 8: Learning Outcomes -->
        <div class="form-field">
          <label for="lab-outcomes">Learning Outcomes (one per line)</label>
          <textarea id="lab-outcomes" formControlName="outcomesRaw"
            rows="4" placeholder="Configure a GitHub Actions workflow&#10;Build and push a Docker image&#10;Deploy to a cloud environment"></textarea>
        </div>

        <!-- Row 9: Prerequisites -->
        <div class="form-field">
          <label for="lab-prereqs">Prerequisites (one per line)</label>
          <textarea id="lab-prereqs" formControlName="prerequisitesRaw"
            rows="3" placeholder="Basic knowledge of Git&#10;Understanding of YAML syntax"></textarea>
        </div>

        <!-- Row 10: Feature Toggles -->
        <fieldset class="form-fieldset">
          <legend>Lab Features</legend>
          <div class="form-row form-row--3col">
            <label class="toggle-label">
              <input type="checkbox" formControlName="previewEnabled" />
              Enable Preview Panel
            </label>
            <label class="toggle-label">
              <input type="checkbox" formControlName="terminalEnabled" />
              Enable Terminal
            </label>
            <label class="toggle-label">
              <input type="checkbox" formControlName="aiCoachEnabled" />
              Enable AI Coach
            </label>
          </div>
        </fieldset>

        <!-- Actions -->
        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'labs']" class="btn-cancel">
            Cancel
          </a>
          <button type="submit" class="btn-save" [disabled]="isSaving() || form.invalid">
            @if (isSaving()) { Saving… } @else { {{ isEdit() ? 'Save Changes' : 'Create Lab' }} }
          </button>
        </div>

        @if (errorMsg()) {
          <p class="form-error">{{ errorMsg() }}</p>
        }
      </form>
    </section>
  `,
  styles: [`
    .lab-form-page { max-width: 860px; display: flex; flex-direction: column; gap: 1.5rem; }
    .back-link { color: #1a73e8; text-decoration: none; font-size: 0.8rem; display: inline-block; margin-bottom: 0.5rem; }
    .form-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin: 0; }

    /* ─── JSON Import Card ──────────────────────────── */
    .json-import-card {
      background: linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 100%);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .json-import-card__head {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .json-import-card__head > div:first-child {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
    }

    .json-import-card__icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-family: monospace;
      color: #a5b4fc;
    }

    .json-import-card__head label {
      display: block;
      font-size: 0.9rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.25rem;
    }

    .json-import-card__head p {
      color: #94a3b8;
      font-size: 0.82rem;
      margin: 0;
      line-height: 1.5;
    }

    .json-import-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .btn-json {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.9rem;
      border-radius: 7px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.07);
      color: #cbd5e1;
    }
    .btn-json:hover {
      background: rgba(255,255,255,0.14);
      color: #e2e8f0;
    }
    .btn-json--preview {
      border-color: rgba(99,102,241,0.45);
      background: rgba(99,102,241,0.12);
      color: #a5b4fc;
    }
    .btn-json--preview:hover { background: rgba(99,102,241,0.22); }
    .btn-json--apply {
      border-color: rgba(34,197,94,0.45);
      background: rgba(34,197,94,0.1);
      color: #86efac;
    }
    .btn-json--apply:hover:not(:disabled) { background: rgba(34,197,94,0.2); }
    .btn-json--apply:disabled { opacity: 0.4; cursor: not-allowed; }

    .json-textarea {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-size: 0.82rem;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      background: rgba(0,0,0,0.35);
      color: #e2e8f0;
      resize: vertical;
      min-height: 160px;
      box-sizing: border-box;
      transition: border-color 0.15s;
      line-height: 1.55;
    }
    .json-textarea:focus {
      outline: none;
      border-color: rgba(99,102,241,0.5);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    .json-textarea::placeholder { color: rgba(255,255,255,0.25); }

    .json-status { color: #93c5fd; font-size: 0.82rem; margin: 0; }
    .json-error  { color: #fca5a5; font-size: 0.82rem; margin: 0; }
    .json-success { color: #86efac; font-size: 0.82rem; margin: 0; }

    /* Preview */
    .json-preview {
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 10px;
      padding: 1rem;
    }
    .json-preview__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.85rem;
    }
    .json-preview__head strong { color: #86efac; font-size: 0.85rem; }
    .json-preview__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.5rem;
    }
    .json-preview__grid > div {
      background: rgba(255,255,255,0.04);
      border-radius: 7px;
      padding: 0.5rem 0.75rem;
    }
    .json-preview__grid > div.preview-full { grid-column: 1 / -1; }
    .json-preview__grid span { display: block; font-size: 0.68rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
    .json-preview__grid strong { display: block; color: #e2e8f0; font-size: 0.82rem; margin-top: 0.15rem; }

    .visually-hidden {
      position: absolute; width: 1px; height: 1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;
    }

    /* ─── Manual Form ──────────────────────────────── */
    .lab-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .form-row { display: grid; gap: 1rem; }
    .form-row--2col { grid-template-columns: 1fr 1fr; }
    .form-row--3col { grid-template-columns: 1fr 1fr 1fr; }

    .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-field label {
      font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .form-field input, .form-field select, .form-field textarea {
      border: 1px solid #d1d5db; border-radius: 8px; padding: 0.6rem 0.75rem;
      font-size: 0.9rem; font-family: inherit; color: #0f172a;
      transition: border-color 0.15s, box-shadow 0.15s;
      background: #fff;
    }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }
    textarea { resize: vertical; min-height: 80px; }

    .form-fieldset {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem;
      margin: 0;
    }
    .form-fieldset legend { font-size: 0.8rem; font-weight: 700; color: #374151; padding: 0 0.5rem; }
    .toggle-label {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem; color: #374151; cursor: pointer;
    }
    .toggle-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #6366f1; }

    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; }
    .btn-save {
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
      border: none; padding: 0.65rem 1.5rem; border-radius: 8px;
      font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: opacity 0.2s;
    }
    .btn-save:hover:not(:disabled) { opacity: 0.88; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel {
      background: #f1f5f9; color: #475569; padding: 0.65rem 1.25rem;
      border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 600;
    }
    .form-error { color: #dc2626; font-size: 0.875rem; margin: 0; }

    @media (max-width: 640px) {
      .form-row--2col, .form-row--3col { grid-template-columns: 1fr; }
      .json-import-card__actions { flex-direction: column; }
    }
  `],
})
export class LabFormPage implements OnInit {
  readonly CATEGORIES    = CATEGORIES;
  readonly DIFFICULTIES  = DIFFICULTIES;
  readonly LAB_TYPES     = LAB_TYPES;
  readonly VALIDATION_MODES = VALIDATION_MODES;

  private readonly fb      = inject(FormBuilder);
  private readonly labsSvc = inject(ProgramLabsAdminService);
  private readonly modSvc  = inject(ProgramModulesAdminService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);

  readonly programId: string = this.route.snapshot.pathFromRoot
    .map((r) => r.paramMap.get('programId'))
    .find((v): v is string => !!v?.trim()) ?? '';

  readonly labId: string | null = this.route.snapshot.paramMap.get('labId');
  readonly isEdit = computed(() => !!this.labId);

  readonly isSaving    = signal(false);
  readonly errorMsg    = signal('');

  // JSON Import state
  readonly jsonText     = signal('');
  readonly importStatus = signal('');
  readonly parseError   = signal('');
  readonly parsedImport = signal<LabJsonImport | null>(null);
  readonly applySuccess = signal(false);

  private readonly modules$ = this.modSvc.getModules(this.programId);
  readonly modules = toSignal(this.modules$, { initialValue: [] as ProgramContentModule[] });

  readonly form = this.fb.group({
    title:            ['', Validators.required],
    slug:             ['', Validators.required],
    subtitle:         [''],
    description:      ['', Validators.required],
    moduleId:         ['', Validators.required],
    category:         ['devops' as LabCategory, Validators.required],
    difficulty:       ['beginner' as LabDifficulty, Validators.required],
    labType:          ['browser' as LabType, Validators.required],
    validationMode:   ['rules' as ValidationMode, Validators.required],
    order:            [0],
    xp:               [100],
    estimatedMinutes: [30],
    tagsRaw:          [''],
    outcomesRaw:      [''],
    prerequisitesRaw: [''],
    previewEnabled:   [true],
    terminalEnabled:  [false],
    aiCoachEnabled:   [true],
  });

  ngOnInit(): void {
    if (this.labId) {
      this.labsSvc.getLab(this.labId).subscribe((lab) => {
        if (!lab) return;
        this.form.patchValue({
          title:            lab.title,
          slug:             lab.slug,
          subtitle:         lab.subtitle ?? '',
          description:      lab.description,
          moduleId:         lab.moduleId,
          category:         lab.category,
          difficulty:       lab.difficulty,
          labType:          lab.labType,
          validationMode:   lab.validationMode,
          order:            lab.order,
          xp:               lab.xp,
          estimatedMinutes: lab.estimatedMinutes,
          tagsRaw:          lab.tags?.join(', ') ?? '',
          outcomesRaw:      lab.learningOutcomes?.join('\n') ?? '',
          prerequisitesRaw: lab.prerequisites?.join('\n') ?? '',
          previewEnabled:   lab.previewEnabled,
          terminalEnabled:  lab.terminalEnabled,
          aiCoachEnabled:   lab.aiCoachEnabled,
        });
      });
    }
  }

  // ─── JSON Import methods ──────────────────────────────────────────

  onJsonInput(event: Event): void {
    this.jsonText.set((event.target as HTMLTextAreaElement).value);
    this.parsedImport.set(null);
    this.parseError.set('');
    this.applySuccess.set(false);
  }

  loadTemplate(): void {
    this.jsonText.set(LAB_JSON_TEMPLATE);
    this.parsedImport.set(null);
    this.parseError.set('');
    this.applySuccess.set(false);
    this.importStatus.set('Template loaded — edit it, then click Preview or Apply to Form.');
  }

  downloadTemplate(): void {
    downloadLabTemplateFile('lab-template.json', LAB_JSON_TEMPLATE);
    this.importStatus.set('Template downloaded.');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input?.files?.[0];
    if (!file) return;
    try {
      const text = await this.readFile(file);
      this.jsonText.set(text);
      this.parsedImport.set(null);
      this.parseError.set('');
      this.applySuccess.set(false);
      this.importStatus.set(`Loaded: ${file.name} — click Preview or Apply to Form.`);
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Unable to read file.');
    } finally {
      input.value = '';
    }
  }

  preview(): void {
    this.parseError.set('');
    this.parsedImport.set(null);
    this.applySuccess.set(false);
    try {
      const result = parseLabJsonImport(this.jsonText());
      this.parsedImport.set(result);
      this.importStatus.set('Preview ready — click Apply to Form to fill in all fields.');
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Parse error.');
    }
  }

  applyImport(): void {
    // Parse if not already done
    if (!this.parsedImport()) {
      try {
        this.parsedImport.set(parseLabJsonImport(this.jsonText()));
      } catch (e: unknown) {
        this.parseError.set(e instanceof Error ? e.message : 'Parse error.');
        return;
      }
    }

    const d = this.parsedImport()!;
    this.form.patchValue({
      ...(d.title            !== undefined && { title:            d.title }),
      ...(d.slug             !== undefined && { slug:             d.slug }),
      ...(d.subtitle         !== undefined && { subtitle:         d.subtitle }),
      ...(d.description      !== undefined && { description:      d.description }),
      ...(d.category         !== undefined && { category:         d.category as LabCategory }),
      ...(d.difficulty       !== undefined && { difficulty:       d.difficulty as LabDifficulty }),
      ...(d.labType          !== undefined && { labType:          d.labType as LabType }),
      ...(d.validationMode   !== undefined && { validationMode:   d.validationMode as ValidationMode }),
      ...(d.order            !== undefined && { order:            d.order }),
      ...(d.xp               !== undefined && { xp:               d.xp }),
      ...(d.estimatedMinutes !== undefined && { estimatedMinutes: d.estimatedMinutes }),
      ...(d.tags?.length     && { tagsRaw:      d.tags!.join(', ') }),
      ...(d.learningOutcomes?.length && { outcomesRaw: d.learningOutcomes!.join('\n') }),
      ...(d.prerequisites?.length    && { prerequisitesRaw: d.prerequisites!.join('\n') }),
      ...(d.previewEnabled  !== undefined && { previewEnabled:  d.previewEnabled }),
      ...(d.terminalEnabled !== undefined && { terminalEnabled: d.terminalEnabled }),
      ...(d.aiCoachEnabled  !== undefined && { aiCoachEnabled:  d.aiCoachEnabled }),
    });
    this.applySuccess.set(true);
    this.importStatus.set('');
  }

  // ─── Save ─────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.errorMsg.set('');

    const v = this.form.getRawValue();
    const payload = {
      title:            v.title!,
      slug:             v.slug!,
      subtitle:         v.subtitle ?? '',
      description:      v.description!,
      moduleId:         v.moduleId!,
      category:         v.category as LabCategory,
      difficulty:       v.difficulty as LabDifficulty,
      labType:          v.labType as LabType,
      validationMode:   v.validationMode as ValidationMode,
      order:            Number(v.order ?? 0),
      xp:               Number(v.xp ?? 0),
      estimatedMinutes: Number(v.estimatedMinutes ?? 30),
      tags:             this.splitLines(v.tagsRaw ?? '', ','),
      learningOutcomes: this.splitLines(v.outcomesRaw ?? '', '\n'),
      prerequisites:    this.splitLines(v.prerequisitesRaw ?? '', '\n'),
      previewEnabled:   !!v.previewEnabled,
      terminalEnabled:  !!v.terminalEnabled,
      aiCoachEnabled:   !!v.aiCoachEnabled,
      starterFilesPath: `labs/definitions/${v.slug}/starter`,
      solutionFilesPath: `labs/definitions/${v.slug}/solution`,
    };

    try {
      if (this.labId) {
        await this.labsSvc.updateLab(this.labId, payload);
      } else {
        await this.labsSvc.createLab(this.programId, v.moduleId!, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'labs']);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private splitLines(raw: string, sep: string): string[] {
    return raw.split(sep).map((s) => s.trim()).filter(Boolean);
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
