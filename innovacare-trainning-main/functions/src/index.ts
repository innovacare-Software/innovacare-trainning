/* eslint max-len: ["error", { "code": 120, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }] */
/* eslint-disable require-jsdoc */
/* functions/src/index.ts (Firebase Functions v2) */

import * as admin from "firebase-admin";
import {
  onCall,
  onRequest,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {defineSecret} from "firebase-functions/params";
import {PDFDocument, StandardFonts} from "pdf-lib";
import {nanoid} from "nanoid";
import Stripe from "stripe";

/* ─────────── Init & global opts ─────────── */
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

setGlobalOptions({region: "us-central1"});

/* ─────────── Secrets ─────────── */
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const getStripe = () =>
  new Stripe(STRIPE_SECRET_KEY.value(), {
    apiVersion: "2024-06-20",
  });

/* ─────────── Helpers & types ─────────── */
const setEq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

type GradeExamPayload = {
  courseId: string;
  examId: string;
  answers: Record<string, string[]>;
};

type QuestionDoc = {
  order?: number;
  prompt?: string;
  mode?: "single" | "multi";
  options?: Array<{ id: string; text: string }>;
  explanation?: string;
};

type ExamDoc = {
  title?: string;
  available?: boolean;
  pointsPerQuestion?: number;
  passPct?: number;
};

type CheckoutPayload = {
  offerId: string;
  successUrl: string;
  cancelUrl: string;
};

type OfferType = "course" | "program" | "live_class";

type PublicOfferDoc = {
  courseId?: string;
  programId?: string;
  liveClassId?: string;
  type: OfferType;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency?: "USD";
  isActive: boolean;
  isPublic: boolean;
  category?: string;
  tags?: string[];
};

type ProgramDoc = {
  title?: string;
  includesCourseIds?: string[];
};

type GrantAccessParams = {
  uid: string;
  orderId: string;
  itemType: OfferType;
  itemId: string;
};

/* ─────────── Callable: gradeExam ───────────
   Reads questions from:
     /courses/{courseId}/exams/{examId}/questions/{qid}
   Reads correct answers from staff-only:
     /courses/{courseId}/exams/{examId}/answerKey/{qid}  -> { correctIds: string[] }
   Returns grading details and marks enrollment completed on pass.
*/
export const gradeExam = onCall(async (request: CallableRequest<GradeExamPayload>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const courseId = String(request.data?.courseId || "").trim();
  const examId = String(request.data?.examId || "").trim();
  const answers = (request.data?.answers ?? {}) as Record<string, string[]>;

  if (!courseId || !examId || typeof answers !== "object") {
    throw new HttpsError("invalid-argument", "courseId, examId, answers are required.");
  }

  const examRef = db.doc(`courses/${courseId}/exams/${examId}`);
  const examSnap = await examRef.get();
  if (!examSnap.exists) throw new HttpsError("not-found", "Exam not found.");
  const exam = (examSnap.data() || {}) as ExamDoc;

  const passPct = typeof exam.passPct === "number" ? exam.passPct : 80;
  const pointsPer = typeof exam.pointsPerQuestion === "number" ? exam.pointsPerQuestion : 10;

  const qsSnap = await db
    .collection(`courses/${courseId}/exams/${examId}/questions`)
    .orderBy("order", "asc")
    .get();

  const keySnap = await db.collection(`courses/${courseId}/exams/${examId}/answerKey`).get();

  const keyMap = new Map<string, string[]>();
  keySnap.forEach((docSnap) => {
    const corr = docSnap.get("correctIds");
    keyMap.set(docSnap.id, Array.isArray(corr) ? corr : []);
  });

  let total = 0;
  let correct = 0;

  const details: Array<{
    id: string;
    order: number;
    prompt: string;
    your: string[];
    correct: string[];
    isCorrect: boolean;
    explanation?: string;
  }> = [];

  qsSnap.forEach((qdoc) => {
    const q = (qdoc.data() || {}) as QuestionDoc;
    const qid = qdoc.id;

    const your = Array.isArray(answers[qid]) ? answers[qid] : [];
    const correctIds = keyMap.get(qid) || [];

    total += 1;
    const ok = setEq([...your].sort(), [...correctIds].sort());
    if (ok) correct += 1;

    details.push({
      id: qid,
      order: typeof q.order === "number" ? q.order : total,
      prompt: typeof q.prompt === "string" ? q.prompt : "",
      your,
      correct: correctIds,
      isCorrect: ok,
      explanation: typeof q.explanation === "string" ? q.explanation : undefined,
    });
  });

  const percent = total ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= passPct;

  if (passed) {
    await db.doc(`users/${uid}/enrollments/${courseId}`).set(
      {
        status: "completed",
        completedAt: nowTs(),
      },
      {merge: true},
    );
  }

  return {
    courseId,
    examId,
    total,
    correct,
    percent,
    passPct,
    passed,
    pointsPerQuestion: pointsPer,
    details,
  };
});

/* ─────────── Certificate generator (helper) ─────────── */
async function generateCertificate(
  uid: string,
  courseId: string,
  examId: string,
  scorePct: number,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 396]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText("Certificate of Completion", {x: 170, y: 320, size: 20, font});
  page.drawText(`Awarded to: ${uid}`, {x: 60, y: 260, size: 14, font});
  page.drawText(`Course: ${courseId}`, {x: 60, y: 230, size: 12, font});
  page.drawText(`Exam: ${examId}   Score: ${scorePct}%`, {x: 60, y: 200, size: 12, font});

  const bytes = await pdf.save();
  const path = `certificates/${uid}_${courseId}_${Date.now()}.pdf`;
  const bucket = storage.bucket();
  const file = bucket.file(path);

  await file.save(Buffer.from(bytes), {contentType: "application/pdf"});
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
  });

  const token = nanoid(12);
  const certRef = db.collection("certificates").doc();
  await certRef.set({
    id: certRef.id,
    uid,
    courseId,
    examId,
    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
    scorePct,
    verifyToken: token,
    fileUrl: url,
  });

  return url;
}

