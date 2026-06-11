import * as admin from "firebase-admin";
import {createEmailProviderFromEnv} from "./email-provider.factory";
import {DEFAULT_NOTIFICATION_TEMPLATES} from "./template-registry";
import {
  NotificationCategoryKey,
  NotificationEvent,
  NotificationEventType,
  NotificationPreference,
  NotificationStatus,
  NotificationTemplate,
  SendEmailInput,
} from "./models";

function db(): admin.firestore.Firestore {
  return admin.firestore();
}

const EVENTS_COLLECTION = "notificationEvents";
const TEMPLATES_COLLECTION = "notificationTemplates";
const LOGS_COLLECTION = "notificationLogs";
const PREFERENCES_COLLECTION = "notificationPreferences";

function timestampNow(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

export type CreateNotificationEventInput = {
  type: NotificationEventType;
  channels: NotificationEvent["channels"];
  priority: NotificationEvent["priority"];
  orgId?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  assessmentId?: string;
  learnerId?: string;
  instructorId?: string;
  adminId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recipientType: NotificationEvent["recipientType"];
  recipientUserId?: string;
  recipientEmail?: string;
  recipientName?: string;
  cc?: string[];
  bcc?: string[];
  templateKey: string;
  templateData: Record<string, unknown>;
  createdBy?: string;
  scheduledFor?: NotificationEvent["scheduledFor"];
  processedAt?: NotificationEvent["processedAt"];
  maxRetries: number;
  idempotencyKey?: string;
};

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => {
    const value = data[key];
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });
}

function mapCategory(type: NotificationEventType): NotificationCategoryKey {
  if (["PURCHASE_CONFIRMATION", "PAYMENT_FAILED", "PAYMENT_SUCCEEDED"].includes(type)) {
    return "purchases";
  }
  if (["LIVE_SESSION_SCHEDULED", "LIVE_SESSION_REMINDER", "LIVE_SESSION_RECORDING_AVAILABLE"].includes(type)) {
    return "liveSessions";
  }
  if (["PROOF_SUBMISSION_SUBMITTED", "PROOF_SUBMISSION_APPROVED", "PROOF_SUBMISSION_REVISION_REQUIRED", "CASE_STUDY_SUBMITTED", "DIAGNOSTIC_SUBMITTED"].includes(type)) {
    return "instructorReview";
  }
  if (["MOCK_EXAM_COMPLETED", "ASSESSMENT_SUBMITTED", "QUIZ_FAILED", "QUIZ_PASSED"].includes(type)) {
    return "assessments";
  }
  if (["LEAD_CAPTURED"].includes(type)) {
    return "marketing";
  }
  if (["SYSTEM_ERROR", "WEBHOOK_ERROR"].includes(type)) {
    return "adminAlerts";
  }
  return "courseProgress";
}

async function getPreference(userId: string): Promise<NotificationPreference | null> {
  const snap = await db().collection(PREFERENCES_COLLECTION).doc(userId).get();
  return snap.exists ? (snap.data() as NotificationPreference) : null;
}

async function shouldSkipByPreference(event: NotificationEvent): Promise<{skip: boolean; reason?: string}> {
  if (!event.recipientUserId) {
    return {skip: false};
  }

  const pref = await getPreference(event.recipientUserId);
  if (!pref) {
    return {skip: false};
  }

  if (!pref.emailEnabled) {
    return {skip: true, reason: "email_disabled"};
  }

  const category = mapCategory(event.type);
  if (category === "marketing" && pref.unsubscribedFromMarketing) {
    return {skip: true, reason: "marketing_unsubscribed"};
  }

  const enabled = pref.categories?.[category];
  if (enabled === false) {
    return {skip: true, reason: `category_disabled:${category}`};
  }

  return {skip: false};
}

async function resolveTemplate(event: NotificationEvent): Promise<NotificationTemplate | null> {
  const q = await db()
    .collection(TEMPLATES_COLLECTION)
    .where("key", "==", event.templateKey)
    .where("channel", "==", "EMAIL")
    .where("status", "==", "ACTIVE")
    .limit(1)
    .get();

  if (!q.empty) {
    return q.docs[0].data() as NotificationTemplate;
  }

  const seed = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.key === event.templateKey);
  if (!seed) {
    return null;
  }

  return {
    id: event.templateKey,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    ...seed,
  };
}

