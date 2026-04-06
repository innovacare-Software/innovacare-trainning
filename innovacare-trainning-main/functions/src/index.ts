/* eslint max-len: [
  "error",
  { "code": 120, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }
] */
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
import Anthropic from "@anthropic-ai/sdk";
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
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const HTTPS_PUBLIC = "public" as const;

const getStripe = () =>
  new Stripe(STRIPE_SECRET_KEY.value(), {
    apiVersion: "2025-08-27.basil",
  });

/* ─────────── Helpers & types ─────────── */
const setEq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

const nowTs = () => admin.firestore.FieldValue.serverTimestamp();
const nowStamp = () => admin.firestore.Timestamp.now();

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
  offerId?: string;
  cartId?: string;
  successUrl: string;
  cancelUrl: string;
};

type PublishCoursePayload = {
  courseId: string;
  price: number;
  currency?: string;
  stripePriceId: string;
  isPublic?: boolean;
};

type CreateOrgUserPayload = {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  department?: string;
  title?: string;
  role?: "admin" | "manager" | "learner" | "guest";
  status?: "active" | "inactive";
};

type CartItemInput = {
  offerId: string;
  qty?: number;
};

type CartItemStored = {
  offerId: string;
  qty: number;
  addedAt: admin.firestore.Timestamp;
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
  stripePriceId?: string;
  stripeProductId?: string;
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

type OrderStored = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  itemType?: OfferType;
  itemId?: string;
  items?: Array<{
    offerId: string;
    itemType: OfferType;
    itemId: string;
    title: string;
    amount: number;
    currency: string;
    qty: number;
  }>;
};

type UserProfileDoc = {
  email?: string;
  status?: "active" | "blocked";
  profileCompleted?: boolean;
  emailVerified?: boolean;
  role?: string;
  orgId?: string | null;
};

async function isAdminUid(uid: string): Promise<boolean> {
  const adminSnap = await db.doc(`admins/${uid}`).get();
  if (adminSnap.exists && adminSnap.get("active") === true) {
    return true;
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  return userSnap.exists && userSnap.get("role") === "admin";
}

async function getUserContext(uid: string): Promise<{role: string; orgId: string | null; active: boolean}> {
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    return {role: "", orgId: null, active: false};
  }

  const role = String(userSnap.get("role") || "");
  const rawOrgId = userSnap.get("orgId");
  const orgId = rawOrgId == null ? null : String(rawOrgId);
  const active = userSnap.get("active") !== false;
  return {role, orgId, active};
}

async function isPublisherUid(uid: string): Promise<boolean> {
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) return false;
  const role = String(userSnap.get("role") || "");
  return role === "super_admin";
}

function parseAllowedHosts(): Set<string> {
  const raw = (process.env.ALLOWED_CHECKOUT_HOSTS || "").trim();
  const fallback = ["localhost", "127.0.0.1"];
  const hosts = raw ? raw.split(",").map((x) => x.trim().toLowerCase()) : fallback;
  return new Set(hosts.filter(Boolean));
}

function isEmailVerificationRequiredForCheckout(): boolean {
  const raw = (process.env.REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT || "").trim().toLowerCase();
  return raw === "true";
}

function isAllowedCheckoutUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isFirebaseHosting =
      hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com");

    if (isLocal) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }

    if (isFirebaseHosting) {
      return parsed.protocol === "https:";
    }

    if (parsed.protocol !== "https:") return false;
    const allowedHosts = parseAllowedHosts();
    if (!allowedHosts.size) return false;
    return allowedHosts.has(hostname);
  } catch {
    return false;
  }
}

