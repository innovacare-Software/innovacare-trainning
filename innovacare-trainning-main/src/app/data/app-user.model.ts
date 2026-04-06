export type AppRole =
  | 'guest'
  | 'learner'
  | 'manager'
  | 'admin'
  | 'super_admin';

export type AccessChannel =
  | 'guest'
  | 'organization'
  | 'staff'
  | 'program_platform';

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

  // Program Platform domain flags (independent from organization domain roles).
  isProgramAdmin?: boolean;
  isProgramStaff?: boolean;
  isProgramLearner?: boolean;

  isActive: boolean;
  emailVerified?: boolean;

  createdAt?: any;
  updatedAt?: any;

  guestMeta?: {
    onboardingCompleted?: boolean;
    lastDashboardAt?: any;
  };
}
export interface Program {
  id?: string;
  title: string;
  subtitle?: string;
  description: string;
  imageUrl?: string;

  category: 'NCLEX' | 'DHA' | 'DOH' | 'DevOps' | 'Other';

  isPublic: boolean;
  active: boolean;

  price: number;
  currency: 'USD';

  includesCourseIds: string[];
  includesLiveClasses?: boolean;
  durationWeeks?: number;

  createdAt?: any;
  updatedAt?: any;
}
export interface LiveClass {
  id?: string;
  title: string;
  description?: string;

  relatedCourseId?: string;
  relatedProgramId?: string;

  category?: 'NCLEX' | 'DHA' | 'DOH' | 'DevOps' | 'Other';

  instructorName?: string;

  startAt: any;
  endAt: any;
  timezone?: string;

  locationType: 'google_meet' | 'zoom' | 'in_person';
  meetingUrl?: string;

  capacity?: number;
  seatsRemaining?: number;

  isActive: boolean;
  price?: number;

  createdAt?: any;
  updatedAt?: any;
}

export interface PublicOffer {
  id?: string;

  courseId?: string;
  programId?: string;
  liveClassId?: string;

  type: 'course' | 'program' | 'live_class';

  title: string;
  description?: string;
  imageUrl?: string;

  price: number;
  currency: 'USD';

  isActive: boolean;
  isPublic: boolean;

  category?: 'NCLEX' | 'DHA' | 'DOH' | 'DevOps' | 'Wound Care' | 'Infection Prevention';

  tags?: string[];

  createdAt?: any;
  updatedAt?: any;
}

export interface ProgramAccess {
  programId: string;
  enrolled: boolean;
  purchased: boolean;
}