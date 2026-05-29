/* eslint max-len: 0 */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* functions/src/index.ts (Firebase Functions v2) */

import * as admin from "firebase-admin";
import {
  onCall,
  onRequest,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {defineSecret, defineString} from "firebase-functions/params";
import {PDFDocument, StandardFonts} from "pdf-lib";
import {nanoid} from "nanoid";
import Stripe from "stripe";
import {
  createMobileMoneyCharge,
  parseMobileMoneyWebhook,
  verifyMobileMoneyWebhookSignature,
  type MobileMoneyGateway,
  type MobileMoneyGatewayConfig,
} from "./mobile-money";
import {emitNotificationEvent} from "./notifications/events";
import {
  handleAutomationCheckoutCompleted,
  handleStripeRecurringEvent,
} from "./automation/recurring";
import {recordServerSecurityEvent} from "./security/functions";

/* ─────────── Init & global opts ─────────── */
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

setGlobalOptions({region: "us-central1"});

/* ─────────── Secrets ─────────── */
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const MOBILE_MONEY_GATEWAY = defineString("MOBILE_MONEY_GATEWAY");
const MOBILE_MONEY_API_BASE_URL = defineString("MOBILE_MONEY_API_BASE_URL");
const MOBILE_MONEY_API_KEY = defineSecret("MOBILE_MONEY_API_KEY");
const MOBILE_MONEY_API_SECRET = defineSecret("MOBILE_MONEY_API_SECRET");
const MOBILE_MONEY_WEBHOOK_SECRET = defineSecret("MOBILE_MONEY_WEBHOOK_SECRET");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const CINETPAY_API_KEY = defineSecret("CINETPAY_API_KEY");
const CINETPAY_SITE_ID = defineSecret("CINETPAY_SITE_ID");
const CINETPAY_SECRET_KEY = defineSecret("CINETPAY_SECRET_KEY");
const CINETPAY_ACCOUNT_CURRENCY_PARAM = defineString("CINETPAY_ACCOUNT_CURRENCY", {default: "XAF"});
const CINETPAY_USD_TO_ACCOUNT_RATE_PARAM = defineString("CINETPAY_USD_TO_ACCOUNT_RATE", {default: "655"});
const CINETPAY_ACCOUNT_COUNTRY_PARAM = defineString("CINETPAY_ACCOUNT_COUNTRY", {default: "CM"});
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
const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;
const CHAT_RATE_LIMIT_MAX_REQUESTS = 6;

type ChatRateLimitDoc = {
  windowStartMs?: number;
  count?: number;
  principal?: string;
};

type SitemapEntry = {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
};

type SitemapBlogSeed = {
  slug: string;
  lastmod: string;
  changefreq: "weekly";
  priority: string;
};

const APP_ORIGIN = "https://www.innovacarereview.com";
const STRIPE_CONNECT_ONBOARDING_PATH = "/program-admin/africa-mode";
const SITEMAP_STATIC_ENTRIES: SitemapEntry[] = [
  {loc: `${APP_ORIGIN}/`, lastmod: "2026-04-22", changefreq: "daily", priority: "1.0"},
  {loc: `${APP_ORIGIN}/home`, lastmod: "2026-04-22", changefreq: "daily", priority: "1.0"},
  {loc: `${APP_ORIGIN}/login`, lastmod: "2026-04-18", changefreq: "monthly", priority: "0.4"},
  {loc: `${APP_ORIGIN}/global-nurse-pack`, lastmod: "2026-04-23", changefreq: "weekly", priority: "0.9"},
  {loc: `${APP_ORIGIN}/catalogue`, lastmod: "2026-04-20", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/courses`, lastmod: "2026-04-20", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/pricing`, lastmod: "2026-04-19", changefreq: "weekly", priority: "0.9"},
  {loc: `${APP_ORIGIN}/contact`, lastmod: "2026-04-19", changefreq: "weekly", priority: "0.7"},
  {loc: `${APP_ORIGIN}/blog`, lastmod: "2026-04-21", changefreq: "daily", priority: "0.9"},
  {loc: `${APP_ORIGIN}/pre-nursing`, lastmod: "2026-04-15", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/nclex-rn`, lastmod: "2026-04-20", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/nclex-pn`, lastmod: "2026-04-18", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/nursing-school`, lastmod: "2026-04-17", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/medical-program`, lastmod: "2026-04-16", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/it-courses`, lastmod: "2026-04-14", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/for-educators`, lastmod: "2026-04-11", changefreq: "weekly", priority: "0.7"},
  {loc: `${APP_ORIGIN}/educators-nclex`, lastmod: "2026-04-10", changefreq: "weekly", priority: "0.8"},
  {loc: `${APP_ORIGIN}/educators-nursing-school`, lastmod: "2026-04-09", changefreq: "weekly", priority: "0.7"},
  {loc: `${APP_ORIGIN}/private-tutors`, lastmod: "2026-04-08", changefreq: "weekly", priority: "0.7"},
];

const SITEMAP_BLOG_SEEDS: SitemapBlogSeed[] = [
  {slug: "nclex-study-plan-8-weeks", lastmod: "2026-04-02", changefreq: "weekly", priority: "0.9"},
  {slug: "why-social-learning-works", lastmod: "2026-03-21", changefreq: "weekly", priority: "0.8"},
  {slug: "from-exam-to-employment", lastmod: "2026-03-07", changefreq: "weekly", priority: "0.85"},
  {slug: "cohort-analytics-for-educators", lastmod: "2026-02-26", changefreq: "weekly", priority: "0.8"},
  {slug: "nclex-test-day-prep", lastmod: "2026-02-12", changefreq: "weekly", priority: "0.85"},
  {slug: "institutional-buying-guide", lastmod: "2026-01-18", changefreq: "weekly", priority: "0.8"},
  {slug: "infection-control-nclex", lastmod: "2026-01-10", changefreq: "weekly", priority: "0.85"},
  {slug: "nclex-priority-questions", lastmod: "2025-12-28", changefreq: "weekly", priority: "0.85"},
  {slug: "next-generation-nclex-strategy", lastmod: "2025-12-14", changefreq: "weekly", priority: "0.9"},
  {slug: "cgfns-vs-nclex-guide", lastmod: "2025-11-30", changefreq: "weekly", priority: "0.8"},
  {slug: "nclex-pharmacology-mistakes", lastmod: "2025-11-16", changefreq: "weekly", priority: "0.85"},
  {slug: "first-job-after-nclex", lastmod: "2025-11-02", changefreq: "weekly", priority: "0.8"},
  {slug: "nclex-remediation-after-fail", lastmod: "2025-10-19", changefreq: "weekly", priority: "0.85"},
  {slug: "dha-doh-nurse-licensure-guide", lastmod: "2025-10-05", changefreq: "weekly", priority: "0.8"},
  {slug: "nclex-day-prep", lastmod: "2025-09-21", changefreq: "weekly", priority: "0.85"},
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeRateKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 180);
}

function toSitemapDate(value: unknown, fallback: string): string {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return fallback;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function uniqueSitemapEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const map = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    if (!entry.loc.startsWith(APP_ORIGIN)) {
      continue;
    }
    map.set(entry.loc, entry);
  }
  return [...map.values()].sort((left, right) => left.loc.localeCompare(right.loc));
}

function renderSitemapXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
}

async function loadMarketingSitemapEntries(): Promise<SitemapEntry[]> {
  try {
    const snapshot = await db.collection("marketingPosts")
      .where("active", "==", true)
      .limit(40)
      .get();

    if (snapshot.empty) {
      return SITEMAP_BLOG_SEEDS.map((post) => ({
        loc: `${APP_ORIGIN}/blog/${post.slug}`,
        lastmod: post.lastmod,
        changefreq: post.changefreq,
        priority: post.priority,
      }));
    }

    return snapshot.docs
      .map((docSnap) => ({id: docSnap.id, ...docSnap.data()} as Record<string, unknown>))
      .filter((post) => String(post["slug"] || "").trim())
      .map((post) => ({
        loc: `${APP_ORIGIN}/blog/${String(post["slug"] || "").trim()}`,
        lastmod: toSitemapDate(post["updatedAt"] || post["publishedAt"] || post["createdAt"], "2026-04-18"),
        changefreq: "weekly" as const,
        priority: "0.85",
      }));
  } catch (error) {
    console.error("Unable to load marketing posts for sitemap:", error);
    return SITEMAP_BLOG_SEEDS.map((post) => ({
      loc: `${APP_ORIGIN}/blog/${post.slug}`,
      lastmod: post.lastmod,
      changefreq: post.changefreq,
      priority: post.priority,
    }));
  }
}

async function loadPublicCatalogueEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  const seenCourseIds = new Set<string>();

  try {
    const offerSnap = await db.collection("publicOffers")
      .where("type", "==", "course")
      .where("isActive", "==", true)
      .where("isPublic", "==", true)
      .limit(60)
      .get();

    for (const docSnap of offerSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const courseId = String(data["courseId"] || "").trim();
      if (!courseId) {
        continue;
      }

      seenCourseIds.add(courseId);
      entries.push({
        loc: `${APP_ORIGIN}/catalogue/${courseId}`,
        lastmod: toSitemapDate(data["updatedAt"] || data["createdAt"], "2026-04-18"),
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  } catch (error) {
    console.error("Unable to load public offers for sitemap:", error);
  }

  try {
    const courseSnap = await db.collection("courses")
      .where("active", "==", true)
      .limit(80)
      .get();

    for (const docSnap of courseSnap.docs) {
      if (seenCourseIds.has(docSnap.id)) {
        continue;
      }

      const data = docSnap.data() as Record<string, unknown>;
      const isPublic = data["isPublic"] !== false && data["visibility"] !== "private";
      if (!isPublic) {
        continue;
      }

      entries.push({
        loc: `${APP_ORIGIN}/catalogue/${docSnap.id}`,
        lastmod: toSitemapDate(data["updatedAt"] || data["createdAt"], "2026-04-18"),
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  } catch (error) {
    console.error("Unable to load public courses for sitemap:", error);
  }

  return entries;
}

async function buildSitemapXml(): Promise<string> {
  const [marketingEntries, catalogueEntries] = await Promise.all([
    loadMarketingSitemapEntries(),
    loadPublicCatalogueEntries(),
  ]);

  return renderSitemapXml(uniqueSitemapEntries([
    ...SITEMAP_STATIC_ENTRIES,
    ...marketingEntries,
    ...catalogueEntries,
  ]));
}

async function enforceChatRateLimit(request: CallableRequest<ChatPayload>): Promise<void> {
  const uid = request.auth?.uid;
  const ip = String((request as {rawRequest?: {ip?: string}}).rawRequest?.ip || "unknown");
  const principal = uid ? `uid:${uid}` : `ip:${ip}`;
  const key = sanitizeRateKey(principal);
  const ref = db.doc(`runtimeRateLimits/chatWithAI_${key}`);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() || {}) as ChatRateLimitDoc;

    const windowStartMs = Number(data.windowStartMs || 0);
    const count = Number(data.count || 0);
    const isWindowExpired = !windowStartMs || (now - windowStartMs) >= CHAT_RATE_LIMIT_WINDOW_MS;

    if (isWindowExpired) {
      tx.set(ref, {
        principal,
        windowStartMs: now,
        count: 1,
        updatedAt: nowTs(),
      }, {merge: true});
      return;
    }

    if (count >= CHAT_RATE_LIMIT_MAX_REQUESTS) {
      throw new HttpsError("resource-exhausted", "Too many chat requests. Please wait a minute.");
    }

    tx.set(ref, {
      principal,
      windowStartMs,
      count: count + 1,
      updatedAt: nowTs(),
    }, {merge: true});
  });
}

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

type ExamPrepAssessmentListPayload = {
  programSpaceId?: string;
};

type StartExamPrepAttemptPayload = {
  assessmentId?: string;
  programSpaceId?: string;
};

type GetActiveExamPrepAttemptsPayload = {
  programSpaceId?: string;
};

type CreateCustomExamPrepAssessmentPayload = {
  title?: string;
  programSpaceId?: string;
  questionCount?: number;
  durationMinutes?: number;
  difficulty?: string;
  deliveryPreset?: string;
  questionFamily?: string;
  questionUsageFilter?: string;
  courseGroupTitle?: string;
  moduleTitle?: string;
};

type GetCustomExamPrepAvailabilityPayload = {
  programSpaceId?: string;
  difficulty?: string;
  questionFamily?: string;
  questionUsageFilter?: string;
  courseGroupTitle?: string;
  moduleTitle?: string;
};

type NormalizeLegacyProgramAccessRolesPayload = {
  uid?: string;
};

type SaveExamPrepAttemptProgressPayload = {
  attemptId?: string;
  answers?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  visitedQuestionIds?: string[];
  currentQuestionIndex?: number;
  questionDurations?: Record<string, number>;
  eventType?: string;
};

type AbandonExamPrepAttemptPayload = {
  attemptId?: string;
  answers?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  visitedQuestionIds?: string[];
  currentQuestionIndex?: number;
  questionDurations?: Record<string, number>;
};

type ConfirmExamPrepQuestionPayload = {
  attemptId?: string;
  questionId?: string;
  selectedAnswerKeys?: string[];
  questionDurations?: Record<string, number>;
  elapsedSeconds?: number;
  finalizeAttempt?: boolean;
};

type SubmitExamPrepAttemptPayload = {
  attemptId?: string;
  answers?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  questionDurations?: Record<string, number>;
  elapsedSeconds?: number;
  submitMode?: string;
};

type GetExamPrepAttemptReviewPayload = {
  attemptId?: string;
};

type ExamPrepAssessmentRecord = {
  id?: string;
  title?: string;
  description?: string;
  instructions?: string;
  assessmentMode?: string;
  durationMinutes?: number;
  passingScorePercent?: number;
  drawCount?: number;
  caseStudyCount?: number;
  reviewMode?: string;
  showCorrectAnswersAfterSubmit?: boolean;
  showRationalesAfterSubmit?: boolean;
  active?: boolean;
  publishStatus?: string;
  programId?: string;
  publicProgramId?: string | null;
  courseGroupId?: string | null;
  moduleId?: string | null;
  sourceMode?: string;
  blueprintId?: string | null;
  fixedQuestionIds?: string[];
  randomizeQuestionOrder?: boolean;
  randomizeChoiceOrder?: boolean;
  blueprintMode?: string;
  deliveryMode?: string;
  examTrack?: string;
  jurisdiction?: string;
  maxAttempts?: number;
  allowRetake?: boolean;
  autoSubmitOnTimeout?: boolean;
  requireAllQuestionsAnswered?: boolean;
  showScoreImmediately?: boolean;
  allowQuestionFlagging?: boolean;
  allowBackNavigation?: boolean;
  strictNavigation?: boolean;
  createdBy?: string;
  updatedBy?: string;
  learnerOwnerId?: string | null;
  visibilityScope?: string | null;
  customGenerated?: boolean;
  builderConfig?: Record<string, unknown>;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ExamPrepRuntimeState = {
  questionIds: string[];
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  questionDurations: Record<string, number>;
  visitedQuestionIds: string[];
  lockedQuestionIds: string[];
  questionStatuses: Record<string, string>;
};

type ExamPrepQuestionRecord = {
  id?: string;
  programTitle?: string;
  stem?: string;
  scenarioText?: string | null;
  leadInQuestion?: string;
  itemType?: string;
  interactionConfig?: Record<string, unknown> | null;
  difficulty?: string;
  choices?: Array<{id?: string; label?: string; text?: string; rationale?: string}>;
  choiceRationales?: Record<string, string>;
  correctAnswerKey?: string[];
  points?: number;
  moduleId?: string;
  moduleTitle?: string;
  courseGroupId?: string;
  courseGroupTitle?: string;
  cognitiveLevel?: string;
  parentCaseId?: string | null;
  tags?: string[];
  remediationModuleIds?: string[];
  remediationLessonIds?: string[];
  remediationTags?: string[];
  explanation?: string;
  rationale?: string;
  active?: boolean;
  workflowStatus?: string;
  programId?: string;
  examTrack?: string;
  jurisdiction?: string;
};

type ExamPrepBlueprintRecord = {
  totalQuestionCount?: number;
  courseGroupDistributions?: Array<{key?: string; targetCount?: number; minCount?: number; targetPercent?: number}>;
  examTrack?: string;
  jurisdiction?: string;
  programId?: string;
};

type LearnerQuestionUsageStats = {
  seenCount: number;
  incorrectCount: number;
  markedCount: number;
  omittedCount: number;
  correctOnReattempt: boolean;
  hasSeenIncorrect: boolean;
};

type CheckoutPayload = {
  offerId?: string;
  cartId?: string;
  productId?: string;
  successUrl: string;
  cancelUrl: string;
};

type TutorBookingCheckoutPayload = {
  tutorId?: string;
  subject?: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: number;
  sessionType?: "individual" | "group";
  notes?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type TutorBookingStatusUpdatePayload = {
  bookingId?: string;
  status?: "cancelled" | "completed";
  meetingUrl?: string | null;
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
  role?: "admin" | "manager" | "learner" | "guest" | "instructor" | "tutor" | "staff";
  status?: "active" | "inactive";
};

type NotificationRole = "learner" | "nurse" | "staff" | "admin" | "manager";

type NotificationAudienceInput =
  | {type: "all"}
  | {type: "role"; role: NotificationRole}
  | {type: "user"; uid: string};
type NotificationCategory =
  | "announcements"
  | "account"
  | "commerce"
  | "live_sessions"
  | "exam_prep"
  | "certificates"
  | "content";

type SendNotificationPayload = {
  title?: string;
  body?: string;
  link?: string | null;
  severity?: "info" | "warning" | "critical";
  category?: NotificationCategory;
  audience?: NotificationAudienceInput;
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

type OfferType = "course" | "program" | "live_class" | "wallet_topup" | "tutor_session" | "digital_product";

type OwnerType = "platform" | "partner";
type PayoutMode = "manual" | "stripe_connect";
type PartnerPayoutMethod = "MTN_MOBILE_MONEY" | "ORANGE_MONEY" | "WISE" | "BANK_TRANSFER" | "MANUAL_OTHER";

const DEFAULT_PLATFORM_FEE_PERCENT = 30;
const DEFAULT_PARTNER_SHARE_PERCENT = 70;

type ProductDoc = {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  amount?: number;
  currency?: string;
  active?: boolean;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  type?: string;
  metadata?: Record<string, unknown>;
  imageUrl?: string;
};

type TutorDoc = {
  name?: string;
  hourlyRate?: number;
  isActive?: boolean;
  ownerUid?: string;
  ownerEmail?: string;
};

type TutorBookingStored = {
  id?: string;
  tutorId?: string;
  tutorName?: string;
  tutorOwnerUid?: string | null;
  tutorOwnerEmail?: string | null;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  sessionDate?: string;
  sessionTime?: string;
  slotKey?: string;
  subject?: string;
  sessionType?: "individual" | "group";
  durationMinutes?: number;
  totalPrice?: number;
  discount?: number;
  status?: "payment_pending" | "confirmed" | "completed" | "cancelled" | "payment_failed";
  notes?: string;
  meetingUrl?: string | null;
  orderId?: string;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
};

type ProgramLiveSessionAccessMode = "included" | "free" | "paid";

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
  ownerType?: OwnerType;
  ownerId?: string;
  payoutMode?: PayoutMode;
  platformFeePercent?: number;
  partnerSharePercent?: number;
  payoutMethodConfigured?: boolean;
  payoutMethod?: PartnerPayoutMethod;
};

type ProgramDoc = {
  title?: string;
  includesCourseIds?: string[];
};

type CheckoutFailureReason =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "MISSING_PRICE_ID"
  | "CHECKOUT_FAILED";

type ResolvedProductCheckout = {
  id: string;
  name: string;
  description: string;
  amount: number;
  amountCents: number;
  currency: string;
  active: true;
  stripePriceId: string;
  stripeProductId: string | null;
  type: string;
  metadata: Record<string, unknown>;
  imageUrl: string | null;
  raw: ProductDoc;
};

const GLOBAL_NURSE_PACK_PRODUCT_BLUEPRINT: ProductDoc = {
  id: "global-nurse-pack",
  name: "Global Nurse Licensing Starter Pack",
  title: "Global Nurse Licensing Starter Pack",
  description: "Premium digital roadmap for international nurse licensing, documents, timelines, and relocation readiness.",
  price: 149,
  amount: 14900,
  currency: "usd",
  active: true,
  stripeProductId: "prod_UOA9kAh3CiiZKj",
  stripePriceId: "price_1TPNpJHDtwxMCPk0ijAHIqn8",
  type: "program",
  metadata: {
    category: "nurse_global",
    region: "multi",
  },
  imageUrl: "https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922255/ChatGPT_Image_Apr_22_2026_08_49_40_PM_mymund.png",
};

function createCheckoutFailure(
  code: "not-found" | "failed-precondition" | "internal" | "unavailable",
  reason: CheckoutFailureReason,
  message: string,
  extra: Record<string, unknown> = {},
): HttpsError {
  return new HttpsError(code, message, {
    reason,
    ...extra,
  });
}

function normalizeProductAmountCents(product: ProductDoc): number {
  const rawAmount = Number(product.amount);
  if (Number.isFinite(rawAmount) && rawAmount > 0) {
    return Math.round(rawAmount);
  }

  const rawPrice = Number(product.price);
  if (Number.isFinite(rawPrice) && rawPrice > 0) {
    return Math.round(rawPrice * 100);
  }

  return 0;
}

async function resolveCheckoutProduct(productId: string): Promise<ResolvedProductCheckout> {
  const cleanProductId = String(productId || "").trim();
  const productRef = db.doc(`products/${cleanProductId}`);
  const productSnap = await productRef.get();
  const rawProduct = (productSnap.data() || {}) as ProductDoc;

  console.info("checkout.product.lookup", {productId: cleanProductId});
  console.info("checkout.product.data", {
    productId: cleanProductId,
    exists: productSnap.exists,
    active: rawProduct.active ?? null,
    stripeProductId: String(rawProduct.stripeProductId || "").trim() || null,
    stripePriceId: String(rawProduct.stripePriceId || "").trim() || null,
    currency: String(rawProduct.currency || "").trim() || null,
    amount: Number.isFinite(Number(rawProduct.amount)) ? Number(rawProduct.amount) : null,
    price: Number.isFinite(Number(rawProduct.price)) ? Number(rawProduct.price) : null,
  });

  if (!productSnap.exists) {
    throw createCheckoutFailure(
      "not-found",
      "PRODUCT_NOT_FOUND",
      "Product not found.",
      {productId: cleanProductId},
    );
  }

  if (rawProduct.active !== true) {
    throw createCheckoutFailure(
      "failed-precondition",
      "PRODUCT_INACTIVE",
      "Product is inactive.",
      {productId: cleanProductId},
    );
  }

  const stripePriceId = String(rawProduct.stripePriceId || "").trim();
  console.info("checkout.product.price", {
    productId: cleanProductId,
    stripePriceId: stripePriceId || null,
  });

  if (!stripePriceId) {
    throw createCheckoutFailure(
      "failed-precondition",
      "MISSING_PRICE_ID",
      "Product is missing stripePriceId.",
      {productId: cleanProductId},
    );
  }

  const amountCents = normalizeProductAmountCents(rawProduct);
  if (!amountCents) {
    throw createCheckoutFailure(
      "failed-precondition",
      "CHECKOUT_FAILED",
      "Product amount is invalid.",
      {productId: cleanProductId},
    );
  }

  const currency = String(rawProduct.currency || "usd").trim().toLowerCase() || "usd";
  const name = String(rawProduct.name || rawProduct.title || cleanProductId).trim() || cleanProductId;

  return {
    id: cleanProductId,
    name,
    description: String(rawProduct.description || "").trim(),
    amount: amountCents / 100,
    amountCents,
    currency,
    active: true,
    stripePriceId,
    stripeProductId: String(rawProduct.stripeProductId || "").trim() || null,
    type: String(rawProduct.type || "program").trim() || "program",
    metadata: rawProduct.metadata && typeof rawProduct.metadata === "object" ? rawProduct.metadata : {},
    imageUrl: String(rawProduct.imageUrl || "").trim() || null,
    raw: rawProduct,
  };
}

async function buildProductDebugSummary(productId: string): Promise<Record<string, unknown>> {
  const cleanProductId = String(productId || "").trim();
  const productSnap = await db.doc(`products/${cleanProductId}`).get();
  const product = (productSnap.data() || {}) as ProductDoc;
  const stripePriceId = String(product.stripePriceId || "").trim();
  const stripeProductId = String(product.stripeProductId || "").trim();
  const amountCents = normalizeProductAmountCents(product);

  return {
    productId: cleanProductId,
    exists: productSnap.exists,
    active: product.active === true,
    stripeLinked: Boolean(stripePriceId),
    stripeProductLinked: Boolean(stripeProductId),
    priceValid: amountCents > 0,
    stripePriceId: stripePriceId || null,
    stripeProductId: stripeProductId || null,
    amount: amountCents || null,
    currency: String(product.currency || "").trim() || null,
    name: String(product.name || product.title || "").trim() || null,
  };
}

type ProgramLiveSessionDoc = {
  programId?: string;
  title?: string;
  description?: string;
  accessMode?: ProgramLiveSessionAccessMode;
  bookingRequired?: boolean;
  price?: number;
  currency?: "USD" | "CAD" | "AED" | "EUR" | "GBP";
  status?: string;
  active?: boolean;
  meetingUrl?: string;
  instructorName?: string;
  timezone?: string;
  capacity?: number;
  startAt?: admin.firestore.Timestamp;
  endAt?: admin.firestore.Timestamp;
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
  title?: string;
  offerId?: string | null;
  orgId?: string | null;
  provider?: string | null;
  paymentId?: string | null;
  reference?: string | null;
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
    ownerType?: OwnerType;
    ownerId?: string | null;
    payoutMode?: PayoutMode;
    platformFeePercent?: number;
    partnerSharePercent?: number;
    payoutMethodConfigured?: boolean;
    payoutMethod?: PartnerPayoutMethod | null;
  }>;
  ownerType?: OwnerType;
  ownerId?: string | null;
  payoutMode?: PayoutMode;
  platformFeePercent?: number;
  partnerSharePercent?: number;
  payoutMethodConfigured?: boolean;
  payoutMethod?: PartnerPayoutMethod | null;
};

type UserProfileDoc = {
  email?: string;
  displayName?: string;
  status?: "active" | "blocked";
  profileCompleted?: boolean;
  emailVerified?: boolean;
  role?: string;
  orgId?: string | null;
};

type HybridPaymentMethod = "stripe" | "mobile_money";

type PaymentStored = {
  id?: string;
  userId?: string;
  programId?: string;
  enrollmentId?: string | null;
  orderId?: string | null;
  amount?: number;
  currency?: string;
  method?: HybridPaymentMethod;
  provider?: string;
  gateway?: string;
  status?: "pending" | "success" | "failed";
  reference?: string;
  phone?: string | null;
  checkoutSessionId?: string | null;
  checkoutUrl?: string | null;
  providerTransactionId?: string | null;
  paymentIntentId?: string | null;
  webhookEventId?: string | null;
  orgId?: string | null;
  title?: string;
};

type ProgramPaymentContext = {
  uid: string;
  programId: string;
  enrollmentId: string;
  programTitle: string;
  programSubtitle?: string;
  programDescription?: string;
  programImageUrl?: string;
  amount: number;
  currency: string;
  orgId: string | null;
  email?: string;
  displayName?: string;
  ownerType?: OwnerType;
  ownerId?: string;
  payoutMode?: PayoutMode;
  platformFeePercent?: number;
  partnerSharePercent?: number;
  payoutMethodConfigured?: boolean;
  payoutMethod?: PartnerPayoutMethod;
};

type CreatePaymentIntentPayload = {
  userId?: string;
  itemType?: "program" | "wallet_topup";
  programId?: string;
  enrollmentId?: string;
  amountUSD?: number;
  paymentMethod?: HybridPaymentMethod;
  phone?: string;
  provider?: string;
  successUrl?: string;
  cancelUrl?: string;
};

const PROGRAM_LIVE_SESSION_ITEM_PREFIX = "program_live_session:";

function buildProgramLiveSessionItemId(programId: string, sessionId: string): string {
  return `${PROGRAM_LIVE_SESSION_ITEM_PREFIX}${programId}:${sessionId}`;
}

function parseProgramLiveSessionItemId(itemId: string): {programId: string; sessionId: string} | null {
  if (!itemId.startsWith(PROGRAM_LIVE_SESSION_ITEM_PREFIX)) {
    return null;
  }

  const raw = itemId.slice(PROGRAM_LIVE_SESSION_ITEM_PREFIX.length);
  const [programId, sessionId] = raw.split(":");
  if (!programId || !sessionId) {
    return null;
  }

  return {programId, sessionId};
}

function buildPaymentReference(uid: string, programId: string): string {
  const uidPart = uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "user";
  const programPart = programId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "program";
  return `pay_${uidPart}_${programPart}_${nanoid(10)}`;
}

function buildPaymentWebhookUrl(): string {
  const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
  if (!projectId) {
    throw new Error("Missing Firebase project id for payment webhook URL generation.");
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/paymentWebhook`;
}

function getMobileMoneyConfig(): MobileMoneyGatewayConfig {
  const gateway = String(MOBILE_MONEY_GATEWAY.value() || "centpay").trim().toLowerCase() as MobileMoneyGateway;
  const baseUrl = String(MOBILE_MONEY_API_BASE_URL.value() || "").trim();
  const apiKey = String(MOBILE_MONEY_API_KEY.value() || "").trim();
  const apiSecret = String(MOBILE_MONEY_API_SECRET.value() || "").trim();
  const webhookSecret = String(MOBILE_MONEY_WEBHOOK_SECRET.value() || "").trim();

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Mobile Money provider configuration is incomplete.",
    );
  }

  return {
    gateway,
    baseUrl,
    apiKey,
    apiSecret,
    webhookSecret,
  };
}

async function resolveProgramPaymentContext(
  uid: string,
  payload: CreatePaymentIntentPayload,
): Promise<ProgramPaymentContext> {
  const programId = String(payload.programId || "").trim();
  const enrollmentId = String(payload.enrollmentId || "").trim();

  if (!programId || !enrollmentId) {
    throw new HttpsError(
      "invalid-argument",
      "programId and enrollmentId are required.",
    );
  }

  const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
  const enrollmentSnap = await enrollmentRef.get();
  if (!enrollmentSnap.exists) {
    throw new HttpsError("not-found", "Enrollment not found.");
  }

  const enrollment = enrollmentSnap.data() as {
    userId?: string;
    programId?: string;
    amount?: number;
    currency?: string;
    paymentStatus?: string;
    status?: string;
    orgId?: string | null;
    learnerEmail?: string;
    learnerName?: string;
    learnerPhone?: string;
  };

  if (String(enrollment.userId || "").trim() !== uid) {
    throw new HttpsError("permission-denied", "This enrollment does not belong to you.");
  }

  if (String(enrollment.programId || "").trim() !== programId) {
    throw new HttpsError("failed-precondition", "Enrollment/program mismatch.");
  }

  if (String(enrollment.paymentStatus || "").trim() === "paid") {
    throw new HttpsError("already-exists", "Enrollment is already paid.");
  }

  const programRef = db.doc(`programs/${programId}`);
  const [programSnap, userSnap] = await Promise.all([
    programRef.get(),
    db.doc(`users/${uid}`).get(),
  ]);

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
    orgId?: string | null;
    ownerType?: OwnerType;
    ownerId?: string;
    payoutMode?: PayoutMode;
    platformFeePercent?: number;
    partnerSharePercent?: number;
    payoutMethodConfigured?: boolean;
    payoutMethod?: PartnerPayoutMethod;
  };
  const userData = (userSnap.data() || {}) as UserProfileDoc;

  const amount = Number(enrollment.amount || program.discountPrice || program.price || 0);
  const currency = String(enrollment.currency || program.currency || "USD").trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("failed-precondition", "Invalid program price.");
  }

  return {
    uid,
    programId,
    enrollmentId,
    programTitle: String(program.title || "Program").trim() || "Program",
    programSubtitle: String(program.subtitle || "").trim() || undefined,
    programDescription: String(program.description || "").trim() || undefined,
    programImageUrl: String(program.imageUrl || "").trim() || undefined,
    amount,
    currency,
    orgId: String(enrollment.orgId || program.orgId || userData.orgId || "").trim() || null,
    email: (typeof userData.email === "string" && userData.email.trim())
      ? userData.email.trim()
      : (typeof enrollment.learnerEmail === "string" && enrollment.learnerEmail.trim())
        ? enrollment.learnerEmail.trim()
        : undefined,
    displayName: (typeof userData.displayName === "string" && userData.displayName.trim())
      ? userData.displayName.trim()
      : (typeof enrollment.learnerName === "string" && enrollment.learnerName.trim())
        ? enrollment.learnerName.trim()
        : undefined,
    ownerType: sanitizeOwnerType(program.ownerType),
    ownerId: String(program.ownerId || "").trim() || undefined,
    payoutMode: sanitizePayoutMode(program.payoutMode),
    platformFeePercent: sanitizePercent(program.platformFeePercent, DEFAULT_PLATFORM_FEE_PERCENT),
    partnerSharePercent: sanitizePercent(program.partnerSharePercent, DEFAULT_PARTNER_SHARE_PERCENT),
    payoutMethodConfigured: Boolean(program.payoutMethodConfigured),
    payoutMethod: sanitizePayoutMethod(program.payoutMethod),
  };
}

async function resolveWalletTopUpPaymentContext(
  uid: string,
  payload: CreatePaymentIntentPayload,
): Promise<{
  uid: string;
  amount: number;
  currency: string;
  title: string;
  orgId: string | null;
  email?: string;
  displayName?: string;
}> {
  const amountUSD = Number(payload.amountUSD || 0);
  if (!Number.isFinite(amountUSD) || amountUSD < 1 || amountUSD > 10000) {
    throw new HttpsError("invalid-argument", "Amount must be between $1.00 and $10,000.00.");
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const userData = (userSnap.data() || {}) as UserProfileDoc;
  if (userData.status === "blocked") {
    throw new HttpsError("permission-denied", "User account is blocked.");
  }

  return {
    uid,
    amount: amountUSD,
    currency: "USD",
    title: `Wallet Top-up — $${amountUSD.toFixed(2)}`,
    orgId: String(userData.orgId || "").trim() || null,
    email: typeof userData.email === "string" ? userData.email : undefined,
    displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
  };
}

async function finalizeProgramEnrollmentPayment(args: {
  paymentId: string;
  webhookEventId?: string | null;
  providerTransactionId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  rawPayload?: unknown;
}): Promise<{uid: string; programId: string; programTitle: string; orgId: string | null}> {
  const paymentRef = db.doc(`payments/${args.paymentId}`);
  let result: {uid: string; programId: string; programTitle: string; orgId: string | null} | null = null;

  await db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) {
      throw new Error(`Payment ${args.paymentId} not found.`);
    }

    const payment = paymentSnap.data() as PaymentStored;
    const uid = String(payment.userId || "").trim();
    const enrollmentId = String(payment.enrollmentId || "").trim();
    const programId = String(payment.programId || "").trim();
    const orderId = String(payment.orderId || "").trim();

    if (!uid || !enrollmentId || !programId) {
      throw new Error("Payment is missing enrollment context.");
    }

    const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
    const enrollmentSnap = await tx.get(enrollmentRef);
    if (!enrollmentSnap.exists) {
      throw new Error(`Enrollment ${enrollmentId} not found.`);
    }

    const enrollment = enrollmentSnap.data() as {
      programId?: string;
      amount?: number;
      currency?: string;
      programTitle?: string;
      orgId?: string | null;
      paymentStatus?: string;
      status?: string;
    };

    if (String(enrollment.programId || "").trim() !== programId) {
      throw new Error("Payment program does not match enrollment program.");
    }

    const expectedAmount = Number(enrollment.amount || 0);
    const paymentAmount = Number(payment.amount || 0);
    const expectedAmountCents = Math.round(expectedAmount * 100);
    const paymentAmountCents = Math.round(paymentAmount * 100);
    const expectedCurrency = String(enrollment.currency || "USD").trim().toUpperCase();
    const paymentCurrency = String(payment.currency || "USD").trim().toUpperCase();
    if (expectedAmount > 0 && (expectedAmountCents !== paymentAmountCents || expectedCurrency !== paymentCurrency)) {
      throw new Error("Payment amount or currency mismatch for enrollment activation.");
    }

    tx.set(paymentRef, {
      status: "success",
      webhookEventId: args.webhookEventId || null,
      providerTransactionId: args.providerTransactionId || null,
      checkoutSessionId: args.checkoutSessionId || null,
      paymentIntentId: args.paymentIntentId || null,
      rawPayload: args.rawPayload || null,
      succeededAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    tx.set(enrollmentRef, {
      paymentStatus: "paid",
      status: "active",
      activatedAt: nowTs(),
      paymentId: args.paymentId,
      paymentMethod: payment.method || null,
      paymentProvider: payment.provider || null,
      paymentReference: payment.reference || null,
      updatedAt: nowTs(),
    }, {merge: true});

    if (orderId) {
      tx.set(db.doc(`users/${uid}/orders/${orderId}`), {
        status: "paid",
        provider: payment.method === "mobile_money" ? "mobile_money" : "stripe",
        paymentId: args.paymentId,
        reference: payment.reference || null,
        providerTransactionId: args.providerTransactionId || null,
        checkoutSessionId: args.checkoutSessionId || null,
        paymentIntentId: args.paymentIntentId || null,
        webhookEventId: args.webhookEventId || null,
        paidAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});
    }

    result = {
      uid,
      programId,
      programTitle: String(enrollment.programTitle || payment.title || "your program").trim() || "your program",
      orgId: String(enrollment.orgId || payment.orgId || "").trim() || null,
    };
  });

  if (!result) {
    throw new Error("Payment finalization did not produce an activation result.");
  }

  const finalized = result as {
    uid: string;
    programId: string;
    programTitle: string;
    orgId: string | null;
  };

  await sendSystemNotificationToUser({
    uid: finalized.uid,
    title: "Enrollment activated",
    body: `Your payment was confirmed and access to ${finalized.programTitle} is now active.`,
    link: `/my-programs/${finalized.programId}`,
    severity: "info",
    category: "commerce",
    organizationId: finalized.orgId,
  });

  await sendSystemNotificationToOrganizationRoles({
    orgId: finalized.orgId,
    roles: ["admin", "manager"],
    title: "New paid enrollment",
    body: `${finalized.programTitle} was paid and auto-activated for a learner.`,
    link: "/program-admin/enrollments",
    severity: "info",
    category: "commerce",
  });

  await emitNotificationEvent({
    type: "PURCHASE_CONFIRMATION",
    templateKey: "purchase_confirmation",
    recipientType: "LEARNER",
    recipientUserId: finalized.uid,
    orgId: finalized.orgId,
    courseId: finalized.programId,
    relatedEntityType: "payment",
    relatedEntityId: args.paymentId,
    idempotencyKey: `purchase_confirmation:${args.paymentId}`,
    templateData: {
      learnerName: "Learner",
      courseTitle: finalized.programTitle,
      ctaUrl: `${APP_ORIGIN}/my-programs/${finalized.programId}`,
    },
  });

  await emitNotificationEvent({
    type: "COURSE_ACCESS_GRANTED",
    templateKey: "course_access_granted",
    recipientType: "LEARNER",
    recipientUserId: finalized.uid,
    orgId: finalized.orgId,
    courseId: finalized.programId,
    relatedEntityType: "enrollment",
    relatedEntityId: finalized.programId,
    idempotencyKey: `course_access_granted:${args.paymentId}`,
    templateData: {
      learnerName: "Learner",
      courseTitle: finalized.programTitle,
      firstLessonTitle: "your first lesson",
      ctaUrl: `${APP_ORIGIN}/my-programs/${finalized.programId}`,
    },
  });

  return finalized;
}

async function markPaymentFailed(args: {
  paymentId: string;
  webhookEventId?: string | null;
  providerTransactionId?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  const paymentRef = db.doc(`payments/${args.paymentId}`);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) {
    return;
  }

  const payment = paymentSnap.data() as PaymentStored;
  const orderId = String(payment.orderId || "").trim();
  const uid = String(payment.userId || "").trim();

  const writes: Array<Promise<FirebaseFirestore.WriteResult>> = [
    paymentRef.set({
      status: "failed",
      webhookEventId: args.webhookEventId || null,
      providerTransactionId: args.providerTransactionId || null,
      rawPayload: args.rawPayload || null,
      failedAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true}),
  ];

  if (uid && orderId) {
    writes.push(db.doc(`users/${uid}/orders/${orderId}`).set({
      status: "failed",
      webhookEventId: args.webhookEventId || null,
      providerTransactionId: args.providerTransactionId || null,
      updatedAt: nowTs(),
    }, {merge: true}));
  }

  await Promise.all(writes);

  if (uid) {
    await emitNotificationEvent({
      type: "PAYMENT_FAILED",
      templateKey: "payment_failed",
      recipientType: "LEARNER",
      recipientUserId: uid,
      relatedEntityType: "payment",
      relatedEntityId: args.paymentId,
      idempotencyKey: `payment_failed:${args.paymentId}`,
      templateData: {
        learnerName: "Learner",
        courseTitle: String(payment.title || "your program"),
        ctaUrl: `${APP_ORIGIN}/pricing`,
      },
    });
  }
}

async function finalizeWalletTopUpPayment(args: {
  paymentId: string;
  webhookEventId?: string | null;
  providerTransactionId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  const paymentRef = db.doc(`payments/${args.paymentId}`);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) {
    throw new Error(`Payment ${args.paymentId} not found.`);
  }

  const payment = paymentSnap.data() as PaymentStored;
  const uid = String(payment.userId || "").trim();
  const orderId = String(payment.orderId || "").trim();
  const topUpAmount = Number(payment.amount || 0);

  if (!uid || !orderId || !Number.isFinite(topUpAmount) || topUpAmount <= 0) {
    throw new Error("Wallet payment is missing required context.");
  }

  await db.runTransaction(async (tx) => {
    tx.set(paymentRef, {
      status: "success",
      webhookEventId: args.webhookEventId || null,
      providerTransactionId: args.providerTransactionId || null,
      checkoutSessionId: args.checkoutSessionId || null,
      paymentIntentId: args.paymentIntentId || null,
      rawPayload: args.rawPayload || null,
      succeededAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    tx.set(db.doc(`users/${uid}/orders/${orderId}`), {
      status: "paid",
      paymentId: args.paymentId,
      providerTransactionId: args.providerTransactionId || null,
      checkoutSessionId: args.checkoutSessionId || null,
      paymentIntentId: args.paymentIntentId || null,
      webhookEventId: args.webhookEventId || null,
      paidAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    tx.set(db.doc(`users/${uid}`), {
      walletBalance: admin.firestore.FieldValue.increment(topUpAmount),
      updatedAt: nowTs(),
    }, {merge: true});
  });

  await sendSystemNotificationToUser({
    uid,
    title: "Wallet credited",
    body: `$${topUpAmount.toFixed(2)} has been added to your Innovacare Review wallet.`,
    link: "/wallet",
    severity: "info",
    category: "commerce",
    organizationId: String(payment.orgId || "").trim() || null,
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function createPurchaseAndPartnerPayoutRecords(args: {
  uid: string;
  orderId: string;
  orderData: OrderStored;
  session: Stripe.Checkout.Session;
  paidAtIso: string;
}): Promise<void> {
  const items = Array.isArray(args.orderData.items) && args.orderData.items.length ?
    args.orderData.items :
    [{
      offerId: String(args.orderData.offerId || "").trim(),
      itemType: args.orderData.itemType || "digital_product",
      itemId: String(args.orderData.itemId || "").trim(),
      title: String(args.orderData.title || "Order item").trim() || "Order item",
      amount: Number(args.orderData.amount || 0),
      currency: String(args.orderData.currency || "USD").toUpperCase(),
      qty: 1,
      ownerType: args.orderData.ownerType,
      ownerId: args.orderData.ownerId || null,
      payoutMode: args.orderData.payoutMode,
      platformFeePercent: args.orderData.platformFeePercent,
      partnerSharePercent: args.orderData.partnerSharePercent,
      payoutMethodConfigured: args.orderData.payoutMethodConfigured,
      payoutMethod: args.orderData.payoutMethod || null,
    }];

  await Promise.all(items.map(async (item, index) => {
    const grossAmount = roundMoney(Number(item.amount || 0) * Math.max(1, Number(item.qty || 1)));
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return;
    }

    const ownerType = sanitizeOwnerType(item.ownerType);
    const ownerId = String(item.ownerId || "").trim() || null;
    const payoutMode = sanitizePayoutMode(item.payoutMode);
    const platformFeePercent = sanitizePercent(item.platformFeePercent, DEFAULT_PLATFORM_FEE_PERCENT);
    const partnerSharePercent = sanitizePercent(item.partnerSharePercent, Math.max(0, 100 - platformFeePercent));
    const platformFeeAmount = roundMoney(grossAmount * (platformFeePercent / 100));
    const partnerNetAmount = roundMoney(grossAmount * (partnerSharePercent / 100));
    const courseId = String(item.itemType === "course" ? item.itemId : item.itemType === "program" ? item.itemId : "").trim() || null;
    const normalizedOfferId = String(item.offerId || "").trim() || null;
    const currency = String(item.currency || args.orderData.currency || "USD").toUpperCase();

    const purchaseId = `${args.orderId}_${index + 1}`;
    const purchaseRef = db.doc(`purchases/${purchaseId}`);
    await purchaseRef.set({
      id: purchaseId,
      orderId: args.orderId,
      userId: args.uid,
      courseId,
      offerId: normalizedOfferId,
      ownerType,
      ownerId,
      grossAmount,
      currency,
      status: "paid",
      stripeSessionId: args.session.id,
      stripePaymentIntentId: String(args.session.payment_intent || "").trim() || null,
      paymentDate: args.paidAtIso,
      source: "stripe",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    if (courseId) {
      const enrollmentRef = db.doc(`purchaseEnrollments/${args.uid}_${courseId}`);
      await enrollmentRef.set({
        id: `${args.uid}_${courseId}`,
        userId: args.uid,
        courseId,
        accessGranted: true,
        source: "stripe",
        purchaseId,
        updatedAt: nowTs(),
        ...(args.orderData.status === "paid" ? {} : {createdAt: nowTs()}),
      }, {merge: true});
    }

    if (ownerType === "partner" && payoutMode === "manual" && ownerId) {
      const payoutRecordRef = db.doc(`partnerPayoutRecords/${purchaseId}`);
      await payoutRecordRef.set({
        id: purchaseId,
        purchaseId,
        orderId: args.orderId,
        courseId,
        offerId: normalizedOfferId,
        partnerId: ownerId,
        ownerId,
        grossAmount,
        currency,
        platformFeePercent,
        platformFeeAmount,
        partnerSharePercent,
        partnerNetAmount,
        payoutMode: "manual",
        payoutMethod: sanitizePayoutMethod(item.payoutMethod) || "MANUAL_OTHER",
        payoutStatus: "pending",
        payoutReference: null,
        paidAt: null,
        paymentDate: args.paidAtIso,
        learnerId: args.uid,
        stripeSessionId: args.session.id,
        stripePaymentIntentId: String(args.session.payment_intent || "").trim() || null,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});
    }
  }));
}

async function handleStripeWebhookRequest(req: any, res: any): Promise<void> {
  const signatureHeader = req.headers["stripe-signature"];
  const hasSignatureHeader =
    typeof signatureHeader === "string" && signatureHeader.trim().length > 0;
  const rawBody = req.rawBody;
  const hasRawBody =
    Buffer.isBuffer(rawBody) ||
    rawBody instanceof Uint8Array ||
    typeof rawBody === "string";
  const rawBodyLength = Buffer.isBuffer(rawBody) ?
    rawBody.length :
    rawBody instanceof Uint8Array ?
      rawBody.byteLength :
      typeof rawBody === "string" ?
        Buffer.byteLength(rawBody) :
        0;

  const webhookSecret = STRIPE_WEBHOOK_SECRET.value();
  const webhookSecretConfigured = webhookSecret.trim().length > 0;

  console.info("Stripe webhook received", {
    hasSignatureHeader,
    hasRawBody,
    rawBodyLength,
    webhookSecretConfigured,
  });

  if (!hasSignatureHeader) {
    res.status(400).send("Missing Stripe signature header (stripe-signature).");
    return;
  }

  if (!hasRawBody || rawBodyLength <= 0) {
    res.status(400).send("Invalid webhook payload: raw body is missing.");
    return;
  }

  if (!webhookSecretConfigured) {
    res.status(500).send("Webhook configuration error: STRIPE_WEBHOOK_SECRET is not configured.");
    return;
  }

  try {
    const stripe = getStripe();
    const normalizedRawBody = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        normalizedRawBody,
        signatureHeader,
        webhookSecret,
      );
    } catch (signatureError: any) {
      console.error("Stripe webhook signature verification failed", {
        hasSignatureHeader,
        hasRawBody,
        rawBodyLength,
        webhookSecretConfigured,
        errorMessage: signatureError?.message || "Unknown signature error",
      });
      // SECURITY: emit a critical event so the Admin Security Center surfaces
      // any tampered/forged webhook calls. Best-effort — never throw here.
      try {
        await recordServerSecurityEvent({
          eventType: "STRIPE_WEBHOOK_INVALID",
          severity: "critical",
          action: "stripe_signature_invalid",
          resourceType: "stripe_webhook",
          ip: (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            (req.socket?.remoteAddress as string) || null,
          userAgent: (req.headers?.["user-agent"] as string) || null,
          metadata: {
            reason: signatureError?.message || "signature_verification_failed",
            rawBodyLength,
          },
        });
      } catch (logErr) {
        console.warn("Failed to record STRIPE_WEBHOOK_INVALID security event", logErr);
      }
      res.status(400).send(
        "Invalid Stripe signature: verify stripe-signature header, use req.rawBody, and confirm STRIPE_WEBHOOK_SECRET matches this endpoint.",
      );
      return;
    }

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

    // Automation v1: enrollments produced via createCheckoutSession callable.
    // Detected by metadata.automation === 'innovacare_v1'. Runs BEFORE the
    // legacy order-based branch so it does not require a users/{uid}/orders
    // document to exist.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.automation === "innovacare_v1") {
        try {
          await handleAutomationCheckoutCompleted(session, event.id);
        } catch (err) {
          console.error("[automation] checkout.session.completed failed", err);
          throw err;
        }
        res.status(200).send({received: true, automation: true});
        return;
      }
    }

    // Stripe recurring billing events (subscriptions / invoices). These are
    // independent of the legacy checkout flow.
    if (
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      try {
        const handled = await handleStripeRecurringEvent(event);
        if (handled) {
          res.status(200).send({received: true, recurring: true});
          return;
        }
      } catch (err) {
        console.error("[automation] recurring event failed", err);
        throw err;
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const uid = session.metadata?.uid;
      const orderId = session.metadata?.orderId;
      const paymentId = String(session.metadata?.paymentId || "").trim();
      const tutorBookingId = String(session.metadata?.tutorBookingId || "").trim();

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

      if (orderData?.status === "paid" && !paymentId) {
        res.status(200).send({received: true, alreadyPaid: true});
        return;
      }

      if (orderData?.itemType === "wallet_topup") {
        if (paymentId) {
          await finalizeWalletTopUpPayment({
            paymentId,
            webhookEventId: event.id,
            providerTransactionId: String(session.payment_intent || session.id),
            checkoutSessionId: session.id,
            paymentIntentId: String(session.payment_intent || "").trim() || null,
            rawPayload: session,
          });
        } else {
          const topUpAmount = Number(orderData?.amount || 0);
          await db.runTransaction(async (tx) => {
            tx.set(orderRef, {
              status: "paid",
              paymentIntentId: session.payment_intent ?? null,
              checkoutSessionId: session.id,
              webhookEventId: event.id,
              paidAt: nowTs(),
              updatedAt: nowTs(),
            }, {merge: true});
            if (topUpAmount > 0) {
              tx.set(db.doc(`users/${uid}`), {
                walletBalance: admin.firestore.FieldValue.increment(topUpAmount),
                updatedAt: nowTs(),
              }, {merge: true});
            }
          });
          await sendSystemNotificationToUser({
            uid,
            title: "Wallet credited",
            body: `$${topUpAmount.toFixed(2)} has been added to your Innovacare Review wallet.`,
            link: "/wallet",
            severity: "info",
            category: "commerce",
            organizationId: null,
          });
        }
        res.status(200).send({received: true});
        return;
      }

      if (orderData?.itemType === "tutor_session") {
        const bookingRef = db.doc(`tutor_bookings/${tutorBookingId || orderId}`);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
          throw new Error(`Tutor booking ${tutorBookingId || orderId} not found.`);
        }

        const booking = (bookingSnap.data() || {}) as TutorBookingStored;
        const lockRef = booking.tutorId && booking.slotKey ?
          db.doc(`tutors/${booking.tutorId}/availabilityLocks/${booking.slotKey}`) : null;

        await db.runTransaction(async (tx) => {
          tx.set(orderRef, {
            status: "paid",
            paymentIntentId: session.payment_intent ?? null,
            checkoutSessionId: session.id,
            webhookEventId: event.id,
            paidAt: nowTs(),
            updatedAt: nowTs(),
          }, {merge: true});

          tx.set(bookingRef, {
            status: "confirmed",
            checkoutSessionId: session.id,
            paymentIntentId: session.payment_intent ?? null,
            confirmedAt: nowTs(),
            lockedUntil: null,
            updatedAt: nowTs(),
          }, {merge: true});

          if (lockRef) {
            tx.set(lockRef, {
              status: "confirmed",
              paymentIntentId: session.payment_intent ?? null,
              lockedUntil: null,
              updatedAt: nowTs(),
            }, {merge: true});
          }
        });

        await sendSystemNotificationToUser({
          uid,
          title: "Tutor session confirmed",
          body: `${String(booking.subject || "Your tutoring session").trim() || "Your tutoring session"} with ${String(booking.tutorName || "your tutor").trim() || "your tutor"} is confirmed for ${String(booking.sessionDate || "").trim()} ${String(booking.sessionTime || "").trim()}.`,
          link: "/private-tutors/bookings",
          severity: "info",
          category: "live_sessions",
          organizationId: String(orderData.orgId || "").trim() || null,
        });

        const tutorOwnerUid = String(booking.tutorOwnerUid || "").trim();
        if (tutorOwnerUid) {
          await sendSystemNotificationToUser({
            uid: tutorOwnerUid,
            title: "New paid tutor session",
            body: `${String(booking.studentName || booking.studentEmail || "A learner").trim() || "A learner"} booked ${String(booking.subject || "a tutoring session").trim() || "a tutoring session"} on ${String(booking.sessionDate || "").trim()} at ${String(booking.sessionTime || "").trim()}.`,
            link: "/private-tutors/bookings",
            severity: "info",
            category: "live_sessions",
          });
        }

        res.status(200).send({received: true});
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

      await createPurchaseAndPartnerPayoutRecords({
        uid,
        orderId,
        orderData,
        session,
        paidAtIso: new Date().toISOString(),
      });

      const enrollmentId = session.metadata?.enrollmentId;
      if (paymentId) {
        await finalizeProgramEnrollmentPayment({
          paymentId,
          webhookEventId: event.id,
          providerTransactionId: String(session.payment_intent || session.id),
          checkoutSessionId: session.id,
          paymentIntentId: String(session.payment_intent || "").trim() || null,
          rawPayload: session,
        });
      } else if (enrollmentId) {
        const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
        const enrollmentSnap = await enrollmentRef.get();
        if (enrollmentSnap.exists) {
          const enrollment = enrollmentSnap.data() as Record<string, unknown>;
          await enrollmentRef.update({
            paymentStatus: "paid",
            status: "active",
            activatedAt: nowTs(),
            updatedAt: nowTs(),
          });

          const programId = String(enrollment.programId || session.metadata?.programId || "").trim();
          const programTitle = String(enrollment.programTitle || orderData.title || "your program").trim() || "your program";
          await sendSystemNotificationToUser({
            uid,
            title: "Enrollment activated",
            body: `Your payment was confirmed and access to ${programTitle} is now active.`,
            link: programId ? `/my-programs/${programId}` : "/guest/orders",
            severity: "info",
            category: "commerce",
            organizationId: String(enrollment.orgId || orderData.orgId || "").trim() || null,
          });

          await sendSystemNotificationToOrganizationRoles({
            orgId: String(enrollment.orgId || orderData.orgId || "").trim() || null,
            roles: ["admin", "manager"],
            title: "New paid enrollment",
            body: `${programTitle} was paid and auto-activated for a learner.`,
            link: "/program-admin/enrollments",
            severity: "info",
            category: "commerce",
          });
        }
      } else {
        const programId = String(session.metadata?.programId || "").trim();
        const liveSessionId = String(session.metadata?.sessionId || "").trim();
        const itemType = String(orderData.itemType || "").trim();
        const itemTitle = String(orderData.title || "your order").trim() || "your order";
        const orderLink = itemType === "live_class" && programId && liveSessionId ?
          `/my-programs/${programId}/live-sessions` :
          itemType === "course" ?
            "/guest/courses" :
            itemType === "program" && programId ?
              `/my-programs/${programId}` :
              itemType === "program" ?
                "/guest/programs" :
                "/guest/orders";

        await sendSystemNotificationToUser({
          uid,
          title: itemType === "live_class" ? "Live session booked" : "Purchase confirmed",
          body: itemType === "live_class" ?
            `Your payment is confirmed and ${itemTitle} has been booked.` :
            itemType === "course" ?
              `Your payment is confirmed and ${itemTitle} is now available in your course library.` :
              itemType === "program" ?
                `Your payment is confirmed and ${itemTitle} is now available in your programs space.` :
                `Your payment is confirmed for ${itemTitle}.`,
          link: orderLink,
          severity: "info",
          category: itemType === "live_class" ? "live_sessions" : "commerce",
          organizationId: String(orderData.orgId || "").trim() || null,
        });
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const stripeAccountId = account.id;
      if (stripeAccountId) {
        const orgsQuery = await db.collection("organizations")
          .where("stripeAccountId", "==", stripeAccountId)
          .limit(1)
          .get();
        if (!orgsQuery.empty) {
          const currentlyDue = account.requirements?.currently_due ?? [];
          const pastDue = account.requirements?.past_due ?? [];
          let status = "onboarding_required";
          if (account.details_submitted) {
            if (account.requirements?.disabled_reason || currentlyDue.length > 0 || pastDue.length > 0) {
              status = "restricted";
            } else if (account.charges_enabled && account.payouts_enabled) {
              status = "fully_active";
            } else if (account.charges_enabled) {
              status = "charges_enabled";
            } else {
              status = "pending_verification";
            }
          }
          await orgsQuery.docs[0].ref.set({
            stripeChargesEnabled: account.charges_enabled === true,
            stripeDetailsSubmitted: account.details_submitted === true,
            stripePayoutsEnabled: account.payouts_enabled === true,
            stripeConnectStatus: status,
            stripeRequirementsCurrentlyDue: currentlyDue,
            stripeRequirementsPastDue: pastDue,
            stripeDisabledReason: account.requirements?.disabled_reason || null,
            stripeStatusCheckedAt: nowTs(),
            updatedAt: nowTs(),
          }, {merge: true});
        }
      }
    }

    res.status(200).send({received: true});
  } catch (err: any) {
    console.error("Stripe webhook processing error:", err);
    res.status(400).send(err?.message || "Webhook error");
  }
}

async function handleMobileMoneyWebhookRequest(req: any, res: any): Promise<void> {
  const config = getMobileMoneyConfig();
  const signatureCandidates: Array<string | string[] | undefined> = [
    req.headers["x-signature"],
    req.headers["x-webhook-signature"],
    req.headers["x-campay-signature"],
    req.headers["x-webhook-key"],
    req.headers.authorization,
  ];
  const signature = signatureCandidates
    .map((value) => Array.isArray(value) ? value[0] : value)
    .find((value) => typeof value === "string" && value.trim().length > 0);

  if (!verifyMobileMoneyWebhookSignature(config, req.rawBody, typeof signature === "string" ? signature : undefined)) {
    res.status(400).send("Invalid Mobile Money signature");
    return;
  }

  try {
    const webhook = parseMobileMoneyWebhook(config, req.body, req.headers);
    const eventRef = db.doc(`paymentWebhookEvents/${config.gateway}_${webhook.eventId}`);
    let duplicate = false;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (snap.exists) {
        duplicate = true;
        return;
      }

      tx.set(eventRef, {
        id: webhook.eventId,
        gateway: config.gateway,
        reference: webhook.reference,
        status: webhook.status,
        createdAt: nowTs(),
      });
    });

    if (duplicate) {
      res.status(200).send({received: true, duplicate: true});
      return;
    }

    const paymentQuery = await db.collection("payments")
      .where("reference", "==", webhook.reference)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      res.status(200).send({received: true, ignored: true});
      return;
    }

    const paymentId = paymentQuery.docs[0].id;
    if (webhook.status === "success") {
      await finalizeProgramEnrollmentPayment({
        paymentId,
        webhookEventId: webhook.eventId,
        providerTransactionId: webhook.providerTransactionId || null,
        rawPayload: webhook.raw,
      });
      res.status(200).send({received: true, status: "success"});
      return;
    }

    if (webhook.status === "failed") {
      await markPaymentFailed({
        paymentId,
        webhookEventId: webhook.eventId,
        providerTransactionId: webhook.providerTransactionId || null,
        rawPayload: webhook.raw,
      });
      res.status(200).send({received: true, status: "failed"});
      return;
    }

    await db.doc(`payments/${paymentId}`).set({
      status: "pending",
      providerTransactionId: webhook.providerTransactionId || null,
      webhookEventId: webhook.eventId,
      rawPayload: webhook.raw,
      updatedAt: nowTs(),
    }, {merge: true});

    res.status(200).send({received: true, status: "pending"});
  } catch (error: any) {
    console.error("Mobile Money webhook processing error:", error);
    res.status(400).send(error?.message || "Webhook error");
  }
}

function buildProgramLiveSessionBookingId(programId: string, sessionId: string): string {
  return `${programId}__${sessionId}`;
}

function programLiveSessionBookingRef(uid: string, programId: string, sessionId: string) {
  return db.doc(
    `users/${uid}/programLiveSessionBookings/${buildProgramLiveSessionBookingId(programId, sessionId)}`,
  );
}

function normalizeProgramLiveSessionAccessMode(value: unknown): ProgramLiveSessionAccessMode {
  return value === "free" || value === "paid" ? value : "included";
}

function isMissingFirestoreIndexError(error: unknown): boolean {
  const code = String((error as {code?: string | number})?.code || "").toLowerCase();
  const message = String((error as {message?: string})?.message || "").toLowerCase();

  return code === "9" || code === "failed-precondition" || message.includes("requires an index");
}

async function getProgramLiveSessionOrThrow(programId: string, sessionId: string) {
  const ref = db.doc(`programs/${programId}/liveSessions/${sessionId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Live session not found.");
  }

  const session = snap.data() as ProgramLiveSessionDoc;
  if (session.active === false || String(session.status || "DRAFT") !== "PUBLISHED") {
    throw new HttpsError("failed-precondition", "This live session is not available.");
  }

  return {ref, snap, session};
}

async function hasProgramLearnerAccess(uid: string, programId: string): Promise<boolean> {
  const enrollmentsSnap = await db
    .collection("programEnrollments")
    .where("userId", "==", uid)
    .where("programId", "==", programId)
    .get();

  return enrollmentsSnap.docs.some((docSnap) => {
    const row = docSnap.data() as {paymentStatus?: string; status?: string};
    return row.paymentStatus === "paid" && ["active", "completed", "confirmed"].includes(String(row.status || ""));
  });
}

async function countProgramLiveSessionBookings(programId: string, sessionId: string): Promise<number> {
  try {
    const snap = await db
      .collectionGroup("programLiveSessionBookings")
      .where("programId", "==", programId)
      .where("sessionId", "==", sessionId)
      .where("status", "in", ["reserved", "booked", "attended"])
      .get();

    return snap.size;
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }

    console.warn("countProgramLiveSessionBookings fallback without composite index", {
      programId,
      sessionId,
      code: (error as {code?: string | number})?.code,
      message: (error as {message?: string})?.message,
    });

    const fallbackSnap = await db
      .collectionGroup("programLiveSessionBookings")
      .where("programId", "==", programId)
      .get();

    return fallbackSnap.docs.filter((docSnap) => {
      const row = docSnap.data() as {sessionId?: string; status?: string};
      return row.sessionId === sessionId && ["reserved", "booked", "attended"].includes(String(row.status || ""));
    }).length;
  }
}

async function assertProgramLiveSessionCapacity(
  session: ProgramLiveSessionDoc,
  programId: string,
  sessionId: string,
): Promise<void> {
  if (typeof session.capacity !== "number" || session.capacity <= 0) {
    return;
  }

  const activeBookings = await countProgramLiveSessionBookings(programId, sessionId);
  if (activeBookings >= session.capacity) {
    throw new HttpsError("failed-precondition", "No seats remaining for this live session.");
  }
}

async function assertProgramLiveSessionEligibility(uid: string, programId: string): Promise<void> {
  const hasAccess = await hasProgramLearnerAccess(uid, programId);
  if (!hasAccess) {
    throw new HttpsError("permission-denied", "Active paid program access is required.");
  }
}

async function createOrUpdateProgramLiveSessionBooking(params: {
  uid: string;
  programId: string;
  sessionId: string;
  session: ProgramLiveSessionDoc;
  accessMode: ProgramLiveSessionAccessMode;
  status: "reserved" | "booked" | "attended" | "cancelled" | "missed";
  orderId?: string | null;
  orgId?: string | null;
}): Promise<void> {
  const {uid, programId, sessionId, session, accessMode, status, orderId, orgId} = params;
  const ref = programLiveSessionBookingRef(uid, programId, sessionId);

  await ref.set({
    id: ref.id,
    uid,
    orgId: orgId || null,
    programId,
    sessionId,
    title: String(session.title || "Live session").trim() || "Live session",
    instructorName: String(session.instructorName || "").trim() || null,
    startAt: session.startAt || null,
    endAt: session.endAt || null,
    accessMode,
    status,
    orderId: orderId || null,
    createdAt: nowTs(),
    updatedAt: nowTs(),
  }, {merge: true});
}

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

function inferNormalizedProgramAccessRole(user: {
  role?: unknown;
  isProgramAdmin?: unknown;
  isProgramStaff?: unknown;
  isProgramLearner?: unknown;
}): string {
  const role = String(user.role || "").trim();

  if (["super_admin", "admin", "manager"].includes(role)) {
    return role;
  }

  if (user.isProgramAdmin === true) {
    return "programAdmin";
  }

  if (user.isProgramStaff === true) {
    return "programStaff";
  }

  if (user.isProgramLearner === true) {
    return "programLearner";
  }

  return role === "guest" ? "guest" : "learner";
}

function buildNormalizedProgramAccessPatch(user: {
  role?: unknown;
  isProgramAdmin?: unknown;
  isProgramStaff?: unknown;
  isProgramLearner?: unknown;
}): {
  role: string;
  isProgramAdmin: boolean;
  isProgramStaff: boolean;
  isProgramLearner: boolean;
  updatedAt: admin.firestore.FieldValue;
} {
  const targetRole = inferNormalizedProgramAccessRole(user);
  return {
    role: targetRole,
    isProgramAdmin: targetRole === "programAdmin",
    isProgramStaff: targetRole === "programStaff",
    isProgramLearner: targetRole === "programLearner",
    updatedAt: nowTs(),
  };
}

function parseAllowedHosts(): Set<string> {
  const raw = (process.env.ALLOWED_CHECKOUT_HOSTS || "").trim();
  const fallback = [
    "localhost",
    "127.0.0.1",
    "innovacarereview.com",
    "www.innovacarereview.com",
  ];
  const fromEnv = raw ? raw.split(",").map((x) => x.trim().toLowerCase()) : [];
  const hosts = [...fallback, ...fromEnv];
  return new Set(hosts.filter(Boolean));
}

function isEmailVerificationRequiredForCheckout(): boolean {
  const raw = (process.env.REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT || "").trim().toLowerCase();
  return raw === "true";
}

function canManageStripeConnect(role: string): boolean {
  return ["super_admin", "admin", "manager", "programadmin", "programstaff", "instructor"]
    .includes(String(role || "").trim().toLowerCase());
}

function buildStripeConnectReturnUrl(kind: "return" | "refresh", orgId: string): string {
  const url = new URL(`${APP_ORIGIN}${STRIPE_CONNECT_ONBOARDING_PATH}`);
  url.searchParams.set("stripe", kind);
  url.searchParams.set("orgId", orgId);
  return url.toString();
}

function sanitizeOwnerType(value: unknown): OwnerType {
  return String(value || "").trim().toLowerCase() === "partner" ? "partner" : "platform";
}

function sanitizePayoutMode(value: unknown): PayoutMode {
  return String(value || "").trim().toLowerCase() === "stripe_connect" ? "stripe_connect" : "manual";
}

function sanitizePayoutMethod(value: unknown): PartnerPayoutMethod | undefined {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MTN_MOBILE_MONEY", "ORANGE_MONEY", "WISE", "BANK_TRANSFER", "MANUAL_OTHER"].includes(normalized)) {
    return normalized as PartnerPayoutMethod;
  }
  return undefined;
}

function sanitizePercent(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return fallback;
  }
  return parsed;
}

type ProgramOwnershipConfig = {
  ownerType: OwnerType;
  ownerId: string | null;
  payoutMode: PayoutMode;
  platformFeePercent: number;
  partnerSharePercent: number;
  payoutMethodConfigured: boolean;
  payoutMethod?: PartnerPayoutMethod;
  stripeAccountId: string | null;
};

async function resolveProgramOwnershipConfig(programId: string, fallbackOrgId?: string | null): Promise<ProgramOwnershipConfig> {
  const normalizedProgramId = String(programId || "").trim();
  let programOrgId = String(fallbackOrgId || "").trim();
  let stripeAccountId: string | null = null;

  let ownerType: OwnerType = "platform";
  let ownerId: string | null = null;
  let payoutMode: PayoutMode = "manual";
  let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
  let partnerSharePercent = DEFAULT_PARTNER_SHARE_PERCENT;
  let payoutMethodConfigured = false;
  let payoutMethod: PartnerPayoutMethod | undefined;

  if (normalizedProgramId) {
    const programSnap = await db.doc(`programs/${normalizedProgramId}`).get();
    if (programSnap.exists) {
      const programData = (programSnap.data() || {}) as Record<string, unknown>;
      ownerType = sanitizeOwnerType(programData["ownerType"]);
      ownerId = String(programData["ownerId"] || "").trim() || null;
      payoutMode = sanitizePayoutMode(programData["payoutMode"]);
      platformFeePercent = sanitizePercent(programData["platformFeePercent"], DEFAULT_PLATFORM_FEE_PERCENT);
      partnerSharePercent = sanitizePercent(
        programData["partnerSharePercent"],
        Math.max(0, 100 - platformFeePercent),
      );
      payoutMethodConfigured = Boolean(programData["payoutMethodConfigured"]);
      payoutMethod = sanitizePayoutMethod(programData["payoutMethod"]);
      stripeAccountId = String(programData["stripeAccountId"] || "").trim() || null;
      programOrgId = String(programData["orgId"] || programOrgId || "").trim();
    }
  }

  if (!ownerId && programOrgId) {
    ownerId = programOrgId;
  }

  if (ownerType !== "partner") {
    payoutMethodConfigured = true;
    payoutMode = "manual";
    partnerSharePercent = 0;
  }

  if (!stripeAccountId && programOrgId) {
    const organizationSnap = await db.doc(`organizations/${programOrgId}`).get();
    if (organizationSnap.exists) {
      const organizationData = (organizationSnap.data() || {}) as Record<string, unknown>;
      stripeAccountId = String(organizationData["stripeAccountId"] || "").trim() || null;
    }
  }

  return {
    ownerType,
    ownerId,
    payoutMode,
    platformFeePercent,
    partnerSharePercent,
    payoutMethodConfigured,
    payoutMethod,
    stripeAccountId,
  };
}

async function buildProgramStripeConnectPaymentIntentData(
  programId: string,
  orgId: string | null | undefined,
  amount: number,
): Promise<{
  ownerType: OwnerType;
  ownerId: string | null;
  payoutMode: PayoutMode;
  platformFeePercent: number;
  partnerSharePercent: number;
  payoutMethodConfigured: boolean;
  payoutMethod?: PartnerPayoutMethod;
  stripeAccountId: string | null;
  applicationFeeAmount: number | null;
  paymentIntentData?: Stripe.Checkout.SessionCreateParams.PaymentIntentData;
}> {
  const ownership = await resolveProgramOwnershipConfig(programId, orgId);
  const stripeAccountId = ownership.ownerType === "partner" && ownership.payoutMode === "stripe_connect" ?
    ownership.stripeAccountId :
    null;
  const unitAmount = Math.round(Number(amount || 0) * 100);

  if (!stripeAccountId || !Number.isFinite(unitAmount) || unitAmount <= 0) {
    return {
      ownerType: ownership.ownerType,
      ownerId: ownership.ownerId,
      payoutMode: ownership.payoutMode,
      platformFeePercent: ownership.platformFeePercent,
      partnerSharePercent: ownership.partnerSharePercent,
      payoutMethodConfigured: ownership.payoutMethodConfigured,
      payoutMethod: ownership.payoutMethod,
      stripeAccountId,
      applicationFeeAmount: null,
    };
  }

  const applicationFeeAmount = Math.max(0, Math.round(unitAmount * (ownership.platformFeePercent / 100)));

  return {
    ownerType: ownership.ownerType,
    ownerId: ownership.ownerId,
    payoutMode: ownership.payoutMode,
    platformFeePercent: ownership.platformFeePercent,
    partnerSharePercent: ownership.partnerSharePercent,
    payoutMethodConfigured: ownership.payoutMethodConfigured,
    payoutMethod: ownership.payoutMethod,
    stripeAccountId,
    applicationFeeAmount,
    paymentIntentData: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: stripeAccountId,
      },
    },
  };
}

function shuffleList<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }
  return next;
}

const NGN_ITEM_TYPES = new Set([
  "case_study_bundle",
  "matrix_multiple_choice",
  "matrix_multiple_response",
  "bow_tie",
  "cloze_drop_down",
  "trend_analysis",
  "highlight_text",
  "rationale_pairing",
  "drag_and_drop_ordering",
  "ordered_response",
]);

function exactAnswerMatch(selected: string[], correct: string[]): boolean {
  const left = [...selected].sort();
  const right = [...correct].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeInteractionConfig(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function hasCompleteExamPrepResponse(item: ExamPrepQuestionRecord, selectedAnswerKeys: string[]): boolean {
  const normalizedSelection = normalizeStringArray(selectedAnswerKeys);
  if (!normalizedSelection.length) {
    return false;
  }

  const itemType = String(item.itemType || "");
  if (itemType === "cloze_drop_down") {
    const interactionConfig = normalizeInteractionConfig(item.interactionConfig);
    const segments = Array.isArray(interactionConfig?.["segments"]) ? interactionConfig?.["segments"] as Array<Record<string, unknown>> : [];
    if (!segments.length) {
      return false;
    }

    return segments.every((segment) => {
      const optionIds = normalizeStringArray(segment["optionIds"]);
      const selectedInSegment = normalizedSelection.filter((choiceId) => optionIds.includes(choiceId));
      return selectedInSegment.length === 1;
    });
  }

  if (itemType !== "bow_tie") {
    return true;
  }

  const interactionConfig = normalizeInteractionConfig(item.interactionConfig);
  const parts = Array.isArray(interactionConfig?.["parts"]) ? interactionConfig?.["parts"] as Array<Record<string, unknown>> : [];
  if (!parts.length) {
    return false;
  }

  return parts.every((part) => {
    const selectionMode = String(part["selectionMode"] || "single") === "multiple" ? "multiple" : "single";
    const minSelections = Math.max(0, Number(part["minSelections"] || 0));
    const maxSelections = Math.max(1, Number(part["maxSelections"] || (selectionMode === "single" ? 1 : minSelections || 1)));
    const optionIds = normalizeStringArray(part["optionIds"]);
    const selectedInPart = normalizedSelection.filter((choiceId) => optionIds.includes(choiceId));

    if (selectionMode === "single" && selectedInPart.length > 1) {
      return false;
    }

    return selectedInPart.length >= minSelections && selectedInPart.length <= maxSelections;
  });
}

async function requireActiveOrgLearner(uid?: string): Promise<{uid: string; role: string; orgId: string}> {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const context = await getUserContext(normalizedUid);
  if (!context.active) {
    throw new HttpsError("permission-denied", "Inactive users cannot access exam-prep.");
  }
  if (!context.orgId) {
    throw new HttpsError("failed-precondition", "User orgId is missing.");
  }

  return {uid: normalizedUid, role: context.role, orgId: context.orgId};
}

function isLearnerOwnedCustomAssessment(assessment: ExamPrepAssessmentRecord, uid: string): boolean {
  if (assessment.customGenerated !== true && String(assessment.visibilityScope || "") !== "personal") {
    return false;
  }

  const ownerId = String(assessment.learnerOwnerId || assessment.createdBy || "").trim();
  return Boolean(ownerId) && ownerId === uid;
}

function isExamPrepAssessmentVisibleToLearner(assessment: ExamPrepAssessmentRecord, uid: string): boolean {
  if (assessment.active === false) {
    return false;
  }

  if (String(assessment.publishStatus || "") === "published") {
    return true;
  }

  return isLearnerOwnedCustomAssessment(assessment, uid);
}

function normalizeCustomDifficulty(value: unknown): "mixed" | "easy" | "medium" | "hard" {
  const normalized = String(value || "mixed").trim().toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "mixed";
}

function normalizeCustomDeliveryPreset(value: unknown): "timed" | "tutorial" | "cat_style" {
  const normalized = String(value || "timed").trim().toLowerCase();
  if (normalized === "tutorial" || normalized === "cat_style") {
    return normalized;
  }
  return "timed";
}

function normalizeCustomQuestionFamily(value: unknown): "mixed" | "classic" | "ngn" {
  const normalized = String(value || "mixed").trim().toLowerCase();
  if (normalized === "classic" || normalized === "ngn") {
    return normalized;
  }
  return "mixed";
}

function normalizeCustomQuestionUsageFilter(
  value: unknown,
): "all" | "unused" | "incorrect" | "marked" | "omitted" | "correct_on_reattempt" {
  const normalized = String(value || "all").trim().toLowerCase();
  if (
    normalized === "unused" ||
    normalized === "incorrect" ||
    normalized === "marked" ||
    normalized === "omitted" ||
    normalized === "correct_on_reattempt"
  ) {
    return normalized;
  }
  return "all";
}

function isCanonicalExamProgramId(value: string): boolean {
  return ["nclex-rn-prep", "nclex-pn-prep", "uae-nursing-licensure-prep"].includes(value);
}

function inferCanonicalExamProgramIdsFromPublicProgram(program: Record<string, unknown>): string[] {
  const category = String(program["category"] || "").trim().toUpperCase();
  const text = [
    String(program["title"] || ""),
    String(program["slug"] || ""),
    String(program["subtitle"] || ""),
    String(program["description"] || ""),
    ...(Array.isArray(program["tags"]) ? (program["tags"] as unknown[]).map((tag) => String(tag || "")) : []),
  ]
    .join(" ")
    .toLowerCase();

  if (category === "DHA" || category === "DOH" || text.includes("dha") || text.includes("doh") || text.includes("uae")) {
    return ["uae-nursing-licensure-prep"];
  }

  if (text.includes("nclex-pn") || text.includes("practical nurse") || /\bpn\b/.test(text)) {
    return ["nclex-pn-prep"];
  }

  const hasRnToken = /\brn\b/.test(text) || text.includes("nclex-rn");

  if (
    category === "NCLEX" ||
    category === "NURSING_PREP" ||
    category === "CANADA_NCLEX" ||
    text.includes("nclex") ||
    text.includes("nursing") ||
    hasRnToken
  ) {
    return ["nclex-rn-prep"];
  }

  return [];
}

async function resolveRequestedExamPrepProgramScope(
  requestedProgramSpaceId: string,
): Promise<{publicProgramId: string; canonicalProgramIds: string[]}> {
  const normalizedId = String(requestedProgramSpaceId || "").trim();
  if (!normalizedId) {
    return {publicProgramId: "", canonicalProgramIds: []};
  }

  if (isCanonicalExamProgramId(normalizedId)) {
    return {publicProgramId: "", canonicalProgramIds: [normalizedId]};
  }

  const publicProgramSnap = await db.doc(`programs/${normalizedId}`).get();
  if (!publicProgramSnap.exists) {
    return {publicProgramId: normalizedId, canonicalProgramIds: []};
  }

  return {
    publicProgramId: normalizedId,
    canonicalProgramIds: inferCanonicalExamProgramIdsFromPublicProgram(publicProgramSnap.data() as Record<string, unknown>),
  };
}

function getAssessmentPublicProgramId(assessment: ExamPrepAssessmentRecord): string {
  if (typeof assessment.publicProgramId === "string" && assessment.publicProgramId.trim()) {
    return assessment.publicProgramId.trim();
  }

  const builderConfig = assessment.builderConfig;
  if (builderConfig && typeof builderConfig === "object" && builderConfig !== null) {
    const programSpaceId = String((builderConfig as Record<string, unknown>)["programSpaceId"] || "").trim();
    if (programSpaceId) {
      return programSpaceId;
    }
  }

  return "";
}

function matchesExamPrepProgramScope(
  recordProgramId: unknown,
  recordPublicProgramId: unknown,
  scope: {publicProgramId: string; canonicalProgramIds: string[]},
): boolean {
  if (!scope.publicProgramId && scope.canonicalProgramIds.length === 0) {
    return true;
  }

  const normalizedProgramId = String(recordProgramId || "").trim();
  const normalizedPublicProgramId = String(recordPublicProgramId || "").trim();

  if (scope.publicProgramId) {
    if (normalizedPublicProgramId) {
      return normalizedPublicProgramId === scope.publicProgramId;
    }

    return scope.canonicalProgramIds.includes(normalizedProgramId);
  }

  return scope.canonicalProgramIds.includes(normalizedProgramId);
}

function matchesCustomQuestionFamily(item: ExamPrepQuestionRecord, family: "mixed" | "classic" | "ngn"): boolean {
  if (family === "mixed") {
    return true;
  }

  const isNgn = NGN_ITEM_TYPES.has(String(item.itemType || "").trim().toLowerCase()) || Boolean(item.parentCaseId);
  return family === "ngn" ? isNgn : !isNgn;
}

function toMillis(value: unknown): number {
  if (!value) {
    return 0;
  }
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return Number(value.toMillis()) || 0;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as {_seconds?: unknown})._seconds || 0);
    return seconds * 1000;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

async function loadLearnerQuestionUsageHistory(
  orgId: string,
  uid: string,
): Promise<Map<string, LearnerQuestionUsageStats>> {
  const reviewSnap = await db
    .collection(`organizations/${orgId}/attemptReviewSnapshots`)
    .where("learnerId", "==", uid)
    .get();

  const reviews = reviewSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as Record<string, unknown>)} as Record<string, unknown> & {id: string}))
    .sort((left, right) => toMillis(left["createdAt"]) - toMillis(right["createdAt"]));

  const history = new Map<string, LearnerQuestionUsageStats>();
  for (const review of reviews) {
    const items = Array.isArray(review["items"]) ? (review["items"] as Record<string, unknown>[]) : [];
    for (const item of items) {
      const itemId = String(item["itemId"] || "").trim();
      if (!itemId) {
        continue;
      }

      const stats = history.get(itemId) || {
        seenCount: 0,
        incorrectCount: 0,
        markedCount: 0,
        omittedCount: 0,
        correctOnReattempt: false,
        hasSeenIncorrect: false,
      };

      stats.seenCount += 1;
      if (item["markedForReview"] === true) {
        stats.markedCount += 1;
      }

      const selectedAnswerKeys = Array.isArray(item["selectedAnswerKeys"])
        ? item["selectedAnswerKeys"].map((value) => String(value || "")).filter(Boolean)
        : [];
      const questionStatus = String(item["questionStatus"] || "").trim();
      const omitted =
        selectedAnswerKeys.length === 0 ||
        questionStatus === "unanswered" ||
        questionStatus === "visited_unanswered" ||
        questionStatus === "flagged";
      if (omitted) {
        stats.omittedCount += 1;
      }

      const isCorrect = item["isCorrect"] === true;
      if (!isCorrect) {
        stats.incorrectCount += 1;
        stats.hasSeenIncorrect = true;
      } else if (stats.hasSeenIncorrect) {
        stats.correctOnReattempt = true;
      }

      history.set(itemId, stats);
    }
  }

  return history;
}

function matchesCustomUsageFilter(
  itemId: string,
  filter: "all" | "unused" | "incorrect" | "marked" | "omitted" | "correct_on_reattempt",
  history: Map<string, LearnerQuestionUsageStats>,
): boolean {
  if (filter === "all") {
    return true;
  }

  const stats = history.get(itemId);
  switch (filter) {
  case "unused":
    return !stats || stats.seenCount === 0;
  case "incorrect":
    return Boolean(stats && stats.incorrectCount > 0);
  case "marked":
    return Boolean(stats && stats.markedCount > 0);
  case "omitted":
    return Boolean(stats && stats.omittedCount > 0);
  case "correct_on_reattempt":
    return Boolean(stats && stats.correctOnReattempt);
  default:
    return true;
  }
}

function countCustomAvailabilityOptions(
  items: Array<ExamPrepQuestionRecord & {id: string}>,
  pickTitle: (item: ExamPrepQuestionRecord & {id: string}) => string,
): Array<{title: string; count: number}> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const title = pickTitle(item).trim();
    if (!title) {
      continue;
    }

    counts.set(title, (counts.get(title) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([title, count]) => ({title, count}))
    .sort((left, right) => left.title.localeCompare(right.title));
}

async function loadCustomExamPrepQuestionAvailability(args: {
  orgId: string;
  uid: string;
  programSpaceId?: string;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  questionFamily: "mixed" | "classic" | "ngn";
  questionUsageFilter: "all" | "unused" | "incorrect" | "marked" | "omitted" | "correct_on_reattempt";
  courseGroupTitle?: string;
  moduleTitle?: string;
}) {
  const questionSnap = await db.collection(`organizations/${args.orgId}/questionBank`).get();
  const questionUsageHistory = await loadLearnerQuestionUsageHistory(args.orgId, args.uid);
  const programScope = await resolveRequestedExamPrepProgramScope(String(args.programSpaceId || "").trim());

  let baseEligible = questionSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as ExamPrepQuestionRecord)}))
    .filter((item) => item.active !== false && String(item.workflowStatus || "") === "published")
    .filter((item) => matchesExamPrepProgramScope(item.programId, null, programScope));

  if (args.difficulty !== "mixed") {
    baseEligible = baseEligible.filter((item) => String(item.difficulty || "").trim().toLowerCase() === args.difficulty);
  }

  baseEligible = baseEligible.filter((item) => matchesCustomQuestionFamily(item, args.questionFamily));
  baseEligible = baseEligible.filter((item) => matchesCustomUsageFilter(String(item.id || ""), args.questionUsageFilter, questionUsageHistory));

  const availableCourseGroups = countCustomAvailabilityOptions(baseEligible, (item) => String(item.courseGroupTitle || ""));
  const scopedForModules = args.courseGroupTitle
    ? baseEligible.filter((item) => String(item.courseGroupTitle || "").trim() === String(args.courseGroupTitle || "").trim())
    : baseEligible;
  const availableModules = countCustomAvailabilityOptions(scopedForModules, (item) => String(item.moduleTitle || ""));

  let eligible = baseEligible;
  if (args.courseGroupTitle) {
    eligible = eligible.filter((item) => String(item.courseGroupTitle || "").trim() === String(args.courseGroupTitle || "").trim());
  }
  if (args.moduleTitle) {
    eligible = eligible.filter((item) => String(item.moduleTitle || "").trim() === String(args.moduleTitle || "").trim());
  }

  const bucketed = new Map<string, Array<ExamPrepQuestionRecord & {id: string}>>();
  for (const item of eligible) {
    const key = [
      String(item.programId || ""),
      String(item.jurisdiction || ""),
      String(item.examTrack || ""),
    ].join("|");
    if (!bucketed.has(key)) {
      bucketed.set(key, []);
    }
    bucketed.get(key)!.push(item);
  }

  const selectedBucket = [...bucketed.values()].sort((left, right) => right.length - left.length)[0] || [];
  return {
    baseEligible,
    eligible,
    selectedBucket,
    availableCourseGroups,
    availableModules,
  };
}

function buildCustomAssessmentMode(preset: "timed" | "tutorial" | "cat_style"): string {
  switch (preset) {
  case "tutorial":
    return "adaptive_remediation_exam";
  case "cat_style":
    return "cat_like_mock";
  default:
    return "jurisdiction_readiness_exam";
  }
}

function buildCustomAssessmentReviewMode(preset: "timed" | "tutorial" | "cat_style"): string {
  switch (preset) {
  case "tutorial":
    return "full_review";
  case "cat_style":
    return "no_review";
  default:
    return "summary_only";
  }
}

function buildCustomAssessmentDeliveryMode(preset: "timed" | "tutorial" | "cat_style"): string {
  switch (preset) {
  case "tutorial":
    return "review_mode";
  case "cat_style":
    return "strict_nclex_mode";
  default:
    return "flaggable_mock_mode";
  }
}

function buildCustomAssessmentTitle(args: {
  title?: string;
  questionCount: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  family: "mixed" | "classic" | "ngn";
  preset: "timed" | "tutorial" | "cat_style";
  courseGroupTitle?: string;
  moduleTitle?: string;
}): string {
  const explicitTitle = String(args.title || "").trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const focus = String(args.moduleTitle || args.courseGroupTitle || "Comprehensive").trim();
  const difficultyLabel = args.difficulty === "mixed"
    ? "Mixed difficulty"
    : `${args.difficulty.charAt(0).toUpperCase()}${args.difficulty.slice(1)} difficulty`;
  const familyLabel = args.family === "mixed"
    ? "mixed format"
    : args.family === "ngn"
      ? "NGN"
      : "classic";
  const presetLabel = args.preset === "tutorial"
    ? "Tutorial"
    : args.preset === "cat_style"
      ? "CAT-style"
      : "Timed";

  return `${presetLabel} ${focus} test · ${args.questionCount} Q · ${difficultyLabel} · ${familyLabel}`;
}

function matchesNotificationRole(userRole: string, targetRole: NotificationRole): boolean {
  const normalizedRole = String(userRole || "").trim();

  switch (targetRole) {
  case "admin":
    return ["admin", "org_admin", "super_admin", "programAdmin"].includes(normalizedRole);
  case "manager":
    return ["manager", "org_manager"].includes(normalizedRole);
  case "learner":
    return ["learner", "org_learner", "guest", "programLearner"].includes(normalizedRole);
  case "staff":
    return ["staff", "programStaff", "instructor"].includes(normalizedRole);
  case "nurse":
    return normalizedRole === "nurse";
  default:
    return false;
  }
}

async function resolveNotificationRecipients(
  callerCtx: {role: string; orgId: string | null; active: boolean},
  audience: NotificationAudienceInput,
): Promise<Array<{uid: string; role: string; orgId: string | null; displayName?: string | null}>> {
  const callerOrgId = String(callerCtx.orgId || "").trim() || null;
  const isSuperAdminCaller = callerCtx.role === "super_admin";

  if (audience.type === "user") {
    const targetUid = String(audience.uid || "").trim();
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "Audience user uid is required.");
    }

    const userSnap = await db.doc(`users/${targetUid}`).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "Target user not found.");
    }

    const targetOrgId = String(userSnap.get("orgId") || "").trim() || null;
    if (!isSuperAdminCaller && callerOrgId !== targetOrgId) {
      throw new HttpsError("permission-denied", "You can only notify users in your organization.");
    }

    return [{
      uid: targetUid,
      role: String(userSnap.get("role") || ""),
      orgId: targetOrgId,
      displayName: String(userSnap.get("displayName") || "").trim() || null,
    }];
  }

  let usersQuery: admin.firestore.Query = db.collection("users").where("active", "!=", false);
  if (!isSuperAdminCaller) {
    if (!callerOrgId) {
      throw new HttpsError("failed-precondition", "Caller orgId is required to send notifications.");
    }
    usersQuery = usersQuery.where("orgId", "==", callerOrgId);
  }

  const snap = await usersQuery.get();
  return snap.docs
    .map((docSnap) => ({
      uid: docSnap.id,
      role: String(docSnap.get("role") || ""),
      orgId: String(docSnap.get("orgId") || "").trim() || null,
      displayName: String(docSnap.get("displayName") || "").trim() || null,
    }))
    .filter((user) => {
      if (audience.type === "all") {
        return true;
      }
      return matchesNotificationRole(user.role, audience.role);
    });
}

async function writeNotificationInboxEntries(
  recipients: Array<{uid: string; role: string; orgId: string | null; displayName?: string | null}>,
  payload: {
    notificationId: string;
    title: string;
    body: string;
    link: string | null;
    severity: "info" | "warning" | "critical";
    category: NotificationCategory;
    audience: NotificationAudienceInput;
    createdBy: {uid: string; name: string};
    orgId: string | null;
  },
): Promise<void> {
  const chunkSize = 400;
  for (let startIndex = 0; startIndex < recipients.length; startIndex += chunkSize) {
    const batch = db.batch();
    for (const recipient of recipients.slice(startIndex, startIndex + chunkSize)) {
      const ref = db.doc(`users/${recipient.uid}/notifications/${payload.notificationId}`);
      batch.set(ref, {
        id: payload.notificationId,
        title: payload.title,
        body: payload.body,
        link: payload.link,
        severity: payload.severity,
        category: payload.category,
        audience: payload.audience,
        organizationId: recipient.orgId || payload.orgId,
        targetUid: recipient.uid,
        targetRole: recipient.role,
        readAt: null,
        archivedAt: null,
        createdAt: nowTs(),
        createdBy: payload.createdBy,
      }, {merge: true});
    }
    await batch.commit();
  }
}

async function writeAdminNotificationLog(
  payload: {
    notificationId: string;
    title: string;
    body: string;
    link: string | null;
    severity: "info" | "warning" | "critical";
    category: NotificationCategory;
    audience: NotificationAudienceInput;
    createdBy: {uid: string; name: string};
    orgId: string | null;
    recipientsCount: number;
  },
): Promise<void> {
  await db.doc(`adminNotifications/${payload.notificationId}`).set({
    id: payload.notificationId,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    severity: payload.severity,
    category: payload.category,
    audience: payload.audience,
    organizationId: payload.orgId,
    recipientsCount: payload.recipientsCount,
    createdAt: nowTs(),
    createdBy: payload.createdBy,
  }, {merge: true});
}

async function sendSystemNotificationToOrganizationRoles(args: {
  orgId: string | null;
  roles: NotificationRole[];
  title: string;
  body: string;
  link?: string | null;
  severity?: "info" | "warning" | "critical";
  category?: NotificationCategory;
}): Promise<void> {
  const normalizedOrgId = String(args.orgId || "").trim() || null;
  if (!normalizedOrgId || !args.roles.length) {
    return;
  }

  const usersSnap = await db
    .collection("users")
    .where("orgId", "==", normalizedOrgId)
    .where("active", "!=", false)
    .get();

  const recipients = usersSnap.docs
    .map((docSnap) => ({
      uid: docSnap.id,
      role: String(docSnap.get("role") || ""),
      orgId: String(docSnap.get("orgId") || "").trim() || null,
      displayName: String(docSnap.get("displayName") || "").trim() || null,
    }))
    .filter((user) => args.roles.some((role) => matchesNotificationRole(user.role, role)));

  if (!recipients.length) {
    return;
  }

  const notificationId = db.collection("_notificationIds").doc().id;
  const title = String(args.title || "").trim();
  const body = String(args.body || "").trim();
  const link = String(args.link || "").trim() || null;
  const severity = args.severity || "info";
  const category = args.category || "commerce";

  await writeNotificationInboxEntries(recipients, {
    notificationId,
    title,
    body,
    link,
    severity,
    category,
    audience: {type: "role", role: "admin"},
    createdBy: {
      uid: "system",
      name: "System",
    },
    orgId: normalizedOrgId,
  });

  await writeAdminNotificationLog({
    notificationId,
    title,
    body,
    link,
    severity,
    category,
    audience: {type: "role", role: "admin"},
    createdBy: {
      uid: "system",
      name: "System",
    },
    orgId: normalizedOrgId,
    recipientsCount: recipients.length,
  });
}

async function sendSystemNotificationToUser(args: {
  uid: string;
  title: string;
  body: string;
  link?: string | null;
  severity?: "info" | "warning" | "critical";
  category?: NotificationCategory;
  organizationId?: string | null;
  targetRole?: string | null;
}): Promise<void> {
  const uid = String(args.uid || "").trim();
  if (!uid) {
    return;
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    return;
  }

  const notificationId = db.collection("_notificationIds").doc().id;
  await writeNotificationInboxEntries([
    {
      uid,
      role: String(args.targetRole || userSnap.get("role") || ""),
      orgId: String(args.organizationId || userSnap.get("orgId") || "").trim() || null,
      displayName: String(userSnap.get("displayName") || "").trim() || null,
    },
  ], {
    notificationId,
    title: String(args.title || "").trim(),
    body: String(args.body || "").trim(),
    link: String(args.link || "").trim() || null,
    severity: args.severity || "info",
    category: args.category || "announcements",
    audience: {type: "user", uid},
    createdBy: {
      uid: "system",
      name: "System",
    },
    orgId: String(args.organizationId || userSnap.get("orgId") || "").trim() || null,
  });
}

async function resolveAccessNotificationMeta(
  itemType: OfferType,
  itemId: string,
): Promise<{title: string; body: string; link: string | null; category: NotificationCategory}> {
  const normalizedItemId = String(itemId || "").trim();

  if (itemType === "tutor_session") {
    return {
      title: "Tutor session confirmed",
      body: "Your private tutoring session is confirmed and visible in your tutor bookings space.",
      link: "/private-tutors/bookings",
      category: "live_sessions",
    };
  }

  if (itemType === "course") {
    const courseSnap = await db.doc(`courses/${normalizedItemId}`).get();
    const title = String(courseSnap.get("title") || "your course").trim() || "your course";
    return {
      title: "Course access granted",
      body: `Access to ${title} is now active in your guest course library.`,
      link: "/guest/courses",
      category: "commerce",
    };
  }

  if (itemType === "program") {
    const programSnap = await db.doc(`programs/${normalizedItemId}`).get();
    const title = String(programSnap.get("title") || "your program").trim() || "your program";
    return {
      title: "Program access granted",
      body: `Access to ${title} is now active in your guest programs space.`,
      link: "/guest/programs",
      category: "commerce",
    };
  }

  const programLiveSessionMeta = parseProgramLiveSessionItemId(normalizedItemId);
  if (programLiveSessionMeta) {
    const {programId, sessionId} = programLiveSessionMeta;
    const {session} = await getProgramLiveSessionOrThrow(programId, sessionId);
    const title = String(session.title || "your live session").trim() || "your live session";
    return {
      title: "Live session booked",
      body: `${title} is now confirmed in your program live sessions.`,
      link: `/my-programs/${programId}/live-sessions`,
      category: "live_sessions",
    };
  }

  const liveClassSnap = await db.doc(`liveClasses/${normalizedItemId}`).get();
  const title = String(liveClassSnap.get("title") || "your live class").trim() || "your live class";
  return {
    title: "Live class booked",
    body: `${title} is now confirmed in your bookings.`,
    link: "/guest/bookings",
    category: "live_sessions",
  };
}

function toQuestionChoice(choice: unknown, index: number): {id: string; label: string; text: string; rationale?: string} {
  const record = (choice || {}) as Record<string, unknown>;
  const id = String(record["id"] || String.fromCharCode(65 + index));
  const rationale = String(record["rationale"] || "").trim();
  const normalized: {id: string; label: string; text: string; rationale?: string} = {
    id,
    label: String(record["label"] || id),
    text: String(record["text"] || ""),
  };
  if (rationale) {
    normalized.rationale = rationale;
  }
  return normalized;
}

function mergeChoiceRationalesIntoChoices(item: ExamPrepQuestionRecord): Array<{id: string; label: string; text: string; rationale?: string}> {
  const map = item.choiceRationales || {};
  return Array.isArray(item.choices)
    ? item.choices.map((choice, index) => {
        const normalized = toQuestionChoice(choice, index);
        const fallbackRationale = String(map[normalized.id] || "").trim();
        const mergedRationale = normalized.rationale || fallbackRationale;
        if (!mergedRationale) {
          return normalized;
        }
        return {
          ...normalized,
          rationale: mergedRationale,
        };
      })
    : [];
}

function stripGeneratedExamPrepBoilerplate(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text
    .replace(/^\**\s*The item belongs to the case study\s+".*?"\.?\s*/i, "")
    .replace(/^\**\s*This item targets\s+.*?\.\s*/i, "")
    .replace(/^\**\s*The item belongs to\s+.*?\.\s*/i, "")
    .replace(/^\**\s*This item\s+belongs\s+to\s+.*?\.\s*/i, "")
    .replace(/^\**\s*This item targets\s+.*$/gim, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeExamPrepQuestion(
  item: ExamPrepQuestionRecord,
): Record<string, unknown> {
  const choices = mergeChoiceRationalesIntoChoices(item);
  return {
    id: String(item.id || ""),
    stem: stripGeneratedExamPrepBoilerplate(item.stem),
    scenarioText: item.scenarioText ? stripGeneratedExamPrepBoilerplate(item.scenarioText) : null,
    leadInQuestion: stripGeneratedExamPrepBoilerplate(item.leadInQuestion),
    itemType: String(item.itemType || "single_choice"),
    interactionConfig: normalizeInteractionConfig(item.interactionConfig),
    moduleTitle: String(item.moduleTitle || ""),
    courseGroupTitle: String(item.courseGroupTitle || ""),
    parentCaseId: item.parentCaseId ? String(item.parentCaseId) : null,
    points: Number(item.points || 1),
    choices,
  };
}

function buildExamPrepAssemblyItemSnapshot(args: {
  item: ExamPrepQuestionRecord & {id: string};
  deliveredQuestion?: Record<string, unknown> | null;
  sequenceIndex: number;
}): Record<string, unknown> {
  const rawItem = args.item as ExamPrepQuestionRecord & {
    sourceAuthority?: string;
    sourceReferenceTitle?: string;
  };
  const deliveredChoices = Array.isArray(args.deliveredQuestion?.["choices"])
    ? (args.deliveredQuestion?.["choices"] as Array<Record<string, unknown>>)
    : mergeChoiceRationalesIntoChoices(args.item);

  return {
    id: args.item.id,
    itemId: args.item.id,
    sequenceIndex: args.sequenceIndex,
    stem: stripGeneratedExamPrepBoilerplate(args.item.stem),
    scenarioText: args.item.scenarioText ? stripGeneratedExamPrepBoilerplate(args.item.scenarioText) : null,
    leadInQuestion: stripGeneratedExamPrepBoilerplate(args.item.leadInQuestion),
    itemType: String(args.item.itemType || "single_choice"),
    interactionConfig: normalizeInteractionConfig(args.item.interactionConfig),
    moduleId: String(args.item.moduleId || ""),
    moduleTitle: String(args.item.moduleTitle || ""),
    courseGroupId: String(args.item.courseGroupId || ""),
    courseGroupTitle: String(args.item.courseGroupTitle || ""),
    parentCaseId: args.item.parentCaseId ? String(args.item.parentCaseId) : null,
    points: Number(args.item.points || 1),
    choices: deliveredChoices,
    correctAnswerKey: normalizeStringArray(args.item.correctAnswerKey),
    explanation: stripGeneratedExamPrepBoilerplate(args.item.explanation) || null,
    rationale: stripGeneratedExamPrepBoilerplate(args.item.rationale) || null,
    tags: normalizeStringArray(args.item.tags),
    remediationModuleIds: normalizeStringArray(args.item.remediationModuleIds),
    remediationLessonIds: normalizeStringArray(args.item.remediationLessonIds),
    remediationTags: normalizeStringArray(args.item.remediationTags),
    cognitiveLevel: String(args.item.cognitiveLevel || "general"),
    sourceAuthority: String(rawItem.sourceAuthority || ""),
    sourceReferenceTitle: String(rawItem.sourceReferenceTitle || ""),
  };
}

function mapExamPrepAssemblyItemToQuestionRecord(
  item: Record<string, unknown>,
): ExamPrepQuestionRecord & {id: string} {
  return {
    id: String(item["itemId"] || item["id"] || ""),
    stem: stripGeneratedExamPrepBoilerplate(item["stem"]),
    scenarioText: item["scenarioText"] ? stripGeneratedExamPrepBoilerplate(item["scenarioText"]) : null,
    leadInQuestion: stripGeneratedExamPrepBoilerplate(item["leadInQuestion"]),
    itemType: String(item["itemType"] || "single_choice"),
    interactionConfig: normalizeInteractionConfig(item["interactionConfig"]),
    moduleId: String(item["moduleId"] || ""),
    moduleTitle: String(item["moduleTitle"] || ""),
    courseGroupId: String(item["courseGroupId"] || ""),
    courseGroupTitle: String(item["courseGroupTitle"] || ""),
    parentCaseId: item["parentCaseId"] ? String(item["parentCaseId"]) : null,
    points: Number(item["points"] || 1),
    choices: Array.isArray(item["choices"]) ? item["choices"] as Array<Record<string, unknown>> : [],
    correctAnswerKey: normalizeStringArray(item["correctAnswerKey"]),
    explanation: stripGeneratedExamPrepBoilerplate(item["explanation"]) || undefined,
    rationale: stripGeneratedExamPrepBoilerplate(item["rationale"]) || undefined,
    tags: normalizeStringArray(item["tags"]),
    remediationModuleIds: normalizeStringArray(item["remediationModuleIds"]),
    remediationLessonIds: normalizeStringArray(item["remediationLessonIds"]),
    remediationTags: normalizeStringArray(item["remediationTags"]),
    cognitiveLevel: String(item["cognitiveLevel"] || "general"),
  };
}

async function writeExamPrepAssemblySnapshot(args: {
  orgId: string;
  assemblyId: string;
  learnerId: string;
  assessment: ExamPrepAssessmentRecord & {id: string};
  questionDocs: Array<ExamPrepQuestionRecord & {id: string}>;
  deliveredQuestions: Record<string, unknown>[];
  programSpaceId?: string;
}): Promise<void> {
  const assemblyRef = db.doc(`organizations/${args.orgId}/assessmentAssemblies/${args.assemblyId}`);
  const batch = db.batch();
  const policy = buildExamPrepPolicy(args.assessment);
  const itemOrder = args.deliveredQuestions.map((question) => String(question["id"] || "")).filter(Boolean);

  batch.set(assemblyRef, {
    id: args.assemblyId,
    organizationId: args.orgId,
    learnerId: args.learnerId,
    assessmentId: String(args.assessment.id || ""),
    assessmentTitle: String(args.assessment.title || "Exam Prep Assessment"),
    assessmentMode: String(args.assessment.assessmentMode || "exam"),
    publicProgramId: String(args.programSpaceId || "").trim() || null,
    programId: String(args.assessment.programId || ""),
    jurisdiction: String(args.assessment.jurisdiction || ""),
    examTrack: String(args.assessment.examTrack || ""),
    itemOrder,
    itemCount: itemOrder.length,
    reviewMode: String(args.assessment.reviewMode || "summary_only"),
    policy,
    sourceMode: String(args.assessment.sourceMode || "fixed_static"),
    blueprintId: String(args.assessment.blueprintId || "").trim() || null,
    createdAt: nowTs(),
    updatedAt: nowTs(),
    createdBy: args.learnerId,
    updatedBy: args.learnerId,
  }, {merge: true});

  args.questionDocs.forEach((item, index) => {
    const deliveredQuestion = args.deliveredQuestions.find((entry) => String(entry["id"] || "") === item.id) || null;
    const assemblyItemRef = assemblyRef.collection("items").doc(item.id);
    batch.set(assemblyItemRef, buildExamPrepAssemblyItemSnapshot({
      item,
      deliveredQuestion,
      sequenceIndex: index,
    }), {merge: true});
  });

  await batch.commit();
}

async function readExamPrepAssemblyQuestionSnapshots(
  orgId: string,
  assemblyId: string,
): Promise<Record<string, unknown>[]> {
  const snap = await db
    .collection(`organizations/${orgId}/assessmentAssemblies/${assemblyId}/items`)
    .orderBy("sequenceIndex", "asc")
    .get();

  return snap.docs.map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as Record<string, unknown>)}));
}

async function readExamPrepResponseDocs(
  orgId: string,
  attemptId: string,
): Promise<Record<string, Record<string, unknown>>> {
  const snap = await db
    .collection(`organizations/${orgId}/attemptSessions/${attemptId}/responses`)
    .get();

  return Object.fromEntries(
    snap.docs.map((docSnap) => [docSnap.id, {id: docSnap.id, ...(docSnap.data() as Record<string, unknown>)}]),
  );
}

function buildExamPrepRuntimeStateFromAttempt(args: {
  attempt: Record<string, unknown>;
  assessment?: ExamPrepAssessmentRecord | null;
}): ExamPrepRuntimeState {
  const questionIds = Array.isArray(args.attempt["deliveredQuestionIds"])
    ? normalizeStringArray(args.attempt["deliveredQuestionIds"])
    : [];
  const answers = normalizeExamPrepAnswerMap(args.attempt["answerMap"]);
  const flags = normalizeBooleanMap(args.attempt["flagMap"]);
  const questionDurations = normalizeNumberMap(args.attempt["questionDurations"]);
  const visitedQuestionIds = normalizeStringArray(args.attempt["visitedQuestionIds"]);
  const lockedQuestionIds = getExamPrepLockedQuestionIds(args.attempt["lockedQuestionIds"]);
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    lockedQuestionIds,
    args.assessment ? deriveExamPrepDeliveryMode(args.assessment) : undefined,
  );

  return {
    questionIds,
    answers,
    flags,
    questionDurations,
    visitedQuestionIds,
    lockedQuestionIds,
    questionStatuses,
  };
}

async function readExamPrepAttemptRuntimeState(args: {
  orgId: string;
  attemptId: string;
  attempt: Record<string, unknown>;
  assessment?: ExamPrepAssessmentRecord | null;
}): Promise<ExamPrepRuntimeState> {
  const fallbackState = buildExamPrepRuntimeStateFromAttempt({
    attempt: args.attempt,
    assessment: args.assessment,
  });
  const responseDocs = await readExamPrepResponseDocs(args.orgId, args.attemptId);
  const responseEntries = Object.entries(responseDocs);
  if (!responseEntries.length) {
    return fallbackState;
  }

  const questionIds = fallbackState.questionIds.length
    ? fallbackState.questionIds
    : responseEntries.map(([questionId]) => questionId);
  const answers = Object.fromEntries(
    responseEntries.map(([questionId, response]) => [questionId, normalizeStringArray(response["selectedAnswerKeys"])]),
  );
  const flags = Object.fromEntries(
    responseEntries.map(([questionId, response]) => [questionId, response["flagged"] === true]),
  );
  const questionDurations = Object.fromEntries(
    responseEntries.map(([questionId, response]) => [questionId, Math.max(0, Number(response["responseTimeSeconds"] || 0))]),
  );
  const visitedQuestionIds = questionIds.filter((questionId) => responseDocs[questionId]?.["visited"] === true);
  const lockedQuestionIds = questionIds.filter((questionId) => responseDocs[questionId]?.["locked"] === true);
  const deliveryMode = args.assessment ? deriveExamPrepDeliveryMode(args.assessment) : "practice_mode";
  const visited = new Set(visitedQuestionIds);
  const locked = new Set(lockedQuestionIds);
  const questionStatuses = Object.fromEntries(
    questionIds.map((questionId) => {
      const explicitStatus = String(responseDocs[questionId]?.["questionStatus"] || "").trim();
      const derivedStatus = deriveExamPrepQuestionStatus(questionId, answers, flags, visited, locked, deliveryMode);
      return [questionId, explicitStatus || derivedStatus];
    }),
  );

  return {
    questionIds,
    answers,
    flags,
    questionDurations,
    visitedQuestionIds,
    lockedQuestionIds,
    questionStatuses,
  };
}

function buildExamPrepReviewArtifacts(args: {
  questionDocs: Array<ExamPrepQuestionRecord & {id: string}>;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  questionDurations: Record<string, number>;
  questionStatuses: Record<string, string>;
}): {
  reviewItems: Record<string, unknown>[];
  pointsEarned: number;
  totalPoints: number;
  scoreByItemId: Map<string, {pointsEarned: number; pointsPossible: number}>;
} {
  let pointsEarned = 0;
  let totalPoints = 0;
  const reviewItems = args.questionDocs.map((item) => {
    const itemId = item.id;
    const selectedAnswerKeys = Array.isArray(args.answers[itemId]) ? args.answers[itemId].map((value) => String(value)) : [];
    const correctAnswerKeys = Array.isArray(item.correctAnswerKey) ? item.correctAnswerKey.map((value) => String(value)) : [];
    const pointsPossible = Math.max(1, Number(item.points || 1));
    const isCorrect = exactAnswerMatch(selectedAnswerKeys, correctAnswerKeys);
    const earned = isCorrect ? pointsPossible : 0;
    pointsEarned += earned;
    totalPoints += pointsPossible;
    return {
      itemId,
      stem: stripGeneratedExamPrepBoilerplate(item.stem),
      leadInQuestion: stripGeneratedExamPrepBoilerplate(item.leadInQuestion),
      itemType: String(item.itemType || "single_choice"),
      selectedAnswerKeys,
      correctAnswerKeys,
      isCorrect,
      pointsEarned: earned,
      pointsPossible,
      explanation: stripGeneratedExamPrepBoilerplate(item.explanation) || null,
      rationale: stripGeneratedExamPrepBoilerplate(item.rationale) || null,
      markedForReview: args.flags[itemId] === true,
      questionStatus: args.questionStatuses[itemId] || "unanswered",
      timeSpentSeconds: Math.round(args.questionDurations[itemId] || 0),
      choices: mergeChoiceRationalesIntoChoices(item),
    };
  });

  return {
    reviewItems,
    pointsEarned,
    totalPoints,
    scoreByItemId: new Map(
      reviewItems.map((item) => [
        String(item["itemId"] || ""),
        {
          pointsEarned: Number(item["pointsEarned"] || 0),
          pointsPossible: Number(item["pointsPossible"] || 0),
        },
      ]),
    ),
  };
}

async function syncExamPrepResponseDocs(args: {
  orgId: string;
  attemptId: string;
  assessmentId: string;
  assemblyId?: string | null;
  learnerId: string;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  questionDurations: Record<string, number>;
  questionStatuses: Record<string, string>;
  lockedQuestionIds: string[];
  visitedQuestionIds: string[];
  questionIds: string[];
  touchedQuestionIds?: string[];
}): Promise<void> {
  const candidateIds = normalizeStringArray(
    (args.touchedQuestionIds && args.touchedQuestionIds.length ? args.touchedQuestionIds : args.questionIds) || [],
  );
  if (!candidateIds.length) {
    return;
  }

  const locked = new Set(args.lockedQuestionIds);
  const visited = new Set(args.visitedQuestionIds);
  const batch = db.batch();
  const responsesRef = db.collection(`organizations/${args.orgId}/attemptSessions/${args.attemptId}/responses`);

  for (const questionId of candidateIds) {
    const selectedAnswerKeys = normalizeStringArray(args.answers[questionId]);
    const flagged = args.flags[questionId] === true;
    const visitedItem = visited.has(questionId);
    const lockedItem = locked.has(questionId);
    const responseRef = responsesRef.doc(questionId);
    batch.set(responseRef, {
      id: questionId,
      attemptId: args.attemptId,
      assessmentId: args.assessmentId,
      assemblyId: String(args.assemblyId || "").trim() || null,
      learnerId: args.learnerId,
      itemId: questionId,
      selectedAnswerKeys,
      flagged,
      visited: visitedItem,
      locked: lockedItem,
      questionStatus: String(args.questionStatuses[questionId] || "unanswered"),
      responseTimeSeconds: Math.max(0, Number(args.questionDurations[questionId] || 0)),
      updatedAt: nowTs(),
      updatedBy: args.learnerId,
      createdAt: nowTs(),
      createdBy: args.learnerId,
    }, {merge: true});
  }

  await batch.commit();
}

function buildDeliveredChoiceOrderMap(questions: Record<string, unknown>[]): Record<string, string[]> {
  return Object.fromEntries(
    questions
      .map((question) => {
        const questionId = String(question["id"] || "").trim();
        const choiceIds = Array.isArray(question["choices"])
          ? (question["choices"] as Array<Record<string, unknown>>)
              .map((choice) => String(choice["id"] || "").trim())
              .filter(Boolean)
          : [];
        return [questionId, choiceIds] as const;
      })
      .filter(([questionId, choiceIds]) => Boolean(questionId) && choiceIds.length > 0),
  );
}

function applyDeliveredChoiceOrder(
  questions: Record<string, unknown>[],
  rawChoiceOrderMap: unknown,
): Record<string, unknown>[] {
  const choiceOrderMap = (rawChoiceOrderMap || {}) as Record<string, unknown>;

  return questions.map((question) => {
    const questionId = String(question["id"] || "").trim();
    const storedChoiceOrder = Array.isArray(choiceOrderMap[questionId])
      ? (choiceOrderMap[questionId] as unknown[]).map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!storedChoiceOrder.length || !Array.isArray(question["choices"])) {
      return question;
    }

    const currentChoices = (question["choices"] as Array<Record<string, unknown>>)
      .filter((choice) => String(choice["id"] || "").trim());
    if (!currentChoices.length) {
      return question;
    }

    const byId = new Map(currentChoices.map((choice) => [String(choice["id"] || "").trim(), choice]));
    const reorderedChoices: Array<Record<string, unknown>> = [];

    for (const choiceId of storedChoiceOrder) {
      const match = byId.get(choiceId);
      if (match) {
        reorderedChoices.push(match);
        byId.delete(choiceId);
      }
    }

    for (const choice of currentChoices) {
      const choiceId = String(choice["id"] || "").trim();
      if (byId.has(choiceId)) {
        reorderedChoices.push(choice);
        byId.delete(choiceId);
      }
    }

    return {
      ...question,
      choices: reorderedChoices,
    };
  });
}

function buildExamPrepDomainScores(
  items: ExamPrepQuestionRecord[],
  scoreByItemId: Map<string, {pointsEarned: number; pointsPossible: number}>,
): {domainScores: Record<string, number>; moduleScores: Record<string, number>; tagScores: Record<string, number>; clinicalJudgmentScores: Record<string, number>; caseStudyScores: Record<string, number>} {
  const domainScores: Record<string, {earned: number; total: number}> = {};
  const moduleScores: Record<string, {earned: number; total: number}> = {};
  const tagScores: Record<string, {earned: number; total: number}> = {};
  const clinicalJudgmentScores: Record<string, {earned: number; total: number}> = {};
  const caseStudyScores: Record<string, {earned: number; total: number}> = {};

  for (const item of items) {
    const itemId = String(item.id || "");
    const score = scoreByItemId.get(itemId) || {pointsEarned: 0, pointsPossible: Number(item.points || 1)};
    const courseGroupKey = String(item.courseGroupId || item.courseGroupTitle || "general");
    const moduleKey = String(item.moduleId || item.moduleTitle || "general");
    const cognitiveKey = String(item.cognitiveLevel || "general");
    const caseKey = String(item.parentCaseId || "standalone");

    if (!domainScores[courseGroupKey]) domainScores[courseGroupKey] = {earned: 0, total: 0};
    if (!moduleScores[moduleKey]) moduleScores[moduleKey] = {earned: 0, total: 0};
    if (!clinicalJudgmentScores[cognitiveKey]) clinicalJudgmentScores[cognitiveKey] = {earned: 0, total: 0};
    if (!caseStudyScores[caseKey]) caseStudyScores[caseKey] = {earned: 0, total: 0};

    domainScores[courseGroupKey].earned += score.pointsEarned;
    domainScores[courseGroupKey].total += score.pointsPossible;
    moduleScores[moduleKey].earned += score.pointsEarned;
    moduleScores[moduleKey].total += score.pointsPossible;
    clinicalJudgmentScores[cognitiveKey].earned += score.pointsEarned;
    clinicalJudgmentScores[cognitiveKey].total += score.pointsPossible;
    caseStudyScores[caseKey].earned += score.pointsEarned;
    caseStudyScores[caseKey].total += score.pointsPossible;

    const tags = Array.isArray(item.tags) ? item.tags : [];
    for (const rawTag of tags) {
      const tag = String(rawTag || "").trim();
      if (!tag) continue;
      if (!tagScores[tag]) tagScores[tag] = {earned: 0, total: 0};
      tagScores[tag].earned += score.pointsEarned;
      tagScores[tag].total += score.pointsPossible;
    }
  }

  const toPercentRecord = (value: Record<string, {earned: number; total: number}>): Record<string, number> =>
    Object.fromEntries(
      Object.entries(value).map(([key, score]) => [
        key,
        score.total > 0 ? Math.round((score.earned / score.total) * 1000) / 10 : 0,
      ]),
    );

  return {
    domainScores: toPercentRecord(domainScores),
    moduleScores: toPercentRecord(moduleScores),
    tagScores: toPercentRecord(tagScores),
    clinicalJudgmentScores: toPercentRecord(clinicalJudgmentScores),
    caseStudyScores: toPercentRecord(caseStudyScores),
  };
}

async function resolveExamPrepQuestionDocs(
  orgId: string,
  assessment: ExamPrepAssessmentRecord,
): Promise<Array<ExamPrepQuestionRecord & {id: string}>> {
  if (String(assessment.sourceMode || "") === "fixed_static") {
    const fixedIds = normalizeStringArray(assessment.fixedQuestionIds);
    if (!fixedIds.length) {
      return [];
    }

    const fixedQuestionSnaps = await Promise.all(
      fixedIds.map((questionId) => db.doc(`organizations/${orgId}/questionBank/${questionId}`).get()),
    );

    return fixedQuestionSnaps
      .filter((docSnap) => docSnap.exists)
      .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as ExamPrepQuestionRecord)}))
      .filter((item) =>
        item.active !== false &&
        String(item.workflowStatus || "") === "published" &&
        String(item.programId || "") === String(assessment.programId || "") &&
        String(item.jurisdiction || "") === String(assessment.jurisdiction || "") &&
        String(item.examTrack || "") === String(assessment.examTrack || "")
      );
  }

  let eligibleQuery: admin.firestore.Query = db
    .collection(`organizations/${orgId}/questionBank`)
    .where("active", "==", true)
    .where("workflowStatus", "==", "published")
    .where("programId", "==", String(assessment.programId || ""))
    .where("jurisdiction", "==", String(assessment.jurisdiction || ""))
    .where("examTrack", "==", String(assessment.examTrack || ""));

  if (assessment.courseGroupId) {
    eligibleQuery = eligibleQuery.where("courseGroupId", "==", String(assessment.courseGroupId || ""));
  }
  if (assessment.moduleId) {
    eligibleQuery = eligibleQuery.where("moduleId", "==", String(assessment.moduleId || ""));
  }

  const eligibleSnap = await eligibleQuery.get();
  let eligible: Array<ExamPrepQuestionRecord & {id: string}> = eligibleSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as ExamPrepQuestionRecord)}));

  if (String(assessment.sourceMode || "") === "blueprint_assembled" && assessment.blueprintId) {
    const blueprintSnap = await db.doc(`organizations/${orgId}/examBlueprints/${String(assessment.blueprintId)}`).get();
    if (blueprintSnap.exists) {
      const blueprint = blueprintSnap.data() as ExamPrepBlueprintRecord;
      const selected: Array<ExamPrepQuestionRecord & {id: string}> = [];
      const used = new Set<string>();
      const rules = Array.isArray(blueprint.courseGroupDistributions) ? blueprint.courseGroupDistributions : [];
      for (const rule of rules) {
        const target = Number(rule.targetCount || rule.minCount || 0);
        if (!target) continue;
        const matches = eligible.filter((item) => String(item.courseGroupId || "") === String(rule.key || "") && !used.has(String(item.id || "")));
        for (const item of matches.slice(0, target)) {
          selected.push(item);
          used.add(String(item.id || ""));
        }
      }

      const totalTarget = Number(assessment.drawCount || blueprint.totalQuestionCount || 0) || selected.length;
      const remainder = eligible.filter((item) => !used.has(String(item.id || "")));
      for (const item of remainder.slice(0, Math.max(totalTarget - selected.length, 0))) {
        selected.push(item);
      }
      eligible = selected;
    }
  }

  const targetCount = Math.max(1, Number(assessment.drawCount || eligible.length || 1));
  const ordered = assessment.randomizeQuestionOrder === true ? shuffleList(eligible) : eligible;
  return ordered.slice(0, targetCount);
}

function buildExamPrepReviewFlags(assessment: ExamPrepAssessmentRecord): {showCorrectAnswers: boolean; showRationales: boolean} {
  const reviewMode = String(assessment.reviewMode || "summary_only");
  return {
    showCorrectAnswers:
      assessment.showCorrectAnswersAfterSubmit === true ||
      reviewMode === "show_answers" ||
      reviewMode === "show_rationales" ||
      reviewMode === "full_review",
    showRationales:
      assessment.showRationalesAfterSubmit === true ||
      reviewMode === "show_rationales" ||
      reviewMode === "full_review",
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function normalizeExamPrepAnswerMap(value: unknown): Record<string, string[]> {
  const record = (value || {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record)
      .map(([itemId, answer]) => [String(itemId || "").trim(), normalizeStringArray(answer)])
      .filter(([itemId]) => Boolean(itemId)),
  );
}

function normalizeBooleanMap(value: unknown): Record<string, boolean> {
  const record = (value || {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, flag]) => [String(key || "").trim(), flag === true])
      .filter(([key]) => Boolean(key)),
  );
}

function normalizeNumberMap(value: unknown): Record<string, number> {
  const record = (value || {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, raw]) => [String(key || "").trim(), Math.max(0, Number(raw || 0))])
      .filter(([key]) => Boolean(key)),
  );
}

function deriveExamPrepDeliveryMode(
  assessment: ExamPrepAssessmentRecord,
): "strict_nclex_mode" | "practice_mode" | "review_mode" | "flaggable_mock_mode" {
  const explicitMode = String(assessment.deliveryMode || "").trim();
  if (
    explicitMode === "strict_nclex_mode" ||
    explicitMode === "practice_mode" ||
    explicitMode === "review_mode" ||
    explicitMode === "flaggable_mock_mode"
  ) {
    return explicitMode;
  }

  if (
    assessment.strictNavigation === true &&
    assessment.allowBackNavigation === false &&
    String(assessment.reviewMode || "no_review") === "no_review"
  ) {
    return "strict_nclex_mode";
  }
  if (assessment.allowQuestionFlagging !== false) {
    return "flaggable_mock_mode";
  }
  if (String(assessment.reviewMode || "summary_only") !== "no_review") {
    return "review_mode";
  }
  return "practice_mode";
}

function getExamPrepLockedQuestionIds(value: unknown): string[] {
  return normalizeStringArray(value);
}

function resolveExamPrepCurrentQuestionIndex(args: {
  questionIds: string[];
  lockedQuestionIds: string[];
  preferredIndex: number;
  deliveryMode: string;
}): number {
  const boundedIndex = Math.max(0, Math.min(Number(args.preferredIndex || 0), Math.max(args.questionIds.length - 1, 0)));
  if (args.deliveryMode !== "strict_nclex_mode") {
    return boundedIndex;
  }

  const locked = new Set(args.lockedQuestionIds);
  const firstUnlockedIndex = args.questionIds.findIndex((itemId) => !locked.has(itemId));
  if (firstUnlockedIndex === -1) {
    return boundedIndex;
  }
  return firstUnlockedIndex;
}

function mergeExamPrepAnswers(args: {
  attempt: Record<string, unknown>;
  existingAnswers?: Record<string, string[]>;
  incomingAnswers?: Record<string, string[]>;
  lockedQuestionIds?: string[];
}): Record<string, string[]> {
  const existingAnswers = normalizeExamPrepAnswerMap(args.existingAnswers ?? args.attempt["answerMap"]);
  const mergedAnswers = {
    ...existingAnswers,
    ...(args.incomingAnswers || {}),
  };

  for (const itemId of args.lockedQuestionIds || []) {
    mergedAnswers[itemId] = existingAnswers[itemId] || mergedAnswers[itemId] || [];
  }

  return normalizeExamPrepAnswerMap(mergedAnswers);
}

function mergeExamPrepFlags(args: {
  attempt: Record<string, unknown>;
  existingFlags?: Record<string, boolean>;
  incomingFlags?: Record<string, boolean>;
  lockedQuestionIds?: string[];
}): Record<string, boolean> {
  const existingFlags = normalizeBooleanMap(args.existingFlags ?? args.attempt["flagMap"]);
  const mergedFlags = {
    ...existingFlags,
    ...(args.incomingFlags || {}),
  };

  for (const itemId of args.lockedQuestionIds || []) {
    mergedFlags[itemId] = existingFlags[itemId] === true;
  }

  return normalizeBooleanMap(mergedFlags);
}

function deriveExamPrepNavigationMode(assessment: ExamPrepAssessmentRecord): "free_navigation" | "forward_only" | "strict_no_backtrack" {
  if (deriveExamPrepDeliveryMode(assessment) === "strict_nclex_mode") {
    return "strict_no_backtrack";
  }
  if (assessment.allowBackNavigation === false) {
    return "forward_only";
  }
  return "free_navigation";
}

function buildExamPrepPolicy(assessment: ExamPrepAssessmentRecord): Record<string, unknown> {
  const deliveryMode = deriveExamPrepDeliveryMode(assessment);
  const navigationMode = deriveExamPrepNavigationMode(assessment);
  const reviewAllowed = deliveryMode === "strict_nclex_mode" ? false : String(assessment.reviewMode || "summary_only") !== "no_review";
  return {
    deliveryMode,
    navigationMode,
    reviewAllowed,
    reviewDisabled: !reviewAllowed,
    allowQuestionFlagging: deliveryMode === "strict_nclex_mode" ? false : assessment.allowQuestionFlagging !== false,
    allowBackNavigation: deliveryMode === "strict_nclex_mode" ? false : navigationMode === "free_navigation",
    strictNoBacktrack: navigationMode === "strict_no_backtrack",
    forwardOnly: navigationMode !== "free_navigation",
    oneQuestionAtATime: true,
    lockQuestionOnConfirm: deliveryMode === "strict_nclex_mode",
    requiresAnswerConfirmation: deliveryMode === "strict_nclex_mode",
    showQuestionPalette: deliveryMode !== "strict_nclex_mode" && navigationMode === "free_navigation",
    allowPauseScreen: true,
    requireAllQuestionsAnswered: deliveryMode === "strict_nclex_mode" || assessment.requireAllQuestionsAnswered === true,
    autoSubmitOnTimeout: assessment.autoSubmitOnTimeout !== false,
    scoreVisibleAfterSubmit: assessment.showScoreImmediately === true,
    warningThresholdsSeconds: [300, 60],
  };
}

function deriveExamPrepQuestionStatus(
  itemId: string,
  answers: Record<string, string[]>,
  flags: Record<string, boolean>,
  visited: Set<string>,
  locked: Set<string>,
  deliveryMode: string,
): string {
  const answered = deliveryMode === "strict_nclex_mode"
    ? locked.has(itemId) && (answers[itemId]?.length || 0) > 0
    : (answers[itemId]?.length || 0) > 0;
  const flagged = deliveryMode === "strict_nclex_mode" ? false : flags[itemId] === true;
  if (flagged && answered) {
    return "flagged_and_answered";
  }
  if (flagged) {
    return "flagged";
  }
  if (answered) {
    return "answered";
  }
  if (visited.has(itemId)) {
    return "visited_unanswered";
  }
  return "unanswered";
}

function buildExamPrepQuestionStatuses(
  questionIds: string[],
  answers: Record<string, string[]>,
  flags: Record<string, boolean>,
  visitedQuestionIds: string[],
  lockedQuestionIds: string[] = [],
  deliveryMode = "practice_mode",
): Record<string, string> {
  const visited = new Set(visitedQuestionIds);
  const locked = new Set(lockedQuestionIds);
  return Object.fromEntries(
    questionIds.map((itemId) => [itemId, deriveExamPrepQuestionStatus(itemId, answers, flags, visited, locked, deliveryMode)]),
  );
}

function buildExamPrepAttemptCounts(questionStatuses: Record<string, string>): {answeredCount: number; unansweredCount: number; flaggedCount: number} {
  let answeredCount = 0;
  let unansweredCount = 0;
  let flaggedCount = 0;

  for (const status of Object.values(questionStatuses)) {
    if (status === "answered" || status === "flagged_and_answered") {
      answeredCount += 1;
    }
    if (status === "unanswered" || status === "visited_unanswered" || status === "flagged") {
      unansweredCount += 1;
    }
    if (status === "flagged" || status === "flagged_and_answered") {
      flaggedCount += 1;
    }
  }

  return {answeredCount, unansweredCount, flaggedCount};
}

function getExamPrepAttemptExpiresAtMs(startedAt: unknown, timeLimitSeconds: number): number {
  const startedAtMs = getExamPrepAttemptStartedAtMs(startedAt);
  if (!startedAtMs) {
    return 0;
  }
  return startedAtMs + (Math.max(1, timeLimitSeconds) * 1000);
}

function computeExamPrepRemainingSeconds(startedAt: unknown, timeLimitSeconds: number): number {
  const expiresAtMs = getExamPrepAttemptExpiresAtMs(startedAt, timeLimitSeconds);
  if (!expiresAtMs) {
    return 0;
  }
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
}

function buildExamPrepSessionPayload(args: {
  attemptId: string;
  assessment: ExamPrepAssessmentRecord & {id: string};
  attempt: Record<string, unknown>;
  questions: Record<string, unknown>[];
  resumed: boolean;
  runtimeState?: ExamPrepRuntimeState;
}): Record<string, unknown> {
  const {attemptId, assessment, attempt, questions, resumed} = args;
  const runtimeState = args.runtimeState || buildExamPrepRuntimeStateFromAttempt({attempt, assessment});
  const answers = runtimeState.answers;
  const flags = runtimeState.flags;
  const visitedQuestionIds = runtimeState.visitedQuestionIds;
  const lockedQuestionIds = runtimeState.lockedQuestionIds;
  const questionIds = runtimeState.questionIds.length
    ? runtimeState.questionIds
    : questions.map((question) => String(question["id"] || "")).filter(Boolean);
  const policy = buildExamPrepPolicy(assessment);
  const deliveryMode = String(policy["deliveryMode"] || "practice_mode");
  const questionStatuses = Object.keys(runtimeState.questionStatuses).length
    ? runtimeState.questionStatuses
    : buildExamPrepQuestionStatuses(questionIds, answers, flags, visitedQuestionIds, lockedQuestionIds, deliveryMode);
  const counts = buildExamPrepAttemptCounts(questionStatuses);
  const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || Number(assessment.durationMinutes || 0) * 60));
  const startedAtMs = getExamPrepAttemptStartedAtMs(attempt["startedAt"]);
  const expiresAtMs = getExamPrepAttemptExpiresAtMs(attempt["startedAt"], timeLimitSeconds);
  const currentQuestionIndex = resolveExamPrepCurrentQuestionIndex({
    questionIds,
    lockedQuestionIds,
    preferredIndex: Number(attempt["currentIndex"] || 0),
    deliveryMode,
  });

  return {
    status: String(attempt["status"] || "in_progress"),
    attemptId,
    assemblyId: String(attempt["assemblyId"] || "").trim() || null,
    assessmentId: String(assessment.id || ""),
    title: String(assessment.title || "Exam Prep Assessment"),
    description: String(assessment.description || ""),
    instructions: String(assessment.instructions || "Read each item carefully and commit your best clinical judgment."),
    reviewMode: String(assessment.reviewMode || "summary_only"),
    passingScorePercent: Number(assessment.passingScorePercent || 70),
    durationMinutes: Number(assessment.durationMinutes || 0),
    attemptNumber: Number(attempt["attemptNumber"] || 1),
    resumed,
    questions,
    currentQuestionIndex,
    totalQuestionCount: questionIds.length,
    confirmedCount: lockedQuestionIds.length,
    answers,
    flags,
    visitedQuestionIds,
    lockedQuestionIds,
    questionStatuses,
    questionDurations: runtimeState.questionDurations,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    startedAtMs,
    expiresAtMs,
    serverNowMs: Date.now(),
    remainingSeconds: computeExamPrepRemainingSeconds(attempt["startedAt"], timeLimitSeconds),
    policy,
  };
}

async function appendExamPrepEvent(args: {
  orgId: string;
  attemptId: string;
  learnerId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const eventType = String(args.eventType || "").trim();
  if (!eventType) {
    return;
  }

  await db.collection(`organizations/${args.orgId}/attemptSessions/${args.attemptId}/events`).add({
    attemptId: args.attemptId,
    learnerId: args.learnerId,
    eventType,
    payload: args.payload || {},
    createdAt: nowTs(),
  });
}

async function loadExamPrepScorableQuestionDocs(args: {
  orgId: string;
  attempt: Record<string, unknown>;
  scorableQuestionIds: string[];
}): Promise<Array<ExamPrepQuestionRecord & {id: string}>> {
  const assemblyId = String(args.attempt["assemblyId"] || "").trim();
  if (assemblyId) {
    const assemblyItems = await readExamPrepAssemblyQuestionSnapshots(args.orgId, assemblyId);
    if (assemblyItems.length) {
      const assemblyMap = new Map(
        assemblyItems
          .map((item) => {
            const normalized = mapExamPrepAssemblyItemToQuestionRecord(item);
            return [normalized.id, normalized] as const;
          })
          .filter(([id]) => Boolean(id)),
      );

      const orderedAssemblyItems = args.scorableQuestionIds
        .map((questionId) => assemblyMap.get(questionId) || null)
        .filter((item): item is ExamPrepQuestionRecord & {id: string} => Boolean(item));
      if (orderedAssemblyItems.length) {
        return orderedAssemblyItems;
      }
    }
  }

  return (await Promise.all(args.scorableQuestionIds.map(async (questionId) => {
    const docSnap = await db.doc(`organizations/${args.orgId}/questionBank/${questionId}`).get();
    return docSnap.exists ? {id: docSnap.id, ...(docSnap.data() as ExamPrepQuestionRecord)} : null;
  }))).filter((item): item is ExamPrepQuestionRecord & {id: string} => Boolean(item));
}

async function expireExamPrepAttempt(args: {
  orgId: string;
  uid: string;
  attemptId: string;
  attemptRef: admin.firestore.DocumentReference;
  attempt: Record<string, unknown>;
  assessment: ExamPrepAssessmentRecord & {id: string};
  runtimeState?: ExamPrepRuntimeState;
  answers?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  questionDurations?: Record<string, number>;
  elapsedSeconds?: number;
}): Promise<Record<string, unknown>> {
  const runtimeState = args.runtimeState || buildExamPrepRuntimeStateFromAttempt({attempt: args.attempt, assessment: args.assessment});
  const answers = args.answers || runtimeState.answers;
  const flags = args.flags || runtimeState.flags;
  const questionDurations = args.questionDurations || runtimeState.questionDurations;
  const visitedQuestionIds = runtimeState.visitedQuestionIds;
  const questionIds = runtimeState.questionIds;
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    runtimeState.lockedQuestionIds,
    deriveExamPrepDeliveryMode(args.assessment),
  );
  const counts = buildExamPrepAttemptCounts(questionStatuses);
  const effectiveElapsedSeconds = Math.max(Number(args.elapsedSeconds || 0), computeExamPrepElapsedSeconds(args.attempt["startedAt"]), 1);

  await syncExamPrepResponseDocs({
    orgId: args.orgId,
    attemptId: args.attemptId,
    assessmentId: String(args.assessment.id || ""),
    assemblyId: String(args.attempt["assemblyId"] || "").trim() || null,
    learnerId: args.uid,
    answers,
    flags,
    questionDurations,
    questionStatuses,
    lockedQuestionIds: runtimeState.lockedQuestionIds,
    visitedQuestionIds,
    questionIds,
    touchedQuestionIds: questionIds,
  });

  await args.attemptRef.set({
    status: "expired",
    answerMap: answers,
    flagMap: flags,
    questionDurations,
    questionStatusMap: questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    elapsedSeconds: effectiveElapsedSeconds,
    expiredAt: nowTs(),
    lastInteractionAt: nowTs(),
    updatedAt: nowTs(),
    updatedBy: args.uid,
  }, {merge: true});

  await appendExamPrepEvent({
    orgId: args.orgId,
    attemptId: args.attemptId,
    learnerId: args.uid,
    eventType: "timeout_reached",
    payload: {
      assessmentId: String(args.assessment.id || ""),
      elapsedSeconds: effectiveElapsedSeconds,
      unansweredCount: counts.unansweredCount,
      flaggedCount: counts.flaggedCount,
    },
  });

  return {
    status: "expired",
    attemptId: args.attemptId,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    remainingSeconds: 0,
    serverNowMs: Date.now(),
  };
}

async function finalizeExamPrepAttempt(args: {
  orgId: string;
  uid: string;
  attemptId: string;
  attemptRef: admin.firestore.DocumentReference;
  attempt: Record<string, unknown>;
  assessment: ExamPrepAssessmentRecord & {id: string};
  runtimeState?: ExamPrepRuntimeState;
  answers?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  questionDurations?: Record<string, number>;
  elapsedSeconds?: number;
  submitMode: "manual" | "timeout";
}): Promise<Record<string, unknown>> {
  const runtimeState = args.runtimeState || buildExamPrepRuntimeStateFromAttempt({attempt: args.attempt, assessment: args.assessment});
  const answers = args.answers || runtimeState.answers;
  const flags = args.flags || runtimeState.flags;
  const questionDurations = args.questionDurations || runtimeState.questionDurations;
  const visitedQuestionIds = runtimeState.visitedQuestionIds;
  const lockedQuestionIds = runtimeState.lockedQuestionIds;
  const questionIds = runtimeState.questionIds;
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    lockedQuestionIds,
    deriveExamPrepDeliveryMode(args.assessment),
  );
  const counts = buildExamPrepAttemptCounts(questionStatuses);
  const timeLimitSeconds = Math.max(60, Number(args.attempt["timeLimitSeconds"] || Number(args.assessment.durationMinutes || 0) * 60));
  const serverElapsedSeconds = computeExamPrepElapsedSeconds(args.attempt["startedAt"]);
  const effectiveElapsedSeconds = Math.max(Number(args.elapsedSeconds || 0), serverElapsedSeconds, 1);
  const timedOut = args.submitMode === "timeout" || effectiveElapsedSeconds >= timeLimitSeconds;

  if (args.assessment.requireAllQuestionsAnswered === true && !timedOut) {
    const hasUnanswered = questionIds.some((questionId) => (answers[questionId]?.length || 0) === 0);
    if (hasUnanswered) {
      throw new HttpsError("failed-precondition", "All questions must be answered before submission.");
    }
  }

  const scorableQuestionIds = deriveExamPrepDeliveryMode(args.assessment) === "strict_nclex_mode"
    ? questionIds.filter((questionId) => lockedQuestionIds.includes(questionId))
    : questionIds;

  const questionDocs = await loadExamPrepScorableQuestionDocs({
    orgId: args.orgId,
    attempt: args.attempt,
    scorableQuestionIds,
  });

  let pointsEarned = 0;
  let totalPoints = 0;
  const reviewItems = questionDocs.map((item) => {
    const itemId = item.id;
    const selectedAnswerKeys = Array.isArray(answers[itemId]) ? answers[itemId].map((value) => String(value)) : [];
    const correctAnswerKeys = Array.isArray(item.correctAnswerKey) ? item.correctAnswerKey.map((value) => String(value)) : [];
    const pointsPossible = Math.max(1, Number(item.points || 1));
    const isCorrect = exactAnswerMatch(selectedAnswerKeys, correctAnswerKeys);
    const earned = isCorrect ? pointsPossible : 0;
    pointsEarned += earned;
    totalPoints += pointsPossible;
    return {
      itemId,
      stem: stripGeneratedExamPrepBoilerplate(item.stem),
      leadInQuestion: stripGeneratedExamPrepBoilerplate(item.leadInQuestion),
      itemType: String(item.itemType || "single_choice"),
      selectedAnswerKeys,
      correctAnswerKeys,
      isCorrect,
      pointsEarned: earned,
      pointsPossible,
      explanation: stripGeneratedExamPrepBoilerplate(item.explanation) || null,
      rationale: stripGeneratedExamPrepBoilerplate(item.rationale) || null,
      markedForReview: flags[itemId] === true,
      questionStatus: questionStatuses[itemId] || "unanswered",
      timeSpentSeconds: Math.round(questionDurations[itemId] || 0),
      choices: mergeChoiceRationalesIntoChoices(item),
    };
  });

  const scorePercent = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 1000) / 10 : 0;
  const passed = scorePercent >= Number(args.assessment.passingScorePercent || 70);
  const scoreByItemId = new Map(reviewItems.map((item) => [item.itemId, {pointsEarned: item.pointsEarned, pointsPossible: item.pointsPossible}]));
  const breakdown = buildExamPrepDomainScores(questionDocs, scoreByItemId);
  const incorrectDocs = questionDocs.filter((item) => !scoreByItemId.get(item.id)?.pointsEarned);
  const remediationModuleIds = [...new Set(incorrectDocs.flatMap((item) => Array.isArray(item.remediationModuleIds) ? item.remediationModuleIds.map((value) => String(value)) : []))];
  const remediationLessonIds = [...new Set(incorrectDocs.flatMap((item) => Array.isArray(item.remediationLessonIds) ? item.remediationLessonIds.map((value) => String(value)) : []))];
  const remediationTags = [...new Set(incorrectDocs.flatMap((item) => Array.isArray(item.remediationTags) ? item.remediationTags.map((value) => String(value)) : []))];
  const reviewFlags = buildExamPrepReviewFlags(args.assessment);
  const scoreVisible = args.assessment.showScoreImmediately === true;
  const reviewUnlocked = String(args.assessment.reviewMode || "summary_only") !== "no_review";
  const reviewRef = db.collection(`organizations/${args.orgId}/attemptReviewSnapshots`).doc(args.attemptId);

  await syncExamPrepResponseDocs({
    orgId: args.orgId,
    attemptId: args.attemptId,
    assessmentId: String(args.assessment.id || ""),
    assemblyId: String(args.attempt["assemblyId"] || "").trim() || null,
    learnerId: args.uid,
    answers,
    flags,
    questionDurations,
    questionStatuses,
    lockedQuestionIds,
    visitedQuestionIds,
    questionIds,
    touchedQuestionIds: questionIds,
  });

  await reviewRef.set({
    id: args.attemptId,
    organizationId: args.orgId,
    attemptId: args.attemptId,
    learnerId: args.uid,
    assessmentId: String(args.assessment.id || ""),
    assessmentTitle: String(args.assessment.title || "Exam Prep Assessment"),
    scorePercent,
    pointsEarned,
    totalPoints,
    passFail: passed ? "pass" : "fail",
    elapsedSeconds: effectiveElapsedSeconds,
    submissionMode: timedOut ? "timeout" : "manual",
    questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    scoreVisible,
    reviewUnlocked,
    domainScores: breakdown.domainScores,
    moduleScores: breakdown.moduleScores,
    tagScores: breakdown.tagScores,
    clinicalJudgmentScores: breakdown.clinicalJudgmentScores,
    caseStudyScores: breakdown.caseStudyScores,
    remediationModuleIds,
    remediationLessonIds,
    remediationTags,
    reviewMode: String(args.assessment.reviewMode || "summary_only"),
    showCorrectAnswers: reviewFlags.showCorrectAnswers,
    showRationales: reviewFlags.showRationales,
    items: reviewItems,
    createdAt: nowTs(),
    updatedAt: nowTs(),
    createdBy: args.uid,
    updatedBy: args.uid,
  }, {merge: true});

  await args.attemptRef.set({
    status: timedOut ? "timed_out" : "submitted",
    answerMap: answers,
    flagMap: flags,
    lockedQuestionIds,
    questionDurations,
    questionStatusMap: questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    elapsedSeconds: effectiveElapsedSeconds,
    submittedAt: nowTs(),
    timedOutAt: timedOut ? nowTs() : null,
    timedOut,
    submissionMode: timedOut ? "timeout" : "manual",
    scorePercent,
    passed,
    answerSnapshotPath: reviewRef.path,
    reviewSnapshotPath: reviewRef.path,
    lastInteractionAt: nowTs(),
    updatedAt: nowTs(),
    updatedBy: args.uid,
  }, {merge: true});

  await db.doc(`users/${args.uid}/assessmentAttempts/${args.attemptId}`).set({
    userId: args.uid,
    programId: String(args.attempt["publicProgramId"] || ""),
    moduleId: String(args.assessment.moduleId || ""),
    assessmentId: String(args.assessment.id || ""),
    assessmentTitle: String(args.assessment.title || "Exam Prep Assessment"),
    score: scorePercent,
    passed,
    timeSpentMin: Math.max(1, Math.round(effectiveElapsedSeconds / 60)),
    completedAt: nowTs(),
    source: "exam-prep",
    orgId: args.orgId,
    examPrepAttemptId: args.attemptId,
    examPrepAssessmentProgramId: String(args.assessment.programId || ""),
    timedOut,
    flaggedCount: counts.flaggedCount,
    unansweredCount: counts.unansweredCount,
  }, {merge: true});

  if (timedOut) {
    await appendExamPrepEvent({
      orgId: args.orgId,
      attemptId: args.attemptId,
      learnerId: args.uid,
      eventType: "timeout_reached",
      payload: {
        assessmentId: String(args.assessment.id || ""),
        elapsedSeconds: effectiveElapsedSeconds,
      },
    });
  } else {
    await appendExamPrepEvent({
      orgId: args.orgId,
      attemptId: args.attemptId,
      learnerId: args.uid,
      eventType: "assessment_submitted",
      payload: {
        assessmentId: String(args.assessment.id || ""),
        scorePercent,
        passed,
        elapsedSeconds: effectiveElapsedSeconds,
        unansweredCount: counts.unansweredCount,
        flaggedCount: counts.flaggedCount,
      },
    });
  }

  await appendExamPrepEvent({
    orgId: args.orgId,
    attemptId: args.attemptId,
    learnerId: args.uid,
    eventType: "assessment_completed",
    payload: {
      assessmentId: String(args.assessment.id || ""),
      scorePercent,
      passed,
      elapsedSeconds: effectiveElapsedSeconds,
      submissionMode: timedOut ? "timeout" : "manual",
    },
  });

  return {
    status: timedOut ? "timed_out" : "submitted",
    attemptId: args.attemptId,
    reviewId: reviewRef.id,
    scorePercent,
    passed,
    timedOut,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    scoreVisible,
    reviewUnlocked,
    elapsedSeconds: effectiveElapsedSeconds,
    serverNowMs: Date.now(),
  };
}

function getExamPrepAttemptStartedAtMs(value: unknown): number {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toMillis();
  }

  const record = (value || {}) as {toMillis?: () => number; seconds?: number};
  if (typeof record.toMillis === "function") {
    return record.toMillis();
  }
  if (typeof record.seconds === "number") {
    return record.seconds * 1000;
  }

  return 0;
}

function computeExamPrepElapsedSeconds(value: unknown): number {
  const startedAtMs = getExamPrepAttemptStartedAtMs(value);
  if (!startedAtMs) {
    return 0;
  }
  return Math.max(0, Math.round((Date.now() - startedAtMs) / 1000));
}

function isExamPrepTerminalStatus(status: unknown): boolean {
  return ["submitted", "timed_out", "expired", "abandoned"].includes(String(status || ""));
}

async function hydrateExamPrepQuestionsByIds(
  orgId: string,
  questionIds: string[],
): Promise<Record<string, unknown>[]> {
  const docs = await Promise.all(questionIds.map(async (questionId) => {
    const docSnap = await db.doc(`organizations/${orgId}/questionBank/${questionId}`).get();
    if (!docSnap.exists) {
      return null;
    }
    return sanitizeExamPrepQuestion({id: docSnap.id, ...(docSnap.data() as ExamPrepQuestionRecord)});
  }));

  return docs.filter((item): item is Record<string, unknown> => Boolean(item));
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

async function resolveOfferOwnershipConfig(
  offer: PublicOfferDoc,
  itemType: OfferType,
  itemId: string,
): Promise<{
  ownerType: OwnerType;
  ownerId: string | null;
  payoutMode: PayoutMode;
  platformFeePercent: number;
  partnerSharePercent: number;
  payoutMethodConfigured: boolean;
  payoutMethod?: PartnerPayoutMethod;
}> {
  const directOwnerType = sanitizeOwnerType(offer.ownerType);
  const directOwnerId = String(offer.ownerId || "").trim() || null;
  const directPayoutMode = sanitizePayoutMode(offer.payoutMode);
  const directPlatformFee = sanitizePercent(offer.platformFeePercent, DEFAULT_PLATFORM_FEE_PERCENT);
  const directPartnerShare = sanitizePercent(offer.partnerSharePercent, Math.max(0, 100 - directPlatformFee));
  const directPayoutMethodConfigured = Boolean(offer.payoutMethodConfigured);
  const directPayoutMethod = sanitizePayoutMethod(offer.payoutMethod);

  if (itemType === "program") {
    const programOwnership = await resolveProgramOwnershipConfig(itemId, null);
    return {
      ownerType: programOwnership.ownerType,
      ownerId: programOwnership.ownerId,
      payoutMode: programOwnership.payoutMode,
      platformFeePercent: programOwnership.platformFeePercent,
      partnerSharePercent: programOwnership.partnerSharePercent,
      payoutMethodConfigured: programOwnership.payoutMethodConfigured,
      payoutMethod: programOwnership.payoutMethod,
    };
  }

  if (directOwnerType !== "platform" || directOwnerId) {
    return {
      ownerType: directOwnerType,
      ownerId: directOwnerId,
      payoutMode: directOwnerType === "partner" ? directPayoutMode : "manual",
      platformFeePercent: directPlatformFee,
      partnerSharePercent: directOwnerType === "partner" ? directPartnerShare : 0,
      payoutMethodConfigured: directOwnerType === "partner" ? directPayoutMethodConfigured : true,
      payoutMethod: directPayoutMethod,
    };
  }

  return {
    ownerType: "platform",
    ownerId: null,
    payoutMode: "manual",
    platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
    partnerSharePercent: 0,
    payoutMethodConfigured: true,
  };
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

    await sendSystemNotificationToUser({
      uid,
      title: "Certificate ready",
      body: "Your certificate has been generated and is ready to download.",
      link: "/guest/courses",
      severity: "info",
      category: "certificates",
    });

    await emitNotificationEvent({
      type: "CERTIFICATE_ISSUED",
      templateKey: "certificate_issued",
      recipientType: "LEARNER",
      recipientUserId: uid,
      courseId,
      relatedEntityType: "certificate",
      relatedEntityId: `${uid}:${courseId}:${examId}`,
      idempotencyKey: `certificate_issued:${uid}:${courseId}:${examId}`,
      templateData: {
        learnerName: "Learner",
        courseTitle: courseId,
        ctaUrl: url,
      },
    });

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

  if (itemType === "tutor_session") {
    return;
  }

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

  if (itemType === "digital_product") {
    const product = await resolveCheckoutProduct(itemId);
    const enrollmentId = `${uid}_${itemId}`;
    await db.doc(`enrollments/${enrollmentId}`).set({
      id: enrollmentId,
      userId: uid,
      productId: itemId,
      productName: product.name,
      productType: product.type,
      stripePriceId: product.stripePriceId,
      stripeProductId: product.stripeProductId,
      currency: product.currency,
      amount: product.amountCents,
      paymentStatus: "paid",
      accessStatus: "active",
      checkoutReady: true,
      orderId,
      activatedAt: nowTs(),
      createdAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    await db.doc(`users/${uid}/digitalProductEnrollments/${itemId}`).set({
      id: itemId,
      productId: itemId,
      productName: product.name,
      productType: product.type,
      stripePriceId: product.stripePriceId,
      stripeProductId: product.stripeProductId,
      currency: product.currency,
      amount: product.amountCents,
      paymentStatus: "paid",
      accessStatus: "active",
      checkoutReady: true,
      source: "stripe_checkout",
      orderId,
      activatedAt: nowTs(),
      createdAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});
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
    const programLiveSessionMeta = parseProgramLiveSessionItemId(itemId);
    if (programLiveSessionMeta) {
      const {programId, sessionId} = programLiveSessionMeta;
      const {session} = await getProgramLiveSessionOrThrow(programId, sessionId);
      const accessMode = normalizeProgramLiveSessionAccessMode(session.accessMode);

      await assertProgramLiveSessionEligibility(uid, programId);

      const existingBooking = await programLiveSessionBookingRef(uid, programId, sessionId).get();
      if (!existingBooking.exists) {
        await assertProgramLiveSessionCapacity(session, programId, sessionId);
      }

      await createOrUpdateProgramLiveSessionBooking({
        uid,
        programId,
        sessionId,
        session,
        accessMode,
        status: "booked",
        orderId,
      });
      return;
    }

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

function buildTutorSlotKey(
  tutorId: string,
  sessionDate: string,
  sessionTime: string,
  durationMinutes: number,
): string {
  return `${tutorId}_${sessionDate}_${sessionTime}_${durationMinutes}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 180);
}

function normalizeTutorSessionPrice(hourlyRate: number, durationMinutes: number): number {
  return Math.round((hourlyRate * (durationMinutes / 60)) * 100) / 100;
}

export const createTutorBookingCheckoutSession = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<TutorBookingCheckoutPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const tutorId = String(request.data?.tutorId || "").trim();
    const subject = String(request.data?.subject || "").trim();
    const sessionDate = String(request.data?.sessionDate || "").trim();
    const sessionTime = String(request.data?.sessionTime || "").trim();
    const durationMinutes = Number(request.data?.durationMinutes || 0);
    const sessionType = String(request.data?.sessionType || "individual").trim() as "individual" | "group";
    const notes = String(request.data?.notes || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (!tutorId || !subject || !sessionDate || !sessionTime || !successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "Tutor booking payload is incomplete.");
    }

    if (![60, 90, 120].includes(durationMinutes)) {
      throw new HttpsError("invalid-argument", "Unsupported tutor session duration.");
    }

    if (!["individual", "group"].includes(sessionType)) {
      throw new HttpsError("invalid-argument", "Unsupported tutor session type.");
    }

    if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
      throw new HttpsError("invalid-argument", "Checkout redirect URLs are not allowed.");
    }

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = (userSnap.data() || {}) as UserProfileDoc;
    const emailVerified =
      userData.emailVerified === true || request.auth?.token?.email_verified === true;

    if (userData.status === "blocked") {
      throw new HttpsError("permission-denied", "User account is blocked.");
    }

    if (userData.profileCompleted === false) {
      throw new HttpsError("failed-precondition", "Complete profile before payment.");
    }

    if (isEmailVerificationRequiredForCheckout() && !emailVerified) {
      throw new HttpsError("failed-precondition", "Verify your email before payment.");
    }

    const tutorRef = db.doc(`tutors/${tutorId}`);
    const tutorSnap = await tutorRef.get();
    if (!tutorSnap.exists) {
      throw new HttpsError("not-found", "Tutor not found.");
    }

    const tutorData = (tutorSnap.data() || {}) as TutorDoc;
    if (tutorData.isActive === false) {
      throw new HttpsError("failed-precondition", "Tutor is not active.");
    }

    const tutorName = String(tutorData.name || "Private tutor").trim() || "Private tutor";
    const hourlyRate = Number(tutorData.hourlyRate || 0);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      throw new HttpsError("failed-precondition", "Tutor rate is invalid.");
    }

    const totalPrice = normalizeTutorSessionPrice(hourlyRate, durationMinutes);
    const slotKey = buildTutorSlotKey(tutorId, sessionDate, sessionTime, durationMinutes);
    const lockRef = db.doc(`tutors/${tutorId}/availabilityLocks/${slotKey}`);
    const bookingRef = db.collection("tutor_bookings").doc();
    const orderRef = db.collection(`users/${uid}/orders`).doc();
    const holdUntil = admin.firestore.Timestamp.fromMillis(Date.now() + (20 * 60 * 1000));
    const orgId = String(userData.orgId || "").trim() || null;
    const studentName = String(userData.displayName || request.auth?.token?.name || "").trim() || "Learner";
    const studentEmail = String(userData.email || request.auth?.token?.email || "").trim();

    await db.runTransaction(async (tx) => {
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        const existingStatus = String(lockSnap.get("status") || "").trim();
        const lockedUntil = lockSnap.get("lockedUntil") as admin.firestore.Timestamp | undefined;
        const isExpired = !lockedUntil || lockedUntil.toMillis() < Date.now();
        const isTerminal = ["cancelled", "payment_failed"].includes(existingStatus);
        if (!isExpired && !isTerminal) {
          throw new HttpsError("already-exists", "This tutor slot is already reserved.");
        }
      }

      tx.set(orderRef, {
        id: orderRef.id,
        uid,
        orgId,
        itemType: "tutor_session",
        itemId: bookingRef.id,
        title: `Private tutoring with ${tutorName}`,
        amount: totalPrice,
        currency: "USD",
        status: "pending",
        provider: "stripe",
        tutorId,
        tutorName,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});

      tx.set(bookingRef, {
        id: bookingRef.id,
        tutorId,
        tutorName,
        tutorOwnerUid: String(tutorData.ownerUid || "").trim() || null,
        tutorOwnerEmail: String(tutorData.ownerEmail || "").trim() || null,
        studentId: uid,
        studentName,
        studentEmail,
        sessionDate,
        sessionTime,
        slotKey,
        subject,
        sessionType,
        durationMinutes,
        totalPrice,
        discount: 0,
        status: "payment_pending",
        notes,
        orderId: orderRef.id,
        lockedUntil: holdUntil,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});

      tx.set(lockRef, {
        bookingId: bookingRef.id,
        orderId: orderRef.id,
        tutorId,
        uid,
        sessionDate,
        sessionTime,
        durationMinutes,
        status: "payment_pending",
        lockedUntil: holdUntil,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});
    });

    const stripe = getStripe();

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: studentEmail || undefined,
        metadata: {
          uid,
          orderId: orderRef.id,
          tutorBookingId: bookingRef.id,
          tutorId,
          slotKey,
          itemType: "tutor_session",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Private tutoring with ${tutorName}`,
                description: `${subject} · ${sessionDate} ${sessionTime} · ${durationMinutes} minutes`,
              },
              unit_amount: Math.round(totalPrice * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      await Promise.all([
        orderRef.set({checkoutSessionId: session.id, updatedAt: nowTs()}, {merge: true}),
        bookingRef.set({checkoutSessionId: session.id, updatedAt: nowTs()}, {merge: true}),
      ]);

      return {url: session.url};
    } catch (error: any) {
      await Promise.all([
        orderRef.set({status: "failed", updatedAt: nowTs()}, {merge: true}),
        bookingRef.set({status: "payment_failed", updatedAt: nowTs()}, {merge: true}),
        lockRef.delete().catch(() => undefined),
      ]);

      const errorType = String(error?.type || "");
      if (errorType === "StripeInvalidRequestError") {
        throw new HttpsError("failed-precondition", error?.message || "Invalid tutor checkout payload.");
      }

      throw new HttpsError("internal", "Unable to create tutor checkout session.");
    }
  },
);

export const updateTutorBookingStatus = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<TutorBookingStatusUpdatePayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const bookingId = String(request.data?.bookingId || "").trim();
    const status = String(request.data?.status || "").trim() as "cancelled" | "completed";
    const meetingUrl = String(request.data?.meetingUrl || "").trim() || null;

    if (!bookingId || !["cancelled", "completed"].includes(status)) {
      throw new HttpsError("invalid-argument", "bookingId and a supported status are required.");
    }

    const bookingRef = db.doc(`tutor_bookings/${bookingId}`);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new HttpsError("not-found", "Tutor booking not found.");
    }

    const booking = (bookingSnap.data() || {}) as TutorBookingStored;
    const callerCtx = await getUserContext(callerUid);
    const isAdminCaller = ["super_admin", "admin", "manager", "org_admin", "org_manager"].includes(callerCtx.role);
    const isTutorOwner = String(booking.tutorOwnerUid || "").trim() === callerUid;
    const isStudent = String(booking.studentId || "").trim() === callerUid;

    if (!(isAdminCaller || isTutorOwner || isStudent)) {
      throw new HttpsError("permission-denied", "You cannot update this tutor booking.");
    }

    if (status === "completed" && !(isAdminCaller || isTutorOwner)) {
      throw new HttpsError("permission-denied", "Only tutor owners or admins can complete a session.");
    }

    const currentStatus = String(booking.status || "").trim();
    if (status === "completed" && currentStatus !== "confirmed") {
      throw new HttpsError("failed-precondition", "Only confirmed sessions can be marked completed.");
    }

    if (status === "cancelled" && !["payment_pending", "confirmed"].includes(currentStatus)) {
      throw new HttpsError("failed-precondition", "This booking can no longer be cancelled.");
    }

    const lockRef = booking.tutorId && booking.slotKey ?
      db.doc(`tutors/${booking.tutorId}/availabilityLocks/${booking.slotKey}`) : null;

    await db.runTransaction(async (tx) => {
      tx.set(bookingRef, {
        status,
        ...(meetingUrl ? {meetingUrl} : {}),
        ...(status === "cancelled" ? {cancelledAt: nowTs()} : {}),
        updatedAt: nowTs(),
      }, {merge: true});

      if (lockRef) {
        if (status === "cancelled") {
          tx.delete(lockRef);
        } else {
          tx.set(lockRef, {
            status,
            updatedAt: nowTs(),
          }, {merge: true});
        }
      }
    });

    const learnerUid = String(booking.studentId || "").trim();
    const tutorOwnerUid = String(booking.tutorOwnerUid || "").trim();
    const bookingTitle = `${String(booking.subject || "Tutoring session").trim() || "Tutoring session"} · ${String(booking.sessionDate || "").trim()} ${String(booking.sessionTime || "").trim()}`.trim();

    if (status === "cancelled") {
      if (learnerUid && learnerUid !== callerUid) {
        await sendSystemNotificationToUser({
          uid: learnerUid,
          title: "Tutor session cancelled",
          body: `${bookingTitle} was cancelled and the slot has been released.`,
          link: "/private-tutors/bookings",
          severity: "warning",
          category: "live_sessions",
        });
      }
      if (tutorOwnerUid && tutorOwnerUid !== callerUid) {
        await sendSystemNotificationToUser({
          uid: tutorOwnerUid,
          title: "Tutor session cancelled",
          body: `${bookingTitle} was cancelled.`,
          link: "/private-tutors/bookings",
          severity: "warning",
          category: "live_sessions",
        });
      }
    }

    if (status === "completed" && learnerUid) {
      await sendSystemNotificationToUser({
        uid: learnerUid,
        title: "Tutor session completed",
        body: `${bookingTitle} has been marked completed.`,
        link: "/private-tutors/bookings",
        severity: "info",
        category: "live_sessions",
      });
    }

    return {ok: true};
  },
);

export const reserveProgramLiveSession = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{programId?: string; sessionId?: string}>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const programId = String(request.data?.programId || "").trim();
    const sessionId = String(request.data?.sessionId || "").trim();
    if (!programId || !sessionId) {
      throw new HttpsError("invalid-argument", "programId and sessionId are required.");
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = (userSnap.data() || {}) as UserProfileDoc;
    if (!userSnap.exists || userData.status === "blocked") {
      throw new HttpsError("permission-denied", "User account is not allowed.");
    }

    await assertProgramLiveSessionEligibility(uid, programId);

    const {session} = await getProgramLiveSessionOrThrow(programId, sessionId);
    const accessMode = normalizeProgramLiveSessionAccessMode(session.accessMode);
    if (accessMode === "paid") {
      throw new HttpsError("failed-precondition", "This live session requires payment before reservation.");
    }

    const existingBookingSnap = await programLiveSessionBookingRef(uid, programId, sessionId).get();
    if (!existingBookingSnap.exists) {
      await assertProgramLiveSessionCapacity(session, programId, sessionId);
    }

    await createOrUpdateProgramLiveSessionBooking({
      uid,
      programId,
      sessionId,
      session,
      accessMode,
      status: "reserved",
      orderId: null,
      orgId: String(userData.orgId || "").trim() || null,
    });

    await sendSystemNotificationToUser({
      uid,
      title: "Live session reserved",
      body: `Your reservation for ${String(session.title || "this live session").trim() || "this live session"} is confirmed.`,
      link: `/my-programs/${programId}/live-sessions`,
      severity: "info",
      category: "live_sessions",
      organizationId: String(userData.orgId || "").trim() || null,
      targetRole: String(userData.role || ""),
    });

    return {ok: true, status: "reserved"};
  },
);

export const getProgramLiveSessionJoinUrl = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{programId?: string; sessionId?: string}>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const programId = String(request.data?.programId || "").trim();
    const sessionId = String(request.data?.sessionId || "").trim();
    if (!programId || !sessionId) {
      throw new HttpsError("invalid-argument", "programId and sessionId are required.");
    }

    await assertProgramLiveSessionEligibility(uid, programId);

    const {session} = await getProgramLiveSessionOrThrow(programId, sessionId);
    const accessMode = normalizeProgramLiveSessionAccessMode(session.accessMode);
    const bookingRequired = session.bookingRequired !== false;
    const meetingUrl = String(session.meetingUrl || "").trim();

    if (!meetingUrl) {
      throw new HttpsError("failed-precondition", "Join link is not configured yet.");
    }

    if (bookingRequired || accessMode === "paid" || accessMode === "free") {
      const bookingSnap = await programLiveSessionBookingRef(uid, programId, sessionId).get();
      const status = String(bookingSnap.get("status") || "");
      if (!bookingSnap.exists || !["reserved", "booked", "attended"].includes(status)) {
        throw new HttpsError("permission-denied", "Reserve this live session before joining.");
      }
    }

    return {
      url: meetingUrl,
      title: String(session.title || "Live session").trim() || "Live session",
    };
  },
);

export const createProgramLiveSessionCheckoutSession = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (
    request: CallableRequest<{
      programId?: string;
      sessionId?: string;
      successUrl?: string;
      cancelUrl?: string;
    }>,
  ) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const programId = String(request.data?.programId || "").trim();
    const sessionId = String(request.data?.sessionId || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (!programId || !sessionId || !successUrl || !cancelUrl) {
      throw new HttpsError(
        "invalid-argument",
        "programId, sessionId, successUrl and cancelUrl are required.",
      );
    }

    if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
      throw new HttpsError("invalid-argument", "Checkout redirect URLs are not allowed.");
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

    if (userData.profileCompleted === false) {
      throw new HttpsError("failed-precondition", "Complete profile before payment.");
    }

    if (isEmailVerificationRequiredForCheckout() && !emailVerified) {
      throw new HttpsError("failed-precondition", "Verify your email before payment.");
    }

    await assertProgramLiveSessionEligibility(uid, programId);

    const {session} = await getProgramLiveSessionOrThrow(programId, sessionId);
    const accessMode = normalizeProgramLiveSessionAccessMode(session.accessMode);
    if (accessMode !== "paid") {
      throw new HttpsError("failed-precondition", "This live session does not require paid checkout.");
    }

    const amount = Number(session.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError("failed-precondition", "A positive session price is required.");
    }

    const existingBookingSnap = await programLiveSessionBookingRef(uid, programId, sessionId).get();
    if (!existingBookingSnap.exists) {
      await assertProgramLiveSessionCapacity(session, programId, sessionId);
    }

    const currency = String(session.currency || "USD").toUpperCase();
    const itemId = buildProgramLiveSessionItemId(programId, sessionId);
    const title = String(session.title || "Live session").trim() || "Live session";

    const connectDestination = await buildProgramStripeConnectPaymentIntentData(programId, orgId, amount);
    const orderRef = db.collection(`users/${uid}/orders`).doc();
    await orderRef.set({
      id: orderRef.id,
      uid,
      orgId,
      itemType: "live_class",
      itemId,
      title,
      amount,
      currency,
      status: "pending",
      provider: "stripe",
      ownerType: connectDestination.ownerType,
      ownerId: connectDestination.ownerId,
      payoutMode: connectDestination.payoutMode,
      platformFeePercent: connectDestination.platformFeePercent,
      partnerSharePercent: connectDestination.partnerSharePercent,
      payoutMethodConfigured: connectDestination.payoutMethodConfigured,
      payoutMethod: connectDestination.payoutMethod || null,
      createdAt: nowTs(),
      updatedAt: nowTs(),
      items: [{
        offerId: null,
        itemType: "live_class",
        itemId,
        title,
        amount,
        currency,
        qty: 1,
        ownerType: connectDestination.ownerType,
        ownerId: connectDestination.ownerId,
        payoutMode: connectDestination.payoutMode,
        platformFeePercent: connectDestination.platformFeePercent,
        partnerSharePercent: connectDestination.partnerSharePercent,
        payoutMethodConfigured: connectDestination.payoutMethodConfigured,
        payoutMethod: connectDestination.payoutMethod || null,
      }],
    });

    const stripe = getStripe();

    const createSessionPayload: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: email,
      metadata: {
        uid,
        orderId: orderRef.id,
        cartId: "program-live-session",
        programId,
        sessionId,
        ownerType: connectDestination.ownerType,
        ownerId: String(connectDestination.ownerId || ""),
        courseId: "",
        offerId: "",
        payoutMode: connectDestination.payoutMode,
        platformFeePercent: String(connectDestination.platformFeePercent),
        partnerSharePercent: String(connectDestination.partnerSharePercent),
      },
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: title,
            description: String(session.description || "").trim(),
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(connectDestination.paymentIntentData ? {payment_intent_data: connectDestination.paymentIntentData} : {}),
    };

    let checkoutSession: Stripe.Checkout.Session | null = null;
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        checkoutSession = await stripe.checkout.sessions.create(createSessionPayload);
        break;
      } catch (error: any) {
        lastError = error;
        const errorType = String(error?.type || "");
        console.error("createProgramLiveSessionCheckoutSession stripe failure", {
          uid,
          programId,
          sessionId,
          orderId: orderRef.id,
          attempt,
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

        if (attempt < 3) {
          await sleep(250 * attempt);
        }
      }
    }

    if (!checkoutSession?.url) {
      throw new HttpsError(
        "internal",
        lastError?.message || "Unable to create live session checkout session.",
      );
    }

    await orderRef.set({
      checkoutSessionId: checkoutSession.id,
      updatedAt: nowTs(),
    }, {merge: true});

    return {url: checkoutSession.url};
  },
);

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
    const role = (data.role || "learner") as "admin" | "manager" | "learner" | "guest" | "instructor" | "tutor" | "staff";
    const status = (data.status || "active") as "active" | "inactive";

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    if (password.length < 8) {
      throw new HttpsError("invalid-argument", "Initial password must be at least 8 characters.");
    }
    if (!["admin", "manager", "learner", "guest", "instructor", "tutor", "staff"].includes(role)) {
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

      await sendSystemNotificationToUser({
        uid: userRecord.uid,
        title: "Account created",
        body: status === "active" ?
          `Your ${role} account is ready. Sign in to access your workspace.` :
          `Your ${role} account has been created and is currently inactive pending activation.`,
        link: role === "guest" ? "/guest/dashboard" : "/",
        severity: "info",
        category: "account",
        organizationId: normalizedOrgId || null,
        targetRole: role,
      });

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

export const normalizeLegacyProgramAccessRoles = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<NormalizeLegacyProgramAccessRolesPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const callerCtx = await getUserContext(callerUid);
    if (callerCtx.role !== "super_admin" || !callerCtx.active) {
      throw new HttpsError(
        "permission-denied",
        "Only active super admin accounts can normalize program access roles.",
      );
    }

    const uid = String(request.data?.uid || "").trim();

    if (uid) {
      const ref = db.doc(`users/${uid}`);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "User not found.");
      }

      const current = snap.data() || {};
      const patch = buildNormalizedProgramAccessPatch(current);
      const changed =
        String(current.role || "") !== patch.role ||
        Boolean(current.isProgramAdmin) !== patch.isProgramAdmin ||
        Boolean(current.isProgramStaff) !== patch.isProgramStaff ||
        Boolean(current.isProgramLearner) !== patch.isProgramLearner;

      if (changed) {
        await ref.set(patch, {merge: true});
      }

      return {
        ok: true,
        updated: changed ? 1 : 0,
        uid,
        role: patch.role,
      };
    }

    const snap = await db.collection("users").get();
    let batch = db.batch();
    let opsInBatch = 0;
    let updated = 0;

    for (const docSnap of snap.docs) {
      const current = docSnap.data() || {};
      const patch = buildNormalizedProgramAccessPatch(current);
      const changed =
        String(current.role || "") !== patch.role ||
        Boolean(current.isProgramAdmin) !== patch.isProgramAdmin ||
        Boolean(current.isProgramStaff) !== patch.isProgramStaff ||
        Boolean(current.isProgramLearner) !== patch.isProgramLearner;

      if (!changed) {
        continue;
      }

      batch.set(docSnap.ref, patch, {merge: true});
      opsInBatch += 1;
      updated += 1;

      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return {
      ok: true,
      updated,
    };
  },
);

export const sendNotification = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<SendNotificationPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const callerCtx = await getUserContext(callerUid);
    if (!callerCtx.active) {
      throw new HttpsError("permission-denied", "Caller account is inactive.");
    }

    const allowedRoles = ["manager", "org_manager", "admin", "org_admin", "super_admin"];
    if (!allowedRoles.includes(callerCtx.role)) {
      throw new HttpsError("permission-denied", "Only manager/admin can send notifications.");
    }

    const data = request.data || {};
    const title = String(data.title || "").trim();
    const body = String(data.body || "").trim();
    const link = String(data.link || "").trim() || null;
    const severity = (["info", "warning", "critical"].includes(String(data.severity || ""))
      ? String(data.severity)
      : "info") as "info" | "warning" | "critical";
    const category = (["announcements", "account", "commerce", "live_sessions", "exam_prep", "certificates", "content"].includes(String(data.category || ""))
      ? String(data.category)
      : "announcements") as NotificationCategory;
    const audience = data.audience as NotificationAudienceInput | undefined;

    if (!title || !body) {
      throw new HttpsError("invalid-argument", "Notification title and body are required.");
    }
    if (!audience || !["all", "role", "user"].includes(String(audience.type || ""))) {
      throw new HttpsError("invalid-argument", "A valid audience is required.");
    }
    if (audience.type === "role" && !["learner", "nurse", "staff", "admin", "manager"].includes(String(audience.role || ""))) {
      throw new HttpsError("invalid-argument", "Invalid notification role audience.");
    }

    const recipients = await resolveNotificationRecipients(callerCtx, audience);
    if (!recipients.length) {
      throw new HttpsError("failed-precondition", "No recipients matched the selected audience.");
    }

    const notificationId = db.collection("_notificationIds").doc().id;
    await writeNotificationInboxEntries(recipients, {
      notificationId,
      title,
      body,
      link,
      severity,
      category,
      audience,
      createdBy: {
        uid: callerUid,
        name: String(request.auth?.token?.name || request.auth?.token?.email || "").trim(),
      },
      orgId: callerCtx.orgId,
    });

    await writeAdminNotificationLog({
      notificationId,
      title,
      body,
      link,
      severity,
      category,
      audience,
      createdBy: {
        uid: callerUid,
        name: String(request.auth?.token?.name || request.auth?.token?.email || "").trim(),
      },
      orgId: callerCtx.orgId,
      recipientsCount: recipients.length,
    });

    return {
      ok: true,
      notificationId,
      recipientsCount: recipients.length,
    };
  },
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
    const productId = String(request.data?.productId || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if ((!offerId && !cartId && !productId) || !successUrl || !cancelUrl) {
      throw new HttpsError(
        "invalid-argument",
        "offerId/cartId/productId, successUrl and cancelUrl are required.",
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

    if (productId) {
      const product = await resolveCheckoutProduct(productId);

      const enrollmentRef = db.doc(`enrollments/${uid}_${productId}`);
      const enrollmentSnap = await enrollmentRef.get();
      const paymentStatus = String(enrollmentSnap.get("paymentStatus") || "").trim();
      if (paymentStatus === "paid") {
        throw new HttpsError("already-exists", "Product already purchased.");
      }

      await enrollmentRef.set({
        id: `${uid}_${productId}`,
        userId: uid,
        productId,
        productName: product.name,
        productType: product.type,
        stripePriceId: product.stripePriceId,
        stripeProductId: product.stripeProductId,
        currency: product.currency,
        amount: product.amountCents,
        paymentStatus: paymentStatus || "pending",
        accessStatus: paymentStatus === "paid" ? "active" : "pending",
        checkoutReady: true,
        createdAt: enrollmentSnap.exists ? enrollmentSnap.get("createdAt") || nowTs() : nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});

      await db.doc(`users/${uid}/digitalProductEnrollments/${productId}`).set({
        id: productId,
        productId,
        productName: product.name,
        productType: product.type,
        stripePriceId: product.stripePriceId,
        stripeProductId: product.stripeProductId,
        currency: product.currency,
        amount: product.amountCents,
        paymentStatus: paymentStatus || "pending",
        accessStatus: paymentStatus === "paid" ? "active" : "pending",
        checkoutReady: true,
        updatedAt: nowTs(),
        ...(enrollmentSnap.exists ? {} : {createdAt: nowTs()}),
      }, {merge: true});

      normalizedItems = [{
        offerId: `product:${productId}`,
        offer: {
          type: "digital_product",
          title: product.name,
          description: product.description,
          imageUrl: product.imageUrl || undefined,
          price: product.amount,
          currency: product.currency.toUpperCase() as "USD",
          stripePriceId: product.stripePriceId,
          stripeProductId: product.stripeProductId || undefined,
          isActive: true,
          isPublic: true,
          category: typeof product.metadata.category === "string" ? product.metadata.category : undefined,
        },
        itemType: "digital_product",
        itemId: productId,
        qty: 1,
      }];
    } else 

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

    const orderItems = await Promise.all(normalizedItems.map(async (x) => {
      const ownership = await resolveOfferOwnershipConfig(x.offer, x.itemType, x.itemId);
      return {
        offerId: x.offerId,
        itemType: x.itemType,
        itemId: x.itemId,
        title: toSafeTitle(x.offer.title),
        amount: Number.isFinite(Number(x.offer.price || 0)) ? Number(x.offer.price || 0) : 0,
        currency,
        qty: x.qty,
        stripePriceId: String(x.offer.stripePriceId || "").trim() || null,
        ownerType: ownership.ownerType,
        ownerId: ownership.ownerId,
        payoutMode: ownership.payoutMode,
        platformFeePercent: ownership.platformFeePercent,
        partnerSharePercent: ownership.partnerSharePercent,
        payoutMethodConfigured: ownership.payoutMethodConfigured,
        payoutMethod: ownership.payoutMethod || null,
      };
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
      ownerType: first.ownerType || "platform",
      ownerId: first.ownerId || null,
      payoutMode: first.payoutMode || "manual",
      platformFeePercent: Number(first.platformFeePercent || DEFAULT_PLATFORM_FEE_PERCENT),
      partnerSharePercent: Number(first.partnerSharePercent || DEFAULT_PARTNER_SHARE_PERCENT),
      payoutMethodConfigured: first.payoutMethodConfigured !== false,
      payoutMethod: first.payoutMethod || null,
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
        productId,
        ownerType: String(first.ownerType || "platform"),
        ownerId: String(first.ownerId || ""),
        courseId: String(first.itemType === "course" ? first.itemId : ""),
        offerId: String(first.offerId || ""),
        payoutMode: String(first.payoutMode || "manual"),
        platformFeePercent: String(Number(first.platformFeePercent || DEFAULT_PLATFORM_FEE_PERCENT)),
        partnerSharePercent: String(Number(first.partnerSharePercent || DEFAULT_PARTNER_SHARE_PERCENT)),
        checkoutSource: productId ? "product" : offerId ? "offer" : "cart",
        productBlueprintId: productId === "global-nurse-pack" ? GLOBAL_NURSE_PACK_PRODUCT_BLUEPRINT.id || "global-nurse-pack" : "",
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    console.info("checkout.session.payload", {
      uid,
      orderId: orderRef.id,
      productId: productId || null,
      stripePriceId: orderItems[0]?.stripePriceId || null,
      itemCount: orderItems.length,
    });

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
          throw createCheckoutFailure(
            "failed-precondition",
            "CHECKOUT_FAILED",
            error?.message || "Invalid checkout payload.",
            {
              productId: productId || null,
              stripePriceId: orderItems[0]?.stripePriceId || null,
            },
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
        throw createCheckoutFailure(
          "unavailable",
          "CHECKOUT_FAILED",
          "Stripe est temporairement indisponible. Merci de reessayer dans quelques instants.",
          {
            productId: productId || null,
            stripePriceId: orderItems[0]?.stripePriceId || null,
          },
        );
      }

      throw createCheckoutFailure(
        "internal",
        "CHECKOUT_FAILED",
        "Unable to create checkout session.",
        {
          productId: productId || null,
          stripePriceId: orderItems[0]?.stripePriceId || null,
        },
      );
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
  async (req, res) => handleStripeWebhookRequest(req, res),
);

export const paymentWebhook = onRequest(
  {
    secrets: [
      STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET,
      MOBILE_MONEY_API_KEY,
      MOBILE_MONEY_API_SECRET,
      MOBILE_MONEY_WEBHOOK_SECRET,
    ],
    invoker: HTTPS_PUBLIC,
  },
  async (req, res) => {
    if (typeof req.headers["stripe-signature"] === "string") {
      await handleStripeWebhookRequest(req, res);
      return;
    }

    await handleMobileMoneyWebhookRequest(req, res);
  },
);

type SecurePdfKind = "resource" | "document";

type SecurePdfMetadata = {
  id: string;
  name: string;
  filePath: string;
  orgId: string;
  programId: string;
  kind: SecurePdfKind;
};

function parseBearerToken(authorizationHeader: unknown): string {
  const header = String(authorizationHeader || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

function deriveStoragePath(rawPathLike: unknown): string {
  const raw = String(rawPathLike || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("gs://")) {
    const normalized = raw.replace("gs://", "");
    const slashIndex = normalized.indexOf("/");
    return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : "";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const encodedPath = url.pathname.match(/\/o\/([^/]+)/i)?.[1] || "";
      if (encodedPath) {
        return decodeURIComponent(encodedPath);
      }
    } catch {
      return "";
    }

    return "";
  }

  // Reject non-storage URI schemes such as chrome-extension://, data:, file:, etc.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return "";
  }

  return raw.replace(/^\/+/, "");
}

function resolvePreferredFilePath(data: Record<string, unknown>): string {
  const candidates = [
    data["filePath"],
    data["storagePath"],
    data["path"],
    data["fileUrl"],
    data["url"],
  ];

  for (const candidate of candidates) {
    const resolved = deriveStoragePath(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return "";
}

async function getSecurePdfMetadataByPath(
  programId: string,
  resourceId: string,
  kind: SecurePdfKind,
): Promise<SecurePdfMetadata | null> {
  const collectionName = kind === "resource" ? "resources" : "documents";
  const snap = await db.doc(`programs/${programId}/${collectionName}/${resourceId}`).get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as Record<string, unknown>;
  if (data["active"] === false) {
    return null;
  }

  const filePath = resolvePreferredFilePath(data);
  if (!filePath) {
    return null;
  }

  const name = String(
    data["title"] || data["name"] || data["fileName"] || `${kind}-${resourceId}`,
  ).trim();

  return {
    id: snap.id,
    name,
    filePath,
    orgId: String(data["orgId"] || "").trim(),
    programId,
    kind,
  };
}

async function findSecurePdfMetadata(
  resourceId: string,
  programId: string,
  kind: SecurePdfKind,
): Promise<SecurePdfMetadata | null> {
  if (programId) {
    const direct = await getSecurePdfMetadataByPath(programId, resourceId, kind);
    if (direct) {
      return direct;
    }
  }

  const collectionName = kind === "resource" ? "resources" : "documents";
  const groupSnap = await db
    .collectionGroup(collectionName)
    .where(admin.firestore.FieldPath.documentId(), "==", resourceId)
    .limit(1)
    .get();

  if (groupSnap.empty) {
    return null;
  }

  const first = groupSnap.docs[0];
  const data = first.data() as Record<string, unknown>;
  if (data["active"] === false) {
    return null;
  }

  const parentProgramId = first.ref.parent.parent?.id || "";
  if (!parentProgramId) {
    return null;
  }

  const filePath = resolvePreferredFilePath(data);
  if (!filePath) {
    return null;
  }

  const name = String(
    data["title"] || data["name"] || data["fileName"] || `${kind}-${resourceId}`,
  ).trim();

  return {
    id: first.id,
    name,
    filePath,
    orgId: String(data["orgId"] || "").trim(),
    programId: parentProgramId,
    kind,
  };
}

function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._ -]/g, "").trim();
  return cleaned || "document";
}

export const securePdf = onRequest(
  {invoker: HTTPS_PUBLIC},
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      res.status(405).json({error: "Method Not Allowed"});
      return;
    }

    const bearerToken = parseBearerToken(req.headers.authorization);
    if (!bearerToken) {
      res.status(401).json({error: "Missing Bearer token"});
      return;
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(bearerToken, true);
    } catch {
      res.status(401).json({error: "Invalid or expired auth token"});
      return;
    }

    const pathSegments = String(req.path || "")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const resourceId = decodeURIComponent(pathSegments[pathSegments.length - 1] || "");

    if (!resourceId) {
      res.status(400).json({error: "resourceId is required"});
      return;
    }

    const requestedProgramId = String(req.query.programId || "").trim();
    const requestedKind = String(req.query.kind || "resource").trim().toLowerCase();
    const kindsToCheck: SecurePdfKind[] = requestedKind === "document"
      ? ["document"]
      : requestedKind === "resource"
        ? ["resource"]
        : ["resource", "document"];

    let metadata: SecurePdfMetadata | null = null;
    for (const kind of kindsToCheck) {
      metadata = await findSecurePdfMetadata(resourceId, requestedProgramId, kind);
      if (metadata) {
        break;
      }
    }

    if (!metadata) {
      console.warn("securePdf denied", {
        reason: "resource_not_found",
        uid: decodedToken.uid,
        resourceId,
        requestedProgramId,
        requestedKind,
      });
      res.status(404).json({error: "Resource not found"});
      return;
    }

    const userSnap = await db.doc(`users/${decodedToken.uid}`).get();
    if (!userSnap.exists) {
      console.warn("securePdf denied", {
        reason: "user_profile_not_found",
        uid: decodedToken.uid,
        programId: metadata.programId,
        resourceId: metadata.id,
      });
      res.status(403).json({error: "User profile not found"});
      return;
    }

    const userData = userSnap.data() as Record<string, unknown>;
    const role = String(userData["role"] || "").trim().toLowerCase();
    const userOrgId = String(userData["orgId"] || "").trim();

    const programSnap = await db.doc(`programs/${metadata.programId}`).get();
    if (!programSnap.exists) {
      res.status(404).json({error: "Program not found"});
      return;
    }

    const programData = programSnap.data() as Record<string, unknown>;
    const effectiveOrgId = metadata.orgId || String(programData["orgId"] || "").trim();
    const isSuperAdmin = role === "super_admin";
    const isPrivilegedRole = ["super_admin", "admin", "manager", "programadmin", "programstaff"]
      .includes(role);

    // Privileged staff are org-scoped and must stay within their organization boundary.
    if (!isSuperAdmin && isPrivilegedRole && effectiveOrgId && userOrgId && effectiveOrgId !== userOrgId) {
      console.warn("securePdf denied", {
        reason: "organization_access_denied",
        uid: decodedToken.uid,
        role,
        userOrgId,
        effectiveOrgId,
        programId: metadata.programId,
        resourceId: metadata.id,
      });
      res.status(403).json({error: "Organization access denied"});
      return;
    }

    if (!isPrivilegedRole) {
      const enrollmentsByUserIdSnap = await db.collection("programEnrollments")
        .where("userId", "==", decodedToken.uid)
        .where("programId", "==", metadata.programId)
        .limit(20)
        .get();

      // Backward compatibility: some historical records used `uid` instead of `userId`.
      const enrollmentsByUidSnap = await db.collection("programEnrollments")
        .where("uid", "==", decodedToken.uid)
        .where("programId", "==", metadata.programId)
        .limit(20)
        .get();

      const enrollmentDocsByPath = new Map<string, admin.firestore.QueryDocumentSnapshot>();
      for (const docSnap of enrollmentsByUserIdSnap.docs) {
        enrollmentDocsByPath.set(docSnap.ref.path, docSnap);
      }
      for (const docSnap of enrollmentsByUidSnap.docs) {
        enrollmentDocsByPath.set(docSnap.ref.path, docSnap);
      }

      const hasValidEnrollment = Array.from(enrollmentDocsByPath.values()).some((docSnap) => {
        const enrollment = docSnap.data() as Record<string, unknown>;
        const status = String(enrollment["status"] || "").trim().toLowerCase();
        const accessStatus = String(enrollment["accessStatus"] || "").trim().toLowerCase();
        const paymentStatus = String(enrollment["paymentStatus"] || "").trim().toLowerCase();

        const allowedStatuses = ["approved", "confirmed", "active", "completed", "enrolled"];
        const allowedAccessStatuses = ["active", "completed", "confirmed", "granted"];

        return allowedStatuses.includes(status) ||
          allowedAccessStatuses.includes(accessStatus) ||
          paymentStatus === "paid";
      });

      if (!hasValidEnrollment) {
        const enrollmentDebug = Array.from(enrollmentDocsByPath.values()).slice(0, 5).map((docSnap) => {
          const enrollment = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            status: String(enrollment["status"] || "").trim(),
            accessStatus: String(enrollment["accessStatus"] || "").trim(),
            paymentStatus: String(enrollment["paymentStatus"] || "").trim(),
          };
        });
        console.warn("securePdf denied", {
          reason: "enrollment_required",
          uid: decodedToken.uid,
          role,
          programId: metadata.programId,
          resourceId: metadata.id,
          enrollmentCount: enrollmentDocsByPath.size,
          enrollments: enrollmentDebug,
        });
        res.status(403).json({error: "Enrollment required"});
        return;
      }

      // Learners with a valid enrollment are allowed even if profile org differs
      // from program org (historical data can contain cross-org enrollments).
    }

    try {
      const bucket = storage.bucket();
      const file = bucket.file(metadata.filePath);
      let exists = false;
      try {
        const result = await file.exists();
        exists = !!result[0];
      } catch (error) {
        console.error("securePdf exists check failed", {
          resourceId: metadata.id,
          path: metadata.filePath,
          error,
        });
        res.status(500).json({error: "Unable to verify file"});
        return;
      }

      if (!exists) {
        res.status(404).json({error: "File not found in storage"});
        return;
      }

      const safeFilename = sanitizeFilename(metadata.name).toLowerCase().endsWith(".pdf")
        ? sanitizeFilename(metadata.name)
        : `${sanitizeFilename(metadata.name)}.pdf`;

      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", `inline; filename="${safeFilename}"`);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Accept-Ranges", "none");

      if (req.method === "HEAD") {
        res.status(200).end();
        return;
      }

      const stream = file.createReadStream();
      stream.on("error", (error) => {
        console.error("securePdf stream error", {resourceId: metadata?.id, path: metadata?.filePath, error});
        if (!res.headersSent) {
          const maybeCode = Number((error as {code?: unknown})?.code);
          if (maybeCode === 404) {
            res.status(404).json({error: "File not found in storage"});
            return;
          }
          res.status(500).json({error: "Failed to read file"});
        } else {
          res.end();
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("securePdf failed", {resourceId: metadata.id, path: metadata.filePath, error});
      res.status(500).json({error: "Unable to stream PDF"});
    }
  },
);

export const debugProduct = onRequest(
  {invoker: HTTPS_PUBLIC},
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      res.status(405).json({error: "Method Not Allowed"});
      return;
    }

    const pathSegments = String(req.path || "")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const derivedPathProductId = pathSegments.length ? pathSegments[pathSegments.length - 1] : "";
    const productId = decodeURIComponent(
      String(derivedPathProductId || req.query.productId || "").trim(),
    );

    if (!productId) {
      res.status(400).json({
        error: "productId is required.",
        example: `${APP_ORIGIN}/debug/product/global-nurse-pack`,
      });
      return;
    }

    try {
      const summary = await buildProductDebugSummary(productId);
      res.status(200).json(summary);
    } catch (error) {
      console.error("debugProduct failure", {productId, error});
      res.status(500).json({
        error: "Unable to inspect product.",
        productId,
      });
    }
  },
);

export const sitemapXml = onRequest(
  {invoker: HTTPS_PUBLIC},
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const xml = await buildSitemapXml();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=1800, s-maxage=1800");
      res.status(200).send(req.method === "HEAD" ? undefined : xml);
    } catch (error) {
      console.error("Failed to generate sitemap.xml:", error);
      res.status(500)
        .set("Content-Type", "application/xml; charset=utf-8")
        .send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Unable to generate sitemap</error>");
    }
  },
);

export const createPaymentIntent = onCall(
  {
    secrets: [
      STRIPE_SECRET_KEY,
      MOBILE_MONEY_API_KEY,
      MOBILE_MONEY_API_SECRET,
      MOBILE_MONEY_WEBHOOK_SECRET,
    ],
    invoker: HTTPS_PUBLIC,
  },
  async (request: CallableRequest<CreatePaymentIntentPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const requestedUserId = String(request.data?.userId || "").trim();
    if (requestedUserId && requestedUserId !== uid) {
      throw new HttpsError("permission-denied", "userId does not match the authenticated user.");
    }

    const method = request.data?.paymentMethod === "mobile_money" ? "mobile_money" : "stripe";
    const provider = String(request.data?.provider || (method === "stripe" ? "stripe" : "MTN")).trim() ||
      (method === "stripe" ? "stripe" : "MTN");
    const phone = String(request.data?.phone || "").trim();
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (method === "stripe") {
      if (!successUrl || !cancelUrl) {
        throw new HttpsError(
          "invalid-argument",
          "successUrl and cancelUrl are required for Stripe payments.",
        );
      }

      if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
        throw new HttpsError("invalid-argument", "Checkout redirect URLs are not allowed.");
      }
    }

    if (method === "mobile_money" && !phone) {
      throw new HttpsError("invalid-argument", "phone is required for Mobile Money payments.");
    }

    const itemType = request.data?.itemType === "wallet_topup" ? "wallet_topup" : "program";
    const programContext = itemType === "program" ? await resolveProgramPaymentContext(uid, request.data || {}) : null;
    const walletContext = itemType === "wallet_topup" ? await resolveWalletTopUpPaymentContext(uid, request.data || {}) : null;
    const programConnectDestination = itemType === "program" && programContext ?
      await buildProgramStripeConnectPaymentIntentData(
        String(programContext.programId || ""),
        programContext.orgId || null,
        Number(programContext.amount || 0),
      ) :
      {
        ownerType: "platform" as OwnerType,
        ownerId: null,
        payoutMode: "manual" as PayoutMode,
        platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
        partnerSharePercent: 0,
        payoutMethodConfigured: true,
        payoutMethod: undefined,
        stripeAccountId: null,
        applicationFeeAmount: null,
      };
    const paymentRef = db.collection("payments").doc();
    const orderRef = db.collection(`users/${uid}/orders`).doc();
    const reference = itemType === "program" ?
      buildPaymentReference(uid, String(programContext?.programId || "program")) :
      buildPaymentReference(uid, "wallet");

    const basePaymentDoc: Record<string, unknown> = {
      id: paymentRef.id,
      userId: uid,
      orderId: orderRef.id,
      amount: itemType === "program" ? programContext?.amount : walletContext?.amount,
      currency: itemType === "program" ? programContext?.currency : walletContext?.currency,
      itemType,
      title: itemType === "program" ? programContext?.programTitle : walletContext?.title,
      orgId: itemType === "program" ? programContext?.orgId : walletContext?.orgId,
      ownerType: itemType === "program" ? programConnectDestination.ownerType : "platform",
      ownerId: itemType === "program" ? programConnectDestination.ownerId : null,
      payoutMode: itemType === "program" ? programConnectDestination.payoutMode : "manual",
      platformFeePercent: itemType === "program" ? programConnectDestination.platformFeePercent : DEFAULT_PLATFORM_FEE_PERCENT,
      partnerSharePercent: itemType === "program" ? programConnectDestination.partnerSharePercent : 0,
      payoutMethodConfigured: itemType === "program" ? programConnectDestination.payoutMethodConfigured : true,
      payoutMethod: itemType === "program" ? programConnectDestination.payoutMethod || null : null,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    };

    if (itemType === "program") {
      basePaymentDoc.programId = programContext?.programId;
      basePaymentDoc.enrollmentId = programContext?.enrollmentId;
    }

    const writes: Array<Promise<FirebaseFirestore.WriteResult>> = [
      paymentRef.set({
        ...basePaymentDoc,
        method,
        provider,
        gateway: method === "mobile_money" ? MOBILE_MONEY_GATEWAY.value() : "stripe",
        status: "pending",
        reference,
        phone: phone || null,
      }),
      orderRef.set({
        id: orderRef.id,
        uid,
        orgId: itemType === "program" ? programContext?.orgId : walletContext?.orgId,
        itemType,
        itemId: itemType === "program" ? programContext?.programId : "wallet_usd",
        offerId: null,
        title: itemType === "program" ? programContext?.programTitle : walletContext?.title,
        amount: itemType === "program" ? programContext?.amount : walletContext?.amount,
        currency: itemType === "program" ? programContext?.currency : walletContext?.currency,
        enrollmentId: itemType === "program" ? programContext?.enrollmentId : null,
        paymentId: paymentRef.id,
        reference,
        ownerType: itemType === "program" ? programConnectDestination.ownerType : "platform",
        ownerId: itemType === "program" ? programConnectDestination.ownerId : null,
        payoutMode: itemType === "program" ? programConnectDestination.payoutMode : "manual",
        platformFeePercent: itemType === "program" ? programConnectDestination.platformFeePercent : DEFAULT_PLATFORM_FEE_PERCENT,
        partnerSharePercent: itemType === "program" ? programConnectDestination.partnerSharePercent : 0,
        payoutMethodConfigured: itemType === "program" ? programConnectDestination.payoutMethodConfigured : true,
        payoutMethod: itemType === "program" ? programConnectDestination.payoutMethod || null : null,
        items: [{
          offerId: null,
          itemType,
          itemId: itemType === "program" ? programContext?.programId || "" : "wallet_usd",
          title: itemType === "program" ? programContext?.programTitle || "" : walletContext?.title || "",
          amount: itemType === "program" ? programContext?.amount || 0 : walletContext?.amount || 0,
          currency: itemType === "program" ? programContext?.currency || "USD" : walletContext?.currency || "USD",
          qty: 1,
          ownerType: itemType === "program" ? programConnectDestination.ownerType : "platform",
          ownerId: itemType === "program" ? programConnectDestination.ownerId : null,
          payoutMode: itemType === "program" ? programConnectDestination.payoutMode : "manual",
          platformFeePercent: itemType === "program" ? programConnectDestination.platformFeePercent : DEFAULT_PLATFORM_FEE_PERCENT,
          partnerSharePercent: itemType === "program" ? programConnectDestination.partnerSharePercent : 0,
          payoutMethodConfigured: itemType === "program" ? programConnectDestination.payoutMethodConfigured : true,
          payoutMethod: itemType === "program" ? programConnectDestination.payoutMethod || null : null,
        }],
        status: "pending",
        provider: method === "mobile_money" ? "mobile_money" : "stripe",
        createdAt: nowTs(),
        updatedAt: nowTs(),
      }),
    ];

    if (itemType === "program" && programContext) {
      writes.push(
        db.doc(`programEnrollments/${programContext.enrollmentId}`).set({
          paymentStatus: "pending",
          pendingPaymentId: paymentRef.id,
          paymentMethod: method,
          paymentProvider: provider,
          paymentReference: reference,
          updatedAt: nowTs(),
        }, {merge: true})
      );
    }

    await Promise.all(writes);

    if (method === "stripe") {
      const stripe = getStripe();
      const unitAmount = Math.round(((itemType === "program" ? programContext?.amount : walletContext?.amount) || 0) * 100);
      let imageUrl: string | null = null;
      if (programContext?.programImageUrl) {
        try {
          const parsed = new URL(programContext.programImageUrl);
          if (parsed.protocol === "https:") {
            imageUrl = parsed.toString();
          }
        } catch {
          imageUrl = null;
        }
      }

      const sessionMetadata: Record<string, string> = {
        uid,
        orderId: orderRef.id,
        paymentId: paymentRef.id,
        itemType,
      };

      if (itemType === "program") {
        sessionMetadata.enrollmentId = String(programContext?.enrollmentId || "");
        sessionMetadata.programId = String(programContext?.programId || "");
        sessionMetadata.ownerType = String(programConnectDestination.ownerType);
        sessionMetadata.ownerId = String(programConnectDestination.ownerId || "");
        sessionMetadata.courseId = "";
        sessionMetadata.offerId = "";
        sessionMetadata.payoutMode = String(programConnectDestination.payoutMode);
        sessionMetadata.platformFeePercent = String(programConnectDestination.platformFeePercent);
        sessionMetadata.partnerSharePercent = String(programConnectDestination.partnerSharePercent);
        sessionMetadata.type = "program_enrollment";
      } else {
        sessionMetadata.type = "wallet_topup";
        sessionMetadata.amountUSD = String(walletContext?.amount || 0);
      }

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: itemType === "program" ? programContext?.email : walletContext?.email,
          metadata: sessionMetadata,
          line_items: [{
            price_data: {
              currency: String(itemType === "program" ? programContext?.currency : walletContext?.currency || "USD").toLowerCase(),
              product_data: {
                name: itemType === "program" ? programContext?.programTitle || "Program" : "Innovacare Review — Wallet Credits",
                description: itemType === "program" ?
                  String(programContext?.programSubtitle || programContext?.programDescription || "").trim().slice(0, 500) || undefined :
                  `Add $${Number(walletContext?.amount || 0).toFixed(2)} to your Innovacare Review wallet`,
                ...(imageUrl ? {images: [imageUrl]} : {}),
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          ...(programConnectDestination.paymentIntentData ? {payment_intent_data: programConnectDestination.paymentIntentData} : {}),
        });
      } catch (stripeError: unknown) {
        const errType = String((stripeError as Record<string, unknown>)?.type || "");
        const errMessage = String((stripeError as Record<string, unknown>)?.message || "Stripe checkout failed.");
        console.error("createPaymentIntent stripe failure", {
          uid,
          paymentId: paymentRef.id,
          itemType,
          programId: programContext?.programId || null,
          enrollmentId: programContext?.enrollmentId || null,
          unitAmount,
          currency: String(itemType === "program" ? programContext?.currency : walletContext?.currency || "USD").toLowerCase(),
          errType,
          errMessage,
        });
        if (errType === "StripeAuthenticationError") {
          throw new HttpsError("internal", "Stripe authentication failed. Please contact support.");
        }
        if (errType === "StripeInvalidRequestError") {
          throw new HttpsError("failed-precondition", `Stripe rejected the checkout request: ${errMessage}`);
        }
        throw new HttpsError("unavailable", "Stripe is temporarily unavailable. Please retry in a moment.");
      }

      await Promise.all([
        paymentRef.set({
          checkoutSessionId: session.id,
          checkoutUrl: session.url || null,
          stripeAccountId: programConnectDestination.stripeAccountId,
          platformFeeAmount: programConnectDestination.applicationFeeAmount,
          updatedAt: nowTs(),
        }, {merge: true}),
        orderRef.set({
          checkoutSessionId: session.id,
          stripeAccountId: programConnectDestination.stripeAccountId,
          platformFeeAmount: programConnectDestination.applicationFeeAmount,
          updatedAt: nowTs(),
        }, {merge: true}),
      ]);

      if (itemType === "program" && programContext) {
        await db.doc(`programEnrollments/${programContext.enrollmentId}`).set({
          checkoutSessionId: session.id,
          paymentProvider: programConnectDestination.stripeAccountId ? "stripe_connect" : "stripe",
          updatedAt: nowTs(),
        }, {merge: true});
      }

      return {
        paymentId: paymentRef.id,
        status: "pending",
        method,
        provider,
        reference,
        checkoutUrl: session.url || null,
      };
    }

    const mobileMoneyConfig = getMobileMoneyConfig();
    let mobileMoneyResult: Awaited<ReturnType<typeof createMobileMoneyCharge>>;
    try {
      mobileMoneyResult = await createMobileMoneyCharge(mobileMoneyConfig, {
      itemType,
      amount: Number(itemType === "program" ? programContext?.amount : walletContext?.amount || 0),
      currency: String(itemType === "program" ? programContext?.currency : walletContext?.currency || "USD"),
      reference,
      phone,
      provider,
      callbackUrl: buildPaymentWebhookUrl(),
      successUrl,
      cancelUrl,
      customer: {
        id: uid,
        email: itemType === "program" ? programContext?.email : walletContext?.email,
        name: itemType === "program" ? programContext?.displayName : walletContext?.displayName,
      },
      metadata: {
        paymentId: paymentRef.id,
        userId: uid,
        itemType,
        ...(itemType === "program" ? {
          programId: programContext?.programId || "",
          enrollmentId: programContext?.enrollmentId || "",
        } : {
          walletAmountUSD: String(walletContext?.amount || 0),
        }),
      },
    });
    } catch (mmError: unknown) {
      const errMessage = String((mmError as Record<string, unknown>)?.message || "Mobile Money charge failed.");
      console.error("createPaymentIntent mobile_money failure", {
        uid,
        paymentId: paymentRef.id,
        itemType,
        programId: programContext?.programId || null,
        enrollmentId: programContext?.enrollmentId || null,
        gateway: mobileMoneyConfig.gateway,
        errMessage,
      });
      throw new HttpsError("unavailable", `Mobile Money payment failed: ${errMessage}`);
    }

    await Promise.all([
      paymentRef.set({
        providerTransactionId: mobileMoneyResult.providerTransactionId || null,
        checkoutUrl: mobileMoneyResult.checkoutUrl || null,
        rawPayload: mobileMoneyResult.raw,
        updatedAt: nowTs(),
      }, {merge: true}),
      orderRef.set({
        providerTransactionId: mobileMoneyResult.providerTransactionId || null,
        updatedAt: nowTs(),
      }, {merge: true}),
    ]);

    if (mobileMoneyResult.status === "success") {
      if (itemType === "program") {
        await finalizeProgramEnrollmentPayment({
          paymentId: paymentRef.id,
          providerTransactionId: mobileMoneyResult.providerTransactionId || null,
          rawPayload: mobileMoneyResult.raw,
        });
      } else {
        await finalizeWalletTopUpPayment({
          paymentId: paymentRef.id,
          providerTransactionId: mobileMoneyResult.providerTransactionId || null,
          rawPayload: mobileMoneyResult.raw,
        });
      }
    }

    return {
      paymentId: paymentRef.id,
      status: mobileMoneyResult.status,
      method,
      provider,
      reference,
      checkoutUrl: mobileMoneyResult.checkoutUrl || null,
    };
  },
);

export const connectStripeAccount = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request) => {
    const uid = String(request.auth?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const userContext = await getUserContext(uid);
    if (!userContext.active) {
      throw new HttpsError("permission-denied", "Inactive users cannot manage payouts.");
    }
    if (!userContext.orgId) {
      throw new HttpsError("failed-precondition", "Your organization profile is incomplete.");
    }
    if (!canManageStripeConnect(userContext.role)) {
      throw new HttpsError("permission-denied", "You do not have access to manage Stripe payouts.");
    }

    const requestedOrgId = String(request.data?.orgId || "").trim();
    const orgId = requestedOrgId || userContext.orgId;
    const normalizedRole = String(userContext.role || "").trim().toLowerCase();
    if (requestedOrgId && requestedOrgId !== userContext.orgId && normalizedRole !== "super_admin") {
      throw new HttpsError("permission-denied", "You cannot manage another organization payout account.");
    }

    const organizationRef = db.doc(`organizations/${orgId}`);
    const organizationSnap = await organizationRef.get();
    const organizationData = (organizationSnap.data() || {}) as Record<string, unknown>;
    const existingStripeAccountId = String(organizationData["stripeAccountId"] || "").trim();

    try {
      const stripe = getStripe();
      let stripeAccountId = existingStripeAccountId;

      if (!stripeAccountId) {
        const userSnap = await db.doc(`users/${uid}`).get();
        const userData = (userSnap.data() || {}) as Record<string, unknown>;
        const country = String(organizationData["country"] || userData["country"] || "US").trim().toUpperCase();

        const account = await stripe.accounts.create({
          type: "express",
          country: /^[A-Z]{2}$/.test(country) ? country : "US",
          email: String(organizationData["email"] || userData["email"] || request.auth?.token.email || "").trim() || undefined,
          business_type: "individual",
          metadata: {
            orgId,
            createdByUid: uid,
          },
        });
        stripeAccountId = account.id;
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: buildStripeConnectReturnUrl("refresh", orgId),
        return_url: buildStripeConnectReturnUrl("return", orgId),
        type: "account_onboarding",
      });

      const account = await stripe.accounts.retrieve(stripeAccountId);
      await organizationRef.set({
        stripeAccountId,
        stripeChargesEnabled: account.charges_enabled === true,
        stripeDetailsSubmitted: account.details_submitted === true,
        stripePayoutsEnabled: account.payouts_enabled === true,
        stripeConnectedBy: uid,
        stripeConnectedAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});

      return {
        accountId: stripeAccountId,
        onboardingUrl: accountLink.url,
        chargesEnabled: account.charges_enabled === true,
        detailsSubmitted: account.details_submitted === true,
        payoutsEnabled: account.payouts_enabled === true,
      };
    } catch (error: unknown) {
      const message = String((error as {message?: string})?.message || "Unable to initialize Stripe Connect.");
      const requestId = String((error as {requestId?: string})?.requestId || "").trim();
      console.error("connectStripeAccount failed", {
        uid,
        orgId,
        message,
        requestId: requestId || null,
      });

      if (message.includes("complete your platform profile")) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe platform profile is incomplete. Complete the Stripe Connect questionnaire in your Stripe dashboard before onboarding organizations."
        );
      }

      throw new HttpsError("internal", `Stripe Connect onboarding failed: ${message}`);
    }
  },
);

/* ─────────── Callable: getConnectAccountStatus ─────────── */
type ConnectAccountStatus =
  | "missing_account"
  | "onboarding_required"
  | "pending_verification"
  | "charges_enabled"
  | "fully_active"
  | "restricted";

function resolveConnectAccountStatus(account: Stripe.Account): ConnectAccountStatus {
  if (!account.details_submitted) return "onboarding_required";
  if (account.requirements?.disabled_reason) return "restricted";
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  if (currentlyDue.length > 0 || pastDue.length > 0) return "restricted";
  if (!account.charges_enabled && !account.payouts_enabled) return "pending_verification";
  if (account.charges_enabled && account.payouts_enabled) return "fully_active";
  return "charges_enabled";
}

export const getConnectAccountStatus = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request) => {
    const uid = String(request.auth?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const userContext = await getUserContext(uid);
    if (!userContext.active) {
      throw new HttpsError("permission-denied", "Inactive account.");
    }

    const requestedOrgId = String(request.data?.orgId || "").trim();
    const orgId = requestedOrgId || String(userContext.orgId || "").trim();
    if (!orgId) {
      throw new HttpsError("failed-precondition", "No organization linked to your account.");
    }

    const normalizedRole = String(userContext.role || "").trim().toLowerCase();
    if (requestedOrgId && requestedOrgId !== userContext.orgId && normalizedRole !== "super_admin") {
      throw new HttpsError("permission-denied", "You cannot check another organization's Stripe status.");
    }

    const orgRef = db.doc(`organizations/${orgId}`);
    const orgSnap = await orgRef.get();
    const orgData = (orgSnap.data() || {}) as Record<string, unknown>;
    const stripeAccountId = String(orgData["stripeAccountId"] || "").trim();

    if (!stripeAccountId) {
      return {
        status: "missing_account" as ConnectAccountStatus,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsCurrentlyDue: [],
        requirementsPastDue: [],
        disabledReason: null,
        stripeAccountId: null,
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(stripeAccountId);
      const status = resolveConnectAccountStatus(account);

      const currentlyDue = account.requirements?.currently_due ?? [];
      const pastDue = account.requirements?.past_due ?? [];

      await orgRef.set({
        stripeAccountId,
        stripeChargesEnabled: account.charges_enabled === true,
        stripeDetailsSubmitted: account.details_submitted === true,
        stripePayoutsEnabled: account.payouts_enabled === true,
        stripeConnectStatus: status,
        stripeRequirementsCurrentlyDue: currentlyDue,
        stripeRequirementsPastDue: pastDue,
        stripeDisabledReason: account.requirements?.disabled_reason || null,
        stripeStatusCheckedAt: nowTs(),
        updatedAt: nowTs(),
      }, {merge: true});

      return {
        status,
        chargesEnabled: account.charges_enabled === true,
        payoutsEnabled: account.payouts_enabled === true,
        detailsSubmitted: account.details_submitted === true,
        requirementsCurrentlyDue: currentlyDue,
        requirementsPastDue: pastDue,
        disabledReason: account.requirements?.disabled_reason || null,
        stripeAccountId,
        checkedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = String((error as {message?: string})?.message || "Unable to retrieve Stripe account.");
      console.error("getConnectAccountStatus failed", {uid, orgId, message});
      throw new HttpsError("internal", `Failed to retrieve Stripe Connect status: ${message}`);
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

    const userSnap = await db.doc(`users/${uid}`).get();
    const userOrgId = String(userSnap.get("orgId") || "").trim() || null;
    const userRole = String(userSnap.get("role") || "").trim() || null;
    const notification = await resolveAccessNotificationMeta(itemType, itemId);

    await sendSystemNotificationToUser({
      uid,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      severity: "info",
      category: notification.category,
      organizationId: userOrgId,
      targetRole: userRole,
    });

    return {ok: true};
  },
);

export const getPartnerPayoutRecords = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{status?: "pending" | "paid"; limit?: number}>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const userCtx = await getUserContext(uid);
    if (!userCtx.active) {
      throw new HttpsError("permission-denied", "Inactive account.");
    }

    const role = String(userCtx.role || "").trim().toLowerCase();
    const isAdmin = ["super_admin", "admin", "manager", "programadmin", "programstaff"].includes(role);
    const requestedStatus = String(request.data?.status || "").trim().toLowerCase();
    const limitValue = Math.min(200, Math.max(1, Number(request.data?.limit || 50)));

    let queryRef: FirebaseFirestore.Query = db.collection("partnerPayoutRecords")
      .orderBy("updatedAt", "desc")
      .limit(limitValue);

    if (isAdmin) {
      if (requestedStatus === "pending" || requestedStatus === "paid") {
        queryRef = db.collection("partnerPayoutRecords")
          .where("payoutStatus", "==", requestedStatus)
          .orderBy("updatedAt", "desc")
          .limit(limitValue);
      }
    } else {
      queryRef = db.collection("partnerPayoutRecords")
        .where("partnerId", "==", uid)
        .orderBy("updatedAt", "desc")
        .limit(limitValue);
    }

    const snap = await queryRef.get();
    const records = snap.docs
      .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() || {})}))
      .filter((record) => {
        if (!requestedStatus || isAdmin === true && (requestedStatus !== "pending" && requestedStatus !== "paid")) {
          return true;
        }
        return String((record as Record<string, unknown>)["payoutStatus"] || "").trim().toLowerCase() === requestedStatus;
      });

    return {
      records,
      count: records.length,
      role: isAdmin ? "admin" : "partner",
    };
  },
);

export const markPartnerPayoutPaid = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<{payoutId?: string; payoutReference?: string; notes?: string}>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const userCtx = await getUserContext(uid);
    const role = String(userCtx.role || "").trim().toLowerCase();
    const isAdmin = ["super_admin", "admin", "manager", "programadmin", "programstaff"].includes(role);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Only admins can mark payouts as paid.");
    }

    const payoutId = String(request.data?.payoutId || "").trim();
    const payoutReference = String(request.data?.payoutReference || "").trim() || null;
    const notes = String(request.data?.notes || "").trim() || null;
    if (!payoutId) {
      throw new HttpsError("invalid-argument", "payoutId is required.");
    }

    const payoutRef = db.doc(`partnerPayoutRecords/${payoutId}`);
    const payoutSnap = await payoutRef.get();
    if (!payoutSnap.exists) {
      throw new HttpsError("not-found", "Payout record not found.");
    }

    await payoutRef.set({
      payoutStatus: "paid",
      payoutReference,
      notes,
      paidAt: nowTs(),
      paidByAdminId: uid,
      updatedAt: nowTs(),
    }, {merge: true});

    return {ok: true, payoutId};
  },
);

export const createOrRepairDigitalProductEnrollment = onCall(
  {invoker: HTTPS_PUBLIC},
  async (
    request: CallableRequest<{
      uid: string;
      productId: string;
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
    const productId = String(request.data?.productId || "").trim();

    if (!uid || !productId) {
      throw new HttpsError("invalid-argument", "uid and productId are required.");
    }

    const product = await resolveCheckoutProduct(productId);
    const enrollmentId = `${uid}_${productId}`;

    await db.doc(`enrollments/${enrollmentId}`).set({
      id: enrollmentId,
      userId: uid,
      productId,
      productName: product.name,
      productType: product.type,
      stripePriceId: product.stripePriceId,
      stripeProductId: product.stripeProductId,
      currency: product.currency,
      amount: product.amountCents,
      paymentStatus: "pending",
      accessStatus: "pending",
      checkoutReady: true,
      repairedBy: callerUid,
      updatedAt: nowTs(),
      createdAt: nowTs(),
    }, {merge: true});

    await db.doc(`users/${uid}/digitalProductEnrollments/${productId}`).set({
      id: productId,
      productId,
      productName: product.name,
      productType: product.type,
      stripePriceId: product.stripePriceId,
      stripeProductId: product.stripeProductId,
      currency: product.currency,
      amount: product.amountCents,
      paymentStatus: "pending",
      accessStatus: "pending",
      checkoutReady: true,
      repairedBy: callerUid,
      updatedAt: nowTs(),
      createdAt: nowTs(),
    }, {merge: true});

    return {
      ok: true,
      enrollmentId,
      uid,
      productId,
      paymentStatus: "pending",
      checkoutReady: true,
    };
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
      console.warn("createCinetPayProgramCheckoutSession enrollment not found", {uid, enrollmentId});
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
    const connectDestination = await buildProgramStripeConnectPaymentIntentData(programId, orgId, price);

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
      ownerType: connectDestination.ownerType,
      ownerId: connectDestination.ownerId,
      payoutMode: connectDestination.payoutMode,
      platformFeePercent: connectDestination.platformFeePercent,
      partnerSharePercent: connectDestination.partnerSharePercent,
      payoutMethodConfigured: connectDestination.payoutMethodConfigured,
      payoutMethod: connectDestination.payoutMethod || null,
      items: [{
        offerId: null,
        itemType: "program",
        itemId: programId,
        title: String(program.title || "Program").trim(),
        amount: price,
        currency: currency.toUpperCase(),
        qty: 1,
        stripePriceId: null,
        ownerType: connectDestination.ownerType,
        ownerId: connectDestination.ownerId,
        payoutMode: connectDestination.payoutMode,
        platformFeePercent: connectDestination.platformFeePercent,
        partnerSharePercent: connectDestination.partnerSharePercent,
        payoutMethodConfigured: connectDestination.payoutMethodConfigured,
        payoutMethod: connectDestination.payoutMethod || null,
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
        ownerType: connectDestination.ownerType,
        ownerId: String(connectDestination.ownerId || ""),
        courseId: "",
        offerId: "",
        payoutMode: connectDestination.payoutMode,
        platformFeePercent: String(connectDestination.platformFeePercent),
        partnerSharePercent: String(connectDestination.partnerSharePercent),
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
      ...(connectDestination.paymentIntentData ? {payment_intent_data: connectDestination.paymentIntentData} : {}),
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
    await orderRef.update({
      checkoutSessionId: session.id,
      stripeAccountId: connectDestination.stripeAccountId,
      platformFeeAmount: connectDestination.applicationFeeAmount,
      updatedAt: nowTs(),
    });
    await enrollmentRef.update({
      checkoutSessionId: session.id,
      paymentStatus: "pending",
      paymentProvider: connectDestination.stripeAccountId ? "stripe_connect" : "stripe",
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
      ownerType: "platform",
      ownerId: uid,
      payoutMode: "manual",
      platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
      partnerSharePercent: 0,
      payoutMethodConfigured: true,
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

    await sendSystemNotificationToUser({
      uid,
      title: "Course published",
      body: `${String(course?.title || "Course").trim() || "Course"} is now published to the marketplace.`,
      severity: "info",
      category: "content",
      organizationId: orgId,
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

type SubmitMarketingLeadPayload = {
  name: string;
  email: string;
  organization?: string;
  interest: string;
  message: string;
  source: "contact-page" | "quiz" | "popup";
};

type BusinessSearchType =
  | "course"
  | "program"
  | "document"
  | "live_session"
  | "resource"
  | "blog";

type BusinessSearchFiltersPayload = {
  type?: string;
  status?: string;
  organization?: string;
  level?: string;
};

type GlobalBusinessSearchPayload = {
  query?: string;
  filters?: BusinessSearchFiltersPayload;
  limit?: number;
};

type GlobalBusinessSearchItem = {
  id: string;
  type: BusinessSearchType;
  title: string;
  summary: string;
  status: string;
  level: string;
  organizationId: string;
  organizationLabel: string;
  programId?: string;
  parentProgramTitle?: string;
  keywords: string[];
};

type SearchAccessContext = {
  role: string;
  isAdmin: boolean;
  enrolledProgramIds: Set<string>;
};

const ADMIN_SEARCH_ROLES = new Set([
  "super_admin",
  "admin",
  "manager",
  "instructor",
  "programAdmin",
  "programStaff",
]);

function normalizeSearchText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function formatSearchLabel(value: unknown, fallback: string): string {
  const candidate = firstText(value, fallback);
  return candidate
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function collectSearchKeywords(
  source: Record<string, unknown>,
  extras: Array<string | undefined>,
): string[] {
  const raw = [
    ...extras,
    firstText(source["category"], source["audience"], source["track"], source["type"]),
    ...(Array.isArray(source["tags"]) ? source["tags"].map((entry) => String(entry)) : []),
    ...(Array.isArray(source["topics"]) ? source["topics"].map((entry) => String(entry)) : []),
  ];

  return raw.filter(Boolean) as string[];
}

function canViewPublicEntry(data: Record<string, unknown>): boolean {
  const active = data["active"] !== false && data["isActive"] !== false;
  const isPublic = data["isPublic"] !== false && data["visibility"] !== "private";
  const status = normalizeSearchText(
    firstText(data["status"], data["publicationStatus"], data["lifecycleStatus"]),
  );

  if (["draft", "archived", "private", "inactive"].includes(status)) {
    return false;
  }

  return active && isPublic;
}

function scoreBusinessSearchItem(item: GlobalBusinessSearchItem, tokens: string[]): number {
  if (!tokens.length) {
    return 1;
  }

  const title = normalizeSearchText(item.title);
  const summary = normalizeSearchText(item.summary);
  const keywords = item.keywords.map((keyword) => normalizeSearchText(keyword));

  return tokens.reduce((score, token) => {
    if (title.startsWith(token)) {
      return score + 120;
    }

    if (title.includes(token)) {
      return score + 80;
    }

    if (summary.includes(token)) {
      return score + 30;
    }

    if (keywords.some((keyword) => keyword.includes(token))) {
      return score + 18;
    }

    return score;
  }, 0);
}

function matchesBusinessSearchFilters(
  item: GlobalBusinessSearchItem,
  filters: Required<BusinessSearchFiltersPayload>,
): boolean {
  if (filters.type !== "all" && item.type !== filters.type) {
    return false;
  }

  if (filters.status !== "all" && item.status !== filters.status) {
    return false;
  }

  if (filters.organization !== "all" && item.organizationLabel !== filters.organization) {
    return false;
  }

  if (filters.level !== "all" && item.level !== filters.level) {
    return false;
  }

  return true;
}

function buildBusinessSearchFacets(items: GlobalBusinessSearchItem[]) {
  const organizations = [...new Set(items.map((item) => item.organizationLabel).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const statuses = [...new Set(items.map((item) => item.status).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const levels = [...new Set(items.map((item) => item.level).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  return {organizations, statuses, levels};
}

async function getSearchAccessContext(uid?: string): Promise<SearchAccessContext> {
  if (!uid) {
    return {role: "guest", isAdmin: false, enrolledProgramIds: new Set<string>()};
  }

  const profileSnap = await db.doc(`users/${uid}`).get();
  const profile = (profileSnap.data() || {}) as Record<string, unknown>;
  const role = firstText(profile["role"], profile["primaryRole"], "guest");
  const isAdmin = ADMIN_SEARCH_ROLES.has(role) || profile["isProgramAdmin"] === true || profile["isProgramStaff"] === true;
  const enrolledProgramIds = new Set<string>();

  if (!isAdmin) {
    const enrollmentsSnap = await db.collection("programEnrollments")
      .where("userId", "==", uid)
      .where("paymentStatus", "==", "paid")
      .where("status", "in", ["active", "completed", "confirmed"])
      .limit(80)
      .get();

    for (const docSnap of enrollmentsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const programId = firstText(data["programId"]);
      if (programId) {
        enrolledProgramIds.add(programId);
      }
    }
  }

  return {role, isAdmin, enrolledProgramIds};
}

async function getOrganizationLabelMap(limitCount: number): Promise<Map<string, string>> {
  const organizations = new Map<string, string>();
  const snap = await db.collection("organizations").limit(limitCount).get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    organizations.set(docSnap.id, firstText(data["name"], data["title"], data["displayName"], docSnap.id) || docSnap.id);
  }

  return organizations;
}

export const globalBusinessSearch = onCall(async (request: CallableRequest<GlobalBusinessSearchPayload>) => {
  const payload = (request.data || {}) as GlobalBusinessSearchPayload;
  const rawFilters = payload.filters || {};
  const filters: Required<BusinessSearchFiltersPayload> = {
    type: firstText(rawFilters.type, "all"),
    status: firstText(rawFilters.status, "all"),
    organization: firstText(rawFilters.organization, "all"),
    level: firstText(rawFilters.level, "all"),
  };
  const queryText = firstText(payload.query);
  const tokens = normalizeSearchText(queryText).split(/\s+/).filter(Boolean);
  const resultLimit = Math.min(Math.max(Number(payload.limit || 24), 1), 48);
  const scanLimit = Math.max(80, resultLimit * 4);
  const access = await getSearchAccessContext(request.auth?.uid);
  const organizations = await getOrganizationLabelMap(160);
  const programsById = new Map<string, {
    title: string;
    orgId: string;
    orgName: string;
    level: string;
    status: string;
  }>();
  const rows: GlobalBusinessSearchItem[] = [];

  const programSnap = access.isAdmin
    ? await db.collection("programs").limit(scanLimit).get()
    : await db.collection("programs").limit(scanLimit).get();

  for (const docSnap of programSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    if (!access.isAdmin && !access.enrolledProgramIds.has(docSnap.id) && !canViewPublicEntry(data)) {
      continue;
    }

    const orgId = firstText(data["orgId"], data["organizationId"], data["organization"]);
    const orgName = firstText(data["orgName"], data["organizationName"], organizations.get(orgId), "Independent");
    const status = formatSearchLabel(
      firstText(data["status"], data["lifecycleStatus"], data["publicationStatus"]),
      access.enrolledProgramIds.has(docSnap.id) ? "Enrolled" : "Active",
    );
    const level = formatSearchLabel(firstText(data["level"], data["difficulty"], data["audienceLevel"]), "All levels");
    const title = firstText(data["title"], data["name"], data["programTitle"], "Untitled program");
    const summary = firstText(data["summary"], data["description"], data["overview"], data["subtitle"]);

    programsById.set(docSnap.id, {title, orgId, orgName, level, status});
    rows.push({
      id: docSnap.id,
      type: "program",
      title,
      summary,
      status,
      level,
      organizationId: orgId,
      organizationLabel: orgName,
      keywords: collectSearchKeywords(data, [title, summary, orgName, level, status]),
    });
  }

  for (const programId of access.enrolledProgramIds) {
    if (programsById.has(programId)) {
      continue;
    }

    const docSnap = await db.doc(`programs/${programId}`).get();
    if (!docSnap.exists) {
      continue;
    }

    const data = (docSnap.data() || {}) as Record<string, unknown>;
    const orgId = firstText(data["orgId"], data["organizationId"], data["organization"]);
    const orgName = firstText(data["orgName"], data["organizationName"], organizations.get(orgId), "Independent");
    const status = formatSearchLabel(firstText(data["status"], data["lifecycleStatus"]), "Enrolled");
    const level = formatSearchLabel(firstText(data["level"], data["difficulty"], data["audienceLevel"]), "All levels");
    const title = firstText(data["title"], data["name"], data["programTitle"], "Untitled program");
    const summary = firstText(data["summary"], data["description"], data["overview"], data["subtitle"]);

    programsById.set(programId, {title, orgId, orgName, level, status});
    rows.push({
      id: programId,
      type: "program",
      title,
      summary,
      status,
      level,
      organizationId: orgId,
      organizationLabel: orgName,
      keywords: collectSearchKeywords(data, [title, summary, orgName, level, status]),
    });
  }

  const courseSnap = await db.collection("courses").limit(scanLimit).get();
  for (const docSnap of courseSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    if (!access.isAdmin && !canViewPublicEntry(data)) {
      continue;
    }

    const orgId = firstText(data["orgId"], data["organizationId"], data["organization"]);
    const orgName = firstText(data["orgName"], data["organizationName"], organizations.get(orgId), "Independent");
    const status = formatSearchLabel(firstText(data["status"], data["visibility"], data["publicationStatus"]), "Active");
    const level = formatSearchLabel(firstText(data["level"], data["difficulty"], data["courseLevel"]), "All levels");
    const title = firstText(data["title"], data["name"], data["courseTitle"], "Untitled course");
    const summary = firstText(data["summary"], data["description"], data["subtitle"], data["category"]);

    rows.push({
      id: docSnap.id,
      type: "course",
      title,
      summary,
      status,
      level,
      organizationId: orgId,
      organizationLabel: orgName,
      keywords: collectSearchKeywords(data, [title, summary, orgName, level, status]),
    });
  }

  if (access.isAdmin) {
    const documentsSnap = await db.collectionGroup("documents").limit(scanLimit).get();
    for (const docSnap of documentsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const programId = docSnap.ref.parent.parent?.id || "";
      const program = programsById.get(programId);
      rows.push({
        id: docSnap.id,
        type: "document",
        title: firstText(data["title"], data["name"], data["fileName"], "Document"),
        summary: firstText(data["description"], data["summary"], data["instructions"], program?.title),
        status: formatSearchLabel(firstText(data["status"], data["visibility"], data["state"]), "Available"),
        level: program?.level || "All levels",
        organizationId: program?.orgId || "",
        organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
        programId,
        parentProgramTitle: program?.title,
        keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
      });
    }

    const liveSessionsSnap = await db.collectionGroup("liveSessions").limit(scanLimit).get();
    for (const docSnap of liveSessionsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const programId = docSnap.ref.parent.parent?.id || "";
      const program = programsById.get(programId);
      rows.push({
        id: docSnap.id,
        type: "live_session",
        title: firstText(data["title"], data["name"], data["sessionTitle"], "Live session"),
        summary: firstText(data["description"], data["summary"], data["instructorName"], data["meetingLink"]),
        status: formatSearchLabel(firstText(data["status"], data["sessionStatus"]), "Scheduled"),
        level: program?.level || "All levels",
        organizationId: program?.orgId || "",
        organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
        programId,
        parentProgramTitle: program?.title,
        keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
      });
    }

    const resourcesSnap = await db.collectionGroup("resources").limit(scanLimit).get();
    for (const docSnap of resourcesSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const programId = docSnap.ref.parent.parent?.id || "";
      const program = programsById.get(programId);
      rows.push({
        id: docSnap.id,
        type: "resource",
        title: firstText(data["title"], data["name"], data["label"], "Resource"),
        summary: firstText(data["description"], data["summary"], data["resourceType"], data["link"]),
        status: formatSearchLabel(firstText(data["status"], data["visibility"]), "Available"),
        level: program?.level || "All levels",
        organizationId: program?.orgId || "",
        organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
        programId,
        parentProgramTitle: program?.title,
        keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
      });
    }
  } else if (access.enrolledProgramIds.size) {
    for (const programId of [...access.enrolledProgramIds].slice(0, 12)) {
      const program = programsById.get(programId);
      const documentsSnap = await db.collection(`programs/${programId}/documents`).limit(24).get();
      for (const docSnap of documentsSnap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        if (data["active"] === false) {
          continue;
        }

        rows.push({
          id: docSnap.id,
          type: "document",
          title: firstText(data["title"], data["name"], data["fileName"], "Document"),
          summary: firstText(data["description"], data["summary"], data["instructions"], program?.title),
          status: formatSearchLabel(firstText(data["status"], data["visibility"], data["state"]), "Available"),
          level: program?.level || "All levels",
          organizationId: program?.orgId || "",
          organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
          programId,
          parentProgramTitle: program?.title,
          keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
        });
      }

      const liveSessionsSnap = await db.collection(`programs/${programId}/liveSessions`).limit(24).get();
      for (const docSnap of liveSessionsSnap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        if (data["active"] === false) {
          continue;
        }

        rows.push({
          id: docSnap.id,
          type: "live_session",
          title: firstText(data["title"], data["name"], data["sessionTitle"], "Live session"),
          summary: firstText(data["description"], data["summary"], data["instructorName"], data["meetingLink"]),
          status: formatSearchLabel(firstText(data["status"], data["sessionStatus"]), "Scheduled"),
          level: program?.level || "All levels",
          organizationId: program?.orgId || "",
          organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
          programId,
          parentProgramTitle: program?.title,
          keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
        });
      }

      const resourcesSnap = await db.collection(`programs/${programId}/resources`).limit(24).get();
      for (const docSnap of resourcesSnap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        if (data["active"] === false) {
          continue;
        }

        rows.push({
          id: docSnap.id,
          type: "resource",
          title: firstText(data["title"], data["name"], data["label"], "Resource"),
          summary: firstText(data["description"], data["summary"], data["resourceType"], data["link"]),
          status: formatSearchLabel(firstText(data["status"], data["visibility"]), "Available"),
          level: program?.level || "All levels",
          organizationId: program?.orgId || "",
          organizationLabel: program?.orgName || organizations.get(program?.orgId || "") || "Independent",
          programId,
          parentProgramTitle: program?.title,
          keywords: collectSearchKeywords(data, [program?.title, program?.orgName]),
        });
      }
    }
  }

  const blogSnap = await db.collection("marketingPosts").limit(80).get();
  for (const docSnap of blogSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    if (!access.isAdmin && !canViewPublicEntry(data)) {
      continue;
    }

    const title = firstText(data["title"], data["name"], data["headline"], "Blog post");
    const summary = firstText(data["excerpt"], data["summary"], data["description"], data["content"]);
    const status = formatSearchLabel(firstText(data["status"], data["visibility"]), "Published");

    rows.push({
      id: docSnap.id,
      type: "blog",
      title,
      summary,
      status,
      level: "Editorial",
      organizationId: "",
      organizationLabel: "InnovaCare",
      keywords: collectSearchKeywords(data, [title, summary, "blog", status]),
    });
  }

  const matched = rows
    .filter((item) => {
      if (!matchesBusinessSearchFilters(item, filters)) {
        return false;
      }

      if (!tokens.length) {
        return true;
      }

      const haystack = [
        item.title,
        item.summary,
        item.organizationLabel,
        item.level,
        item.status,
        item.parentProgramTitle,
        ...item.keywords,
      ]
        .map((value) => normalizeSearchText(value))
        .join(" ");

      return tokens.every((token) => haystack.includes(token));
    })
    .map((item) => ({item, score: scoreBusinessSearchItem(item, tokens)}))
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title));

  const items = matched.slice(0, resultLimit).map((entry) => entry.item);
  return {
    items,
    options: buildBusinessSearchFacets(items),
  };
});

export const listExamPrepAssessments = onCall(async (request: CallableRequest<ExamPrepAssessmentListPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const programScope = await resolveRequestedExamPrepProgramScope(String(request.data?.programSpaceId || "").trim());
  const assessmentSnap = await db.collection(`organizations/${orgId}/assessmentDefinitions`).get();
  const programSnap = await db.collection(`organizations/${orgId}/examPrograms`).get();
  const modulesSnap = await db.collection(`organizations/${orgId}/examModules`).get();
  const courseGroupsSnap = await db.collection(`organizations/${orgId}/examCourseGroups`).get();

  const programTitles = new Map(programSnap.docs.map((docSnap) => [docSnap.id, String(docSnap.get("title") || docSnap.id)]));
  const moduleTitles = new Map(modulesSnap.docs.map((docSnap) => [docSnap.id, String(docSnap.get("title") || docSnap.id)]));
  const courseGroupTitles = new Map(courseGroupsSnap.docs.map((docSnap) => [docSnap.id, String(docSnap.get("title") || docSnap.id)]));

  const items = assessmentSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as ExamPrepAssessmentRecord)}))
    .filter((item) => isExamPrepAssessmentVisibleToLearner(item, uid))
    .filter((item) => matchesExamPrepProgramScope(item.programId, getAssessmentPublicProgramId(item), programScope))
    .map((item) => ({
      id: String(item.id || ""),
      title: String(item.title || "Exam Prep Assessment"),
      description: String(item.description || ""),
      assessmentMode: String(item.assessmentMode || "exam"),
      durationMinutes: Number(item.durationMinutes || 0),
      passingScorePercent: Number(item.passingScorePercent || 70),
      drawCount: Number(item.drawCount || 0),
      caseStudyCount: Number(item.caseStudyCount || 0),
      reviewMode: String(item.reviewMode || "summary_only"),
      instructions: String(item.instructions || "Read each item carefully and commit your best clinical judgment."),
      maxAttempts: Math.max(1, Number(item.maxAttempts || 1)),
      allowRetake: item.allowRetake !== false,
      requireAllQuestionsAnswered: item.requireAllQuestionsAnswered === true,
      autoSubmitOnTimeout: item.autoSubmitOnTimeout !== false,
      showScoreImmediately: item.showScoreImmediately === true,
      policy: buildExamPrepPolicy(item),
      programTitle: programTitles.get(String(item.programId || "")) || String(item.programId || "Exam Prep"),
      moduleTitle: item.moduleId ? moduleTitles.get(String(item.moduleId)) || String(item.moduleId) : "",
      courseGroupTitle: item.courseGroupId ? courseGroupTitles.get(String(item.courseGroupId)) || String(item.courseGroupId) : "",
      isCustom: item.customGenerated === true,
      visibilityScope: String(item.visibilityScope || "public"),
    }))
    .sort((left, right) => Number(right.isCustom) - Number(left.isCustom) || left.title.localeCompare(right.title));

  return {items};
});

export const getCustomExamPrepAvailability = onCall(async (request: CallableRequest<GetCustomExamPrepAvailabilityPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const payload = request.data || {};
  const difficulty = normalizeCustomDifficulty(payload.difficulty);
  const questionFamily = normalizeCustomQuestionFamily(payload.questionFamily);
  const questionUsageFilter = normalizeCustomQuestionUsageFilter(payload.questionUsageFilter);
  const courseGroupTitle = String(payload.courseGroupTitle || "").trim();
  const moduleTitle = String(payload.moduleTitle || "").trim();
  const programSpaceId = String(payload.programSpaceId || "").trim();
  const availability = await loadCustomExamPrepQuestionAvailability({
    orgId,
    uid,
    programSpaceId,
    difficulty,
    questionFamily,
    questionUsageFilter,
    courseGroupTitle,
    moduleTitle,
  });

  return {
    availableQuestionCount: availability.selectedBucket.length,
    totalEligibleQuestionCount: availability.eligible.length,
    availableCourseGroups: availability.availableCourseGroups,
    availableModules: availability.availableModules,
  };
});

export const createCustomExamPrepAssessment = onCall(async (request: CallableRequest<CreateCustomExamPrepAssessmentPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const payload = request.data || {};
  const questionCount = Math.max(5, Math.min(120, Number(payload.questionCount || 25)));
  const durationMinutes = Math.max(10, Math.min(180, Number(payload.durationMinutes || 45)));
  const difficulty = normalizeCustomDifficulty(payload.difficulty);
  const deliveryPreset = normalizeCustomDeliveryPreset(payload.deliveryPreset);
  const questionFamily = normalizeCustomQuestionFamily(payload.questionFamily);
  const questionUsageFilter = normalizeCustomQuestionUsageFilter(payload.questionUsageFilter);
  const courseGroupTitle = String(payload.courseGroupTitle || "").trim();
  const moduleTitle = String(payload.moduleTitle || "").trim();
  const programSpaceId = String(payload.programSpaceId || "").trim();
  const availability = await loadCustomExamPrepQuestionAvailability({
    orgId,
    uid,
    programSpaceId,
    difficulty,
    questionFamily,
    questionUsageFilter,
    courseGroupTitle,
    moduleTitle,
  });
  const selectedBucket = availability.selectedBucket;
  if (selectedBucket.length < questionCount) {
    throw new HttpsError(
      "failed-precondition",
      `Only ${selectedBucket.length} published questions are currently usable for this test in this program. Reduce the question count or widen the filters.`
    );
  }

  const selectedQuestions = shuffleList(selectedBucket).slice(0, questionCount);
  const seed = selectedQuestions[0];
  const assessmentRef = db.collection(`organizations/${orgId}/assessmentDefinitions`).doc();
  const assessmentTitle = buildCustomAssessmentTitle({
    title: payload.title,
    questionCount,
    difficulty,
    family: questionFamily,
    preset: deliveryPreset,
    courseGroupTitle,
    moduleTitle,
  });

  const assessment: ExamPrepAssessmentRecord = {
    id: assessmentRef.id,
    title: assessmentTitle,
    description: `Personalized ${deliveryPreset === "tutorial" ? "tutorial" : deliveryPreset === "cat_style" ? "CAT-style" : "timed"} test generated from your organization question bank.`,
    instructions: deliveryPreset === "tutorial"
      ? "Use this guided drill to practice, review rationales, and identify weak spots before your next timed session."
      : "Work through this personalized test under focused exam conditions and use the results to target remediation.",
    assessmentMode: buildCustomAssessmentMode(deliveryPreset),
    durationMinutes,
    passingScorePercent: 70,
    drawCount: questionCount,
    caseStudyCount: selectedQuestions.filter((item) => Boolean(item.parentCaseId)).length,
    reviewMode: buildCustomAssessmentReviewMode(deliveryPreset),
    active: true,
    publishStatus: "personal",
    programId: String(seed?.programId || ""),
    courseGroupId: moduleTitle ? String(seed?.courseGroupId || "") : (courseGroupTitle ? String(seed?.courseGroupId || "") : null),
    moduleId: moduleTitle ? String(seed?.moduleId || "") : null,
    sourceMode: "fixed_static",
    blueprintMode: "manual",
    fixedQuestionIds: selectedQuestions.map((item) => String(item.id || "")),
    randomizeQuestionOrder: deliveryPreset !== "cat_style",
    randomizeChoiceOrder: true,
    deliveryMode: buildCustomAssessmentDeliveryMode(deliveryPreset),
    examTrack: String(seed?.examTrack || ""),
    jurisdiction: String(seed?.jurisdiction || ""),
    maxAttempts: 20,
    allowRetake: true,
    autoSubmitOnTimeout: deliveryPreset !== "tutorial",
    requireAllQuestionsAnswered: deliveryPreset === "cat_style",
    showScoreImmediately: true,
    allowQuestionFlagging: deliveryPreset !== "cat_style",
    allowBackNavigation: deliveryPreset !== "cat_style",
    strictNavigation: deliveryPreset === "cat_style",
    publicProgramId: programSpaceId || null,
    createdBy: uid,
    updatedBy: uid,
    learnerOwnerId: uid,
    visibilityScope: "personal",
    customGenerated: true,
    builderConfig: {
      difficulty,
      deliveryPreset,
      questionFamily,
      questionUsageFilter,
      courseGroupTitle: courseGroupTitle || null,
      moduleTitle: moduleTitle || null,
      programSpaceId: String(payload.programSpaceId || "").trim() || null,
    },
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };

  await assessmentRef.set(assessment, {merge: true});

  return {
    assessmentId: assessmentRef.id,
    assessment: {
      id: assessmentRef.id,
      title: assessmentTitle,
      description: String(assessment.description || ""),
      assessmentMode: String(assessment.assessmentMode || "exam"),
      durationMinutes,
      passingScorePercent: Number(assessment.passingScorePercent || 70),
      drawCount: questionCount,
      caseStudyCount: Number(assessment.caseStudyCount || 0),
      reviewMode: String(assessment.reviewMode || "summary_only"),
      instructions: String(assessment.instructions || ""),
      maxAttempts: Number(assessment.maxAttempts || 1),
      allowRetake: assessment.allowRetake !== false,
      requireAllQuestionsAnswered: assessment.requireAllQuestionsAnswered === true,
      autoSubmitOnTimeout: assessment.autoSubmitOnTimeout !== false,
      showScoreImmediately: assessment.showScoreImmediately === true,
      policy: buildExamPrepPolicy(assessment),
      programTitle: String(seed?.["programTitle"] || seed?.programId || "Exam Prep"),
      moduleTitle: String(seed?.moduleTitle || ""),
      courseGroupTitle: String(seed?.courseGroupTitle || ""),
      isCustom: true,
      visibilityScope: "personal",
    },
  };
});

export const startExamPrepAttempt = onCall(async (request: CallableRequest<StartExamPrepAttemptPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const assessmentId = String(request.data?.assessmentId || "").trim();
  const programSpaceId = String(request.data?.programSpaceId || "").trim();
  if (!assessmentId) {
    throw new HttpsError("invalid-argument", "assessmentId is required.");
  }

  const [assessmentSnap, userSnap] = await Promise.all([
    db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get(),
    db.doc(`users/${uid}`).get(),
  ]);
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Assessment not found.");
  }

  const assessment = {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)};
  if (!isExamPrepAssessmentVisibleToLearner(assessment, uid)) {
    throw new HttpsError("failed-precondition", "Assessment is not available.");
  }

  const learnerAttemptsSnap = await db
    .collection(`organizations/${orgId}/attemptSessions`)
    .where("learnerId", "==", uid)
    .get();
  const learnerAttempts = learnerAttemptsSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as Record<string, unknown>)} as Record<string, unknown> & {id: string}));
  const learnerAssessmentAttempts = learnerAttempts
    .filter((item) => String(item["assessmentId"] || "") === assessmentId);
  const timeLimitSeconds = Math.max(60, Number(assessment.durationMinutes || 0) * 60);

  const staleInProgressAttempts = learnerAssessmentAttempts.filter((item) => {
    if (String(item["status"] || "") !== "in_progress") {
      return false;
    }
    return computeExamPrepElapsedSeconds(item["startedAt"]) >= timeLimitSeconds;
  });
  const staleAttemptIds = new Set(staleInProgressAttempts.map((item) => String(item["id"] || "")));

  for (const staleAttempt of staleInProgressAttempts) {
    const staleAttemptId = String(staleAttempt["id"] || "");
    const staleAttemptRef = db.doc(`organizations/${orgId}/attemptSessions/${staleAttemptId}`);
    if (assessment.autoSubmitOnTimeout !== false) {
      await finalizeExamPrepAttempt({
        orgId,
        uid,
        attemptId: staleAttemptId,
        attemptRef: staleAttemptRef,
        attempt: staleAttempt,
        assessment,
        submitMode: "timeout",
      });
    } else {
      await expireExamPrepAttempt({
        orgId,
        uid,
        attemptId: staleAttemptId,
        attemptRef: staleAttemptRef,
        attempt: staleAttempt,
        assessment,
        elapsedSeconds: computeExamPrepElapsedSeconds(staleAttempt["startedAt"]),
      });
    }
  }

  const activeAttempt = learnerAssessmentAttempts
    .filter((item) => String(item["status"] || "") === "in_progress" && !staleAttemptIds.has(String(item["id"] || "")))
    .sort((left, right) => Number(right["attemptNumber"] || 0) - Number(left["attemptNumber"] || 0))[0];

  if (activeAttempt) {
    const assemblyId = String(activeAttempt["assemblyId"] || "").trim();
    const storedQuestions = Array.isArray(activeAttempt["deliveredQuestions"]) ? activeAttempt["deliveredQuestions"] as Record<string, unknown>[] : [];
    const deliveredQuestionIds = Array.isArray(activeAttempt["deliveredQuestionIds"])
      ? (activeAttempt["deliveredQuestionIds"] as unknown[]).map((value) => String(value || "")).filter(Boolean)
      : [];
    const assemblyQuestions = assemblyId ? await readExamPrepAssemblyQuestionSnapshots(orgId, assemblyId) : [];
    const hydratedQuestions = assemblyQuestions.length
      ? assemblyQuestions.map((item) => sanitizeExamPrepQuestion(mapExamPrepAssemblyItemToQuestionRecord(item)))
      : (storedQuestions.length ? storedQuestions : await hydrateExamPrepQuestionsByIds(orgId, deliveredQuestionIds));
    const deliveredQuestions = assemblyQuestions.length
      ? hydratedQuestions
      : applyDeliveredChoiceOrder(hydratedQuestions, activeAttempt["deliveredChoiceOrderMap"]);

    if (!deliveredQuestions.length) {
      throw new HttpsError("failed-precondition", "The saved attempt cannot be reopened because its question set is no longer available.");
    }

    const runtimeState = await readExamPrepAttemptRuntimeState({
      orgId,
      attemptId: String(activeAttempt["id"] || ""),
      attempt: activeAttempt,
      assessment,
    });

    await appendExamPrepEvent({
      orgId,
      attemptId: String(activeAttempt["id"] || ""),
      learnerId: uid,
      eventType: "attempt_resumed",
      payload: {
        assessmentId,
        currentQuestionIndex: Number(activeAttempt["currentIndex"] || 0),
      },
    });

    await appendExamPrepEvent({
      orgId,
      attemptId: String(activeAttempt["id"] || ""),
      learnerId: uid,
      eventType: "question_rendered",
      payload: {
        assessmentId,
        currentQuestionIndex: Number(activeAttempt["currentIndex"] || 0),
        questionId: deliveredQuestionIds[Number(activeAttempt["currentIndex"] || 0)] || deliveredQuestionIds[0] || "",
      },
    });

    return buildExamPrepSessionPayload({
      attemptId: String(activeAttempt["id"] || ""),
      assessment,
      attempt: activeAttempt,
      questions: deliveredQuestions,
      resumed: true,
      runtimeState,
    });
  }

  const completedAttempts = learnerAssessmentAttempts.filter((item) =>
    isExamPrepTerminalStatus(item["status"]) || staleAttemptIds.has(String(item["id"] || ""))
  );
  const maxAttempts = Math.max(1, Number(assessment.maxAttempts || 1));
  if (completedAttempts.length >= maxAttempts) {
    throw new HttpsError("failed-precondition", "Maximum attempts reached for this assessment.");
  }
  if (completedAttempts.length > 0 && assessment.allowRetake === false) {
    throw new HttpsError("failed-precondition", "Retakes are disabled for this assessment.");
  }

  const questionDocs = await resolveExamPrepQuestionDocs(orgId, assessment);
  if (!questionDocs.length) {
    throw new HttpsError("failed-precondition", "No published questions are available for this assessment.");
  }

  const deliveredQuestions = questionDocs.map((item) => {
    const next = sanitizeExamPrepQuestion(item);
    if (assessment.randomizeChoiceOrder === true) {
      next["choices"] = shuffleList((next["choices"] as Array<Record<string, unknown>>) || []);
    }
    return next;
  });
  const deliveredChoiceOrderMap = buildDeliveredChoiceOrderMap(deliveredQuestions);

  if (!deliveredQuestions.length || !questionDocs.map((item) => item.id).filter(Boolean).length) {
    throw new HttpsError("failed-precondition", "This assessment is missing a valid published question set.");
  }

  const attemptRef = db.collection(`organizations/${orgId}/attemptSessions`).doc();
  const assemblyId = attemptRef.id;
  const learnerName = String(userSnap.get("displayName") || userSnap.get("fullName") || "").trim() || null;
  const questionIds = questionDocs.map((item) => item.id);
  const attemptNumber = learnerAssessmentAttempts.reduce((highest, item) => Math.max(highest, Number(item["attemptNumber"] || 0)), 0) + 1;
  const startedAt = nowStamp();
  try {
    await writeExamPrepAssemblySnapshot({
      orgId,
      assemblyId,
      learnerId: uid,
      assessment,
      questionDocs,
      deliveredQuestions,
      programSpaceId,
    });

    await attemptRef.set({
      id: attemptRef.id,
      organizationId: orgId,
      learnerId: uid,
      learnerName,
      assemblyId,
      publicProgramId: programSpaceId || null,
      programId: String(assessment.programId || ""),
      jurisdiction: String(assessment.jurisdiction || ""),
      examTrack: String(assessment.examTrack || ""),
      assessmentId,
      assessmentTitle: String(assessment.title || "Exam Prep Assessment"),
      assessmentMode: String(assessment.assessmentMode || "exam"),
      attemptNumber,
      status: "in_progress",
      deliveredQuestionIds: questionIds,
      deliveredChoiceOrderMap,
      deliveredCaseStudyIds: [],
      deliveredOrder: questionIds,
      currentIndex: 0,
      answerMap: {},
      flagMap: {},
      lockedQuestionIds: [],
      visitedQuestionIds: [questionIds[0]].filter(Boolean),
      questionStatusMap: buildExamPrepQuestionStatuses(
        questionIds,
        {},
        {},
        [questionIds[0]].filter(Boolean),
        [],
        deriveExamPrepDeliveryMode(assessment),
      ),
      answeredCount: 0,
      unansweredCount: questionIds.length,
      flaggedCount: 0,
      questionDurations: {},
      sectionTransitions: [],
      timeLimitSeconds,
      elapsedSeconds: 0,
      startedAt,
      expiresAt: admin.firestore.Timestamp.fromMillis(startedAt.toMillis() + (timeLimitSeconds * 1000)),
      lastInteractionAt: nowTs(),
      createdAt: nowTs(),
      updatedAt: nowTs(),
      createdBy: uid,
      updatedBy: uid,
    });

    await syncExamPrepResponseDocs({
      orgId,
      attemptId: attemptRef.id,
      assessmentId,
      assemblyId,
      learnerId: uid,
      answers: {},
      flags: {},
      questionDurations: {},
      questionStatuses: buildExamPrepQuestionStatuses(
        questionIds,
        {},
        {},
        [questionIds[0]].filter(Boolean),
        [],
        deriveExamPrepDeliveryMode(assessment),
      ),
      lockedQuestionIds: [],
      visitedQuestionIds: [questionIds[0]].filter(Boolean),
      questionIds,
      touchedQuestionIds: [questionIds[0]].filter(Boolean),
    });
  } catch (error) {
    const message = String((error as {message?: unknown})?.message || "").toLowerCase();
    if (message.includes("maximum") || message.includes("too large") || message.includes("size")) {
      throw new HttpsError(
        "resource-exhausted",
        "This assessment could not be started because the generated attempt payload exceeded storage limits.",
      );
    }
    throw error;
  }

  await appendExamPrepEvent({
    orgId,
    attemptId: attemptRef.id,
    learnerId: uid,
    eventType: "assessment_started",
    payload: {
      assessmentId,
      attemptNumber,
      questionCount: questionIds.length,
    },
  });

  await appendExamPrepEvent({
    orgId,
    attemptId: attemptRef.id,
    learnerId: uid,
    eventType: "question_rendered",
    payload: {
      assessmentId,
      currentQuestionIndex: 0,
      questionId: questionIds[0] || "",
    },
  });

  return buildExamPrepSessionPayload({
    attemptId: attemptRef.id,
    assessment,
    attempt: {
      id: attemptRef.id,
      assemblyId,
      attemptNumber,
      assessmentId,
      status: "in_progress",
      deliveredQuestionIds: questionIds,
      currentIndex: 0,
      timeLimitSeconds,
      startedAt,
      answerMap: {},
      flagMap: {},
      lockedQuestionIds: [],
      visitedQuestionIds: [questionIds[0]].filter(Boolean),
      questionDurations: {},
    },
    questions: deliveredQuestions,
    resumed: false,
  });
});

export const getActiveExamPrepAttempts = onCall(async (request: CallableRequest<GetActiveExamPrepAttemptsPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const programSpaceId = String(request.data?.programSpaceId || "").trim();

  const activeAttemptsSnap = await db
    .collection(`organizations/${orgId}/attemptSessions`)
    .where("learnerId", "==", uid)
    .where("status", "==", "in_progress")
    .get();

  const items = activeAttemptsSnap.docs
    .map((docSnap) => ({id: docSnap.id, ...(docSnap.data() as Record<string, unknown>)} as Record<string, unknown> & {id: string}))
    .filter((attempt) => !programSpaceId || String(attempt["publicProgramId"] || "") === programSpaceId)
    .filter((attempt) => {
      const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || 0));
      return computeExamPrepElapsedSeconds(attempt["startedAt"]) < timeLimitSeconds;
    })
    .sort((left, right) => Number(right["attemptNumber"] || 0) - Number(left["attemptNumber"] || 0))
    .map((attempt) => ({
      attemptId: String(attempt["id"] || ""),
      assessmentId: String(attempt["assessmentId"] || ""),
      assessmentTitle: String(attempt["assessmentTitle"] || "Exam Prep Assessment"),
      attemptNumber: Number(attempt["attemptNumber"] || 1),
      currentQuestionIndex: Number(attempt["currentIndex"] || 0),
      remainingSeconds: computeExamPrepRemainingSeconds(attempt["startedAt"], Math.max(60, Number(attempt["timeLimitSeconds"] || 0))),
    }));

  return {items};
});

export const abandonExamPrepAttempt = onCall(async (request: CallableRequest<AbandonExamPrepAttemptPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const attemptId = String(request.data?.attemptId || "").trim();
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const attemptRef = db.doc(`organizations/${orgId}/attemptSessions/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) {
    throw new HttpsError("not-found", "Attempt not found.");
  }

  const attempt = attemptSnap.data() as Record<string, unknown>;
  if (String(attempt["learnerId"] || "") !== uid) {
    throw new HttpsError("permission-denied", "This attempt does not belong to the current learner.");
  }
  if (String(attempt["status"] || "") !== "in_progress") {
    return {
      status: String(attempt["status"] || "submitted"),
      attemptId,
      reviewId: String(attempt["reviewSnapshotPath"] || "").split("/").pop() || attemptId,
      remainingSeconds: 0,
      serverNowMs: Date.now(),
    };
  }

  const assessmentId = String(attempt["assessmentId"] || "");
  const assessmentSnap = await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get();
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Assessment definition not found.");
  }

  const assessment = {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)};
  const runtimeState = await readExamPrepAttemptRuntimeState({orgId, attemptId, attempt, assessment});
  const questionIds = runtimeState.questionIds;
  const lockedQuestionIds = runtimeState.lockedQuestionIds;
  const deliveryMode = deriveExamPrepDeliveryMode(assessment);
  const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || Number(assessment.durationMinutes || 0) * 60));
  const normalizedAnswers = normalizeExamPrepAnswerMap(request.data?.answers);
  const normalizedFlags = normalizeBooleanMap(request.data?.flags);
  const normalizedDurations = normalizeNumberMap(request.data?.questionDurations);

  if (computeExamPrepElapsedSeconds(attempt["startedAt"]) >= timeLimitSeconds && assessment.autoSubmitOnTimeout !== false) {
    return finalizeExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: normalizedAnswers,
      flags: normalizedFlags,
      questionDurations: normalizedDurations,
      submitMode: "timeout",
    });
  }

  if (computeExamPrepElapsedSeconds(attempt["startedAt"]) >= timeLimitSeconds && assessment.autoSubmitOnTimeout === false) {
    return expireExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: normalizedAnswers,
      flags: normalizedFlags,
      questionDurations: normalizedDurations,
    });
  }

  const answers = mergeExamPrepAnswers({attempt, existingAnswers: runtimeState.answers, incomingAnswers: normalizedAnswers, lockedQuestionIds});
  const flags = mergeExamPrepFlags({attempt, existingFlags: runtimeState.flags, incomingFlags: normalizedFlags, lockedQuestionIds});
  const currentQuestionIndex = resolveExamPrepCurrentQuestionIndex({
    questionIds,
    lockedQuestionIds,
    preferredIndex: Number(request.data?.currentQuestionIndex || attempt["currentIndex"] || 0),
    deliveryMode,
  });
  const visitedQuestionIds = normalizeStringArray([
    ...runtimeState.visitedQuestionIds,
    ...normalizeStringArray(request.data?.visitedQuestionIds),
    questionIds[currentQuestionIndex] || "",
  ]);
  const questionDurations = normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations);
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    lockedQuestionIds,
    deliveryMode,
  );
  const counts = buildExamPrepAttemptCounts(questionStatuses);
  const elapsedSeconds = computeExamPrepElapsedSeconds(attempt["startedAt"]);

  await syncExamPrepResponseDocs({
    orgId,
    attemptId,
    assessmentId,
    assemblyId: String(attempt["assemblyId"] || "").trim() || null,
    learnerId: uid,
    answers,
    flags,
    questionDurations,
    questionStatuses,
    lockedQuestionIds,
    visitedQuestionIds,
    questionIds,
    touchedQuestionIds: questionIds,
  });

  await attemptRef.set({
    status: "abandoned",
    currentIndex: currentQuestionIndex,
    answerMap: answers,
    flagMap: flags,
    lockedQuestionIds,
    visitedQuestionIds,
    questionDurations,
    questionStatusMap: questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    elapsedSeconds,
    abandonedAt: nowTs(),
    lastInteractionAt: nowTs(),
    updatedAt: nowTs(),
    updatedBy: uid,
  }, {merge: true});

  await appendExamPrepEvent({
    orgId,
    attemptId,
    learnerId: uid,
    eventType: "attempt_abandoned",
    payload: {
      assessmentId,
      currentQuestionIndex,
      answeredCount: counts.answeredCount,
      unansweredCount: counts.unansweredCount,
      flaggedCount: counts.flaggedCount,
    },
  });

  return {
    status: "abandoned",
    attemptId,
    remainingSeconds: 0,
    serverNowMs: Date.now(),
  };
});

export const saveExamPrepAttemptProgress = onCall(async (request: CallableRequest<SaveExamPrepAttemptProgressPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const attemptId = String(request.data?.attemptId || "").trim();
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const attemptRef = db.doc(`organizations/${orgId}/attemptSessions/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) {
    throw new HttpsError("not-found", "Attempt not found.");
  }

  const attempt = attemptSnap.data() as Record<string, unknown>;
  if (String(attempt["learnerId"] || "") !== uid) {
    throw new HttpsError("permission-denied", "This attempt does not belong to the current learner.");
  }
  if (String(attempt["status"] || "") !== "in_progress") {
    return {
      status: String(attempt["status"] || "submitted"),
      attemptId,
      reviewId: String(attempt["reviewSnapshotPath"] || "").split("/").pop() || attemptId,
      remainingSeconds: 0,
      serverNowMs: Date.now(),
    };
  }

  const assessmentId = String(attempt["assessmentId"] || "");
  const assessmentSnap = await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get();
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Assessment definition not found.");
  }
  const assessment = {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)};
  const runtimeState = await readExamPrepAttemptRuntimeState({orgId, attemptId, attempt, assessment});
  const questionIds = runtimeState.questionIds;
  const lockedQuestionIds = runtimeState.lockedQuestionIds;
  const deliveryMode = deriveExamPrepDeliveryMode(assessment);
  const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || Number(assessment.durationMinutes || 0) * 60));
  const normalizedAnswers = normalizeExamPrepAnswerMap(request.data?.answers);
  const normalizedFlags = normalizeBooleanMap(request.data?.flags);
  const normalizedDurations = normalizeNumberMap(request.data?.questionDurations);

  if (computeExamPrepElapsedSeconds(attempt["startedAt"]) >= timeLimitSeconds && assessment.autoSubmitOnTimeout !== false) {
    return finalizeExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: normalizedAnswers,
      flags: normalizedFlags,
      questionDurations: normalizedDurations,
      submitMode: "timeout",
    });
  }

  if (computeExamPrepElapsedSeconds(attempt["startedAt"]) >= timeLimitSeconds && assessment.autoSubmitOnTimeout === false) {
    return expireExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: normalizedAnswers,
      flags: normalizedFlags,
      questionDurations: normalizedDurations,
    });
  }

  const answers = mergeExamPrepAnswers({attempt, existingAnswers: runtimeState.answers, incomingAnswers: normalizedAnswers, lockedQuestionIds});
  const flags = mergeExamPrepFlags({attempt, existingFlags: runtimeState.flags, incomingFlags: normalizedFlags, lockedQuestionIds});
  const visitedQuestionIds = normalizeStringArray([
    ...runtimeState.visitedQuestionIds,
    ...normalizeStringArray(request.data?.visitedQuestionIds),
    questionIds[resolveExamPrepCurrentQuestionIndex({
      questionIds,
      lockedQuestionIds,
      preferredIndex: Number(request.data?.currentQuestionIndex || attempt["currentIndex"] || 0),
      deliveryMode,
    })] || "",
  ]);
  const questionDurations = normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations);
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    lockedQuestionIds,
    deliveryMode,
  );
  const counts = buildExamPrepAttemptCounts(questionStatuses);
  const currentQuestionIndex = resolveExamPrepCurrentQuestionIndex({
    questionIds,
    lockedQuestionIds,
    preferredIndex: Number(request.data?.currentQuestionIndex || 0),
    deliveryMode,
  });

  await syncExamPrepResponseDocs({
    orgId,
    attemptId,
    assessmentId,
    assemblyId: String(attempt["assemblyId"] || "").trim() || null,
    learnerId: uid,
    answers,
    flags,
    questionDurations,
    questionStatuses,
    lockedQuestionIds,
    visitedQuestionIds,
    questionIds,
    touchedQuestionIds: normalizeStringArray([
      ...Object.keys(normalizedAnswers),
      ...Object.keys(normalizedFlags),
      ...Object.keys(normalizedDurations),
      ...normalizeStringArray(request.data?.visitedQuestionIds),
      questionIds[currentQuestionIndex] || "",
    ]),
  });

  await attemptRef.set({
    currentIndex: currentQuestionIndex,
    answerMap: answers,
    flagMap: flags,
    lockedQuestionIds,
    visitedQuestionIds,
    questionDurations,
    questionStatusMap: questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    elapsedSeconds: computeExamPrepElapsedSeconds(attempt["startedAt"]),
    lastInteractionAt: nowTs(),
    updatedAt: nowTs(),
    updatedBy: uid,
  }, {merge: true});

  const eventType = String(request.data?.eventType || "").trim();
  if (eventType) {
    await appendExamPrepEvent({
      orgId,
      attemptId,
      learnerId: uid,
      eventType,
      payload: {
        assessmentId,
        currentQuestionIndex,
        answeredCount: counts.answeredCount,
        unansweredCount: counts.unansweredCount,
        flaggedCount: counts.flaggedCount,
      },
    });
  }

  return {
    status: "in_progress",
    attemptId,
    currentQuestionIndex,
    lockedQuestionIds,
    questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    remainingSeconds: computeExamPrepRemainingSeconds(attempt["startedAt"], timeLimitSeconds),
    serverNowMs: Date.now(),
  };
});

export const confirmExamPrepQuestion = onCall(async (request: CallableRequest<ConfirmExamPrepQuestionPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const attemptId = String(request.data?.attemptId || "").trim();
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const attemptRef = db.doc(`organizations/${orgId}/attemptSessions/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) {
    throw new HttpsError("not-found", "Attempt not found.");
  }

  const attempt = attemptSnap.data() as Record<string, unknown>;
  if (String(attempt["learnerId"] || "") !== uid) {
    throw new HttpsError("permission-denied", "This attempt does not belong to the current learner.");
  }
  if (String(attempt["status"] || "") !== "in_progress") {
    return {
      status: String(attempt["status"] || "submitted"),
      attemptId,
      reviewId: String(attempt["reviewSnapshotPath"] || "").split("/").pop() || attemptId,
      remainingSeconds: 0,
      serverNowMs: Date.now(),
    };
  }

  const assessmentId = String(attempt["assessmentId"] || "");
  const assessmentSnap = await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get();
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Assessment definition not found.");
  }

  const assessment = {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)};
  const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || Number(assessment.durationMinutes || 0) * 60));
  const elapsedSeconds = Math.max(1, Number(request.data?.elapsedSeconds || 0), computeExamPrepElapsedSeconds(attempt["startedAt"]));
  const runtimeState = await readExamPrepAttemptRuntimeState({orgId, attemptId, attempt, assessment});

  if (elapsedSeconds >= timeLimitSeconds) {
    return finalizeExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: runtimeState.answers,
      flags: runtimeState.flags,
      questionDurations: normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations),
      elapsedSeconds,
      submitMode: "timeout",
    });
  }

  const questionIds = runtimeState.questionIds;
  const lockedQuestionIds = runtimeState.lockedQuestionIds;
  const currentQuestionIndex = resolveExamPrepCurrentQuestionIndex({
    questionIds,
    lockedQuestionIds,
    preferredIndex: Number(attempt["currentIndex"] || 0),
    deliveryMode: deriveExamPrepDeliveryMode(assessment),
  });
  const currentQuestionId = questionIds[currentQuestionIndex] || "";
  const requestedQuestionId = String(request.data?.questionId || currentQuestionId).trim();
  if (!currentQuestionId || requestedQuestionId !== currentQuestionId) {
    throw new HttpsError("failed-precondition", "The current item is out of sync. Reload the exam session.");
  }
  if (lockedQuestionIds.includes(currentQuestionId)) {
    throw new HttpsError("failed-precondition", "This item has already been locked.");
  }

  const selectedAnswerKeys = normalizeStringArray(request.data?.selectedAnswerKeys);
  const currentQuestionRecord = attempt["assemblyId"]
    ? mapExamPrepAssemblyItemToQuestionRecord((await db.doc(`organizations/${orgId}/assessmentAssemblies/${String(attempt["assemblyId"] || "")}/items/${currentQuestionId}`).get()).data() || {})
    : null;
  if (!hasCompleteExamPrepResponse(currentQuestionRecord || {}, selectedAnswerKeys)) {
    throw new HttpsError("failed-precondition", "Select a response before continuing.");
  }

  const answers = mergeExamPrepAnswers({
    attempt,
    existingAnswers: runtimeState.answers,
    incomingAnswers: {[currentQuestionId]: selectedAnswerKeys},
    lockedQuestionIds,
  });
  const flags = mergeExamPrepFlags({attempt, existingFlags: runtimeState.flags, incomingFlags: runtimeState.flags, lockedQuestionIds});
  const questionDurations = normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations);
  const nextLockedQuestionIds = normalizeStringArray([...lockedQuestionIds, currentQuestionId]);
  const nextQuestionIndex = Math.min(currentQuestionIndex + 1, Math.max(questionIds.length - 1, 0));
  const visitedQuestionIds = normalizeStringArray([
    ...runtimeState.visitedQuestionIds,
    currentQuestionId,
    questionIds[nextQuestionIndex] || "",
  ]);
  const questionStatuses = buildExamPrepQuestionStatuses(
    questionIds,
    answers,
    flags,
    visitedQuestionIds,
    nextLockedQuestionIds,
    deriveExamPrepDeliveryMode(assessment),
  );
  const counts = buildExamPrepAttemptCounts(questionStatuses);

  if (nextLockedQuestionIds.length >= questionIds.length || request.data?.finalizeAttempt === true) {
    return finalizeExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt: {
        ...attempt,
        answerMap: answers,
        flagMap: flags,
        lockedQuestionIds: nextLockedQuestionIds,
        visitedQuestionIds,
        questionDurations,
      },
      assessment,
      runtimeState: {
        ...runtimeState,
        answers,
        flags,
        questionDurations,
        visitedQuestionIds,
        lockedQuestionIds: nextLockedQuestionIds,
        questionStatuses,
      },
      answers,
      flags,
      questionDurations,
      elapsedSeconds,
      submitMode: "manual",
    });
  }

  await syncExamPrepResponseDocs({
    orgId,
    attemptId,
    assessmentId,
    assemblyId: String(attempt["assemblyId"] || "").trim() || null,
    learnerId: uid,
    answers,
    flags,
    questionDurations,
    questionStatuses,
    lockedQuestionIds: nextLockedQuestionIds,
    visitedQuestionIds,
    questionIds,
    touchedQuestionIds: [currentQuestionId, questionIds[nextQuestionIndex] || ""].filter(Boolean),
  });

  await attemptRef.set({
    currentIndex: nextQuestionIndex,
    answerMap: answers,
    flagMap: flags,
    lockedQuestionIds: nextLockedQuestionIds,
    visitedQuestionIds,
    questionDurations,
    questionStatusMap: questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    elapsedSeconds,
    lastInteractionAt: nowTs(),
    updatedAt: nowTs(),
    updatedBy: uid,
  }, {merge: true});

  await appendExamPrepEvent({
    orgId,
    attemptId,
    learnerId: uid,
    eventType: "answer_confirmed",
    payload: {
      assessmentId,
      questionId: currentQuestionId,
      currentQuestionIndex,
      selectedAnswerKeys,
    },
  });
  await appendExamPrepEvent({
    orgId,
    attemptId,
    learnerId: uid,
    eventType: "next_clicked",
    payload: {
      assessmentId,
      questionId: currentQuestionId,
      fromIndex: currentQuestionIndex,
      toIndex: nextQuestionIndex,
    },
  });
  await appendExamPrepEvent({
    orgId,
    attemptId,
    learnerId: uid,
    eventType: "question_rendered",
    payload: {
      assessmentId,
      currentQuestionIndex: nextQuestionIndex,
      questionId: questionIds[nextQuestionIndex] || "",
    },
  });

  return {
    status: "in_progress",
    attemptId,
    currentQuestionIndex: nextQuestionIndex,
    lockedQuestionIds: nextLockedQuestionIds,
    questionStatuses,
    answeredCount: counts.answeredCount,
    unansweredCount: counts.unansweredCount,
    flaggedCount: counts.flaggedCount,
    remainingSeconds: computeExamPrepRemainingSeconds(attempt["startedAt"], timeLimitSeconds),
    serverNowMs: Date.now(),
  };
});

export const submitExamPrepAttempt = onCall(async (request: CallableRequest<SubmitExamPrepAttemptPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const attemptId = String(request.data?.attemptId || "").trim();
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const attemptRef = db.doc(`organizations/${orgId}/attemptSessions/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) {
    throw new HttpsError("not-found", "Attempt not found.");
  }

  const attempt = attemptSnap.data() as Record<string, unknown>;
  if (String(attempt["learnerId"] || "") !== uid) {
    throw new HttpsError("permission-denied", "This attempt does not belong to the current learner.");
  }
  if (String(attempt["status"] || "") !== "in_progress") {
    return {
      status: String(attempt["status"] || "submitted"),
      attemptId,
      reviewId: String(attempt["reviewSnapshotPath"] || "").split("/").pop() || attemptId,
      remainingSeconds: 0,
      serverNowMs: Date.now(),
    };
  }

  const assessmentId = String(attempt["assessmentId"] || "");
  const assessmentSnap = await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get();
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Assessment definition not found.");
  }
  const assessment = {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)};
  const timeLimitSeconds = Math.max(60, Number(attempt["timeLimitSeconds"] || Number(assessment.durationMinutes || 0) * 60));
  const elapsedSeconds = Math.max(1, Number(request.data?.elapsedSeconds || 0), computeExamPrepElapsedSeconds(attempt["startedAt"]));
  const runtimeState = await readExamPrepAttemptRuntimeState({orgId, attemptId, attempt, assessment});
  if (elapsedSeconds >= timeLimitSeconds && assessment.autoSubmitOnTimeout === false) {
    return expireExamPrepAttempt({
      orgId,
      uid,
      attemptId,
      attemptRef,
      attempt,
      assessment,
      runtimeState,
      answers: normalizeExamPrepAnswerMap(request.data?.answers ?? runtimeState.answers),
      flags: normalizeBooleanMap(request.data?.flags ?? runtimeState.flags),
      questionDurations: normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations),
      elapsedSeconds,
    });
  }

  return finalizeExamPrepAttempt({
    orgId,
    uid,
    attemptId,
    attemptRef,
    attempt,
    assessment,
    runtimeState,
    answers: normalizeExamPrepAnswerMap(request.data?.answers ?? runtimeState.answers),
    flags: normalizeBooleanMap(request.data?.flags ?? runtimeState.flags),
    questionDurations: normalizeNumberMap(request.data?.questionDurations ?? runtimeState.questionDurations),
    elapsedSeconds,
    submitMode: String(request.data?.submitMode || "manual") === "timeout" ? "timeout" : "manual",
  }).then(async (result) => {
    const scorePercent = Number(result["scorePercent"] || 0);
    const passed = result["passed"] === true;
    const scoreVisible = result["scoreVisible"] === true;
    const assessmentTitle = String(assessment.title || "Exam prep assessment").trim() || "Exam prep assessment";
    const assessmentProgramId = String(assessment.programId || "").trim();
    const resultLink = assessmentProgramId ? `/my-programs/${assessmentProgramId}/exam-prep/results/${attemptId}` : null;

    await sendSystemNotificationToUser({
      uid,
      title: passed ? "Exam prep passed" : "Exam prep submitted",
      body: scoreVisible ?
        passed ?
          `You passed ${assessmentTitle} with ${scorePercent}%.` :
          `Your ${assessmentTitle} attempt was submitted with a score of ${scorePercent}%.` :
        `Your ${assessmentTitle} attempt was submitted successfully.`,
      link: resultLink,
      severity: passed ? "info" : "warning",
      category: "exam_prep",
      organizationId: orgId,
      targetRole: "learner",
    });

    return result;
  });
});

export const getExamPrepAttemptReview = onCall(async (request: CallableRequest<GetExamPrepAttemptReviewPayload>) => {
  const {uid, orgId} = await requireActiveOrgLearner(request.auth?.uid);
  const attemptId = String(request.data?.attemptId || "").trim();
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const [reviewSnap, attemptSnap] = await Promise.all([
    db.doc(`organizations/${orgId}/attemptReviewSnapshots/${attemptId}`).get(),
    db.doc(`organizations/${orgId}/attemptSessions/${attemptId}`).get(),
  ]);

  if (!reviewSnap.exists && !attemptSnap.exists) {
    throw new HttpsError("not-found", "Review snapshot not found.");
  }

  const review = reviewSnap.exists ? reviewSnap.data() as Record<string, unknown> : null;
  const attempt = attemptSnap.exists ? attemptSnap.data() as Record<string, unknown> : null;
  const ownerId = String(review?.["learnerId"] || attempt?.["learnerId"] || "");
  if (ownerId !== uid) {
    throw new HttpsError("permission-denied", "This review does not belong to the current learner.");
  }

  const assessmentId = String(review?.["assessmentId"] || attempt?.["assessmentId"] || "");
  const assemblyId = String(attempt?.["assemblyId"] || "").trim() || null;
  const reviewUnlocked = review?.["reviewUnlocked"] === true || (!review && isExamPrepTerminalStatus(attempt?.["status"]));
  const scoreVisible = review?.["scoreVisible"] === true || (!review && Number(attempt?.["scorePercent"] || 0) > 0);

  let items = reviewUnlocked && Array.isArray(review?.["items"]) ? review?.["items"] as Record<string, unknown>[] : [];
  let pointsEarned = scoreVisible ? Number(review?.["pointsEarned"] || 0) : null;
  let totalPoints = scoreVisible ? Number(review?.["totalPoints"] || 0) : null;
  let scorePercent = scoreVisible ? Number(review?.["scorePercent"] || 0) : null;
  let passed = scoreVisible ? String(review?.["passFail"] || "fail") === "pass" : null;
  let domainScores = scoreVisible ? (review?.["domainScores"] || {}) as Record<string, number> : {};
  let moduleScores = scoreVisible ? (review?.["moduleScores"] || {}) as Record<string, number> : {};
  let tagScores = scoreVisible ? (review?.["tagScores"] || {}) as Record<string, number> : {};

  if ((!items.length || !reviewSnap.exists) && attempt && assessmentId) {
    const assessmentSnap = await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get();
    const assessment = assessmentSnap.exists ? {id: assessmentSnap.id, ...(assessmentSnap.data() as ExamPrepAssessmentRecord)} : null;
    const questionIds = Array.isArray(attempt["deliveredQuestionIds"])
      ? normalizeStringArray(attempt["deliveredQuestionIds"])
      : [];
    const responseDocs = await readExamPrepResponseDocs(orgId, attemptId);

    const answers = Object.keys(responseDocs).length
      ? Object.fromEntries(Object.entries(responseDocs).map(([questionId, response]) => [questionId, normalizeStringArray(response["selectedAnswerKeys"])]))
      : normalizeExamPrepAnswerMap(attempt["answerMap"]);
    const flags = Object.keys(responseDocs).length
      ? Object.fromEntries(Object.entries(responseDocs).map(([questionId, response]) => [questionId, response["flagged"] === true]))
      : normalizeBooleanMap(attempt["flagMap"]);
    const questionDurations = Object.keys(responseDocs).length
      ? Object.fromEntries(Object.entries(responseDocs).map(([questionId, response]) => [questionId, Number(response["responseTimeSeconds"] || 0)]))
      : normalizeNumberMap(attempt["questionDurations"]);
    const visitedQuestionIds = Object.keys(responseDocs).length
      ? Object.entries(responseDocs).filter(([, response]) => response["visited"] === true).map(([questionId]) => questionId)
      : normalizeStringArray(attempt["visitedQuestionIds"]);
    const lockedQuestionIds = Object.keys(responseDocs).length
      ? Object.entries(responseDocs).filter(([, response]) => response["locked"] === true).map(([questionId]) => questionId)
      : getExamPrepLockedQuestionIds(attempt["lockedQuestionIds"]);
    const questionStatuses = Object.keys(responseDocs).length
      ? Object.fromEntries(Object.entries(responseDocs).map(([questionId, response]) => [questionId, String(response["questionStatus"] || "unanswered")]))
      : buildExamPrepQuestionStatuses(
          questionIds,
          answers,
          flags,
          visitedQuestionIds,
          lockedQuestionIds,
          assessment ? deriveExamPrepDeliveryMode(assessment) : undefined,
        );

    const questionDocs = await loadExamPrepScorableQuestionDocs({
      orgId,
      attempt,
      scorableQuestionIds: questionIds,
    });

    if (questionDocs.length) {
      const artifacts = buildExamPrepReviewArtifacts({
        questionDocs,
        answers,
        flags,
        questionDurations,
        questionStatuses,
      });
      const computedScorePercent = artifacts.totalPoints > 0
        ? Math.round((artifacts.pointsEarned / artifacts.totalPoints) * 1000) / 10
        : 0;
      const breakdown = buildExamPrepDomainScores(questionDocs, artifacts.scoreByItemId);
      items = reviewUnlocked ? artifacts.reviewItems : [];
      pointsEarned = scoreVisible ? artifacts.pointsEarned : null;
      totalPoints = scoreVisible ? artifacts.totalPoints : null;
      scorePercent = scoreVisible ? (review ? Number(review["scorePercent"] || computedScorePercent) : computedScorePercent) : null;
      passed = scoreVisible
        ? (review ? String(review["passFail"] || "fail") === "pass" : computedScorePercent >= Number(assessment?.passingScorePercent || 70))
        : null;
      domainScores = scoreVisible ? (review ? (review["domainScores"] || {}) as Record<string, number> : breakdown.domainScores) : {};
      moduleScores = scoreVisible ? (review ? (review["moduleScores"] || {}) as Record<string, number> : breakdown.moduleScores) : {};
      tagScores = scoreVisible ? (review ? (review["tagScores"] || {}) as Record<string, number> : breakdown.tagScores) : {};
    }
  }

  return {
    attemptId,
    assemblyId,
    assessmentId,
    assessmentTitle: String(review?.["assessmentTitle"] || attempt?.["assessmentTitle"] || "Exam Prep Assessment"),
    scoreVisible,
    reviewUnlocked,
    scorePercent,
    pointsEarned,
    totalPoints,
    passed,
    reviewMode: String(review?.["reviewMode"] || "summary_only"),
    showCorrectAnswers: review?.["showCorrectAnswers"] === true,
    showRationales: review?.["showRationales"] === true,
    elapsedSeconds: Number(review?.["elapsedSeconds"] || attempt?.["elapsedSeconds"] || 0),
    submissionMode: String(review?.["submissionMode"] || attempt?.["submissionMode"] || "manual"),
    answeredCount: Number(review?.["answeredCount"] || attempt?.["answeredCount"] || 0),
    unansweredCount: Number(review?.["unansweredCount"] || attempt?.["unansweredCount"] || 0),
    flaggedCount: Number(review?.["flaggedCount"] || attempt?.["flaggedCount"] || 0),
    domainScores,
    moduleScores,
    tagScores,
    items,
  };
});

export const submitMarketingLead = onCall(async (request: CallableRequest<SubmitMarketingLeadPayload>) => {
  const payload = request.data;
  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const organization = String(payload?.organization || "").trim();
  const interest = String(payload?.interest || "").trim();
  const message = String(payload?.message || "").trim();
  const source = String(payload?.source || "contact-page").trim();

  if (!name || !email || !interest || !message) {
    throw new HttpsError("invalid-argument", "Missing required lead fields.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Invalid email address.");
  }

  if (message.length < 10 || message.length > 4000) {
    throw new HttpsError("invalid-argument", "Invalid message length.");
  }

  await db.collection("marketingLeads").add({
    name,
    email,
    organization: organization || null,
    interest,
    message,
    source,
    createdAt: nowTs(),
    userAgent: String((request as {rawRequest?: {headers?: Record<string, string | undefined>}}).rawRequest?.headers?.["user-agent"] || ""),
    ip: String((request as {rawRequest?: {ip?: string}}).rawRequest?.ip || ""),
  });

  const leadAdminEmail = String(process.env.LEAD_NOTIFICATION_EMAIL || "").trim();
  if (leadAdminEmail) {
    await emitNotificationEvent({
      type: "LEAD_CAPTURED",
      templateKey: "lead_captured_admin",
      recipientType: "CUSTOM_EMAIL",
      recipientEmail: leadAdminEmail,
      relatedEntityType: "marketing_lead",
      relatedEntityId: email,
      idempotencyKey: `lead_captured:${email}:${source}`,
      templateData: {
        leadName: name,
        programInterest: interest,
        ctaUrl: `${APP_ORIGIN}/admin/leads`,
      },
    });
  }

  return {ok: true};
});

export * from "./notifications/functions";
export * from "./security/functions";
export * from "./automation/triggers";
export * from "./automation/verify";
export * from "./learner-assistant";
export * from "./ai-content";

export const chatWithAI = onCall(
  {secrets: [OPENAI_API_KEY], cors: true},
  async (request: CallableRequest<ChatPayload>) => {
    const payload = (request.data || {}) as Partial<ChatPayload>;
    const messages = payload.messages;
    const context = payload.context;

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

    await enforceChatRateLimit(request);

    const apiKey = OPENAI_API_KEY.value().trim();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "AI service is not configured. Missing OPENAI_API_KEY.",
      );
    }

    const model = String(process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();

    const userNameLine = context?.userName
      ? `The user's name is: ${context.userName}.`
      : "";
    const roleLine = context?.userRole
      ? `The user's role on the platform is: ${context.userRole}.`
      : "";
    const pageLine = context?.currentPage
      ? `The user is currently on the page: ${context.currentPage}.`
      : "";

    // Fetch active public courses to inject into the system prompt
    let programsList = "No courses currently listed.";
    try {
      const offersSnap = await db
        .collection("publicOffers")
        .where("type", "==", "course")
        .where("isActive", "==", true)
        .where("isPublic", "==", true)
        .limit(30)
        .get();
      if (!offersSnap.empty) {
        const lines = offersSnap.docs.map((d) => {
          const o = d.data() as Record<string, unknown>;
          const title = String(o["title"] || "").trim();
          const category = String(o["category"] || "").trim();
          const price = o["price"] != null
            ? `${String(o["price"])} ${String(o["currency"] || "USD")}`
            : "Contact trainer";
          const description = String(o["description"] || "").trim();
          let line = `• ${title}`;
          if (category) line += ` [${category}]`;
          line += ` — ${price}`;
          if (description) line += ` — ${description.slice(0, 120)}`;
          return line;
        });
        programsList = lines.join("\n");
      }
    } catch (fetchErr) {
      console.warn("[chatWithAI] Could not load publicOffers for context:", fetchErr);
    }

    const systemPrompt = `You are InnovacareAssist, an AI-powered assistant for the Innovacare Training platform.

# YOUR ROLE
You are:
- A learning guide
- A sales assistant
- A course recommendation engine
- A user support agent

Your goal is to help users discover courses, enroll in training, and take action quickly.

# AVAILABLE COURSES
${programsList}

Each course may include: Title, Category, Price, Description.

# CORE RULES
1. ALWAYS base your answer on the real available courses listed above.
2. NEVER assume all courses are healthcare-related.
3. If no exact match → suggest closest categories.
4. Keep answers SHORT and ACTIONABLE. Max 120 words.

# RECOMMENDATION ENGINE
If user asks "What courses are available?" or "Suggest something":
1. Show 3–5 relevant courses in this format:
   • Course Name — Short benefit
   • Course Name — Short benefit
2. End with: "You can enroll directly or contact the trainer."

# SALES BEHAVIOR
Always guide the user toward action: enroll, explore training, or contact trainer via WhatsApp.

# PAYMENT GUIDANCE
If asked about payment: "You can pay with card, pay offline, or contact the trainer directly."

# LANGUAGE
Detect user language. Reply in the same language (French or English).

# TONE
Clear, friendly, professional. No long explanations.

# OUTPUT FORMAT
Use bullet points. Avoid paragraphs longer than 3 lines.

# FALLBACK
If unclear: "I can help you find the right course. What type of training are you looking for?"

${userNameLine}
${roleLine}
${pageLine}

Act fast. Be helpful. Drive action.`;

    try {
      const openAiMessages = [
        {role: "system", content: systemPrompt},
        ...messages.map((m) => ({role: m.role, content: m.content})),
      ];

      let response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openAiMessages,
          temperature: 0.4,
          max_tokens: 1024,
        }),
      });

      if (response.status === 429) {
        await sleep(1200);
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: openAiMessages,
            temperature: 0.4,
            max_tokens: 1024,
          }),
        });
      }

      const payloadJson = await response.json() as {
        choices?: Array<{message?: {content?: string}}>;
        error?: {message?: string};
      };

      if (!response.ok) {
        const providerMessage = String(payloadJson?.error?.message || "");
        const message = providerMessage || `OpenAI request failed with status ${response.status}`;
        throw new Error(`OpenAI request failed (${response.status}): ${message}`);
      }

      const text = String(payloadJson?.choices?.[0]?.message?.content || "").trim();

      if (!text) {
        throw new HttpsError("internal", "AI provider returned an empty response.");
      }

      console.log("[chatWithAI] Model selected", {model});
      return {reply: text};
    } catch (error) {
      console.error("[chatWithAI] OpenAI request failed", {
        model,
        error,
      });

      const e = error as {status?: number; message?: string};
      const status = Number(e?.status || 0);
      const message = String(e?.message || "");

      if (status === 401 || status === 403) {
        throw new HttpsError(
          "permission-denied",
          "AI provider authentication failed. Check OPENAI_API_KEY.",
        );
      }

      if (status === 400 || status === 404 || /model/i.test(message)) {
        throw new HttpsError(
          "failed-precondition",
          "Invalid OpenAI model configuration.",
        );
      }

      if (status === 429) {
        throw new HttpsError("resource-exhausted", "AI rate limit reached. Please retry shortly.");
      }

      throw new HttpsError("internal", "AI request failed.");
    }
  },
);

/* ─────────── Callable: createWalletTopUpSession ─────────── */
type WalletTopUpPayload = {
  amountUSD: number;
  paymentMethod?: "card" | "paypal";
  successUrl: string;
  cancelUrl: string;
};

export const createWalletTopUpSession = onCall(
  {secrets: [STRIPE_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<WalletTopUpPayload>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const amountUSD = Number(request.data?.amountUSD || 0);
    const paymentMethod = String(request.data?.paymentMethod || "card");
    const successUrl = String(request.data?.successUrl || "").trim();
    const cancelUrl = String(request.data?.cancelUrl || "").trim();

    if (!Number.isFinite(amountUSD) || amountUSD < 1 || amountUSD > 10000) {
      throw new HttpsError("invalid-argument", "Amount must be between $1.00 and $10,000.00.");
    }

    if (!successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "successUrl and cancelUrl are required.");
    }

    if (!isAllowedCheckoutUrl(successUrl) || !isAllowedCheckoutUrl(cancelUrl)) {
      throw new HttpsError("invalid-argument", "Checkout redirect URLs are not allowed.");
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = (userSnap.data() || {}) as UserProfileDoc;
    if ((userData as Record<string, unknown>).status === "blocked") {
      throw new HttpsError("permission-denied", "User account is blocked.");
    }

    const email = typeof userData.email === "string" ? userData.email : undefined;

    const orderRef = db.collection(`users/${uid}/orders`).doc();
    await orderRef.set({
      id: orderRef.id,
      uid,
      itemType: "wallet_topup",
      title: `Wallet Top-up — $${amountUSD.toFixed(2)}`,
      amount: amountUSD,
      currency: "USD",
      status: "pending",
      provider: "stripe",
      paymentMethod,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    const stripe = getStripe();

    const createSessionPayload: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Innovacare Review — Wallet Credits",
            description: `Add $${amountUSD.toFixed(2)} to your Innovacare Review wallet`,
          },
          unit_amount: Math.round(amountUSD * 100),
        },
        quantity: 1,
      }],
      metadata: {
        uid,
        orderId: orderRef.id,
        itemType: "wallet_topup",
        amountUSD: String(amountUSD),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    let session: Stripe.Checkout.Session | null = null;
    try {
      session = await stripe.checkout.sessions.create(createSessionPayload);
    } catch (error: any) {
      console.error("createWalletTopUpSession stripe failure", {uid, orderId: orderRef.id, error});
      throw new HttpsError("internal", error?.message || "Unable to create checkout session.");
    }

    if (!session?.url) {
      throw new HttpsError("internal", "Unable to create checkout session.");
    }

    await orderRef.update({checkoutSessionId: session.id, updatedAt: nowTs()});
    return {url: session.url};
  },
);

/* ════════════════════════════════════════════════════════════════════
   sendDemoRequestConfirmation
   Called by the For Educators "Request a Demo" form.
   1. Validates the demo_request doc still exists.
   2. Writes a confirmation email to the `mail` collection (consumed by
      the Firebase "Trigger Email" extension if installed).
   3. Writes an admin alert to `adminNotifications` for the sales queue.
   4. Returns { success: true } – failure is non-blocking in the client.
════════════════════════════════════════════════════════════════════ */
type DemoRequestConfirmationPayload = {
  requestId: string;
};

export const sendDemoRequestConfirmation = onCall(
  {
    cors: true,
    invoker: HTTPS_PUBLIC,
  },
  async (request: CallableRequest<DemoRequestConfirmationPayload>) => {
    const requestId = String(request.data?.requestId ?? "").trim();
    if (!requestId) {
      throw new HttpsError("invalid-argument", "requestId is required.");
    }

    // -- Fetch the demo request document ---------------------------------
    const demoRef = db.doc(`demo_requests/${requestId}`);
    const demoSnap = await demoRef.get();

    if (!demoSnap.exists) {
      throw new HttpsError("not-found", "Demo request not found.");
    }

    const demo = demoSnap.data() as {
      institutionName: string;
      contactName: string;
      email: string;
      phone?: string;
      studentCount: string;
      programType: string;
      message?: string;
      status: string;
    };

    // -- Guard against duplicate sends (only process 'pending') ----------
    if (demo.status !== "pending") {
      console.info("sendDemoRequestConfirmation: already processed", requestId);
      return {success: true, skipped: true};
    }

    const SALES_EMAIL = process.env.SALES_NOTIFICATION_EMAIL || "sales@innovacare.com";
    const APP_DOMAIN = process.env.APP_DOMAIN || "https://www.innovacarereview.com";

    const batch = db.batch();

    // -- 1. Applicant confirmation email  (Firebase Trigger Email ext) ---
    const applicantMailRef = db.collection("mail").doc();
    batch.set(applicantMailRef, {
      to: [demo.email],
      message: {
        subject: "Your Demo Request — Innovacare Review",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0B1F3A">Hi ${demo.contactName},</h2>
            <p>Thank you for requesting a demo of <strong>Innovacare Review</strong>
               for <em>${demo.institutionName}</em>.</p>
            <p>One of our Education Specialists will reach out within <strong>1 business day</strong>
               to schedule your personalized 30-minute walkthrough.</p>
            <p><strong>Your submission details:</strong></p>
            <ul>
              <li>Institution: ${demo.institutionName}</li>
              <li>Program type: ${demo.programType}</li>
              <li>Estimated students: ${demo.studentCount}</li>
            </ul>
            <p style="margin-top:24px">
              <a href="${APP_DOMAIN}/for-educators"
                 style="background:#0A9DB8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
                Explore Platform Features
              </a>
            </p>
            <hr style="margin:32px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#888">
              Innovacare Training — ${APP_DOMAIN}<br/>
              You're receiving this because you submitted a demo request.
            </p>
          </div>
        `,
        text: `Hi ${demo.contactName},\n\nThank you for requesting a demo for ${demo.institutionName}. We'll be in touch within 1 business day.\n\nInnovacare Training`,
      },
      createdAt: nowTs(),
    });

    // -- 2. Internal sales-team alert email ------------------------------
    const salesMailRef = db.collection("mail").doc();
    batch.set(salesMailRef, {
      to: [SALES_EMAIL],
      message: {
        subject: `🎯 New Demo Request — ${demo.institutionName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0B1F3A">New Demo Request</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Institution</strong></td><td style="padding:6px 12px">${demo.institutionName}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Contact</strong></td><td style="padding:6px 12px">${demo.contactName}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Email</strong></td><td style="padding:6px 12px">${demo.email}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Phone</strong></td><td style="padding:6px 12px">${demo.phone || "—"}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Program type</strong></td><td style="padding:6px 12px">${demo.programType}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Students</strong></td><td style="padding:6px 12px">${demo.studentCount}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Message</strong></td><td style="padding:6px 12px">${demo.message || "—"}</td></tr>
              <tr><td style="padding:6px 12px;background:#f5f7fa"><strong>Request ID</strong></td><td style="padding:6px 12px">${requestId}</td></tr>
            </table>
          </div>
        `,
        text: `New demo request from ${demo.contactName} at ${demo.institutionName} (${demo.email}). Request ID: ${requestId}`,
      },
      createdAt: nowTs(),
    });

    // -- 3. Admin notification (in-app) ----------------------------------
    const alertRef = db.collection("adminNotifications").doc();
    batch.set(alertRef, {
      type: "demo_request",
      title: `New demo request from ${demo.institutionName}`,
      body: `${demo.contactName} (${demo.email}) — ${demo.programType} · ${demo.studentCount} students`,
      requestId,
      createdAt: nowTs(),
      read: false,
    });

    // -- 4. Mark request as 'email_sent' so we don't re-process ---------
    batch.update(demoRef, {status: "email_sent", updatedAt: nowTs()});

    await batch.commit();

    console.info("sendDemoRequestConfirmation: processed", {requestId, email: demo.email});
    return {success: true};
  },
);

/* ═══════════════════════════════════════════════════════════════
   CinetPay – Initiate program enrollment payment
   Callable by authenticated learners.
   Returns { paymentUrl, transactionId }
═══════════════════════════════════════════════════════════════ */
type CinetPayProgramCheckoutPayload = {
  enrollmentId: string;
  returnUrl: string;
};

type CinetPayInitResponse = {
  code: string;
  message: string;
  description?: string;
  data?: { payment_token?: string; payment_url?: string };
  apierror?: string | null;
};

export const createCinetPayProgramCheckoutSession = onCall(
  {secrets: [CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<CinetPayProgramCheckoutPayload>) => {
    try {
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
      }

      const enrollmentId = String(request.data?.enrollmentId || "").trim();
      const requestedReturnUrl = String(request.data?.returnUrl || "").trim();
      const fallbackReturnUrl = `${APP_ORIGIN}/checkout/success?type=program&provider=cinetpay`;
      const returnUrl = requestedReturnUrl && isAllowedCheckoutUrl(requestedReturnUrl) ?
        requestedReturnUrl : fallbackReturnUrl;

      if (!enrollmentId) {
        throw new HttpsError("invalid-argument", "enrollmentId is required.");
      }
      if (requestedReturnUrl && !isAllowedCheckoutUrl(requestedReturnUrl)) {
        console.warn("createCinetPayProgramCheckoutSession disallowed returnUrl, fallback applied", {
          uid,
          requestedReturnUrl,
          fallbackReturnUrl,
        });
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
        console.warn("createCinetPayProgramCheckoutSession enrollment ownership mismatch", {
          uid,
          enrollmentId,
          enrollmentUserId: enrollment.userId || null,
        });
        throw new HttpsError("permission-denied", "This enrollment does not belong to you.");
      }
      if (enrollment.paymentStatus === "paid") {
        console.warn("createCinetPayProgramCheckoutSession enrollment already paid", {uid, enrollmentId});
        throw new HttpsError("already-exists", "Enrollment is already paid.");
      }

      /* ── Read program ── */
      const programId = String(enrollment.programId || "").trim();
      if (!programId) {
        console.warn("createCinetPayProgramCheckoutSession missing programId", {uid, enrollmentId});
        throw new HttpsError("failed-precondition", "Enrollment has no programId.");
      }
      const programSnap = await db.doc(`programs/${programId}`).get();
      if (!programSnap.exists) {
        console.warn("createCinetPayProgramCheckoutSession program not found", {uid, enrollmentId, programId});
        throw new HttpsError("not-found", "Program not found.");
      }
      const program = programSnap.data() as {
        title?: string;
        subtitle?: string;
        price?: number;
        discountPrice?: number | null;
        currency?: string;
        orgId?: string;
      };

      const price = Number(enrollment.amount || program.discountPrice || program.price || 0);
      const currency = String(enrollment.currency || program.currency || "USD").toUpperCase();

      if (!Number.isFinite(price) || price <= 0) {
        console.warn("createCinetPayProgramCheckoutSession invalid program price", {
          uid,
          enrollmentId,
          programId,
          enrollmentAmount: enrollment.amount ?? null,
          programPrice: program.price ?? null,
          programDiscountPrice: program.discountPrice ?? null,
        });
        throw new HttpsError("failed-precondition", "Invalid program price.");
      }

      // CinetPay must receive the account currency (this account is XAF unless overridden).
      const accountCurrency = String(CINETPAY_ACCOUNT_CURRENCY_PARAM.value() || "XAF").trim().toUpperCase();
      const usdToAccountRateRaw = String(CINETPAY_USD_TO_ACCOUNT_RATE_PARAM.value() || "655").trim();
      const usdToAccountRate = Number(usdToAccountRateRaw);
      const useUsdConversion =
        currency === "USD" && accountCurrency !== "USD" && Number.isFinite(usdToAccountRate) && usdToAccountRate > 0;
      const cinetPayCurrency = useUsdConversion ? accountCurrency : currency;
      const rawCinetPayAmount = Math.round(useUsdConversion ? price * usdToAccountRate : price);
      const cinetPayAmount =
        cinetPayCurrency === "USD" ? rawCinetPayAmount : Math.ceil(rawCinetPayAmount / 5) * 5;
      if (!useUsdConversion && currency !== accountCurrency) {
        throw new HttpsError(
          "failed-precondition",
          `Unsupported currency for CinetPay account. Expected ${accountCurrency}, got ${currency}.`,
        );
      }
      if (!Number.isFinite(cinetPayAmount) || cinetPayAmount <= 0) {
        throw new HttpsError("failed-precondition", "Invalid CinetPay amount.");
      }

      /* ── User info ── */
      const userSnap = await db.doc(`users/${uid}`).get();
      const userData = (userSnap.data() || {}) as UserProfileDoc;
      const email = typeof userData.email === "string" ? userData.email : "client@innovacarereview.com";
      const orgId = String(userData.orgId || program.orgId || "").trim() || null;

      /* ── Build transaction ID ── */
      const transactionId = `cp${nanoid(22)}`.replace(/[^A-Za-z0-9]/g, "x").slice(0, 50);

      /* ── Build notify URL ── */
      const notifyUrl =
        "https://us-central1-innovacare-stripe.cloudfunctions.net/cinetPayNotify";

      /* ── Create order in Firestore ── */
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
        currency,
        enrollmentId,
        status: "pending",
        provider: "cinetpay",
        cinetPayTransactionId: transactionId,
        cinetPayAmount,
        cinetPayCurrency,
        cinetPayFxRate: useUsdConversion ? usdToAccountRate : null,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      });

      /* ── Update enrollment as pending ── */
      await enrollmentRef.update({
        cinetPayTransactionId: transactionId,
        cinetPayOrderId: orderRef.id,
        paymentStatus: "pending",
        paymentProvider: "cinetpay",
        updatedAt: nowTs(),
      });

      /* ── Call CinetPay payment init API ── */
      console.info("createCinetPayProgramCheckoutSession currency debug", {
        currency,
        accountCurrency,
        usdToAccountRate,
        useUsdConversion,
        cinetPayAmount,
        cinetPayCurrency,
      });
      const apiKey = String(CINETPAY_API_KEY.value() || "").trim();
      const siteId = CINETPAY_SITE_ID.value();

      const accountCountry = String(CINETPAY_ACCOUNT_COUNTRY_PARAM.value() || "CM").trim().toUpperCase();
      const customerPhone =
        String((userData as Record<string, unknown>)["phone"] || "").trim() || "+237670000000";
      const safeDescription = String(program.title || "Program enrollment")
        .replace(/[#$/_&]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      const cancelUrl = `${APP_ORIGIN}/checkout/cancel?type=program&provider=cinetpay`;

      const cinetPayBody: Record<string, unknown> = {
        apikey: apiKey,
        site_id: String(siteId).trim(),
        transaction_id: transactionId,
        customer_id: uid,
        amount: cinetPayAmount,
        currency: cinetPayCurrency,
        description: safeDescription,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        customer_email: email,
        customer_name: String((userData as Record<string, unknown>)["firstName"] || "").trim() || "Client",
        customer_surname: String((userData as Record<string, unknown>)["lastName"] || "").trim() || "InnovaCaré",
        customer_phone_number: customerPhone,
        customer_address: "Abidjan",
        customer_city: "Douala",
        customer_country: accountCountry,
        customer_state: accountCountry,
        customer_zip_code: "00000",
        channels: "ALL",
        lang: "fr",
        metadata: orderRef.id,
      };

      console.info("createCinetPayProgramCheckoutSession request payload", {
        uid,
        transactionId,
        site_id: String(siteId).trim(),
        amount: cinetPayAmount,
        currency: cinetPayCurrency,
        customer_country: accountCountry,
        customer_phone_number: customerPhone,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        description: safeDescription,
      });

      let cinetPayResponse: CinetPayInitResponse;
      let cinetPayHttpStatus = 0;

      try {
        const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
          method: "POST",
          headers: {"Content-Type": "application/json", "Accept": "application/json"},
          body: JSON.stringify(cinetPayBody),
        });
        cinetPayHttpStatus = res.status;
        const rawText = await res.text();
        try {
          cinetPayResponse = JSON.parse(rawText) as CinetPayInitResponse;
        } catch {
          console.error("createCinetPayProgramCheckoutSession JSON parse error", {uid, transactionId, httpStatus: cinetPayHttpStatus, rawText});
          throw new HttpsError("unavailable", "CinetPay returned an invalid response.");
        }
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.error("createCinetPayProgramCheckoutSession fetch error", {uid, transactionId, err});
        throw new HttpsError("unavailable", "CinetPay is temporarily unavailable. Please try again.");
      }

      const paymentUrl = String(cinetPayResponse?.data?.payment_url || "").trim();

      if (!paymentUrl) {
        console.error("createCinetPayProgramCheckoutSession no payment_url", {
          uid,
          transactionId,
          httpStatus: cinetPayHttpStatus,
          code: cinetPayResponse?.code,
          message: cinetPayResponse?.message,
          description: cinetPayResponse?.description,
          apierror: cinetPayResponse?.apierror,
          fullResponse: cinetPayResponse,
          amount: cinetPayAmount,
          currency: cinetPayCurrency,
        });
        throw new HttpsError(
          "failed-precondition",
          cinetPayResponse?.message || "CinetPay did not return a payment URL.",
        );
      }

      await orderRef.update({cinetPayPaymentUrl: paymentUrl, updatedAt: nowTs()});

      console.info("createCinetPayProgramCheckoutSession success", {
        uid,
        enrollmentId,
        transactionId,
        amount: cinetPayAmount,
        currency: cinetPayCurrency,
      });

      return {paymentUrl, transactionId};
    } catch (error) {
      const uid = request.auth?.uid || null;
      const enrollmentId = String(request.data?.enrollmentId || "").trim() || null;
      if (error instanceof HttpsError) {
        console.error("createCinetPayProgramCheckoutSession HttpsError", {
          uid,
          enrollmentId,
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.error("createCinetPayProgramCheckoutSession unexpected error", {uid, enrollmentId, error});
      throw new HttpsError("internal", "Unable to initialize CinetPay checkout.");
    }
  },
);


/* ═══════════════════════════════════════════════════════════════
   CinetPay – Payment notification webhook
   Called by CinetPay when a payment is confirmed or fails.
   Verifies the payment and updates Firestore.
═══════════════════════════════════════════════════════════════ */
type CinetPayCheckResponse = {
  code: string;
  message: string;
  data?: {
    amount?: number;
    currency?: string;
    status?: string;
    payment_method?: string;
    description?: string;
    operator_id?: string | null;
    payment_date?: string;
    metadata?: string | null;
  };
  apierror?: string | null;
};

export const cinetPayNotify = onRequest(
  {secrets: [CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY], invoker: HTTPS_PUBLIC},
  async (req, res) => {
    /* CinetPay sends the transaction ID via POST body or query param */
    const body = (req.body || {}) as Record<string, unknown>;
    const query = (req.query || {}) as Record<string, unknown>;

    const transactionId = String(
      body["cpm_trans_id"] || query["cpm_trans_id"] || "",
    ).trim();

    if (!transactionId) {
      console.warn("cinetPayNotify: missing cpm_trans_id");
      res.status(200).send("OK");
      return;
    }

    const apiKey = CINETPAY_API_KEY.value();
    const siteId = CINETPAY_SITE_ID.value();

    /* ── Verify payment with CinetPay check API ── */
    let checkResponse: CinetPayCheckResponse;
    try {
      const checkRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: JSON.stringify({apikey: apiKey, site_id: siteId, transaction_id: transactionId}),
      });
      checkResponse = await checkRes.json() as CinetPayCheckResponse;
    } catch (err) {
      console.error("cinetPayNotify: check API error", {transactionId, err});
      res.status(200).send("OK");
      return;
    }

    const paymentStatus = String(checkResponse?.data?.status || "").toUpperCase();
    const isSuccess = checkResponse?.code === "00" && paymentStatus === "ACCEPTED";

    console.info("cinetPayNotify: check result", {transactionId, code: checkResponse?.code, status: paymentStatus});

    /* ── Idempotency: find matching order by transactionId ── */
    const ordersQuery = await db
      .collectionGroup("orders")
      .where("cinetPayTransactionId", "==", transactionId)
      .limit(1)
      .get();

    if (ordersQuery.empty) {
      console.warn("cinetPayNotify: no order found for transaction", {transactionId});
      res.status(200).send("OK");
      return;
    }

    const orderDoc = ordersQuery.docs[0];
    const order = orderDoc.data() as Record<string, unknown>;

    /* Skip if already processed */
    if (String(order["status"] || "") === "paid") {
      res.status(200).send("OK");
      return;
    }

    const newOrderStatus = isSuccess ? "paid" : "failed";
    const batch = db.batch();

    batch.update(orderDoc.ref, {
      status: newOrderStatus,
      cinetPayCheckStatus: paymentStatus,
      cinetPayPaymentMethod: String(checkResponse?.data?.payment_method || ""),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* ── Update enrollment if payment succeeded ── */
    if (isSuccess) {
      const enrollmentId = String(order["enrollmentId"] || "").trim();
      if (enrollmentId) {
        const enrollmentRef = db.doc(`programEnrollments/${enrollmentId}`);
        batch.update(enrollmentRef, {
          paymentStatus: "paid",
          paymentProvider: "cinetpay",
          paymentId: orderDoc.id,
          cinetPayTransactionId: transactionId,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    console.info("cinetPayNotify: processed", {transactionId, newOrderStatus});

    /* ── Emit notification events on success ── */
    if (isSuccess) {
      const orderId = orderDoc.id;
      const orderUid = String(order["uid"] || "").trim();
      const programId = String(order["itemId"] || "").trim();
      const programTitle = String(order["title"] || "Program").trim();
      const orderOrgId = String(order["orgId"] || "").trim() || null;

      if (orderUid && programId) {
        try {
          await emitNotificationEvent({
            type: "PURCHASE_CONFIRMATION",
            templateKey: "purchase_confirmation",
            recipientType: "LEARNER",
            recipientUserId: orderUid,
            orgId: orderOrgId,
            courseId: programId,
            relatedEntityType: "payment",
            relatedEntityId: orderId,
            idempotencyKey: `purchase_confirmation:${orderId}`,
            templateData: {
              learnerName: "Learner",
              courseTitle: programTitle,
              ctaUrl: `${APP_ORIGIN}/my-programs/${programId}`,
            },
          });

          await emitNotificationEvent({
            type: "COURSE_ACCESS_GRANTED",
            templateKey: "course_access_granted",
            recipientType: "LEARNER",
            recipientUserId: orderUid,
            orgId: orderOrgId,
            courseId: programId,
            relatedEntityType: "enrollment",
            relatedEntityId: programId,
            idempotencyKey: `course_access_granted:${orderId}`,
            templateData: {
              learnerName: "Learner",
              courseTitle: programTitle,
              ctaUrl: `${APP_ORIGIN}/my-programs/${programId}`,
            },
          });

          console.info("cinetPayNotify: notification events emitted", {transactionId, orderId, orderUid, programId});
        } catch (notifErr) {
          console.error("cinetPayNotify: notification emission error (non-blocking)", {transactionId, orderId, notifErr});
        }
      }
    }

    res.status(200).send("OK");
  },
);

/* ─────────── Program Duplication / Clone Engine (Lot 11) ─────────── */

interface CloneProgramPayload {
  sourceProgramId: string;
  destinationOrgId?: string | null;
  newTitle?: string;
  newSlug?: string;
  market?: string | null;
  jurisdiction?: string | null;
  language?: string | null;
  cloneLabel?: string | null;
  includeModules?: boolean;
  includeLessons?: boolean;
  includeDocuments?: boolean;
  includeAssessments?: boolean;
  includeCaseStudies?: boolean;
  includeSimulations?: boolean;
  includeLiveSessions?: boolean;
  includeOffers?: boolean;
  includePricing?: boolean;
  includeCertificateTemplate?: boolean;
  publishImmediately?: boolean;
}

const PROGRAM_CLONE_SUBCOLLECTIONS = [
  "modules",
  "lessons",
  "documents",
  "assessments",
  "caseStudies",
  "simulations",
  "liveSessions",
] as const;

function slugifyForClone(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function rewireIds(
  data: Record<string, unknown>,
  idMap: Map<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" && idMap.has(v)) {
      out[k] = idMap.get(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === "string" && idMap.has(item) ? idMap.get(item) : item,
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function cloneSubcollection(
  sourceProgramId: string,
  destProgramId: string,
  sub: string,
  destOrgId: string | null,
  idMap: Map<string, string>,
): Promise<number> {
  const srcCol = db.collection(`programs/${sourceProgramId}/${sub}`);
  const snap = await srcCol.get();
  if (snap.empty) return 0;

  // First pass: assign new IDs.
  const docs = snap.docs.map((d) => {
    const newId = db.collection("_ids").doc().id;
    idMap.set(d.id, newId);
    return {oldId: d.id, newId, raw: d.data() as Record<string, unknown>};
  });

  // Second pass: rewire references then write in chunks of 450.
  let written = 0;
  for (let i = 0; i < docs.length; i += 450) {
    const chunk = docs.slice(i, i + 450);
    const batch = db.batch();
    for (const item of chunk) {
      const cleaned = rewireIds(item.raw, idMap);
      cleaned["id"] = item.newId;
      cleaned["programId"] = destProgramId;
      if (destOrgId) cleaned["orgId"] = destOrgId;
      cleaned["clonedFromId"] = item.oldId;
      cleaned["clonedFromProgramId"] = sourceProgramId;
      cleaned["createdAt"] = admin.firestore.FieldValue.serverTimestamp();
      cleaned["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();
      const ref = db.doc(`programs/${destProgramId}/${sub}/${item.newId}`);
      batch.set(ref, cleaned);
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

export const cloneProgram = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<CloneProgramPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const callerCtx = await getUserContext(callerUid);
    if (!callerCtx.active) {
      throw new HttpsError("permission-denied", "Caller account is inactive.");
    }
    const allowedRoles = ["manager", "admin", "super_admin"];
    if (!allowedRoles.includes(callerCtx.role)) {
      throw new HttpsError("permission-denied", "You are not allowed to clone programs.");
    }

    const data = request.data || ({} as CloneProgramPayload);
    const sourceProgramId = String(data.sourceProgramId || "").trim();
    if (!sourceProgramId) {
      throw new HttpsError("invalid-argument", "sourceProgramId is required.");
    }

    const sourceSnap = await db.doc(`programs/${sourceProgramId}`).get();
    if (!sourceSnap.exists) {
      throw new HttpsError("not-found", "Source program not found.");
    }
    const sourceProgram = sourceSnap.data() as Record<string, unknown>;
    const sourceOrgId = (sourceProgram["orgId"] as string | null) || null;

    // Determine destination org with permission check.
    const requestedDestOrgId = data.destinationOrgId ? String(data.destinationOrgId).trim() : null;
    let destOrgId: string | null = requestedDestOrgId || sourceOrgId || callerCtx.orgId || null;

    if (callerCtx.role !== "super_admin") {
      // Non super-admin must clone within their own org.
      if (!callerCtx.orgId) {
        throw new HttpsError("permission-denied", "No organization attached to caller.");
      }
      if (sourceOrgId && sourceOrgId !== callerCtx.orgId) {
        throw new HttpsError("permission-denied", "Cannot clone programs from another organization.");
      }
      if (destOrgId && destOrgId !== callerCtx.orgId) {
        throw new HttpsError("permission-denied", "Cannot clone into another organization.");
      }
      destOrgId = callerCtx.orgId;
    }

    if (destOrgId) {
      const orgSnap = await db.doc(`organizations/${destOrgId}`).get();
      if (!orgSnap.exists) {
        throw new HttpsError("failed-precondition", "Destination organization does not exist.");
      }
      if (orgSnap.get("active") === false) {
        throw new HttpsError("permission-denied", "Destination organization is inactive.");
      }
    }

    const cloneBatchId = db.collection("_ids").doc().id;
    const newProgramId = db.collection("_ids").doc().id;
    const idMap = new Map<string, string>();
    idMap.set(sourceProgramId, newProgramId);

    const newTitle = String(data.newTitle || "").trim() || `${String(sourceProgram["title"] || "Program")} (Copy)`;
    const newSlug = String(data.newSlug || "").trim() || slugifyForClone(`${newTitle}-${cloneBatchId.slice(0, 6)}`);
    const market = data.market ? String(data.market).trim() : null;
    const jurisdiction = data.jurisdiction ? String(data.jurisdiction).trim() : null;
    const language = data.language ? String(data.language).trim() : null;
    const cloneLabel = data.cloneLabel ? String(data.cloneLabel).trim() : null;
    const publishImmediately = callerCtx.role === "super_admin" && Boolean(data.publishImmediately);

    // Build cloned program doc — never carry forward learners/payments/issued cert state.
    const STRIP_KEYS = new Set([
      "id",
      "createdAt",
      "updatedAt",
      "seatsRemaining",
      "stripeAccountId",
    ]);
    const clonedProgram: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sourceProgram)) {
      if (STRIP_KEYS.has(k)) continue;
      clonedProgram[k] = v;
    }

    if (data.includePricing === false) {
      clonedProgram["price"] = 0;
      clonedProgram["discountPrice"] = null;
      clonedProgram["payoutMode"] = null;
      clonedProgram["platformFeePercent"] = null;
      clonedProgram["partnerSharePercent"] = null;
    }
    if (data.includeOffers === false) {
      clonedProgram["isFeatured"] = false;
    }
    if (data.includeCertificateTemplate === false) {
      clonedProgram["certificateTemplateId"] = null;
    }

    clonedProgram["id"] = newProgramId;
    clonedProgram["title"] = newTitle;
    clonedProgram["slug"] = newSlug;
    clonedProgram["orgId"] = destOrgId;
    clonedProgram["ownerId"] = callerUid;
    clonedProgram["status"] = publishImmediately ? "PUBLISHED" : "DRAFT";
    clonedProgram["active"] = publishImmediately;
    clonedProgram["clonedFromProgramId"] = sourceProgramId;
    clonedProgram["clonedFromOrgId"] = sourceOrgId;
    clonedProgram["cloneBatchId"] = cloneBatchId;
    clonedProgram["cloneLabel"] = cloneLabel;
    clonedProgram["market"] = market;
    clonedProgram["jurisdiction"] = jurisdiction;
    clonedProgram["language"] = language;
    clonedProgram["createdBy"] = callerUid;
    clonedProgram["createdAt"] = admin.firestore.FieldValue.serverTimestamp();
    clonedProgram["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();

    // Rewrite arrays of ids on the program doc using the (yet-to-be-built) idMap;
    // we'll write the program doc AFTER subcollections so id mapping is complete.

    // Decide which subcollections to clone.
    const includeMap: Record<string, boolean> = {
      modules: data.includeModules !== false,
      lessons: data.includeLessons !== false,
      documents: data.includeDocuments !== false,
      assessments: data.includeAssessments !== false,
      caseStudies: data.includeCaseStudies !== false,
      simulations: data.includeSimulations !== false,
      liveSessions: data.includeLiveSessions !== false,
    };

    const counts: Record<string, number> = {};
    try {
      for (const sub of PROGRAM_CLONE_SUBCOLLECTIONS) {
        if (!includeMap[sub]) {
          counts[sub] = 0;
          continue;
        }
        counts[sub] = await cloneSubcollection(sourceProgramId, newProgramId, sub, destOrgId, idMap);
      }

      // Now rewire program-level id arrays/refs (moduleIds, linkedCourseIds…).
      const rewiredProgram = rewireIds(clonedProgram, idMap);
      // Preserve our overridden fields after rewireIds.
      rewiredProgram["id"] = newProgramId;
      rewiredProgram["clonedFromProgramId"] = sourceProgramId;
      rewiredProgram["cloneBatchId"] = cloneBatchId;

      await db.doc(`programs/${newProgramId}`).set(rewiredProgram);

      // Audit log.
      await db.collection("auditLogs").add({
        action: "PROGRAM_CLONED",
        actorUid: callerUid,
        actorRole: callerCtx.role,
        actorOrgId: callerCtx.orgId || null,
        sourceProgramId,
        sourceOrgId,
        destinationProgramId: newProgramId,
        destinationOrgId: destOrgId,
        cloneBatchId,
        cloneLabel,
        market,
        jurisdiction,
        language,
        counts,
        publishImmediately,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        newProgramId,
        cloneBatchId,
        destinationOrgId: destOrgId,
        counts,
      };
    } catch (err) {
      // Best-effort cleanup of partial subcollection writes; the program doc was
      // not yet created so no public exposure.
      console.error("cloneProgram: failure, attempting cleanup", {sourceProgramId, newProgramId, err});
      try {
        for (const sub of PROGRAM_CLONE_SUBCOLLECTIONS) {
          const subRef = db.collection(`programs/${newProgramId}/${sub}`);
          const subSnap = await subRef.get();
          if (subSnap.empty) continue;
          for (let i = 0; i < subSnap.docs.length; i += 450) {
            const chunk = subSnap.docs.slice(i, i + 450);
            const batch = db.batch();
            chunk.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (cleanupErr) {
        console.error("cloneProgram: cleanup also failed", {newProgramId, cleanupErr});
      }
      const message = err instanceof Error ? err.message : "Clone failed.";
      throw new HttpsError("internal", message);
    }
  },
);

// =====================================================================
// programAdminInviteLearner — create or attach learner + enrollment
// =====================================================================

interface InviteLearnerPayload {
  programId: string;
  email: string;
  displayName?: string;
  password?: string; // if absent, a random one is generated
  phone?: string;
  status?: "active" | "inactive";
  enrollmentStatus?: "PENDING_REVIEW" | "ACTIVE";
  paymentStatus?: "UNPAID" | "PAID" | "WAIVED";
  reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
  amount?: number;
  currency?: string;
  notes?: string;
}

interface InviteLearnerResult {
  ok: boolean;
  uid: string;
  email: string;
  enrollmentId: string;
  created: boolean;
}

function generateTempPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return out;
}

export const programAdminInviteLearner = onCall(
  {invoker: HTTPS_PUBLIC},
  async (request: CallableRequest<InviteLearnerPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const callerCtx = await getUserContext(callerUid);
    if (!["manager", "admin", "super_admin"].includes(callerCtx.role)) {
      throw new HttpsError("permission-denied", "Only manager/admin can invite learners.");
    }
    if (!callerCtx.active) {
      throw new HttpsError("permission-denied", "Caller account is inactive.");
    }

    const data = request.data || ({} as InviteLearnerPayload);
    const programId = String(data.programId || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const displayName = String(data.displayName || "").trim();
    if (!programId) throw new HttpsError("invalid-argument", "programId is required.");
    if (!email || !email.includes("@")) throw new HttpsError("invalid-argument", "A valid email is required.");

    const programSnap = await db.doc(`programs/${programId}`).get();
    if (!programSnap.exists) {
      throw new HttpsError("not-found", "Program not found.");
    }
    const programData = programSnap.data() || {};
    const programOrgId = String(programData.orgId || "").trim() || null;

    if (callerCtx.role !== "super_admin") {
      if (!callerCtx.orgId) {
        throw new HttpsError("failed-precondition", "Caller has no organization.");
      }
      if (programOrgId && programOrgId !== callerCtx.orgId) {
        throw new HttpsError("permission-denied", "You cannot invite into a program of another organization.");
      }
    }

    const orgId = programOrgId || callerCtx.orgId || null;

    // Resolve or create the user.
    let uid = "";
    let created = false;
    try {
      const existing = await admin.auth().getUserByEmail(email);
      uid = existing.uid;
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        const password = String(data.password || "") || generateTempPassword();
        const newUser = await admin.auth().createUser({
          email,
          password,
          displayName: displayName || undefined,
          disabled: data.status === "inactive",
        });
        uid = newUser.uid;
        created = true;

        const userPayload = {
          uid: newUser.uid,
          email,
          displayName,
          phone: String(data.phone || "").trim(),
          role: "learner",
          status: data.status || "active",
          orgId,
          loginType: "organization",
          active: data.status !== "inactive",
          createdAt: nowTs(),
          updatedAt: nowTs(),
          createdBy: callerUid,
          createdVia: "programAdminInviteLearner",
        };
        const batch = db.batch();
        batch.set(db.doc(`users/${newUser.uid}`), userPayload, {merge: true});
        if (orgId) {
          batch.set(db.doc(`organizations/${orgId}/users/${newUser.uid}`), userPayload, {merge: true});
          batch.set(db.doc(`organizations/${orgId}/orgUsers/${newUser.uid}`), userPayload, {merge: true});
        }
        await batch.commit();
      } else {
        throw new HttpsError("internal", err?.message || "Failed to resolve user.");
      }
    }

    // Avoid duplicate enrollments for same (uid, programId).
    const existingEnrollSnap = await db
      .collection("programEnrollments")
      .where("learnerUid", "==", uid)
      .where("programId", "==", programId)
      .limit(1)
      .get();

    if (!existingEnrollSnap.empty) {
      return {
        ok: true,
        uid,
        email,
        enrollmentId: existingEnrollSnap.docs[0].id,
        created,
      } satisfies InviteLearnerResult;
    }

    const enrollmentRef = db.collection("programEnrollments").doc();
    const enrollmentDoc = {
      id: enrollmentRef.id,
      programId,
      programTitle: String(programData.title || ""),
      category: programData.category || null,
      orgId,
      learnerUid: uid,
      learnerEmail: email,
      learnerName: displayName,
      amount: typeof data.amount === "number" ? data.amount : (programData.discountPrice ?? programData.price ?? 0),
      currency: data.currency || programData.currency || "USD",
      paymentStatus: data.paymentStatus || "WAIVED",
      reviewStatus: data.reviewStatus || "APPROVED",
      status: data.enrollmentStatus || "ACTIVE",
      notes: data.notes || "",
      createdAt: nowTs(),
      updatedAt: nowTs(),
      createdBy: callerUid,
      createdVia: "programAdminInviteLearner",
    };
    await enrollmentRef.set(enrollmentDoc);

    // Audit log
    try {
      await db.collection("auditLogs").add({
        action: "PROGRAM_LEARNER_INVITED",
        actorUid: callerUid,
        targetUid: uid,
        programId,
        orgId,
        enrollmentId: enrollmentRef.id,
        emailCreated: created,
        createdAt: nowTs(),
      });
    } catch (e) {
      console.warn("auditLogs write failed (non-fatal)", e);
    }

    return {
      ok: true,
      uid,
      email,
      enrollmentId: enrollmentRef.id,
      created,
    } satisfies InviteLearnerResult;
  }
);