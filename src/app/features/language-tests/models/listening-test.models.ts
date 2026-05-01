import { Timestamp } from '@angular/fire/firestore';

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

export enum AssessmentType {
  QUIZ = 'QUIZ',
  CASE_STUDY = 'CASE_STUDY',
  SIMULATION = 'SIMULATION',
  LISTENING_TEST = 'LISTENING_TEST',
  WRITING_SUBMISSION = 'WRITING_SUBMISSION',
  SPEAKING_SUBMISSION = 'SPEAKING_SUBMISSION',
  MOCK_EXAM = 'MOCK_EXAM',
}

export enum ListeningMode {
  PRACTICE = 'PRACTICE',
  MOCK_EXAM = 'MOCK_EXAM',
}

export enum TargetTest {
  IELTS = 'IELTS',
  TEF = 'TEF',
  TEF_CANADA = 'TEF_CANADA',
  TEF_QUEBEC = 'TEF_QUEBEC',
  OET = 'OET',
}

export enum ListeningSkill {
  LISTENING = 'LISTENING',
  COMPREHENSION_ORALE = 'COMPREHENSION_ORALE',
}

export enum ListeningQuestionMode {
  single = 'single',
  multi = 'multi',
  short_text = 'short_text',
  fill_blank = 'fill_blank',
  matching = 'matching',
  true_false = 'true_false',
  dropdown = 'dropdown',
}

export enum ListeningErrorCategory {
  VOCABULARY = 'VOCABULARY',
  ACCENT = 'ACCENT',
  SPEED = 'SPEED',
  DISTRACTOR = 'DISTRACTOR',
  INFERENCE = 'INFERENCE',
  SPELLING = 'SPELLING',
  NUMBER_DATE = 'NUMBER_DATE',
  ATTENTION_LOSS = 'ATTENTION_LOSS',
  TIME_PRESSURE = 'TIME_PRESSURE',
  PARAPHRASE = 'PARAPHRASE',
  UNKNOWN = 'UNKNOWN',
}

// ─────────────────────────────────────────────────────────────────
// HUMAN-READABLE LABELS
// ─────────────────────────────────────────────────────────────────

export const TARGET_TEST_LABELS: Record<TargetTest, string> = {
  [TargetTest.IELTS]: 'IELTS',
  [TargetTest.TEF]: 'TEF',
  [TargetTest.TEF_CANADA]: 'TEF Canada',
  [TargetTest.TEF_QUEBEC]: 'TEF Québec',
  [TargetTest.OET]: 'OET',
};

export const ERROR_CATEGORY_LABELS: Record<ListeningErrorCategory, string> = {
  [ListeningErrorCategory.VOCABULARY]: 'Vocabulary',
  [ListeningErrorCategory.ACCENT]: 'Accent / Pronunciation',
  [ListeningErrorCategory.SPEED]: 'Speech Speed',
  [ListeningErrorCategory.DISTRACTOR]: 'Distractor Trap',
  [ListeningErrorCategory.INFERENCE]: 'Inference / Implication',
  [ListeningErrorCategory.SPELLING]: 'Spelling',
  [ListeningErrorCategory.NUMBER_DATE]: 'Number / Date',
  [ListeningErrorCategory.ATTENTION_LOSS]: 'Attention Loss',
  [ListeningErrorCategory.TIME_PRESSURE]: 'Time Pressure',
  [ListeningErrorCategory.PARAPHRASE]: 'Paraphrase Recognition',
  [ListeningErrorCategory.UNKNOWN]: 'Unknown',
};

// ─────────────────────────────────────────────────────────────────
// INTERFACES — ASSESSMENT DEFINITION
// ─────────────────────────────────────────────────────────────────

export interface ListeningAudioSettings {
  allowReplay: boolean;
  maxPlays: number;
  showControls: boolean;
  disableSeeking: boolean;
  autoStart: boolean;
  requireHeadphonesConfirmation: boolean;
  showTranscriptAfterSubmit: boolean;
}

export interface ListeningChoice {
  id: string;
  text: string;
  correct?: boolean;
}

export interface ListeningMatchingPair {
  left: string;
  right: string;
}

export interface ListeningQuestion {
  id: string;
  prompt: string;
  mode: ListeningQuestionMode;
  points?: number;
  correctAnswerKey?: string[];
  choices?: ListeningChoice[];
  acceptedAnswers?: string[];
  matchingPairs?: ListeningMatchingPair[];
  matchingOptions?: string[]; // right-hand options shown to learner
  explanation?: string;
  rationale?: string;
  transcriptReference?: string;
  errorCategoryHint?: ListeningErrorCategory;
}

export interface PostSubmissionReviewConfig {
  showScore: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  showTranscript: boolean;
  requireErrorReflection: boolean;
}

export interface ListeningTestAssessment {
  id: string;
  title: string;
  slug: string;
  description: string;
  assessmentType: 'LISTENING_TEST';
  targetTest: TargetTest;
  skill: ListeningSkill;
  language: 'en' | 'fr';
  level?: string;
  professionalContext?: string;
  scenario?: string;
  durationMin: number;
  passingScore: number;
  mode: ListeningMode;
  audioUrl: string;
  audioStoragePath?: string;
  transcript?: string;
  transcriptUrl?: string;
  audioSettings: ListeningAudioSettings;
  errorLogRequired: boolean;
  errorCategories: ListeningErrorCategory[];
  questions: ListeningQuestion[];
  postSubmissionReview: PostSubmissionReviewConfig;
  attemptLimit?: number;
  allowRetake?: boolean;
  autoSubmitOnTimeout?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ─────────────────────────────────────────────────────────────────
// INTERFACES — LEARNER ANSWERS & RESULTS
// ─────────────────────────────────────────────────────────────────

export interface ListeningMatchingAnswer {
  left: string;
  selectedRight: string;
}

export interface ListeningAnswer {
  questionId: string;
  mode: ListeningQuestionMode;
  selectedAnswerKeys?: string[];
  textAnswer?: string;
  matchingAnswers?: ListeningMatchingAnswer[];
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface ListeningErrorReflection {
  questionId: string;
  selectedCategory: ListeningErrorCategory;
  learnerExplanation?: string;
  correctionPlan?: string;
}

export interface ListeningTestResult {
  id: string;
  learnerId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  assessmentId: string;
  targetTest: TargetTest;
  mode: ListeningMode;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: ListeningAnswer[];
  errorLog?: ListeningErrorReflection[];
  errorLogCompleted?: boolean;
  audioPlayCount: number;
  durationUsedSeconds: number;
  instructorNotes?: { note: string; reviewerUid: string; createdAt: Timestamp }[];
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  startedAt: Timestamp;
  submittedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────
// GRADING OUTPUT
// ─────────────────────────────────────────────────────────────────

export interface GradingResult {
  answers: ListeningAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
}

// ─────────────────────────────────────────────────────────────────
// PROGRESS COMPLETION MODES
// ─────────────────────────────────────────────────────────────────

export enum ListeningCompletionMode {
  LISTENING_TEST_SUBMITTED = 'LISTENING_TEST_SUBMITTED',
  LISTENING_TEST_PASSED = 'LISTENING_TEST_PASSED',
  LISTENING_ERROR_LOG_COMPLETED = 'LISTENING_ERROR_LOG_COMPLETED',
  LISTENING_MOCK_COMPLETED = 'LISTENING_MOCK_COMPLETED',
}