async function normalizeCartItems(items: CartItemInput[]): Promise<Array<{
  offerId: string;
  offer: PublicOfferDoc;
  itemType: OfferType;
  itemId: string;
  qty: number;
}>> {
  const compact = items
    .map((x) => ({
      offerId: String(x.offerId || "").trim(),
      qty: Math.max(1, Math.floor(Number(x.qty || 1))),
    }))
    .filter((x) => !!x.offerId)
    .slice(0, 20);

  const uniqueMap = new Map<string, number>();
  for (const item of compact) {
    uniqueMap.set(item.offerId, Math.min(5, (uniqueMap.get(item.offerId) || 0) + item.qty));
  }

  const normalized: Array<{
    offerId: string;
    offer: PublicOfferDoc;
    itemType: OfferType;
    itemId: string;
    qty: number;
  }> = [];

  for (const [offerId, qty] of uniqueMap.entries()) {
    const offerSnap = await db.doc(`publicOffers/${offerId}`).get();
    if (!offerSnap.exists) continue;

    const offer = offerSnap.data() as PublicOfferDoc;
    if (!offer?.isActive || !offer?.isPublic) continue;

    const itemId = offer.type === "course" ?
      offer.courseId :
      offer.type === "program" ?
        offer.programId :
        offer.liveClassId;

    if (!itemId) continue;

    normalized.push({
      offerId,
      offer,
      itemType: offer.type,
      itemId,
      qty,
    });
  }

  return normalized;
}

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
      explanation: "Basic math",
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

export const createOrgUser = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<CreateOrgUserPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const callerCtx = await getUserContext(callerUid);
    const allowedRoles = ["manager", "admin", "super_admin"];
    if (!allowedRoles.includes(callerCtx.role)) {
      throw new HttpsError("permission-denied", "Only manager/admin can create organization users.");
    }
    if (!callerCtx.active) {
      throw new HttpsError("permission-denied", "Caller account is inactive.");
    }

    const data = request.data || ({} as CreateOrgUserPayload);
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const displayName = String(data.displayName || "").trim();
    const phone = String(data.phone || "").trim();
    const department = String(data.department || "").trim();
    const title = String(data.title || "").trim();
    const role = (data.role || "learner") as "admin" | "manager" | "learner" | "guest";
    const status = (data.status || "active") as "active" | "inactive";

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    if (password.length < 8) {
      throw new HttpsError("invalid-argument", "Initial password must be at least 8 characters.");
    }
    if (!["admin", "manager", "learner", "guest"].includes(role)) {
      throw new HttpsError("invalid-argument", "Invalid role.");
    }
    if (!["active", "inactive"].includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid status.");
    }

    if (callerCtx.role !== "super_admin") {
      if (!callerCtx.orgId) {
        throw new HttpsError("failed-precondition", "No organization attached to caller account.");
      }
      if (role === "admin") {
        throw new HttpsError("permission-denied", "Only super admin can create admin users.");
      }
    }

    const orgId = callerCtx.orgId;
    const normalizedOrgId = String(orgId || "").trim();
    let orgAccessCode: string | null = null;

    if (normalizedOrgId) {
      const orgSnap = await db.doc(`organizations/${normalizedOrgId}`).get();
      if (!orgSnap.exists) {
        throw new HttpsError("failed-precondition", "Organization not found.");
      }

      const isOrgActive = orgSnap.get("active") !== false;
      if (!isOrgActive) {
        throw new HttpsError("permission-denied", "Organization is inactive.");
      }

      const rawAccessCode = String(orgSnap.get("accessCode") || orgSnap.get("orgId") || "").trim();
      orgAccessCode = rawAccessCode ? rawAccessCode.toUpperCase() : null;
    }

    let createdUid: string | null = null;

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || undefined,
        disabled: status === "inactive",
      });
      createdUid = userRecord.uid;

      const payload = {
        uid: userRecord.uid,
        email,
        displayName,
        phone,
        department,
        title,
        role,
        status,
        orgId: normalizedOrgId || null,
        accessCode: orgAccessCode,
        orgAccessCode,
        loginType: "organization",
        active: status === "active",
        createdAt: nowTs(),
        updatedAt: nowTs(),
      };

      const batch = db.batch();
      batch.set(db.doc(`users/${userRecord.uid}`), payload, {merge: true});

      const scopedOrgId = normalizedOrgId;
      if (scopedOrgId) {
        batch.set(db.doc(`organizations/${scopedOrgId}/users/${userRecord.uid}`), payload, {merge: true});
        batch.set(db.doc(`organizations/${scopedOrgId}/orgUsers/${userRecord.uid}`), payload, {merge: true});
        // Legacy mirror path kept for compatibility with existing dashboards expecting /org/{orgId}/orgUsers.
        batch.set(db.doc(`org/${scopedOrgId}/orgUsers/${userRecord.uid}`), payload, {merge: true});
      }

      await batch.commit();

      return {
        ok: true,
        uid: userRecord.uid,
        email,
      };
    } catch (error: any) {
      if (createdUid) {
        try {
          await admin.auth().deleteUser(createdUid);
        } catch (cleanupError) {
          console.error("createOrgUser cleanup failed", cleanupError);
        }
      }
      if (error?.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "This email is already used.");
      }
      throw new HttpsError("internal", error?.message || "Unable to create user.");
    }
  }
);

