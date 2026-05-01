import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, map, switchMap } from 'rxjs';
import { CustomTestBuilderDialog } from '../dashboard/custom-test-builder.dialog';
import { LearnerExamPrepService } from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="catalog-shell">
      <header class="catalog-header">
        <div class="catalog-copy">
          <span class="eyebrow">Exam Prep</span>
          <h1>Exam delivery catalogue</h1>
          <p>Timed readiness exams, module finals, and comprehensive mocks delivered in a focused CBT player.</p>
          <div class="header-ribbon">
            <span>{{ cards().length }} active formats</span>
            <span>{{ totalAttempts() }} completed attempts</span>
            <span>{{ passingMilestones() }} passing milestones</span>
          </div>
        </div>
        <div class="catalog-actions">
          <div class="spotlight-card">
            <span class="spotlight-label">Premium flow</span>
            <strong>Choose a format, review rules, then enter the focused exam player.</strong>
          </div>
          <button type="button" class="secondary-btn" (click)="openCustomTestBuilder()">Create custom test</button>
        </div>
      </header>

      @if (cards().length) {
        <div class="catalog-grid">
          @for (card of cards(); track card.id) {
            <article class="card">
              <div class="card-glow" aria-hidden="true"></div>
              <div class="card-top">
                <span class="mode-badge">{{ card.assessmentMode }}</span>
                @if (card.activeAttempt) {
                  <span class="active-attempt-badge">Tentative en cours</span>
                } @else if (card.isCustom) {
                  <span class="policy-pill">Custom build</span>
                } @else if (card.bestScore !== null) {
                  <span class="best-score" [class.best-score--pass]="card.bestScore >= card.passingScorePercent">Best {{ card.bestScore }}%</span>
                }
              </div>

              <h2>{{ card.title }}</h2>
              <p>{{ card.description }}</p>

              <div class="meta-grid">
                <span>{{ card.programTitle }}</span>
                <span>{{ card.moduleTitle || card.courseGroupTitle || 'Comprehensive' }}</span>
                <span>{{ card.drawCount }} questions</span>
                <span>{{ card.durationMinutes }} min</span>
                <span>Pass {{ card.passingScorePercent }}%</span>
                <span>{{ navigationLabel(card.policy.navigationMode) }}</span>
              </div>

              <div class="policy-pill-row">
                @if (card.activeAttempt) {
                  <span class="active-attempt-detail">Question {{ card.activeAttempt.currentQuestionIndex + 1 }} en attente</span>
                  <span class="active-attempt-detail">{{ formatRemaining(card.activeAttempt.remainingSeconds) }} restantes</span>
                }
                @if (card.bestScore !== null && card.isCustom) {
                  <span class="best-score" [class.best-score--pass]="card.bestScore >= card.passingScorePercent">Best {{ card.bestScore }}%</span>
                }
                <span class="policy-pill">{{ card.policy.reviewAllowed ? 'Review enabled' : 'Review disabled' }}</span>
                <span class="policy-pill">{{ card.policy.allowQuestionFlagging ? 'Flagging on' : 'Flagging off' }}</span>
                <span class="policy-pill">{{ card.attempts }} completed</span>
              </div>

              <a class="primary-btn" [routerLink]="[card.id]">
                {{ card.activeAttempt ? 'Reprendre la tentative' : (card.attempts ? 'Open exam briefing' : 'Start exam briefing') }}
              </a>
            </article>
          }
        </div>
      } @else {
        <div class="empty-state">
          <p>No published exam-prep assessments are available for this learner space yet.</p>
          <button type="button" class="secondary-btn" (click)="openCustomTestBuilder()">Create your own test</button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; min-height: 100%; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .catalog-shell { display: grid; gap: 1.1rem; color: #1a1a1a; max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
      .catalog-header {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.8fr);
        gap: 1rem;
        border: 1px solid #2c5f7e;
        border-radius: 6px;
        background: #2c5f7e;
        color: #fff;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .catalog-copy { display: grid; gap: 0.9rem; }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.5rem;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #ffd700;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(1.85rem, 2.5vw, 2.5rem); }
      .catalog-header h1 { color: #fff; }
      .catalog-header p { color: rgba(255,255,255,.82); max-width: 64ch; line-height: 1.7; }
      .catalog-actions {
        display: grid;
        gap: 0.9rem;
        align-content: start;
      }
      .header-ribbon {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }
      .header-ribbon span,
      .meta-grid span {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 0.8rem;
        border-radius: 999px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: #fff;
        font-size: .78rem;
      }
      .spotlight-card {
        display: grid;
        gap: 0.45rem;
        padding: 1rem 1.05rem;
        border-radius: 12px;
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.2);
        color: #fff;
      }
      .spotlight-label {
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: #ffd700;
      }
      .catalog-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1rem;
      }
      .card,
      .empty-state {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        background: #fff;
        padding: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .card {
        position: relative;
        overflow: hidden;
        display: grid;
        gap: 0.8rem;
      }
      .card-glow {
        position: absolute;
        inset: auto -20% 72% auto;
        width: 170px;
        height: 170px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255, 188, 107, 0.24), rgba(255, 188, 107, 0));
        pointer-events: none;
      }
      .card-top,
      .policy-pill-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .mode-badge,
      .policy-pill {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 0.65rem;
        border-radius: 999px;
        background: linear-gradient(180deg, #eff4f8 0%, #f9fbfd 100%);
        color: #2e4862;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .best-score {
        font-weight: 800;
        color: #996316;
      }
      .active-attempt-badge,
      .active-attempt-detail {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 0.75rem;
        border-radius: 999px;
        background: rgba(222, 248, 243, 0.92);
        color: #0d6b60;
        border: 1px solid rgba(112, 204, 191, 0.9);
        font-size: 0.75rem;
        font-weight: 800;
      }
      .best-score--pass {
        color: #17643b;
      }
      .meta-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        color: #5c7188;
        font-size: 0.82rem;
      }
      .primary-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        border-radius: 4px;
        background: #2c5f7e;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .primary-btn:hover { background: #1f4660; }
      .secondary-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 1rem;
        border-radius: 4px;
        border: 1px solid #e1e5ea;
        background: transparent;
        color: #2c5f7e;
        font-weight: 700;
        cursor: pointer;
      }
      .empty-state {
        text-align: center;
        color: #66788c;
        display: grid;
        gap: 1rem;
        justify-items: center;
      }
      @media (max-width: 960px) {
        .catalog-header { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ExamPrepListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly examPrep = inject(LearnerExamPrepService);

  private readonly programSpaceId$ = this.route.parent!.paramMap.pipe(map((params) => params.get('programId') || ''));

  readonly assessments = toSignal(
    this.programSpaceId$.pipe(switchMap((programId) => this.examPrep.listAssessments(programId))),
    { initialValue: [] }
  );
  readonly attempts = toSignal(
    this.programSpaceId$.pipe(switchMap((programId) => this.examPrep.getAttemptSummaries(programId))),
    { initialValue: [] }
  );
  readonly activeAttempts = toSignal(
    this.programSpaceId$.pipe(switchMap((programId) => this.examPrep.listActiveAttempts(programId))),
    { initialValue: [] }
  );

  readonly cards = computed(() =>
    this.assessments().map((assessment) => {
      const attempts = this.attempts().filter((row) => row.assessmentId === assessment.id);
      const activeAttempt = this.activeAttempts().find((row) => row.assessmentId === assessment.id) ?? null;
      const bestScore = attempts.length ? Math.max(...attempts.map((row) => row.score)) : null;
      return {
        ...assessment,
        attempts: attempts.length,
        activeAttempt,
        bestScore,
      };
    })
  );

  readonly totalAttempts = computed(() => this.cards().reduce((sum, card) => sum + card.attempts, 0));

  readonly passingMilestones = computed(
    () => this.cards().filter((card) => card.bestScore !== null && card.bestScore >= card.passingScorePercent).length
  );

  navigationLabel(mode: string): string {
    switch (mode) {
      case 'forward_only':
        return 'Forward only';
      case 'strict_no_backtrack':
        return 'No backtracking';
      default:
        return 'Free navigation';
    }
  }

  formatRemaining(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} h ${String(minutes).padStart(2, '0')} min`;
    }
    return `${minutes} min`;
  }

  async openCustomTestBuilder(): Promise<void> {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!programId) {
      return;
    }

    const dialogRef = this.dialog.open(CustomTestBuilderDialog, {
      width: '760px',
      maxWidth: 'calc(100vw - 1rem)',
      panelClass: 'ld-custom-test-dialog',
      data: { programId },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result || typeof result !== 'object' || !result.assessmentId) {
      return;
    }

    await this.router.navigate([result.assessmentId], {
      relativeTo: this.route,
      state: { preloadedAssessment: result.assessment ?? null },
    });
  }
}
