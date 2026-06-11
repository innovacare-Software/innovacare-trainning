/**
 * lab-notifications.ts
 *
 * Firebase Cloud Function triggers for lab-related email notifications:
 *
 *  1. onLabSessionSubmitted   — Firestore trigger on labSessions/{sessionId}
 *     When status changes to SUBMITTED or PASSED → send learner a confirmation email.
 *
 *  2. onLabDefinitionPublished — Firestore trigger on labDefinitions/{labId}
 *     When a new lab is created with published=true, OR an existing lab is
 *     first published → query all active programEnrollments and email each learner.
 *
 *  3. onProgramModuleAdded    — Firestore trigger on programs/{programId}
 *     When a program document gets new items in moduleIds[] → email enrolled learners.
 */

import * as admin from "firebase-admin";
import {onDocumentWritten, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {emitNotificationEvent} from "./events";

const BASE_URL = "https://www.innovacarereview.com";

// ── 1. Lab Session Submitted → email learner confirmation ─────────────────────

export const onLabSessionSubmitted = onDocumentWritten(
  "labSessions/{sessionId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!after) return; // document deleted — ignore

    const prevStatus = before?.status ?? "";
    const newStatus  = after.status ?? "";

    // Only fire when status transitions INTO SUBMITTED or PASSED
    const isNewSubmission =
      (newStatus === "SUBMITTED" || newStatus === "PASSED") &&
      prevStatus !== "SUBMITTED" &&
      prevStatus !== "PASSED";

    if (!isNewSubmission) return;

    const sessionId = event.params.sessionId;
    const userId    = after.userId as string;
    const labId     = after.labId  as string;
    const score     = (after.score    as number) ?? 0;
    const maxScore  = (after.maxScore as number) ?? 0;
    const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Fetch the lab definition for the title
    const labSnap = await admin.firestore().doc(`labDefinitions/${labId}`).get();
    const labTitle = labSnap.exists ? (labSnap.data()?.title ?? "Lab") : "Lab";

    // Fetch the learner profile for name + email
    const userSnap = await admin.firestore().doc(`users/${userId}`).get();
    const userData = userSnap.data();
    const learnerName  = userData?.displayName ?? userData?.email ?? "Learner";
    const learnerEmail = userData?.email as string | undefined;

    if (!learnerEmail) {
      console.warn(`[LabNotify] No email for user ${userId} — skipping submission email`);
      return;
    }

    const ctaUrl = `${BASE_URL}/labs/${labId}/session/${sessionId}`;

    await emitNotificationEvent({
      type:           "LAB_SUBMITTED_LEARNER",
      templateKey:    "lab_submitted_learner_confirmation",
      recipientType:  "LEARNER",
      recipientUserId: userId,
      recipientEmail:  learnerEmail,
      recipientName:   learnerName,
      relatedEntityType: "labSession",
      relatedEntityId:   sessionId,
      idempotencyKey: `lab-submitted-${sessionId}`,
      templateData: {
        learnerName,
        labTitle,
        score,
        maxScore,
        scorePercent,
        ctaUrl,
      },
    });

    console.log(`[LabNotify] Submission confirmation sent to ${learnerEmail} for session ${sessionId}`);
  }
);

// ── 2. Lab Definition Published → email all enrolled learners ─────────────────

