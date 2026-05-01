export interface GuestEnrollment {
  id?: string;
  uid: string;
  courseId: string;
  source: 'purchase' | 'program' | 'manual';
  orderId?: string;

  status: 'active' | 'completed' | 'expired' | 'cancelled';
  progressPct: number;

  currentLessonId?: string | null;
  completedLessonIds?: string[];

  startedAt?: any;
  completedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface GuestProgramAccess {
  id?: string;
  uid: string;
  programId: string;
  orderId?: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  progressPct: number;
  unlockedCourseIds: string[];
  createdAt?: any;
  updatedAt?: any;
}
export interface LiveClassBooking {
  id?: string;
  uid: string;
  liveClassId: string;
  status: 'booked' | 'attended' | 'cancelled' | 'missed';
  orderId?: string;
  createdAt?: any;
  updatedAt?: any;
}
export interface Order {
  id?: string;
  uid: string;
  itemType: 'course' | 'program' | 'live_class' | 'tutor_session';
  itemId: string;
  title: string;
  amount: number;
  currency: 'USD';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  provider?: 'stripe';
  checkoutSessionId?: string;
  paymentIntentId?: string;
  offerId?: string;
  createdAt?: any;
  updatedAt?: any;
}