/* ─────────── Callable: upsertMyCart ─────────── */
export const upsertMyCart = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{ cartId?: string; items: CartItemInput[] }>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const cartId = String(request.data?.cartId || "default").trim() || "default";
    const incoming = Array.isArray(request.data?.items) ? request.data.items : [];
    const normalized = await normalizeCartItems(incoming);

    const userSnap = await db.doc(`users/${uid}`).get();
    const orgId = String(userSnap.get("orgId") || "").trim() || null;

    const storedItems: CartItemStored[] = normalized.map((x) => ({
      offerId: x.offerId,
      qty: x.qty,
      addedAt: nowStamp(),
    }));

    const cartRef = db.doc(`users/${uid}/carts/${cartId}`);
    await cartRef.set({
      id: cartId,
      uid,
      orgId,
      items: storedItems,
      updatedAt: nowTs(),
    }, {merge: true});

    return {
      cartId,
      itemCount: storedItems.reduce((acc, x) => acc + x.qty, 0),
      distinctCount: storedItems.length,
    };
  },
);

/* ─────────── Callable: mergeLocalCart ─────────── */
export const mergeLocalCart = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{ cartId?: string; offerIds: string[] }>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const cartId = String(request.data?.cartId || "default").trim() || "default";
    const offerIds = Array.isArray(request.data?.offerIds) ? request.data.offerIds : [];

    const cartRef = db.doc(`users/${uid}/carts/${cartId}`);
    const cartSnap = await cartRef.get();
    const existingItems = (cartSnap.get("items") || []) as Array<{ offerId?: string; qty?: number }>;

    const mergedInputs: CartItemInput[] = [
      ...existingItems.map((x) => ({
        offerId: String(x.offerId || ""),
        qty: Number(x.qty || 1),
      })),
      ...offerIds.map((offerId) => ({offerId: String(offerId || "").trim(), qty: 1})),
    ];

    const normalized = await normalizeCartItems(mergedInputs);

    const userSnap = await db.doc(`users/${uid}`).get();
    const orgId = String(userSnap.get("orgId") || "").trim() || null;

    const storedItems: CartItemStored[] = normalized.map((x) => ({
      offerId: x.offerId,
      qty: x.qty,
      addedAt: nowStamp(),
    }));

    await cartRef.set({
      id: cartId,
      uid,
      orgId,
      items: storedItems,
      updatedAt: nowTs(),
    }, {merge: true});

    return {
      cartId,
      itemCount: storedItems.reduce((acc, x) => acc + x.qty, 0),
      distinctCount: storedItems.length,
    };
  },
);

