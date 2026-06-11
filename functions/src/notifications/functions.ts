import * as admin from "firebase-admin";
import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import {emitNotificationEvent} from "./events";
import {SendgridEmailProvider} from "./sendgrid-email-provider";
import {TwilioSmsProvider} from "./twilio-sms-provider";
import {
  processNotificationEvent,
  processPendingNotifications,
  retryFailedNotification,
  seedDefaultTemplatesIfMissing,
} from "./service";

const REGION = "us-central1";
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = defineSecret("TWILIO_FROM_NUMBER");

function db(): admin.firestore.Firestore {
  return admin.firestore();
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => {
    const value = data[key];
    return value == null ? "" : String(value);
  });
}

function liveSendSafety() {
  return {
    mode: "live_send",
    mockOnly: false,
    approvalRequired: true,
    provider: "sendgrid",
    canAutoSend: true,
  };
}

function defaultFromEmail(): string {
  return String(process.env.NOTIFICATION_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "no-reply@innovacarereview.com").trim() || "no-reply@innovacarereview.com";
}

function defaultFromName(): string {
  return String(process.env.NOTIFICATION_FROM_NAME || "Innovacare Review").trim() || "Innovacare Review";
}

function getSendgridProvider(): SendgridEmailProvider {
  const apiKey = String(SENDGRID_API_KEY.value() || "").trim();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "SENDGRID_API_KEY is not configured.");
  }
  return new SendgridEmailProvider(apiKey);
}

function getTwilioProvider(): TwilioSmsProvider {
  const accountSid = String(TWILIO_ACCOUNT_SID.value() || "").trim();
  const authToken = String(TWILIO_AUTH_TOKEN.value() || "").trim();
  if (!accountSid || !authToken) {
    throw new HttpsError("failed-precondition", "Twilio credentials are not configured.");
  }
  return new TwilioSmsProvider(accountSid, authToken);
}

