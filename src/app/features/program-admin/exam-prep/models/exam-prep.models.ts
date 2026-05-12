export type JurisdictionCode = 'US' | 'Canada' | 'UAE-DHA' | 'UAE-DOH';

export type ExamProgramId = 'nclex-rn-prep' | 'nclex-pn-prep' | 'uae-nursing-licensure-prep';

export type ExamTrackCode = 'NCLEX-RN' | 'NCLEX-PN' | 'DHA' | 'DOH';

export type CourseGroupId =
  | 'exam-strategy-ngn'
  | 'leadership-communication-ethics'
  | 'fundamentals-safety-basic-nursing'
  | 'pharmacology'
  | 'adult-health-med-surg'
  | 'maternal-newborn-reproductive'
  | 'pediatrics'
  | 'mental-health-wellness';

export type QuestionItemType =
  | 'single_choice'
  | 'multiple_response'
  | 'true_false'
  | 'ordered_response'
  | 'select_all_that_apply'
  | 'case_study_bundle'
  | 'matrix_multiple_choice'
  | 'matrix_multiple_response'
  | 'bow_tie'
  | 'cloze_drop_down'
  | 'trend_analysis'
  | 'highlight_text'
  | 'rationale_pairing'
  | 'drag_and_drop_ordering';

export type CognitiveLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'clinical_judgment';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type WorkflowStatus =
  | 'draft'
  | 'internal_review'
  | 'sme_review'
  | 'approved'
  | 'published'
  | 'retired';

export type AssessmentFamily = 'module_assessment' | 'comprehensive_assessment';

export type AssessmentMode =
  | 'module_quiz'
  | 'module_final'
  | 'competency_check'
  | 'case_simulation'
  | 'comprehensive_mock_fixed'
  | 'comprehensive_mock_progressive'
  | 'comprehensive_ngn_mock'
  | 'jurisdiction_readiness_exam'
  | 'preboard_final_exam'
  | 'cat_like_mock'
  | 'adaptive_remediation_exam';

export type AssessmentSourceMode = 'fixed_static' | 'filtered_bank_draw' | 'blueprint_assembled';

export type ReviewMode =
  | 'no_review'
  | 'summary_only'
  | 'show_answers'
  | 'show_rationales'
  | 'full_review';

export type AttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'auto_submitted'
  | 'timed_out'
  | 'abandoned';

export interface AuditMetadata {
  createdAt: unknown;
  updatedAt: unknown;
  createdBy: string;
  updatedBy?: string;
}

export interface ContentSourceReference {
  sourceAuthority: string;
  sourceReferenceTitle: string;
  sourceReferenceUrl?: string | null;
  sourceVersionDate: string;
  jurisdictionNotes?: string | null;
}

export interface ExamProgram extends AuditMetadata {
  id: ExamProgramId;
  organizationId: string;
  title: string;
  slug: string;
  description: string;
  jurisdictions: JurisdictionCode[];
  examTracks: ExamTrackCode[];
  active: boolean;
}

export interface ExamCourseGroup extends AuditMetadata {
  id: CourseGroupId;
  organizationId: string;
  title: string;
  slug: string;
  order: number;
  programIds: ExamProgramId[];
  jurisdictions: JurisdictionCode[];
  tags: string[];
  active: boolean;
}

export interface ExamModule extends AuditMetadata {
  id: string;
  organizationId: string;
  courseGroupId: CourseGroupId;
  courseGroupTitle: string;
  title: string;
  slug: string;
  order: number;
  programIds: ExamProgramId[];
  jurisdictions: JurisdictionCode[];
  tags: string[];
  active: boolean;
}

export interface AnswerChoice {
  id: string;
  label: string;
  text: string;
  rationale?: string | null;
}

export interface QuestionInteractionPart {
  id: string;
  label: string;
  prompt: string;
  selectionMode: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  optionIds: string[];
}

export interface BowTieInteractionConfig {
  kind: 'bow_tie';
  instructions?: string | null;
  parts: QuestionInteractionPart[];
}

export interface ClozeInteractionSegment {
  id: string;
  label: string;
  placeholder: string;
  optionIds: string[];
  correctOptionId: string;
}

export interface ClozeInteractionConfig {
  kind: 'cloze_drop_down';
  instructions?: string | null;
  segments: ClozeInteractionSegment[];
}

export interface MatrixInteractionRow {
  id: string;
  label: string;
  prompt?: string | null;
}

export interface MatrixInteractionColumn {
  id: string;
  label: string;
  text: string;
}

