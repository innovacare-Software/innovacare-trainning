import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { ProgramLesson, ProgramLessonType, ProgramModule, UserLessonProgress } from '../../program.models';
import { LearnerLessonsService } from '../services/learner-lessons.service';
import { LearnerModulesService } from '../services/learner-modules.service';

type VideoPlaylistItem = ProgramLesson & {
  moduleTitle: string;
  progressPct: number;
  statusLabel: string;
  statusTone: 'done' | 'active' | 'idle';
  notes: string;
};

type VideoDetailVm = {
  current?: VideoPlaylistItem;
  playlist: VideoPlaylistItem[];
  suggestions: VideoPlaylistItem[];
};

@Component({
  selector: 'app-video-library-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (vm().current; as current) {
      <section class="vd-page">
        <div class="vd-topbar">
          <a routerLink="../" class="vd-link">Back to library</a>
          <a routerLink="../../modules" class="vd-link vd-link--soft">Modules</a>
        </div>

        <div class="vd-layout">
          <article class="vd-main">
            <div class="vd-player-shell">
              <div class="vd-player-head">
                <div class="vd-player-head__copy">
                  <span class="vd-chip">{{ current.moduleTitle }}</span>
                  <span class="vd-status-pill" [class.is-done]="current.statusTone === 'done'" [class.is-active]="current.statusTone === 'active'">{{ current.statusLabel }}</span>
                </div>

                <div class="vd-rate-group">
                  @for (rate of playbackRates; track rate) {
                    <button
                      type="button"
                      class="vd-rate"
                      [class.is-selected]="selectedSpeed() === rate"
                      (click)="setPlaybackRate(rate)">
                      {{ rate }}x
                    </button>
                  }
                </div>
              </div>

              <div class="vd-player">
                @if (isNativeVideo(current.videoUrl || '')) {
                  <video
                    #nativePlayer
                    class="vd-player__native"
                    [src]="current.videoUrl || ''"
                    controls
                    playsinline
                    preload="metadata"
                    (loadedmetadata)="applyPlaybackRate(nativePlayer)"
                    (play)="markStarted(current)"
                    (pause)="saveNativeProgress(nativePlayer, current)"
                    (ended)="markDone(current)">
                  </video>
                } @else {
                  <iframe [src]="sanitizeUrl(embedUrl(current.videoUrl || ''))" allowfullscreen class="vd-player__frame"></iframe>
                }
              </div>

              <div class="vd-player-foot">
                <div class="vd-progress">
                  <div class="vd-progress__bar">
                    <span [style.width.%]="current.progressPct"></span>
                  </div>
                  <small>Watch status {{ current.progressPct }}%</small>
                </div>

                <button type="button" class="vd-complete" (click)="markDone(current)">Mark as complete</button>
              </div>
            </div>

            <div class="vd-copy">
              <h1>{{ current.title }}</h1>
              @if (current.description) {
                <p>{{ current.description }}</p>
              }
              <div class="vd-meta">
                <span>{{ current.durationMin }} min</span>
                <span>{{ current.statusLabel }}</span>
                @if (current.isPreview) {
                  <span>Preview</span>
                }
                @if (!isNativeVideo(current.videoUrl || '')) {
                  <span>Embedded player keeps its own speed controls</span>
                }
              </div>
            </div>

            <section class="vd-notes">
              <div class="vd-section-head">
                <div>
                  <span class="vd-sidebar__eyebrow">Study notes</span>
                  <h2>Personal notes</h2>
                </div>
                @if (noteSaving()) {
                  <span class="vd-note-state vd-note-state--pending">Saving…</span>
                } @else if (noteSaved()) {
                  <span class="vd-note-state">Saved</span>
                }
              </div>
              <textarea
                class="vd-notes__field"
                [value]="noteText()"
                placeholder="Write takeaways, reminders, or action points for this lesson."
                (input)="updateNote($any($event.target).value)"></textarea>
            </section>

            @if (vm().suggestions.length > 0) {
              <section class="vd-suggestions">
                <div class="vd-section-head">
                  <div>
                    <span class="vd-sidebar__eyebrow">Suggested next</span>
                    <h2>Keep going</h2>
                  </div>
                </div>

                <div class="vd-suggestions__grid">
                  @for (item of vm().suggestions; track item.id) {
                    <a class="vd-suggestion" [routerLink]="['../', item.id]">
                      <div>
                        <span>{{ item.moduleTitle }}</span>
                        <strong>{{ item.title }}</strong>
                      </div>
                      <small>{{ item.durationMin }} min</small>
                    </a>
                  }
                </div>
              </section>
            }
          </article>

          <aside class="vd-sidebar">
            <div class="vd-sidebar__head">
              <span class="vd-sidebar__eyebrow">Playlist</span>
              <strong>{{ vm().playlist.length }} videos</strong>
            </div>

            <div class="vd-playlist">
              @for (item of vm().playlist; track item.id) {
                <a class="vd-playlist__item" [class.is-active]="item.id === current.id" [routerLink]="['../', item.id]">
                  <div>
                    <span>{{ item.moduleTitle }}</span>
                    <strong>{{ item.title }}</strong>
                    <em class="vd-playlist__status" [class.is-done]="item.statusTone === 'done'" [class.is-active]="item.statusTone === 'active'">{{ item.statusLabel }}</em>
                  </div>
                  <small>{{ item.durationMin }} min</small>
                </a>
              }
            </div>
          </aside>
        </div>
      </section>
    }
  `,
  styles: [`
    .vd-page { display: grid; gap: 0.9rem; }
    .vd-topbar { display: flex; gap: 0.7rem; flex-wrap: wrap; }
    .vd-link {
      display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 0.85rem;
      border-radius: 999px; background: rgba(255,255,255,0.92); border: 1px solid rgba(20,33,50,0.08);
      text-decoration: none; color: #142132; font-size: 0.76rem; font-weight: 800;
    }
    .vd-link--soft { background: rgba(21,94,117,0.08); color: #155e75; }
    .vd-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) 320px; gap: 1rem; }
    .vd-main, .vd-sidebar {
      border: 1px solid rgba(20,33,50,0.08); background: rgba(255,255,255,0.92); box-shadow: 0 18px 46px rgba(20,33,50,0.08);
      border-radius: 1.3rem; backdrop-filter: blur(16px);
    }
    .vd-main { padding: 0.9rem; display: grid; gap: 0.95rem; }
    .vd-player-shell { display: grid; gap: 0.8rem; }
    .vd-player-head, .vd-player-foot, .vd-section-head {
      display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap;
    }
    .vd-player-head__copy { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
    .vd-player {
      position: relative; padding-bottom: 56.25%; border-radius: 1rem; overflow: hidden;
      background: linear-gradient(135deg, #0f172a, #155e75);
    }
    .vd-player__frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .vd-player__native { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
    .vd-copy { display: grid; gap: 0.45rem; }
    .vd-chip, .vd-sidebar__eyebrow {
      text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.66rem; font-weight: 800; color: #155e75;
    }
    .vd-status-pill {
      display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 0 0.7rem;
      border-radius: 999px; background: rgba(148,163,184,0.16); color: #475569; font-size: 0.68rem; font-weight: 800;
    }
    .vd-status-pill.is-active { background: rgba(59,130,246,0.14); color: #1d4ed8; }
    .vd-status-pill.is-done { background: rgba(16,185,129,0.14); color: #047857; }
    .vd-rate-group { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .vd-rate, .vd-complete {
      min-height: 34px; padding: 0 0.8rem; border-radius: 999px; border: 1px solid rgba(20,33,50,0.08);
      background: rgba(255,255,255,0.94); color: #142132; font-size: 0.74rem; font-weight: 800; cursor: pointer;
    }
    .vd-rate.is-selected { background: rgba(21,94,117,0.1); color: #155e75; border-color: rgba(21,94,117,0.18); }
    .vd-complete { background: linear-gradient(135deg, #0f766e, #155e75); color: #fff; border-color: transparent; }
    .vd-copy h1 { margin: 0; font-size: 1.28rem; color: #142132; }
    .vd-copy p { margin: 0; color: #52606d; line-height: 1.6; font-size: 0.84rem; }
    .vd-meta { display: flex; gap: 0.55rem; flex-wrap: wrap; color: #64748b; font-size: 0.76rem; font-weight: 700; }
    .vd-progress { display: grid; gap: 0.35rem; min-width: min(280px, 100%); }
    .vd-progress small { color: #64748b; font-size: 0.72rem; font-weight: 700; }
    .vd-progress__bar { height: 7px; border-radius: 999px; background: rgba(148,163,184,0.2); overflow: hidden; }
    .vd-progress__bar span { display: block; height: 100%; background: linear-gradient(90deg, #0ea5e9, #14b8a6); }
    .vd-notes, .vd-suggestions {
      border: 1px solid rgba(20,33,50,0.08); border-radius: 1.1rem; padding: 0.9rem; background: rgba(248,250,252,0.9);
    }
    .vd-section-head h2 { margin: 0.15rem 0 0; color: #142132; font-size: 1rem; }
    .vd-note-state { color: #047857; font-size: 0.72rem; font-weight: 800; }
    .vd-note-state--pending { color: #1d4ed8; }
    .vd-notes__field {
      width: 100%; min-height: 140px; margin-top: 0.75rem; padding: 0.9rem; resize: vertical;
      border-radius: 1rem; border: 1px solid rgba(148,163,184,0.3); background: #fff; color: #142132; font: inherit;
      line-height: 1.6;
    }
    .vd-suggestions__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.7rem; margin-top: 0.75rem; }
    .vd-suggestion {
      display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.85rem; border-radius: 1rem;
      text-decoration: none; color: #142132; background: #fff; border: 1px solid rgba(20,33,50,0.08);
    }
    .vd-suggestion span { display: block; color: #64748b; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800; }
    .vd-suggestion strong { display: block; margin-top: 0.2rem; font-size: 0.84rem; line-height: 1.4; }
    .vd-suggestion small { color: #64748b; font-size: 0.72rem; font-weight: 700; }
    .vd-sidebar { padding: 0.9rem; display: grid; gap: 0.8rem; align-content: start; }
    .vd-sidebar__head { display: grid; gap: 0.1rem; }
    .vd-sidebar__head strong { color: #142132; font-size: 0.92rem; }
    .vd-playlist { display: grid; gap: 0.55rem; }
    .vd-playlist__item {
      display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.8rem; border-radius: 1rem;
      background: rgba(20,33,50,0.04); text-decoration: none; color: #142132; border: 1px solid transparent;
    }
    .vd-playlist__item.is-active { border-color: rgba(21,94,117,0.18); background: rgba(21,94,117,0.08); }
    .vd-playlist__item span { display: block; color: #64748b; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800; }
    .vd-playlist__item strong { display: block; margin-top: 0.2rem; font-size: 0.84rem; line-height: 1.4; }
    .vd-playlist__status { display: inline-flex; margin-top: 0.45rem; color: #475569; font-size: 0.68rem; font-style: normal; font-weight: 800; }
    .vd-playlist__status.is-active { color: #1d4ed8; }
    .vd-playlist__status.is-done { color: #047857; }
    .vd-playlist__item small { color: #64748b; font-size: 0.72rem; font-weight: 700; }
    @media (max-width: 960px) {
      .vd-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class VideoLibraryDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly lessonsService = inject(LearnerLessonsService);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly nativePlayer = viewChild<HTMLVideoElement>('nativePlayer');
  private lastTrackedLessonId = '';
  private noteSaveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly playbackRates = [1, 1.25, 1.5, 1.75, 2];
  readonly selectedSpeed = signal(1);
  readonly noteText = signal('');
  readonly noteSaved = signal(false);
  readonly noteSaving = signal(false);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly lessonId$ = this.route.paramMap.pipe(map((p) => p.get('lessonId') || ''));

  readonly vm = toSignal(
    combineLatest([
      this.programId$.pipe(switchMap((programId) => this.lessonsService.getLessons(programId))),
      this.programId$.pipe(switchMap((programId) => this.modulesService.getModules(programId))),
      this.programId$.pipe(switchMap((programId) => this.lessonsService.getMyLessonProgress(programId))),
      this.lessonId$,
    ]).pipe(
      map(([lessons, modules, progress, lessonId]) => this.buildVm(lessons, modules, progress, lessonId))
    ),
    { initialValue: { current: undefined, playlist: [], suggestions: [] } as VideoDetailVm }
  );

  constructor() {
    effect(() => {
      const current = this.vm().current;
      if (!current || current.id === this.lastTrackedLessonId) {
        return;
      }
      this.lastTrackedLessonId = current.id;
      this.selectedSpeed.set(1);
      this.noteText.set(current.notes || '');
      this.noteSaved.set(false);
      this.noteSaving.set(false);
      if (this.noteSaveTimer) {
        clearTimeout(this.noteSaveTimer);
        this.noteSaveTimer = null;
      }
      if (current.statusTone === 'idle') {
        void this.markStarted(current);
      }
    });
  }

  sanitizeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  embedUrl(url: string): string {
    const youtubeId = this.extractYouTubeId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/i);
    if (vimeoMatch?.[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  }

  isNativeVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
  }

  setPlaybackRate(rate: number): void {
    this.selectedSpeed.set(rate);
    const player = this.nativePlayer();
    if (player) {
      player.playbackRate = rate;
    }
  }

  applyPlaybackRate(player: HTMLVideoElement): void {
    player.playbackRate = this.selectedSpeed();
  }

  async markStarted(current: VideoPlaylistItem): Promise<void> {
    if (current.progressPct > 0) {
      return;
    }
    await this.lessonsService.updateWatchProgress(this.programId(), current.moduleId, current.id, 5);
  }

  async saveNativeProgress(player: HTMLVideoElement, current: VideoPlaylistItem): Promise<void> {
    const duration = Number(player.duration || 0);
    const currentTime = Number(player.currentTime || 0);
    const pct = duration > 0 ? (currentTime / duration) * 100 : current.progressPct;
    await this.lessonsService.updateWatchProgress(this.programId(), current.moduleId, current.id, Math.max(current.progressPct, pct));
  }

  async markDone(current: VideoPlaylistItem): Promise<void> {
    await this.lessonsService.markComplete(this.programId(), current.moduleId, current.id);
  }

  updateNote(value: string): void {
    const current = this.vm().current;
    this.noteText.set(value);
    if (!current) {
      return;
    }
    this.noteSaving.set(true);
    this.noteSaved.set(false);
    if (this.noteSaveTimer) {
      clearTimeout(this.noteSaveTimer);
    }
    this.noteSaveTimer = setTimeout(() => {
      void this.persistNote(current, value);
    }, 500);
  }

  private buildVm(
    lessons: ProgramLesson[],
    modules: ProgramModule[],
    progressRows: UserLessonProgress[],
    lessonId: string
  ): VideoDetailVm {
    const moduleMap = new Map(modules.map((module) => [module.id, module.title]));
    const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));
    const playlist = lessons
      .filter((lesson) => lesson.type === ProgramLessonType.VIDEO && !!lesson.videoUrl)
      .sort((left, right) => left.order - right.order)
      .map((lesson) => this.decorateLesson(lesson, moduleMap, progressMap));

    const current = playlist.find((lesson) => lesson.id === lessonId) || playlist[0];

    return {
      current,
      playlist,
      suggestions: playlist.filter((lesson) => lesson.id !== current?.id).slice(0, 3),
    };
  }

  private decorateLesson(
    lesson: ProgramLesson,
    moduleMap: Map<string, string>,
    progressMap: Map<string, UserLessonProgress>
  ): VideoPlaylistItem {
    const progress = progressMap.get(lesson.id);
    const progressPct = Math.max(0, Math.min(100, Math.round(Number(progress?.watchedPct ?? 0))));
    const statusTone = progress?.completed || progressPct >= 95
      ? 'done'
      : progressPct > 0 || !!progress?.lastOpenedAt
        ? 'active'
        : 'idle';
    const statusLabel = statusTone === 'done'
      ? 'Completed'
      : statusTone === 'active'
        ? 'In progress'
        : 'Not started';
    return {
      ...lesson,
      moduleTitle: moduleMap.get(lesson.moduleId) || 'Program module',
      progressPct: statusTone === 'done' ? 100 : progressPct,
      statusLabel,
      statusTone,
      notes: String(progress?.notes || ''),
    };
  }

  private async persistNote(current: VideoPlaylistItem, value: string): Promise<void> {
    try {
      await this.lessonsService.updateLessonNotes(this.programId(), current.moduleId, current.id, value);
      this.noteSaved.set(true);
    } finally {
      this.noteSaving.set(false);
    }
  }

  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/i,
      /youtu\.be\/([^?&/]+)/i,
      /youtube\.com\/embed\/([^?&/]+)/i,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  private programId(): string {
    return this.route.parent?.snapshot.paramMap.get('programId') || '';
  }
}