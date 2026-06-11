export enum ProgramCategory {
  DEVOPS = 'DEVOPS',
  NCLEX = 'NCLEX',
  NURSING_PREP = 'NURSING_PREP',
  DHA = 'DHA',
  DOH = 'DOH',
  CANADA_NCLEX = 'CANADA_NCLEX',
  OTHER = 'OTHER',
}

export enum ProgramLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum ProgramDeliveryMode {
  ONLINE = 'ONLINE',
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
}

export enum ProgramStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProgramEnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum ReviewStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
}

export enum ProgramModuleUnlockMode {
  LINEAR = 'linear',
  FLEXIBLE = 'flexible',
}

export enum ProgramLessonType {
  VIDEO = 'video',
  READING = 'reading',
  INTERACTIVE = 'interactive',
  LAB = 'lab',
  DOCUMENT = 'document',
  MIXED = 'mixed',
  WEB = 'web',
}

export enum SessionType {
  LIVE_LECTURE = 'live_lecture',
  WORKSHOP = 'workshop',
  Q_AND_A = 'q_and_a',
  REVIEW_SESSION = 'review_session',
  OFFICE_HOURS = 'office_hours',
}

export enum ProgramLiveSessionAccessMode {
  INCLUDED = 'included',
  FREE = 'free',
  PAID = 'paid',
}

export enum DocumentFileType {
  PDF = 'pdf',
  DOCX = 'docx',
  PPTX = 'pptx',
  XLSX = 'xlsx',
  IMAGE = 'image',
  OTHER = 'other',
}

export enum SimulationType {
  COMPUTER_TEST = 'computer_test',
  READINESS_EXAM = 'readiness_exam',
  TIMED_MOCK = 'timed_mock',
}

export enum AssessmentType {
  QUIZ = 'quiz',
  MOCK_EXAM = 'mock_exam',
  READINESS_TEST = 'readiness_test',
}

export enum ProgramDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum SimulationQuestionMode {
  SINGLE = 'single',
  MULTI = 'multi',
}

export enum CaseStudyScoringMode {
  MANUAL = 'manual',
  AUTO = 'auto',
  HYBRID = 'hybrid',
}

export type ProgramCurrency = 'USD' | 'CAD' | 'AED' | 'EUR' | 'GBP';
export type ProgramOwnerType = 'platform' | 'partner';
export type ProgramPayoutMode = 'manual' | 'stripe_connect';
export type PartnerPayoutMethod = 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY' | 'WISE' | 'BANK_TRANSFER' | 'MANUAL_OTHER';
export type ProgramPaymentPlanType = 'one_time' | 'monthly_subscription' | 'installments';

export type FirestoreDateValue = unknown;

export interface ProgramModuleLessonSeed {
  title: string;
  type?: ProgramLessonType;
  videoUrl?: string;
  description?: string;
  contentHtml?: string;
  durationMin?: number;
  isPreview?: boolean;
  downloadable?: boolean;
  active?: boolean;
  status?: string;
  order?: number;
}

export interface ProgramModule {
  id: string;
  programId?: string;
  title: string;
  description?: string;
  summary?: string;
  lessons?: Array<string | ProgramModuleLessonSeed>;
  order: number;
  estimatedMinutes?: number;
  durationText?: string;
  unlockMode?: ProgramModuleUnlockMode;
  requiredToPass?: boolean;
  active?: boolean;
  createdAt?: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  category: ProgramCategory;
  tags: string[];
  imageUrl: string;
  brochureUrl?: string;
  durationWeeks?: number;
  durationText: string;
  scheduleText: string;
  price: number;
  discountPrice?: number | null;
  currency: ProgramCurrency;
  availablePaymentPlans?: ProgramPaymentPlanType[];
  defaultPaymentPlan?: ProgramPaymentPlanType;
  stripeOneTimePriceId?: string | null;
  stripeMonthlyPriceId?: string | null;
  monthlyPrice?: number | null;
  stripeInstallmentPriceId?: string | null;
  installmentPrice?: number | null;
  installmentCount?: number | null;
  level: ProgramLevel;
  deliveryMode: ProgramDeliveryMode;
  isFeatured: boolean;
  seats?: number | null;
  seatsRemaining?: number | null;
  active: boolean;
  status: ProgramStatus;
  requirements: string[];
  outcomes: string[];
  modules?: ProgramModule[];
  linkedCourseIds?: string[];
  moduleIds?: string[];
  adminPhone?: string;
  stripeAccountId?: string | null;
  ownerType?: ProgramOwnerType;
  startDate?: FirestoreDateValue | null;
  endDate?: FirestoreDateValue | null;
  ownerId: string;
  payoutMode?: ProgramPayoutMode;
  platformFeePercent?: number;
  partnerSharePercent?: number;
  payoutMethodConfigured?: boolean;
  payoutMethod?: PartnerPayoutMethod;
  payoutCountry?: string;
  payoutCurrency?: string;
  accountHolderName?: string;
  mobileMoneyProvider?: string;
  mobileMoneyPhoneMasked?: string;
  bankName?: string;
  bankAccountMasked?: string;
  payoutNotes?: string;
  orgId?: string | null;
  createdAt?: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
}

