import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LabAdminService } from '../../services/lab-admin.service';
import { LabDefinition, LabCategory, LabDifficulty, LabType, LabTask } from '../../models/lab-definition.model';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-lab-admin-editor-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor-page">
      <header class="editor-header">
        <div class="editor-header__inner">
          <button class="back-btn" (click)="goBack()" id="btn-back">← Back to Labs</button>
          <h1 class="editor-title">{{ isNew() ? 'Create New Lab' : 'Edit Lab' }}</h1>
          <div class="editor-actions">
            <button class="btn-save" (click)="save()" [disabled]="isSaving() || form.invalid" id="btn-save">
              {{ isSaving() ? 'Saving...' : 'Save Changes' }}
            </button>
            @if (!isNew() && lab()) {
              @if (lab()!.status === 'DRAFT') {
                <button class="btn-publish" (click)="publish()" [disabled]="isSaving()" id="btn-publish">
                  🚀 Publish Lab
                </button>
              } @else {
                <button class="btn-unpublish" (click)="unpublish()" [disabled]="isSaving()" id="btn-unpublish">
                  📦 Unpublish
                </button>
              }
            }
          </div>
        </div>
      </header>

      <div class="editor-body">
        <!-- Metadata Form -->
        <section class="form-section">
          <h2 class="section-title">Lab Metadata</h2>
          <form [formGroup]="form" class="lab-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="f-title">Title *</label>
                <input class="form-input" id="f-title" type="text" formControlName="title" placeholder="e.g. DevOps CI/CD Pipeline Lab">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-slug">Slug *</label>
                <input class="form-input" id="f-slug" type="text" formControlName="slug" placeholder="e.g. devops-cicd-pipeline">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="f-desc">Description *</label>
              <textarea class="form-input form-textarea" id="f-desc" formControlName="description" rows="3" placeholder="Enterprise mission brief description"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="f-cat">Category *</label>
                <select class="form-input" id="f-cat" formControlName="category">
                  <option value="devops">DevOps & CI/CD</option>
                  <option value="cloud">Cloud & GCP</option>
                  <option value="linux">Linux & SysAdmin</option>
                  <option value="web-development">Angular / Web Dev</option>
                  <option value="agentic-ai">Agentic AI</option>
                  <option value="ai-agent-creation">AI Agent Creation</option>
                  <option value="rag-prompt-stack">RAG & Prompt Stack</option>
                  <option value="sysadmin-aiops">SysAdmin AI Ops</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="f-diff">Difficulty *</label>
                <select class="form-input" id="f-diff" formControlName="difficulty">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="f-type">Lab Type *</label>
                <select class="form-input" id="f-type" formControlName="labType">
                  <option value="browser">Browser Lab</option>
                  <option value="agent-config">Agent Config</option>
                  <option value="cloud-guided">Cloud Guided</option>
                  <option value="container-future">Container (Future)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="f-mins">Duration (minutes) *</label>
                <input class="form-input" id="f-mins" type="number" formControlName="estimatedMinutes" min="5" max="480">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-xp">XP Award *</label>
                <input class="form-input" id="f-xp" type="number" formControlName="xp" min="10" max="5000">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-order">Order (display) *</label>
                <input class="form-input" id="f-order" type="number" formControlName="order" min="1">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group toggle-group">
                <label class="form-label">Preview Enabled</label>
                <input type="checkbox" formControlName="previewEnabled" id="f-preview"> <label for="f-preview" class="toggle-label">Show browser preview panel</label>
              </div>
              <div class="form-group toggle-group">
                <label class="form-label">AI Coach Enabled</label>
                <input type="checkbox" formControlName="aiCoachEnabled" id="f-coach"> <label for="f-coach" class="toggle-label">Show AI coaching panel</label>
              </div>
              <div class="form-group toggle-group">
                <label class="form-label">Terminal (Future)</label>
                <input type="checkbox" formControlName="terminalEnabled" id="f-term"> <label for="f-term" class="toggle-label">Container terminal tab</label>
              </div>
            </div>
          </form>
        </section>

        <!-- Tasks List (read-only overview, full task editor is future) -->
        @if (!isNew() && tasks().length > 0) {
          <section class="form-section">
            <h2 class="section-title">Tasks ({{ tasks().length }})</h2>
            <div class="task-overview">
              @for (task of tasks(); track task.id) {
                <div class="task-overview-item">
                  <span class="task-num">Task {{ task.order }}</span>
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-xp">+{{ task.xp }} XP</span>
                  <span class="task-rules">{{ task.validationRules.length }} rules</span>
                </div>
              }
            </div>
          </section>
        }

        @if (successMsg()) {
          <div class="success-toast">✓ {{ successMsg() }}</div>
        }
        @if (errorMsg()) {
          <div class="error-toast">⚠ {{ errorMsg() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .editor-page { min-height: 100vh; background: #0a0d14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
    .editor-header { background: #0d1117; border-bottom: 1px solid #21262d; padding: 1.25rem 2rem; }
    .editor-header__inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
    .back-btn {
      background: none; border: 1px solid rgba(255,255,255,0.1); color: #64748b;
      padding: 0.35rem 0.8rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-family: inherit;
    }
    .back-btn:hover { color: #e2e8f0; }
    .editor-title { flex: 1; font-size: 1.2rem; font-weight: 800; color: #e2e8f0; margin: 0; }
    .editor-actions { display: flex; gap: 0.5rem; }
    .btn-save, .btn-publish, .btn-unpublish {
      padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700;
      cursor: pointer; border: none; font-family: inherit; transition: all 0.15s;
    }
    .btn-save     { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
    .btn-publish  { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    .btn-unpublish{ background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    .editor-body { max-width: 1000px; margin: 0 auto; padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
    .form-section { background: #0d1117; border: 1px solid #21262d; border-radius: 12px; padding: 1.5rem; }
    .section-title { font-size: 0.875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 1.25rem; }

    .lab-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .form-input {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: #e2e8f0; padding: 0.6rem 0.9rem; font-size: 0.875rem;
      outline: none; font-family: inherit; transition: border-color 0.15s; width: 100%; box-sizing: border-box;
    }
    .form-input:focus { border-color: rgba(99,102,241,0.5); }
    .form-textarea { resize: vertical; min-height: 80px; }
    .form-input option { background: #1e293b; }

    .toggle-group { flex-direction: row; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .toggle-label { font-size: 0.8rem; color: #64748b; }

    .task-overview { display: flex; flex-direction: column; gap: 0.5rem; }
    .task-overview-item {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px; padding: 0.6rem 0.9rem;
    }
    .task-num  { font-size: 0.72rem; color: #475569; text-transform: uppercase; width: 55px; }
    .task-title{ flex: 1; font-size: 0.85rem; color: #cbd5e1; font-weight: 600; }
    .task-xp   { font-size: 0.78rem; color: #f59e0b; font-weight: 700; }
    .task-rules{ font-size: 0.72rem; color: #475569; }

    .success-toast {
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
      color: #4ade80; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem;
    }
    .error-toast {
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
      color: #f87171; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem;
    }
  `],
})
export class LabAdminEditorPageComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly adminSvc = inject(LabAdminService);
  private readonly fb       = inject(FormBuilder);

  readonly lab     = signal<LabDefinition | null>(null);
  readonly tasks   = signal<LabTask[]>([]);
  readonly isNew   = signal(true);
  readonly isSaving= signal(false);
  readonly successMsg = signal<string | null>(null);
  readonly errorMsg   = signal<string | null>(null);

  readonly form = this.fb.group({
    title:            ['', Validators.required],
    slug:             ['', Validators.required],
    description:      ['', Validators.required],
    category:         ['devops' as LabCategory, Validators.required],
    difficulty:       ['intermediate' as LabDifficulty, Validators.required],
    labType:          ['browser' as LabType, Validators.required],
    estimatedMinutes: [30, [Validators.required, Validators.min(5)]],
    xp:               [100, [Validators.required, Validators.min(10)]],
    order:            [1, Validators.required],
    previewEnabled:   [true],
    aiCoachEnabled:   [true],
    terminalEnabled:  [false],
  });

  ngOnInit(): void {
    const labId = this.route.snapshot.params['labId'];
    if (!labId || labId === 'new') {
      this.isNew.set(true);
      return;
    }
    this.isNew.set(false);
    this.adminSvc.getLab(labId).subscribe((lab) => {
      if (lab) {
        this.lab.set(lab);
        this.form.patchValue({
          title: lab.title,
          slug: lab.slug,
          description: lab.description,
          category: lab.category,
          difficulty: lab.difficulty,
          labType: lab.labType,
          estimatedMinutes: lab.estimatedMinutes,
          xp: lab.xp,
          order: lab.order,
          previewEnabled: lab.previewEnabled,
          aiCoachEnabled: lab.aiCoachEnabled,
          terminalEnabled: lab.terminalEnabled,
        });
      }
    });
    this.adminSvc.getTasks(labId).subscribe((tasks) => this.tasks.set(tasks));
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const v = this.form.getRawValue();
    try {
      const payload = {
        title: v.title!,
        slug: v.slug!,
        subtitle: '',
        description: v.description!,
        category: v.category as LabCategory,
        difficulty: v.difficulty as LabDifficulty,
        labType: v.labType as LabType,
        estimatedMinutes: v.estimatedMinutes!,
        xp: v.xp!,
        order: v.order!,
        status: 'DRAFT' as const,
        tags: [],
        prerequisites: [],
        learningOutcomes: [],
        starterFilesPath: '',
        validationMode: 'rules' as const,
        previewEnabled: v.previewEnabled!,
        aiCoachEnabled: v.aiCoachEnabled!,
        terminalEnabled: v.terminalEnabled!,
        createdBy: '',
      };

      if (this.isNew()) {
        const id = await this.adminSvc.createLab(payload);
        this.successMsg.set('Lab created! Redirecting...');
        setTimeout(() => this.router.navigate(['/admin/labs', id]), 1500);
      } else {
        await this.adminSvc.updateLab(this.lab()!.id, payload);
        this.successMsg.set('Lab updated!');
      }
    } catch {
      this.errorMsg.set('Save failed. Please try again.');
    } finally {
      this.isSaving.set(false);
      setTimeout(() => { this.successMsg.set(null); this.errorMsg.set(null); }, 3000);
    }
  }

  async publish(): Promise<void> {
    const lab = this.lab();
    if (!lab) return;
    await this.adminSvc.publishLab(lab.id);
    this.successMsg.set('Lab published!');
    setTimeout(() => this.successMsg.set(null), 2000);
  }

  async unpublish(): Promise<void> {
    const lab = this.lab();
    if (!lab) return;
    await this.adminSvc.unpublishLab(lab.id);
    this.successMsg.set('Lab unpublished.');
    setTimeout(() => this.successMsg.set(null), 2000);
  }

  goBack(): void {
    this.router.navigate(['/admin/labs']);
  }
}
