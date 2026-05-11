/**
 * shareEvents collection — analytics for the <app-share-buttons> component.
 * Lightweight, fire-and-forget, multi-tenant friendly.
 */
export type ShareApp = 'innovacare_review' | 'sygepec';

export type SharePlatform =
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'x'
  | 'linkedin'
  | 'email'
  | 'copy'
  | 'native_share';

export type ShareSourcePage =
  | 'programs_page'
  | 'program_detail'
  | 'course_detail'
  | 'catalogue_page';

export type ShareDeviceType = 'mobile' | 'desktop' | 'tablet';

export interface ShareEvent {
  id?: string;

  app: ShareApp;
  platform: SharePlatform;
  sourcePage: ShareSourcePage;

  courseId?: string | null;
  courseSlug?: string | null;

  programId?: string | null;
  programSlug?: string | null;

  orgId?: string | null;

  userId?: string | null;
  userRole?: string | null;

  sharedUrl: string;
  deviceType?: ShareDeviceType;

  // Firestore serverTimestamp() on write, Timestamp on read.
  createdAt: any;
}