export interface CreateProgramPayload {
  title: string;
  slug?: string;
  subtitle: string;
  description: string;
  category: ProgramCategory;
  tags: string[];
  imageUrl: string;
  brochureUrl?: string;
  durationWeeks?: number;
  durationText: string;
  scheduleText: string;
  price: number;
  discountPrice?: number | null;
  currency: ProgramCurrency;
  availablePaymentPlans?: ProgramPaymentPlanType[];
  defaultPaymentPlan?: ProgramPaymentPlanType;
  stripeOneTimePriceId?: string | null;
  stripeMonthlyPriceId?: string | null;
  monthlyPrice?: number | null;
  stripeInstallmentPriceId?: string | null;
  installmentPrice?: number | null;
  installmentCount?: number | null;
  level: ProgramLevel;
  deliveryMode: ProgramDeliveryMode;
  isFeatured: boolean;
  seats?: number | null;
  seatsRemaining?: number | null;
  active: boolean;
  status: ProgramStatus;
  requirements: string[];
  outcomes: string[];
  modules?: ProgramModule[];
  moduleIds?: string[];
  adminPhone?: string;
  stripeAccountId?: string | null;
  ownerType?: ProgramOwnerType;
  linkedCourseIds?: string[];
  startDate?: FirestoreDateValue | null;
  endDate?: FirestoreDateValue | null;
  ownerId?: string;
  payoutMode?: ProgramPayoutMode;
  platformFeePercent?: number;
  partnerSharePercent?: number;
  payoutMethodConfigured?: boolean;
  payoutMethod?: PartnerPayoutMethod;
  payoutCountry?: string;
  payoutCurrency?: string;
  accountHolderName?: string;
  mobileMoneyProvider?: string;
  mobileMoneyPhoneMasked?: string;
  bankName?: string;
  bankAccountMasked?: string;
  payoutNotes?: string;
  orgId?: string | null;
}

export interface ProgramLesson {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  type: ProgramLessonType;
  contentHtml: string;
  videoUrl?: string;
  documentUrl?: string;
  fileUrl?: string;
  downloadable?: boolean;
  durationMin: number;
  order: number;
  isPreview: boolean;
  active: boolean;
}

export interface ProgramSimulation {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  type: SimulationType;
  questions: SimulationQuestion[];
  questionCount: number;
  durationMin: number;
  passingScore: number;
  difficulty: ProgramDifficulty;
  active: boolean;
}

