/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Automation — Checkout
 *
 * Single source of truth for creating Stripe Checkout sessions for the
 * Innovacare Review / Training SaaS. The frontend NEVER sends a price.
 * The price, currency, productId and orgId are all loaded server-side from
 * Firestore (publicOffers/{offerId}) and cross-checked against the active
 * membership of the authenticated user.
 *
 * Output: { url } redirect target for the Stripe-hosted checkout page.
 */
import * as admin from "firebase-admin";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

type CheckoutPayload = {
  offerId?: string;
  orgId?: string | null;
  successUrl?: string;
  cancelUrl?: string;
  /** Optional pre-resolved courseId for offers that bundle multiple. */
  courseId?: string;
  /** Optional locale for Stripe checkout UI ("auto" by default). */
  locale?: string;
};

type PublicOffer = {
  active?: boolean;
  status?: string;
  priceCents?: number;
  amountCents?: number;
  price?: number;
  currency?: string;
  title?: string;
  name?: string;
  orgId?: string;
  organizationId?: string;
  courseId?: string;
  productId?: string;
  recurring?: boolean;
  isSubscription?: boolean;
  intervalUnit?: "day" | "week" | "month" | "year";
  intervalCount?: number;
  trialDays?: number;
  app?: "innovacare_review" | "sygepec";
  whatsappGroupUrl?: string;
};

const stripe = (): Stripe =>
  new Stripe(STRIPE_SECRET_KEY.value(), {apiVersion: "2025-08-27.basil"});

const db = (): admin.firestore.Firestore => admin.firestore();

function safeUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

async function loadActiveOrgIdsForUser(uid: string): Promise<Set<string>> {
  const snap = await db()
    .collection("userOrgMemberships")
    .where("userId", "==", uid)
    .where("status", "==", "active")
    .get();
  const out = new Set<string>();
  snap.forEach((d) => {
    const orgId = String((d.data() as any)?.orgId || "").trim();
    if (orgId) out.add(orgId);
  });
  return out;
}

function resolvePriceCents(offer: PublicOffer): {amount: number; currency: string} {
  let cents = 0;
  if (typeof offer.priceCents === "number" && offer.priceCents > 0) {
    cents = Math.round(offer.priceCents);
  } else if (typeof offer.amountCents === "number" && offer.amountCents > 0) {
    cents = Math.round(offer.amountCents);
  } else if (typeof offer.price === "number" && offer.price > 0) {
    cents = Math.round(offer.price * 100);
  }
  const currency = String(offer.currency || "USD").toLowerCase();
  return {amount: cents, currency};
}

export const createCheckoutSession = onCall(
  {region: "us-central1", secrets: [STRIPE_SECRET_KEY]},
  async (req: CallableRequest<CheckoutPayload>) => {
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue.");
    }
    const uid = req.auth.uid;
    const offerId = String(req.data?.offerId || "").trim();
    if (!offerId) {
      throw new HttpsError("invalid-argument", "offerId is required.");
    }

    // 1. Load offer from Firestore — single source of truth for price & metadata.
    const offerSnap = await db().doc(`publicOffers/${offerId}`).get();
    if (!offerSnap.exists) {
      throw new HttpsError("not-found", "Offer not found.");
    }
    const offer = offerSnap.data() as PublicOffer;

    const isPublished =
      offer.active === true ||
      offer.status === "published" ||
      offer.status === "active";
    if (!isPublished) {
      throw new HttpsError("failed-precondition", "Offer is not currently available.");
    }

    const {amount, currency} = resolvePriceCents(offer);
    if (amount <= 0) {
      throw new HttpsError("failed-precondition", "Offer has no valid price.");
    }

    // 2. Resolve and verify the orgId server-side. Frontend may suggest one
    //    but we cross-check against active memberships of the user, OR we
    //    fall back to the organization that owns the offer.
    const offerOrgId = String(offer.orgId || offer.organizationId || "").trim();
    const requestedOrgId = String(req.data?.orgId || "").trim();
    const userOrgs = await loadActiveOrgIdsForUser(uid);

    let orgId = "";
    if (requestedOrgId) {
      if (userOrgs.has(requestedOrgId) || requestedOrgId === offerOrgId) {
        orgId = requestedOrgId;
      } else {
        // SECURITY: never trust orgId from client without server-side check.
        throw new HttpsError("permission-denied", "Active membership required for this organization.");
      }
    } else {
      orgId = offerOrgId || (userOrgs.size === 1 ? Array.from(userOrgs)[0] : "");
    }

    // 3. Load user profile (email is preferred for Stripe receipts).
    const userSnap = await db().doc(`users/${uid}`).get();
    const userData = (userSnap.data() || {}) as Record<string, unknown>;
    const email =
      String(userData.email || req.auth.token?.email || "").trim() || undefined;

    const courseId =
      String(req.data?.courseId || offer.courseId || offer.productId || "").trim();

    const successUrl = safeUrl(req.data?.successUrl, "https://innovacare-stripe.web.app/checkout/success?session={CHECKOUT_SESSION_ID}");
    const cancelUrl = safeUrl(req.data?.cancelUrl, "https://innovacare-stripe.web.app/checkout/cancel");

    // 4. Build line item with the SERVER-SIDE price.
    const productName = String(offer.title || offer.name || "Innovacare offer").slice(0, 250);
    const isRecurring = offer.recurring === true || offer.isSubscription === true;

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: amount,
        product_data: {
          name: productName,
          metadata: {offerId, courseId, orgId},
        },
        ...(isRecurring ?
          {
            recurring: {
              interval: (offer.intervalUnit || "month") as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
              interval_count: Math.max(1, Number(offer.intervalCount || 1)),
            },
          } :
          {}),
      },
    };

    // 5. Build the metadata payload that the webhook will trust.
    const metadata: Record<string, string> = {
      app: String(offer.app || "innovacare_review"),
      automation: "innovacare_v1",
      uid,
      userId: uid,
      offerId,
      orgId: orgId || "",
      courseId,
    };

    const session = await stripe().checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [lineItem],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: (req.data?.locale as Stripe.Checkout.SessionCreateParams.Locale) || "auto",
      client_reference_id: uid,
      metadata,
      ...(isRecurring ?
        {
          subscription_data: {
            metadata,
            ...(offer.trialDays && offer.trialDays > 0 ?
              {trial_period_days: Math.min(30, Math.round(offer.trialDays))} :
              {}),
          },
        } :
        {payment_intent_data: {metadata}}),
      allow_promotion_codes: true,
    });

    // Audit log (orders/{userId}/automationCheckouts) — best-effort, never blocks.
    try {
      await db()
        .collection(`users/${uid}/automationCheckouts`)
        .doc(session.id)
        .set({
          sessionId: session.id,
          offerId,
          orgId,
          courseId,
          amountCents: amount,
          currency,
          mode: isRecurring ? "subscription" : "payment",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.warn("[createCheckoutSession] audit write failed", err);
    }

    return {
      sessionId: session.id,
      url: session.url || "",
      mode: isRecurring ? "subscription" : "payment",
    };
  },
);