export interface MatrixInteractionConfig {
  kind: 'matrix_multiple_choice' | 'matrix_multiple_response';
  instructions?: string | null;
  rows: MatrixInteractionRow[];
  columns: MatrixInteractionColumn[];
  correctResponse: Record<string, string[]>;
}

export interface TrendMetricConfig {
  id: string;
  label: string;
  values: string[];
}

export interface TrendAnalysisInteractionConfig {
  kind: 'trend_analysis';
  instructions?: string | null;
  metrics: TrendMetricConfig[];
  correctInterpretations: string[];
}

export type QuestionInteractionConfig =
  | BowTieInteractionConfig
  | ClozeInteractionConfig
  | MatrixInteractionConfig
  | TrendAnalysisInteractionConfig;

export interface CaseStudyPatientContext {
  vignette: string;
  demographics: string;
  history: string;
  allergies: string[];
  currentMeds: string[];
  labs: string[];
  vitalSigns: string[];
  nursingNotes: string[];
  providerNotes: string[];
  imagingSnippets: string[];
  trendUpdates: string[];
}

export interface CaseStudyBundle extends AuditMetadata {
  id: string;
  organizationId: string;
  programId: ExamProgramId;
  programTitle: string;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  courseGroupId: CourseGroupId;
  courseGroupTitle: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  slug: string;
  workflowStatus: WorkflowStatus;
  active: boolean;
  sharedContext: CaseStudyPatientContext;
  childItemIds: string[];
  sequenceOrder: number[];
  scoringNotes?: string | null;
  partialCreditStrategy?: 'none' | 'future_supported';
  authorNotes?: string | null;
  reviewerNotes?: string | null;
  sourceReferences: ContentSourceReference[];
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  version: number;
}

export interface QuestionBankItem extends AuditMetadata {
  id: string;
  organizationId: string;
  /**
   * Multi-tenant discriminator. Defaults to 'exam_prep' for backward compatibility
   * with existing NCLEX/DHA/DOH content. General training items can use the broader
   * BlueprintType options.
   */
  blueprintType?: BlueprintType;
  /** Optional generic taxonomy for non-exam_prep items. */
  category?: string;
  topic?: string;
  programId: ExamProgramId;
  programTitle: string;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  courseGroupId: CourseGroupId;
  courseGroupTitle: string;
  moduleId: string;
  moduleTitle: string;
  parentCaseId?: string | null;
  itemType: QuestionItemType;
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel;
  stem: string;
  scenarioText?: string | null;
  leadInQuestion: string;
  interactionConfig?: QuestionInteractionConfig | null;
  choices: AnswerChoice[];
  correctAnswerKey: string[];
  explanation: string;
  rationale: string;
  distractorRationale?: Record<string, string> | null;
  learningObjectives: string[];
  tags: string[];
  sourceAuthority: string;
  sourceReferenceTitle: string;
  sourceReferenceUrl?: string | null;
  sourceVersionDate: string;
  jurisdictionNotes?: string | null;
  points: number;
  estimatedTimeSeconds: number;
  active: boolean;
  workflowStatus: WorkflowStatus;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
  version: number;
  remediationModuleIds: string[];
  remediationLessonIds: string[];
  remediationTags: string[];
  exposureCount?: number;
  qualityScore?: number | null;
  discriminationIndex?: number | null;
  confidenceScore?: number | null;
}

export interface BlueprintDistributionRule {
  key: string;
  label: string;
  minCount?: number;
  targetCount?: number;
  maxCount?: number;
  targetPercent?: number;
}

export interface BlueprintDifficultySection {
  id: string;
  title: string;
  sequence: number;
  questionCount: number;
  caseStudyCount: number;
  allowedDifficulties: DifficultyLevel[];
  requiredTags: string[];
  recommendedItemTypes: QuestionItemType[];
}

/**
 * Discriminator for the blueprint kind. Existing NCLEX-style blueprints
 * default to `exam_prep`; partner organizations can author general training
 * blueprints across many domains without inheriting NCLEX-specific rules.
 */
export type BlueprintType =
  | 'exam_prep'
  | 'course_training'
  | 'certificate_program'
  | 'compliance_training'
  | 'professional_development'
  | 'language_training'
  | 'ai_training'
  | 'accounting_training'
  | 'public_procurement'
  | 'decentralization'
  | 'healthcare_training'
  | 'custom';

export const BLUEPRINT_TYPES: readonly BlueprintType[] = [
  'exam_prep',
  'course_training',
  'certificate_program',
  'compliance_training',
  'professional_development',
  'language_training',
  'ai_training',
  'accounting_training',
  'public_procurement',
  'decentralization',
  'healthcare_training',
  'custom',
] as const;

