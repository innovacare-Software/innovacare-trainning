import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, map } from 'rxjs';
import { ProgramLiveSessionsAdminService } from '../../services/program-live-sessions-admin.service';
import { ProgramModulesAdminService } from '../../services/program-modules-admin.service';
import { CONTENT_STATUS_LABELS, LIVE_SESSION_TYPE_LABELS } from '../../shared/content-builder.models';

@Component({
  selector: 'app-live-sessions-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="list-page">
      <header class="list-header">
        <div>
          <a [routerLink]="['/program-admin/programs', programId(), 'content']" class="back-link">← Content Dashboard</a>
          <h1>Live Sessions</h1>
          <p class="subtitle">Manage scheduled live sessions and classes.</p>
        </div>
        <a [routerLink]="['/program-admin/programs', programId(), 'live-sessions', 'new']" class="btn-primary">+ Add Live Session</a>
      </header>

      <div class="table-wrap">
        <table class="data-table" *ngIf="(vm()?.sessions?.length ?? 0) > 0; else empty">
          <thead>
            <tr>
              <th>Title</th>
              <th>Module</th>
              <th>Type</th>
              <th>Start</th>
              <th>Instructor</th>
              <th>Required</th>
              <th>Active</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of vm()?.sessions">
              <td><strong>{{ s.title }}</strong></td>
              <td>{{ vm()?.moduleMap?.[s.moduleId ?? ''] ?? '—' }}</td>
              <td><span class="type-pill">{{ SESSION_TYPE_LABELS[s.sessionType] }}</span></td>
              <td class="date-cell">{{ formatDate(s.startAt) }}</td>
              <td>{{ s.instructorName }}</td>
              <td><span class="pill" [class.yes]="s.required">{{ s.required ? 'Yes' : 'No' }}</span></td>
              <td><span class="pill" [class.yes]="s.active">{{ s.active ? 'Yes' : 'No' }}</span></td>
              <td><span class="status-pill" [class]="'status-' + s.status.toLowerCase()">{{ STATUS_LABELS[s.status] }}</span></td>
              <td class="actions-cell">
                <a [routerLink]="['/program-admin/programs', programId(), 'live-sessions', s.id, 'edit']" class="btn-edit">Edit</a>
                <button class="btn-delete" (click)="deleteSession(s.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <p>No live sessions yet. <a [routerLink]="['/program-admin/programs', programId(), 'live-sessions', 'new']">Schedule one now</a>.</p>
          </div>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    .list-page { display: grid; gap: 1rem; }
    .list-header { display: flex; justify-content: space-between; align-items: flex-end; background: #fff; border: 1px solid #d4e2f0; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .subtitle { margin: 0; color: #5f7a96; font-size: 0.9rem; }
    .btn-primary { display: inline-block; padding: 0.55rem 1.1rem; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; border-radius: 0.65rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; white-space: nowrap; }
    .table-wrap { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table thead { background: #f4f8fd; }
    .data-table th { padding: 0.7rem 0.85rem; text-align: left; color: #4f7097; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2eaf5; }
    .data-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid #f0f5fb; color: #2d4a65; vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #fafcff; }
    .date-cell { white-space: nowrap; font-size: 0.82rem; }
    .pill { display: inline-block; padding: 0.18rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #f1f5fb; color: #6b8aaa; }
    .pill.yes { background: #d1fadf; color: #027a48; }
    .type-pill { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #f0fdf4; color: #166534; }
    .status-pill { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .status-draft { background: #fef9c3; color: #854d0e; }
    .status-published { background: #d1fadf; color: #027a48; }
    .status-archived { background: #f1f5fb; color: #6b8aaa; }
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
    .btn-edit { padding: 0.3rem 0.65rem; border-radius: 0.45rem; text-decoration: none; font-size: 0.8rem; font-weight: 600; background: #e8f0fc; color: #1a74c8; }
    .btn-delete { padding: 0.3rem 0.65rem; border-radius: 0.45rem; font-size: 0.8rem; font-weight: 600; border: none; cursor: pointer; background: #fef2f2; color: #b91c1c; }
    .empty-state { padding: 2.5rem; text-align: center; color: #5f7a96; }
    .empty-state a { color: #1a74c8; }
  `],
})
export class LiveSessionsListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionsService = inject(ProgramLiveSessionsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  readonly programId = toSignal(
    this.route.params.pipe(switchMap((p) => [p['programId'] as string])),
    { initialValue: '' }
  );

  readonly vm = toSignal(
    this.route.params.pipe(
      switchMap((p) =>
        combineLatest([
          this.sessionsService.getLiveSessions(p['programId']),
          this.modulesService.getModules(p['programId']),
        ]).pipe(
          map(([sessions, modules]) => ({
            sessions,
            moduleMap: modules.reduce<Record<string, string>>((acc, m) => { acc[m.id] = m.title; return acc; }, {}),
          }))
        )
      )
    )
  );

  protected readonly STATUS_LABELS = CONTENT_STATUS_LABELS;
  protected readonly SESSION_TYPE_LABELS = LIVE_SESSION_TYPE_LABELS;

  formatDate(value: unknown): string {
    if (!value) return '—';
    try {
      const d = (value as { toDate?: () => Date }).toDate?.() ?? new Date(value as string);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!confirm('Delete this live session? This cannot be undone.')) return;
    await this.sessionsService.deleteLiveSession(this.programId(), sessionId);
  }
}
