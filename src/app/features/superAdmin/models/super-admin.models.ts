export type OrgType = 'health' | 'IT' | 'school';
export type PlanType = 'free' | 'pro' | 'enterprise';
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'learner'
  | 'guest'
  | 'instructor'
  | 'tutor'
  | 'staff'
  | 'programAdmin'
  | 'programStaff'
  | 'programLearner';

export interface SuperAdminOrganization {
  id?: string;
  orgId?: string;
  name: string;
  type: OrgType;
  plan: PlanType;
  active?: boolean;
  ownerUid?: string | null;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
  accessCode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface SuperAdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  orgId?: string | null;
  orgType?: OrgType;
  isProgramAdmin?: boolean;
  isProgramStaff?: boolean;
  isProgramLearner?: boolean;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface SuperAdminLog {
  id?: string;
  type: string;
  actorUid?: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
  createdAt?: any;
  meta?: Record<string, any>;
}

export interface SuperAdminBillingRecord {
  id?: string;
  orgId: string;
  orgName?: string;
  plan: PlanType;
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  amount?: number;
  currency?: string;
  periodStart?: any;
  periodEnd?: any;
  updatedAt?: any;
}

export interface SuperAdminDashboardStats {
  organizations: number;
  users: number;
  activeOrganizations: number;
  activeUsers: number;
  billingActive: number;
  criticalLogs: number;
}

export interface SuperAdminRegistration {
  id?: string;
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  learnerType?: string;
  examGoal?: string;
  organizationName?: string;
  referralSource?: string;
  goals?: string;
  status?: 'new' | 'reviewed' | 'contacted' | 'converted' | 'archived' | string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrganizationAssignedCourse {
  id?: string;
  orgId: string;
  courseId: string;
  title?: string;
  active?: boolean;
  assignedAt?: any;
  assignedByUid?: string | null;
  assignedByEmail?: string | null;
}

export interface OrganizationCourseAssignment {
  id?: string;
  orgId: string;
  courseId: string;
  assignedAt?: any;
  assignedByUid?: string | null;
  assignedByEmail?: string | null;
  active?: boolean;
}

export interface OrganizationPolicy {
  id: string;
  title?: string;
  status?: string;
  version?: string | number;
  updatedAt?: any;
  createdAt?: any;
}

export interface OrganizationWoundLibraryItem {
  id: string;
  name?: string;
  category?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface OrganizationProgressSummary {
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  completionRate: number;
}

export interface OrganizationStatsViewModel {
  totalUsers: number;
  activeUsers: number;
  assignedCourses: number;
  totalEnrollments: number;
  progressCompletionAverage: number;
  policiesCount: number;
  woundLibraryCount: number;
}

export interface OrganizationDetailsViewModel {
  organization: SuperAdminOrganization;
  stats: OrganizationStatsViewModel;
  users: SuperAdminUser[];
  assignedCourses: OrganizationAssignedCourse[];
  progress: OrganizationProgressSummary;
  policies: OrganizationPolicy[];
  woundLibrary: OrganizationWoundLibraryItem[];
}

export interface OrganizationListRowViewModel {
  organization: SuperAdminOrganization;
  usersCount: number;
  assignedCoursesCount: number;
}