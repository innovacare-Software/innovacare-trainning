/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Automation — Stripe recurring & enrollment automation
 *
 * Two responsibilities:
 *
 * 1. `handleAutomationCheckoutCompleted(session, eventId)` is called by the
 *    main `stripeWebhook` switch when `metadata.automation === 'innovacare_v1'`.
 *    It creates / updates an `enrollments/{id}` document with status `active`,
 *    stores the linked subscriptionId (if any), and is fully idempotent
 *    (key = checkoutSessionId).
 *
 * 2. `handleStripeRecurringEvent(event)` handles
 *    `invoice.payment_succeeded`, `invoice.payment_failed`,
 *    `customer.subscription.updated` and `customer.subscription.deleted`
 *    to extend / suspend / cancel the linked enrollment.
 *
 * The webhook signature & idempotence (stripeWebhookEvents/{event.id}) are
 * already enforced by the parent dispatcher in functions/src/index.ts.
 */
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = (): admin.firestore.Firestore => admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

const ENROLLMENTS_COLLECTION = "enrollments";

type EnrollmentStatus =
  | "active"
  | "past_due"
  | "expired"
  | "cancelled"
  | "completed";

function metaString(
  source: Record<string, string | undefined> | undefined | null,
  key: string,
): string {
  return String(source?.[key] || "").trim();
}

async function findEnrollmentBySubscriptionId(subscriptionId: string) {
  if (!subscriptionId) return null;
  const snap = await db()
    .collection(ENROLLMENTS_COLLECTION)
    .where("subscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

async function findEnrollmentBySessionId(sessionId: string) {
  if (!sessionId) return null;
  const snap = await db()
    .collection(ENROLLMENTS_COLLECTION)
    .where("checkoutSessionId", "==", sessionId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

/**
 * Idempotently create / update the enrollment from a paid checkout session.
 * Returns the enrollment doc id.
 */
export async function handleAutomationCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<string | null> {
  const meta = (session.metadata || {}) as Record<string, string | undefined>;
  if (metaString(meta, "automation") !== "innovacare_v1") {
    return null;
  }

  const userId = metaString(meta, "userId") || metaString(meta, "uid");
  const offerId = metaString(meta, "offerId");
  const orgId = metaString(meta, "orgId");
  const courseId = metaString(meta, "courseId");
  const app = metaString(meta, "app") || "innovacare_review";

  if (!userId || !offerId) {
    console.warn("[automation] checkout.session.completed missing userId/offerId metadata");
    return null;
  }

  // Idempotency: prefer existing doc keyed by checkoutSessionId, else
  // a deterministic id so repeated webhook deliveries collapse safely.
  const existing = await findEnrollmentBySessionId(session.id);
  const ref = existing?.ref ||
    db().collection(ENROLLMENTS_COLLECTION).doc(`auto_${session.id}`);

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription :
      session.subscription?.id || null;

  const now = nowTs();
  const baseDoc: Record<string, unknown> = {
    userId,
    offerId,
    courseId: courseId || null,
    orgId: orgId || null,
    app,
    status: "active" as EnrollmentStatus,
    source: "stripe",
    enrolledAt: now,
    activatedAt: now,
    updatedAt: now,
    paymentStatus: "paid",
    checkoutSessionId: session.id,
    subscriptionId,
    customerId:
      typeof session.customer === "string" ? session.customer :
        session.customer?.id || null,
    paymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent :
        session.payment_intent?.id || null,
    amountCents: Number(session.amount_total || 0),
    currency: String(session.currency || "usd").toLowerCase(),
    lastWebhookEventId: eventId,
  };

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data() || {};
      // Idempotent: do not overwrite an already-completed enrollment, and
      // never roll back a more advanced state.
      if (data.lastWebhookEventId === eventId) return;
      const merged = {
        ...baseDoc,
        // Preserve completion timestamps if any.
        completedAt: data.completedAt ?? null,
        certificateId: data.certificateId ?? null,
        // Preserve original enrolledAt.
        enrolledAt: data.enrolledAt ?? baseDoc.enrolledAt,
      };
      tx.set(ref, merged, {merge: true});
    } else {
      tx.set(ref, {
        ...baseDoc,
        createdAt: now,
      });
    }
  });

  return ref.id;
}

/**
 * Handle Stripe recurring billing events. Returns true if the event was
 * recognized and processed (so the parent dispatcher can short-circuit).
 */
export async function handleStripeRecurringEvent(
  event: Stripe.Event,
): Promise<boolean> {
  switch (event.type) {
  case "invoice.payment_succeeded": {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof (invoice as any).subscription === "string" ?
        (invoice as any).subscription as string :
        (invoice as any).subscription?.id || "";
    const enrollmentDoc = await findEnrollmentBySubscriptionId(subscriptionId);
    if (!enrollmentDoc) return true;
    const periodEndSec = Number(
      (invoice.lines?.data?.[0] as any)?.period?.end || 0,
    );
    await enrollmentDoc.ref.set({
      status: "active",
      paymentStatus: "paid",
      lastInvoiceId: invoice.id,
      lastInvoicePaidAt: nowTs(),
      ...(periodEndSec > 0 ?
        {expiresAt: admin.firestore.Timestamp.fromMillis(periodEndSec * 1000)} :
        {}),
      lastWebhookEventId: event.id,
      updatedAt: nowTs(),
    }, {merge: true});
    return true;
  }

  case "invoice.payment_failed": {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof (invoice as any).subscription === "string" ?
        (invoice as any).subscription as string :
        (invoice as any).subscription?.id || "";
    const enrollmentDoc = await findEnrollmentBySubscriptionId(subscriptionId);
    if (!enrollmentDoc) return true;
    await enrollmentDoc.ref.set({
      status: "past_due",
      paymentStatus: "failed",
      lastInvoiceId: invoice.id,
      lastInvoiceFailedAt: nowTs(),
      lastWebhookEventId: event.id,
      updatedAt: nowTs(),
    }, {merge: true});
    return true;
  }

  case "customer.subscription.updated": {
    const sub = event.data.object as Stripe.Subscription;
    const enrollmentDoc = await findEnrollmentBySubscriptionId(sub.id);
    if (!enrollmentDoc) return true;
    let status: EnrollmentStatus = "active";
    if (sub.status === "past_due" || sub.status === "unpaid") status = "past_due";
    else if (sub.status === "canceled") status = "cancelled";
    else if (sub.status === "incomplete_expired") status = "expired";
    else if (sub.cancel_at_period_end) status = "active"; // still active until end
    const periodEndSec = Number((sub as any).current_period_end || 0);
    await enrollmentDoc.ref.set({
      status,
      subscriptionStatus: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end === true,
      ...(periodEndSec > 0 ?
        {expiresAt: admin.firestore.Timestamp.fromMillis(periodEndSec * 1000)} :
        {}),
      lastWebhookEventId: event.id,
      updatedAt: nowTs(),
    }, {merge: true});
    return true;
  }

  case "customer.subscription.deleted": {
    const sub = event.data.object as Stripe.Subscription;
    const enrollmentDoc = await findEnrollmentBySubscriptionId(sub.id);
    if (!enrollmentDoc) return true;
    await enrollmentDoc.ref.set({
      status: "cancelled",
      subscriptionStatus: sub.status,
      cancelledAt: nowTs(),
      lastWebhookEventId: event.id,
      updatedAt: nowTs(),
    }, {merge: true});
    return true;
  }

  default:
    return false;
  }
}
