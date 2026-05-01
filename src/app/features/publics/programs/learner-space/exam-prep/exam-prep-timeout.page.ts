import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-exam-prep-timeout-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="timeout-shell">
      <header class="timeout-card timeout-card--headline">
        <div>
          <span class="eyebrow">Session closed</span>
          <h1>Time expired</h1>
          <p>Your secure exam window has ended. This attempt is now locked and can no longer be edited.</p>
        </div>
        <span class="timeout-badge">Attempt secured</span>
      </header>

      <div class="timeout-grid">
        <section class="timeout-card">
          <h2>What happened</h2>
          <ul>
            <li>The timer reached zero before the attempt was submitted.</li>
            <li>This delivery policy locks the session instead of reopening the exam player.</li>
            <li>The attempt reference remains recorded for audit and progress history.</li>
          </ul>
        </section>

        <section class="timeout-card timeout-card--reference">
          <h2>Attempt reference</h2>
          <p class="attempt-id">{{ attemptId() || 'Unavailable' }}</p>
          <p class="support-copy">Use this reference if you need to review the session history with support or an instructor.</p>
          <div class="actions">
            <a class="secondary-btn" [routerLink]="catalogueLink()">Return to exam catalogue</a>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(255, 191, 105, 0.18), transparent 22%),
          radial-gradient(circle at top right, rgba(218, 87, 63, 0.12), transparent 22%),
          linear-gradient(180deg, #fff7f1 0%, #f9fbff 34%, #ffffff 100%);
      }
      .timeout-shell {
        display: grid;
        gap: 1rem;
        color: #132238;
      }
      .timeout-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        gap: 1rem;
      }
      .timeout-card {
        border: 1px solid rgba(215, 222, 231, 0.92);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.94);
        padding: 1.35rem;
        box-shadow: 0 18px 42px rgba(15, 35, 58, 0.08);
        backdrop-filter: blur(6px);
      }
      .timeout-card--headline {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        background: linear-gradient(135deg, rgba(255, 219, 204, 0.85), rgba(255, 255, 255, 0.96) 45%, rgba(255, 240, 226, 0.92));
        border-color: rgba(239, 200, 186, 0.95);
      }
      .eyebrow {
        display: inline-flex;
        margin-bottom: 0.55rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #8a5131;
      }
      .timeout-badge {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        padding: 0 0.9rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(239, 200, 186, 0.95);
        color: #8a5131;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1, h2, p { margin: 0; }
      p { color: #52677f; line-height: 1.6; }
      ul {
        margin: 0.75rem 0 0;
        padding-left: 1.2rem;
        color: #42566f;
        line-height: 1.7;
      }
      .attempt-id {
        margin-top: 0.65rem;
        padding: 0.9rem 1rem;
        border-radius: 16px;
        background: linear-gradient(180deg, #fbfcfd 0%, #ffffff 100%);
        border: 1px solid #e3eaf1;
        color: #16314e;
        font-weight: 800;
        word-break: break-word;
      }
      .support-copy { margin-top: 0.75rem; }
      .actions {
        display: flex;
        justify-content: flex-start;
        margin-top: 1rem;
      }
      .secondary-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 0 1.15rem;
        border-radius: 16px;
        border: 1px solid rgba(215, 222, 231, 0.95);
        color: #17324f;
        background: rgba(255, 255, 255, 0.88);
        text-decoration: none;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 35, 58, 0.08);
      }
      @media (max-width: 900px) {
        .timeout-grid { grid-template-columns: 1fr; }
        .timeout-card--headline { flex-direction: column; }
      }
    `,
  ],
})
export class ExamPrepTimeoutPage {
  private readonly route = inject(ActivatedRoute);

  attemptId = () => this.route.snapshot.paramMap.get('attemptId') || '';

  catalogueLink(): string[] {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    return ['/my-programs', programId, 'exam-prep'];
  }
}