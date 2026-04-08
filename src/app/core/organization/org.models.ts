import { Timestamp } from '@angular/fire/firestore';

export type OrgTimestamp = Timestamp | Date | null;

export type PlatformRole = 'super_admin' | 'support' | 'auditor';
export type OrgRole = 'org_admin' | 'org_manager' | 'org_learner';
export type UserRole = PlatformRole | OrgRole;

export type OrganizationUserRole = OrgRole;
export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'trial';
export type OrganizationReportType =
  | 'training_completion'
  | 'overdue_training'
  | 'policy_acknowledgment'
  | 'course_assignment'
  | 'user_compliance'
  | 'progress_summary'
  | 'alerts_follow_up'
  | 'audit_activity'
  | 'custom';

export type OrganizationAlertType =
  | 'overdue_training'
  | 'incomplete_required_course'
  | 'stalled_progress'
  | 'pending_policy_acknowledgment'
  | 'inactive_user_with_assignment'
  | 'missing_assignment'
  | 'compliance_reminder'
  | 'admin_follow_up_required';

export type OrganizationAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type OrganizationAlertStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';

export type OrganizationAuditActionType =
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'role_changed'
  | 'course_assigned'
  | 'course_unassigned'
  | 'progress_updated'
  | 'due_date_changed'
  | 'reminder_sent'
  | 'policy_published'
  | 'policy_assigned'
  | 'policy_acknowledged'
  | 'wound_library_created'
  | 'wound_library_updated'
  | 'wound_library_deleted'
  | 'report_generated'
  | 'alert_created'
  | 'alert_resolved'
  | 'alert_dismissed'
  | 'follow_up_completed'
  | 'troubleshooting_created'
  | 'troubleshooting_updated';

export type OrganizationAuditSeverity = 'info' | 'warning' | 'critical';
export type OrganizationTroubleshootingIssueType =
  | 'missing_assignment'
  | 'stalled_progress'
  | 'overdue_cluster'
  | 'policy_pending_cluster'
  | 'inactive_users'
  | 'data_anomaly';
export type OrganizationTroubleshootingStatus = 'open' | 'investigating' | 'actioned' | 'resolved';

export interface UserShell {
  uid: string;
  email: string;
  displayName: string;
  active: boolean;
  globalRole: PlatformRole | null;
  orgMemberships: Array<{
    orgId: string;
    role: OrgRole;
    active: boolean;
  }>;
}

