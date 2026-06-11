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
import {
  LabTask,
  LabFileDefinition,
  LabFileLanguage,
} from '../../../lab-engine/models/lab-definition.model';

// ── JSON template constants ────────────────────────────────────────────────────

const TASKS_JSON_TEMPLATE = JSON.stringify(
  [
    {
      id: 'task-01-readme',
      order: 1,
      title: 'Create a professional README',
      mission:
        'Prepare the repository homepage so a new contributor understands the purpose, quick start, and collaboration rules.',
      instructions:
        'Update README.md with a clear project title, repository purpose, quick start commands, and collaboration rules.',
      expectedFiles: ['README.md'],
      xp: 25,
      hints: [
        'A README explains why the repository exists.',
        'Include git clone, git checkout -b, git add, git commit, and git push.',
        'Mention pull request review.',
      ],
      successCriteria: [
        'README has Repository Purpose',
        'README has Quick Start',
        'README mentions pull request rules',
      ],
      validationRules: [
        { type: 'markdown_section_exists', file: 'README.md', section: 'Repository Purpose', points: 10 },
        { type: 'markdown_section_exists', file: 'README.md', section: 'Quick Start', points: 10 },
        { type: 'contains', file: 'README.md', value: 'git clone', points: 5 },
        { type: 'contains', file: 'README.md', value: 'git checkout -b', points: 5 },
        { type: 'contains', file: 'README.md', value: 'pull request', points: 5 },
      ],
    },
    {
      id: 'task-02-gitignore',
      order: 2,
      title: 'Protect the repository with .gitignore',
      mission: 'Prevent local, build, dependency, log, and secret files from being committed.',
      instructions: 'Update .gitignore to exclude dependencies, build output, logs, editor files, and environment files.',
      expectedFiles: ['.gitignore'],
      xp: 20,
      hints: ['Ignore node_modules.', 'Ignore build outputs like dist/.', 'Ignore .env files.'],
      successCriteria: [
        '.gitignore blocks dependencies',
        '.gitignore blocks build output',
        '.gitignore blocks environment files',
      ],
      validationRules: [
        { type: 'contains', file: '.gitignore', value: 'node_modules', points: 10 },
        { type: 'contains', file: '.gitignore', value: 'dist', points: 5 },
        { type: 'contains', file: '.gitignore', value: '.env', points: 10 },
        { type: 'contains', file: '.gitignore', value: '*.log', points: 5 },
      ],
    },
  ],
  null,
  2,
);

const FILES_JSON_TEMPLATE = JSON.stringify(
  [
    {
      path: 'README.md',
      language: 'markdown',
      readonly: false,
      required: true,
      starterContent:
        '# Project Title\n\n## Repository Purpose\n\nDescribe what this repository is for.\n\n## Quick Start\n\n```bash\ngit clone https://github.com/org/repo\n```\n\n## Collaboration Rules\n\nNever commit secrets. Always open a pull request.\n',
    },
    {
      path: '.gitignore',
      language: 'text',
      readonly: false,
      required: true,
      starterContent: 'node_modules/\ndist/\n.env\n*.log\n.DS_Store\n',
    },
    {
      path: 'docs/git-workflow.md',
      language: 'markdown',
      readonly: false,
      required: true,
      starterContent: '# Git Workflow\n\nDocument your daily Git commands here.\n',
    },
  ],
  null,
  2,
);

// ── Helper ─────────────────────────────────────────────────────────────────────

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file, 'utf-8');
  });
}

