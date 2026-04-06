import { Timestamp } from '@angular/fire/firestore';

export type PlatformRole = 'super_admin' | 'support' | 'auditor';
export type OrgRole = 'org_admin' | 'org_manager' | 'org_learner';
export type UserRole = PlatformRole | OrgRole;

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

export interface OrganizationDoc {
  id: string;
  name: string;
  type?: string;
  plan?: string;
  accessCode?: string;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrganizationUserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: OrgRole;
  active: boolean;
  department?: string;
  title?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrganizationCourseDoc {
  courseId: string;
  title: string;
  category?: string;
  active: boolean;
  assignedBy: string;
  assignedAt?: Timestamp;
}

export interface OrganizationCourseAssignmentDoc {
  id?: string;
  orgId: string;
  courseId: string;
  userId: string;
  assignedBy: string;
  status: 'assigned' | 'started' | 'completed';
  assignedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  dueDate?: Timestamp;
}

export interface OrganizationProgressDoc {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  progressPct: number;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  updatedAt?: Timestamp;
}

export interface OrganizationPolicyDoc {
  id?: string;
  title: string;
  content: string;
  version: string;
  active: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrganizationWoundLibraryItemDoc {
  id?: string;
  name: string;
  category?: string;
  stage?: string;
  definition: string;
  active: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrganizationDocumentDoc {
  id?: string;
  title: string;
  path: string;
  mimeType?: string;
  uploadedBy: string;
  createdAt?: Timestamp;
}

export interface OrganizationReportDoc {
  id?: string;
  type: 'progress' | 'completion' | 'policy_ack' | 'custom';
  createdBy: string;
  payload: Record<string, unknown>;
  createdAt?: Timestamp;
}