function defaultFromSmsNumber(): string {
  return String(TWILIO_FROM_NUMBER.value() || process.env.TWILIO_FROM_NUMBER || "InnovaCare").trim() || "InnovaCare";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function assertCommunicationAccess(uid: string, orgId: string): Promise<void> {
  const userSnap = await db().doc(`users/${uid}`).get();
  const role = String(userSnap.data()?.role || "").trim().toLowerCase();
  if (role === "super_admin") {
    return;
  }

  const membershipSnap = await db().doc(`userOrgMemberships/${uid}__${orgId}`).get();
  const membership = membershipSnap.data() as {role?: string; status?: string} | undefined;
  const membershipRole = String(membership?.role || "").trim();
  const membershipStatus = String(membership?.status || "").trim();
  if (membershipStatus !== "active" || !(membershipRole === "org_admin" || membershipRole === "program_admin")) {
    throw new HttpsError("permission-denied", "Active org_admin/program_admin membership required.");
  }
}

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

export const sendCommunicationTestEmail = onCall(
  {region: REGION, secrets: [SENDGRID_API_KEY]},
  async (request) => {
    const uid = String(request.auth?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const orgId = String(request.data?.orgId || "").trim();
    const newsletterId = String(request.data?.newsletterId || "").trim();
    const requestedEmail = String(request.data?.toEmail || "").trim();
    if (!orgId || !newsletterId) {
      throw new HttpsError("invalid-argument", "orgId and newsletterId are required");
    }

    await assertCommunicationAccess(uid, orgId);

    const [newsletterSnap, userSnap] = await Promise.all([
      db().doc(`newsletters/${newsletterId}`).get(),
      db().doc(`users/${uid}`).get(),
    ]);
    if (!newsletterSnap.exists) {
      throw new HttpsError("not-found", "Newsletter not found");
    }

    const newsletter = newsletterSnap.data() as {
      orgId?: string;
      title?: string;
      subject?: string;
      previewText?: string;
      html?: string;
    };
    if (String(newsletter.orgId || "").trim() !== orgId) {
      throw new HttpsError("permission-denied", "Newsletter org mismatch");
    }

    const profileEmail = String(userSnap.data()?.email || "").trim();
    const toEmail = requestedEmail || profileEmail;
    if (!toEmail) {
      throw new HttpsError("failed-precondition", "A destination email is required");
    }

    const provider = getSendgridProvider();
    const result = await provider.sendEmail({
      to: toEmail,
      toName: String(userSnap.data()?.displayName || "").trim() || undefined,
      subject: String(newsletter.subject || `Test: ${newsletter.title || "Newsletter"}`).trim(),
      html: String(newsletter.html || "").trim() || "<p>Empty newsletter</p>",
      text: String(newsletter.previewText || newsletter.title || "").trim() || undefined,
      fromEmail: defaultFromEmail(),
      fromName: defaultFromName(),
    });

    if (!result.success) {
      throw new HttpsError("internal", result.errorMessage || "SendGrid send failed");
    }

    const now = new Date().toISOString();
    const auditRef = db().collection("communication_audits").doc();
    await auditRef.set({
      id: auditRef.id,
      orgId,
      title: "newsletter test sent",
      summary: "Controlled SendGrid test email sent from Communication Center.",
      tags: ["communication-center", "sendgrid", "test-send"],
      safety: liveSendSafety(),
      createdAt: now,
      updatedAt: now,
      createdByUid: uid,
      updatedByUid: uid,
      createdBy: uid,
      updatedBy: uid,
      entityType: "newsletter",
      entityCollection: "newsletters",
      entityId: newsletterId,
      actionType: "preview_generated",
      action: "preview_generated",
      actorId: uid,
      actorRole: "org_admin",
      actorUid: uid,
      beforeState: null,
      afterState: {newsletterId, sentTo: toEmail, provider: result.provider},
      promptVersion: null,
      modelVersion: null,
      rollbackReference: null,
    });

    return {ok: true, provider: result.provider, sentTo: toEmail};
  },
);

export const sendCommunicationTestSms = onCall(
  {region: REGION, secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]},
  async (request) => {
    const uid = String(request.auth?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const orgId = String(request.data?.orgId || "").trim();
    const newsletterId = String(request.data?.newsletterId || "").trim();
    const requestedPhone = String(request.data?.toPhone || "").trim();
    if (!orgId || !newsletterId) {
      throw new HttpsError("invalid-argument", "orgId and newsletterId are required");
    }

    await assertCommunicationAccess(uid, orgId);

    const [newsletterSnap, userSnap] = await Promise.all([
      db().doc(`newsletters/${newsletterId}`).get(),
      db().doc(`users/${uid}`).get(),
    ]);
    if (!newsletterSnap.exists) {
      throw new HttpsError("not-found", "Newsletter not found");
    }

    const newsletter = newsletterSnap.data() as {
      orgId?: string;
      title?: string;
      subject?: string;
      previewText?: string;
      html?: string;
    };
    if (String(newsletter.orgId || "").trim() !== orgId) {
      throw new HttpsError("permission-denied", "Newsletter org mismatch");
    }

    const userPhone = String(userSnap.data()?.phoneNumber || userSnap.data()?.phone || "").trim();
    const toPhone = requestedPhone || userPhone;
    if (!toPhone) {
      throw new HttpsError("failed-precondition", "A destination phone number is required");
    }

    const provider = getTwilioProvider();
    const bodyText = stripHtml(renderTemplate(newsletter.previewText || newsletter.html || `Test SMS from ${newsletter.title || "Newsletter"}`, {
      recipientName: String(userSnap.data()?.displayName || "").trim() || "User",
    }));

    const result = await provider.sendSms({
      to: toPhone,
      from: defaultFromSmsNumber(),
      body: bodyText,
    });

    if (!result.success) {
      throw new HttpsError("internal", result.errorMessage || "Twilio SMS send failed");
    }

    const now = new Date().toISOString();
    const auditRef = db().collection("communication_audits").doc();
    await auditRef.set({
      id: auditRef.id,
      orgId,
      title: "newsletter test SMS sent",
      summary: "Controlled Twilio test SMS sent from Communication Center.",
      tags: ["communication-center", "twilio", "test-send"],
      safety: liveSendSafety(),
      createdAt: now,
      updatedAt: now,
      createdByUid: uid,
      updatedByUid: uid,
      createdBy: uid,
      updatedBy: uid,
      entityType: "newsletter",
      entityCollection: "newsletters",
      entityId: newsletterId,
      actionType: "preview_generated",
      action: "preview_generated",
      actorId: uid,
      actorRole: "org_admin",
      actorUid: uid,
      beforeState: null,
      afterState: {newsletterId, sentTo: toPhone, provider: result.provider},
      promptVersion: null,
      modelVersion: null,
      rollbackReference: null,
    });

    return {ok: true, provider: result.provider, sentTo: toPhone};
  }
);

export const sendNewsletterCampaign = onCall(
  {region: REGION, secrets: [SENDGRID_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]},
  async (request) => {
    const uid = String(request.auth?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const orgId = String(request.data?.orgId || "").trim();
    const campaignId = String(request.data?.campaignId || "").trim();
    const recipientLimit = Math.max(1, Math.min(200, Number(request.data?.recipientLimit || 50)));
    if (!orgId || !campaignId) {
      throw new HttpsError("invalid-argument", "orgId and campaignId are required");
    }

    await assertCommunicationAccess(uid, orgId);

    const campaignSnap = await db().doc(`newsletter_campaigns/${campaignId}`).get();
    if (!campaignSnap.exists) {
      throw new HttpsError("not-found", "Campaign not found");
    }

    const campaign = campaignSnap.data() as {
      orgId?: string;
      newsletterId?: string;
      status?: string;
      title?: string;
      channel?: string;
      audienceSegmentIds?: string[];
    };
    if (String(campaign.orgId || "").trim() !== orgId) {
      throw new HttpsError("permission-denied", "Campaign org mismatch");
    }

    const campaignStatus = String(campaign.status || "").trim();
    if (!(campaignStatus === "approved" || campaignStatus === "scheduled" || campaignStatus === "running")) {
      throw new HttpsError("failed-precondition", "Campaign must be approved or scheduled before send.");
    }

    const newsletterId = String(campaign.newsletterId || "").trim();
    if (!newsletterId) {
      throw new HttpsError("failed-precondition", "Campaign is missing newsletterId");
    }

    const newsletterSnap = await db().doc(`newsletters/${newsletterId}`).get();
    if (!newsletterSnap.exists) {
      throw new HttpsError("not-found", "Newsletter not found");
    }

    const newsletter = newsletterSnap.data() as {
      orgId?: string;
      title?: string;
      subject?: string;
      html?: string;
      previewText?: string;
    };
    if (String(newsletter.orgId || "").trim() !== orgId) {
      throw new HttpsError("permission-denied", "Newsletter org mismatch");
    }

    let recipientsSnap = await db().collection("newsletter_recipients")
      .where("orgId", "==", orgId)
      .where("campaignId", "==", campaignId)
      .limit(recipientLimit)
      .get();

    // If recipients are empty, dynamically resolve them
    if (recipientsSnap.empty) {
      const audienceSegmentIds = campaign.audienceSegmentIds || [];
      let usersToProcess: admin.firestore.DocumentSnapshot[] = [];

      if (audienceSegmentIds.length) {
        const usersQuery = await db().collection("users").where("orgId", "==", orgId).get();
        for (const segmentId of audienceSegmentIds) {
          const segmentSnap = await db().doc(`communication_segments/${segmentId}`).get();
          if (!segmentSnap.exists) continue;
          const segmentData = segmentSnap.data() || {};
          const filters = (segmentData.filters || []) as any[];

          for (const userDoc of usersQuery.docs) {
            const userData = userDoc.data() || {};
            let matches = true;

            for (const f of filters) {
              const val = userData[f.field];
              if (f.operator === "==" && val != f.value) matches = false;
              if (f.operator === "!=" && val == f.value) matches = false;
              if (f.operator === ">" && !(Number(val) > Number(f.value))) matches = false;
              if (f.operator === ">=" && !(Number(val) >= Number(f.value))) matches = false;
              if (f.operator === "<" && !(Number(val) < Number(f.value))) matches = false;
              if (f.operator === "<=" && !(Number(val) <= Number(f.value))) matches = false;
            }

            if (matches && !usersToProcess.some(u => u.id === userDoc.id)) {
              usersToProcess.push(userDoc);
            }
          }
        }
      } else {
        const usersQuery = await db().collection("users").where("orgId", "==", orgId).get();
        usersToProcess = usersQuery.docs;
      }

      if (usersToProcess.length) {
        const batch = db().batch();
        const nowIso = new Date().toISOString();
        for (const u of usersToProcess) {
          const uData = u.data() || {};
          const recRef = db().collection("newsletter_recipients").doc(`${campaignId}_${u.id}`);
          batch.set(recRef, {
            id: recRef.id,
            orgId,
            campaignId,
            newsletterId,
            recipientUid: u.id,
            recipientRole: uData.role || "learner",
            personalizationPayload: {
              firstName: uData.displayName || "Learner",
              organizationName: orgId,
            },
            status: "queued",
            mockDeliveryStatus: "queued",
            safety: liveSendSafety(),
            createdAt: nowIso,
            updatedAt: nowIso,
            createdByUid: uid,
            updatedByUid: uid,
          });
        }
        await batch.commit();

        recipientsSnap = await db().collection("newsletter_recipients")
          .where("orgId", "==", orgId)
          .where("campaignId", "==", campaignId)
          .limit(recipientLimit)
          .get();
      }
    }

    if (recipientsSnap.empty) {
      throw new HttpsError("failed-precondition", "No newsletter_recipients found or resolved for this campaign.");
    }

    const channel = String(campaign.channel || "EMAIL").toUpperCase();
    const isSms = channel === "SMS";
    const now = new Date().toISOString();
    let sent = 0;
    let failed = 0;

    await db().doc(`newsletter_campaigns/${campaignId}`).set({
      status: "running",
      launchedAt: now,
      updatedAt: now,
      updatedByUid: uid,
      updatedBy: uid,
      safety: liveSendSafety(),
    }, {merge: true});

    if (isSms) {
      const provider = getTwilioProvider();
      const fromPhone = defaultFromSmsNumber();

      for (const recipientDoc of recipientsSnap.docs) {
        const recipient = recipientDoc.data() as {
          recipientUid?: string;
          personalizationPayload?: Record<string, unknown>;
        };
        const recipientUid = String(recipient.recipientUid || "").trim();
        if (!recipientUid) {
          failed += 1;
          continue;
        }

        const userSnap = await db().doc(`users/${recipientUid}`).get();
        const toPhone = String(userSnap.data()?.phoneNumber || userSnap.data()?.phone || "").trim();
        if (!toPhone) {
          failed += 1;
          await recipientDoc.ref.set({
            status: "failed",
            mockDeliveryStatus: "failed",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            deliveryError: "missing_recipient_phone",
            safety: liveSendSafety(),
          }, {merge: true});
          continue;
        }

        const mergeData = {
          ...(recipient.personalizationPayload || {}),
          recipientPhone: toPhone,
          recipientName: String(userSnap.data()?.displayName || "").trim() || "Learner",
        };

        const bodyText = stripHtml(renderTemplate(String(newsletter.previewText || newsletter.html || campaign.title || "Newsletter"), mergeData));

        const result = await provider.sendSms({
          to: toPhone,
          from: fromPhone,
          body: bodyText,
        });

        if (result.success) {
          sent += 1;
          await recipientDoc.ref.set({
            status: "sent",
            mockDeliveryStatus: "sent",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            provider: result.provider,
            providerMessageId: result.providerMessageId || null,
            safety: liveSendSafety(),
          }, {merge: true});
        } else {
          failed += 1;
          await recipientDoc.ref.set({
            status: "failed",
            mockDeliveryStatus: "failed",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            provider: result.provider,
            deliveryError: result.errorMessage || null,
            safety: liveSendSafety(),
          }, {merge: true});
        }
      }
    } else {
      const provider = getSendgridProvider();

      for (const recipientDoc of recipientsSnap.docs) {
        const recipient = recipientDoc.data() as {
          recipientUid?: string;
          personalizationPayload?: Record<string, unknown>;
        };
        const recipientUid = String(recipient.recipientUid || "").trim();
        if (!recipientUid) {
          failed += 1;
          continue;
        }

        const userSnap = await db().doc(`users/${recipientUid}`).get();
        const toEmail = String(userSnap.data()?.email || "").trim();
        if (!toEmail) {
          failed += 1;
          await recipientDoc.ref.set({
            status: "failed",
            mockDeliveryStatus: "failed",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            deliveryError: "missing_recipient_email",
            safety: liveSendSafety(),
          }, {merge: true});
          continue;
        }

        const mergeData = {
          ...(recipient.personalizationPayload || {}),
          recipientEmail: toEmail,
          recipientName: String(userSnap.data()?.displayName || "").trim() || "Learner",
        };

        const result = await provider.sendEmail({
          to: toEmail,
          toName: String(mergeData.recipientName || "").trim() || undefined,
          subject: renderTemplate(String(newsletter.subject || campaign.title || "Newsletter"), mergeData),
          html: renderTemplate(String(newsletter.html || "<p>Empty newsletter</p>"), mergeData),
          text: renderTemplate(String(newsletter.previewText || newsletter.title || "Newsletter"), mergeData),
          fromEmail: defaultFromEmail(),
          fromName: defaultFromName(),
        });

        if (result.success) {
          sent += 1;
          await recipientDoc.ref.set({
            status: "sent",
            mockDeliveryStatus: "sent",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            provider: result.provider,
            providerMessageId: result.providerMessageId || null,
            safety: liveSendSafety(),
          }, {merge: true});
        } else {
          failed += 1;
          await recipientDoc.ref.set({
            status: "failed",
            mockDeliveryStatus: "failed",
            updatedAt: now,
            updatedByUid: uid,
            updatedBy: uid,
            provider: result.provider,
            deliveryError: result.errorMessage || null,
            safety: liveSendSafety(),
          }, {merge: true});
        }
      }
    }

    const completedAt = new Date().toISOString();
    const analyticsRef = db().collection("newsletter_analytics").doc(`${campaignId}_live`);
    const auditRef = db().collection("communication_audits").doc();
    const activeProvider = isSms ? "twilio" : "sendgrid";

    await Promise.all([
      db().doc(`newsletter_campaigns/${campaignId}`).set({
        status: "completed",
        completedAt,
        updatedAt: completedAt,
        updatedByUid: uid,
        updatedBy: uid,
        safety: liveSendSafety(),
      }, {merge: true}),
      db().doc(`newsletters/${newsletterId}`).set({
        status: "sent",
        scheduledAt: now,
        updatedAt: completedAt,
        updatedByUid: uid,
        updatedBy: uid,
        safety: liveSendSafety(),
      }, {merge: true}),
      analyticsRef.set({
        id: analyticsRef.id,
        orgId,
        campaignId,
        newsletterId,
        sends: sent,
        opens: 0,
        clicks: 0,
        unsubscribes: 0,
        conversions: 0,
        revenueAttributed: 0,
        safety: liveSendSafety(),
        createdAt: now,
        updatedAt: completedAt,
        createdByUid: uid,
        updatedByUid: uid,
        createdBy: uid,
        updatedBy: uid,
      }, {merge: true}),
      auditRef.set({
        id: auditRef.id,
        orgId,
        title: `campaign sent via ${activeProvider}`,
        summary: `Campaign was delivered through the ${activeProvider} provider.`,
        tags: ["communication-center", activeProvider, "campaign-send"],
        safety: liveSendSafety(),
        createdAt: now,
        updatedAt: completedAt,
        createdByUid: uid,
        updatedByUid: uid,
        createdBy: uid,
        updatedBy: uid,
        entityType: "campaign",
        entityCollection: "newsletter_campaigns",
        entityId: campaignId,
        actionType: "preview_generated",
        action: "preview_generated",
        actorId: uid,
        actorRole: "org_admin",
        actorUid: uid,
        beforeState: null,
        afterState: {campaignId, newsletterId, sent, failed, provider: activeProvider},
        promptVersion: null,
        modelVersion: null,
        rollbackReference: null,
      }),
    ]);

    return {ok: true, sent, failed, provider: activeProvider};
  },
);