export interface Organization {
  id: string;
  orgId: string;
  name: string;
  type?: string;
  plan?: string;
  status: OrganizationStatus;
  active: boolean;
  ownerUid?: string;
  ownerEmail?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  accessCode?: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationStats {
  totalUsers: number;
  activeLearners: number;
  assignedCourses: number;
  learnersInProgress: number;
  completionRate: number;
  overdueCount: number;
  pendingPolicyAcknowledgments: number;
  activeAlerts: number;
  criticalAuditEvents: number;
  usersAtRisk: number;
}

export interface OrganizationDashboardStats extends OrganizationStats {
  averageProgress: number;
  followUpCompletionRate: number;
  stalledLearners: number;
  notStartedLearners: number;
  completedLearners: number;
  assignmentCoverageRate: number;
}

export interface OrganizationUser {
  uid: string;
  orgId: string;
  email: string;
  displayName: string;
  role: OrganizationUserRole;
  active: boolean;
  department?: string;
  title?: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationAssignedCourse {
  id?: string;
  orgId: string;
  courseId: string;
  title?: string;
  category?: string;
  active: boolean;
  assignedBy?: string;
  assignedAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationCourseAssignment {
  id?: string;
  orgId: string;
  courseId: string;
  userId: string;
  assignedBy: string;
  status: 'assigned' | 'started' | 'completed' | 'overdue';
  assignedAt?: OrgTimestamp;
  startedAt?: OrgTimestamp;
  completedAt?: OrgTimestamp;
  dueDate?: OrgTimestamp;
}

export interface OrganizationEnrollment {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'not_started';
  dueDate?: OrgTimestamp;
  completedAt?: OrgTimestamp;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationProgressRecord {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  progressPct: number;
  score?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  updatedAt?: OrgTimestamp;
}

export interface OrganizationProgressSummary {
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  completionRate: number;
  averageProgress?: number;
}

export interface OrganizationOverdueRecord {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  dueDate?: OrgTimestamp;
  overdueDays: number;
  status: 'open' | 'contacted' | 'resolved';
  note?: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationPolicy {
  id?: string;
  orgId: string;
  title: string;
  content: string;
  version: string | number;
  active: boolean;
  createdBy: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationPolicyAcknowledgment {
  id?: string;
  orgId: string;
  policyId: string;
  userId: string;
  acknowledged: boolean;
  acknowledgedAt?: OrgTimestamp;
  dueDate?: OrgTimestamp;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationWoundLibraryItem {
  id?: string;
  orgId: string;
  name: string;
  category?: string;
  stage?: string;
  definition: string;
  active: boolean;
  createdBy: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationReport {
  id?: string;
  orgId: string;
  type: OrganizationReportType;
  name: string;
  filters?: Record<string, unknown>;
  summary?: OrganizationReportSummary;
  rowsCount?: number;
  status?: 'queued' | 'ready' | 'failed';
  createdBy: string;
  createdAt?: OrgTimestamp;
}

export interface OrganizationReportSummary {
  kpi: Record<string, number>;
  strongestArea?: string;
  weakestArea?: string;
  recommendation?: string;
}

export interface OrganizationReportRow {
  key: string;
  label: string;
  value: string | number;
  trend?: number;
  segment?: string;
}

export interface OrganizationAlert {
  id?: string;
  orgId: string;
  type: OrganizationAlertType;
  severity: OrganizationAlertSeverity;
  status: OrganizationAlertStatus;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
  resolvedAt?: OrgTimestamp;
}

export interface OrganizationFollowUpAction {
  id?: string;
  orgId: string;
  alertId?: string;
  type: 'reminder' | 'assignment' | 'policy_ack' | 'manual_note' | 'escalation';
  status: 'open' | 'done';
  assignedTo?: string;
  note?: string;
  completedAt?: OrgTimestamp;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationAuditLog {
  id?: string;
  orgId: string;
  actionType: OrganizationAuditActionType;
  severity: OrganizationAuditSeverity;
  actorUid?: string;
  actorEmail?: string;
  module: string;
  objectType: string;
  objectId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  message?: string;
  createdAt?: OrgTimestamp;
}

export interface OrganizationTroubleshootingIssue {
  id?: string;
  orgId: string;
  type: OrganizationTroubleshootingIssueType;
  status: OrganizationTroubleshootingStatus;
  title: string;
  description: string;
  impactedUsers?: number;
  riskLevel: OrganizationAlertSeverity;
  recommendation?: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface OrganizationDetailsViewModel {
  organization: Organization;
  stats: OrganizationStats;
  dashboard: OrganizationDashboardStats;
  users: OrganizationUser[];
  assignedCourses: OrganizationAssignedCourse[];
  assignments: OrganizationCourseAssignment[];
  enrollments: OrganizationEnrollment[];
  progress: OrganizationProgressSummary;
  overdue: OrganizationOverdueRecord[];
  policies: OrganizationPolicy[];
  policyAcknowledgments: OrganizationPolicyAcknowledgment[];
  woundLibrary: OrganizationWoundLibraryItem[];
  reports: OrganizationReport[];
  alerts: OrganizationAlert[];
  followUpActions: OrganizationFollowUpAction[];
  auditLogs: OrganizationAuditLog[];
  troubleshootingIssues: OrganizationTroubleshootingIssue[];
}

// -----------------------------------------------------------------------------
// Backward-compatible aliases used by existing code.
// -----------------------------------------------------------------------------
export type OrganizationDoc = Organization;
export type OrganizationUserDoc = OrganizationUser;
export type OrganizationCourseDoc = OrganizationAssignedCourse;
export type OrganizationCourseAssignmentDoc = OrganizationCourseAssignment;
export type OrganizationProgressDoc = OrganizationProgressRecord;
export type OrganizationPolicyDoc = OrganizationPolicy;
export type OrganizationWoundLibraryItemDoc = OrganizationWoundLibraryItem;

export interface OrganizationDocumentDoc {
  id?: string;
  title: string;
  path: string;
  mimeType?: string;
  uploadedBy: string;
  createdAt?: OrgTimestamp;
}

export type OrganizationReportDoc = OrganizationReport;
