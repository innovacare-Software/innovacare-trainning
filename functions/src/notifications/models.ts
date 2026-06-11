import * as admin from "firebase-admin";

export type NotificationChannel =
  | "EMAIL"
  | "IN_APP"
  | "SMS"
  | "WHATSAPP"
  | "PUSH";

export type NotificationEventType =
  | "CHECKOUT_STARTED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "LOGIN_SUCCESS_NEW_DEVICE"
  | "PURCHASE_CONFIRMATION"
  | "COURSE_ACCESS_GRANTED"
  | "ACCOUNT_CREATED"
  | "FIRST_LOGIN"
  | "COURSE_ENROLLED"
  | "COURSE_STARTED"
  | "LESSON_COMPLETED"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ASSESSMENT_SUBMITTED"
  | "PROOF_SUBMISSION_SUBMITTED"
  | "PROOF_SUBMISSION_APPROVED"
  | "PROOF_SUBMISSION_REVISION_REQUIRED"
  | "PROOF_SUBMISSION_INCOMPLETE"
  | "CASE_STUDY_SUBMITTED"
  | "INSTRUCTOR_REVIEW_COMPLETED"
  | "CERTIFICATE_ISSUED"
  | "CAPSTONE_APPROVED"
  | "PORTFOLIO_APPROVED"
  | "LIVE_SESSION_SCHEDULED"
  | "LIVE_SESSION_REMINDER"
  | "LIVE_SESSION_RECORDING_AVAILABLE"
  | "LEAD_CAPTURED"
  | "DIAGNOSTIC_SUBMITTED"
  | "LANGUAGE_WRITING_SUBMITTED"
  | "LANGUAGE_SPEAKING_SUBMITTED"
  | "LANGUAGE_ROADMAP_READY"
  | "MOCK_EXAM_COMPLETED"
  | "READINESS_DECISION_READY"
  | "AI_PROJECT_SUBMITTED"
  | "DEVOPS_LAB_SUBMITTED"
  | "LAB_ADDED_TO_PROGRAM"
  | "MODULE_ADDED_TO_PROGRAM"
  | "LAB_SUBMITTED_LEARNER"
  | "SYSTEM_ERROR"
  | "WEBHOOK_ERROR";

export type NotificationRecipientType =
  | "LEARNER"
  | "INSTRUCTOR"
  | "ADMIN"
  | "OWNER"
  | "CUSTOM_EMAIL";

export type NotificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TemplateStatus = "ACTIVE" | "DRAFT" | "DISABLED";

export type FirestoreDate = admin.firestore.Timestamp | admin.firestore.FieldValue;

export type NotificationEvent = {
  id: string;
  type: NotificationEventType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: NotificationStatus;
  orgId?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  assessmentId?: string;
  learnerId?: string;
  instructorId?: string;
  adminId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recipientType: NotificationRecipientType;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientName?: string;
  cc?: string[];
  bcc?: string[];
  templateKey: string;
  templateData: Record<string, unknown>;
  createdBy?: string;
  scheduledFor?: FirestoreDate;
  processedAt?: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  idempotencyKey?: string;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  type: NotificationEventType;
  channel: NotificationChannel;
  status: TemplateStatus;
  subject: string;
  preheader?: string;
  htmlBody: string;
  textBody?: string;
  requiredVariables: string[];
  defaultFromName?: string;
  defaultFromEmail?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type NotificationLog = {
  id: string;
  eventId: string;
  type: NotificationEventType;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider?: string;
  providerMessageId?: string;
  recipientEmail: string;
  recipientUserId?: string;
  subject: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sentAt?: FirestoreDate;
  failedAt?: FirestoreDate;
  errorMessage?: string;
  retryCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  orgId?: string;
};

export type NotificationPreference = {
  id: string;
  userId: string;
  emailEnabled: boolean;
  categories: {
    purchases: boolean;
    courseProgress: boolean;
    assessments: boolean;
    instructorReview: boolean;
    liveSessions: boolean;
    marketing: boolean;
    adminAlerts?: boolean;
  };
  unsubscribedFromMarketing?: boolean;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  orgId?: string;
};

export type SendEmailInput = {
  to: string;
  toName?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
};

export type SendSmsInput = {
  to: string;
  from: string;
  body: string;
};

export type SendSmsResult = {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
};

export type NotificationCategoryKey =
  | "purchases"
  | "courseProgress"
  | "assessments"
  | "instructorReview"
  | "liveSessions"
  | "marketing"
  | "adminAlerts";
