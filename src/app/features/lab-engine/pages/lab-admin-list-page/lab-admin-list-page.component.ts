import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LabAdminService } from '../../services/lab-admin.service';
import { LabDefinition, LabStatus } from '../../models/lab-definition.model';

@Component({
  selector: 'app-lab-admin-list-page',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-list-page">
      <!-- Page Header -->
      <header class="admin-page-header">
        <div class="admin-page-header__inner">
          <div>
            <h1 class="admin-page-header__title">🔬 Lab Engine — Admin</h1>
            <p class="admin-page-header__subtitle">Manage lab definitions, publish labs, and review submissions.</p>
          </div>
          <button class="btn-create" (click)="createNewLab()" id="btn-create-lab">
            + New Lab
          </button>
        </div>
      </header>

      <!-- Filter Bar -->
      <div class="admin-filter-bar">
        <button class="filter-btn" [class.active]="statusFilter() === null" (click)="statusFilter.set(null)" id="filter-all">All</button>
        <button class="filter-btn" [class.active]="statusFilter() === 'DRAFT'" (click)="statusFilter.set('DRAFT')" id="filter-draft">Draft</button>
        <button class="filter-btn" [class.active]="statusFilter() === 'PUBLISHED'" (click)="statusFilter.set('PUBLISHED')" id="filter-pub">Published</button>
        <button class="filter-btn" [class.active]="statusFilter() === 'ARCHIVED'" (click)="statusFilter.set('ARCHIVED')" id="filter-arch">Archived</button>
        <span class="filter-count">{{ filteredLabs().length }} labs</span>
      </div>

      <!-- Labs Table -->
      <main class="admin-table-wrapper">
        @if (isLoading()) {
          <div class="admin-loading">Loading labs...</div>
        } @else if (filteredLabs().length === 0) {
          <div class="admin-empty">
            <p>No labs found. Create your first lab to get started.</p>
            <button class="btn-create" (click)="createNewLab()">+ Create Lab</button>
          </div>
        } @else {
          <table class="admin-table">
            <thead>
              <tr>
                <th>Lab</th>
                <th>Category</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>XP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (lab of filteredLabs(); track lab.id) {
                <tr class="admin-row">
                  <td class="lab-name-cell">
                    <span class="lab-title">{{ lab.title }}</span>
                    <span class="lab-slug">{{ lab.slug }}</span>
                  </td>
                  <td>
                    <span class="badge badge--category">{{ lab.category }}</span>
                  </td>
                  <td>
                    <span class="badge badge--type">{{ lab.labType }}</span>
                  </td>
                  <td>
                    <span class="badge" [class]="'badge--diff-' + lab.difficulty">{{ lab.difficulty }}</span>
                  </td>
                  <td>
                    <span class="status-pill" [class]="'status-pill--' + lab.status.toLowerCase()">
                      {{ lab.status }}
                    </span>
                  </td>
                  <td class="xp-cell">⚡ {{ lab.xp }}</td>
                  <td class="actions-cell">
                    <button class="action-btn" (click)="editLab(lab.id)" [id]="'edit-' + lab.id">Edit</button>
                    @if (lab.status === 'DRAFT') {
                      <button class="action-btn action-btn--publish" (click)="publishLab(lab)" [id]="'publish-' + lab.id">Publish</button>
                    } @else if (lab.status === 'PUBLISHED') {
                      <button class="action-btn action-btn--warning" (click)="unpublishLab(lab)" [id]="'unpub-' + lab.id">Unpublish</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </main>
    </div>
  `,
  styles: [`
    .admin-list-page { min-height: 100vh; background: #0a0d14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
    .admin-page-header { background: #0d1117; border-bottom: 1px solid #21262d; padding: 2rem; }
    .admin-page-header__inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .admin-page-header__title { font-size: 1.5rem; font-weight: 800; color: #e2e8f0; margin: 0 0 0.25rem; }
    .admin-page-header__subtitle { color: #64748b; font-size: 0.875rem; margin: 0; }

    .btn-create {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: all 0.15s;
    }
    .btn-create:hover { background: linear-gradient(135deg, #4f46e5, #7c3aed); }

    .admin-filter-bar {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .filter-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: #64748b;
      padding: 0.4rem 0.9rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: rgba(99,102,241,0.12);
      border-color: rgba(99,102,241,0.3);
      color: #a5b4fc;
    }
    .filter-count { font-size: 0.8rem; color: #334155; margin-left: auto; }

    .admin-table-wrapper { max-width: 1200px; margin: 0 auto; padding: 0 2rem 2rem; }
    .admin-loading, .admin-empty {
      text-align: center;
      padding: 3rem;
      color: #475569;
      font-size: 0.875rem;
    }

    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th {
      text-align: left;
      font-size: 0.7rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #21262d;
      background: #0d1117;
    }
    .admin-row td {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      vertical-align: middle;
    }
    .admin-row:hover td { background: rgba(255,255,255,0.02); }

    .lab-name-cell { display: flex; flex-direction: column; gap: 0.1rem; }
    .lab-title { font-size: 0.875rem; font-weight: 600; color: #e2e8f0; }
    .lab-slug  { font-size: 0.72rem; color: #475569; font-family: 'JetBrains Mono', monospace; }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .badge--category { background: rgba(56,189,248,0.12); color: #38bdf8; }
    .badge--type     { background: rgba(99,102,241,0.12); color: #a5b4fc; }
    .badge--diff-beginner    { background: rgba(34,197,94,0.12);   color: #4ade80; }
    .badge--diff-intermediate{ background: rgba(245,158,11,0.12);  color: #fbbf24; }
    .badge--diff-advanced    { background: rgba(239,68,68,0.12);   color: #f87171; }
    .badge--diff-enterprise  { background: rgba(139,92,246,0.12);  color: #c4b5fd; }

    .status-pill {
      padding: 0.2rem 0.6rem;
      border-radius: 100px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .status-pill--draft     { background: rgba(107,114,128,0.15); color: #9ca3af; }
    .status-pill--published { background: rgba(34,197,94,0.12);   color: #4ade80; }
    .status-pill--archived  { background: rgba(239,68,68,0.1);    color: #f87171; }

    .xp-cell { color: #f59e0b; font-weight: 700; font-size: 0.875rem; }
    .actions-cell { display: flex; gap: 0.5rem; }
    .action-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
      padding: 0.3rem 0.7rem;
      border-radius: 6px;
      font-size: 0.78rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .action-btn:hover { color: #e2e8f0; }
    .action-btn--publish { border-color: rgba(34,197,94,0.3); color: #4ade80; }
    .action-btn--warning { border-color: rgba(245,158,11,0.3); color: #fbbf24; }
  `],
})
export class LabAdminListPageComponent {
  private readonly adminSvc = inject(LabAdminService);
  private readonly router   = inject(Router);

  readonly labs        = toSignal(this.adminSvc.getAllLabs(), { initialValue: [] });
  readonly isLoading   = signal(false);
  readonly statusFilter = signal<LabStatus | null>(null);

  readonly filteredLabs = computed(() => {
    const filter = this.statusFilter();
    return filter ? this.labs().filter((l) => l.status === filter) : this.labs();
  });

  createNewLab(): void {
    this.router.navigate(['/admin/labs', 'new']);
  }

  editLab(labId: string): void {
    this.router.navigate(['/admin/labs', labId]);
  }

  async publishLab(lab: LabDefinition): Promise<void> {
    await this.adminSvc.publishLab(lab.id);
  }

  async unpublishLab(lab: LabDefinition): Promise<void> {
    await this.adminSvc.unpublishLab(lab.id);
  }
}
