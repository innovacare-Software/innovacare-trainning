/**
 * Security module — callable + Firestore trigger that powers the
 * Admin Security Center. See src/app/core/security for the matching
 * Angular client.
 */
import * as admin from "firebase-admin";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

const REGION = "us-central1";

const ALLOWED_EVENT_TYPES = new Set([
  "LOGIN_FAILED",
  "LOGIN_SUCCESS_NEW_DEVICE",
  "ADMIN_ACCESS_DENIED",
  "CROSS_TENANT_ACCESS_DENIED",
  "ROLE_CHANGE_ATTEMPT",
  "ROLE_CHANGED",
  "MEMBERSHIP_CHANGED",
  "MASS_EXPORT_ATTEMPT",
  "MASS_DOWNLOAD_ATTEMPT",
  "STRIPE_WEBHOOK_INVALID",
  "SUSPICIOUS_UPLOAD",
  "API_RATE_LIMIT_TRIGGERED",
  "PASSWORD_RESET_REQUESTED",
  "USER_SUSPENDED",
  "SECURITY_ALERT_RESOLVED",
]);

const ALLOWED_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const ALLOWED_APPS = new Set(["innovacare_review", "sygepec"]);

const FORBIDDEN_METADATA_KEYS = [
  "password",
  "pwd",
  "pass",
  "token",
  "idtoken",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "api_key",
  "secret",
  "authorization",
  "cookie",
  "stripesecret",
  "webhooksecret",
  "ssn",
  "creditcard",
  "cardnumber", "cvv", "mrn",
];

