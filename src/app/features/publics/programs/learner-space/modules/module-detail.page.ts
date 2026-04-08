import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { PROGRAM_LESSON_TYPE_LABELS } from '../../program.models';
import { LearnerModulesService } from '../services/learner-modules.service';
import { LearnerLessonsService } from '../services/learner-lessons.service';

@Component({
  selector: 'app-module-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (module(); as mod) {
      <div class="md-page">
        <a class="md-back" routerLink="../">← All Modules</a>

        <div class="md-header">
          <h1 class="md-title">{{ mod.title }}</h1>
          @if (mod.description) { <p class="md-desc">{{ mod.description }}</p> }
          <div class="md-meta">
            @if (mod.estimatedMinutes) { <span>⏱ {{ mod.estimatedMinutes }} min</span> }
            @if (mod.lessons?.length) { <span>📖 {{ mod.lessons?.length || 0 }} lessons</span> }
            @if (mod.unlockMode) { <span>🔓 {{ mod.unlockMode }}</span> }
          </div>
        </div>

        <h2 class="md-section-title">Lessons</h2>
        @if (lessons().length > 0) {
          <div class="md-lessons">
            @for (lesson of lessons(); track lesson.id; let i = $index) {
              <a class="md-lesson-row" [routerLink]="['../../lessons', lesson.id]">
                <div class="md-lesson-num">{{ i + 1 }}</div>
                <div class="md-lesson-info">
                  <span class="md-lesson-title">{{ lesson.title }}</span>
                  <span class="md-lesson-meta">
                    {{ lessonTypeLabel(lesson.type) }} · {{ lesson.durationMin }} min
                    @if (lesson.isPreview) { · <span class="md-preview-tag">Preview</span> }
                  </span>
                </div>
                <span class="md-lesson-type-icon">
                  {{ lesson.type === 'video' ? '🎬' : lesson.type === 'reading' ? '📖' : lesson.type === 'interactive' ? '🧩' : lesson.type === 'lab' ? '🔬' : '📄' }}
                </span>
              </a>
            }
          </div>
        } @else {
          <p class="md-empty">No lessons in this module yet.</p>
        }
      </div>
    } @else {
      <div class="md-loading"><div class="md-spinner"></div><span>Loading module…</span></div>
    }
  `,
  styles: [`
    .md-page { max-width: 800px; }
    .md-back { font-size: .78rem; color: #6366f1; text-decoration: none; display: inline-block; margin-bottom: 1rem; }
    .md-back:hover { text-decoration: underline; }

    .md-header {
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 1.5rem; margin-bottom: 1.5rem;
    }
    .md-title { font-size: 1.3rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .md-desc { font-size: .82rem; color: #6b7280; margin: 0 0 .6rem; line-height: 1.5; }
    .md-meta { display: flex; gap: .8rem; font-size: .72rem; color: #9ca3af; }

    .md-section-title { font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 .8rem; }

    .md-lessons { display: flex; flex-direction: column; gap: .4rem; }
    .md-lesson-row {
      display: flex; align-items: center; gap: .7rem;
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 10px; padding: .7rem .9rem; text-decoration: none; color: #374151;
      transition: all .18s; box-shadow: 0 1px 2px rgba(0,0,0,.03);
    }
    .md-lesson-row:hover { border-color: #6366f1; background: #eef2ff; }

    .md-lesson-num {
      font-size: .7rem; font-weight: 800; color: #4f46e5;
      background: #eef2ff; padding: .2rem .45rem; border-radius: 6px;
      min-width: 24px; text-align: center;
    }
    .md-lesson-info { flex: 1; display: flex; flex-direction: column; gap: .1rem; }
    .md-lesson-title { font-size: .85rem; font-weight: 600; color: #111827; }
    .md-lesson-meta { font-size: .68rem; color: #9ca3af; }
    .md-preview-tag { color: #6366f1; font-weight: 600; }
    .md-lesson-type-icon { font-size: 1.1rem; }

    .md-empty { font-size: .82rem; color: #9ca3af; font-style: italic; }

    .md-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .md-spinner {
      width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ModuleDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly lessonsService = inject(LearnerLessonsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly moduleId$ = this.route.paramMap.pipe(map((p) => p.get('moduleId') || ''));

  readonly module = toSignal(
    combineLatest([this.programId$, this.moduleId$]).pipe(
      switchMap(([pid, mid]) => this.modulesService.getModule(pid, mid))
    ),
    { initialValue: undefined }
  );

  readonly lessons = toSignal(
    combineLatest([this.programId$, this.moduleId$]).pipe(
      switchMap(([pid, mid]) => this.lessonsService.getLessons(pid, mid))
    ),
    { initialValue: [] }
  );

  lessonTypeLabel(type: string): string {
    return (PROGRAM_LESSON_TYPE_LABELS as Record<string, string>)[type] || type;
  }
}
