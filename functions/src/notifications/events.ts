import {NotificationChannel, NotificationEventType, NotificationPriority, NotificationRecipientType} from "./models";
import {createNotificationEvent, CreateNotificationEventInput} from "./service";

type EmitNotificationEventInput = {
  type: NotificationEventType;
  templateKey: string;
  templateData: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  recipientType: NotificationRecipientType;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientName?: string;
  orgId?: string | null;
  courseId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdBy?: string;
  idempotencyKey?: string;
  maxRetries?: number;
};

export async function emitNotificationEvent(input: EmitNotificationEventInput): Promise<{id: string; created: boolean}> {
  const payload: CreateNotificationEventInput = {
    type: input.type,
    templateKey: input.templateKey,
    templateData: input.templateData,
    channels: input.channels || ["EMAIL"],
    priority: input.priority || "NORMAL",
    recipientType: input.recipientType,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    orgId: input.orgId || undefined,
    courseId: input.courseId,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    createdBy: input.createdBy,
    scheduledFor: undefined,
    processedAt: undefined,
    learnerId: input.recipientType === "LEARNER" ? input.recipientUserId : undefined,
    instructorId: input.recipientType === "INSTRUCTOR" ? input.recipientUserId : undefined,
    adminId: input.recipientType === "ADMIN" ? input.recipientUserId : undefined,
    cc: undefined,
    bcc: undefined,
    moduleId: undefined,
    lessonId: undefined,
    assessmentId: undefined,
    maxRetries: input.maxRetries || 3,
    idempotencyKey: input.idempotencyKey,
  };

  return createNotificationEvent(payload);
}