function sanitizeMetadata(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.some((f) => lower.includes(f))) {
      continue;
    }
    if (typeof v === "string" && v.length > 1024) {
      out[k] = v.slice(0, 1024) + "…[truncated]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

interface RawSecurityEventInput {
  eventType?: string;
  severity?: string;
  app?: string;
  attemptedOrgId?: string | null;
  action?: string | null;
  route?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/* ─────────── Callable: logSecurityEvent ─────────── */

export const logSecurityEvent = onCall(
  {region: REGION},
  async (request: CallableRequest<RawSecurityEventInput>) => {
    const data = request.data || {};

    if (!data.eventType || !ALLOWED_EVENT_TYPES.has(data.eventType)) {
      throw new HttpsError("invalid-argument", "Unknown eventType");
    }
    if (!data.severity || !ALLOWED_SEVERITIES.has(data.severity)) {
      throw new HttpsError("invalid-argument", "Invalid severity");
    }
    const app = data.app && ALLOWED_APPS.has(data.app) ?
      data.app :
      "innovacare_review";

    // Identify caller (anonymous events are allowed for LOGIN_FAILED only).
    const auth = request.auth;
    if (!auth && data.eventType !== "LOGIN_FAILED") {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Resolve caller profile + active org for enrichment / cross-check.
    const db = admin.firestore();
    let userEmail: string | null = null;
    let userOrgId: string | null = null;
    let role: string | null = null;
    if (auth) {
      try {
        const userDoc = await db.doc(`users/${auth.uid}`).get();
        const profile = userDoc.data() || {};
        userEmail =
          (profile.email as string) ||
          auth.token?.email ||
          null;
        userOrgId = (profile.orgId as string) || null;
        role = (profile.role as string) || null;
      } catch (err) {
        // Non-fatal — keep nulls.
      }
    }

    // Frontend cannot freely declare "critical" for events that must come
    // from server-side modules (Stripe webhook). Downgrade if mismatched.
    let severity = data.severity;
    if (data.eventType === "STRIPE_WEBHOOK_INVALID" && severity === "critical") {
      // The real critical write happens in the Stripe handler with a service
      // token — client-originated copies are downgraded.
      severity = "medium";
    }

    const ip =
      (request.rawRequest?.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.rawRequest?.socket?.remoteAddress as string) ||
      null;
    const userAgent =
      (request.rawRequest?.headers["user-agent"] as string) || null;

    const doc = {
      eventType: data.eventType,
      severity,
      app,
      userId: auth?.uid || null,
      userEmail,
      orgId: userOrgId,
      attemptedOrgId:
        typeof data.attemptedOrgId === "string" ?
          data.attemptedOrgId :
          null,
      role,
      action: typeof data.action === "string" ? data.action.slice(0, 120) : null,
      route: typeof data.route === "string" ? data.route.slice(0, 240) : null,
      resourceType:
        typeof data.resourceType === "string" ?
          data.resourceType.slice(0, 80) :
          null,
      resourceId:
        typeof data.resourceId === "string" ?
          data.resourceId.slice(0, 240) :
          null,
      ip,
      userAgent: userAgent ? userAgent.slice(0, 240) : null,
      metadata: sanitizeMetadata(data.metadata),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    };

    const ref = await db.collection("securityEvents").add(doc);
    return {ok: true, id: ref.id};
  },
);

/* ─────────── Server-internal helper ─────────── */
/**
 * Used by trusted server code (Stripe webhook, role change, etc.) to write
 * a security event without going through the callable.
 */
export async function recordServerSecurityEvent(input: {
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  app?: "innovacare_review" | "sygepec";
  userId?: string | null;
  userEmail?: string | null;
  orgId?: string | null;
  attemptedOrgId?: string | null;
  role?: string | null;
  action?: string | null;
  route?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<string> {
  if (!ALLOWED_EVENT_TYPES.has(input.eventType)) {
    throw new Error(`Unknown security eventType: ${input.eventType}`);
  }
  const db = admin.firestore();
  const ref = await db.collection("securityEvents").add({
    eventType: input.eventType,
    severity: input.severity,
    app: input.app || "innovacare_review",
    userId: input.userId || null,
    userEmail: input.userEmail || null,
    orgId: input.orgId || null,
    attemptedOrgId: input.attemptedOrgId || null,
    role: input.role || null,
    action: input.action || null,
    route: input.route || null,
    resourceType: input.resourceType || null,
    resourceId: input.resourceId || null,
    ip: input.ip || null,
    userAgent: input.userAgent || null,
    metadata: sanitizeMetadata(input.metadata),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    resolutionNote: null,
  });
  return ref.id;
}

/* ─────────── Trigger: onSecurityEventCreated → adminNotifications ─────────── */

const TITLE_BY_TYPE: Record<string, string> = {
  ADMIN_ACCESS_DENIED: "Unauthorized admin access attempt",
  CROSS_TENANT_ACCESS_DENIED: "Cross-tenant access denied",
  ROLE_CHANGE_ATTEMPT: "Role modification attempt",
  ROLE_CHANGED: "Role changed",
  STRIPE_WEBHOOK_INVALID: "Invalid Stripe webhook signature",
  SUSPICIOUS_UPLOAD: "Suspicious upload rejected",
  MASS_EXPORT_ATTEMPT: "Mass export attempt",
  MASS_DOWNLOAD_ATTEMPT: "Mass download attempt",
  USER_SUSPENDED: "User suspended",
  LOGIN_SUCCESS_NEW_DEVICE: "New device sign-in",
  LOGIN_FAILED: "Failed sign-in attempt",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  API_RATE_LIMIT_TRIGGERED: "API rate limit triggered",
  MEMBERSHIP_CHANGED: "Membership changed",
  SECURITY_ALERT_RESOLVED: "Security alert resolved",
};

export const onSecurityEventCreated = onDocumentCreated(
  {region: REGION, document: "securityEvents/{eventId}"},
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const data = snap.data() as Record<string, unknown>;
    const severity = String(data.severity || "low");
    const eventId = event.params.eventId;

    // Low/medium → audit-only, do not notify.
    if (severity !== "high" && severity !== "critical") {
      return;
    }

    const eventType = String(data.eventType || "UNKNOWN");
    const baseTitle =
      TITLE_BY_TYPE[eventType] || `Security event: ${eventType}`;
    const title =
      severity === "critical" ?
        `Critical security alert: ${baseTitle.toLowerCase()}` :
        baseTitle;

      const userPart = data.userEmail ?
        ` by ${data.userEmail}` :
        data.userId ?
          ` by ${data.userId}` :
          "";
    const orgPart = data.attemptedOrgId
      ? ` against org ${data.attemptedOrgId}`
      : data.orgId
        ? ` in org ${data.orgId}`
        : "";
    const message = `${baseTitle}${userPart}${orgPart}.`;

    const db = admin.firestore();
    await db.collection("adminNotifications").add({
      type: "security_alert",
      severity,
      title,
      message,
      app: data.app || "innovacare_review",
      organizationId: data.orgId || data.attemptedOrgId || null,
      relatedEventId: eventId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      readBy: [],
      actionRequired: severity === "critical",
      // Hooks for future expansion (email/SMS/Slack/WhatsApp).
      delivery: {
        email: false,
        sms: false,
        slack: false,
        whatsapp: false,
      },
    });
  },
);
