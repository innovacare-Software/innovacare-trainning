import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationResult } from '../../models/lab-session.model';

@Component({
  selector: 'app-lab-validation-panel',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="validation-panel">
      <div class="validation-header">
        <span class="validation-title">✓ Validation Results</span>
        @if (results().length > 0) {
          <div class="score-badge" [class.score-badge--pass]="passed()" [class.score-badge--fail]="!passed()">
            {{ score() }} / {{ maxScore() }} pts
          </div>
        }
      </div>

      @if (results().length === 0 && !isRunning()) {
        <div class="validation-empty">
          <div class="validation-empty__icon">🔬</div>
          <p>Click <strong>Validate Lab</strong> to check your work.</p>
          <p class="hint">Each validation rule awards XP. Complete all tasks to earn full marks.</p>
        </div>
      }

      @if (isRunning()) {
        <div class="validation-running">
          <div class="validation-spinner"></div>
          <span>Running validation rules...</span>
        </div>
      }

      @if (results().length > 0 && !isRunning()) {
        <!-- Summary Banner -->
        <div class="validation-summary" [class.validation-summary--pass]="passed()" [class.validation-summary--fail]="!passed()">
          @if (passed()) {
            🎉 All validations passed! Lab {{ score() === maxScore() ? 'perfectly completed' : 'passed with partial score' }}.
          } @else {
            ⚠ {{ failCount() }} check(s) failed. Fix the issues below and re-validate.
          }
        </div>

        <!-- Result Cards -->
        <div class="result-list">
          @for (result of results(); track $index) {
            <div class="result-card" [class.result-card--pass]="result.passed" [class.result-card--fail]="!result.passed">
              <div class="result-card__header">
                <span class="result-icon">{{ result.passed ? '✓' : '✗' }}</span>
                <span class="result-file">{{ result.file }}</span>
                <span class="result-type">{{ result.ruleType }}</span>
                <span class="result-pts" [class.result-pts--earned]="result.passed">
                  +{{ result.pointsEarned }}/{{ result.points }} pts
                </span>
              </div>
              <div class="result-card__message">{{ result.message }}</div>
              @if (result.detail) {
                <div class="result-card__detail">{{ result.detail }}</div>
              }
            </div>
          }
        </div>

        <!-- Quick Actions -->
        <div class="validation-actions">
          <div class="validation-stats">
            <span class="stat-pass">✓ {{ passCount() }} passed</span>
            <span class="stat-fail">✗ {{ failCount() }} failed</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      position: absolute;
      inset: 0;
    }

    .validation-panel {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #0d1117;
      overflow: hidden;
    }

    /* ── Header ───────────────────────────────────────────────────────────── */
    .validation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #010409;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
    }
    .validation-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .score-badge {
      font-size: 0.8rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
    }
    .score-badge--pass { background: rgba(34,197,94,0.15); color: #4ade80; }
    .score-badge--fail { background: rgba(239,68,68,0.15);  color: #f87171; }

    /* ── Empty / Running ──────────────────────────────────────────────────── */
    .validation-empty, .validation-running {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #475569;
      gap: 0.5rem;
      padding: 2rem;
      text-align: center;
    }
    .validation-empty__icon { font-size: 2.5rem; }
    .validation-empty p { font-size: 0.85rem; color: #475569; margin: 0; }
    .validation-empty .hint { font-size: 0.75rem; color: #334155; }
    .validation-empty strong { color: #fbbf24; }

    .validation-running {
      flex-direction: row;
      gap: 0.75rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }
    .validation-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(99,102,241,0.3);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Summary Banner ───────────────────────────────────────────────────── */
    .validation-summary {
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .validation-summary--pass {
      background: rgba(34,197,94,0.08);
      border-bottom: 1px solid rgba(34,197,94,0.2);
      color: #4ade80;
    }
    .validation-summary--fail {
      background: rgba(245,158,11,0.08);
      border-bottom: 1px solid rgba(245,158,11,0.2);
      color: #fbbf24;
    }

    /* ── Result List ──────────────────────────────────────────────────────── */
    .result-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0.75rem;
      /* Use block layout — avoids nested-flex collapse with overflow:hidden children */
    }
    .result-list > * + * { margin-top: 0.5rem; }
    .result-list::-webkit-scrollbar { width: 6px; }
    .result-list::-webkit-scrollbar-track { background: transparent; }
    .result-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

    .result-card {
      display: block;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid;
      min-height: 3rem;   /* guarantee cards never collapse to zero */
    }
    .result-card--pass { border-color: rgba(34,197,94,0.35); background: rgba(34,197,94,0.06); }
    .result-card--fail { border-color: rgba(239,68,68,0.35);  background: rgba(239,68,68,0.06); }

    .result-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(0,0,0,0.15);
      flex-wrap: wrap;
    }
    .result-icon { font-size: 0.875rem; font-weight: 700; flex-shrink: 0; }
    .result-card--pass .result-icon { color: #4ade80; }
    .result-card--fail .result-icon { color: #f87171; }

    .result-file {
      font-size: 0.72rem;
      font-family: 'JetBrains Mono', monospace;
      color: #38bdf8;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .result-type {
      font-size: 0.65rem;
      background: rgba(255,255,255,0.05);
      color: #64748b;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .result-pts {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;   /* was #334155 — nearly invisible on dark bg */
      white-space: nowrap;
    }
    .result-pts--earned { color: #f59e0b; }

    .result-card__message {
      font-size: 0.78rem;
      color: #94a3b8;
      padding: 0.5rem 0.75rem;
      line-height: 1.5;
    }
    .result-card__detail {
      font-size: 0.72rem;
      font-family: 'JetBrains Mono', monospace;
      color: #475569;
      padding: 0 0.75rem 0.5rem;
      line-height: 1.5;
    }

    /* ── Stats Bar ────────────────────────────────────────────────────────── */
    .validation-actions {
      padding: 0.75rem 1rem;
      border-top: 1px solid #21262d;
      flex-shrink: 0;
    }
    .validation-stats { display: flex; gap: 1.5rem; }
    .stat-pass { font-size: 0.8rem; font-weight: 700; color: #4ade80; }
    .stat-fail { font-size: 0.8rem; font-weight: 700; color: #f87171; }
  `],
})
export class LabValidationPanelComponent {
  readonly results   = input<ValidationResult[]>([]);
  readonly isRunning = input(false);
  readonly score     = input(0);
  readonly maxScore  = input(0);

  readonly passed     = computed(() => this.score() >= this.maxScore() * 0.8 && this.maxScore() > 0);
  readonly passCount  = computed(() => this.results().filter((r) => r.passed).length);
  readonly failCount  = computed(() => this.results().filter((r) => !r.passed).length);
}
