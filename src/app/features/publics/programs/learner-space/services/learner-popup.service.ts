/**
 * LearnerPopupService
 *
 * Signal-based popup trigger system. Any component in the learner space
 * can call `show(config)` to display a contextual popup rendered by the
 * LearnerSpaceShellComponent.
 *
 * Usage:
 *   const popup = inject(LearnerPopupService);
 *   popup.show({ type: 'motivation', title: '...', message: '...' });
 */
import { Injectable, signal } from '@angular/core';

export type PopupType = 'upsell' | 'reminder' | 'motivation' | 'milestone';

export interface PopupConfig {
  type: PopupType;
  title: string;
  message: string;
  cta?: {
    label: string;
    link?: string;
    action?: () => void;
  };
  /** Auto-dismiss delay in ms. Default: 0 (manual dismiss only) */
  autoDismissMs?: number;
  /** Emoji/icon shown in the popup header */
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class LearnerPopupService {
  readonly current = signal<PopupConfig | null>(null);

  private dismissTimer?: ReturnType<typeof setTimeout>;

  show(config: PopupConfig): void {
    clearTimeout(this.dismissTimer);
    this.current.set(config);
    if (config.autoDismissMs && config.autoDismissMs > 0) {
      this.dismissTimer = setTimeout(() => this.dismiss(), config.autoDismissMs);
    }
  }

  dismiss(): void {
    clearTimeout(this.dismissTimer);
    this.current.set(null);
  }

  // ─── Convenience helpers ─────────────────────────────────────────────────

  showMotivation(readinessPct: number): void {
    this.show({
      type: 'motivation',
      icon: '🔥',
      title: "You're closer than you think!",
      message: `You're at ${readinessPct}% readiness. Just a little more consistency and you'll be exam-ready. Keep pushing!`,
      autoDismissMs: 6000,
    });
  }

  showMilestone(pct: number): void {
    this.show({
      type: 'milestone',
      icon: '🎉',
      title: `${pct}% Complete!`,
      message: `Amazing progress! You've completed ${pct}% of your program. Every lesson brings you closer to passing.`,
      autoDismissMs: 5000,
    });
  }

  showStudyReminder(): void {
    this.show({
      type: 'reminder',
      icon: '📅',
      title: "Time to get back on track!",
      message: "You haven't studied in a while. Even 15 minutes today can keep your momentum going. Let's do this!",
      cta: { label: 'Resume Learning', link: 'modules' },
    });
  }

  showUpsell(productName: string, offerText: string): void {
    this.show({
      type: 'upsell',
      icon: '⚡',
      title: `Boost your chances with ${productName}`,
      message: offerText,
      cta: { label: 'View Offer', link: '/programs' },
    });
  }
}
