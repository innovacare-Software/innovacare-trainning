import { Timestamp } from '@angular/fire/firestore';

/* ─────────────────────────────────────────
   ENUMS
───────────────────────────────────────── */

export enum ContentModuleStatus {
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

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentFileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  PPTX = 'PPTX',
  XLSX = 'XLSX',
  IMAGE = 'IMAGE',
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

export enum ResourceType {
  GUIDE = 'GUIDE',
  HANDOUT = 'HANDOUT',
  WORKSHEET = 'WORKSHEET',
  SLIDE_DECK = 'SLIDE_DECK',
  LINK = 'LINK',
  OTHER = 'OTHER',
}

/* ─────────────────────────────────────────
   LABEL MAPS
───────────────────────────────────────── */

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  [LessonType.VIDEO]: 'Video',
  [LessonType.TEXT]: 'Text',
  [LessonType.DOCUMENT]: 'Document',
  [LessonType.MIXED]: 'Mixed',
};

export const DOCUMENT_FILE_TYPE_LABELS: Record<DocumentFileType, string> = {
  [DocumentFileType.PDF]: 'PDF',
  [DocumentFileType.DOCX]: 'Word Document',
  [DocumentFileType.PPTX]: 'PowerPoint',
  [DocumentFileType.XLSX]: 'Excel',
  [DocumentFileType.IMAGE]: 'Image',
  [DocumentFileType.OTHER]: 'Other',
};

export const LIVE_SESSION_TYPE_LABELS: Record<LiveSessionType, string> = {
  [LiveSessionType.LIVE_CLASS]: 'Live Class',
  [LiveSessionType.WEEKEND_PRACTICE]: 'Weekend Practice',
  [LiveSessionType.REVIEW_SESSION]: 'Review Session',
  [LiveSessionType.COACHING]: 'Coaching Session',
  [LiveSessionType.GROUP_QA]: 'Group Q&A',
};

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  [AssessmentType.QUIZ]: 'Quiz',
  [AssessmentType.MOCK_EXAM]: 'Mock Exam',
  [AssessmentType.READINESS_TEST]: 'Readiness Test',
};

export const SIMULATION_TYPE_LABELS: Record<SimulationType, string> = {
  [SimulationType.CBT]: 'CBT Simulation',
  [SimulationType.TIMED_SIMULATION]: 'Timed Simulation',
  [SimulationType.READINESS_SIMULATION]: 'Readiness Simulation',
};

export const SIMULATION_DIFFICULTY_LABELS: Record<SimulationDifficulty, string> = {
  [SimulationDifficulty.EASY]: 'Easy',
  [SimulationDifficulty.MEDIUM]: 'Medium',
  [SimulationDifficulty.HARD]: 'Hard',
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'Draft',
  [ContentStatus.PUBLISHED]: 'Published',
  [ContentStatus.ARCHIVED]: 'Archived',
};

export const CASE_STUDY_SCORING_LABELS: Record<CaseStudyScoringMode, string> = {
  [CaseStudyScoringMode.MANUAL]: 'Manual',
  [CaseStudyScoringMode.AUTO]: 'Auto',
  [CaseStudyScoringMode.HYBRID]: 'Hybrid',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  [ResourceType.GUIDE]: 'Study Guide',
  [ResourceType.HANDOUT]: 'Handout',
  [ResourceType.WORKSHEET]: 'Worksheet',
  [ResourceType.SLIDE_DECK]: 'Slide Deck',
  [ResourceType.LINK]: 'Link',
  [ResourceType.OTHER]: 'Other',
};

/* ─────────────────────────────────────────
   PROGRAM CONTENT MODULE
   Firestore: /programs/{id}/modules/{id}
───────────────────────────────────────── */

export interface ProgramContentModule {
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
  status: ContentModuleStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateModulePayload = Omit<ProgramContentModule, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM LESSON
   Firestore: /programs/{id}/lessons/{id}
───────────────────────────────────────── */

export interface ProgramContentLesson {
  id: string;
  programId: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string;
  lessonType: LessonType;
  contentHtml: string;
  videoUrl: string;
  durationMin: number;
  order: number;
  isPreview: boolean;
  downloadable: boolean;
  active: boolean;
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateLessonPayload = Omit<ProgramContentLesson, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM DOCUMENT
   Firestore: /programs/{id}/documents/{id}
───────────────────────────────────────── */

export interface ProgramContentDocument {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: DocumentFileType;
  downloadable: boolean;
  order: number;
  active: boolean;
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateDocumentPayload = Omit<ProgramContentDocument, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM LIVE SESSION
   Firestore: /programs/{id}/liveSessions/{id}
───────────────────────────────────────── */

export interface ProgramLiveSession {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  sessionType: LiveSessionType;
  startAt: Timestamp;
  endAt: Timestamp;
  timezone: string;
  meetingUrl: string;
  instructorName: string;
  required: boolean;
  capacity: number;
  active: boolean;
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateLiveSessionPayload = Omit<ProgramLiveSession, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM ASSESSMENT
   Firestore: /programs/{id}/assessments/{id}
───────────────────────────────────────── */

export interface ProgramContentAssessment {
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
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateAssessmentPayload = Omit<ProgramContentAssessment, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM SIMULATION
   Firestore: /programs/{id}/simulations/{id}
───────────────────────────────────────── */

export interface ProgramContentSimulation {
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
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateSimulationPayload = Omit<ProgramContentSimulation, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM CASE STUDY
   Firestore: /programs/{id}/caseStudies/{id}
───────────────────────────────────────── */

export interface ProgramContentCaseStudy {
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
  status: ContentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateCaseStudyPayload = Omit<ProgramContentCaseStudy, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   PROGRAM RESOURCE
   Firestore: /programs/{id}/resources/{id}
───────────────────────────────────────── */

export interface ProgramContentResource {
  id: string;
  programId: string;
  moduleId: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  fileUrl: string;
  externalUrl: string;
  downloadable: boolean;
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateResourcePayload = Omit<ProgramContentResource, 'id' | 'createdAt' | 'updatedAt'>;

/* ─────────────────────────────────────────
   CONTENT STATS (Dashboard)
───────────────────────────────────────── */

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

export interface ContentReadinessItem {
  key: string;
  label: string;
  ok: boolean;
  message: string;
}

export interface ProgramContentReadiness {
  score: number;
  items: ContentReadinessItem[];
  isReady: boolean;
}

export interface ContentOverviewModule {
  module: ProgramContentModule;
  lessonCount: number;
  assessmentCount: number;
  simulationCount: number;
  caseStudyCount: number;
  liveSessionCount: number;
}
