import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { LearnerExamPrepService } from '../services/learner-exam-prep.service';
import { LearnerSimulationsService } from '../services/learner-simulations.service';

@Component({
  selector: 'app-simulations-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sl-page">
      <h1 class="sl-title">CBT / Simulations</h1>
      <p class="sl-subtitle">Simulation delivery opens in exam-prep when a migrated briefing exists, otherwise the classic runner stays available.</p>

      @if (simulationCards().length > 0) {
        <div class="sl-grid">
          @for (card of simulationCards(); track card.id) {
            <div class="sl-card">
              <div class="sl-card-top">
                <span class="sl-diff" [attr.data-diff]="difficultyTone(card.policy.deliveryMode)">{{ difficultyLabel(card.policy.deliveryMode) }}</span>
                <span class="sl-sim-type">{{ card.assessmentMode }}</span>
                @if (card.bestScore !== null) {
                  <span class="sl-score" [class.sl-pass]="card.bestScore >= card.passingScorePercent" [class.sl-fail]="card.bestScore < card.passingScorePercent">
                    Best: {{ card.bestScore }}%
                  </span>
                }
              </div>
              <h3 class="sl-name">{{ card.title }}</h3>
              <p class="sl-desc">{{ card.description }}</p>
              <div class="sl-meta">
                <span>❓ {{ card.drawCount }} questions</span>
                <span>⏱ {{ card.durationMinutes }} min</span>
                <span>🎯 Pass: {{ card.passingScorePercent }}%</span>
                <span>📊 {{ card.attempts }} attempt{{ card.attempts !== 1 ? 's' : '' }}</span>
                <span>🧭 {{ navigationLabel(card.policy.navigationMode) }}</span>
                <span>{{ card.policy.allowQuestionFlagging ? '🚩 Flagging on' : '🔒 Strict navigation' }}</span>
              </div>
              <a class="sl-start-btn" [routerLink]="['/my-programs', programId(), 'simulations', card.id]">
                {{ card.attempts > 0 ? '🔄 Reopen briefing' : '🚀 Launch' }} Simulation
              </a>
            </div>
          }
        </div>
      } @else {
        <div class="sl-empty"><span>🧪</span><p>No simulations are available yet.</p></div>
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
  private readonly examPrep = inject(LearnerExamPrepService);
  private readonly simulationsService = inject(LearnerSimulationsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));
  readonly programId = toSignal(this.programId$, { initialValue: '' });

  private readonly examPrepSimulations = toSignal(
    this.programId$.pipe(switchMap((id) => this.examPrep.listCatalog(id, 'simulation'))),
    { initialValue: [] }
  );

  private readonly legacySimulations = toSignal(
    this.programId$.pipe(switchMap((id) => this.simulationsService.getSimulations(id))),
    { initialValue: [] }
  );

  private readonly attempts = toSignal(
    this.programId$.pipe(switchMap((id) => this.examPrep.getAttemptSummaries(id))),
    { initialValue: [] }
  );

  private readonly legacyAttempts = toSignal(
    this.programId$.pipe(switchMap((id) => this.simulationsService.getMyAttempts(id))),
    { initialValue: [] }
  );

  readonly simulationCards = computed(() => {
    const examPrepCards = this.examPrepSimulations().map((item) => {
      const myAttempts = this.attempts().filter((attempt) => attempt.assessmentId === item.id);
      const bestScore = myAttempts.length > 0
        ? Math.max(...myAttempts.map((attempt) => Number(attempt.score || 0)))
        : null;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        assessmentMode: this.examPrep.formatModeLabel(item.assessmentMode),
        drawCount: item.drawCount,
        durationMinutes: item.durationMinutes,
        passingScorePercent: item.passingScorePercent,
        attempts: myAttempts.length,
        bestScore,
        policy: item.policy,
      };
    });

    const promotedTitles = new Set(examPrepCards.map((item) => item.title.trim().toLowerCase()).filter(Boolean));
    const legacyCards = this.legacySimulations()
      .filter((item) => !promotedTitles.has(String(item.title || '').trim().toLowerCase()))
      .map((item) => {
        const myAttempts = this.legacyAttempts().filter((attempt) => attempt.simulationId === item.id);
        const bestScore = myAttempts.length > 0
          ? Math.max(...myAttempts.map((attempt) => Number(attempt.score || 0)))
          : null;

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          assessmentMode: String(item.type || 'Simulation').replaceAll('_', ' '),
          drawCount: item.questionCount,
          durationMinutes: item.durationMin,
          passingScorePercent: item.passingScore,
          attempts: myAttempts.length,
          bestScore,
          policy: {
            deliveryMode: item.type === 'computer_test' ? 'strict_nclex_mode' : 'practice_mode',
            navigationMode: item.type === 'computer_test' ? 'strict_no_backtrack' : 'free_navigation',
            allowQuestionFlagging: item.type !== 'computer_test',
          },
        };
      });

    return [...examPrepCards, ...legacyCards];
  });

  difficultyLabel(deliveryMode: string): string {
    switch (deliveryMode) {
      case 'strict_nclex_mode':
        return 'strict';
      case 'flaggable_mock_mode':
        return 'mock';
      case 'review_mode':
        return 'review';
      default:
        return 'practice';
    }
  }

  difficultyTone(deliveryMode: string): string {
    switch (deliveryMode) {
      case 'strict_nclex_mode':
        return 'hard';
      case 'flaggable_mock_mode':
        return 'medium';
      default:
        return 'easy';
    }
  }

  navigationLabel(mode: string): string {
    switch (mode) {
      case 'strict_no_backtrack':
        return 'No backtracking';
      case 'forward_only':
        return 'Forward only';
      default:
        return 'Free navigation';
    }
  }
}
