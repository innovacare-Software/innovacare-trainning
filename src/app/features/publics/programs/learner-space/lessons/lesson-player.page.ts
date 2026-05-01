import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerLessonsService } from '../services/learner-lessons.service';
import { ProgressAggregationService } from '../services/progress-aggregation.service';
import { LessonPresentationComponent } from '../../../../../shared/components/lesson-presentation/lesson-presentation.component';

@Component({
  selector: 'app-lesson-player-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LessonPresentationComponent],
  template: `
    @if (lesson(); as l) {
      <div class="lp-page">

        <nav class="lp-topbar">
          <a class="lp-back" routerLink="../../modules">
            <svg class="lp-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13L5 8l5-5"/></svg>
            Back to Modules
          </a>
          @if (lessonPosition(); as pos) {
            <span class="lp-pos">Lesson {{ pos.current }} / {{ pos.total }}</span>
          }
        </nav>

        <app-lesson-presentation
          [title]="l.title"
          [description]="l.description"
          [lessonType]="l.type"
          [contentHtml]="l.contentHtml"
          [videoUrl]="l.videoUrl || ''"
          [documentUrl]="l.documentUrl || l.fileUrl || l.videoUrl || ''"
          [downloadable]="!!l.downloadable"
          [durationMin]="l.durationMin"
          [isPreview]="l.isPreview"
          (videoProgress)="onVideoProgress($event)"
        />

        <footer class="lp-footer">
          <div class="lp-actions">
            <button class="lp-btn lp-btn--ghost" type="button" (click)="goToPreviousLesson()" [disabled]="!previousLesson() || marking()">
              <svg class="lp-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13L5 8l5-5"/></svg>
              Previous
            </button>

            <button
              class="lp-btn lp-btn--complete"
              [class.lp-btn--done]="completed()"
              type="button"
              (click)="markDone()"
              [disabled]="marking() || completed()"
            >
              @if (completed()) { ✓&nbsp;Completed }
              @else if (marking()) { Saving… }
              @else { Mark as Complete }
            </button>

            <button class="lp-btn lp-btn--ghost lp-btn--next" type="button" (click)="goToNextLesson()" [disabled]="!nextLesson() || marking()">
              Next
              <svg class="lp-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
            </button>
          </div>

          @if (completed()) {
            <p class="lp-msg lp-msg--ok">🎉 Lesson completed — great work!</p>
          }
          @if (error()) {
            <p class="lp-msg lp-msg--err">{{ error() }}</p>
          }
          @if (!isAtPageBottom() && !completed()) {
            <p class="lp-msg lp-msg--hint">Scroll to the bottom to unlock the complete button.</p>
          }
          @if (isVideoLesson()) {
            <p class="lp-msg lp-msg--hint">Video lessons complete automatically at 95% watched.</p>
          }
        </footer>

      </div>
    } @else {
      <div class="lp-loading"><div class="lp-spinner"></div><span>Loading lesson…</span></div>
    }
  `,
  styles: [`
    .lp-page {
      width: 100%;
      max-width: none;
      display: grid;
      gap: 1.25rem;
    }

    /* ── Breadcrumb bar ── */
    .lp-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .lp-back {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      font-size: .8rem;
      font-weight: 700;
      color: #6366f1;
      text-decoration: none;
      padding: .4rem .75rem;
      border-radius: 8px;
      transition: background .15s, color .15s;
    }
    .lp-back:hover { background: #eef2ff; color: #4f46e5; }

    .lp-icon { width: 14px; height: 14px; flex-shrink: 0; }

    .lp-pos {
      font-size: .75rem;
      font-weight: 600;
      color: #94a3b8;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: .28rem .7rem;
      border-radius: 999px;
      white-space: nowrap;
    }

    /* ── Footer action bar ── */
    .lp-footer {
      display: grid;
      gap: .6rem;
      padding-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
    }

    .lp-actions {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: .75rem;
    }

    .lp-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .4rem;
      padding: .6rem 1.15rem;
      border: none;
      border-radius: 10px;
      font-size: .83rem;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s, box-shadow .15s, opacity .15s;
      white-space: nowrap;
    }
    .lp-btn:disabled { opacity: .4; cursor: not-allowed; }

    .lp-btn--ghost {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .lp-btn--ghost:hover:not(:disabled) { background: #e8edf5; border-color: #c7d2e0; color: #334155; }

    .lp-btn--next { justify-self: end; }

    .lp-btn--complete {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, .3);
      padding: .65rem 1.75rem;
      font-size: .88rem;
    }
    .lp-btn--complete:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #3730a3);
      box-shadow: 0 6px 18px rgba(79, 70, 229, .38);
    }
    .lp-btn--done {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      box-shadow: 0 4px 14px rgba(16, 185, 129, .28) !important;
    }

    /* ── Status messages ── */
    .lp-msg {
      margin: 0;
      font-size: .76rem;
      font-weight: 500;
      text-align: center;
      padding: .45rem 1rem;
      border-radius: 8px;
    }
    .lp-msg--ok  { color: #065f46; background: #ecfdf5; }
    .lp-msg--err { color: #b91c1c; background: #fef2f2; }
    .lp-msg--hint { color: #78716c; }

    /* ── Loading state ── */
    .lp-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .lp-spinner {
      width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1;
      border-radius: 50%; animation: lp-spin .8s linear infinite;
    }
    @keyframes lp-spin { to { transform: rotate(360deg); } }
  `],
})
export class LessonPlayerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonsService = inject(LearnerLessonsService);
  private readonly progressAggregation = inject(ProgressAggregationService);

  marking = signal(false);
  error = signal('');
  private lastSavedWatchPct = 0;

  private readonly programId$ = this.route.paramMap.pipe(map(() => this.getProgramIdFromRoute()));
  private readonly lessonId$ = this.route.paramMap.pipe(map((p) => p.get('lessonId') || ''));

  readonly lessons = toSignal(
    this.programId$.pipe(switchMap((pid) => this.lessonsService.getLessons(pid))),
    { initialValue: [] }
  );

  readonly lesson = toSignal(
    combineLatest([this.programId$, this.lessonId$]).pipe(
      switchMap(([pid, lid]) => this.lessonsService.getLesson(pid, lid))
    ),
    { initialValue: undefined }
  );

  readonly completed = toSignal(
    combineLatest([this.programId$, this.lessonId$]).pipe(
      switchMap(([pid, lessonId]) =>
        this.lessonsService.getMyLessonProgress(pid).pipe(
          map((rows) => rows.some((row) => row.lessonId === lessonId && !!row.completed))
        )
      )
    ),
    { initialValue: false }
  );

  previousLesson() {
    const currentLesson = this.lesson();
    if (!currentLesson) {
      return undefined;
    }

    const orderedLessons = this.currentModuleLessons();
    const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === currentLesson.id);
    return currentIndex > 0 ? orderedLessons[currentIndex - 1] : undefined;
  }

  nextLesson() {
    const currentLesson = this.lesson();
    if (!currentLesson) {
      return undefined;
    }

    const orderedLessons = this.currentModuleLessons();
    const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === currentLesson.id);
    return currentIndex >= 0 ? orderedLessons[currentIndex + 1] : undefined;
  }

  isVideoLesson(): boolean {
    return this.lesson()?.type === 'video';
  }

  lessonPosition(): { current: number; total: number } | null {
    const lesson = this.lesson();
    if (!lesson) return null;
    const lessons = this.currentModuleLessons();
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    if (idx < 0) return null;
    return { current: idx + 1, total: lessons.length };
  }

  async goToPreviousLesson(): Promise<void> {
    const target = this.previousLesson();
    if (!target?.id) {
      return;
    }

    await this.navigateToLesson(target.id);
  }

  async goToNextLesson(): Promise<void> {
    const target = this.nextLesson();
    if (!target?.id) {
      return;
    }

    await this.navigateToLesson(target.id);
  }

  async onVideoProgress(pct: number): Promise<void> {
    const lesson = this.lesson();
    const programId = this.getProgramIdFromRoute();
    if (!lesson || lesson.type !== 'video' || !programId || !lesson.moduleId || !lesson.id) {
      return;
    }

    const nextPct = Math.max(0, Math.min(100, Math.round(Number(pct || 0))));
    if (nextPct >= 95 && !this.completed() && !this.marking()) {
      this.lastSavedWatchPct = 100;
      await this.markDone(true);
      return;
    }

    const shouldPersist = nextPct >= this.lastSavedWatchPct + 10;
    if (!shouldPersist || this.completed()) {
      return;
    }

    this.lastSavedWatchPct = nextPct;
    try {
      await this.lessonsService.updateWatchProgress(programId, lesson.moduleId, lesson.id, nextPct);
    } catch (error) {
      console.error('updateWatchProgress failed:', error);
    }
  }

  isAtPageBottom(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return true;
    }

    const root = document.documentElement;
    const viewportHeight = window.innerHeight || root.clientHeight || 0;
    const scrollTop = window.scrollY || root.scrollTop || 0;
    const scrollHeight = Math.max(root.scrollHeight || 0, document.body?.scrollHeight || 0);
    return scrollTop + viewportHeight >= scrollHeight - 24;
  }

  async markDone(autoAdvance = false): Promise<void> {
    const l = this.lesson();
    if (!l) return;
    if (this.completed()) return;

    const programId = this.getProgramIdFromRoute();
    if (!programId || !l.moduleId || !l.id) {
      this.error.set('Unable to resolve lesson context.');
      return;
    }

    this.marking.set(true);
    this.error.set('');

    try {
      await this.lessonsService.markComplete(programId, l.moduleId, l.id);
      await this.progressAggregation.aggregateAfterLessonComplete(programId, l.moduleId);

      const nextLesson = this.nextLesson();
      const canAdvance = autoAdvance || this.isAtPageBottom();
      if (nextLesson?.id && canAdvance) {
        await this.navigateToLesson(nextLesson.id);
      }
    } catch (error) {
      console.error('markDone failed:', error);
      this.error.set('Unable to mark this lesson complete right now.');
    } finally {
      this.marking.set(false);
    }
  }

  private getProgramIdFromRoute(): string {
    for (const snapshot of this.route.snapshot.pathFromRoot) {
      const value = snapshot.paramMap.get('programId');
      if (value?.trim()) {
        return value;
      }
    }

    return '';
  }

  private currentModuleLessons() {
    const currentLesson = this.lesson();
    const orderedLessons = this.lessons();
    if (!currentLesson?.moduleId) {
      return orderedLessons;
    }

    return orderedLessons.filter((lesson) => lesson.moduleId === currentLesson.moduleId);
  }

  private async navigateToLesson(lessonId: string): Promise<void> {
    const programId = this.getProgramIdFromRoute();
    if (!programId || !lessonId) {
      return;
    }

    this.lastSavedWatchPct = 0;
    await this.router.navigate(['/my-programs', programId, 'lessons', lessonId]);
  }
}