export const onLabDefinitionPublished = onDocumentWritten(
  "labDefinitions/{labId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!after) return; // document deleted

    const wasPublished  = before?.published === true;
    const nowPublished  = after.published   === true;
    const isNewDoc      = !before;

    // Trigger only when first published (new doc with published=true, or publish transition)
    const isFirstPublish = (isNewDoc && nowPublished) || (!wasPublished && nowPublished);
    if (!isFirstPublish) return;

    const labId          = event.params.labId;
    const labTitle       = (after.title        as string) ?? "New Lab";
    const labDescription = (after.description  as string) ?? "";
    const xp             = (after.xp           as number) ?? 0;
    const difficulty     = (after.difficulty   as string) ?? "beginner";
    const estimatedMinutes = (after.estimatedMinutes as number) ?? 30;
    const programIds: string[] = Array.isArray(after.programIds) ? after.programIds : [];

    if (programIds.length === 0) {
      console.log(`[LabNotify] Lab ${labId} has no programIds — skipping enrollment query`);
      return;
    }

    const ctaUrl = `${BASE_URL}/labs`;

    // Query all active enrollments for each programId
    for (const programId of programIds) {
      const enrollmentsSnap = await admin.firestore()
        .collection("programEnrollments")
        .where("programId", "==", programId)
        .where("status", "in", ["ACTIVE", "CONFIRMED", "COMPLETED"])
        .get();

      if (enrollmentsSnap.empty) continue;

      // Fetch program title once
      const programSnap = await admin.firestore().doc(`programs/${programId}`).get();
      const programTitle = programSnap.exists ? (programSnap.data()?.title ?? "Your Program") : "Your Program";

      const promises = enrollmentsSnap.docs.map(async (enrollDoc) => {
        const enrollment   = enrollDoc.data();
        const learnerId    = enrollment.userId    as string;
        const learnerEmail = enrollment.learnerEmail as string | undefined;
        const learnerName  = enrollment.learnerName  as string | undefined ?? "Learner";

        if (!learnerEmail) return;

        return emitNotificationEvent({
          type:           "LAB_ADDED_TO_PROGRAM",
          templateKey:    "lab_added_to_program_learner",
          recipientType:  "LEARNER",
          recipientUserId: learnerId,
          recipientEmail:  learnerEmail,
          recipientName:   learnerName,
          relatedEntityType: "labDefinition",
          relatedEntityId:   labId,
          idempotencyKey: `lab-added-${programId}-${labId}-${learnerId}`,
          templateData: {
            learnerName,
            programTitle,
            labTitle,
            labDescription,
            estimatedMinutes,
            xp,
            difficulty,
            ctaUrl,
          },
        });
      });

      await Promise.allSettled(promises);
      console.log(`[LabNotify] New lab notifications sent for program ${programId} (${enrollmentsSnap.size} learners)`);
    }
  }
);

// ── 3. Program Module Added → email enrolled learners ─────────────────────────

export const onProgramModuleAdded = onDocumentUpdated(
  "programs/{programId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!before || !after) return;

    const prevModuleIds: string[] = Array.isArray(before.moduleIds) ? before.moduleIds : [];
    const newModuleIds:  string[] = Array.isArray(after.moduleIds)  ? after.moduleIds  : [];

    // Find newly added moduleIds
    const addedIds = newModuleIds.filter((id) => !prevModuleIds.includes(id));
    if (addedIds.length === 0) return;

    const programId    = event.params.programId;
    const programTitle = (after.title as string) ?? "Your Program";
    const ctaUrl       = `${BASE_URL}/programs/${programId}`;

    // Fetch each new module's details
    for (const moduleId of addedIds) {
      const moduleSnap = await admin.firestore()
        .doc(`programs/${programId}/modules/${moduleId}`)
        .get();

      const moduleTitle       = moduleSnap.exists ? (moduleSnap.data()?.title ?? "New Module") : "New Module";
      const moduleDescription = moduleSnap.exists ? (moduleSnap.data()?.description ?? "") : "";

      // Get all active enrollments for this program
      const enrollmentsSnap = await admin.firestore()
        .collection("programEnrollments")
        .where("programId", "==", programId)
        .where("status", "in", ["ACTIVE", "CONFIRMED", "COMPLETED"])
        .get();

      if (enrollmentsSnap.empty) continue;

      const promises = enrollmentsSnap.docs.map(async (enrollDoc) => {
        const enrollment   = enrollDoc.data();
        const learnerId    = enrollment.userId     as string;
        const learnerEmail = enrollment.learnerEmail as string | undefined;
        const learnerName  = enrollment.learnerName  as string | undefined ?? "Learner";

        if (!learnerEmail) return;

        return emitNotificationEvent({
          type:           "MODULE_ADDED_TO_PROGRAM",
          templateKey:    "module_added_to_program_learner",
          recipientType:  "LEARNER",
          recipientUserId: learnerId,
          recipientEmail:  learnerEmail,
          recipientName:   learnerName,
          relatedEntityType: "programModule",
          relatedEntityId:   moduleId,
          idempotencyKey: `module-added-${programId}-${moduleId}-${learnerId}`,
          templateData: {
            learnerName,
            programTitle,
            moduleTitle,
            moduleDescription,
            ctaUrl,
          },
        });
      });

      await Promise.allSettled(promises);
      console.log(`[LabNotify] Module notification sent for ${moduleId} in program ${programId} (${enrollmentsSnap.size} learners)`);
    }
  }
);