async function getRecipientEmail(event: NotificationEvent): Promise<string | null> {
  if (event.recipientEmail) {
    return event.recipientEmail;
  }
  if (event.recipientUserId) {
    const userSnap = await db().doc(`users/${event.recipientUserId}`).get();
    if (userSnap.exists) {
      const data = userSnap.data() as {email?: unknown};
      if (typeof data?.email === "string" && data.email.trim()) {
        return data.email.trim();
      }
    }
  }
  return null;
}

function buildEmailInput(event: NotificationEvent, template: NotificationTemplate): SendEmailInput {
  const subject = renderTemplate(template.subject, event.templateData);
  const html = renderTemplate(template.htmlBody, event.templateData);
  const text = template.textBody ? renderTemplate(template.textBody, event.templateData) : undefined;

  return {
    to: event.recipientEmail || "",
    toName: event.recipientName,
    cc: event.cc,
    bcc: event.bcc,
    subject,
    html,
    text,
    fromEmail: template.defaultFromEmail || process.env.NOTIFICATION_FROM_EMAIL || "no-reply@innovacarereview.com",
    fromName: template.defaultFromName || process.env.NOTIFICATION_FROM_NAME || "InnovacareReview",
    replyTo: process.env.NOTIFICATION_REPLY_TO || undefined,
  };
}

async function writeLog(input: {
  event: NotificationEvent;
  status: NotificationStatus;
  subject: string;
  recipientEmail: string;
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
}): Promise<void> {
  const logRef = db().collection(LOGS_COLLECTION).doc();
  await logRef.set({
    id: logRef.id,
    eventId: input.event.id,
    type: input.event.type,
    channel: "EMAIL",
    status: input.status,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    recipientEmail: input.recipientEmail,
    recipientUserId: input.event.recipientUserId || null,
    subject: input.subject,
    relatedEntityType: input.event.relatedEntityType || null,
    relatedEntityId: input.event.relatedEntityId || null,
    sentAt: input.status === "SENT" ? timestampNow() : null,
    failedAt: input.status === "FAILED" ? timestampNow() : null,
    errorMessage: input.errorMessage || null,
    retryCount: input.event.retryCount || 0,
    createdAt: timestampNow(),
    updatedAt: timestampNow(),
    orgId: input.event.orgId || null,
  });
}

export async function seedDefaultTemplatesIfMissing(): Promise<void> {
  const batch = db().batch();
  let hasChanges = false;

  for (const tpl of DEFAULT_NOTIFICATION_TEMPLATES) {
    const ref = db().collection(TEMPLATES_COLLECTION).doc(tpl.key);
    const snap = await ref.get();
    if (snap.exists) {
      continue;
    }

    hasChanges = true;
    batch.set(ref, {
      id: ref.id,
      ...tpl,
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
    });
  }

  if (hasChanges) {
    await batch.commit();
  }
}

