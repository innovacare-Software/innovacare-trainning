import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LabSession } from '../../models/lab-session.model';
import { LabDefinition } from '../../models/lab-definition.model';
import { LabWorkspaceService } from '../../services/lab-workspace.service';

@Component({
  selector: 'app-lab-header',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="lab-header">
      <div class="lab-header__left">
        <a class="lab-header__back" [href]="backUrl()" title="Back to labs">← Labs</a>
        <div class="lab-header__info">
          <span class="lab-header__title">{{ lab()?.title }}</span>
          <span class="lab-header__difficulty badge--{{ lab()?.difficulty }}">
            {{ lab()?.difficulty | uppercase }}
          </span>
        </div>
      </div>

      <div class="lab-header__center">
        <div class="lab-header__timer" [class.timer--warning]="elapsedSeconds() > warningThreshold()">
          ⏱ {{ formattedTime() }}
        </div>
        <div class="lab-header__xp">
          <span class="xp-badge">⚡ {{ session()?.score ?? 0 }} / {{ session()?.maxScore ?? lab()?.xp }} XP</span>
        </div>
        <div class="lab-header__progress">
          <div class="progress-bar">
            <div class="progress-bar__fill" [style.width.%]="session()?.progressPercent ?? 0"></div>
          </div>
          <span class="progress-label">{{ session()?.progressPercent ?? 0 | number:'1.0-0' }}%</span>
        </div>
      </div>

      <div class="lab-header__actions">
        <button class="action-btn action-btn--ghost"
          [disabled]="workspace.saveStatus() === 'saving'"
          (click)="onSave.emit()"
          id="lab-save-btn">
          @if (workspace.saveStatus() === 'saving') { ⟳ Saving... } @else { 💾 Save }
        </button>

        <button class="action-btn action-btn--warning"
          (click)="onValidate.emit()"
          id="lab-validate-btn">
          ✓ Validate Lab
        </button>

        <button class="action-btn action-btn--primary"
          (click)="onSubmit.emit()"
          [disabled]="isSubmitted() || isSubmitting()"
          id="lab-submit-btn">
          @if (isSubmitting()) { ⟳ Submitting... } @else { 🚀 Submit Lab }
        </button>
      </div>
    </header>
  `,
  styles: [`
    .lab-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 1.25rem;
      height: 54px;
      background: #0d1117;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
      z-index: 100;
      flex-wrap: wrap;
    }
    .lab-header__left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
    .lab-header__back {
      color: #6366f1;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      border: 1px solid rgba(99,102,241,0.3);
      transition: all 0.15s;
    }
    .lab-header__back:hover { background: rgba(99,102,241,0.1); }
    .lab-header__info { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .lab-header__title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .lab-header__difficulty {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge--beginner     { background: rgba(34,197,94,0.15);  color: #4ade80; }
    .badge--intermediate { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .badge--advanced     { background: rgba(239,68,68,0.15);  color: #f87171; }
    .badge--enterprise   { background: rgba(139,92,246,0.15); color: #c4b5fd; }

    .lab-header__center {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex: 1;
      justify-content: center;
    }
    .lab-header__timer {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.85rem;
      color: #94a3b8;
      background: rgba(255,255,255,0.05);
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      white-space: nowrap;
    }
    .timer--warning { color: #f59e0b; }
    .xp-badge {
      font-size: 0.8rem;
      color: #f59e0b;
      font-weight: 700;
      white-space: nowrap;
    }
    .lab-header__progress { display: flex; align-items: center; gap: 0.5rem; }
    .progress-bar {
      width: 80px;
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 100px;
      overflow: hidden;
    }
    .progress-bar__fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 100px;
      transition: width 0.5s ease;
    }
    .progress-label { font-size: 0.75rem; color: #64748b; white-space: nowrap; }

    .lab-header__actions { display: flex; align-items: center; gap: 0.5rem; }
    .action-btn {
      padding: 0.4rem 0.9rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn--ghost {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
    }
    .action-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #e2e8f0; }
    .action-btn--warning {
      background: rgba(245,158,11,0.15);
      border: 1px solid rgba(245,158,11,0.3);
      color: #fbbf24;
    }
    .action-btn--warning:hover { background: rgba(245,158,11,0.25); }
    .action-btn--primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }
    .action-btn--primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 2px 12px rgba(99,102,241,0.4);
    }
  `],
})
export class LabHeaderComponent implements OnInit, OnDestroy {
  readonly lab     = input<LabDefinition | null>(null);
  readonly session = input<LabSession | null>(null);
  /** URL for the back-to-labs link. Defaults to /labs for catalog-free contexts. */
  readonly backUrl  = input<string>('/labs');

  readonly onSave     = output<void>();
  readonly onValidate = output<void>();
  readonly onSubmit   = output<void>();

  /** C-11 fix: passed from player to disable submit button during in-flight submission */
  readonly isSubmitting = input<boolean>(false);

  readonly workspace = inject(LabWorkspaceService);

  readonly elapsedSeconds = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly warningThreshold = computed(() => (this.lab()?.estimatedMinutes ?? 60) * 60);
  readonly formattedTime    = computed(() => this.hms(this.elapsedSeconds()));
  readonly isSubmitted      = computed(() =>
    ['SUBMITTED', 'PASSED', 'FAILED'].includes(this.session()?.status ?? ''),
  );

  ngOnInit(): void {
    this.timer = setInterval(() => this.elapsedSeconds.update((s) => s + 1), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private hms(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return [h, m, r].map((v) => String(v).padStart(2, '0')).join(':');
  }
}
