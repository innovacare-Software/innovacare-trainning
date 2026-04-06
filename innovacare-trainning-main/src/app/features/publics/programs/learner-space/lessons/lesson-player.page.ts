import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { PROGRAM_LESSON_TYPE_LABELS } from '../../program.models';
import { LearnerLessonsService } from '../services/learner-lessons.service';

@Component({
  selector: 'app-lesson-player-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (lesson(); as l) {
      <div class="lp-page">
        <a class="lp-back" routerLink="../../modules">← Back to Modules</a>

        <div class="lp-header">
          <div class="lp-type-badge">{{ lessonTypeLabel(l.type) }}</div>
          <h1 class="lp-title">{{ l.title }}</h1>
          <p class="lp-desc">{{ l.description }}</p>
          <div class="lp-meta">
            <span>⏱ {{ l.durationMin }} min</span>
            @if (l.isPreview) { <span class="lp-preview">Preview</span> }
          </div>
        </div>

        <!-- Video Player -->
        @if (l.type === 'video' && l.videoUrl) {
          <div class="lp-video-container">
            <iframe [src]="sanitizeUrl(l.videoUrl)" allowfullscreen
              class="lp-video-frame"></iframe>
          </div>
          <div class="lp-video-controls">
            <button class="lp-btn lp-btn-primary" (click)="markDone()" [disabled]="marking()">
              {{ marking() ? 'Saving…' : '✅ Mark as Complete' }}
            </button>
          </div>
        }

        <!-- Reading / Content -->
        @if (l.contentHtml) {
          <div class="lp-content-wrapper">
            <div class="lp-content" [innerHTML]="l.contentHtml"></div>
          </div>
        }

        <!-- Document Viewer -->
        @if (l.type === 'document' && l.videoUrl) {
          <div class="lp-doc-container">
            <a [href]="l.videoUrl" target="_blank" rel="noopener" class="lp-doc-link">
              📄 Open Document
            </a>
          </div>
        }

        <!-- Completion Section -->
        @if (l.type !== 'video') {
          <div class="lp-complete-section">
            <button class="lp-btn lp-btn-primary" (click)="markDone()" [disabled]="marking()">
              {{ marking() ? 'Saving…' : '✅ Mark Lesson Complete' }}
            </button>
            @if (completed()) {
              <span class="lp-done-msg">🎉 Lesson marked as complete!</span>
            }
          </div>
        }
      </div>
    } @else {
      <div class="lp-loading"><div class="lp-spinner"></div><span>Loading lesson…</span></div>
    }
  `,
  styles: [`
    .lp-page { max-width: 860px; }
    .lp-back { font-size: .78rem; color: #6366f1; text-decoration: none; display: inline-block; margin-bottom: 1rem; }
    .lp-back:hover { text-decoration: underline; }

    .lp-header {
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 1.4rem; margin-bottom: 1.2rem;
    }
    .lp-type-badge {
      display: inline-block; font-size: .65rem; font-weight: 700; text-transform: uppercase;
      padding: .2rem .6rem; border-radius: 6px; background: #eef2ff; color: #4f46e5;
      margin-bottom: .5rem;
    }
    .lp-title { font-size: 1.3rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .lp-desc { font-size: .82rem; color: #6b7280; margin: 0 0 .5rem; line-height: 1.5; }
    .lp-meta { display: flex; gap: .6rem; font-size: .72rem; color: #9ca3af; }
    .lp-preview { color: #6366f1; font-weight: 600; }

    .lp-video-container {
      position: relative; padding-bottom: 56.25%; background: #f1f5f9;
      border-radius: 12px; overflow: hidden; margin-bottom: .8rem; border: 1px solid #e5e7eb;
    }
    .lp-video-frame {
      position: absolute; inset: 0; width: 100%; height: 100%; border: none;
    }
    .lp-video-controls { display: flex; justify-content: flex-end; margin-bottom: 1.2rem; }

    .lp-content-wrapper {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 1.5rem; margin-bottom: 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .lp-content { font-size: .88rem; color: #374151; line-height: 1.7; }
    .lp-content h1, .lp-content h2, .lp-content h3 { color: #111827; }
    .lp-content p { margin: 0 0 .8rem; }
    .lp-content ul, .lp-content ol { padding-left: 1.2rem; }

    .lp-doc-container { text-align: center; padding: 2rem 0; }
    .lp-doc-link {
      display: inline-block; padding: .8rem 1.5rem; background: #eef2ff;
      border: 1px solid #c7d2fe; border-radius: 10px; color: #4f46e5;
      font-size: .88rem; font-weight: 600; text-decoration: none; transition: all .2s;
    }
    .lp-doc-link:hover { background: #e0e7ff; border-color: #6366f1; }

    .lp-complete-section {
      display: flex; align-items: center; gap: .8rem;
      padding: 1rem 0; border-top: 1px solid #e5e7eb; margin-top: 1rem;
    }

    .lp-btn {
      padding: .55rem 1.2rem; border: none; border-radius: 8px;
      font-size: .8rem; font-weight: 700; cursor: pointer; transition: all .2s;
    }
    .lp-btn:disabled { opacity: .5; cursor: not-allowed; }
    .lp-btn-primary { background: #6366f1; color: #fff; }
    .lp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .lp-done-msg { font-size: .8rem; color: #059669; font-weight: 600; }

    .lp-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .lp-spinner {
      width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LessonPlayerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonsService = inject(LearnerLessonsService);
  private readonly sanitizer = inject(DomSanitizer);

  marking = signal(false);
  completed = signal(false);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly lessonId$ = this.route.paramMap.pipe(map((p) => p.get('lessonId') || ''));

  readonly lesson = toSignal(
    combineLatest([this.programId$, this.lessonId$]).pipe(
      switchMap(([pid, lid]) => this.lessonsService.getLesson(pid, lid))
    ),
    { initialValue: undefined }
  );

  sanitizeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  lessonTypeLabel(type: string): string {
    return (PROGRAM_LESSON_TYPE_LABELS as Record<string, string>)[type] || type;
  }

  async markDone(): Promise<void> {
    const l = this.lesson();
    if (!l) return;
    this.marking.set(true);
    try {
      const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
      await this.lessonsService.markComplete(programId, l.moduleId, l.id);
      this.completed.set(true);
    } finally {
      this.marking.set(false);
    }
  }
}
