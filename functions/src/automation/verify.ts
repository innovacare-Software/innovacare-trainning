/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public certificate verification.
 *
 * Exposed as an unauthenticated callable so the public verification page
 * (/certificates/verify/:code) can confirm authenticity without leaking the
 * full certificates collection. Returns ONLY the fields safe for public
 * display.
 */
import * as admin from "firebase-admin";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";

const db = (): admin.firestore.Firestore => admin.firestore();

const VERIFY_RATE_LIMIT_WINDOW_MS = 60_000;
const VERIFY_RATE_LIMIT_MAX = 30;

type VerifyPayload = {code?: string};

export const verifyCertificateByCode = onCall(
  {region: "us-central1"},
  async (req: CallableRequest<VerifyPayload>) => {
    const code = String(req.data?.code || "").trim();
    if (!code || code.length < 6 || code.length > 64) {
      throw new HttpsError("invalid-argument", "Invalid verification code.");
    }

    // Lightweight rate-limit per IP to deter brute-force enumeration.
    const ipRaw = (req.rawRequest?.headers?.["x-forwarded-for"] || "") as string | string[];
    const ip = (Array.isArray(ipRaw) ? ipRaw[0] : ipRaw).split(",")[0].trim() || "unknown";
    const limitRef = db().doc(`certVerifyRateLimits/${ip.replace(/[^a-z0-9.:_-]/gi, "_")}`);
    try {
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(limitRef);
        const now = Date.now();
        const data = (snap.data() || {}) as {windowStart?: number; count?: number};
        const windowStart = Number(data.windowStart || 0);
        const count = Number(data.count || 0);
        if (snap.exists && now - windowStart < VERIFY_RATE_LIMIT_WINDOW_MS) {
          if (count >= VERIFY_RATE_LIMIT_MAX) {
            throw new HttpsError("resource-exhausted", "Too many verification attempts. Try again shortly.");
          }
          tx.set(limitRef, {windowStart, count: count + 1}, {merge: true});
        } else {
          tx.set(limitRef, {windowStart: now, count: 1});
        }
      });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      // Fail open on infra errors but log.
      console.warn("[verifyCertificate] rate-limit infra error", err);
    }

    const snap = await db()
      .collection("certificates")
      .where("verificationCode", "==", code)
      .limit(1)
      .get();

    if (snap.empty) {
      return {valid: false};
    }

    const data = snap.docs[0].data();
    return {
      valid: data.status === "issued" || data.status === "valid",
      learnerName: String(data.learnerName || ""),
      courseTitle: String(data.courseTitle || ""),
      issuedAt: data.issuedAt?.toDate?.()?.toISOString?.() || null,
      orgName: String(data.orgName || ""),
      verificationCode: code,
      certificateUrl: typeof data.certificateUrl === "string" ? data.certificateUrl : null,
      status: String(data.status || "issued"),
    };
  },
);
