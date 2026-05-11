import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  serverTimestamp,
} from '@angular/fire/firestore';
import { OrgContext, OrgContextService } from '../../organization/org-context.service';
import {
  ShareApp,
  ShareDeviceType,
  ShareEvent,
  SharePlatform,
  ShareSourcePage,
} from '../../analytics/share-event.model';

export interface TrackShareInput {
  app: ShareApp;
  platform: SharePlatform;
  sourcePage: ShareSourcePage;
  sharedUrl: string;

  courseId?: string | null;
  courseSlug?: string | null;
  programId?: string | null;
  programSlug?: string | null;
  orgId?: string | null;
}

const DEDUP_WINDOW_MS = 30_000;

/**
 * Fire-and-forget analytics for share-button clicks. Never throws — failures
 * are swallowed so they cannot break the share UX. Light client-side
 * deduplication prevents accidental double-fires when the user clicks twice.
 */
@Injectable({ providedIn: 'root' })
export class ShareAnalyticsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly orgCtx = inject(OrgContextService);

  /** Last-fire timestamp keyed by `${userId}|${platform}|${sharedUrl}`. */
  private readonly recentFires = new Map<string, number>();

  /** Cached latest org context for synchronous reads in trackShare. */
  private latestCtx: OrgContext | null = null;

  constructor() {
    // Keep a snapshot of the latest org context so trackShare stays sync.
    this.orgCtx.context$.subscribe((c) => {
      this.latestCtx = c;
    });
  }

  trackShare(input: TrackShareInput): void {
    try {
      const userId = this.auth.currentUser?.uid ?? null;
      const dedupKey = `${userId ?? 'anon'}|${input.platform}|${input.sharedUrl}`;
      const now = Date.now();
      const last = this.recentFires.get(dedupKey);
      if (last && now - last < DEDUP_WINDOW_MS) {
        return;
      }
      this.recentFires.set(dedupKey, now);
      // Best-effort cleanup so the map does not grow unbounded.
      if (this.recentFires.size > 200) {
        for (const [k, v] of this.recentFires) {
          if (now - v > DEDUP_WINDOW_MS) this.recentFires.delete(k);
        }
      }

      const ctx = this.latestCtx;
      const payload = this.sanitizeSharePayload({
        app: input.app,
        platform: input.platform,
        sourcePage: input.sourcePage,
        sharedUrl: input.sharedUrl,
        courseId: input.courseId ?? null,
        courseSlug: input.courseSlug ?? null,
        programId: input.programId ?? null,
        programSlug: input.programSlug ?? null,
        orgId: input.orgId ?? ctx?.activeOrgId ?? null,
        userId,
        userRole: ctx?.role || null,
        deviceType: this.detectDeviceType(),
        createdAt: serverTimestamp(),
      });

      const ref = collection(this.firestore, 'shareEvents');
      // Fire-and-forget: do NOT await.
      addDoc(ref, payload as any).catch(() => {
        /* swallow — analytics must never break UX */
      });
    } catch {
      /* swallow — analytics must never break UX */
    }
  }

  detectDeviceType(): ShareDeviceType {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return 'desktop';
    }
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobi|iphone|ipod|android.*mobi|blackberry|opera mini|iemobile/i.test(ua)) {
      return 'mobile';
    }
    // Viewport fallback
    const w = window.innerWidth || 0;
    if (w > 0 && w <= 600) return 'mobile';
    if (w > 600 && w <= 1024) return 'tablet';
    return 'desktop';
  }

  private sanitizeSharePayload(raw: Partial<ShareEvent>): ShareEvent {
    const stripQuery = (u: string): string => {
      try {
        const url = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://innovacare-stripe.web.app');
        // Preserve only the path + a small allow-list of utm tags. Everything
        // else (auth tokens, session ids, PII in query) is dropped.
        const ALLOW = new Set(['utm_source', 'utm_medium', 'utm_campaign']);
        const params = new URLSearchParams();
        url.searchParams.forEach((v, k) => {
          if (ALLOW.has(k.toLowerCase())) params.set(k, v.slice(0, 80));
        });
        url.search = params.toString();
        url.hash = '';
        return url.toString().slice(0, 500);
      } catch {
        return (u || '').slice(0, 500);
      }
    };

    const trim = (s: string | null | undefined, n = 120): string | null => {
      if (s == null) return null;
      const t = String(s).trim();
      return t ? t.slice(0, n) : null;
    };

    const out: ShareEvent = {
      app: raw.app!,
      platform: raw.platform!,
      sourcePage: raw.sourcePage!,
      sharedUrl: stripQuery(raw.sharedUrl || ''),
      deviceType: raw.deviceType,
      createdAt: raw.createdAt,
      courseId: trim(raw.courseId),
      courseSlug: trim(raw.courseSlug),
      programId: trim(raw.programId),
      programSlug: trim(raw.programSlug),
      orgId: trim(raw.orgId),
      userId: trim(raw.userId, 200),
      userRole: trim(raw.userRole, 60),
    };

    // Drop nulls so the doc stays compact (Firestore stores nulls otherwise).
    Object.keys(out).forEach((k) => {
      if ((out as any)[k] === null || (out as any)[k] === undefined) {
        delete (out as any)[k];
      }
    });
    return out;
  }
}
