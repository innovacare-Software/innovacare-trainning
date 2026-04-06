import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerModulesService } from '../services/learner-modules.service';
import { ProgramProgressService } from '../../program-progress.service';

@Component({
  selector: 'app-modules-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ml-page">
      <h1 class="ml-title">Program Modules</h1>
      <p class="ml-subtitle">Work through each module to build your knowledge step by step.</p>

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
              <span class="ml-progress-text">{{ mod.progressPct }}% complete</span>
            </a>
          }
        </div>
      } @else {
        <div class="ml-empty">
          <span class="ml-empty-icon">📚</span>
          <p>No modules available yet. Check back soon!</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .ml-page { max-width: 1000px; }
    .ml-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .ml-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .ml-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

    .ml-card {
      display: flex; flex-direction: column; gap: .4rem;
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 14px; padding: 1.2rem; text-decoration: none; color: #374151;
      transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ml-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }

    .ml-card-head { display: flex; align-items: center; justify-content: space-between; }
    .ml-order {
      font-size: .7rem; font-weight: 800; color: #4f46e5;
      background: #eef2ff; padding: .2rem .5rem; border-radius: 6px;
    }
    .ml-status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-done { background: #059669; }
    .dot-active { background: #6366f1; animation: pulse 1.5s infinite; }
    .dot-locked { background: #d1d5db; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    .ml-card-title { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0; }
    .ml-card-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .ml-card-meta { display: flex; gap: .6rem; margin-top: .2rem; }
    .ml-meta-item { font-size: .68rem; color: #9ca3af; }

    .ml-progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: .3rem; }
    .ml-progress-fill { height: 100%; border-radius: 3px; transition: width .5s ease; background: #d1d5db; }
    .fill-done { background: linear-gradient(90deg, #059669, #34d399); }
    .fill-mid { background: linear-gradient(90deg, #6366f1, #818cf8); }
    .ml-progress-text { font-size: .62rem; color: #9ca3af; }

    .ml-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .ml-empty-icon { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class ModulesListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly modulesService = inject(LearnerModulesService);
  private readonly progressService = inject(ProgramProgressService);

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

  readonly modulesWithProgress = computed(() => {
    const mods = this.modules();
    const progress = this.moduleProgress();
    return mods.map((m) => {
      const p = progress.find((mp) => mp.moduleId === m.id);
      return { ...m, progressPct: Math.round(Number(p?.progressPct || 0)) };
    });
  });
}
