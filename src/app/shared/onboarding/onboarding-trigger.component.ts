import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'app-onboarding-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (vm(); as data) {
      <button type="button" class="onboarding-trigger" (click)="reopen()" aria-label="Open checklist">
        <span class="onboarding-trigger__dot">{{ data.completionPct }}%</span>
        <span class="onboarding-trigger__copy">
          <strong>Checklist</strong>
          <small>{{ data.completedCount }}/{{ data.totalCount }} done</small>
        </span>
      </button>
    }
  `,
  styles: [
    `
      .onboarding-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 40px;
        padding: 6px 12px 6px 8px;
        border-radius: 999px;
        border: 1px solid rgba(24, 184, 197, 0.18);
        color: var(--ink-900, #10233f);
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 10px 24px rgba(8, 23, 44, 0.08);
        cursor: pointer;
      }

      .onboarding-trigger__dot {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 800;
        color: #07192f;
        background: linear-gradient(135deg, #9aeaf1, #58d1f7);
      }

      .onboarding-trigger__copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.1;
      }

      .onboarding-trigger__copy strong {
        font-size: 12px;
      }

      .onboarding-trigger__copy small {
        font-size: 11px;
        color: var(--ink-600, #52657f);
      }
    `,
  ],
})
export class OnboardingTriggerComponent {
  private readonly onboarding = inject(OnboardingService);
  readonly vm = toSignal(this.onboarding.vm$, { initialValue: null });

  reopen(): void {
    this.onboarding.reopen();
  }
}
