import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, firstValueFrom, map, switchMap } from 'rxjs';
import { LearnerExamPrepService } from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-rules-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    @if (assessment(); as assessment) {
      <section class="rules-shell">
        <a class="back-link" routerLink="../">Back to exam briefing</a>

        <header class="rules-card rules-card--headline">
          <div>
            <span class="eyebrow">Readiness Confirmation</span>
            <h1>{{ assessment.title }}</h1>
            <p>The timer starts immediately when you confirm and enter the exam player.</p>
          </div>
          <div class="headline-pills">
            <span>{{ assessment.durationMinutes }} min</span>
            <span>{{ assessment.drawCount }} items</span>
            <span>Pass {{ assessment.passingScorePercent }}%</span>
          </div>
        </header>

        <div class="rules-grid">
          <section class="rules-card">
            <h2>Before you begin</h2>
            <ul>
              <li>Stay focused on one question at a time.</li>
              <li>{{ assessment.policy.deliveryMode === 'strict_nclex_mode' ? 'There is no backtracking, no free skip, and no review screen in this delivery mode.' : 'Navigation depends on the selected exam policy.' }}</li>
              <li>Your draft response is saved continuously, but an item is locked only when you confirm and continue.</li>
              @if (assessment.policy.allowPauseScreen) {
                <li>Vous pouvez quitter l'évaluation et rouvrir plus tard la même tentative en cours. Le chronomètre continue de tourner pendant votre absence.</li>
                <li>Vous pouvez aussi abandonner la tentative en cours pour recommencer plus tard sur une nouvelle tentative, si la politique d'essais le permet.</li>
              }
              <li>{{ assessment.policy.autoSubmitOnTimeout ? 'If time expires, the attempt is submitted automatically.' : 'If time expires, the attempt locks and expires.' }}</li>
              <li>Refreshing the page resumes the same attempt and remaining time.</li>
            </ul>
          </section>

          <section class="rules-card prep-card">
            <span class="prep-kicker">Quick readiness check</span>
            <div class="prep-grid">
              <article>
                <strong>Focus mode</strong>
                <p>Clear distractions and prepare to work in a continuous timed flow.</p>
              </article>
              <article>
                <strong>Submission policy</strong>
                <p>{{ assessment.policy.autoSubmitOnTimeout ? 'The exam submits at timeout.' : 'Timeout locks the attempt.' }}</p>
              </article>
              @if (assessment.policy.allowPauseScreen) {
                <article>
                  <strong>Quitter ou repartir à neuf</strong>
                  <p>Vous pouvez reprendre la même tentative plus tard, ou l'abandonner pour recommencer sur une nouvelle tentative ultérieurement.</p>
                </article>
              }
              <article>
                <strong>Navigation rule</strong>
                <p>{{ assessment.policy.strictNoBacktrack ? 'No return after confirmation.' : 'Movement depends on policy.' }}</p>
              </article>
            </div>

            <label class="ack-row">
              <input type="checkbox" [ngModel]="ready()" (ngModelChange)="ready.set(!!$event)" />
              <span>I have reviewed the instructions and I am ready to start this timed assessment.</span>
            </label>

            @if (error()) {
              <p class="error-text">{{ error() }}</p>
            }

            <div class="actions">
              <a class="secondary-btn" routerLink="../">Cancel</a>
              <button type="button" class="primary-btn" [disabled]="!ready() || starting()" (click)="begin()">
                {{ starting() ? 'Preparing secure session…' : 'Start exam now' }}
              </button>
            </div>
          </section>
        </div>
      </section>
    } @else {
      <div class="loading-state">Loading exam rules…</div>
    }
  `,
  styles: [
    `
      :host { display: block; min-height: 100%; background: #f4f6f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .rules-shell { display: grid; gap: 1rem; color: #1a1a1a; max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
      .back-link { color: #2c5f7e; text-decoration: none; font-weight: 600; font-size: .84rem; }
      .rules-card {
        border: 1px solid #e1e5ea;
        border-radius: 6px;
        background: #fff;
        padding: 1.25rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .rules-card--headline {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) auto;
        gap: 1rem;
        align-items: start;
        background: #2c5f7e;
        color: #fff;
      }
      .rules-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        gap: 1rem;
      }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.55rem;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #ffd700;
      }
      .headline-pills {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.6rem;
      }
      .headline-pills span,
      .prep-kicker {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 0.85rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #d4e1e8;
        font-size: .82rem;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(1.65rem, 2vw, 2.1rem); }
      .rules-card--headline h1 { color: #fff; }
      .rules-card--headline p { color: rgba(255,255,255,.82); margin-top: .4rem; }
      .rules-card p { margin-top: 0.55rem; color: #666666; }
      ul {
        margin: 0;
        padding-left: 1.2rem;
        color: #333333;
        line-height: 1.7;
      }
      ul li + li { margin-top: 0.45rem; }
      .prep-card {
        display: grid;
        gap: 1rem;
        background: #f7f9fb;
        border: 1px solid #e1e5ea;
      }
      .prep-kicker {
        justify-self: start;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #990011;
      }
      .prep-grid {
        display: grid;
        gap: 0.75rem;
      }
      .prep-grid article {
        padding: 0.95rem 1rem;
        border-radius: 6px;
        border: 1px solid #e1e5ea;
        background: #fff;
      }
      .prep-grid strong {
        display: block;
        color: #1a1a1a;
      }
      .prep-grid p { margin-top: 0.35rem; }
      .ack-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        margin-top: 1rem;
        padding: 1rem 1.05rem;
        border-radius: 6px;
        background: #f7f9fb;
        border: 1px solid #e1e5ea;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
      }
      .primary-btn,
      .secondary-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 11px 28px;
        border-radius: 4px;
        text-decoration: none;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #fff;
        font-size: 11px;
        border: 0;
        background: #2c5f7e;
        color: #fff;
        cursor: pointer;
      }
      .primary-btn:hover { background: #1f4660; }
      .primary-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .secondary-btn {
        border: 1px solid #e1e5ea;
        color: #2c5f7e;
        background: transparent;
      }
      .error-text {
        margin-top: 0.85rem;
        color: #ab2f2f;
        font-weight: 600;
      }
      .loading-state { padding: 2rem; color: #66788c; text-align: center; }
      @media (max-width: 900px) {
        .rules-card--headline,
        .rules-grid { grid-template-columns: 1fr; }
        .headline-pills { justify-content: flex-start; }
      }
      @media (max-width: 720px) {
        .actions { flex-direction: column-reverse; }
      }
    `,
  ],
})
export class ExamPrepRulesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examPrep = inject(LearnerExamPrepService);

  readonly ready = signal(false);
  readonly starting = signal(false);
  readonly error = signal('');

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((params) => params.get('programId') || ''));
  private readonly assessmentId$ = this.route.paramMap.pipe(map((params) => params.get('assessmentId') || ''));

  readonly assessment = toSignal(
    combineLatest([this.programId$, this.assessmentId$]).pipe(
      switchMap(([programId, assessmentId]) => this.examPrep.getAssessment(programId, assessmentId))
    ),
    { initialValue: null }
  );

  async begin(): Promise<void> {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    const assessmentId = this.route.snapshot.paramMap.get('assessmentId') || '';
    const navState = window.history.state as { sourceKind?: 'assessment' | 'simulation' };
    const sourceKind = navState?.sourceKind;
    const assessmentMode = String(this.assessment()?.assessmentMode || '').toLowerCase();
    const forceEndReviewMode = sourceKind === 'simulation' || assessmentMode.includes('simulation');
    if (!programId || !assessmentId || !this.ready()) {
      return;
    }

    this.error.set('');
    this.starting.set(true);
    try {
      const session = await firstValueFrom(this.examPrep.startAttempt(programId, assessmentId));
      if (session.status === 'submitted' || session.status === 'timed_out') {
        const target = session.status === 'timed_out' ? ['../../timeout', session.attemptId] : ['../../results', session.attemptId];
        await this.router.navigate(target, { relativeTo: this.route });
        return;
      }
      await this.router.navigate(['../archer'], {
        relativeTo: this.route,
        state: { session, programId, sourceKind, forceEndReviewMode },
      });
    } catch (error) {
      this.error.set(this.examPrep.getErrorMessage(error, 'Unable to start the assessment.'));
    } finally {
      this.starting.set(false);
    }
  }
}
