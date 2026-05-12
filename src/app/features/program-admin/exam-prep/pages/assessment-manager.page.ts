import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';
import { BLUEPRINT_TYPE_LABELS, type BlueprintType, type AssessmentDefinition } from '../models/exam-prep.models';

@Component({
  selector: 'app-assessment-manager-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="eyebrow">Assessment Catalog</p>
          <h1>Assessment Manager</h1>
          <p>Control module finals, readiness mocks, and blueprint-assembled assessments from one organization-scoped catalog.</p>
        </div>
        <a routerLink="/program-admin/exam-prep/assessments/new" class="btn primary">New Assessment</a>
      </header>

      <section class="panel">
        <div class="list" *ngIf="assessments().length; else emptyState">
          <div class="row" *ngFor="let assessment of assessments(); trackBy: trackById">
            <div>
              <strong>
                {{ assessment.title || 'Untitled assessment' }}
                <span class="badge badge--type">{{ typeLabel(assessment.blueprintType) }}</span>
              </strong>
              <span>{{ assessment.assessmentMode }} · {{ assessment.sourceMode }} · {{ assessment.publishStatus }}</span>
              <small>{{ assessment.durationMinutes }} minutes · pass {{ assessment.passingScorePercent }}% · max {{ assessment.maxAttempts }} attempts</small>
            </div>
            <div class="row-actions">
              <a [routerLink]="['/program-admin/exam-prep/assessments', assessment.id, 'edit']">Edit</a>
              <button type="button" (click)="duplicate(assessment)">Duplicate</button>
              <button type="button" class="warn" (click)="remove(assessment.id)">Delete</button>
            </div>
          </div>
        </div>
        <ng-template #emptyState>
          <p class="empty">No assessments authored yet.</p>
        </ng-template>
        <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
      </section>
    </section>
  `,
  styles: [
    `
      .page { display: grid; gap: 1rem; }
      .head, .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem 1.1rem; }
      .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .eyebrow { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #587695; font-weight: 800; }
      .head h1 { margin: 0.25rem 0; }
      .head p, .empty, .status, .row span, .row small { margin: 0; color: #617e99; }
      .btn { border: 1px solid transparent; border-radius: 0.7rem; background: linear-gradient(135deg, #1a74c8, #0f5ca6); color: #fff; text-decoration: none; padding: 0.55rem 0.8rem; font-weight: 700; }
      .list { display: grid; gap: 0.6rem; }
      .row { border: 1px solid #e2ebf5; border-radius: 0.8rem; padding: 0.8rem; display: flex; justify-content: space-between; gap: 0.8rem; }
      .row strong { display: block; color: #173f68; }
      .row-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
      .row-actions a, .row-actions button { border: 1px solid #c9dbee; border-radius: 0.58rem; background: #f8fbff; color: #224f7d; text-decoration: none; padding: 0.35rem 0.55rem; cursor: pointer; }
      .row-actions .warn { color: #8a3344; border-color: #efc5ce; background: #fff4f6; }
      .badge--type { display: inline-block; margin-left: 0.5rem; background: #eef4fb; color: #224f7d; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; vertical-align: middle; }
    `,
  ],
})
export class AssessmentManagerPage {
  private readonly examPrep = inject(ExamPrepAdminService);

  readonly assessments = toSignal(this.examPrep.assessments$, { initialValue: [] });
  readonly statusMessage = signal('');

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  typeLabel(t: BlueprintType | undefined): string {
    return BLUEPRINT_TYPE_LABELS[t ?? 'exam_prep'] ?? 'Exam prep';
  }

  async duplicate(assessment: AssessmentDefinition): Promise<void> {
    try {
      await this.examPrep.duplicateAssessment(assessment);
      this.statusMessage.set('Assessment duplicated.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to duplicate assessment.');
    }
  }

  async remove(assessmentId: string): Promise<void> {
    try {
      await this.examPrep.deleteAssessment(assessmentId);
      this.statusMessage.set('Assessment deleted.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to delete assessment.');
    }
  }
}