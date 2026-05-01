import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map, switchMap } from 'rxjs';
import { LanguageService } from '../../../../../core/language.service';
import { ProgramLesson, ProgramLessonType, ProgramModule, UserLessonProgress } from '../../program.models';
import { LearnerLessonsService } from '../services/learner-lessons.service';
import { LearnerModulesService } from '../services/learner-modules.service';

type VideoLibraryItem = ProgramLesson & {
  moduleTitle: string;
  thumbnail: string;
  durationLabel: string;
  watchedPct: number;
  statusLabel: string;
  statusTone: 'done' | 'active' | 'idle';
  searchableText: string;
};

@Component({
  selector: 'app-video-library-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <section class="vl-page">
      <header class="vl-hero">
        <div class="vl-hero__copy">
          <span class="vl-eyebrow">{{ t('programs.learnerSpace.videoLibrary.eyebrow') }}</span>
          <h1>{{ t('programs.learnerSpace.videoLibrary.title') }}</h1>
          <p>{{ t('programs.learnerSpace.videoLibrary.subtitle') }}</p>
          <div class="vl-stats">
            <span class="vl-stat"><strong>{{ inProgressVideos().length }}</strong> {{ t('programs.learnerSpace.videoLibrary.inProgress') }}</span>
            <span class="vl-stat"><strong>{{ readyToStartVideos().length }}</strong> {{ t('programs.learnerSpace.videoLibrary.yetToStart') }}</span>
            <span class="vl-stat"><strong>{{ completedVideos().length }}</strong> {{ t('programs.learnerSpace.videoLibrary.completed') }}</span>
          </div>
        </div>
        <div class="vl-hero__actions">
          <a routerLink="../modules" class="vl-btn vl-btn--ghost">{{ t('programs.learnerSpace.videoLibrary.backToModules') }}</a>
        </div>
      </header>

      <section class="vl-filters">
        <div class="vl-search">
          <label for="video-search">{{ t('programs.learnerSpace.videoLibrary.searchLabel') }}</label>
          <input id="video-search" type="search" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" [placeholder]="t('programs.learnerSpace.videoLibrary.searchPlaceholder')" />
        </div>

        <div class="vl-filter-group">
          <span class="vl-filter-label">{{ t('programs.learnerSpace.videoLibrary.status') }}</span>
          <div class="vl-filter-chips">
            @for (filter of statusFilters(); track filter.value) {
              <button type="button" class="vl-filter-chip" [class.is-selected]="selectedStatus() === filter.value" (click)="selectedStatus.set(filter.value)">
                {{ filter.label }}
              </button>
            }
          </div>
        </div>

        @if (moduleFilters().length > 1) {
          <div class="vl-filter-group">
            <span class="vl-filter-label">{{ t('programs.learnerSpace.videoLibrary.subject') }}</span>
            <div class="vl-filter-chips">
              @for (module of moduleFilters(); track module.value) {
                <button type="button" class="vl-filter-chip" [class.is-selected]="selectedModule() === module.value" (click)="selectedModule.set(module.value)">
                  {{ module.label }}
                </button>
              }
            </div>
          </div>
        }
      </section>

      @if (featuredVideo(); as featured) {
        <a class="vl-featured" [routerLink]="[featured.id]">
          <div class="vl-featured__media" [style.background-image]="'url(' + featured.thumbnail + ')'">
            <span class="vl-play">{{ t('programs.learnerSpace.videoLibrary.play') }}</span>
          </div>
          <div class="vl-featured__copy">
            <span class="vl-chip">{{ t('programs.learnerSpace.videoLibrary.featured') }}</span>
            <h2>{{ featured.title }}</h2>
            <p>{{ featured.moduleTitle }}</p>
            <div class="vl-meta">
              <span>{{ featured.durationLabel }}</span>
              <span class="vl-status-pill" [class.is-done]="featured.statusTone === 'done'" [class.is-active]="featured.statusTone === 'active'">{{ featured.statusLabel }}</span>
              @if (featured.isPreview) {
                <span>{{ t('programs.learnerSpace.videoLibrary.preview') }}</span>
              }
            </div>
            <div class="vl-progress">
              <div class="vl-progress__bar">
                <span [style.width.%]="featured.watchedPct"></span>
              </div>
              <small>{{ t('programs.learnerSpace.videoLibrary.watchedPct', { value: featured.watchedPct }) }}</small>
            </div>
          </div>
        </a>
      }

      @if (filteredVideos().length > 0) {
        @if (inProgressVideos().length > 0) {
          <section class="vl-section">
            <div class="vl-section__head">
              <div>
                <span class="vl-section__eyebrow">{{ t('programs.learnerSpace.videoLibrary.continueEyebrow') }}</span>
                <h2>{{ t('programs.learnerSpace.videoLibrary.inProgress') }}</h2>
              </div>
              <span>{{ t('programs.learnerSpace.videoLibrary.videoCount', { count: inProgressVideos().length }) }}</span>
            </div>

            <div class="vl-grid">
              @for (video of inProgressVideos(); track video.id) {
                <a class="vl-card" [routerLink]="[video.id]">
                  <div class="vl-card__thumb" [style.background-image]="'url(' + video.thumbnail + ')'">
                    <span class="vl-card__play">{{ t('programs.learnerSpace.videoLibrary.resume') }}</span>
                  </div>
                  <div class="vl-card__body">
                    <div class="vl-card__topline">
                      <span class="vl-card__module">{{ video.moduleTitle }}</span>
                      <span class="vl-status-pill is-active">{{ video.statusLabel }}</span>
                    </div>
                    <h3>{{ video.title }}</h3>
                    <div class="vl-card__meta">
                      <span>{{ video.durationLabel }}</span>
                      <span>{{ t('programs.learnerSpace.videoLibrary.watchedPct', { value: video.watchedPct }) }}</span>
                    </div>
                    <div class="vl-progress vl-progress--card">
                      <div class="vl-progress__bar">
                        <span [style.width.%]="video.watchedPct"></span>
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
          </section>
        }

        @if (readyToStartVideos().length > 0) {
          <section class="vl-section">
            <div class="vl-section__head">
              <div>
                <span class="vl-section__eyebrow">{{ t('programs.learnerSpace.videoLibrary.queueEyebrow') }}</span>
                <h2>{{ t('programs.learnerSpace.videoLibrary.yetToStart') }}</h2>
              </div>
              <span>{{ t('programs.learnerSpace.videoLibrary.videoCount', { count: readyToStartVideos().length }) }}</span>
            </div>

            <div class="vl-grid">
              @for (video of readyToStartVideos(); track video.id) {
                <a class="vl-card" [routerLink]="[video.id]">
                  <div class="vl-card__thumb" [style.background-image]="'url(' + video.thumbnail + ')'">
                    <span class="vl-card__play">{{ t('programs.learnerSpace.videoLibrary.watch') }}</span>
                  </div>
                  <div class="vl-card__body">
                    <div class="vl-card__topline">
                      <span class="vl-card__module">{{ video.moduleTitle }}</span>
                      <span class="vl-status-pill">{{ video.statusLabel }}</span>
                    </div>
                    <h3>{{ video.title }}</h3>
                    <div class="vl-card__meta">
                      <span>{{ video.durationLabel }}</span>
                      @if (video.isPreview) {
                        <span>{{ t('programs.learnerSpace.videoLibrary.preview') }}</span>
                      }
                    </div>
                  </div>
                </a>
              }
            </div>
          </section>
        }

        @if (completedVideos().length > 0) {
          <section class="vl-section">
            <div class="vl-section__head">
              <div>
                <span class="vl-section__eyebrow">{{ t('programs.learnerSpace.videoLibrary.doneEyebrow') }}</span>
                <h2>{{ t('programs.learnerSpace.videoLibrary.completed') }}</h2>
              </div>
              <span>{{ t('programs.learnerSpace.videoLibrary.videoCount', { count: completedVideos().length }) }}</span>
            </div>

            <div class="vl-grid">
              @for (video of completedVideos(); track video.id) {
                <a class="vl-card" [routerLink]="[video.id]">
                  <div class="vl-card__thumb" [style.background-image]="'url(' + video.thumbnail + ')'">
                    <span class="vl-card__play">{{ t('programs.learnerSpace.videoLibrary.replay') }}</span>
                  </div>
                  <div class="vl-card__body">
                    <div class="vl-card__topline">
                      <span class="vl-card__module">{{ video.moduleTitle }}</span>
                      <span class="vl-status-pill is-done">{{ video.statusLabel }}</span>
                    </div>
                    <h3>{{ video.title }}</h3>
                    <div class="vl-card__meta">
                      <span>{{ video.durationLabel }}</span>
                      <span>{{ t('programs.learnerSpace.videoLibrary.watchedPct', { value: 100 }) }}</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          </section>
        }
      } @else {
        <div class="vl-empty">
          <strong>{{ t('programs.learnerSpace.videoLibrary.emptyTitle') }}</strong>
          <span>{{ t('programs.learnerSpace.videoLibrary.emptySubtitle') }}</span>
        </div>
      }
    </section>
  `,
  styles: [`
    .vl-page { display: grid; gap: 1rem; }
    .vl-hero, .vl-featured, .vl-card, .vl-empty, .vl-filters {
      border: 1px solid rgba(20, 33, 50, 0.08);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 46px rgba(20, 33, 50, 0.08);
      backdrop-filter: blur(16px);
    }
    .vl-hero {
      display: flex; justify-content: space-between; align-items: end; gap: 1rem;
      padding: 1rem 1.1rem; border-radius: 1.3rem;
    }
    .vl-hero__copy { display: grid; gap: 0.55rem; }
    .vl-eyebrow, .vl-card__module, .vl-chip {
      text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.66rem; font-weight: 800; color: #155e75;
    }
    .vl-hero h1 { margin: 0.2rem 0 0; font-size: 1.4rem; color: #142132; }
    .vl-hero p { margin: 0.25rem 0 0; color: #52606d; font-size: 0.84rem; }
    .vl-stats { display: flex; flex-wrap: wrap; gap: 0.55rem; }
    .vl-stat {
      display: inline-flex; align-items: center; gap: 0.4rem; min-height: 34px; padding: 0 0.8rem;
      border-radius: 999px; background: rgba(20, 33, 50, 0.05); color: #52606d; font-size: 0.76rem; font-weight: 700;
    }
    .vl-stat strong { color: #142132; }
    .vl-filters { display: grid; gap: 0.9rem; padding: 1rem 1.1rem; border-radius: 1.3rem; }
    .vl-search { display: grid; gap: 0.45rem; }
    .vl-search label, .vl-filter-label { color: #52606d; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; }
    .vl-search input {
      min-height: 44px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.3); padding: 0 1rem;
      background: #fff; color: #142132; font: inherit;
    }
    .vl-filter-group { display: grid; gap: 0.55rem; }
    .vl-filter-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .vl-filter-chip {
      min-height: 34px; padding: 0 0.8rem; border-radius: 999px; border: 1px solid rgba(20, 33, 50, 0.08);
      background: rgba(255,255,255,0.96); color: #475569; font-size: 0.74rem; font-weight: 800; cursor: pointer;
    }
    .vl-filter-chip.is-selected { background: rgba(21, 94, 117, 0.1); color: #155e75; border-color: rgba(21, 94, 117, 0.18); }
    .vl-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 0.9rem; border-radius: 999px; text-decoration: none; font-size: 0.78rem; font-weight: 800; }
    .vl-btn--ghost { background: rgba(20, 33, 50, 0.06); color: #142132; }
    .vl-featured {
      display: grid; grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr); gap: 1rem;
      padding: 0.9rem; border-radius: 1.35rem; color: inherit; text-decoration: none;
    }
    .vl-featured__media, .vl-card__thumb {
      position: relative; min-height: 220px; border-radius: 1rem; overflow: hidden;
      background-size: cover; background-position: center;
      background-image:
        linear-gradient(135deg, rgba(21, 94, 117, 0.22), rgba(15, 118, 110, 0.12)),
        linear-gradient(135deg, #0f172a, #155e75);
    }
    .vl-featured__media::after, .vl-card__thumb::after {
      content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.42));
    }
    .vl-play, .vl-card__play {
      position: absolute; left: 1rem; bottom: 1rem; z-index: 1;
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 38px; padding: 0 0.95rem; border-radius: 999px;
      background: rgba(255,255,255,0.92); color: #142132; font-size: 0.78rem; font-weight: 800;
    }
    .vl-featured__copy { display: grid; align-content: center; gap: 0.45rem; }
    .vl-featured__copy h2 { margin: 0; font-size: 1.25rem; color: #142132; }
    .vl-featured__copy p { margin: 0; color: #52606d; }
    .vl-meta, .vl-card__meta { display: flex; flex-wrap: wrap; gap: 0.5rem; color: #64748b; font-size: 0.76rem; font-weight: 700; }
    .vl-status-pill {
      display: inline-flex; align-items: center; justify-content: center; min-height: 26px; padding: 0 0.65rem;
      border-radius: 999px; background: rgba(148, 163, 184, 0.16); color: #475569; font-size: 0.68rem; font-weight: 800;
    }
    .vl-status-pill.is-active { background: rgba(59, 130, 246, 0.14); color: #1d4ed8; }
    .vl-status-pill.is-done { background: rgba(16, 185, 129, 0.14); color: #047857; }
    .vl-progress { display: grid; gap: 0.35rem; }
    .vl-progress small { color: #64748b; font-size: 0.72rem; font-weight: 700; }
    .vl-progress__bar { height: 7px; border-radius: 999px; background: rgba(148, 163, 184, 0.2); overflow: hidden; }
    .vl-progress__bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #0ea5e9, #14b8a6); }
    .vl-chip {
      display: inline-flex; width: fit-content; min-height: 28px; padding: 0 0.7rem; border-radius: 999px;
      align-items: center; justify-content: center; background: rgba(21, 94, 117, 0.08);
    }
    .vl-section { display: grid; gap: 0.8rem; }
    .vl-section__head { display: flex; align-items: end; justify-content: space-between; gap: 0.8rem; }
    .vl-section__head h2 { margin: 0.15rem 0 0; color: #142132; font-size: 1.05rem; }
    .vl-section__head span { color: #64748b; font-size: 0.76rem; font-weight: 700; }
    .vl-section__eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.64rem; font-weight: 800; color: #155e75; }
    .vl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.9rem; }
    .vl-card { border-radius: 1.2rem; overflow: hidden; color: inherit; text-decoration: none; }
    .vl-card__thumb { min-height: 160px; border-radius: 0; }
    .vl-card__body { display: grid; gap: 0.35rem; padding: 0.85rem; }
    .vl-card__topline { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
    .vl-card__body h3 { margin: 0; font-size: 0.96rem; color: #142132; line-height: 1.35; }
    .vl-progress--card { padding-top: 0.1rem; }
    .vl-empty { display: grid; gap: 0.35rem; place-items: center; padding: 2.4rem 1rem; border-radius: 1.2rem; text-align: center; color: #52606d; }
    @media (max-width: 860px) {
      .vl-hero, .vl-featured { grid-template-columns: 1fr; display: grid; }
      .vl-hero { align-items: stretch; }
      .vl-featured__media { min-height: 180px; }
      .vl-section__head, .vl-card__topline { align-items: stretch; flex-direction: column; }
    }
  `],
})
export class VideoLibraryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonsService = inject(LearnerLessonsService);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly searchTerm = signal('');
  readonly selectedStatus = signal<'all' | 'active' | 'idle' | 'done'>('all');
  readonly selectedModule = signal('all');
  private readonly activeTranslation = toSignal(this.transloco.selectTranslation(), {
    initialValue: null,
  });
  readonly statusFilters = computed(() => [
    { value: 'all', label: this.t('programs.learnerSpace.videoLibrary.filters.all') },
    { value: 'active', label: this.t('programs.learnerSpace.videoLibrary.filters.active') },
    { value: 'idle', label: this.t('programs.learnerSpace.videoLibrary.filters.idle') },
    { value: 'done', label: this.t('programs.learnerSpace.videoLibrary.filters.done') },
  ] as const);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  private readonly videosState = toSignal(
    combineLatest([
      this.programId$.pipe(switchMap((programId) => this.lessonsService.getLessons(programId))),
      this.programId$.pipe(switchMap((programId) => this.modulesService.getModules(programId))),
      this.programId$.pipe(switchMap((programId) => this.lessonsService.getMyLessonProgress(programId))),
    ]).pipe(
      map(([lessons, modules, progress]) => this.buildVideoLibrary(lessons, modules, progress))
    ),
    { initialValue: [] as VideoLibraryItem[] }
  );

  readonly videos = computed(() => this.videosState());
  readonly moduleFilters = computed(() => [
    { value: 'all', label: this.t('programs.learnerSpace.videoLibrary.allSubjects') },
    ...Array.from(new Set(this.videos().map((video) => video.moduleTitle))).map((module) => ({ value: module, label: module })),
  ]);
  readonly filteredVideos = computed(() => {
    const keyword = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();
    const moduleTitle = this.selectedModule();

    return this.videos().filter((video) => {
      const matchesKeyword = !keyword || video.searchableText.includes(keyword);
      const matchesStatus = status === 'all' || video.statusTone === status;
      const matchesModule = moduleTitle === 'all' || video.moduleTitle === moduleTitle;
      return matchesKeyword && matchesStatus && matchesModule;
    });
  });
  readonly featuredVideo = computed(() => this.filteredVideos()[0] ?? null);
  readonly inProgressVideos = computed(() => this.filteredVideos().filter((video) => video.statusTone === 'active'));
  readonly readyToStartVideos = computed(() => this.filteredVideos().filter((video) => video.statusTone === 'idle'));
  readonly completedVideos = computed(() => this.filteredVideos().filter((video) => video.statusTone === 'done'));

  private buildVideoLibrary(
    lessons: ProgramLesson[],
    modules: ProgramModule[],
    progressRows: UserLessonProgress[]
  ): VideoLibraryItem[] {
    const moduleMap = new Map(modules.map((module) => [module.id, module.title]));
    const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));
    return lessons
      .filter((lesson) => lesson.type === ProgramLessonType.VIDEO && !!lesson.videoUrl)
      .sort((left, right) => left.order - right.order)
      .map((lesson) => {
        const progress = progressMap.get(lesson.id);
        const watchedPct = Math.max(0, Math.min(100, Math.round(Number(progress?.watchedPct ?? 0))));
        const statusTone = progress?.completed || watchedPct >= 95
          ? 'done'
          : watchedPct > 0 || !!progress?.lastOpenedAt
            ? 'active'
            : 'idle';
        const statusLabel = statusTone === 'done'
          ? this.t('programs.learnerSpace.videoLibrary.completed')
          : statusTone === 'active'
            ? this.t('programs.learnerSpace.videoLibrary.inProgress')
            : this.t('programs.learnerSpace.videoLibrary.notStarted');
        return {
          ...lesson,
          moduleTitle: moduleMap.get(lesson.moduleId) || this.t('programs.learnerSpace.videoLibrary.programModule'),
          durationLabel: `${Math.max(1, lesson.durationMin || 0)} ${this.t('common.min')}`,
          thumbnail: this.thumbnailFor(lesson.videoUrl || ''),
          watchedPct: statusTone === 'done' ? 100 : watchedPct,
          statusLabel,
          statusTone,
          searchableText: `${lesson.title} ${moduleMap.get(lesson.moduleId) || ''} ${lesson.description || ''}`.toLowerCase(),
        } as VideoLibraryItem;
      })
      .sort((left, right) => this.sortByStatus(left, right));
  }

  private sortByStatus(left: VideoLibraryItem, right: VideoLibraryItem): number {
    const rank = { active: 0, idle: 1, done: 2 } as const;
    const statusDelta = rank[left.statusTone] - rank[right.statusTone];
    if (statusDelta !== 0) {
      return statusDelta;
    }
    return left.order - right.order;
  }

  private thumbnailFor(videoUrl: string): string {
    const youtubeId = this.extractYouTubeId(videoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    return '';
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

  t(key: string, params?: Record<string, unknown>): string {
    this.activeTranslation();
    return this.language.instant(key, params);
  }
}