/* ─────────── Optional callable: generateCertificateForResult ─────────── */
export const generateCertificateForResult = onCall(
  async (request: CallableRequest<{ courseId: string; examId: string; scorePct: number }>) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const courseId = String(request.data?.courseId || "").trim();
    const examId = String(request.data?.examId || "").trim();
    const scorePct = Number(request.data?.scorePct ?? 0);

    if (!courseId || !examId) {
      throw new HttpsError("invalid-argument", "courseId, examId required.");
    }
    if (Number.isNaN(scorePct)) {
      throw new HttpsError("invalid-argument", "scorePct must be a number.");
    }

    const url = await generateCertificate(uid, courseId, examId, scorePct);
    return {url};
  },
);

/* ─────────── Optional: seed a demo course/exam ─────────── */
export const seedDemoData = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const now = admin.firestore.FieldValue.serverTimestamp();

  const courseId = "demo-course";
  const examId = "demo-exam";

  await db.doc(`courses/${courseId}`).set(
    {
      title: "Demo Course",
      subtitle: "Sample",
      description: "Demo content for testing exam runner",
      lang: "EN",
      durationMin: 10,
      ceCredit: 0,
      active: true,
      kind: "Course",
      tags: ["demo"],
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await db.doc(`courses/${courseId}/exams/${examId}`).set(
    {
      title: "Demo Exam",
      available: true,
      passPct: 80,
      pointsPerQuestion: 10,
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await db.doc(`courses/${courseId}/exams/${examId}/questions/q1`).set(
    {
      order: 1,
      mode: "single",
      prompt: "2 + 2 = ?",
      options: [
        {id: "a", text: "3"},
        {id: "b", text: "4"},
        {id: "c", text: "5"},
      ],
      explanation: "Basic math 🙂",
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await db
    .doc(`courses/${courseId}/exams/${examId}/answerKey/q1`)
    .set({correctIds: ["b"]}, {merge: true});

  return {ok: true, courseId, examId};
});

/* ─────────── Stripe / Commerce helpers ─────────── */

async function grantPurchasedAccessInternal(params: GrantAccessParams) {
  const {uid, orderId, itemType, itemId} = params;

  if (itemType === "course") {
    const existingSnap = await db
      .collection(`users/${uid}/guestEnrollments`)
      .where("courseId", "==", itemId)
      .where("status", "in", ["active", "completed"])
      .limit(1)
      .get();

    if (!existingSnap.empty) return;

    const ref = db.collection(`users/${uid}/guestEnrollments`).doc();
    await ref.set({
      id: ref.id,
      uid,
      courseId: itemId,
      source: "purchase",
      orderId,
      status: "active",
      progressPct: 0,
      currentLessonId: null,
      completedLessonIds: [],
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });
    return;
  }

  if (itemType === "program") {
    const existingProgramSnap = await db
      .collection(`users/${uid}/guestPrograms`)
      .where("programId", "==", itemId)
      .where("status", "in", ["active", "completed"])
      .limit(1)
      .get();

    if (existingProgramSnap.empty) {
      const programSnap = await db.doc(`programs/${itemId}`).get();
      const program = (programSnap.data() || {}) as ProgramDoc;

      const ref = db.collection(`users/${uid}/guestPrograms`).doc();
      await ref.set({
        id: ref.id,
        uid,
        programId: itemId,
        orderId,
        status: "active",
        progressPct: 0,
        unlockedCourseIds: Array.isArray(program.includesCourseIds) ?
          program.includesCourseIds : [],
        createdAt: nowTs(),
        updatedAt: nowTs(),
      });

      const courseIds = Array.isArray(program.includesCourseIds) ?
        program.includesCourseIds : [];

      for (const courseId of courseIds) {
        const existingEnrollmentSnap = await db
          .collection(`users/${uid}/guestEnrollments`)
          .where("courseId", "==", courseId)
          .where("status", "in", ["active", "completed"])
          .limit(1)
          .get();

        if (!existingEnrollmentSnap.empty) continue;

        const enrRef = db.collection(`users/${uid}/guestEnrollments`).doc();
        await enrRef.set({
          id: enrRef.id,
          uid,
          courseId,
          source: "program",
          orderId,
          status: "active",
          progressPct: 0,
          currentLessonId: null,
          completedLessonIds: [],
          createdAt: nowTs(),
          updatedAt: nowTs(),
        });
      }
    }
    return;
  }

  if (itemType === "live_class") {
    const existingBookingSnap = await db
      .collection(`users/${uid}/bookings`)
      .where("liveClassId", "==", itemId)
      .where("status", "==", "booked")
      .limit(1)
      .get();

    if (!existingBookingSnap.empty) return;

    const liveClassRef = db.doc(`liveClasses/${itemId}`);
    const liveClassSnap = await liveClassRef.get();
    if (!liveClassSnap.exists) {
      throw new Error(`Live class ${itemId} not found.`);
    }

    const liveClass = liveClassSnap.data() as {
      seatsRemaining?: number;
      isActive?: boolean;
    };

    if (liveClass?.isActive === false) {
      throw new Error("Live class is not active.");
    }

    if (typeof liveClass?.seatsRemaining === "number" &&
        liveClass.seatsRemaining <= 0) {
      throw new Error("No seats remaining.");
    }

    const ref = db.collection(`users/${uid}/bookings`).doc();
    await ref.set({
      id: ref.id,
      uid,
      liveClassId: itemId,
      orderId,
      status: "booked",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    if (typeof liveClass?.seatsRemaining === "number") {
      await liveClassRef.update({
        seatsRemaining: Math.max(0, liveClass.seatsRemaining - 1),
        updatedAt: nowTs(),
      });
    }
  }
}

/* ─────────── Callable: createCheckoutSession ─────────── */
export const createCheckoutSession = onCall(
  {secrets: [STRIPE_SECRET_KEY]},
  async (request: CallableRequest<CheckoutPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const offerId = String(request.data?.offerId || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (!offerId || !successUrl || !cancelUrl) {
      throw new HttpsError(
        "invalid-argument",
        "offerId, successUrl and cancelUrl are required.",
      );
    }

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = userSnap.data() || {};
    const email = typeof userData.email === "string" ? userData.email : undefined;

    const offerRef = db.doc(`publicOffers/${offerId}`);
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists) {
      throw new HttpsError("not-found", "Offer not found.");
    }

    const offer = offerSnap.data() as PublicOfferDoc;
    if (!offer?.isActive || !offer?.isPublic) {
      throw new HttpsError("failed-precondition", "Offer is not available.");
    }

    const itemId = offer.type === "course" ?
      offer.courseId :
      offer.type === "program" ?
        offer.programId :
        offer.liveClassId;

    if (!itemId) {
      throw new HttpsError("failed-precondition", "Offer item is not configured.");
    }

    const orderRef = db.collection(`users/${uid}/orders`).doc();
    await orderRef.set({
      id: orderRef.id,
      uid,
      itemType: offer.type,
      itemId,
      offerId,
      title: offer.title,
      amount: Number(offer.price || 0),
      currency: offer.currency || "USD",
      status: "pending",
      provider: "stripe",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      metadata: {
        uid,
        offerId,
        orderId: orderRef.id,
        itemType: offer.type,
        itemId,
      },
      line_items: [
        {
          price_data: {
            currency: String(offer.currency || "USD").toLowerCase(),
            product_data: {
              name: offer.title,
              description: offer.description || "",
              ...(offer.imageUrl ? {images: [offer.imageUrl]} : {}),
            },
            unit_amount: Math.round(Number(offer.price || 0) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await orderRef.update({
      checkoutSessionId: session.id,
      updatedAt: nowTs(),
    });

    return {url: session.url};
  },
);

/* ─────────── HTTP: stripeWebhook ─────────── */
export const stripeWebhook = onRequest(
  {secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET]},
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      res.status(400).send("Missing Stripe signature");
      return;
    }

    try {
      const stripe = getStripe();

      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value(),
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const uid = session.metadata?.uid;
        const orderId = session.metadata?.orderId;
        const offerId = session.metadata?.offerId;
        const itemType = session.metadata?.itemType as OfferType | undefined;
        const itemId = session.metadata?.itemId;

        if (!uid || !orderId || !offerId || !itemType || !itemId) {
          throw new Error("Missing metadata on checkout session.");
        }

        const orderRef = db.doc(`users/${uid}/orders/${orderId}`);
        await orderRef.set({
          status: "paid",
          paymentIntentId: session.payment_intent ?? null,
          checkoutSessionId: session.id,
          updatedAt: nowTs(),
        }, {merge: true});

        await grantPurchasedAccessInternal({
          uid,
          orderId,
          itemType,
          itemId,
        });
      }

      res.status(200).send({received: true});
    } catch (err: any) {
      console.error("Stripe webhook processing error:", err);
      res.status(400).send(err?.message || "Webhook error");
    }
  },
);

/* ─────────── Optional callable: manualGrantPurchasedAccess ─────────── */
export const manualGrantPurchasedAccess = onCall(
  async (
    request: CallableRequest<{
      uid: string;
      orderId: string;
      itemType: OfferType;
      itemId: string;
    }>,
  ) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const uid = String(request.data?.uid || "").trim();
    const orderId = String(request.data?.orderId || "").trim();
    const itemType = request.data?.itemType;
    const itemId = String(request.data?.itemId || "").trim();

    if (!uid || !orderId || !itemType || !itemId) {
      throw new HttpsError(
        "invalid-argument",
        "uid, orderId, itemType and itemId are required.",
      );
    }

    await grantPurchasedAccessInternal({
      uid,
      orderId,
      itemType,
      itemId,
    });

    return {ok: true};
  },
);