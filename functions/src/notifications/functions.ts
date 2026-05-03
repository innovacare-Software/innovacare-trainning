import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {emitNotificationEvent} from "./events";
import {
  processNotificationEvent,
  processPendingNotifications,
  retryFailedNotification,
  seedDefaultTemplatesIfMissing,
} from "./service";

const REGION = "us-central1";

function mapRecipientType(roleValue: unknown): "LEARNER" | "INSTRUCTOR" | "ADMIN" | "OWNER" {
  const role = String(roleValue || "").trim().toLowerCase();
  if (role === "instructor") {
    return "INSTRUCTOR";
  }
  if (role === "owner" || role === "super_admin") {
    return "OWNER";
  }
  if (role === "admin" || role === "manager") {
    return "ADMIN";
  }
  return "LEARNER";
}

function hasTimestampLike(value: unknown): boolean {
  return !!value;
}

export const onNotificationEventCreated = onDocumentCreated(
  {
    region: REGION,
    document: "notificationEvents/{eventId}",
  },
  async (event) => {
    const eventId = event.params.eventId;
    if (!eventId) {
      return;
    }
    await seedDefaultTemplatesIfMissing();
    await processNotificationEvent(eventId);
  }
);

export const processScheduledNotifications = onSchedule(
  {
    region: REGION,
    schedule: "every 5 minutes",
    timeZone: "UTC",
  },
  async () => {
    await seedDefaultTemplatesIfMissing();
    await processPendingNotifications(100);
  }
);

export const onUserProfileWritten = onDocumentWritten(
  {
    region: REGION,
    document: "users/{uid}",
  },
  async (event) => {
    const uid = String(event.params.uid || "").trim();
    if (!uid) {
      return;
    }

    const beforeData = event.data?.before?.data() as Record<string, unknown> | undefined;
    const afterData = event.data?.after?.data() as Record<string, unknown> | undefined;

    if (!afterData) {
      return;
    }

    const recipientType = mapRecipientType(afterData.role);
    const orgId = String(afterData.orgId || "").trim() || null;
    const learnerName = String(afterData.displayName || "").trim() || "there";
    const appOrigin = String(process.env.APP_ORIGIN || "https://www.innovacarereview.com").trim();

    if (!beforeData) {
      await emitNotificationEvent({
        type: "ACCOUNT_CREATED",
        templateKey: "account_created_welcome",
        recipientType,
        recipientUserId: uid,
        orgId,
        relatedEntityType: "user",
        relatedEntityId: uid,
        idempotencyKey: `account_created:${uid}`,
        templateData: {
          learnerName,
          ctaUrl: `${appOrigin}/login`,
        },
      });
      return;
    }

    const hadLastLogin = hasTimestampLike(beforeData.lastLoginAt);
    const hasLastLoginNow = hasTimestampLike(afterData.lastLoginAt);

    if (!hadLastLogin && hasLastLoginNow) {
      await emitNotificationEvent({
        type: "FIRST_LOGIN",
        templateKey: "first_login_welcome",
        recipientType,
        recipientUserId: uid,
        orgId,
        relatedEntityType: "user",
        relatedEntityId: uid,
        idempotencyKey: `first_login:${uid}`,
        templateData: {
          learnerName,
          ctaUrl: `${appOrigin}/`,
        },
      });
    }
  }
);

export const retryNotificationEvent = onCall({region: REGION}, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const eventId = String(request.data?.eventId || "").trim();
  if (!eventId) {
    throw new HttpsError("invalid-argument", "eventId is required");
  }

  const result = await retryFailedNotification(eventId);
  if (!result.ok) {
    throw new HttpsError("failed-precondition", result.reason || "Retry not allowed");
  }

  await processNotificationEvent(eventId);
  return {ok: true};
});
