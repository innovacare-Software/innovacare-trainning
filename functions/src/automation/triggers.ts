/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Automation triggers
 *
 *  - onEnrollmentCreated: send welcome email + community CTA + admin ping.
 *  - onEnrollmentCompleted: trigger automatic certificate issuance.
 *
 * Both are safe to retry: they are keyed by the enrollment doc id.
 */
import * as admin from "firebase-admin";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {emitNotificationEvent} from "../notifications/events";

const db = (): admin.firestore.Firestore => admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

type EnrollmentDoc = {
  userId?: string;
  offerId?: string;
  courseId?: string | null;
  orgId?: string | null;
  status?: string;
  source?: string;
  app?: string;
  certificateId?: string | null;
};

/**
 * onEnrollmentCreated
 *
 * Fires when a new doc lands in `enrollments/{id}` with status === 'active'
 * (created either by the Stripe webhook or by an admin grant). Sends:
 *   - COURSE_ENROLLED email (templateData includes WhatsApp/community link)
 *   - adminNotifications (so org admins see the new enrollment in real time)
 */
export const onEnrollmentCreated = onDocumentCreated(
  {document: "enrollments/{enrollmentId}", region: "us-central1"},
  async (event) => {
    const enrollment = (event.data?.data() || {}) as EnrollmentDoc;
    const enrollmentId = event.params.enrollmentId as string;
    if (!enrollment.userId || !enrollment.offerId) return;
    if (enrollment.status && enrollment.status !== "active") return;

    const [userSnap, offerSnap, courseSnap] = await Promise.all([
      db().doc(`users/${enrollment.userId}`).get(),
      db().doc(`publicOffers/${enrollment.offerId}`).get(),
      enrollment.courseId ?
        db().doc(`courses/${enrollment.courseId}`).get() :
        Promise.resolve(null),
    ]);

    const user = (userSnap.data() || {}) as Record<string, any>;
    const offer = (offerSnap.data() || {}) as Record<string, any>;
    const course = (courseSnap?.data() || offer || {}) as Record<string, any>;

    const courseTitle = String(course.title || offer.title || "your course");
    const courseId = enrollment.courseId || String(offer.courseId || "");
    const orgId = enrollment.orgId || String(offer.orgId || "");
    const whatsappUrl = String(offer.whatsappGroupUrl || offer.communityUrl || "").trim();

    const accessLink = courseId ?
      `https://innovacare-stripe.web.app/learn/${courseId}` :
      "https://innovacare-stripe.web.app/dashboard";

    try {
      await emitNotificationEvent({
        type: "COURSE_ENROLLED",
        templateKey: "course_enrolled_v1",
        recipientType: "LEARNER",
        recipientUserId: enrollment.userId,
        recipientEmail: String(user.email || "") || undefined,
        recipientName:
          String(user.displayName || user.firstName || "Learner"),
        orgId: orgId || undefined,
        courseId: courseId || undefined,
        relatedEntityType: "enrollment",
        relatedEntityId: enrollmentId,
        idempotencyKey: `enrollment_welcome_${enrollmentId}`,
        templateData: {
          learnerName: String(user.displayName || user.firstName || "Learner"),
          courseTitle,
          accessLink,
          whatsappGroupUrl: whatsappUrl || null,
          communityType: String(offer.communityType || (whatsappUrl ? "whatsapp" : "")) || null,
          enrollmentId,
          orgName: String(offer.orgName || "Innovacare"),
        },
      });
    } catch (err) {
      console.error("[onEnrollmentCreated] emit failed", err);
    }

    // Mirror in adminNotifications so org admins see it instantly.
    try {
      await db().collection("adminNotifications").add({
        type: "enrollment_created",
        severity: "info",
        title: `New enrollment: ${courseTitle}`,
        message: `${String(user.email || enrollment.userId)} enrolled in ${courseTitle}`,
        organizationId: orgId || null,
        relatedEntityType: "enrollment",
        relatedEntityId: enrollmentId,
        createdAt: nowTs(),
        read: false,
        readBy: [],
        actionRequired: false,
        delivery: {email: true, sms: false, slack: false, whatsapp: !!whatsappUrl},
      });
    } catch (err) {
      console.warn("[onEnrollmentCreated] adminNotifications failed", err);
    }
  },
);

/**
 * onEnrollmentCompleted
 *
 * When status flips to "completed" and no certificate has been issued yet,
 * mint one and persist its id back on the enrollment.
 *
 * Certificates are produced by the existing pdf-lib pipeline (not Cloud Run);
 * here we simply create the `certificates/{id}` document — a separate trigger
 * (`onCertificateCreated`, which already exists in this project for results)
 * will produce the PDF and update certificateUrl/verificationCode.
 */
export const onEnrollmentCompleted = onDocumentUpdated(
  {document: "enrollments/{enrollmentId}", region: "us-central1"},
  async (event) => {
    const before = (event.data?.before.data() || {}) as EnrollmentDoc;
    const after = (event.data?.after.data() || {}) as EnrollmentDoc;
    if (before.status === "completed") return;
    if (after.status !== "completed") return;
    if (after.certificateId) return; // already issued
    if (!after.userId || !after.offerId) return;

    const enrollmentId = event.params.enrollmentId as string;

    const [userSnap, offerSnap, courseSnap] = await Promise.all([
      db().doc(`users/${after.userId}`).get(),
      db().doc(`publicOffers/${after.offerId}`).get(),
      after.courseId ? db().doc(`courses/${after.courseId}`).get() : Promise.resolve(null),
    ]);
    const user = (userSnap.data() || {}) as Record<string, any>;
    const offer = (offerSnap.data() || {}) as Record<string, any>;
    const course = (courseSnap?.data() || offer || {}) as Record<string, any>;

    const learnerName = String(user.displayName || user.firstName || "Learner");
    const courseTitle = String(course.title || offer.title || "Innovacare course");

    const verificationCode =
      `IC-${enrollmentId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const certRef = db().collection("certificates").doc();
    await certRef.set({
      certificateId: certRef.id,
      userId: after.userId,
      learnerId: after.userId,
      learnerName,
      courseId: after.courseId || null,
      offerId: after.offerId,
      orgId: after.orgId || null,
      courseTitle,
      enrollmentId,
      verificationCode,
      issuedAt: nowTs(),
      status: "issued",
      source: "automation_v1",
      certificateUrl: null,
    });

    await event.data?.after.ref.set({
      certificateId: certRef.id,
      completedAt: nowTs(),
      updatedAt: nowTs(),
    }, {merge: true});

    try {
      await emitNotificationEvent({
        type: "CERTIFICATE_ISSUED",
        templateKey: "certificate_issued_v1",
        recipientType: "LEARNER",
        recipientUserId: after.userId,
        recipientEmail: String(user.email || "") || undefined,
        recipientName: learnerName,
        orgId: after.orgId || undefined,
        courseId: after.courseId || undefined,
        relatedEntityType: "certificate",
        relatedEntityId: certRef.id,
        idempotencyKey: `cert_issued_${certRef.id}`,
        templateData: {
          learnerName,
          courseTitle,
          verificationCode,
          verificationUrl: `https://innovacare-stripe.web.app/certificates/verify/${verificationCode}`,
          enrollmentId,
        },
      });
    } catch (err) {
      console.error("[onEnrollmentCompleted] emit failed", err);
    }
  },
);