export interface SimulationChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface SimulationQuestion {
  id: string;
  prompt: string;
  mode: SimulationQuestionMode;
  choices: SimulationChoice[];
  subject?: string;
  lesson?: string;
  clientNeedArea?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface CaseStudyQuestion {
  id: string;
  prompt: string;
  expectedKeywords?: string[];
  maxScore?: number;
  subject?: string;
  lesson?: string;
  clientNeedArea?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export type CaseStudyQuestionStatus =
  | 'unanswered'
  | 'answered'
  | 'flagged'
  | 'flagged_and_answered'
  | 'visited_unanswered';

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  mode: SimulationQuestionMode;
  choices: AssessmentChoice[];
  subject?: string;
  lesson?: string;
  clientNeedArea?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface AssessmentChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface ProgramCaseStudy {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  scenario: string;
  prompts?: string[];
  questions: CaseStudyQuestion[];
  scoringMode: CaseStudyScoringMode;
  active: boolean;
}

export interface ProgramAssessment {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  type: AssessmentType;
  assessmentType?: AssessmentType;
  questions?: AssessmentQuestion[];
  questionCount?: number;
  passingScore: number;
  durationMin: number;
  active: boolean;
}

export interface ProgramDocument {
  id: string;
  programId: string;
  moduleId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentFileType;
  downloadable: boolean;
  order: number;
  active: boolean;
  createdAt?: FirestoreDateValue;
}

export interface ProgramLiveSession {
  id: string;
  programId: string;
  moduleId?: string;
  title: string;
  description?: string;
  sessionType: SessionType;
  startAt: FirestoreDateValue;
  endAt: FirestoreDateValue;
  timezone?: string;
  meetingUrl?: string;
  instructorName?: string;
  accessMode?: ProgramLiveSessionAccessMode;
  bookingRequired?: boolean;
  price?: number;
  currency?: ProgramCurrency;
  required: boolean;
  capacity?: number;
  active: boolean;
  createdAt?: FirestoreDateValue;
}

export interface ProgramLiveSessionBooking {
  id: string;
  uid: string;
  programId: string;
  sessionId: string;
  status: 'reserved' | 'booked' | 'attended' | 'cancelled' | 'missed';
  accessMode: ProgramLiveSessionAccessMode;
  orderId?: string | null;
  title?: string;
  instructorName?: string;
  startAt?: FirestoreDateValue;
  endAt?: FirestoreDateValue;
  createdAt?: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
}

export const PROGRAM_LIVE_SESSION_ACCESS_LABELS: Record<ProgramLiveSessionAccessMode, string> = {
  [ProgramLiveSessionAccessMode.INCLUDED]: 'Included',
  [ProgramLiveSessionAccessMode.FREE]: 'Free',
  [ProgramLiveSessionAccessMode.PAID]: 'Paid',
};

export interface UserLessonProgress {
  id: string;
  userId: string;
  programId: string;
  moduleId: string;
  lessonId: string;
  completed: boolean;
  watchedPct: number;
  notes?: string;
  lastOpenedAt?: FirestoreDateValue;
  notesUpdatedAt?: FirestoreDateValue;
  completedAt?: FirestoreDateValue;
}

export interface UserCaseStudyAttempt {
  id: string;
  userId: string;
  programId: string;
  moduleId: string;
  caseStudyId: string;
  score: number;
  passed: boolean;
  answers?: Record<string, string>;
  flags?: Record<string, boolean>;
  visitedQuestionIds?: string[];
  questionStatuses?: Record<string, CaseStudyQuestionStatus>;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  currentQuestionIndex?: number;
  completionPercent?: number;
  elapsedSeconds?: number;
  evaluatorNotes?: string;
  completedAt?: FirestoreDateValue;
}

export interface ProgramEnrollment {
  id: string;
  userId: string;
  programId: string;
  programImage: string;
  programTitle: string;
  category: ProgramCategory;
  learnerName: string;
  learnerEmail: string;
  learnerPhone: string;
  notes?: string;
  status: ProgramEnrollmentStatus;
  enrolledAt?: FirestoreDateValue;
  activatedAt?: FirestoreDateValue;
  completedAt?: FirestoreDateValue;
  amount: number;
  currency: ProgramCurrency;
  paymentStatus: PaymentStatus;
  selectedPaymentPlan?: ProgramPaymentPlanType;
  paymentPlanLabel?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  installmentCount?: number | null;
  installmentsPaid?: number;
  pendingPaymentId?: string;
  paymentId?: string;
  paymentMethod?: 'stripe' | 'mobile_money' | 'manual';
  paymentProvider?: string;
  paymentReference?: string;
  checkoutSessionId?: string;
  reviewStatus: ReviewStatus;
  orgId?: string | null;
  createdAt?: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
}

export interface CreateProgramEnrollmentPayload {
  learnerName: string;
  learnerEmail: string;
  learnerPhone: string;
  notes?: string;
}

export interface ProgramEnrollmentFilters {
  category?: ProgramCategory | 'ALL';
  status?: ProgramEnrollmentStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
  search?: string;
}

export interface ProgramCheckoutPlanOption {
  type: ProgramPaymentPlanType;
  label: string;
  amount: number;
  currency: ProgramCurrency;
  description: string;
  isRecurring: boolean;
  installmentCount?: number | null;
  stripePriceId?: string | null;
}

export interface UserProgramProgress {
  id: string;
  userId: string;
  programId: string;
  enrollmentId: string;
  progressPct: number;
  completedLessons: number;
  totalLessons: number;
  completedModules: number;
  totalModules: number;
  completedSimulations: number;
  totalSimulations: number;
  completedCaseStudies: number;
  totalCaseStudies: number;
  completedAssessments: number;
  totalAssessments: number;
  completedLabs: number;
  totalLabs: number;
  averageScore: number;
  readinessScore: number;
  streakDays: number;
  totalStudyMinutes: number;
  lastActivityAt?: FirestoreDateValue;
  status: ProgressStatus;
  updatedAt?: FirestoreDateValue;
}

export interface UserModuleProgress {
  id: string;
  userId: string;
  programId: string;
  moduleId: string;
  progressPct: number;
  completedLessons: number;
  totalLessons: number;
  averageScore: number;
  status: ProgressStatus;
  updatedAt?: FirestoreDateValue;
}

export interface UserSimulationAttempt {
  id: string;
  userId: string;
  programId: string;
  moduleId: string;
  simulationId: string;
  score: number;
  passed: boolean;
  timeSpentMin: number;
  completedAt?: FirestoreDateValue;
  analytics?: Record<string, unknown>;
}

export interface UserAssessmentAttempt {
  id: string;
  userId: string;
  programId: string;
  moduleId: string;
  assessmentId: string;
  score: number;
  passed: boolean;
  timeSpentMin: number;
  answers?: Record<string, string | string[]>;
  completedAt?: FirestoreDateValue;
}

export interface DashboardStatCards {
  overallProgressPct: number;
  readinessScore: number;
  averageScore: number;
  modulesCompleted: number;
  simulationsCompleted: number;
  caseStudiesCompleted: number;
  labsCompleted?: number;
  totalStudyMinutes: number;
  currentStreak: number;
  weakestArea: string;
  strongestArea: string;
  recommendedNextModule: string;
  recommendedNextAction: string;
  averageSimulationScore: number;
  caseStudyCompletionRate: number;
}

export type NursingNclexDomain =
  | 'Fundamentals'
  | 'Med-Surg'
  | 'Pharmacology'
  | 'Pediatrics'
  | 'Maternity'
  | 'Mental Health'
  | 'Leadership / Prioritization';

export interface ProgramDashboardViewModel {
  enrollment?: ProgramEnrollment;
  progress?: UserProgramProgress;
  modules: ProgramModule[];
  moduleProgress: UserModuleProgress[];
  simulationAttempts: UserSimulationAttempt[];
  assessmentAttempts: UserAssessmentAttempt[];
  stats: DashboardStatCards;
}

export interface ProgramCategoryOption {
  label: string;
  value: ProgramCategory;
}

export const PROGRAM_CATEGORY_LABELS: Record<ProgramCategory, string> = {
  [ProgramCategory.DEVOPS]: 'DevOps',
  [ProgramCategory.NCLEX]: 'NCLEX',
  [ProgramCategory.NURSING_PREP]: 'Nursing Prep',
  [ProgramCategory.DHA]: 'DHA',
  [ProgramCategory.DOH]: 'DOH',
  [ProgramCategory.CANADA_NCLEX]: 'Canada NCLEX',
  [ProgramCategory.OTHER]: 'Other',
};

export const PROGRAM_LEVEL_LABELS: Record<ProgramLevel, string> = {
  [ProgramLevel.BEGINNER]: 'Beginner',
  [ProgramLevel.INTERMEDIATE]: 'Intermediate',
  [ProgramLevel.ADVANCED]: 'Advanced',
};

export const PROGRAM_DELIVERY_MODE_LABELS: Record<ProgramDeliveryMode, string> = {
  [ProgramDeliveryMode.ONLINE]: 'Online',
  [ProgramDeliveryMode.ONSITE]: 'On-site',
  [ProgramDeliveryMode.HYBRID]: 'Hybrid',
};

export const PROGRAM_ENROLLMENT_STATUS_LABELS: Record<ProgramEnrollmentStatus, string> = {
  [ProgramEnrollmentStatus.PENDING]: 'Pending',
  [ProgramEnrollmentStatus.APPROVED]: 'Approved',
  [ProgramEnrollmentStatus.CONFIRMED]: 'Confirmed',
  [ProgramEnrollmentStatus.ACTIVE]: 'Active',
  [ProgramEnrollmentStatus.COMPLETED]: 'Completed',
  [ProgramEnrollmentStatus.CANCELLED]: 'Cancelled',
  [ProgramEnrollmentStatus.REJECTED]: 'Rejected',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'Unpaid',
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.REFUNDED]: 'Refunded',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING_REVIEW]: 'Pending Review',
  [ReviewStatus.APPROVED]: 'Approved',
  [ReviewStatus.DENIED]: 'Denied',
};