export const BLUEPRINT_TYPE_LABELS: Record<BlueprintType, string> = {
  exam_prep: 'Exam preparation (NCLEX / DHA / DOH)',
  course_training: 'Course training',
  certificate_program: 'Certificate program',
  compliance_training: 'Compliance training',
  professional_development: 'Professional development',
  language_training: 'Language training',
  ai_training: 'AI training',
  accounting_training: 'Accounting training',
  public_procurement: 'Public procurement',
  decentralization: 'Decentralization',
  healthcare_training: 'Healthcare training',
  custom: 'Custom program',
};

export type BlueprintDeliveryMode = 'self_paced' | 'live' | 'hybrid' | 'in_person';
export type BlueprintLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExamBlueprint extends AuditMetadata {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  description: string;
  /**
   * Discriminator. Defaults to `exam_prep` for backward compatibility with
   * existing NCLEX/DHA/DOH blueprints. UI must hide NCLEX-only fields when
   * this is anything other than `exam_prep`.
   */
  blueprintType?: BlueprintType;
  assessmentFamily: AssessmentFamily;
  programId: ExamProgramId;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  totalQuestionCount: number;
  caseStudyBundleQuota: number;
  clinicalJudgmentQuota: number;
  timeBudgetMinutes: number;
  noDuplicateRules: boolean;
  exposureBalancing: boolean;
  sequencingRules: string[];
  courseGroupDistributions: BlueprintDistributionRule[];
  moduleDistributions: BlueprintDistributionRule[];
  tagDistributions: BlueprintDistributionRule[];
  itemTypeDistributions: BlueprintDistributionRule[];
  difficultyDistributions: BlueprintDistributionRule[];
  progressiveSections: BlueprintDifficultySection[];
  active: boolean;

  // ---- General training fields (optional, used when blueprintType !== 'exam_prep') ----
  category?: string;
  targetAudience?: string;
  level?: BlueprintLevel;
  deliveryMode?: BlueprintDeliveryMode;
  language?: string;
  certificateEnabled?: boolean;
  assessmentRequired?: boolean;
  passingScore?: number;
  durationHours?: number;
  completionRequirements?: string[];
  practicalChecklist?: string[];
  finalAssessmentEnabled?: boolean;
}

export interface AssessmentSectionDefinition {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  caseStudyCount: number;
  allowedDifficulties: DifficultyLevel[];
  requiredTags: string[];
  navigationLocked: boolean;
  reviewLocked: boolean;
}

export interface AssessmentDefinition extends AuditMetadata {
  id: string;
  organizationId: string;
  /**
   * Multi-tenant discriminator. Defaults to 'exam_prep' for backward compatibility.
   */
  blueprintType?: BlueprintType;
  assessmentFamily: AssessmentFamily;
  assessmentMode: AssessmentMode;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  programId: ExamProgramId;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  courseGroupId?: CourseGroupId | null;
  moduleId?: string | null;
  sourceMode: AssessmentSourceMode;
  blueprintMode: 'single_blueprint' | 'sectioned_blueprint' | 'manual';
  fixedQuestionIds?: string[];
  blueprintId?: string | null;
  randomizeQuestionOrder: boolean;
  randomizeChoiceOrder: boolean;
  drawCount: number;
  caseStudyCount: number;
  durationMinutes: number;
  passingScorePercent: number;
  maxAttempts: number;
  allowRetake: boolean;
  requireAllQuestionsAnswered: boolean;
  autoSubmitOnTimeout: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswersAfterSubmit: boolean;
  showRationalesAfterSubmit: boolean;
  showCategoryBreakdown: boolean;
  reviewMode: ReviewMode;
  active: boolean;
  publishStatus: WorkflowStatus;
  sections: AssessmentSectionDefinition[];
  strictNavigation: boolean;
  allowQuestionFlagging: boolean;
  allowBackNavigation: boolean;
}

export interface AttemptAnswer {
  itemId: string;
  itemType: QuestionItemType;
  selectedAnswerKeys: string[];
  pointsEarned: number;
  pointsPossible: number;
  isCorrect: boolean;
  markedForReview: boolean;
  timeSpentSeconds: number;
  answeredAt?: unknown;
}

