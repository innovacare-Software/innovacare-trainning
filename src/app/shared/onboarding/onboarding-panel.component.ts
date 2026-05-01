import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'app-onboarding-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (vm(); as data) {
      @if (!data.isHidden) {
        @if (data.isMinimized) {
          <div class="onboarding-launcher-wrap">
            <button type="button" class="onboarding-launcher" (click)="reopen()" aria-label="Reopen onboarding">
              <span class="onboarding-launcher__badge">{{ data.completionPct }}%</span>
              <span class="onboarding-launcher__label">
                {{ data.isCompleted ? 'Checklist completed' : 'Continue onboarding' }}
              </span>
            </button>
            @if (data.isCompleted) {
              <button type="button" class="onboarding-launcher__close" (click)="dismiss($event)" aria-label="Close completed checklist">
                ×
              </button>
            }
          </div>
        } @else {
          <aside class="onboarding-panel" aria-label="Quick start checklist">
            <div class="onboarding-panel__glow"></div>
            <header class="onboarding-panel__header">
              <div>
                <span class="onboarding-panel__eyebrow">{{ data.roleLabel }} onboarding</span>
                <h2>{{ data.title }}</h2>
                <p>{{ data.subtitle }}</p>
              </div>
              <div class="onboarding-panel__header-actions">
                <button type="button" class="onboarding-panel__dismiss" (click)="minimize()" aria-label="Minimize onboarding">
                  Minimize
                </button>
                <button type="button" class="onboarding-panel__dismiss" (click)="dismiss()" [attr.aria-label]="data.isCompleted ? 'Close onboarding' : 'Dismiss onboarding'">
                  {{ data.isCompleted ? 'Close' : 'Later' }}
                </button>
              </div>
            </header>

            <section class="onboarding-panel__progress" aria-label="Onboarding progress">
              <div class="onboarding-panel__progress-meta">
                <strong>{{ data.completionPct }}%</strong>
                <span>{{ data.completedCount }}/{{ data.totalCount }} complete</span>
              </div>
              <div class="onboarding-panel__track">
                <div class="onboarding-panel__bar" [style.width.%]="data.completionPct"></div>
              </div>
            </section>

            <div class="onboarding-panel__steps">
              @for (step of data.steps; track step.id; let index = $index) {
                <article class="onboarding-step" [class.onboarding-step--done]="step.completed">
                  <div class="onboarding-step__status">{{ step.completed ? '✓' : index + 1 }}</div>
                  <div class="onboarding-step__body">
                    <h3>{{ step.title }}</h3>
                    <p>{{ step.description }}</p>
                    <div class="onboarding-step__actions">
                      @if (!step.completed) {
                        <a [routerLink]="step.route" class="onboarding-step__link">{{ step.actionLabel }}</a>
                        <button type="button" class="onboarding-step__ghost" (click)="completeStep(step.id)">
                          Mark done
                        </button>
                      } @else {
                        <span class="onboarding-step__done">Completed</span>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>

            <footer class="onboarding-panel__footer">
              @if (data.nextStep && !data.allCompleted) {
                <a [routerLink]="data.nextStep.route" class="onboarding-panel__cta">Continue with {{ data.nextStep.title }}</a>
              }
              @if (data.allCompleted) {
                <div class="onboarding-panel__completed-actions">
                  <button type="button" class="onboarding-panel__cta" (click)="completeAll()">Archive checklist</button>
                  <button type="button" class="onboarding-panel__dismiss" (click)="dismiss()">Close</button>
                </div>
              }
            </footer>
          </aside>
        }
      }
    }
  `,
  styles: [
    `
      .onboarding-launcher-wrap {
        position: fixed;
        left: 20px;
        bottom: 20px;
        z-index: 40;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .onboarding-launcher {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 56px;
        padding: 10px 16px 10px 10px;
        border: 1px solid rgba(154, 234, 241, 0.24);
        border-radius: 999px;
        color: #10233f;
        cursor: pointer;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(243, 249, 252, 0.96));
        box-shadow: 0 22px 50px rgba(7, 25, 47, 0.14);
      }

      .onboarding-launcher__badge {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-weight: 800;
        color: #07192f;
        background: #9aeaf1;
      }

      .onboarding-launcher__label {
        font-weight: 700;
        white-space: nowrap;
      }

      .onboarding-launcher__close {
        display: inline-grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(16, 35, 63, 0.1);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.96);
        color: #10233f;
        cursor: pointer;
        box-shadow: 0 14px 32px rgba(7, 25, 47, 0.12);
      }

      .onboarding-panel {
        position: fixed;
        left: 20px;
        bottom: 20px;
        z-index: 40;
        width: min(380px, calc(100vw - 24px));
        padding: 20px;
        border-radius: 24px;
        background:
          radial-gradient(circle at top left, rgba(88, 209, 247, 0.18), transparent 34%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(243, 249, 252, 0.94));
        color: #10233f;
        border: 1px solid rgba(16, 35, 63, 0.1);
        box-shadow: 0 28px 60px rgba(7, 25, 47, 0.16);
        overflow: hidden;
        backdrop-filter: blur(16px);
      }

      .onboarding-panel__glow {
        position: absolute;
        inset: auto -60px -90px auto;
        width: 180px;
        height: 180px;
        background: radial-gradient(circle, rgba(88, 209, 247, 0.28), transparent 68%);
        pointer-events: none;
      }

      .onboarding-panel__header,
      .onboarding-panel__progress,
      .onboarding-panel__footer,
      .onboarding-step {
        position: relative;
        z-index: 1;
      }

      .onboarding-panel__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .onboarding-panel__header-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .onboarding-panel__eyebrow {
        display: inline-flex;
        margin-bottom: 8px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #0f4377;
        background: rgba(88, 209, 247, 0.14);
      }

      .onboarding-panel h2 {
        margin: 0;
        font: 700 22px/1.2 var(--font-display);
      }

      .onboarding-panel p {
        margin: 8px 0 0;
        color: rgba(16, 35, 63, 0.72);
        line-height: 1.5;
      }

      .onboarding-panel__dismiss,
      .onboarding-step__ghost {
        border: 0;
        border-radius: 999px;
        padding: 9px 12px;
        cursor: pointer;
        color: #16304f;
        background: rgba(16, 35, 63, 0.05);
      }

      .onboarding-panel__progress {
        padding: 14px 16px;
        margin-bottom: 16px;
        border-radius: 18px;
        background: rgba(16, 35, 63, 0.04);
      }

      .onboarding-panel__progress-meta {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .onboarding-panel__progress-meta strong {
        font-size: 24px;
      }

      .onboarding-panel__progress-meta span {
        font-size: 13px;
        color: rgba(16, 35, 63, 0.64);
      }

      .onboarding-panel__track {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: rgba(16, 35, 63, 0.08);
        overflow: hidden;
      }

      .onboarding-panel__bar {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #58d1f7, #18b8c5);
      }

      .onboarding-panel__steps {
        display: grid;
        gap: 12px;
      }

      .onboarding-step {
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 12px;
        align-items: start;
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(16, 35, 63, 0.06);
      }

      .onboarding-step--done {
        background: rgba(40, 199, 111, 0.12);
      }

      .onboarding-step__status {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-weight: 800;
        color: #07192f;
        background: #9aeaf1;
      }

      .onboarding-step--done .onboarding-step__status {
        color: #f3fff8;
        background: #28c76f;
      }

      .onboarding-step__body h3 {
        margin: 0;
        font-size: 15px;
      }

      .onboarding-step__body p {
        margin: 6px 0 10px;
        font-size: 13px;
      }

      .onboarding-step__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .onboarding-step__link,
      .onboarding-step__done,
      .onboarding-panel__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        text-decoration: none;
      }

      .onboarding-step__link,
      .onboarding-panel__cta {
        font-weight: 700;
        color: #07192f;
        background: #9aeaf1;
      }

      .onboarding-step__done {
        font-size: 12px;
        font-weight: 700;
        color: #157347;
        background: rgba(40, 199, 111, 0.16);
      }

      .onboarding-panel__footer {
        display: flex;
        justify-content: flex-start;
        margin-top: 16px;
      }

      .onboarding-panel__completed-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        width: 100%;
      }

      @media (max-width: 720px) {
        .onboarding-launcher-wrap {
          left: 12px;
          bottom: 12px;
          right: 12px;
        }

        .onboarding-launcher {
          justify-content: center;
          flex: 1 1 auto;
        }

        .onboarding-panel {
          left: 12px;
          right: 12px;
          bottom: 12px;
          width: auto;
          max-height: min(78vh, 680px);
          overflow: auto;
        }

        .onboarding-panel__header {
          flex-direction: column;
        }

        .onboarding-panel__dismiss {
          align-self: flex-start;
        }
      }
    `,
  ],
})
export class OnboardingPanelComponent {
  private readonly service = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vm = toSignal(this.service.vm$, { initialValue: null });

  constructor() {
    this.service.trackRoute(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.service.trackRoute(event.urlAfterRedirects);
      });
  }

  completeStep(stepId: string): void {
    this.service.completeStep(stepId);
  }

  dismiss(event?: Event): void {
    event?.stopPropagation();
    this.service.dismiss();
  }

  completeAll(): void {
    this.service.completeAll();
  }

  reopen(): void {
    this.service.reopen();
  }

  minimize(): void {
    this.service.minimize();
  }
}