export const PROGRAM_LESSON_TYPE_LABELS: Record<ProgramLessonType, string> = {
  [ProgramLessonType.VIDEO]: 'Video',
  [ProgramLessonType.READING]: 'Reading',
  [ProgramLessonType.INTERACTIVE]: 'Interactive',
  [ProgramLessonType.LAB]: 'Lab',
  [ProgramLessonType.DOCUMENT]: 'Document',
  [ProgramLessonType.MIXED]: 'Mixed',
  [ProgramLessonType.WEB]: 'Web Page',
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  [SessionType.LIVE_LECTURE]: 'Live Lecture',
  [SessionType.WORKSHOP]: 'Workshop',
  [SessionType.Q_AND_A]: 'Q&A Session',
  [SessionType.REVIEW_SESSION]: 'Review Session',
  [SessionType.OFFICE_HOURS]: 'Office Hours',
};

export const DOCUMENT_FILE_TYPE_LABELS: Record<DocumentFileType, string> = {
  [DocumentFileType.PDF]: 'PDF',
  [DocumentFileType.DOCX]: 'Word',
  [DocumentFileType.PPTX]: 'PowerPoint',
  [DocumentFileType.XLSX]: 'Excel',
  [DocumentFileType.IMAGE]: 'Image',
  [DocumentFileType.OTHER]: 'Other',
};

