import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareAnalyticsService } from '../../core/services/analytics/share-analytics.service';
import {
  ShareApp,
  SharePlatform,
  ShareSourcePage,
} from '../../core/analytics/share-event.model';

/**
 * Tiny standalone share menu — WhatsApp / Telegram / Facebook / X /
 * Email / Copy. Prefers the native Web Share API on mobile, falls back
 * to a popover with channel buttons elsewhere.
 *
 * Usage:
 *   <app-share-buttons [title]="program.title" [url]="shareUrl(program.id)"></app-share-buttons>
 */
@Component({
  selector: 'app-share-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sb-wrap" (mouseleave)="open.set(false)">
      <button
        type="button"
        class="sb-trigger"
        [class.sb-trigger--compact]="compact"
        (click)="onTriggerClick($event)"
        [attr.aria-expanded]="open()"
        aria-label="Share">
        <span class="sb-icon" aria-hidden="true">↗</span>
        <span class="sb-label" *ngIf="!compact">{{ label }}</span>
      </button>

      <div class="sb-pop" *ngIf="open()" role="menu">
        <a class="sb-item sb-item--wa" [href]="whatsappHref()" target="_blank" rel="noopener" (click)="onChannelClick('whatsapp')">
          <span class="sb-emoji" aria-hidden="true">🟢</span> WhatsApp
        </a>
        <a class="sb-item" [href]="telegramHref()" target="_blank" rel="noopener" (click)="onChannelClick('telegram')">
          <span class="sb-emoji" aria-hidden="true">✈️</span> Telegram
        </a>
        <a class="sb-item" [href]="facebookHref()" target="_blank" rel="noopener" (click)="onChannelClick('facebook')">
          <span class="sb-emoji" aria-hidden="true">📘</span> Facebook
        </a>
        <a class="sb-item" [href]="xHref()" target="_blank" rel="noopener" (click)="onChannelClick('x')">
          <span class="sb-emoji" aria-hidden="true">𝕏</span> X / Twitter
        </a>
        <a class="sb-item" [href]="linkedinHref()" target="_blank" rel="noopener" (click)="onChannelClick('linkedin')">
          <span class="sb-emoji" aria-hidden="true">💼</span> LinkedIn
        </a>
        <a class="sb-item" [href]="emailHref()" (click)="onChannelClick('email')">
          <span class="sb-emoji" aria-hidden="true">✉️</span> Email
        </a>
        <button type="button" class="sb-item sb-item--btn" (click)="copyLink()">
          <span class="sb-emoji" aria-hidden="true">🔗</span> {{ copied() ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sb-wrap { position: relative; display: inline-block; }
    .sb-trigger {
      display: inline-flex; align-items: center; gap: .35rem;
      padding: .35rem .7rem; border: 1px solid #c9d9ea; background: #fff;
      color: #1f486c; border-radius: 6px; font-weight: 600; font-size: .82rem;
      cursor: pointer; line-height: 1;
    }
    .sb-trigger:hover { background: #f1f6fb; }
    .sb-trigger--compact { padding: .3rem .45rem; }
    .sb-icon { font-size: 1rem; line-height: 1; }
    .sb-pop {
      position: absolute; right: 0; top: calc(100% + 4px); z-index: 50;
      background: #fff; border: 1px solid #d8e2ec; border-radius: 8px;
      box-shadow: 0 8px 22px rgba(20,40,60,.12); padding: .35rem; min-width: 180px;
      display: grid; gap: .15rem;
    }
    .sb-item {
      display: flex; align-items: center; gap: .55rem; padding: .45rem .65rem;
      border-radius: 6px; color: #244266; text-decoration: none; font-size: .85rem;
      background: transparent; border: none; cursor: pointer; text-align: left; font: inherit;
    }
    .sb-item:hover { background: #f4f8fb; color: #102f4f; }
    .sb-item--wa:hover { background: #e8f7ec; color: #1b6c2e; }
    .sb-emoji { width: 1.2rem; text-align: center; }
  `],
})
export class ShareButtonsComponent {
  @Input() title = '';
  @Input() url: string | null = null;
  @Input() label = 'Share';
  @Input() compact = false;

  // Analytics inputs (all optional — analytics fail silently if missing).
  @Input() app: ShareApp = 'innovacare_review';
  @Input() sourcePage: ShareSourcePage = 'programs_page';
  @Input() courseId: string | null = null;
  @Input() courseSlug: string | null = null;
  @Input() programId: string | null = null;
  @Input() programSlug: string | null = null;
  @Input() orgId: string | null = null;

  readonly open = signal(false);
  readonly copied = signal(false);

  private readonly analytics = inject(ShareAnalyticsService);

  private resolvedUrl(): string {
    const u = (this.url || '').trim();
    if (u) {
      if (/^https?:\/\//i.test(u)) return u;
      try {
        return new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://innovacare-stripe.web.app').toString();
      } catch {
        return u;
      }
    }
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  private message(): string {
    const t = (this.title || '').trim();
    const u = this.resolvedUrl();
    return t ? `${t} — ${u}` : u;
  }

  whatsappHref(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.message())}`;
  }
  telegramHref(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(this.resolvedUrl())}&text=${encodeURIComponent(this.title || '')}`;
  }
  facebookHref(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.resolvedUrl())}`;
  }
  xHref(): string {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.resolvedUrl())}&text=${encodeURIComponent(this.title || '')}`;
  }
  linkedinHref(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.resolvedUrl())}`;
  }
  emailHref(): string {
    const subject = encodeURIComponent(this.title || 'Innovacare');
    const body = encodeURIComponent(this.message());
    return `mailto:?subject=${subject}&body=${body}`;
  }

  async onTriggerClick(ev: MouseEvent): Promise<void> {
    ev.stopPropagation();
    // Try the native share sheet first (best UX on mobile + signed PWAs).
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      // Track BEFORE opening the native share sheet (per spec).
      this.track('native_share');
      try {
        await nav.share({ title: this.title || 'Innovacare', url: this.resolvedUrl(), text: this.title || '' });
        return;
      } catch { /* user cancelled — fall through to popover */ }
    }
    this.open.update((v) => !v);
  }

  onChannelClick(platform: SharePlatform): void {
    this.track(platform);
    this.open.set(false);
  }

  async copyLink(): Promise<void> {
    this.track('copy');
    try {
      await navigator.clipboard.writeText(this.resolvedUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }

  private track(platform: SharePlatform): void {
    this.analytics.trackShare({
      app: this.app,
      platform,
      sourcePage: this.sourcePage,
      sharedUrl: this.resolvedUrl(),
      courseId: this.courseId,
      courseSlug: this.courseSlug,
      programId: this.programId,
      programSlug: this.programSlug,
      orgId: this.orgId,
    });
  }
}