/**
 * Removes all keys whose value is strictly `undefined` so Firestore does not
 * throw "Cannot use undefined as a Firestore value".
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export async function createNotificationEvent(input: CreateNotificationEventInput): Promise<{id: string; created: boolean}> {
  if (input.idempotencyKey) {
    const existing = await db()
      .collection(EVENTS_COLLECTION)
      .where("idempotencyKey", "==", input.idempotencyKey)
      .limit(1)
      .get();

    if (!existing.empty) {
      return {id: existing.docs[0].id, created: false};
    }
  }

  const ref = db().collection(EVENTS_COLLECTION).doc();
  await ref.set(stripUndefined({
    ...input,
    id: ref.id,
    status: "PENDING" as const,
    retryCount: 0,
    createdAt: timestampNow(),
    updatedAt: timestampNow(),
  }));

  return {id: ref.id, created: true};
}

export async function processNotificationEvent(eventId: string): Promise<{status: NotificationStatus; reason?: string}> {
  const ref = db().collection(EVENTS_COLLECTION).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) {
    return {status: "SKIPPED", reason: "event_not_found"};
  }

  const event = snap.data() as NotificationEvent;
  if (!event.channels?.includes("EMAIL")) {
    await ref.update({status: "SKIPPED", lastError: "email_channel_not_enabled", updatedAt: timestampNow()});
    return {status: "SKIPPED", reason: "email_channel_not_enabled"};
  }

  if (event.status === "SENT") {
    return {status: "SENT", reason: "already_sent"};
  }

  if (event.scheduledFor && event.scheduledFor instanceof admin.firestore.Timestamp) {
    if (event.scheduledFor.toMillis() > Date.now()) {
      return {status: "PENDING", reason: "scheduled_for_future"};
    }
  }

  const recipientEmail = await getRecipientEmail(event);
  if (!recipientEmail) {
    await ref.update({status: "FAILED", lastError: "missing_recipient_email", updatedAt: timestampNow()});
    return {status: "FAILED", reason: "missing_recipient_email"};
  }

  event.recipientEmail = recipientEmail;

  const pref = await shouldSkipByPreference(event);
  if (pref.skip) {
    await ref.update({status: "SKIPPED", lastError: pref.reason || "skipped_by_preference", updatedAt: timestampNow()});
    return {status: "SKIPPED", reason: pref.reason};
  }

  const template = await resolveTemplate(event);
  if (!template) {
    await ref.update({status: "FAILED", lastError: "template_not_found", updatedAt: timestampNow()});
    return {status: "FAILED", reason: "template_not_found"};
  }

  await ref.update({status: "PROCESSING", processedAt: timestampNow(), updatedAt: timestampNow()});

  const emailInput = buildEmailInput(event, template);
  const {provider, providerName, configured} = createEmailProviderFromEnv();

  if (!provider || !configured) {
    await ref.update({
      status: "FAILED",
      retryCount: admin.firestore.FieldValue.increment(1),
      lastError: `email_provider_not_configured:${providerName}`,
      updatedAt: timestampNow(),
    });

    await writeLog({
      event,
      status: "FAILED",
      recipientEmail,
      subject: emailInput.subject,
      provider: providerName,
      errorMessage: `email_provider_not_configured:${providerName}`,
    });

    return {status: "FAILED", reason: `email_provider_not_configured:${providerName}`};
  }

  const result = await provider.sendEmail(emailInput);

  if (!result.success) {
    await ref.update({
      status: "FAILED",
      retryCount: admin.firestore.FieldValue.increment(1),
      lastError: result.errorMessage || "provider_send_failed",
      updatedAt: timestampNow(),
    });

    await writeLog({
      event,
      status: "FAILED",
      recipientEmail,
      subject: emailInput.subject,
      provider: result.provider,
      errorMessage: result.errorMessage,
    });

    return {status: "FAILED", reason: result.errorMessage || "provider_send_failed"};
  }

  await ref.update({
    status: "SENT",
    processedAt: timestampNow(),
    updatedAt: timestampNow(),
    lastError: admin.firestore.FieldValue.delete(),
  });

  await writeLog({
    event,
    status: "SENT",
    recipientEmail,
    subject: emailInput.subject,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
  });

  return {status: "SENT"};
}

export async function processPendingNotifications(limit = 50): Promise<{processed: number}> {
  const snapshot = await db()
    .collection(EVENTS_COLLECTION)
    .where("status", "==", "PENDING")
    .where("channels", "array-contains", "EMAIL")
    .limit(limit)
    .get();

  let processed = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as NotificationEvent;
    if (data.scheduledFor && data.scheduledFor instanceof admin.firestore.Timestamp && data.scheduledFor.toMillis() > Date.now()) {
      continue;
    }
    await processNotificationEvent(doc.id);
    processed += 1;
  }
  return {processed};
}

export async function retryFailedNotification(eventId: string): Promise<{ok: boolean; reason?: string}> {
  const ref = db().collection(EVENTS_COLLECTION).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) {
    return {ok: false, reason: "event_not_found"};
  }

  const event = snap.data() as NotificationEvent;
  if (event.status !== "FAILED") {
    return {ok: false, reason: "event_not_failed"};
  }

  if ((event.retryCount || 0) >= (event.maxRetries || 3)) {
    return {ok: false, reason: "max_retries_reached"};
  }

  await ref.update({
    status: "PENDING",
    updatedAt: timestampNow(),
  });

  return {ok: true};
}
