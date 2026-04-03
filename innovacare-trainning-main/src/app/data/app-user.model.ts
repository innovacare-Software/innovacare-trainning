export type AppRole =
  | 'guest'
  | 'learner'
  | 'manager'
  | 'admin'
  | 'super_admin';

export type AccessChannel =
  | 'guest'
  | 'organization'
  | 'staff';

export interface UserAccessContext {
  channel: AccessChannel;
  orgId?: string | null;
  orgRole?: 'learner' | 'manager' | 'admin';
  active: boolean;
}

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string | null;

  primaryRole: AppRole;
  access: UserAccessContext[];

  isActive: boolean;
  emailVerified?: boolean;

  createdAt?: any;
  updatedAt?: any;

  guestMeta?: {
    onboardingCompleted?: boolean;
    lastDashboardAt?: any;
  };
}