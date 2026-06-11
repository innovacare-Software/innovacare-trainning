import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramLabsAdminService } from '../services/program-labs-admin.service';
import { LabDefinition, LabStatus } from '../../../lab-engine/models/lab-definition.model';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     '#22c55e',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
  enterprise:   '#8b5cf6',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     'status-draft',
  PUBLISHED: 'status-published',
  ARCHIVED:  'status-archived',
};

@Component({
  selector: 'app-program-labs-list',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="labs-admin">
      <header class="labs-header">
        <div>
          <a [routerLink]="['/program-admin/programs', programId, 'content']" class="back-link">
            ← Content Dashboard
          </a>
          <h1>🧪 Interactive Labs</h1>
          <p class="subtitle">
            Create hands-on technical labs for enrolled learners.
            Labs are visible only to users enrolled in this program.
          </p>
        </div>
        <a [routerLink]="['/program-admin/programs', programId, 'labs', 'new']" class="btn-create">
          + Create Lab
        </a>
      </header>

      <!-- Stats Bar -->
      @if (labs().length > 0) {
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-num">{{ labs().length }}</span>
            <span class="stat-label">Total Labs</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ publishedCount() }}</span>
            <span class="stat-label">Published</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ draftCount() }}</span>
            <span class="stat-label">Drafts</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ totalXp() }}</span>
            <span class="stat-label">Total XP</span>
          </div>
        </div>
      }

      <!-- Lab Cards Grid -->
      @if (isLoading()) {
        <div class="loading">Loading labs…</div>
      } @else if (labs().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🧪</div>
          <h3>No labs yet</h3>
          <p>Create the first interactive lab for this program.</p>
          <a [routerLink]="['/program-admin/programs', programId, 'labs', 'new']" class="btn-create">
            + Create First Lab
          </a>
        </div>
      } @else {
        <div class="labs-grid">
          @for (lab of labs(); track lab.id) {
            <article class="lab-card">
              <div class="lab-card__top">
                <span class="difficulty-badge" [style.color]="getDifficultyColor(lab.difficulty)">
                  {{ lab.difficulty | uppercase }}
                </span>
                <span class="type-badge">{{ lab.labType }}</span>
              </div>

              <h3 class="lab-card__title">{{ lab.title }}</h3>
              <p class="lab-card__desc">{{ lab.description }}</p>

              <div class="lab-card__meta">
                <span>⏱ {{ lab.estimatedMinutes }} min</span>
                <span>⚡ {{ lab.xp }} XP</span>
                <span>🗂 {{ lab.category }}</span>
              </div>

              <div class="lab-card__footer">
                <span class="status-pill" [class]="getStatusClass(lab.status)">
                  {{ lab.status }}
                </span>

                <div class="lab-card__actions">
                  @if (lab.status === 'DRAFT') {
                    <button
                      class="btn-publish"
                      (click)="setStatus(lab.id, 'PUBLISHED')"
                      [disabled]="isUpdating()">
                      Publish
                    </button>
                  } @else if (lab.status === 'PUBLISHED') {
                    <button
                      class="btn-archive"
                      (click)="setStatus(lab.id, 'ARCHIVED')"
                      [disabled]="isUpdating()">
                      Archive
                    </button>
                    <button
                      class="btn-unpublish"
                      (click)="setStatus(lab.id, 'DRAFT')"
                      [disabled]="isUpdating()">
                      Unpublish
                    </button>
                  } @else {
                    <button
                      class="btn-publish"
                      (click)="setStatus(lab.id, 'PUBLISHED')"
                      [disabled]="isUpdating()">
                      Re-publish
                    </button>
                  }
                  <a
                    [routerLink]="['/program-admin/programs', programId, 'labs', lab.id, 'tasks']"
                    class="btn-tasks">
                    📋 Tasks & Files
                  </a>
                  <a
                    [routerLink]="['/program-admin/programs', programId, 'labs', lab.id, 'edit']"
                    class="btn-edit">
                    Edit
                  </a>
                  <button class="btn-delete" (click)="deleteLab(lab.id, lab.title)">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .labs-admin { padding: 0; }

    .labs-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .back-link {
      color: #1a73e8; text-decoration: none; font-size: 0.8rem;
      margin-bottom: 0.5rem; display: inline-block;
    }
    .labs-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin: 0; max-width: 520px; }

    .btn-create {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; padding: 0.6rem 1.25rem; border-radius: 8px;
      font-size: 0.875rem; font-weight: 600; text-decoration: none;
      white-space: nowrap; flex-shrink: 0;
      transition: opacity 0.2s;
    }
    .btn-create:hover { opacity: 0.88; }

    /* Stats */
    .stats-bar {
      display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .stat {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 0.75rem 1.25rem; display: flex; flex-direction: column; gap: 0.1rem;
    }
    .stat-num { font-size: 1.4rem; font-weight: 800; color: #6366f1; }
    .stat-label { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }

    /* Grid */
    .labs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    /* Card */
    .lab-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;
      transition: box-shadow 0.2s, border-color 0.2s;
    }
    .lab-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); border-color: #c7d2fe; }

    .lab-card__top { display: flex; align-items: center; gap: 0.5rem; }
    .difficulty-badge {
      font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
    }
    .type-badge {
      font-size: 0.68rem; background: #f1f5f9; color: #64748b;
      padding: 0.15rem 0.5rem; border-radius: 4px; margin-left: auto;
    }

    .lab-card__title { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .lab-card__desc { margin: 0; font-size: 0.825rem; color: #64748b; line-height: 1.5; }

    .lab-card__meta {
      display: flex; gap: 0.75rem; flex-wrap: wrap;
      font-size: 0.78rem; color: #94a3b8;
    }

    .lab-card__footer {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.5rem; flex-wrap: wrap; padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }

    .status-pill {
      font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .status-published { background: #d1fae5; color: #065f46; }
    .status-draft     { background: #fef3c7; color: #92400e; }
    .status-archived  { background: #f1f5f9; color: #64748b; }

    .lab-card__actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn-tasks {
      background: #fdf4ff; color: #7c3aed; border: none; padding: 0.35rem 0.75rem;
      border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
      text-decoration: none; transition: background 0.15s;
    }
    .btn-tasks:hover { background: #ede9fe; }
    .btn-edit {
      background: #eff6ff; color: #1d4ed8; border: none; padding: 0.35rem 0.75rem;
      border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
      text-decoration: none; transition: background 0.15s;
    }
    .btn-edit:hover { background: #dbeafe; }
    .btn-publish {
      background: #d1fae5; color: #065f46; border: none; padding: 0.35rem 0.75rem;
      border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-publish:hover:not(:disabled) { background: #a7f3d0; }
    .btn-unpublish, .btn-archive {
      background: #fef3c7; color: #92400e; border: none; padding: 0.35rem 0.75rem;
      border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-delete {
      background: #fee2e2; color: #dc2626; border: none; padding: 0.35rem 0.75rem;
      border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-delete:hover { background: #fecaca; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* States */
    .loading { text-align: center; padding: 3rem; color: #94a3b8; font-size: 0.9rem; }
    .empty-state {
      text-align: center; padding: 4rem 2rem;
      background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #0f172a; margin: 0 0 0.5rem; }
    .empty-state p { color: #94a3b8; margin: 0 0 1.5rem; }

    @media (max-width: 640px) {
      .labs-grid { grid-template-columns: 1fr; }
      .labs-header { flex-direction: column; }
    }
  `],
})
export class ProgramLabsListPage {
  private readonly labsSvc = inject(ProgramLabsAdminService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly programId: string = this.route.snapshot.pathFromRoot
    .map((r) => r.paramMap.get('programId'))
    .find((v): v is string => !!v?.trim()) ?? '';

  readonly isUpdating  = signal(false);

  // toSignal without initialValue → labs() is undefined while Firestore is still loading
  // This eliminates the effect() + isLoading.set() pattern that caused NG0600 flash
  private readonly labs$ = this.labsSvc.getLabsForProgram(this.programId);
  private readonly labsRaw = toSignal(this.labs$);

  readonly isLoading   = computed(() => this.labsRaw() === undefined);
  readonly labs        = computed(() => this.labsRaw() ?? []);

  readonly publishedCount = computed(() => this.labs().filter((l) => l.status === 'PUBLISHED').length);
  readonly draftCount     = computed(() => this.labs().filter((l) => l.status === 'DRAFT').length);
  readonly totalXp        = computed(() => this.labs().reduce((s, l) => s + (l.xp ?? 0), 0));

  getDifficultyColor(diff: string): string {
    const map: Record<string, string> = {
      beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#ef4444', enterprise: '#8b5cf6',
    };
    return map[diff] ?? '#64748b';
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  async setStatus(labId: string, status: LabStatus): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.labsSvc.setStatus(labId, status);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async deleteLab(labId: string, title: string): Promise<void> {
    if (!confirm(`Delete lab "${title}"? This cannot be undone.`)) return;
    await this.labsSvc.deleteLab(labId);
  }
}
