import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerSimulationsService } from '../services/learner-simulations.service';

@Component({
  selector: 'app-simulation-runner-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (simulation(); as s) {
      <div class="sr-page">
        <a class="sr-back" routerLink="../">← Simulations</a>

        <div class="sr-header">
          <div class="sr-badges">
            <span class="sr-type">{{ s.type }}</span>
            <span class="sr-diff" [attr.data-diff]="s.difficulty">{{ s.difficulty }}</span>
          </div>
          <h1 class="sr-title">{{ s.title }}</h1>
          <p class="sr-desc">{{ s.description }}</p>
          <div class="sr-meta">
            <span>❓ {{ s.questionCount }} questions</span>
            <span>⏱ {{ s.durationMin }} min</span>
            <span>🎯 Passing: {{ s.passingScore }}%</span>
          </div>
        </div>

        <div class="sr-environment">
          <div class="sr-env-icon">🖥️</div>
          <h2>CBT Simulation Environment</h2>
          <p>This is the Computer-Based Testing environment. Questions will be presented one at a time in exam conditions.</p>
          <p class="sr-info">The full simulation engine will render your timed questions, CAT-adaptive logic, and real-time scoring here.</p>
          <div class="sr-timer">
            <span class="sr-timer-icon">⏱</span>
            <span class="sr-timer-text">{{ s.durationMin }}:00 remaining</span>
          </div>
          <button class="sr-submit-btn" (click)="simulateComplete()" [disabled]="submitting()">
            {{ submitting() ? 'Submitting…' : '✅ Complete Simulation (Demo)' }}
          </button>
        </div>
      </div>
    } @else {
      <div class="sr-loading"><div class="sr-spinner"></div><span>Loading simulation…</span></div>
    }
  `,
  styles: [`
    .sr-page { max-width: 860px; }
    .sr-back { font-size: .78rem; color: #6366f1; text-decoration: none; display: inline-block; margin-bottom: 1rem; }

    .sr-header {
      background: linear-gradient(135deg, #faf5ff, #eef2ff);
      border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.4rem; margin-bottom: 1.5rem;
    }
    .sr-badges { display: flex; gap: .4rem; margin-bottom: .4rem; }
    .sr-type {
      font-size: .6rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px; background: #ede9fe; color: #7c3aed;
    }
    .sr-diff {
      font-size: .6rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px;
    }
    .sr-diff[data-diff="easy"] { background: #d1fae5; color: #059669; }
    .sr-diff[data-diff="medium"] { background: #fef3c7; color: #d97706; }
    .sr-diff[data-diff="hard"] { background: #fee2e2; color: #dc2626; }
    .sr-title { font-size: 1.3rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .sr-desc { font-size: .82rem; color: #7c3aed; margin: 0 0 .5rem; }
    .sr-meta { display: flex; gap: .8rem; font-size: .72rem; color: #9ca3af; }

    .sr-environment {
      text-align: center; padding: 3rem 2rem;
      background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .sr-env-icon { font-size: 3.5rem; margin-bottom: .5rem; }
    .sr-environment h2 { font-size: 1.1rem; color: #111827; margin: 0 0 .5rem; }
    .sr-environment p { font-size: .82rem; color: #6b7280; margin: 0 0 .4rem; max-width: 500px; margin-inline: auto; }
    .sr-info { font-size: .75rem; color: #9ca3af; font-style: italic; }

    .sr-timer {
      display: inline-flex; align-items: center; gap: .4rem;
      margin: 1rem 0; padding: .5rem 1rem;
      background: #ede9fe; border: 1px solid #ddd6fe;
      border-radius: 8px;
    }
    .sr-timer-icon { font-size: 1rem; }
    .sr-timer-text { font-size: .85rem; font-weight: 700; color: #7c3aed; font-variant-numeric: tabular-nums; }

    .sr-submit-btn {
      display: inline-block; margin-top: .5rem; padding: .65rem 1.8rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none;
      border-radius: 8px; font-size: .85rem; font-weight: 700; cursor: pointer; transition: all .2s;
    }
    .sr-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(99,102,241,.3); }
    .sr-submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .sr-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #9ca3af; }
    .sr-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #8b5cf6; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SimulationRunnerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly simsService = inject(LearnerSimulationsService);
  submitting = signal(false);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  private readonly simulationId$ = this.route.paramMap.pipe(map((p) => p.get('simulationId') || ''));

  readonly simulation = toSignal(
    combineLatest([this.programId$, this.simulationId$]).pipe(
      switchMap(([pid, sid]) => this.simsService.getSimulation(pid, sid))
    ),
    { initialValue: undefined }
  );

  async simulateComplete(): Promise<void> {
    const s = this.simulation();
    if (!s) return;
    this.submitting.set(true);
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    try {
      await this.simsService.submitAttempt({
        userId: '',
        programId,
        moduleId: s.moduleId,
        simulationId: s.id,
        score: Math.round(55 + Math.random() * 45),
        passed: true,
        timeSpentMin: s.durationMin,
      });
      this.router.navigate(['../'], { relativeTo: this.route });
    } finally {
      this.submitting.set(false);
    }
  }
}