const FILE_LANGUAGES: LabFileLanguage[] = [
  'html', 'css', 'javascript', 'typescript', 'json',
  'yaml', 'markdown', 'text', 'shell',
];

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-lab-tasks-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lab-tasks-page">

      <!-- Header -->
      <header class="page-header">
        <a [routerLink]="['/program-admin/programs', programId, 'labs']" class="back-link">
          ← Back to Labs
        </a>
        <div class="page-header__title">
          <h1>🧪 Lab Content Editor</h1>
          <p class="subtitle">
            Add tasks and file definitions. Use the <strong>JSON import</strong> panel for bulk creation,
            or use the manual form to add one at a time.
          </p>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn" [class.tab-btn--active]="activeTab() === 'tasks'"
          (click)="activeTab.set('tasks')" id="tab-tasks">
          📋 Tasks ({{ tasks().length }})
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab() === 'files'"
          (click)="activeTab.set('files')" id="tab-files">
          📁 File Definitions ({{ fileDefs().length }})
        </button>
      </div>

      <!-- ════════════════════════════════ TASKS TAB ════════════════════════════════ -->
      @if (activeTab() === 'tasks') {
        <div class="tab-content">

          <!-- JSON Import Panel -->
          <div class="import-card">
            <div class="import-card__head">
              <div>
                <span class="step-badge">JSON Import</span>
                <strong>Bulk-create tasks from JSON</strong>
                <p>Upload a <code>.json</code> file, paste JSON, or download the model template to get started.</p>
              </div>
              <div class="import-card__actions">
                <button type="button" class="btn-secondary" (click)="tasksLoadTemplate()">Load Template</button>
                <button type="button" class="btn-secondary" (click)="tasksDownloadTemplate()">⬇ Download Model</button>
                <button type="button" class="btn-secondary" (click)="tasksFileInput.click()">📂 Upload .json</button>
              </div>
            </div>

            <input #tasksFileInput type="file" accept=".json,application/json"
              class="visually-hidden" (change)="onTasksFileSelected($event)" />

            <textarea
              class="json-textarea"
              rows="10"
              [value]="tasksJsonText()"
              (input)="onTasksJsonInput($event)"
              placeholder='[ { "order": 1, "title": "Task title", "mission": "...", "instructions": "...", "xp": 25 } ]'>
            </textarea>

            <div class="import-card__footer">
              @if (tasksInputStatus()) {
                <p class="hint">{{ tasksInputStatus() }}</p>
              } @else {
                <span></span>
              }
              <button type="button" class="btn-primary" (click)="tasksPreview()">Preview Tasks</button>
            </div>

            @if (tasksParseError()) {
              <p class="error-msg">❌ {{ tasksParseError() }}</p>
            }
          </div>

          <!-- Tasks Preview -->
          @if (tasksParsed().length > 0) {
            <div class="preview-card">
              <div class="preview-card__head">
                <span class="step-badge step-badge--green">Preview</span>
                <strong>{{ tasksParsed().length }} task(s) ready to import</strong>
                <span class="preview-summary">{{ totalXp() }} XP total</span>
              </div>

              <div class="task-preview-list">
                @for (task of tasksParsed(); track task.order; let i = $index) {
                  <div class="preview-task-row">
                    <span class="task-num">{{ i + 1 }}</span>
                    <div class="preview-task-info">
                      <strong>{{ task.title }}</strong>
                      <small>{{ task.mission }}</small>
                      <div class="preview-task-meta">
                        <span class="badge badge--xp">⚡ {{ task.xp ?? 0 }} XP</span>
                        @if (task.validationRules?.length) {
                          <span class="badge badge--rules">✓ {{ task.validationRules!.length }} rules</span>
                        }
                        @if (task.hints?.length) {
                          <span class="badge badge--hints">💡 {{ task.hints!.length }} hints</span>
                        }
                        @if (task.expectedFiles?.length) {
                          <span class="badge badge--files">📄 {{ task.expectedFiles!.length }} files</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="preview-card__footer">
                <p class="import-note">
                  This will add <strong>{{ tasksParsed().length }} task(s)</strong> to this lab.
                  Existing tasks will not be replaced.
                </p>
                <button type="button" class="btn-import"
                  [disabled]="tasksImporting()"
                  (click)="runTasksImport()">
                  @if (tasksImporting()) { {{ tasksImportProgress() }} } @else { Import {{ tasksParsed().length }} Tasks }
                </button>
              </div>
              @if (tasksImportError()) {
                <p class="error-msg">❌ {{ tasksImportError() }}</p>
              }
            </div>
          }

          <!-- Import success -->
          @if (tasksImportDone()) {
            <div class="success-card">
              <div class="success-icon">✅</div>
              <h2>{{ tasksImportResult()!.created }} task(s) imported!</h2>
              <p>{{ tasksImportResult()!.failed }} failed.</p>
              <div class="success-actions">
                <button type="button" class="btn-secondary" (click)="tasksReset()">Import More</button>
              </div>
            </div>
          }

          <!-- Existing Tasks -->
          <div class="section-divider">
            <span>Saved Tasks ({{ tasks().length }})</span>
          </div>

          @if (isLoadingTasks()) {
            <p class="loading-msg">Loading tasks…</p>
          } @else if (tasks().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h3>No tasks yet</h3>
              <p>Import tasks using the JSON panel above, or add one manually below.</p>
            </div>
          } @else {
            <div class="task-list">
              @for (task of tasks(); track task.id; let i = $index) {
                <article class="task-card">
                  <div class="task-card__head">
                    <span class="task-order">Task {{ i + 1 }}</span>
                    <strong class="task-title">{{ task.title }}</strong>
                    <span class="task-xp">⚡ {{ task.xp }} XP</span>
                    @if (task.validationRules?.length) {
                      <span class="badge badge--rules">✓ {{ task.validationRules!.length }} rules</span>
                    }
                    <button class="btn-icon btn-icon--delete"
                      (click)="deleteTask(task.id, task.title)"
                      title="Delete task">✕</button>
                  </div>
                  <p class="task-mission">{{ task.mission }}</p>
                  @if (task.hints?.length) {
                    <p class="task-meta">💡 {{ task.hints!.length }} hint(s)</p>
                  }
                </article>
              }
            </div>
          }

          <!-- Manual Add Form -->
          <details class="manual-form-details">
            <summary class="manual-form-summary">➕ Add Single Task Manually</summary>
            <div class="add-card">
              <form [formGroup]="taskForm" (ngSubmit)="addTaskManual()" class="add-form">

                <div class="form-row form-row--2col">
                  <div class="form-field">
                    <label>Task Title *</label>
                    <input type="text" formControlName="title"
                      placeholder="e.g. Create GitHub Actions workflow file" />
                  </div>
                  <div class="form-field">
                    <label>XP Points</label>
                    <input type="number" formControlName="xp" min="0" />
                  </div>
                </div>

                <div class="form-field">
                  <label>Mission (short one-liner) *</label>
                  <input type="text" formControlName="mission"
                    placeholder="e.g. Define a CI pipeline that builds and tests your app" />
                </div>

                <div class="form-field">
                  <label>Instructions (full markdown) *</label>
                  <textarea formControlName="instructions" rows="4"
                    placeholder="Step-by-step instructions for the learner..."></textarea>
                </div>

                <div class="form-row form-row--2col">
                  <div class="form-field">
                    <label>Expected Files (one per line)</label>
                    <textarea formControlName="expectedFilesRaw" rows="3"
                      placeholder=".github/workflows/ci.yml&#10;src/index.html"></textarea>
                  </div>
                  <div class="form-field">
                    <label>Hints (one per line)</label>
                    <textarea formControlName="hintsRaw" rows="3"
                      placeholder="Use 'on: push' to trigger on every push&#10;Set 'runs-on: ubuntu-latest'"></textarea>
                  </div>
                </div>

                @if (taskError()) {
                  <p class="error-msg">{{ taskError() }}</p>
                }

                <div class="form-actions">
                  <button type="submit" class="btn-save"
                    [disabled]="taskForm.invalid || isSavingTask()">
                    @if (isSavingTask()) { Saving… } @else { Add Task }
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>
      }

      <!-- ════════════════════════════════ FILES TAB ════════════════════════════════ -->
      @if (activeTab() === 'files') {
        <div class="tab-content">

          <!-- JSON Import Panel -->
          <div class="import-card">
            <div class="import-card__head">
              <div>
                <span class="step-badge">JSON Import</span>
                <strong>Bulk-create file definitions from JSON</strong>
                <p>Upload a <code>.json</code> file, paste JSON, or download the model template.</p>
              </div>
              <div class="import-card__actions">
                <button type="button" class="btn-secondary" (click)="filesLoadTemplate()">Load Template</button>
                <button type="button" class="btn-secondary" (click)="filesDownloadTemplate()">⬇ Download Model</button>
                <button type="button" class="btn-secondary" (click)="filesFileInput.click()">📂 Upload .json</button>
              </div>
            </div>

            <input #filesFileInput type="file" accept=".json,application/json"
              class="visually-hidden" (change)="onFilesFileSelected($event)" />

            <textarea
              class="json-textarea"
              rows="10"
              [value]="filesJsonText()"
              (input)="onFilesJsonInput($event)"
              placeholder='[ { "path": "README.md", "language": "markdown", "required": true, "starterContent": "# Title" } ]'>
            </textarea>

            <div class="import-card__footer">
              @if (filesInputStatus()) {
                <p class="hint">{{ filesInputStatus() }}</p>
              } @else {
                <span></span>
              }
              <button type="button" class="btn-primary" (click)="filesPreview()">Preview Files</button>
            </div>

            @if (filesParseError()) {
              <p class="error-msg">❌ {{ filesParseError() }}</p>
            }
          </div>

          <!-- Files Preview -->
          @if (filesParsed().length > 0) {
            <div class="preview-card">
              <div class="preview-card__head">
                <span class="step-badge step-badge--green">Preview</span>
                <strong>{{ filesParsed().length }} file definition(s) ready to import</strong>
              </div>

              <div class="task-preview-list">
                @for (f of filesParsed(); track f.path) {
                  <div class="preview-task-row">
                    <span class="file-lang-badge">{{ f.language }}</span>
                    <div class="preview-task-info">
                      <strong>{{ f.path }}</strong>
                      <div class="preview-task-meta">
                        @if (f.readonly) { <span class="badge badge--grey">read-only</span> }
                        @if (f.required) { <span class="badge badge--blue">required</span> }
                        @if (f.starterContent) {
                          <span class="badge badge--hints">{{ f.starterContent.length }} chars starter</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="preview-card__footer">
                <p class="import-note">
                  This will add <strong>{{ filesParsed().length }} file definition(s)</strong> to this lab.
                </p>
                <button type="button" class="btn-import"
                  [disabled]="filesImporting()"
                  (click)="runFilesImport()">
                  @if (filesImporting()) { {{ filesImportProgress() }} } @else { Import {{ filesParsed().length }} Files }
                </button>
              </div>
              @if (filesImportError()) {
                <p class="error-msg">❌ {{ filesImportError() }}</p>
              }
            </div>
          }

          <!-- Import success -->
          @if (filesImportDone()) {
            <div class="success-card">
              <div class="success-icon">✅</div>
              <h2>{{ filesImportResult()!.created }} file definition(s) imported!</h2>
              <p>{{ filesImportResult()!.failed }} failed.</p>
              <div class="success-actions">
                <button type="button" class="btn-secondary" (click)="filesReset()">Import More</button>
              </div>
            </div>
          }

          <!-- Existing File Defs -->
          <div class="section-divider">
            <span>Saved File Definitions ({{ fileDefs().length }})</span>
          </div>

          @if (isLoadingFiles()) {
            <p class="loading-msg">Loading file definitions…</p>
          } @else if (fileDefs().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📁</div>
              <h3>No file definitions yet</h3>
              <p>Import files using the JSON panel above, or add one manually below.</p>
            </div>
          } @else {
            <div class="file-list">
              @for (file of fileDefs(); track file.id) {
                <article class="file-card">
                  <div class="file-card__head">
                    <span class="file-lang-badge">{{ file.language }}</span>
                    <strong class="file-path">{{ file.path }}</strong>
                    <div class="file-flags">
                      @if (file.readonly) { <span class="badge badge--grey">read-only</span> }
                      @if (file.required) { <span class="badge badge--blue">required</span> }
                    </div>
                    <button class="btn-icon btn-icon--delete"
                      (click)="deleteFileDef(file.id, file.path)"
                      title="Delete file definition">✕</button>
                  </div>
                  @if (file.starterStoragePath) {
                    <p class="file-meta">📦 {{ file.starterStoragePath }}</p>
                  }
                </article>
              }
            </div>
          }

          <!-- Manual Add File Form -->
          <details class="manual-form-details">
            <summary class="manual-form-summary">➕ Add Single File Definition Manually</summary>
            <div class="add-card">
              <form [formGroup]="fileForm" (ngSubmit)="addFileDefManual()" class="add-form">

                <div class="form-row form-row--2col">
                  <div class="form-field">
                    <label>File Path *</label>
                    <input type="text" formControlName="path"
                      placeholder="e.g. .github/workflows/ci.yml" />
                  </div>
                  <div class="form-field">
                    <label>Language *</label>
                    <select formControlName="language">
                      @for (lang of FILE_LANGUAGES; track lang) {
                        <option [value]="lang">{{ lang }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-field">
                  <label>Starter File Content</label>
                  <textarea formControlName="starterContent" rows="6"
                    placeholder="Paste the starter file content here. This is what the learner sees when they open the lab."></textarea>
                </div>

                <div class="form-row form-row--2col">
                  <label class="toggle-label">
                    <input type="checkbox" formControlName="readonly" />
                    Read-only (learner cannot edit)
                  </label>
                  <label class="toggle-label">
                    <input type="checkbox" formControlName="required" />
                    Required (must exist to validate)
                  </label>
                </div>

                @if (fileError()) {
                  <p class="error-msg">{{ fileError() }}</p>
                }

                <div class="form-actions">
                  <button type="submit" class="btn-save"
                    [disabled]="fileForm.invalid || isSavingFile()">
                    @if (isSavingFile()) { Saving… } @else { Add File Definition }
                  </button>
                </div>
              </form>
            </div>
          </details>

          <div class="info-box">
            <strong>ℹ️ How starter files work</strong>
            <p>
              The <code>starterContent</code> field stores the file's initial content in Firestore.
              It is loaded into the learner's code editor when the lab session starts.
            </p>
          </div>
        </div>
      }

    </section>
  `,
  styles: [`
    .lab-tasks-page { max-width: 960px; display: flex; flex-direction: column; gap: 1.5rem; }

    /* Header */
    .page-header { display: flex; flex-direction: column; gap: 0.5rem; }
    .back-link { color: #1a73e8; text-decoration: none; font-size: 0.8rem; font-weight: 600; }
    .page-header__title h1 { margin: 0 0 0.25rem; font-size: 1.4rem; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin: 0; max-width: 640px; }

    /* Tabs */
    .tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0; }
    .tab-btn {
      padding: 0.6rem 1.25rem; border: none; background: none; cursor: pointer;
      font-size: 0.875rem; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent;
      margin-bottom: -2px; font-family: inherit; transition: all 0.15s;
    }
    .tab-btn--active { color: #6366f1; border-bottom-color: #6366f1; }
    .tab-btn:hover:not(.tab-btn--active) { color: #334155; }

    .tab-content { display: flex; flex-direction: column; gap: 1.25rem; }

    /* Import card */
    .import-card {
      background: #fff; border: 1px solid #d9e5f2; border-radius: 14px;
      padding: 1.4rem; display: flex; flex-direction: column; gap: 1rem;
    }
    .import-card__head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 1rem; flex-wrap: wrap;
    }
    .import-card__head p { margin: 0.2rem 0 0; color: #64748b; font-size: 0.83rem; }
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
      border: 1px solid #c8dff7; border-radius: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 0.8rem; color: #1e3a5a; resize: vertical; outline: none;
    }
    .json-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }

    .hint { margin: 0; color: #5f7f9f; font-size: 0.83rem; }

    /* Preview card */
    .preview-card {
      background: #fff; border: 1px solid #bbf7d0; border-radius: 14px;
      padding: 1.4rem; display: flex; flex-direction: column; gap: 1rem;
    }
    .preview-card__head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .preview-summary { margin-left: auto; color: #64748b; font-size: 0.85rem; }
    .preview-card__footer {
      display: flex; justify-content: space-between; align-items: center;
      gap: 1rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid #e2e8f0;
    }
    .import-note { margin: 0; color: #64748b; font-size: 0.85rem; }

    .task-preview-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .preview-task-row {
      display: flex; align-items: flex-start; gap: 0.75rem;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.75rem;
    }
    .task-num {
      flex-shrink: 0; width: 2rem; height: 2rem; display: flex; align-items: center;
      justify-content: center; background: #e8f0fb; color: #1a74c8; border-radius: 6px;
      font-weight: 800; font-size: 0.85rem;
    }
    .preview-task-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .preview-task-info strong { color: #0f172a; font-size: 0.92rem; }
    .preview-task-info small { color: #64748b; font-size: 0.78rem; }
    .preview-task-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem; }

    /* Success */
    .success-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; text-align: center; padding: 2rem; }
    .success-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .success-card h2 { color: #065f46; margin: 0 0 0.35rem; }
    .success-card p { color: #64748b; margin: 0 0 1rem; }
    .success-actions { display: flex; justify-content: center; gap: 0.75rem; }

    /* Section divider */
    .section-divider {
      display: flex; align-items: center; gap: 0.75rem; color: #94a3b8;
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .section-divider::before, .section-divider::after {
      content: ''; flex: 1; border-top: 1px solid #e2e8f0;
    }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 2.5rem 2rem; background: #f8fafc;
      border: 2px dashed #e2e8f0; border-radius: 14px;
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-state h3 { margin: 0 0 0.5rem; color: #0f172a; }
    .empty-state p { margin: 0; color: #64748b; font-size: 0.875rem; }
    .loading-msg { text-align: center; color: #94a3b8; padding: 2rem; }

    /* Task / File cards */
    .task-list, .file-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .task-card, .file-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;
    }
    .task-card__head, .file-card__head {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }
    .task-order {
      font-size: 0.68rem; font-weight: 800; background: #eff6ff; color: #1d4ed8;
      padding: 0.2rem 0.5rem; border-radius: 4px; white-space: nowrap;
    }
    .task-title, .file-path { flex: 1; font-size: 0.95rem; color: #0f172a; min-width: 0; }
    .task-xp { font-size: 0.78rem; color: #f59e0b; font-weight: 700; }
    .task-mission { color: #475569; font-size: 0.85rem; margin: 0; }
    .task-meta { color: #94a3b8; font-size: 0.78rem; margin: 0; }

    .file-lang-badge {
      font-size: 0.68rem; font-weight: 700; background: #f1f5f9; color: #475569;
      padding: 0.2rem 0.55rem; border-radius: 4px; text-transform: uppercase; white-space: nowrap;
    }
    .file-flags { display: flex; gap: 0.35rem; }
    .file-meta { color: #94a3b8; font-size: 0.78rem; margin: 0; font-family: monospace; }

    /* Badges */
    .badge { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; white-space: nowrap; }
    .badge--grey { background: #f1f5f9; color: #64748b; }
    .badge--blue { background: #dbeafe; color: #1d4ed8; }
    .badge--xp { background: #fef3c7; color: #d97706; }
    .badge--rules { background: #dcfce7; color: #15803d; }
    .badge--hints { background: #fdf4ff; color: #7c3aed; }
    .badge--files { background: #e0f2fe; color: #0369a1; }

    .btn-icon {
      background: none; border: none; cursor: pointer; font-size: 0.8rem;
      width: 26px; height: 26px; border-radius: 6px; display: grid; place-items: center;
      margin-left: auto; transition: background 0.15s;
    }
    .btn-icon--delete { color: #dc2626; }
    .btn-icon--delete:hover { background: #fee2e2; }

    /* Manual form details */
    .manual-form-details {
      background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 0;
    }
    .manual-form-summary {
      cursor: pointer; padding: 0.85rem 1.25rem; font-size: 0.875rem;
      font-weight: 600; color: #475569; list-style: none; user-select: none;
    }
    .manual-form-summary::-webkit-details-marker { display: none; }
    .manual-form-details[open] .manual-form-summary { border-bottom: 1px solid #e2e8f0; margin-bottom: 0; }

    .add-card { padding: 1.25rem; }
    .add-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; gap: 1rem; }
    .form-row--2col { grid-template-columns: 1fr 1fr; }
    .form-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-field label {
      font-size: 0.78rem; font-weight: 600; color: #374151;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .form-field input, .form-field select, .form-field textarea {
      border: 1px solid #d1d5db; border-radius: 8px; padding: 0.55rem 0.75rem;
      font-size: 0.875rem; font-family: inherit; color: #0f172a; background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    textarea { resize: vertical; min-height: 70px; font-family: 'Fira Code', monospace; font-size: 0.82rem; }

    .toggle-label {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem; color: #374151; cursor: pointer;
    }
    .toggle-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #6366f1; }

    .form-actions { display: flex; justify-content: flex-end; }

    /* Buttons */
    .btn-primary {
      padding: 0.55rem 1.25rem; border-radius: 8px; border: none; cursor: pointer;
      font-size: 0.875rem; font-weight: 700;
      background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff;
      font-family: inherit; transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.88; }
    .btn-secondary {
      padding: 0.5rem 0.9rem; border: 1px solid #c8dff7; border-radius: 8px;
      background: #fff; color: #1a74c8; cursor: pointer; font-size: 0.84rem;
      font-weight: 600; font-family: inherit; transition: background 0.15s;
    }
    .btn-secondary:hover { background: #eff6ff; }
    .btn-save {
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
      border: none; padding: 0.6rem 1.4rem; border-radius: 8px;
      font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: opacity 0.2s;
    }
    .btn-save:hover:not(:disabled) { opacity: 0.88; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-import {
      padding: 0.65rem 1.6rem; border-radius: 8px; border: none; cursor: pointer;
      font-size: 0.92rem; font-weight: 700; font-family: inherit;
      background: linear-gradient(135deg, #065f46, #16a34a); color: #fff;
      transition: opacity 0.15s;
    }
    .btn-import:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-import:hover:not(:disabled) { opacity: 0.88; }

    .error-msg { color: #dc2626; font-size: 0.82rem; margin: 0; }
    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      background: #f0f6ff; padding: 0.1rem 0.35rem; border-radius: 4px;
      font-size: 0.82rem; color: #0f3659;
    }

    .info-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
      padding: 1rem 1.25rem; font-size: 0.82rem; color: #1e40af;
    }
    .info-box strong { display: block; margin-bottom: 0.35rem; }
    .info-box p { margin: 0; }

    .visually-hidden {
      position: absolute; width: 1px; height: 1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap;
    }

    @media (max-width: 640px) {
      .form-row--2col { grid-template-columns: 1fr; }
      .import-card__head { flex-direction: column; }
    }
  `],
})
export class LabTasksPage implements OnInit {
  readonly FILE_LANGUAGES = FILE_LANGUAGES;

  private readonly labsSvc = inject(ProgramLabsAdminService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly fb      = inject(FormBuilder);

  readonly programId: string = this.route.snapshot.pathFromRoot
    .map((r) => r.paramMap.get('programId'))
    .find((v): v is string => !!v?.trim()) ?? '';

  readonly labId: string = this.route.snapshot.paramMap.get('labId') ?? '';

  readonly activeTab = signal<'tasks' | 'files'>('tasks');

  // ── Existing data signals ──────────────────────────────────────────────────
  private readonly tasksRaw    = toSignal(this.labsSvc.getTasks(this.labId));
  readonly isLoadingTasks      = computed(() => this.tasksRaw() === undefined);
  readonly tasks               = computed(() => this.tasksRaw() ?? []);

  private readonly fileDefsRaw = toSignal(this.labsSvc.getFileDefs(this.labId));
  readonly isLoadingFiles      = computed(() => this.fileDefsRaw() === undefined);
  readonly fileDefs            = computed(() => this.fileDefsRaw() ?? []);

  // ── Manual form signals ────────────────────────────────────────────────────
  readonly isSavingTask = signal(false);
  readonly taskError    = signal('');
  readonly isSavingFile = signal(false);
  readonly fileError    = signal('');

  readonly taskForm = this.fb.group({
    title:            ['', Validators.required],
    mission:          ['', Validators.required],
    instructions:     ['', Validators.required],
    xp:               [25],
    expectedFilesRaw: [''],
    hintsRaw:         [''],
  });

  readonly fileForm = this.fb.group({
    path:           ['', Validators.required],
    language:       ['javascript' as LabFileLanguage, Validators.required],
    starterContent: [''],
    readonly:       [false],
    required:       [true],
  });

  // ── Tasks JSON import signals ──────────────────────────────────────────────
  readonly tasksJsonText      = signal('');
  readonly tasksInputStatus   = signal('');
  readonly tasksParseError    = signal('');
  readonly tasksParsed        = signal<Partial<LabTask>[]>([]);
  readonly tasksImporting     = signal(false);
  readonly tasksImportProgress = signal('Importing…');
  readonly tasksImportError   = signal('');
  readonly tasksImportResult  = signal<{ created: number; failed: number } | null>(null);
  readonly tasksImportDone    = signal(false);
  readonly totalXp            = computed(() =>
    this.tasksParsed().reduce((sum, t) => sum + (t.xp ?? 0), 0),
  );

  // ── Files JSON import signals ──────────────────────────────────────────────
  readonly filesJsonText      = signal('');
  readonly filesInputStatus   = signal('');
  readonly filesParseError    = signal('');
  readonly filesParsed        = signal<Partial<LabFileDefinition & { starterContent?: string }>[]>([]);
  readonly filesImporting     = signal(false);
  readonly filesImportProgress = signal('Importing…');
  readonly filesImportError   = signal('');
  readonly filesImportResult  = signal<{ created: number; failed: number } | null>(null);
  readonly filesImportDone    = signal(false);

  ngOnInit(): void {
    if (!this.labId) {
      this.router.navigate(['/program-admin/programs', this.programId, 'labs']);
    }
  }

  // ── Tasks JSON import ──────────────────────────────────────────────────────

  onTasksJsonInput(event: Event): void {
    this.tasksJsonText.set((event.target as HTMLTextAreaElement).value);
    this.tasksParsed.set([]);
    this.tasksParseError.set('');
    this.tasksInputStatus.set('');
  }

  tasksLoadTemplate(): void {
    this.tasksJsonText.set(TASKS_JSON_TEMPLATE);
    this.tasksParsed.set([]);
    this.tasksParseError.set('');
    this.tasksInputStatus.set('Template loaded. Click Preview Tasks to inspect.');
  }

  tasksDownloadTemplate(): void {
    downloadJson('lab-tasks-model.json', TASKS_JSON_TEMPLATE);
    this.tasksInputStatus.set('Model downloaded: lab-tasks-model.json');
  }

  async onTasksFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      this.tasksJsonText.set(text);
      this.tasksParsed.set([]);
      this.tasksParseError.set('');
      this.tasksInputStatus.set(`Loaded: ${file.name}. Click Preview Tasks.`);
    } catch (e: unknown) {
      this.tasksParseError.set(e instanceof Error ? e.message : 'Unable to read file.');
    } finally {
      input.value = '';
    }
  }

  tasksPreview(): void {
    this.tasksParseError.set('');
    this.tasksParsed.set([]);
    try {
      const raw = JSON.parse(this.tasksJsonText()) as unknown;
      if (!Array.isArray(raw)) throw new Error('JSON must be an array of task objects.');
      const tasks = raw.map((item: unknown, i: number) => {
        if (typeof item !== 'object' || item === null) throw new Error(`Item ${i + 1} is not an object.`);
        const t = item as Record<string, unknown>;
        if (!t['title']) throw new Error(`Item ${i + 1} is missing "title".`);
        if (!t['mission']) throw new Error(`Item ${i + 1} is missing "mission".`);
        if (!t['instructions']) throw new Error(`Item ${i + 1} is missing "instructions".`);
        return t as Partial<LabTask>;
      });
      this.tasksParsed.set(tasks);
      this.tasksInputStatus.set(`✅ ${tasks.length} task(s) ready to import.`);
    } catch (e: unknown) {
      this.tasksParseError.set(e instanceof Error ? e.message : 'Invalid JSON.');
    }
  }

  async runTasksImport(): Promise<void> {
    const tasks = this.tasksParsed();
    if (!tasks.length) return;
    this.tasksImporting.set(true);
    this.tasksImportError.set('');
    let created = 0;
    let failed  = 0;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      this.tasksImportProgress.set(`Importing task ${i + 1} / ${tasks.length}…`);
      try {
        const newTask: Omit<LabTask, 'id'> = {
          order:           typeof t.order === 'number' ? t.order : i + 1,
          title:           String(t.title ?? ''),
          mission:         String(t.mission ?? ''),
          instructions:    String(t.instructions ?? ''),
          xp:              Number(t.xp ?? 25),
          expectedFiles:   Array.isArray(t.expectedFiles) ? (t.expectedFiles as string[]) : [],
          hints:           Array.isArray(t.hints) ? (t.hints as string[]) : [],
          successCriteria: Array.isArray(t.successCriteria) ? (t.successCriteria as string[]) : [],
          validationRules: Array.isArray(t.validationRules) ? (t.validationRules as LabTask['validationRules']) : [],
        };
        await this.labsSvc.addTask(this.labId, newTask);
        created++;
      } catch (e: unknown) {
        console.error(`[LabTasksImport] task ${i + 1} failed:`, e);
        failed++;
      }
    }
    this.tasksImportResult.set({ created, failed });
    this.tasksImportDone.set(true);
    this.tasksImporting.set(false);
  }

  tasksReset(): void {
    this.tasksJsonText.set('');
    this.tasksInputStatus.set('');
    this.tasksParseError.set('');
    this.tasksParsed.set([]);
    this.tasksImporting.set(false);
    this.tasksImportError.set('');
    this.tasksImportResult.set(null);
    this.tasksImportDone.set(false);
  }

  // ── Files JSON import ──────────────────────────────────────────────────────

  onFilesJsonInput(event: Event): void {
    this.filesJsonText.set((event.target as HTMLTextAreaElement).value);
    this.filesParsed.set([]);
    this.filesParseError.set('');
    this.filesInputStatus.set('');
  }

  filesLoadTemplate(): void {
    this.filesJsonText.set(FILES_JSON_TEMPLATE);
    this.filesParsed.set([]);
    this.filesParseError.set('');
    this.filesInputStatus.set('Template loaded. Click Preview Files to inspect.');
  }

  filesDownloadTemplate(): void {
    downloadJson('lab-files-model.json', FILES_JSON_TEMPLATE);
    this.filesInputStatus.set('Model downloaded: lab-files-model.json');
  }

  async onFilesFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      this.filesJsonText.set(text);
      this.filesParsed.set([]);
      this.filesParseError.set('');
      this.filesInputStatus.set(`Loaded: ${file.name}. Click Preview Files.`);
    } catch (e: unknown) {
      this.filesParseError.set(e instanceof Error ? e.message : 'Unable to read file.');
    } finally {
      input.value = '';
    }
  }

  filesPreview(): void {
    this.filesParseError.set('');
    this.filesParsed.set([]);
    try {
      const raw = JSON.parse(this.filesJsonText()) as unknown;
      if (!Array.isArray(raw)) throw new Error('JSON must be an array of file definition objects.');
      const files = raw.map((item: unknown, i: number) => {
        if (typeof item !== 'object' || item === null) throw new Error(`Item ${i + 1} is not an object.`);
        const f = item as Record<string, unknown>;
        if (!f['path']) throw new Error(`Item ${i + 1} is missing "path".`);
        if (!f['language']) throw new Error(`Item ${i + 1} is missing "language".`);
        return f as Partial<LabFileDefinition & { starterContent?: string }>;
      });
      this.filesParsed.set(files);
      this.filesInputStatus.set(`✅ ${files.length} file definition(s) ready to import.`);
    } catch (e: unknown) {
      this.filesParseError.set(e instanceof Error ? e.message : 'Invalid JSON.');
    }
  }

  async runFilesImport(): Promise<void> {
    const files = this.filesParsed();
    if (!files.length) return;
    this.filesImporting.set(true);
    this.filesImportError.set('');
    let created = 0;
    let failed  = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      this.filesImportProgress.set(`Importing file ${i + 1} / ${files.length}…`);
      try {
        const cleanPath = String(f['path'] ?? '').replace(/^\/+/, '');
        const rawContent = f['starterContent'];
        const inlineContent = typeof rawContent === 'string' ? rawContent : undefined;
        const newFile: Omit<LabFileDefinition, 'id'> = {
          path:                cleanPath,
          language:            String(f['language'] ?? 'text') as LabFileLanguage,
          readonly:            !!f['readonly'],
          required:            f['required'] !== false,
          starterStoragePath:  `labs/definitions/${this.labId}/starter/${cleanPath}`,
          solutionStoragePath: `labs/definitions/${this.labId}/solution/${cleanPath}`,
          // Store content inline in Firestore — workspace service reads this first
          // to avoid Firebase Storage 404 / CORS errors for text-based starter files.
          ...(inlineContent !== undefined ? { starterContent: inlineContent } : {}),
        };
        await this.labsSvc.addFileDef(this.labId, newFile);
        created++;
      } catch (e: unknown) {
        console.error(`[LabFilesImport] file ${i + 1} failed:`, e);
        failed++;
      }
    }
    this.filesImportResult.set({ created, failed });
    this.filesImportDone.set(true);
    this.filesImporting.set(false);
  }

  filesReset(): void {
    this.filesJsonText.set('');
    this.filesInputStatus.set('');
    this.filesParseError.set('');
    this.filesParsed.set([]);
    this.filesImporting.set(false);
    this.filesImportError.set('');
    this.filesImportResult.set(null);
    this.filesImportDone.set(false);
  }

  // ── Manual CRUD ────────────────────────────────────────────────────────────

  async addTaskManual(): Promise<void> {
    if (this.taskForm.invalid) return;
    this.isSavingTask.set(true);
    this.taskError.set('');
    const v = this.taskForm.getRawValue();
    const newTask: Omit<LabTask, 'id'> = {
      order:           this.tasks().length + 1,
      title:           v.title!,
      mission:         v.mission!,
      instructions:    v.instructions!,
      xp:              Number(v.xp ?? 25),
      expectedFiles:   this.splitLines(v.expectedFilesRaw ?? ''),
      hints:           this.splitLines(v.hintsRaw ?? ''),
      successCriteria: [],
      validationRules: [],
    };
    try {
      await this.labsSvc.addTask(this.labId, newTask);
      this.taskForm.reset({ xp: 25 });
    } catch (err: unknown) {
      this.taskError.set(err instanceof Error ? err.message : 'Failed to add task.');
    } finally {
      this.isSavingTask.set(false);
    }
  }

  async deleteTask(taskId: string, title: string): Promise<void> {
    if (!confirm(`Delete task "${title}"? This cannot be undone.`)) return;
    await this.labsSvc.deleteTask(this.labId, taskId);
  }

  async addFileDefManual(): Promise<void> {
    if (this.fileForm.invalid) return;
    this.isSavingFile.set(true);
    this.fileError.set('');
    const v = this.fileForm.getRawValue();
    const cleanPath = (v.path ?? '').replace(/^\/+/, '');
    const inlineContent = v.starterContent?.trim() ?? '';
    const newFile: Omit<LabFileDefinition, 'id'> = {
      path:                cleanPath,
      language:            v.language as LabFileLanguage,
      readonly:            !!v.readonly,
      required:            !!v.required,
      starterStoragePath:  `labs/definitions/${this.labId}/starter/${cleanPath}`,
      solutionStoragePath: `labs/definitions/${this.labId}/solution/${cleanPath}`,
      // Inline content stored in Firestore — avoids Storage 404 / CORS issues
      ...(inlineContent ? { starterContent: inlineContent } : {}),
    };
    try {
      await this.labsSvc.addFileDef(this.labId, newFile);
      this.fileForm.reset({ language: 'javascript', required: true });
    } catch (err: unknown) {
      this.fileError.set(err instanceof Error ? err.message : 'Failed to add file definition.');
    } finally {
      this.isSavingFile.set(false);
    }
  }

  async deleteFileDef(fileId: string, path: string): Promise<void> {
    if (!confirm(`Delete file definition "${path}"? This cannot be undone.`)) return;
    await this.labsSvc.deleteFileDef(this.labId, fileId);
  }

  private splitLines(raw: string): string[] {
    return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  }
}
