import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, map } from 'rxjs';
import { ProgramCaseStudiesAdminService } from '../services/program-case-studies-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { CONTENT_STATUS_LABELS, CASE_STUDY_SCORING_LABELS } from '../models/content-builder.models';

@Component({
  selector: 'app-case-studies-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="list-page">
      <header class="list-header">
        <div>
          <a [routerLink]="['/program-admin/programs', programId(), 'content']" class="back-link">← Content Dashboard</a>
          <h1>Case Studies</h1>
          <p class="subtitle">Manage clinical and practice case studies.</p>
        </div>
        <a [routerLink]="['/program-admin/programs', programId(), 'case-studies', 'new']" class="btn-primary">+ Add Case Study</a>
      </header>

      <div class="table-wrap">
        <table class="data-table" *ngIf="(vm()?.caseStudies?.length ?? 0) > 0; else empty">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Module</th>
              <th>Scoring</th>
              <th>Prompts</th>
              <th>Active</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cs of vm()?.caseStudies">
              <td>{{ cs.order }}</td>
              <td><strong>{{ cs.title }}</strong></td>
              <td>{{ vm()?.moduleMap?.[cs.moduleId] ?? cs.moduleId }}</td>
              <td><span class="scoring-pill">{{ SCORING_LABELS[cs.scoringMode] }}</span></td>
              <td>{{ cs.prompts.length }}</td>
              <td><span class="pill" [class.yes]="cs.active">{{ cs.active ? 'Yes' : 'No' }}</span></td>
              <td><span class="status-pill" [class]="'status-' + cs.status.toLowerCase()">{{ STATUS_LABELS[cs.status] }}</span></td>
              <td class="actions-cell">
                <a [routerLink]="['/program-admin/programs', programId(), 'case-studies', cs.id, 'edit']" class="btn-edit">Edit</a>
                <button class="btn-delete" (click)="deleteCaseStudy(cs.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <p>No case studies yet. <a [routerLink]="['/program-admin/programs', programId(), 'case-studies', 'new']">Add the first case study</a>.</p>
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
    .pill { display: inline-block; padding: 0.18rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #f1f5fb; color: #6b8aaa; }
    .pill.yes { background: #d1fadf; color: #027a48; }
    .scoring-pill { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #fdf4ff; color: #6b21a8; }
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
export class CaseStudiesListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly caseStudiesService = inject(ProgramCaseStudiesAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  readonly programId = toSignal(
    this.route.params.pipe(switchMap((p) => [p['programId'] as string])),
    { initialValue: '' }
  );

  readonly vm = toSignal(
    this.route.params.pipe(
      switchMap((p) =>
        combineLatest([
          this.caseStudiesService.getCaseStudies(p['programId']),
          this.modulesService.getModules(p['programId']),
        ]).pipe(
          map(([caseStudies, modules]) => ({
            caseStudies,
            moduleMap: modules.reduce<Record<string, string>>((acc, m) => { acc[m.id] = m.title; return acc; }, {}),
          }))
        )
      )
    )
  );

  protected readonly STATUS_LABELS = CONTENT_STATUS_LABELS;
  protected readonly SCORING_LABELS = CASE_STUDY_SCORING_LABELS;

  async deleteCaseStudy(caseStudyId: string): Promise<void> {
    if (!confirm('Delete this case study? This cannot be undone.')) return;
    await this.caseStudiesService.deleteCaseStudy(this.programId(), caseStudyId);
  }
}
