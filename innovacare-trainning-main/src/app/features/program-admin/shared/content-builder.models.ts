// ---- Enums ----

export enum ContentItemStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  MIXED = 'MIXED',
}

export enum DocumentFileType {
  PDF = 'PDF',
  SLIDES = 'SLIDES',
  WORKSHEET = 'WORKSHEET',
  GUIDE = 'GUIDE',
  HANDOUT = 'HANDOUT',
  OTHER = 'OTHER',
}

export enum LiveSessionType {
  LIVE_CLASS = 'LIVE_CLASS',
  WEEKEND_PRACTICE = 'WEEKEND_PRACTICE',
  REVIEW_SESSION = 'REVIEW_SESSION',
  COACHING = 'COACHING',
  GROUP_QA = 'GROUP_QA',
}

export enum AssessmentType {
  QUIZ = 'QUIZ',
  MOCK_EXAM = 'MOCK_EXAM',
  READINESS_TEST = 'READINESS_TEST',
}

export enum SimulationType {
  CBT = 'CBT',
  TIMED_SIMULATION = 'TIMED_SIMULATION',
  READINESS_SIMULATION = 'READINESS_SIMULATION',
}

export enum SimulationDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum CaseStudyScoringMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
  HYBRID = 'HYBRID',
}

// ---- Interfaces ----

export interface ProgramModule {
  id: string;
  programId: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  estimatedHours: number;
  objectives: string[];
  required: boolean;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramLesson {
  id: string;
  programId: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string;
  lessonType: LessonType;
  contentHtml: string;
  videoUrl?: string;
  durationMin: number;
  order: number;
  isPreview: boolean;
  downloadable: boolean;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramDocument {
  id: string;
  programId: string;
  moduleId?: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: DocumentFileType;
  downloadable: boolean;
  order: number;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramLiveSession {
  id: string;
  programId: string;
  moduleId?: string;
  title: string;
  description: string;
  sessionType: LiveSessionType;
  startAt: unknown;
  endAt: unknown;
  timezone: string;
  meetingUrl: string;
  instructorName: string;
  required: boolean;
  capacity: number;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramAssessment {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  assessmentType: AssessmentType;
  passingScore: number;
  durationMin: number;
  questionCount: number;
  order: number;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramSimulation {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  simulationType: SimulationType;
  questionCount: number;
  durationMin: number;
  passingScore: number;
  difficulty: SimulationDifficulty;
  order: number;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramCaseStudy {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  scenario: string;
  prompts: string[];
  scoringMode: CaseStudyScoringMode;
  order: number;
  active: boolean;
  status: ContentItemStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramContentStats {
  modulesCount: number;
  lessonsCount: number;
  documentsCount: number;
  liveSessionsCount: number;
  assessmentsCount: number;
  simulationsCount: number;
  caseStudiesCount: number;
  resourcesCount: number;
}

export interface ProgramContentReadiness {
  hasModules: boolean;
  hasLessons: boolean;
  hasAssessments: boolean;
  hasSimulations: boolean;
  hasLiveSessions: boolean;
  hasDocuments: boolean;
  hasCaseStudies: boolean;
  completenessScore: number;
}

// ---- Label Maps ----

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  [LessonType.VIDEO]: 'Video',
  [LessonType.TEXT]: 'Text',
  [LessonType.DOCUMENT]: 'Document',
  [LessonType.MIXED]: 'Mixed',
};

export const LIVE_SESSION_TYPE_LABELS: Record<LiveSessionType, string> = {
  [LiveSessionType.LIVE_CLASS]: 'Live Class',
  [LiveSessionType.WEEKEND_PRACTICE]: 'Weekend Practice',
  [LiveSessionType.REVIEW_SESSION]: 'Review Session',
  [LiveSessionType.COACHING]: 'Coaching',
  [LiveSessionType.GROUP_QA]: 'Group Q&A',
};

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  [AssessmentType.QUIZ]: 'Quiz',
  [AssessmentType.MOCK_EXAM]: 'Mock Exam',
  [AssessmentType.READINESS_TEST]: 'Readiness Test',
};

export const SIMULATION_TYPE_LABELS: Record<SimulationType, string> = {
  [SimulationType.CBT]: 'CBT',
  [SimulationType.TIMED_SIMULATION]: 'Timed Simulation',
  [SimulationType.READINESS_SIMULATION]: 'Readiness Simulation',
};

export const SIMULATION_DIFFICULTY_LABELS: Record<SimulationDifficulty, string> = {
  [SimulationDifficulty.EASY]: 'Easy',
  [SimulationDifficulty.MEDIUM]: 'Medium',
  [SimulationDifficulty.HARD]: 'Hard',
};

export const DOCUMENT_FILE_TYPE_LABELS: Record<DocumentFileType, string> = {
  [DocumentFileType.PDF]: 'PDF',
  [DocumentFileType.SLIDES]: 'Slides',
  [DocumentFileType.WORKSHEET]: 'Worksheet',
  [DocumentFileType.GUIDE]: 'Study Guide',
  [DocumentFileType.HANDOUT]: 'Handout',
  [DocumentFileType.OTHER]: 'Other',
};

export const CASE_STUDY_SCORING_LABELS: Record<CaseStudyScoringMode, string> = {
  [CaseStudyScoringMode.MANUAL]: 'Manual',
  [CaseStudyScoringMode.AUTO]: 'Auto',
  [CaseStudyScoringMode.HYBRID]: 'Hybrid',
};

export const CONTENT_STATUS_LABELS: Record<ContentItemStatus, string> = {
  [ContentItemStatus.DRAFT]: 'Draft',
  [ContentItemStatus.PUBLISHED]: 'Published',
  [ContentItemStatus.ARCHIVED]: 'Archived',
};