/* ─────────── Callable: getMyCart ─────────── */
export const getMyCart = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{ cartId?: string }>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const cartId = String(request.data?.cartId || "default").trim() || "default";
    const cartRef = db.doc(`users/${uid}/carts/${cartId}`);
    const cartSnap = await cartRef.get();
    const cartItems = (cartSnap.get("items") || []) as Array<{ offerId?: string; qty?: number }>;

    const normalized = await normalizeCartItems(
      cartItems.map((x) => ({
        offerId: String(x.offerId || ""),
        qty: Number(x.qty || 1),
      })),
    );

    const items = normalized.map((x) => ({
      offerId: x.offerId,
      title: x.offer.title,
      itemType: x.itemType,
      itemId: x.itemId,
      qty: x.qty,
      amount: Number(x.offer.price || 0),
      currency: String(x.offer.currency || "USD").toUpperCase(),
      imageUrl: x.offer.imageUrl || "",
    }));

    const amountTotal = items.reduce((acc, x) => acc + x.amount * x.qty, 0);

    return {
      cartId,
      items,
      amountTotal,
      currency: items[0]?.currency || "USD",
      itemCount: items.reduce((acc, x) => acc + x.qty, 0),
      distinctCount: items.length,
    };
  },
);

/* ─────────── Callable: createCheckoutSession ─────────── */
export const createCheckoutSession = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<CheckoutPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const offerId = String(request.data?.offerId || "").trim();
    const cartId = String(request.data?.cartId || "default").trim() || "default";
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if ((!offerId && !cartId) || !successUrl || !cancelUrl) {
      throw new HttpsError(
        "invalid-argument",
        "offerId/cartId, successUrl and cancelUrl are required.",
      );
    }

    if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
      throw new HttpsError(
        "invalid-argument",
        "Checkout redirect URLs are not allowed.",
      );
    }

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = (userSnap.data() || {}) as UserProfileDoc;
    const orgId = String(userData.orgId || "").trim() || null;
    const email = typeof userData.email === "string" ? userData.email : undefined;
    const emailVerified =
      userData.emailVerified === true || request.auth?.token?.email_verified === true;

    if (userData.status === "blocked") {
      throw new HttpsError("permission-denied", "User account is blocked.");
    }

    // Backward compatibility: only block if profile is explicitly incomplete.
    if (userData.profileCompleted === false) {
      throw new HttpsError(
        "failed-precondition",
        "Complete profile before payment.",
      );
    }

    if (isEmailVerificationRequiredForCheckout() && !emailVerified) {
      throw new HttpsError(
        "failed-precondition",
        "Verify your email before payment.",
      );
    }

    let normalizedItems: Array<{
      offerId: string;
      offer: PublicOfferDoc;
      itemType: OfferType;
      itemId: string;
      qty: number;
    }> = [];

    if (offerId) {
      normalizedItems = await normalizeCartItems([{offerId, qty: 1}]);
    } else {
      const cartRef = db.doc(`users/${uid}/carts/${cartId}`);
      const cartSnap = await cartRef.get();
      const cartItems = (cartSnap.get("items") || []) as Array<{ offerId?: string; qty?: number }>;
      normalizedItems = await normalizeCartItems(
        cartItems.map((x) => ({
          offerId: String(x.offerId || ""),
          qty: Number(x.qty || 1),
        })),
      );
    }

    if (!normalizedItems.length) {
      throw new HttpsError("failed-precondition", "Cart is empty or invalid.");
    }

    const currency = String(normalizedItems[0].offer.currency || "USD").toUpperCase();
    const hasMixedCurrencies = normalizedItems.some(
      (x) => String(x.offer.currency || "USD").toUpperCase() !== currency,
    );
    if (hasMixedCurrencies) {
      throw new HttpsError("failed-precondition", "Mixed currencies are not supported.");
    }

    const amountTotal = normalizedItems.reduce(
      (acc, x) => acc + Number(x.offer.price || 0) * x.qty,
      0,
    );

    const toSafeTitle = (value: unknown) => {
      const title = typeof value === "string" ? value.trim() : "";
      return title || "Offer";
    };

    const orderItems = normalizedItems.map((x) => ({
      offerId: x.offerId,
      itemType: x.itemType,
      itemId: x.itemId,
      title: toSafeTitle(x.offer.title),
      amount: Number.isFinite(Number(x.offer.price || 0)) ? Number(x.offer.price || 0) : 0,
      currency,
      qty: x.qty,
      stripePriceId: String(x.offer.stripePriceId || "").trim() || null,
    }));

    const first = orderItems[0];
    const orderTitle =
      normalizedItems.length === 1 ? toSafeTitle(first?.title) : `Cart (${orderItems.length} items)`;

    const orderRef = db.collection(`users/${uid}/orders`).doc();
    await orderRef.set({
      id: orderRef.id,
      uid,
      orgId,
      itemType: first.itemType,
      itemId: first.itemId,
      offerId: first.offerId,
      title: orderTitle,
      amount: amountTotal,
      currency,
      cartId,
      items: orderItems,
      status: "pending",
      provider: "stripe",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    const stripe = getStripe();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = normalizedItems.map((x) => {
      const stripePriceId = String(x.offer.stripePriceId || "").trim();
      if (stripePriceId) {
        return {
          price: stripePriceId,
          quantity: x.qty,
        };
      }

      const unitAmount = Math.round(Number(x.offer.price || 0) * 100);
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
        throw new HttpsError(
          "failed-precondition",
          `Invalid price for offer ${x.offerId}.`,
        );
      }

      let imageUrl: string | null = null;
      if (x.offer.imageUrl) {
        try {
          const parsed = new URL(String(x.offer.imageUrl));
          if (parsed.protocol === "https:") {
            imageUrl = parsed.toString();
          }
        } catch {
          imageUrl = null;
        }
      }

      return {
        price_data: {
          currency: String(x.offer.currency || "USD").toLowerCase(),
          product_data: {
            name: String(x.offer.title || "Offer").trim() || "Offer",
            description: String(x.offer.description || "").trim(),
            ...(imageUrl ? {images: [imageUrl]} : {}),
          },
          unit_amount: unitAmount,
        },
        quantity: x.qty,
      };
    });

    const createSessionPayload: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: email,
      metadata: {
        uid,
        orderId: orderRef.id,
        cartId,
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 3;
    let session: Stripe.Checkout.Session | null = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        session = await stripe.checkout.sessions.create(createSessionPayload);
        break;
      } catch (error: any) {
        lastError = error;
        const errorType = String(error?.type || "");

        console.error("createCheckoutSession stripe failure", {
          uid,
          orderId: orderRef.id,
          attempt,
          maxAttempts,
          code: error?.code,
          type: errorType,
          message: error?.message,
        });

        if (errorType === "StripeInvalidRequestError") {
          throw new HttpsError(
            "failed-precondition",
            error?.message || "Invalid checkout payload.",
          );
        }

        const isRetryable = errorType === "StripeConnectionError" || errorType === "StripeAPIError";
        if (!isRetryable || attempt === maxAttempts) {
          break;
        }

        await waitMs(attempt * 400);
      }
    }

    if (!session) {
      const errorType = String(lastError?.type || "");
      if (errorType === "StripeConnectionError" || errorType === "StripeAPIError") {
        throw new HttpsError(
          "unavailable",
          "Stripe est temporairement indisponible. Merci de reessayer dans quelques instants.",
        );
      }

      throw new HttpsError("internal", "Unable to create checkout session.");
    }

    await orderRef.update({
      checkoutSessionId: session.id,
      updatedAt: nowTs(),
    });

    return {url: session.url};
  },
);