export const PROGRAM_PAYMENT_PLAN_LABELS: Record<ProgramPaymentPlanType, string> = {
  one_time: 'One-time payment',
  monthly_subscription: 'Monthly subscription',
  installments: 'Installments',
};

export function resolveProgramCheckoutPlanOptions(program: Program): ProgramCheckoutPlanOption[] {
  const baseAmount = Number(program.discountPrice ?? program.price ?? 0);
  const currency = program.currency;
  const enabledPlans = Array.from(new Set(program.availablePaymentPlans?.length ? program.availablePaymentPlans : ['one_time']));
  const installmentCount = Number(program.installmentCount || 0) >= 2 ? Number(program.installmentCount) : null;

  return enabledPlans
    .map((plan): ProgramCheckoutPlanOption | null => {
      if (plan === 'monthly_subscription') {
        const amount = Number(program.monthlyPrice ?? baseAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return null;
        }

        return {
          type: plan,
          label: PROGRAM_PAYMENT_PLAN_LABELS[plan],
          amount,
          currency,
          description: 'Recurring monthly billing until cancellation.',
          isRecurring: true,
          stripePriceId: program.stripeMonthlyPriceId ?? null,
        };
      }

      if (plan === 'installments') {
        const fallbackAmount = installmentCount ? Math.round((baseAmount / installmentCount) * 100) / 100 : baseAmount;
        const amount = Number(program.installmentPrice ?? fallbackAmount);
        if (!Number.isFinite(amount) || amount <= 0 || !installmentCount) {
          return null;
        }

        return {
          type: plan,
          label: PROGRAM_PAYMENT_PLAN_LABELS[plan],
          amount,
          currency,
          description: `${installmentCount} scheduled monthly payments.`,
          isRecurring: true,
          installmentCount,
          stripePriceId: program.stripeInstallmentPriceId ?? null,
        };
      }

      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        return null;
      }

      return {
        type: 'one_time',
        label: PROGRAM_PAYMENT_PLAN_LABELS.one_time,
        amount: baseAmount,
        currency,
        description: 'Single payment for immediate access.',
        isRecurring: false,
        stripePriceId: program.stripeOneTimePriceId ?? null,
      };
    })
    .filter((plan): plan is ProgramCheckoutPlanOption => Boolean(plan));
}

export function resolveDefaultProgramCheckoutPlan(program: Program): ProgramCheckoutPlanOption | null {
  const options = resolveProgramCheckoutPlanOptions(program);
  if (!options.length) {
    return null;
  }

  const preferred = program.defaultPaymentPlan;
  return options.find((option) => option.type === preferred) || options[0];
}
