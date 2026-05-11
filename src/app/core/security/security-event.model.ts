/**
 * Security Event domain model — shared between Innovacare Review and SYGEPEC.
 *
 * SECURITY: events with severity "high" or "critical" MUST be created through
 * the Cloud Functions callable `logSecurityEvent` (or by trusted server code),
 * never written directly from the browser. Firestore rules enforce this.
 */

export type SecurityEventType =
  | 'LOGIN_FAILED'
  | 'LOGIN_SUCCESS_NEW_DEVICE'
  | 'ADMIN_ACCESS_DENIED'
  | 'CROSS_TENANT_ACCESS_DENIED'
  | 'ROLE_CHANGE_ATTEMPT'
  | 'ROLE_CHANGED'
  | 'MEMBERSHIP_CHANGED'
  | 'MASS_EXPORT_ATTEMPT'
  | 'MASS_DOWNLOAD_ATTEMPT'
  | 'STRIPE_WEBHOOK_INVALID'
  | 'SUSPICIOUS_UPLOAD'
  | 'API_RATE_LIMIT_TRIGGERED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'USER_SUSPENDED'
  | 'SECURITY_ALERT_RESOLVED';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityApp = 'innovacare_review' | 'sygepec';

export interface SecurityEvent {
  id?: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  app: SecurityApp;
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
  timestamp: unknown; // Firestore Timestamp (server-set)
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: unknown;
  resolutionNote?: string | null;
}

/** Subset accepted from clients (server enriches the rest). */
export interface SecurityEventInput {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  app?: SecurityApp;
  attemptedOrgId?: string | null;
  action?: string | null;
  route?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Fields we will NEVER persist or surface (PII/secret leak guard). */
export const FORBIDDEN_METADATA_KEYS: ReadonlyArray<string> = [
  'password',
  'pwd',
  'pass',
  'token',
  'idToken',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'stripeSecret',
  'webhookSecret',
  'ssn',
  'creditCard',
  'cardNumber',
  'cvv',
  'mrn', // medical record number (PHI)
];

/**
 * Returns a copy of the metadata stripped of any forbidden key (defence in
 * depth — server applies the same filter).
 */
export function sanitizeMetadata(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.some((forbidden) => lower.includes(forbidden.toLowerCase()))) {
      continue;
    }
    if (typeof value === 'string' && value.length > 1024) {
      out[key] = value.slice(0, 1024) + '…[truncated]';
    } else {
      out[key] = value;
    }
  }
  return out;
}
