import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  processNotificationEvent,
  processPendingNotifications,
  retryFailedNotification,
  seedDefaultTemplatesIfMissing,
} from "./service";

const REGION = "us-central1";

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
