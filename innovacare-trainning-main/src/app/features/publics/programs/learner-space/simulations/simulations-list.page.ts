import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { LearnerSimulationsService } from '../services/learner-simulations.service';

@Component({
  selector: 'app-simulations-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sl-page">
      <h1 class="sl-title">CBT / Simulations</h1>
      <p class="sl-subtitle">Computer-based testing and simulation practice for exam readiness.</p>

      @if (simulationsWithAttempts().length > 0) {
        <div class="sl-grid">
          @for (s of simulationsWithAttempts(); track s.id) {
            <div class="sl-card">
              <div class="sl-card-top">
                <span class="sl-diff" [attr.data-diff]="s.difficulty">{{ s.difficulty }}</span>
                <span class="sl-sim-type">{{ s.type }}</span>
                @if (s.bestScore !== null) {
                  <span class="sl-score" [class.sl-pass]="s.bestScore >= s.passingScore" [class.sl-fail]="s.bestScore < s.passingScore">
                    Best: {{ s.bestScore }}%
                  </span>
                }
              </div>
              <h3 class="sl-name">{{ s.title }}</h3>
              <p class="sl-desc">{{ s.description }}</p>
              <div class="sl-meta">
                <span>❓ {{ s.questionCount }} questions</span>
                <span>⏱ {{ s.durationMin }} min</span>
                <span>🎯 Pass: {{ s.passingScore }}%</span>
                <span>📊 {{ s.attempts }} attempt{{ s.attempts !== 1 ? 's' : '' }}</span>
              </div>
              <a class="sl-start-btn" [routerLink]="[s.id]">
                {{ s.attempts > 0 ? '🔄 Retry' : '🚀 Launch' }} Simulation
              </a>
            </div>
          }
        </div>
      } @else {
        <div class="sl-empty"><span>🧪</span><p>No simulations available yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .sl-page { max-width: 1000px; }
    .sl-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .sl-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .sl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .sl-card {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 14px; padding: 1.2rem; display: flex; flex-direction: column; gap: .4rem;
      transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .sl-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }

    .sl-card-top { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
    .sl-diff {
      font-size: .58rem; font-weight: 700; text-transform: uppercase;
      padding: .12rem .4rem; border-radius: 4px;
    }
    .sl-diff[data-diff="easy"] { background: #d1fae5; color: #059669; }
    .sl-diff[data-diff="medium"] { background: #fef3c7; color: #d97706; }
    .sl-diff[data-diff="hard"] { background: #fee2e2; color: #dc2626; }
    .sl-sim-type {
      font-size: .58rem; font-weight: 700; text-transform: uppercase;
      padding: .12rem .4rem; border-radius: 4px; background: #eef2ff; color: #4f46e5;
    }
    .sl-score { margin-left: auto; font-size: .78rem; font-weight: 800; }
    .sl-pass { color: #059669; }
    .sl-fail { color: #d97706; }

    .sl-name { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0; }
    .sl-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sl-meta { display: flex; gap: .5rem; font-size: .66rem; color: #9ca3af; flex-wrap: wrap; }

    .sl-start-btn {
      display: inline-block; margin-top: .5rem; padding: .5rem 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
      font-size: .8rem; font-weight: 700; border-radius: 8px; text-decoration: none;
      text-align: center; transition: all .2s;
    }
    .sl-start-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(99,102,241,.3); }

    .sl-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .sl-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class SimulationsListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly simsService = inject(LearnerSimulationsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  private readonly simulations = toSignal(
    this.programId$.pipe(switchMap((id) => this.simsService.getSimulations(id))),
    { initialValue: [] }
  );

  private readonly attempts = toSignal(
    this.programId$.pipe(switchMap((id) => this.simsService.getMyAttempts(id))),
    { initialValue: [] }
  );

  readonly simulationsWithAttempts = computed(() => {
    const sims = this.simulations();
    const atts = this.attempts();
    return sims.map((s) => {
      const myAttempts = atts.filter((t) => t.simulationId === s.id);
      const bestScore = myAttempts.length > 0
        ? Math.max(...myAttempts.map((t) => Number(t.score || 0)))
        : null;
      return { ...s, attempts: myAttempts.length, bestScore };
    });
  });
}
