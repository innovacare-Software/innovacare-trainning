import {
  PAYMENT_STATUS_LABELS,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  PROGRAM_LEVEL_LABELS,
  ProgramCategory,
  ProgramDeliveryMode,
  ProgramEnrollmentStatus,
  ProgramLevel,
  ProgramStatus,
  PaymentStatus,
  ReviewStatus,
} from '../../publics/programs/program.models';
import type {
  Program,
  ProgramEnrollment,
  UserProgramProgress,
} from '../../publics/programs/program.models';

export type {
  Program,
  ProgramEnrollment,
  UserProgramProgress,
};

export {
  PAYMENT_STATUS_LABELS,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_ENROLLMENT_STATUS_LABELS,
  PROGRAM_LEVEL_LABELS,
  ProgramCategory,
  ProgramDeliveryMode,
  ProgramEnrollmentStatus,
  ProgramLevel,
  ProgramStatus,
  PaymentStatus,
  ReviewStatus,
};

export interface ProgramAdminStatCards {
  totalPrograms: number;
  activePrograms: number;
  publishedPrograms: number;
  pendingEnrollments: number;
  activeLearners: number;
  completedLearners: number;
  averageReadinessScore: number;
  completionRate: number;
}

export interface CategoryBreakdownItem {
  category: ProgramCategory;
  count: number;
}

export interface EnrollmentStatusBreakdownItem {
  status: ProgramEnrollmentStatus;
  count: number;
}