/* ─────────── HTTP: stripeWebhook ─────────── */
export const stripeWebhook = onRequest(
  {secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: HTTPS_PUBLIC},
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

      let alreadyProcessed = false;
      const eventRef = db.doc(`stripeWebhookEvents/${event.id}`);

      await db.runTransaction(async (tx) => {
        const existing = await tx.get(eventRef);
        if (existing.exists) {
          alreadyProcessed = true;
          return;
        }

        tx.set(eventRef, {
          id: event.id,
          type: event.type,
          livemode: event.livemode,
          createdAt: nowTs(),
        });
      });

      if (alreadyProcessed) {
        res.status(200).send({received: true, duplicate: true});
        return;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const uid = session.metadata?.uid;
        const orderId = session.metadata?.orderId;

        if (!uid || !orderId) {
          throw new Error("Missing metadata on checkout session.");
        }

        const orderRef = db.doc(`users/${uid}/orders/${orderId}`);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          throw new Error(`Order ${orderId} not found for user ${uid}.`);
        }

        const orderData = orderSnap.data() as OrderStored;

        const expectedAmountCents = Math.round(Number(orderData?.amount || 0) * 100);
        const sessionAmount = Number(session.amount_total || 0);
        const expectedCurrency = String(orderData?.currency || "USD").toLowerCase();
        const paidCurrency = String(session.currency || "usd").toLowerCase();

        if (expectedAmountCents !== sessionAmount || expectedCurrency !== paidCurrency) {
          await orderRef.set({
            status: "flagged",
            webhookEventId: event.id,
            updatedAt: nowTs(),
          }, {merge: true});
          throw new Error("Order amount/currency mismatch during webhook validation.");
        }

        if (orderData?.status === "paid") {
          res.status(200).send({received: true, alreadyPaid: true});
          return;
        }

        await orderRef.set({
          status: "paid",
          paymentIntentId: session.payment_intent ?? null,
          checkoutSessionId: session.id,
          webhookEventId: event.id,
          paidAt: nowTs(),
          updatedAt: nowTs(),
        }, {merge: true});

        const storedItems = Array.isArray(orderData.items) ? orderData.items : [];
        if (storedItems.length) {
          for (const item of storedItems) {
            if (!item?.itemType || !item?.itemId) continue;
            await grantPurchasedAccessInternal({
              uid,
              orderId,
              itemType: item.itemType,
              itemId: item.itemId,
            });
          }
        } else if (orderData.itemType && orderData.itemId) {
          await grantPurchasedAccessInternal({
            uid,
            orderId,
            itemType: orderData.itemType,
            itemId: orderData.itemId,
          });
        }

        /* ── Update program enrollment if this was a program checkout ── */
        const enrollmentId = session.metadata?.enrollmentId;
        if (enrollmentId) {
          const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
          const enrollmentSnap = await enrollmentRef.get();
          if (enrollmentSnap.exists) {
            await enrollmentRef.update({
              paymentStatus: "paid",
              status: "active",
              activatedAt: nowTs(),
              updatedAt: nowTs(),
            });
          }
        }
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
  {invoker: HTTPS_PUBLIC},
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

    const callerIsAdmin = await isAdminUid(callerUid);
    if (!callerIsAdmin) {
      throw new HttpsError("permission-denied", "Admin role required.");
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

/* ─────────── Callable: createProgramCheckoutSession ─────────── */
type ProgramCheckoutPayload = {
  enrollmentId: string;
  successUrl: string;
  cancelUrl: string;
};

export const createProgramCheckoutSession = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<ProgramCheckoutPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const enrollmentId = String(request.data?.enrollmentId || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (!enrollmentId || !successUrl || !cancelUrl) {
      throw new HttpsError(
        "invalid-argument",
        "enrollmentId, successUrl and cancelUrl are required.",
      );
    }

    if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
      throw new HttpsError(
        "invalid-argument",
        "Checkout redirect URLs are not allowed.",
      );
    }

    /* ── Read enrollment ── */
    const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
    const enrollmentSnap = await enrollmentRef.get();
    if (!enrollmentSnap.exists) {
      throw new HttpsError("not-found", "Enrollment not found.");
    }

    const enrollment = enrollmentSnap.data() as {
      userId?: string;
      programId?: string;
      paymentStatus?: string;
      amount?: number;
      currency?: string;
    };

    if (enrollment.userId !== uid) {
      throw new HttpsError("permission-denied", "This enrollment does not belong to you.");
    }

    if (enrollment.paymentStatus === "paid") {
      throw new HttpsError("already-exists", "Enrollment is already paid.");
    }

    /* ── Read program ── */
    const programId = String(enrollment.programId || "").trim();
    if (!programId) {
      throw new HttpsError("failed-precondition", "Enrollment has no programId.");
    }

    const programSnap = await db.doc(`programs/${programId}`).get();
    if (!programSnap.exists) {
      throw new HttpsError("not-found", "Program not found.");
    }

    const program = programSnap.data() as {
      title?: string;
      subtitle?: string;
      description?: string;
      imageUrl?: string;
      price?: number;
      discountPrice?: number | null;
      currency?: string;
      orgId?: string;
    };

    const price = Number(enrollment.amount || program.discountPrice || program.price || 0);
    const currency = String(
      enrollment.currency || program.currency || "USD",
    ).toLowerCase();

    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpsError("failed-precondition", "Invalid program price.");
    }

    /* ── User info ── */
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = (userSnap.data() || {}) as UserProfileDoc;
    const email = typeof userData.email === "string" ? userData.email : undefined;
    const orgId = String(userData.orgId || program.orgId || "").trim() || null;

    /* ── Create order ── */
    const orderRef = db.collection(`users/${uid}/orders`).doc();
    await orderRef.set({
      id: orderRef.id,
      uid,
      orgId,
      itemType: "program",
      itemId: programId,
      offerId: null,
      title: String(program.title || "Program").trim(),
      amount: price,
      currency: currency.toUpperCase(),
      enrollmentId,
      items: [{
        offerId: null,
        itemType: "program",
        itemId: programId,
        title: String(program.title || "Program").trim(),
        amount: price,
        currency: currency.toUpperCase(),
        qty: 1,
        stripePriceId: null,
      }],
      status: "pending",
      provider: "stripe",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    /* ── Create Stripe Checkout Session ── */
    const stripe = getStripe();
    const unitAmount = Math.round(price * 100);

    let imageUrl: string | null = null;
    if (program.imageUrl) {
      try {
        const parsed = new URL(String(program.imageUrl));
        if (parsed.protocol === "https:") imageUrl = parsed.toString();
      } catch {
        imageUrl = null;
      }
    }

    const createSessionPayload: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: email,
      metadata: {
        uid,
        orderId: orderRef.id,
        enrollmentId,
        type: "program_enrollment",
      },
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: String(program.title || "Program").trim(),
            description: String(
              program.subtitle || program.description || "",
            ).trim().slice(0, 500) || undefined,
            ...(imageUrl ? {images: [imageUrl]} : {}),
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 3;
    let session: Stripe.Checkout.Session | null = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        session = await stripe.checkout.sessions.create(createSessionPayload);
        break;
      } catch (error: any) {
        lastError = error;
        const errorType = String(error?.type || "");

        console.error("createProgramCheckoutSession stripe failure", {
          uid,
          orderId: orderRef.id,
          enrollmentId,
          attempt,
          maxAttempts,
          code: error?.code,
          type: errorType,
          message: error?.message,
        });

        if (errorType === "StripeInvalidRequestError") {
          throw new HttpsError(
            "failed-precondition",
            error?.message || "Invalid checkout payload.",
          );
        }

        const isRetryable =
          errorType === "StripeConnectionError" || errorType === "StripeAPIError";
        if (!isRetryable || attempt === maxAttempts) break;
        await waitMs(attempt * 400);
      }
    }

    if (!session) {
      const errorType = String(lastError?.type || "");
      if (errorType === "StripeConnectionError" || errorType === "StripeAPIError") {
        throw new HttpsError(
          "unavailable",
          "Stripe is temporarily unavailable. Please try again.",
        );
      }
      throw new HttpsError("internal", "Unable to create checkout session.");
    }

    /* ── Persist checkout refs ── */
    await orderRef.update({checkoutSessionId: session.id, updatedAt: nowTs()});
    await enrollmentRef.update({
      checkoutSessionId: session.id,
      paymentStatus: "pending",
      updatedAt: nowTs(),
    });

    return {url: session.url};
  },
);

