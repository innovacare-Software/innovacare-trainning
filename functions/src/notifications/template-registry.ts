import {NotificationEventType, NotificationTemplate} from "./models";

type SeedTemplate = Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">;

function template(type: NotificationEventType, key: string, subject: string, htmlBody: string, textBody: string, requiredVariables: string[]): SeedTemplate {
  return {
    key,
    type,
    channel: "EMAIL",
    status: "ACTIVE",
    subject,
    preheader: "InnovacareReview notification",
    htmlBody,
    textBody,
    requiredVariables,
    defaultFromName: "InnovacareReview",
    defaultFromEmail: "no-reply@innovacarereview.com",
  };
}

export const DEFAULT_NOTIFICATION_TEMPLATES: SeedTemplate[] = [
  template(
    "ACCOUNT_CREATED",
    "account_created_welcome",
    "Welcome to InnovacareReview, {{learnerName}}",
    "<p>Hello {{learnerName}},</p><p>Your account has been created successfully.</p><p>You can sign in and start exploring your learning workspace.</p><p><a href='{{ctaUrl}}'>Sign in now</a></p>",
    "Hello {{learnerName}}, your account is ready. Sign in: {{ctaUrl}}",
    ["learnerName", "ctaUrl"]
  ),
  template(
    "FIRST_LOGIN",
    "first_login_welcome",
    "Great to see you, {{learnerName}}",
    "<p>Hello {{learnerName}},</p><p>Welcome to your first connection on InnovacareReview.</p><p>Your dashboard is ready.</p><p><a href='{{ctaUrl}}'>Open my dashboard</a></p>",
    "Hello {{learnerName}}, welcome to your first login. Open dashboard: {{ctaUrl}}",
    ["learnerName", "ctaUrl"]
  ),
  template(
    "PURCHASE_CONFIRMATION",
    "purchase_confirmation",
    "Your InnovacareReview purchase is confirmed — {{courseTitle}}",
    "<p>Hello {{learnerName}},</p><p>Your purchase for <strong>{{courseTitle}}</strong> has been confirmed.</p><p>You now have access to the course.</p><p><a href='{{ctaUrl}}'>Continue learning</a></p>",
    "Hello {{learnerName}}, your purchase for {{courseTitle}} has been confirmed. Continue learning: {{ctaUrl}}",
    ["learnerName", "courseTitle", "ctaUrl"]
  ),
  template(
    "PAYMENT_FAILED",
    "payment_failed",
    "Payment issue — action needed for {{courseTitle}}",
    "<p>Hello {{learnerName}},</p><p>We could not complete your payment for <strong>{{courseTitle}}</strong>.</p><p>Please update your payment method or contact support.</p><p><a href='{{ctaUrl}}'>Update payment</a></p>",
    "Hello {{learnerName}}, payment failed for {{courseTitle}}. Update payment: {{ctaUrl}}",
    ["learnerName", "courseTitle", "ctaUrl"]
  ),
  template(
    "COURSE_ACCESS_GRANTED",
    "course_access_granted",
    "You now have access to {{courseTitle}}",
    "<p>Hello {{learnerName}},</p><p>Your course access has been activated.</p><p>Start with {{firstLessonTitle}}.</p><p><a href='{{ctaUrl}}'>Start course</a></p>",
    "Hello {{learnerName}}, access granted to {{courseTitle}}. Start course: {{ctaUrl}}",
    ["learnerName", "courseTitle", "firstLessonTitle", "ctaUrl"]
  ),
  template(
    "PROOF_SUBMISSION_SUBMITTED",
    "proof_submission_received_learner",
    "Submission received — {{submissionTitle}}",
    "<p>Hello {{learnerName}},</p><p>We received your submission for <strong>{{submissionTitle}}</strong>.</p><p>Your instructor will review it and provide feedback.</p><p><a href='{{ctaUrl}}'>View submission</a></p>",
    "Submission received for {{submissionTitle}}. View: {{ctaUrl}}",
    ["learnerName", "submissionTitle", "ctaUrl"]
  ),
  template(
    "PROOF_SUBMISSION_SUBMITTED",
    "proof_submission_received_instructor",
    "New learner submission waiting for review — {{submissionTitle}}",
    "<p>Hello {{instructorName}},</p><p>{{learnerName}} submitted {{submissionTitle}} for {{courseTitle}}.</p><p><a href='{{ctaUrl}}'>Review submission</a></p>",
    "New submission {{submissionTitle}} by {{learnerName}}. Review: {{ctaUrl}}",
    ["instructorName", "learnerName", "submissionTitle", "courseTitle", "ctaUrl"]
  ),
  template(
    "PROOF_SUBMISSION_REVISION_REQUIRED",
    "proof_submission_revision_required",
    "Revision required — {{submissionTitle}}",
    "<p>Hello {{learnerName}},</p><p>Your instructor reviewed your submission and requested revisions.</p><p>Feedback: {{feedbackSummary}}</p><p><a href='{{ctaUrl}}'>View feedback and resubmit</a></p>",
    "Revision required for {{submissionTitle}}. Feedback: {{feedbackSummary}}",
    ["learnerName", "submissionTitle", "feedbackSummary", "ctaUrl"]
  ),
  template(
    "PROOF_SUBMISSION_APPROVED",
    "proof_submission_approved",
    "Submission approved — {{submissionTitle}}",
    "<p>Hello {{learnerName}},</p><p>Congratulations. Your submission has been approved.</p><p><a href='{{ctaUrl}}'>Continue course</a></p>",
    "Submission approved for {{submissionTitle}}. Continue: {{ctaUrl}}",
    ["learnerName", "submissionTitle", "ctaUrl"]
  ),
  template(
    "CASE_STUDY_SUBMITTED",
    "case_study_submitted_instructor",
    "Case study submitted — {{submissionTitle}}",
    "<p>Hello {{instructorName}},</p><p>{{learnerName}} submitted a case study for {{courseTitle}}.</p><p><a href='{{ctaUrl}}'>Open review queue</a></p>",
    "Case study submitted for {{courseTitle}} by {{learnerName}}",
    ["instructorName", "learnerName", "courseTitle", "submissionTitle", "ctaUrl"]
  ),
  template(
    "CERTIFICATE_ISSUED",
    "certificate_issued",
    "Your InnovacareReview certificate is ready — {{courseTitle}}",
    "<p>Hello {{learnerName}},</p><p>Congratulations on completing {{courseTitle}}. Your certificate is now available.</p><p><a href='{{ctaUrl}}'>Download certificate</a></p>",
    "Certificate ready for {{courseTitle}}: {{ctaUrl}}",
    ["learnerName", "courseTitle", "ctaUrl"]
  ),
  template(
    "LIVE_SESSION_SCHEDULED",
    "live_session_scheduled",
    "Live session scheduled — {{sessionTitle}}",
    "<p>Hello {{learnerName}},</p><p>{{sessionTitle}} has been scheduled for {{sessionTime}}.</p><p><a href='{{ctaUrl}}'>View session</a></p>",
    "Live session scheduled: {{sessionTitle}} at {{sessionTime}}",
    ["learnerName", "sessionTitle", "sessionTime", "ctaUrl"]
  ),
  template(
    "LIVE_SESSION_REMINDER",
    "live_session_reminder",
    "Reminder: {{sessionTitle}} starts at {{sessionTime}}",
    "<p>Hello {{learnerName}},</p><p>This is a reminder for your live session.</p><p><a href='{{ctaUrl}}'>Join live session</a></p>",
    "Reminder: {{sessionTitle}} starts at {{sessionTime}}",
    ["learnerName", "sessionTitle", "sessionTime", "ctaUrl"]
  ),
  template(
    "LIVE_SESSION_RECORDING_AVAILABLE",
    "recording_available",
    "Correction recording available — {{sessionTitle}}",
    "<p>Hello {{learnerName}},</p><p>The correction recording for {{sessionTitle}} is now available.</p><p><a href='{{ctaUrl}}'>Watch recording</a></p>",
    "Recording available for {{sessionTitle}}: {{ctaUrl}}",
    ["learnerName", "sessionTitle", "ctaUrl"]
  ),
  template(
    "LEAD_CAPTURED",
    "lead_captured_admin",
    "New lead captured — {{leadName}} interested in {{programInterest}}",
    "<p>A new lead was submitted through InnovacareReview.</p><p><a href='{{ctaUrl}}'>View lead</a></p>",
    "New lead: {{leadName}} interested in {{programInterest}}",
    ["leadName", "programInterest", "ctaUrl"]
  ),
  template(
    "DIAGNOSTIC_SUBMITTED",
    "diagnostic_submitted_instructor",
    "Diagnostic submitted — {{learnerName}}",
    "<p>{{learnerName}} submitted a diagnostic.</p><p><a href='{{ctaUrl}}'>Review diagnostic</a></p>",
    "Diagnostic submitted by {{learnerName}}",
    ["learnerName", "ctaUrl"]
  ),
  template(
    "LANGUAGE_ROADMAP_READY",
    "language_roadmap_ready",
    "Your language roadmap is ready",
    "<p>Hello {{learnerName}},</p><p>Your instructor roadmap is ready.</p><p><a href='{{ctaUrl}}'>Open roadmap</a></p>",
    "Roadmap ready: {{ctaUrl}}",
    ["learnerName", "ctaUrl"]
  ),
  template(
    "MOCK_EXAM_COMPLETED",
    "mock_exam_completed",
    "Mock exam completed — {{examTitle}}",
    "<p>Hello {{learnerName}},</p><p>Your mock exam has been completed.</p><p><a href='{{ctaUrl}}'>View report</a></p>",
    "Mock exam completed for {{learnerName}}",
    ["learnerName", "examTitle", "ctaUrl"]
  ),
  template(
    "AI_PROJECT_SUBMITTED",
    "ai_project_submitted_instructor",
    "AI project submitted — {{submissionTitle}}",
    "<p>Hello {{instructorName}},</p><p>{{learnerName}} submitted an AI project.</p><p><a href='{{ctaUrl}}'>Review project</a></p>",
    "AI project submitted by {{learnerName}}",
    ["instructorName", "learnerName", "submissionTitle", "ctaUrl"]
  ),
  template(
    "DEVOPS_LAB_SUBMITTED",
    "devops_lab_submitted_instructor",
    "DevOps lab submitted — {{submissionTitle}}",
    "<p>Hello {{instructorName}},</p><p>{{learnerName}} submitted a DevOps lab.</p><p><a href='{{ctaUrl}}'>Review lab</a></p>",
    "DevOps lab submitted by {{learnerName}}",
    ["instructorName", "learnerName", "submissionTitle", "ctaUrl"]
  ),
  template(
    "SYSTEM_ERROR",
    "system_error_admin",
    "InnovacareReview system alert — {{errorType}}",
    "<p>A system error occurred.</p><p>Details: {{errorSummary}}</p><p><a href='{{ctaUrl}}'>View logs</a></p>",
    "System error: {{errorType}} / {{errorSummary}}",
    ["errorType", "errorSummary", "ctaUrl"]
  ),
];
