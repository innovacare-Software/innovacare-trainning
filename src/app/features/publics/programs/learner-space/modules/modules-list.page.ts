import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerModulesService } from '../services/learner-modules.service';
import { ProgramProgressService } from '../../program-progress.service';
import { LearnerLessonsService } from '../services/learner-lessons.service';
import { ProgramLessonType, UserLessonProgress } from '../../program.models';

@Component({
  selector: 'app-modules-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="ml-page">
      <div class="ml-head">
        <div>
          <h1 class="ml-title">Program Modules</h1>
          <p class="ml-subtitle">Modules and recorded lessons.</p>
        </div>
        <a class="ml-video-link" routerLink="../videos"><mat-icon>smart_display</mat-icon>Video Library</a>
      </div>

      @if (modulesWithProgress().length > 0) {
        <div class="ml-grid">
          @for (mod of modulesWithProgress(); track mod.id; let i = $index) {
            <a class="ml-card" [routerLink]="[mod.id]">
              <div class="ml-card-head">
                <span class="ml-order">{{ i + 1 }}</span>
                <span class="ml-status-dot"
                  [class.dot-done]="mod.progressPct >= 100"
                  [class.dot-active]="mod.progressPct > 0 && mod.progressPct < 100"
                  [class.dot-locked]="mod.progressPct === 0">
                </span>
              </div>
              <h3 class="ml-card-title">{{ mod.title }}</h3>
              @if (mod.description) {
                <p class="ml-card-desc">{{ mod.description }}</p>
              }
              <div class="ml-card-meta">
                @if (mod.estimatedMinutes) {
                  <span class="ml-meta-item">⏱ {{ mod.estimatedMinutes }} min</span>
                }
                @if (mod.lessons?.length) {
                  <span class="ml-meta-item">📖 {{ mod.lessons?.length || 0 }} lessons</span>
                }
              </div>
              <div class="ml-progress-bar">
                <div class="ml-progress-fill"
                  [style.width.%]="mod.progressPct"
                  [class.fill-done]="mod.progressPct >= 100"
                  [class.fill-mid]="mod.progressPct > 0 && mod.progressPct < 100">
                </div>
              </div>
              <div class="ml-progress-row">
                <span class="ml-progress-text">{{ mod.progressPct }}% complete</span>
                <span class="ml-progress-count">{{ mod.completedLessons }} / {{ mod.totalLessons }} lessons</span>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="ml-empty">
          <span class="ml-empty-icon">📚</span>
          <p>No modules available yet. Check back soon!</p>
        </div>
      }

      @if (videoLessons().length > 0) {
        <section class="ml-video-section">
          <div class="ml-video-section__head">
            <div>
              <span class="ml-video-section__eyebrow">Video library</span>
              <h2>Recorded lessons</h2>
            </div>
            <a routerLink="../videos" class="ml-video-section__cta">Open all</a>
          </div>

          <div class="ml-video-grid">
            @for (video of videoLessons(); track video.id) {
              <a class="ml-video-card" [routerLink]="['../videos', video.id]">
                <div class="ml-video-card__thumb" [style.background-image]="'url(' + video.thumbnail + ')'">
                  <span class="ml-video-card__play">{{ video.ctaLabel }}</span>
                </div>
                <div class="ml-video-card__body">
                  <div class="ml-video-card__topline">
                    <span class="ml-video-badge" [class.is-done]="video.statusTone === 'done'" [class.is-active]="video.statusTone === 'active'">{{ video.statusLabel }}</span>
                    <span>{{ video.durationMin }} min</span>
                  </div>
                  <strong>{{ video.title }}</strong>
                  @if (video.statusTone !== 'idle') {
                    <div class="ml-video-progress">
                      <div class="ml-video-progress__bar"><span [style.width.%]="video.watchedPct"></span></div>
                      <small>{{ video.watchedPct }}% watched</small>
                    </div>
                  }
                </div>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .ml-page { max-width: 1000px; padding: 1.5rem; background: #f4f6f8; min-height: 100%; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ml-head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
    .ml-title { font-size: 1.4rem; font-weight: 800; color: #1a1a1a; margin: 0 0 .3rem; }
    .ml-subtitle { font-size: .82rem; color: #6b7280; margin: 0; }
    .ml-video-link, .ml-video-section__cta {
      display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
      min-height: 38px; padding: 0 .9rem; border-radius: 4px; text-decoration: none;
      font-size: .78rem; font-weight: 700; color: #2c5f7e; background: rgba(44,95,126,.07); border: 1px solid rgba(44,95,126,.18);
    }
    .ml-video-link mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .ml-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

    .ml-card {
      display: flex; flex-direction: column; gap: .4rem;
      background: #ffffff; border: 1px solid #e1e5ea;
      border-radius: 6px; padding: 1.2rem; text-decoration: none; color: #374151;
      transition: all .2s; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .ml-card:hover { border-color: #2c5f7e; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.1); }

    .ml-card-head { display: flex; align-items: center; justify-content: space-between; }
    .ml-order {
      font-size: .7rem; font-weight: 700; color: #2c5f7e;
      background: rgba(44,95,126,.09); padding: .2rem .5rem; border-radius: 3px;
    }
    .ml-status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-done { background: #059669; }
    .dot-active { background: #2c5f7e; animation: pulse 1.5s infinite; }
    .dot-locked { background: #d1d5db; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    .ml-card-title { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0; }
    .ml-card-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .ml-card-meta { display: flex; gap: .6rem; margin-top: .2rem; }
    .ml-meta-item { font-size: .68rem; color: #9ca3af; }

    .ml-progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: .3rem; }
    .ml-progress-fill { height: 100%; border-radius: 3px; transition: width .5s ease; background: #d1d5db; }
    .fill-done { background: linear-gradient(90deg, #059669, #34d399); }
    .fill-mid { background: linear-gradient(90deg, #2c5f7e, #4a8ab0); }
    .ml-progress-row { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-top: .18rem; }
    .ml-progress-text, .ml-progress-count { font-size: .62rem; color: #9ca3af; }

    .ml-video-section {
      margin-top: 1.1rem; padding: 1rem; border-radius: 6px; border: 1px solid #e1e5ea; background: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }
    .ml-video-section__head { display: flex; align-items: end; justify-content: space-between; gap: .8rem; margin-bottom: .85rem; }
    .ml-video-section__eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 700; color: #990011; }
    .ml-video-section__head h2 { margin: .15rem 0 0; font-size: 1rem; color: #1a1a1a; }
    .ml-video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .8rem; }
    .ml-video-card { display: grid; gap: 0; overflow: hidden; border-radius: 14px; text-decoration: none; color: #111827; border: 1px solid #e5e7eb; background: #fff; }
    .ml-video-card__thumb {
      min-height: 130px; position: relative; background-size: cover; background-position: center;
      background-image: linear-gradient(135deg, rgba(21,94,117,.22), rgba(15,118,110,.1)), linear-gradient(135deg,#0f172a,#155e75);
    }
    .ml-video-card__play {
      position: absolute; left: .8rem; bottom: .8rem; display: inline-flex; align-items: center; justify-content: center;
      min-height: 32px; padding: 0 .8rem; border-radius: 999px; background: rgba(255,255,255,.94); color: #142132; font-size: .74rem; font-weight: 800;
    }
    .ml-video-card__body { display: grid; gap: .25rem; padding: .75rem; }
    .ml-video-card__topline { display: flex; align-items: center; justify-content: space-between; gap: .55rem; }
    .ml-video-badge {
      display: inline-flex; align-items: center; justify-content: center; min-height: 24px; padding: 0 .55rem;
      border-radius: 999px; background: rgba(148,163,184,.16); color: #475569; font-size: .64rem; font-weight: 800;
    }
    .ml-video-badge.is-active { background: rgba(59,130,246,.14); color: #1d4ed8; }
    .ml-video-badge.is-done { background: rgba(16,185,129,.14); color: #047857; }
    .ml-video-card__body strong { font-size: .84rem; line-height: 1.4; }
    .ml-video-card__body span { font-size: .72rem; color: #6b7280; }
    .ml-video-progress { display: grid; gap: .22rem; margin-top: .2rem; }
    .ml-video-progress small { font-size: .68rem; color: #6b7280; }
    .ml-video-progress__bar { height: 6px; border-radius: 999px; background: rgba(148,163,184,.2); overflow: hidden; }
    .ml-video-progress__bar span { display: block; height: 100%; background: linear-gradient(90deg, #0ea5e9, #14b8a6); }

    .ml-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .ml-empty-icon { font-size: 2rem; display: block; margin-bottom: .5rem; }

    @media (max-width: 640px) {
      .ml-video-section__head, .ml-head { align-items: stretch; }
      .ml-video-link, .ml-video-section__cta { width: 100%; }
    }
  `],
})
export class ModulesListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly progressService = inject(ProgramProgressService);
  private readonly lessonsService = inject(LearnerLessonsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(
    map((p) => p.get('programId') || '')
  );

  private readonly modules = toSignal(
    this.programId$.pipe(switchMap((id) => this.modulesService.getModules(id))),
    { initialValue: [] }
  );

  private readonly moduleProgress = toSignal(
    this.programId$.pipe(switchMap((id) => this.progressService.getUserModuleProgress(id))),
    { initialValue: [] }
  );

  private readonly lessons = toSignal(
    this.programId$.pipe(switchMap((id) => this.lessonsService.getLessons(id))),
    { initialValue: [] }
  );

  private readonly lessonProgress = toSignal(
    this.programId$.pipe(switchMap((id) => this.lessonsService.getMyLessonProgress(id))),
    { initialValue: [] }
  );

  readonly modulesWithProgress = computed(() => {
    const mods = this.modules();
    const progress = this.moduleProgress();
    const lessons = this.lessons();
    const lessonProgress = this.lessonProgress();
    return mods.map((m) => {
      const p = progress.find((mp) => mp.moduleId === m.id);
      const moduleLessons = lessons.filter((lesson) => lesson.moduleId === m.id);
      const moduleLessonIds = new Set(moduleLessons.map((lesson) => lesson.id));
      const derivedCompletedLessons = new Set(
        lessonProgress
          .filter((row) => row.completed && moduleLessonIds.has(row.lessonId))
          .map((row) => row.lessonId)
      ).size;
      const totalLessons = moduleLessons.length || Math.max(0, Number(p?.totalLessons || 0));
      const completedLessons = Math.min(
        totalLessons,
        derivedCompletedLessons || Math.max(0, Number(p?.completedLessons || 0))
      );
      const progressPct = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : Math.round(Number(p?.progressPct || 0));
      return {
        ...m,
        progressPct,
        completedLessons,
        totalLessons,
      };
    });
  });

  readonly videoLessons = computed(() => {
    const progressMap = new Map(this.lessonProgress().map((row: UserLessonProgress) => [row.lessonId, row]));
    return this.lessons()
      .filter((lesson) => lesson.type === ProgramLessonType.VIDEO && !!lesson.videoUrl)
      .slice(0, 4)
      .map((lesson) => ({
        ...lesson,
        thumbnail: this.thumbnailFor(lesson.videoUrl || ''),
        ...this.videoProgressMeta(progressMap.get(lesson.id)),
      }));
  });

  private videoProgressMeta(progress?: UserLessonProgress) {
    const watchedPct = Math.max(0, Math.min(100, Math.round(Number(progress?.watchedPct ?? 0))));
    const statusTone = progress?.completed || watchedPct >= 95
      ? 'done'
      : watchedPct > 0 || !!progress?.lastOpenedAt
        ? 'active'
        : 'idle';
    const statusLabel = statusTone === 'done'
      ? 'Completed'
      : statusTone === 'active'
        ? 'In progress'
        : 'Not started';
    const ctaLabel = statusTone === 'done'
      ? 'Replay'
      : statusTone === 'active'
        ? 'Resume'
        : 'Watch';
    return {
      watchedPct: statusTone === 'done' ? 100 : watchedPct,
      statusTone,
      statusLabel,
      ctaLabel,
    };
  }

  private thumbnailFor(videoUrl: string): string {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/i,
      /youtu\.be\/([^?&/]+)/i,
      /youtube\.com\/embed\/([^?&/]+)/i,
    ];
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match?.[1]) {
        return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
    }
    return '';
  }
}