/* ─────────── Callable: publishCourseToMarketplace ─────────── */
export const publishCourseToMarketplace = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<PublishCoursePayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    if (!(await isPublisherUid(uid))) {
      throw new HttpsError("permission-denied", "Publisher role required.");
    }

    const courseId = String(request.data?.courseId || "").trim();
    const stripePriceId = String(request.data?.stripePriceId || "").trim();
    const price = Number(request.data?.price || 0);
    const currency = String(request.data?.currency || "USD").trim().toUpperCase();
    const isPublic = request.data?.isPublic !== false;

    if (!courseId) {
      throw new HttpsError("invalid-argument", "courseId is required.");
    }
    if (!stripePriceId) {
      throw new HttpsError("invalid-argument", "stripePriceId is required.");
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpsError("invalid-argument", "price must be > 0.");
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    const orgId = String(userSnap.get("orgId") || "").trim();
    if (!orgId) {
      throw new HttpsError("failed-precondition", "User orgId is missing.");
    }

    const courseRef = db.doc(`courses/${courseId}`);
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found.");
    }

    const dupQuery = await db
      .collection("publicOffers")
      .where("type", "==", "course")
      .where("courseId", "==", courseId)
      .where("orgId", "==", orgId)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!dupQuery.empty) {
      return {ok: true, alreadyExists: true, offerId: dupQuery.docs[0].id};
    }

    const course = courseSnap.data() as {
      title?: string;
      description?: string;
      imageUrl?: string;
      category?: string;
      tags?: string[];
    };

    const offerRef = db.collection("publicOffers").doc();
    await offerRef.set({
      type: "course",
      orgId,
      courseId,
      title: String(course?.title || "").trim(),
      description: String(course?.description || "").trim(),
      imageUrl: String(course?.imageUrl || "").trim(),
      category: String(course?.category || "").trim() || null,
      tags: Array.isArray(course?.tags) ? course.tags : [],
      price,
      currency,
      stripePriceId,
      isActive: true,
      isPublic,
      publishedBy: uid,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    return {ok: true, offerId: offerRef.id};
  },
);