export interface AttemptSession extends AuditMetadata {
  id: string;
  organizationId: string;
  assemblyId?: string | null;
  learnerId: string;
  learnerName?: string | null;
  programId: ExamProgramId;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  assessmentId: string;
  assessmentTitle: string;
  assessmentMode: AssessmentMode;
  attemptNumber: number;
  status: AttemptStatus;
  deliveredQuestionIds: string[];
  deliveredCaseStudyIds: string[];
  deliveredOrder: string[];
  currentIndex: number;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  sectionTransitions: string[];
  timeLimitSeconds: number;
  elapsedSeconds: number;
  startedAt: unknown;
  submittedAt?: unknown;
  timedOutAt?: unknown;
  scorePercent?: number;
  passed?: boolean;
  answerSnapshotPath?: string | null;
}

export interface AssessmentAssembly extends AuditMetadata {
  id: string;
  organizationId: string;
  learnerId: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentMode: AssessmentMode | string;
  publicProgramId?: string | null;
  programId: ExamProgramId | string;
  jurisdiction?: JurisdictionCode | string;
  examTrack?: ExamTrackCode | string;
  itemOrder: string[];
  itemCount: number;
  reviewMode: ReviewMode | string;
  sourceMode?: AssessmentSourceMode | string;
  blueprintId?: string | null;
}

export interface LearnerAttemptResponse extends AuditMetadata {
  id: string;
  attemptId: string;
  assessmentId: string;
  assemblyId?: string | null;
  learnerId: string;
  itemId: string;
  selectedAnswerKeys: string[];
  flagged: boolean;
  visited: boolean;
  locked: boolean;
  questionStatus: string;
  responseTimeSeconds: number;
}

export interface LearnerReviewSnapshot extends AuditMetadata {
  id: string;
  organizationId: string;
  attemptId: string;
  learnerId: string;
  assessmentId: string;
  scorePercent: number;
  pointsEarned: number;
  totalPoints: number;
  passFail: 'pass' | 'fail';
  domainScores: Record<string, number>;
  moduleScores: Record<string, number>;
  tagScores: Record<string, number>;
  clinicalJudgmentScores: Record<string, number>;
  caseStudyScores: Record<string, number>;
  remediationModuleIds: string[];
  remediationLessonIds: string[];
  remediationTags: string[];
}

export interface JurisdictionOverlay extends AuditMetadata {
  id: string;
  organizationId: string;
  jurisdiction: JurisdictionCode;
  examTrack: ExamTrackCode;
  title: string;
  notes: string;
  requiredTags: string[];
  excludedTags: string[];
  requiredModuleIds: string[];
  blueprintAdjustments: BlueprintDistributionRule[];
  active: boolean;
}

export interface AssessmentScoringBreakdown {
  rawScore: number;
  percentScore: number;
  pointsEarned: number;
  totalPoints: number;
  domainScores: Record<string, number>;
  moduleScores: Record<string, number>;
  tagScores: Record<string, number>;
  clinicalJudgmentScores: Record<string, number>;
  caseStudyScores: Record<string, number>;
}

export interface QuestionBankSearchFilters {
  text: string;
  workflowStatus: 'all' | WorkflowStatus;
  programId: 'all' | ExamProgramId;
  jurisdiction: 'all' | JurisdictionCode;
  courseGroupId: 'all' | CourseGroupId;
  moduleId: 'all' | string;
  difficulty: 'all' | DifficultyLevel;
  itemType: 'all' | QuestionItemType;
  tag: string;
}

export const WORKFLOW_STATUS_OPTIONS: WorkflowStatus[] = [
  'draft',
  'internal_review',
  'sme_review',
  'approved',
  'published',
  'retired',
];

export const QUESTION_ITEM_TYPE_OPTIONS: QuestionItemType[] = [
  'single_choice',
  'multiple_response',
  'true_false',
  'ordered_response',
  'select_all_that_apply',
  'case_study_bundle',
  'matrix_multiple_choice',
  'matrix_multiple_response',
  'bow_tie',
  'cloze_drop_down',
  'trend_analysis',
  'highlight_text',
  'rationale_pairing',
  'drag_and_drop_ordering',
];

export const EXAM_TRACK_OPTIONS: ExamTrackCode[] = ['NCLEX-RN', 'NCLEX-PN', 'DHA', 'DOH'];
export const JURISDICTION_OPTIONS: JurisdictionCode[] = ['US', 'Canada', 'UAE-DHA', 'UAE-DOH'];
export const DIFFICULTY_OPTIONS: DifficultyLevel[] = ['easy', 'medium', 'hard'];
export const COGNITIVE_LEVEL_OPTIONS: CognitiveLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'clinical_judgment',
];