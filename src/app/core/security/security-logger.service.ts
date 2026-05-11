import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import {
  SecurityApp,
  SecurityEventInput,
  SecurityEventType,
  sanitizeMetadata,
} from './security-event.model';

/**
 * SecurityLoggerService — best-effort, non-blocking logging facade.
 *
 * The frontend NEVER writes to /securityEvents directly. All events are sent
 * to the Cloud Functions callable `logSecurityEvent`, which:
 *   1. Re-validates the caller's identity (request.auth.uid).
 *   2. Strips sensitive metadata server-side.
 *   3. Stamps server-side timestamp/IP/userAgent.
 *   4. Triggers `onSecurityEventCreated` (alert engine).
 *
 * Failures here are swallowed so a logging glitch never blocks UX. Any error
 * is forwarded to the console for diagnostic.
 */
@Injectable({ providedIn: 'root' })
export class SecurityLoggerService {
  private readonly functions = inject(Functions);
  private readonly auth = inject(Auth);

  /** Default app identifier — flip per-build for SYGEPEC. */
  private readonly defaultApp: SecurityApp = 'innovacare_review';

  // De-duplicate identical (eventType + route + resourceId) bursts inside a
  // 5-second window so a buggy guard does not spam the alert engine.
  private readonly recent = new Map<string, number>();
  private readonly DEDUPE_WINDOW_MS = 5_000;

  /** Generic entry-point. */
  async logSecurityEvent(event: SecurityEventInput): Promise<void> {
    if (!event?.eventType || !event?.severity) {
      return;
    }
    const dedupeKey = [
      event.eventType,
      event.route ?? '',
      event.resourceId ?? '',
      event.attemptedOrgId ?? '',
    ].join('|');
    const now = Date.now();
    const last = this.recent.get(dedupeKey) ?? 0;
    if (now - last < this.DEDUPE_WINDOW_MS) {
      return;
    }
    this.recent.set(dedupeKey, now);

    try {
      const callable = httpsCallable<SecurityEventInput, { ok: boolean }>(
        this.functions,
        'logSecurityEvent',
      );
      await callable({
        ...event,
        app: event.app ?? this.defaultApp,
        metadata: sanitizeMetadata(event.metadata ?? null),
      });
    } catch (err) {
      // Never re-throw: logging must not break the user flow.
      console.warn('[SecurityLogger] failed to emit event', {
        eventType: event.eventType,
        severity: event.severity,
        error: (err as Error)?.message ?? String(err),
      });
    }
  }

  logAdminAccessDenied(ctx: {
    role?: string | null;
    route?: string | null;
    attemptedArea?: string | null;
    repeated?: boolean;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'ADMIN_ACCESS_DENIED',
      // Repeated denials escalate to critical; otherwise high.
      severity: ctx.repeated ? 'critical' : 'high',
      route: ctx.route ?? null,
      action: 'admin_area_denied',
      metadata: {
        attemptedArea: ctx.attemptedArea ?? null,
        role: ctx.role ?? null,
      },
    });
  }

  logCrossTenantDenied(ctx: {
    activeOrgId?: string | null;
    requestedOrgId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    route?: string | null;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'CROSS_TENANT_ACCESS_DENIED',
      severity: 'critical',
      attemptedOrgId: ctx.requestedOrgId ?? null,
      resourceType: ctx.resourceType ?? null,
      resourceId: ctx.resourceId ?? null,
      route: ctx.route ?? null,
      action: 'cross_tenant_blocked',
      metadata: {
        activeOrgId: ctx.activeOrgId ?? null,
      },
    });
  }

  logRoleChangeAttempt(ctx: {
    targetUserId: string;
    targetOrgId?: string | null;
    fromRole?: string | null;
    toRole?: string | null;
    authorized: boolean;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: ctx.authorized ? 'ROLE_CHANGED' : 'ROLE_CHANGE_ATTEMPT',
      severity: ctx.authorized ? 'high' : 'critical',
      attemptedOrgId: ctx.targetOrgId ?? null,
      resourceType: 'user_role',
      resourceId: ctx.targetUserId,
      action: ctx.authorized ? 'role_changed' : 'role_change_blocked',
      metadata: {
        fromRole: ctx.fromRole ?? null,
        toRole: ctx.toRole ?? null,
      },
    });
  }

  logMassExportAttempt(ctx: {
    resourceType: string;
    rowCount?: number;
    format?: 'csv' | 'pdf' | 'xlsx' | 'json';
    sensitive?: boolean;
    orgId?: string | null;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'MASS_EXPORT_ATTEMPT',
      severity: ctx.sensitive ? 'high' : 'medium',
      resourceType: ctx.resourceType,
      attemptedOrgId: ctx.orgId ?? null,
      action: 'mass_export',
      metadata: {
        rowCount: ctx.rowCount ?? null,
        format: ctx.format ?? null,
        sensitive: !!ctx.sensitive,
      },
    });
  }

  logSuspiciousUpload(ctx: {
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    reasons: string[];
    orgId?: string | null;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'SUSPICIOUS_UPLOAD',
      severity: 'high',
      resourceType: 'upload',
      resourceId: ctx.fileName,
      attemptedOrgId: ctx.orgId ?? null,
      action: 'upload_rejected',
      metadata: {
        mimeType: ctx.mimeType ?? null,
        sizeBytes: ctx.sizeBytes ?? null,
        reasons: ctx.reasons,
      },
    });
  }

  /** Server-side hook re-uses this label; client variant is unusual but allowed. */
  logInvalidStripeWebhook(ctx: {
    reason: string;
    eventId?: string;
  }): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'STRIPE_WEBHOOK_INVALID',
      severity: 'critical',
      resourceType: 'stripe_webhook',
      resourceId: ctx.eventId ?? null,
      action: 'webhook_rejected',
      metadata: { reason: ctx.reason },
    });
  }

  /** Convenience accessor used by hooks. */
  currentRoleLabel(): string | null {
    return this.auth.currentUser?.email ?? null;
  }

  /** Public helper for emitting custom event types from hooks. */
  emit(
    eventType: SecurityEventType,
    severity: SecurityEventInput['severity'],
    extras: Omit<SecurityEventInput, 'eventType' | 'severity'> = {},
  ): Promise<void> {
    return this.logSecurityEvent({ eventType, severity, ...extras });
  }
}
