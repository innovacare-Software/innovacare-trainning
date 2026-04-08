import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, map } from 'rxjs';
import { ProgramsAdminService } from '../../services/programs-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ProgramLessonsAdminService } from '../services/program-lessons-admin.service';
import { ProgramLiveSessionsAdminService } from '../services/program-live-sessions-admin.service';
import { ProgramAssessmentsAdminService } from '../services/program-assessments-admin.service';
import { ProgramSimulationsAdminService } from '../services/program-simulations-admin.service';
import { ProgramCaseStudiesAdminService } from '../services/program-case-studies-admin.service';
import {
  LESSON_TYPE_LABELS,
  ASSESSMENT_TYPE_LABELS,
  SIMULATION_TYPE_LABELS,
  LIVE_SESSION_TYPE_LABELS,
  LessonType,
  ProgramContentLesson,
} from '../models/content-builder.models';

@Component({
  selector: 'app-program-preview-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="preview-page">
      <header class="preview-header">
        <a [routerLink]="['/program-admin/programs', programId(), 'content']" class="back-link">← Content Dashboard</a>
        <div class="preview-badge">👁 Learner Preview</div>
      </header>

      <div class="preview-body" *ngIf="vm() as v">
        <!-- Program Hero -->
        <div class="program-hero" *ngIf="v.program">
          <div class="hero-content">
            <span class="category-tag">{{ v.program.category }}</span>
            <h1>{{ v.program.title }}</h1>
            <p class="hero-subtitle">{{ v.program.subtitle }}</p>
            <div class="hero-meta">
              <span>📚 {{ v.modules.length }} Modules</span>
              <span>📖 {{ v.lessons.length }} Lessons</span>
              <span>{{ v.program.durationWeeks ?? '—' }} weeks</span>
            </div>
          </div>
        </div>

        <!-- Modules + Lessons -->
        <section class="content-section" *ngIf="v.modules.length > 0">
          <h2>📦 Course Modules</h2>
          <div class="modules-list">
            <div class="module-card" *ngFor="let mod of v.modules">
              <div class="module-header">
                <div>
                  <h3>{{ mod.order }}. {{ mod.title }}</h3>
                  <p>{{ mod.description }}</p>
                </div>
                <div class="module-meta">
                  <span>{{ mod.estimatedHours }}h</span>
                  <span *ngIf="mod.required" class="req-badge">Required</span>
                </div>
              </div>

              <!-- Lessons for this module -->
              <ul class="lessons-list" *ngIf="getLessonsForModule(v.lessons, mod.id).length > 0">
                <li *ngFor="let lesson of getLessonsForModule(v.lessons, mod.id)" class="lesson-item">
                  <span class="lesson-type-icon">{{ getLessonIcon(lesson.lessonType) }}</span>
                  <div class="lesson-info">
                    <strong>{{ lesson.title }}</strong>
                    <span class="lesson-meta">{{ LESSON_LABELS[lesson.lessonType] }} · {{ lesson.durationMin }}min</span>
                  </div>
                  <span class="preview-tag" *ngIf="lesson.isPreview">Free Preview</span>
                </li>
              </ul>
              <p class="no-lessons" *ngIf="getLessonsForModule(v.lessons, mod.id).length === 0">No lessons added yet.</p>
            </div>
          </div>
        </section>

        <!-- Live Sessions -->
        <section class="content-section" *ngIf="v.liveSessions.length > 0">
          <h2>📡 Live Sessions</h2>
          <div class="sessions-grid">
            <div class="session-card" *ngFor="let s of v.liveSessions">
              <div class="session-header">
                <span class="session-type">{{ SESSION_LABELS[s.sessionType] }}</span>
                <span class="req-badge" *ngIf="s.required">Required</span>
              </div>
              <strong>{{ s.title }}</strong>
              <p>{{ s.description }}</p>
              <div class="session-footer">
                <span>👤 {{ s.instructorName }}</span>
                <span>{{ formatDate(s.startAt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Assessments -->
        <section class="content-section" *ngIf="v.assessments.length > 0">
          <h2>📝 Assessments</h2>
          <div class="items-grid">
            <div class="item-card" *ngFor="let a of v.assessments">
              <span class="item-type">{{ ASSESSMENT_LABELS[a.assessmentType] }}</span>
              <strong>{{ a.title }}</strong>
              <p>{{ a.description }}</p>
              <div class="item-meta">
                <span>{{ a.questionCount }} questions</span>
                <span>{{ a.durationMin }}min</span>
                <span>Pass: {{ a.passingScore }}%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Simulations -->
        <section class="content-section" *ngIf="v.simulations.length > 0">
          <h2>🖥️ Simulations</h2>
          <div class="items-grid">
            <div class="item-card" *ngFor="let s of v.simulations">
              <span class="item-type">{{ SIM_LABELS[s.simulationType] }}</span>
              <strong>{{ s.title }}</strong>
              <p>{{ s.description }}</p>
              <div class="item-meta">
                <span>{{ s.questionCount }} Qs</span>
                <span>{{ s.durationMin }}min</span>
                <span>{{ s.difficulty }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Case Studies -->
        <section class="content-section" *ngIf="v.caseStudies.length > 0">
          <h2>🔬 Case Studies</h2>
          <div class="items-grid">
            <div class="item-card" *ngFor="let cs of v.caseStudies">
              <strong>{{ cs.title }}</strong>
              <p>{{ cs.description }}</p>
              <div class="item-meta">
                <span>{{ cs.prompts.length }} prompts</span>
              </div>
            </div>
          </div>
        </section>

        <div class="empty-preview" *ngIf="v.modules.length === 0 && v.lessons.length === 0">
          <p>No content added yet. Start by adding modules and lessons.</p>
          <a [routerLink]="['/program-admin/programs', programId(), 'content']">→ Content Dashboard</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .preview-page { display: grid; gap: 1rem; }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
      border: 1px solid #d4e2f0;
      border-radius: 1rem;
      padding: 1rem 1.4rem;
    }

    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }

    .preview-badge {
      padding: 0.3rem 0.85rem;
      background: #fef3c7;
      color: #92400e;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .preview-body { display: grid; gap: 1.2rem; }

    .program-hero {
      background: linear-gradient(135deg, #0f3659 0%, #1a74c8 100%);
      border-radius: 1.2rem;
      padding: 2.5rem;
      color: #fff;
    }

    .category-tag {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border-radius: 999px;
      padding: 0.2rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }

    .program-hero h1 { margin: 0 0 0.5rem; font-size: 1.8rem; }

    .hero-subtitle { margin: 0 0 1rem; opacity: 0.85; font-size: 1rem; }

    .hero-meta { display: flex; gap: 1.2rem; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.9; }

    .content-section {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 1.4rem;
    }

    .content-section h2 { margin: 0 0 1rem; color: #0f3659; font-size: 1.05rem; }

    .modules-list { display: grid; gap: 0.75rem; }

    .module-card {
      border: 1px solid #e8f0fb;
      border-radius: 0.85rem;
      overflow: hidden;
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.9rem 1rem;
      background: #f4f8fd;
      gap: 1rem;
    }

    .module-header h3 { margin: 0 0 0.25rem; color: #0f3659; font-size: 0.95rem; }

    .module-header p { margin: 0; color: #5f7a96; font-size: 0.85rem; }

    .module-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; font-size: 0.82rem; color: #4f7097; white-space: nowrap; }

    .req-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      background: #fef9c3;
      color: #854d0e;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .lessons-list { list-style: none; margin: 0; padding: 0; }

    .lesson-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 1rem;
      border-top: 1px solid #f0f5fb;
    }

    .lesson-type-icon { font-size: 1rem; }

    .lesson-info { flex: 1; }

    .lesson-info strong { color: #1e3a5a; font-size: 0.88rem; }

    .lesson-meta { display: block; color: #7a96b0; font-size: 0.75rem; }

    .preview-tag {
      font-size: 0.72rem;
      padding: 0.15rem 0.5rem;
      background: #d1fadf;
      color: #027a48;
      border-radius: 999px;
      font-weight: 700;
    }

    .no-lessons { margin: 0; padding: 0.6rem 1rem; color: #9fb5c8; font-size: 0.85rem; border-top: 1px solid #f0f5fb; }

    .sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }

    .session-card {
      border: 1px solid #e8f0fb;
      border-radius: 0.85rem;
      padding: 1rem;
    }

    .session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }

    .session-type { font-size: 0.75rem; font-weight: 700; color: #166534; background: #f0fdf4; padding: 0.15rem 0.5rem; border-radius: 999px; }

    .session-card strong { color: #0f3659; display: block; margin-bottom: 0.2rem; }

    .session-card p { margin: 0 0 0.5rem; color: #5f7a96; font-size: 0.85rem; }

    .session-footer { display: flex; justify-content: space-between; font-size: 0.8rem; color: #7a96b0; }

    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }

    .item-card {
      border: 1px solid #e8f0fb;
      border-radius: 0.85rem;
      padding: 1rem;
    }

    .item-type { display: block; font-size: 0.72rem; font-weight: 700; color: #6b21a8; background: #fdf4ff; padding: 0.15rem 0.5rem; border-radius: 999px; margin-bottom: 0.4rem; width: fit-content; }

    .item-card strong { color: #0f3659; display: block; margin-bottom: 0.2rem; }

    .item-card p { margin: 0 0 0.5rem; color: #5f7a96; font-size: 0.85rem; }

    .item-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; font-size: 0.78rem; color: #7a96b0; }

    .empty-preview {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 3rem;
      text-align: center;
      color: #5f7a96;
    }

    .empty-preview a { color: #1a74c8; display: block; margin-top: 0.75rem; }
  `],
})
export class ProgramPreviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly programsService = inject(ProgramsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);
  private readonly lessonsService = inject(ProgramLessonsAdminService);
  private readonly liveSessionsService = inject(ProgramLiveSessionsAdminService);
  private readonly assessmentsService = inject(ProgramAssessmentsAdminService);
  private readonly simulationsService = inject(ProgramSimulationsAdminService);
  private readonly caseStudiesService = inject(ProgramCaseStudiesAdminService);

  readonly programId = toSignal(
    this.route.params.pipe(switchMap((p) => [p['programId'] as string])),
    { initialValue: '' }
  );

  readonly vm = toSignal(
    this.route.params.pipe(
      switchMap((p) =>
        combineLatest([
          this.programsService.getProgramById(p['programId']),
          this.modulesService.getModules(p['programId']),
          this.lessonsService.getLessons(p['programId']),
          this.liveSessionsService.getLiveSessions(p['programId']),
          this.assessmentsService.getAssessments(p['programId']),
          this.simulationsService.getSimulations(p['programId']),
          this.caseStudiesService.getCaseStudies(p['programId']),
        ]).pipe(
          map(([program, modules, lessons, liveSessions, assessments, simulations, caseStudies]) => ({
            program,
            modules,
            lessons,
            liveSessions,
            assessments,
            simulations,
            caseStudies,
          }))
        )
      )
    )
  );

  protected readonly LESSON_LABELS = LESSON_TYPE_LABELS;
  protected readonly SESSION_LABELS = LIVE_SESSION_TYPE_LABELS;
  protected readonly ASSESSMENT_LABELS = ASSESSMENT_TYPE_LABELS;
  protected readonly SIM_LABELS = SIMULATION_TYPE_LABELS;

  getLessonsForModule(lessons: ProgramContentLesson[], moduleId: string): ProgramContentLesson[] {
    return lessons.filter((l) => l.moduleId === moduleId);
  }

  getLessonIcon(lessonType: LessonType): string {
    const icons: Record<string, string> = {
      VIDEO: '🎬',
      TEXT: '📖',
      DOCUMENT: '📄',
      MIXED: '🎯',
    };
    return icons[lessonType] ?? '📖';
  }

  formatDate(value: unknown): string {
    if (!value) return '—';
    try {
      const d = (value as { toDate?: () => Date }).toDate?.() ?? new Date(value as string);
      return d.toLocaleDateString();
    } catch {
      return String(value);
    }
  }
}