/* ─────────── AI Chatbot ─────────── */

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatPayload = {
  messages: ChatMessage[];
  context?: {
    userRole?: string;
    currentPage?: string;
    userName?: string;
  };
};

export const chatWithAI = onCall(
  {secrets: [ANTHROPIC_API_KEY], cors: true},
  async (request: CallableRequest<ChatPayload>) => {
    const {messages, context} = request.data;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages array is required");
    }

    if (messages.length > 50) {
      throw new HttpsError("invalid-argument", "Too many messages in conversation");
    }

    for (const m of messages) {
      if (!["user", "assistant"].includes(m.role)) {
        throw new HttpsError("invalid-argument", "Invalid message role");
      }
      if (typeof m.content !== "string" || m.content.length > 4000) {
        throw new HttpsError("invalid-argument", "Invalid message content");
      }
    }

    const anthropic = new Anthropic({apiKey: ANTHROPIC_API_KEY.value()});

    const userNameLine = context?.userName
      ? `The user's name is: ${context.userName}.`
      : "";
    const roleLine = context?.userRole
      ? `The user's role on the platform is: ${context.userRole}.`
      : "";
    const pageLine = context?.currentPage
      ? `The user is currently on the page: ${context.currentPage}.`
      : "";

    const systemPrompt = `You are InnovaAssist, a helpful AI assistant for the Innovacare Training platform — \
a healthcare e-learning system focused on wound care education and compliance training.

Your role is to help learners, managers, and admins navigate the platform and succeed in their training.

You can help with:
- Navigating courses, modules, lessons, and assessments
- Understanding wound care concepts (pressure injuries, wound healing, dressings, infection control)
- Tracking learning progress, certifications, and assignments
- Explaining platform features (programs, live sessions, case studies, simulations)
- Answering questions about policies, compliance requirements, and transcripts
- Guiding users through enrollment, checkout, and program management

${userNameLine}
${roleLine}
${pageLine}

Always respond in the same language the user writes in (English or French).
Keep answers concise, accurate, and professional. If a question is outside your knowledge, say so honestly.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {reply: text};
  },
);


