import {
  COGNITIVE_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  EXAM_TRACK_OPTIONS,
  JURISDICTION_OPTIONS,
  QUESTION_ITEM_TYPE_OPTIONS,
  WORKFLOW_STATUS_OPTIONS,
  type AnswerChoice,
  type AssessmentDefinition,
  type AssessmentSectionDefinition,
  type BlueprintDifficultySection,
  type BlueprintDistributionRule,
  type CaseStudyBundle,
  type ContentSourceReference,
  type ExamBlueprint,
  type ExamCourseGroup,
  type ExamModule,
  type ExamProgram,
  type QuestionBankItem,
} from '../models/exam-prep.models';
import {
  CANONICAL_COURSE_GROUPS,
  CANONICAL_MODULES,
  CANONICAL_PROGRAMS,
  canonicalCourseGroupTitle,
  canonicalProgramTitle,
} from '../models/exam-prep-taxonomy';

export const EXAM_PREP_DEFAULT_PROGRAM = CANONICAL_PROGRAMS[0];
export const EXAM_PREP_DEFAULT_COURSE_GROUP = CANONICAL_COURSE_GROUPS[0];
export const EXAM_PREP_DEFAULT_MODULE = CANONICAL_MODULES[0];

export const EXAM_PREP_WORKFLOW_OPTIONS = WORKFLOW_STATUS_OPTIONS;
export const EXAM_PREP_ITEM_TYPE_OPTIONS = QUESTION_ITEM_TYPE_OPTIONS;
export const EXAM_PREP_TRACK_OPTIONS = EXAM_TRACK_OPTIONS;
export const EXAM_PREP_JURISDICTION_OPTIONS = JURISDICTION_OPTIONS;
export const EXAM_PREP_DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS;
export const EXAM_PREP_COGNITIVE_OPTIONS = COGNITIVE_LEVEL_OPTIONS;

export const EXAM_PREP_ASSESSMENT_FAMILIES = ['module_assessment', 'comprehensive_assessment'] as const;
export const EXAM_PREP_ASSESSMENT_MODES = [
  'module_quiz',
  'module_final',
  'competency_check',
  'case_simulation',
  'comprehensive_mock_fixed',
  'comprehensive_mock_progressive',
  'comprehensive_ngn_mock',
  'jurisdiction_readiness_exam',
  'preboard_final_exam',
  'cat_like_mock',
  'adaptive_remediation_exam',
] as const;
export const EXAM_PREP_SOURCE_MODES = ['fixed_static', 'filtered_bank_draw', 'blueprint_assembled'] as const;
export const EXAM_PREP_BLUEPRINT_MODES = ['single_blueprint', 'sectioned_blueprint', 'manual'] as const;
export const EXAM_PREP_REVIEW_MODES = ['no_review', 'summary_only', 'show_answers', 'show_rationales', 'full_review'] as const;

export function generateExamPrepId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function slugifyExamPrep(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function splitCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatLines(values: string[] | undefined | null): string {
  return (values ?? []).join('\n');
}

export function formatCommaSeparated(values: string[] | undefined | null): string {
  return (values ?? []).join(', ');
}

export function formatChoices(values: AnswerChoice[] | undefined | null): string {
  return (values ?? [])
    .map((choice) => [choice.id, choice.text, choice.rationale ?? ''].join('|'))
    .join('\n');
}

export function parseChoices(value: string): AnswerChoice[] {
  return splitLines(value).map((line, index) => {
    const [idPart, textPart, rationalePart] = line.split('|');
    const id = (idPart || '').trim() || String.fromCharCode(65 + index);
    const text = (textPart || '').trim();
    if (!text) {
      throw new Error(`Choice ${id} is missing display text.`);
    }

    return {
      id,
      label: id,
      text,
      rationale: rationalePart?.trim() || null,
    } satisfies AnswerChoice;
  });
}

export function parseJsonOrFallback<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function lookupProgramTitle(programs: ExamProgram[], programId: string): string {
  return programs.find((program) => program.id === programId)?.title ?? canonicalProgramTitle(programId as never);
}

export function lookupCourseGroupTitle(courseGroups: ExamCourseGroup[], courseGroupId: string): string {
  return courseGroups.find((group) => group.id === courseGroupId)?.title ?? canonicalCourseGroupTitle(courseGroupId as never);
}

export function lookupModuleTitle(modules: ExamModule[], moduleId: string): string {
  return modules.find((module) => module.id === moduleId)?.title ?? moduleId;
}

export function buildDefaultQuestionBankItem(organizationId: string, actor: string): QuestionBankItem {
  return {
    id: generateExamPrepId('qb'),
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: actor,
    updatedBy: actor,
    programId: EXAM_PREP_DEFAULT_PROGRAM.id,
    programTitle: EXAM_PREP_DEFAULT_PROGRAM.title,
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    courseGroupId: EXAM_PREP_DEFAULT_COURSE_GROUP.id,
    courseGroupTitle: EXAM_PREP_DEFAULT_COURSE_GROUP.title,
    moduleId: EXAM_PREP_DEFAULT_MODULE.id,
    moduleTitle: EXAM_PREP_DEFAULT_MODULE.title,
    parentCaseId: null,
    itemType: EXAM_PREP_ITEM_TYPE_OPTIONS[0],
    cognitiveLevel: EXAM_PREP_COGNITIVE_OPTIONS[2],
    difficulty: EXAM_PREP_DIFFICULTY_OPTIONS[1],
    stem: '',
    scenarioText: null,
    leadInQuestion: '',
    interactionConfig: null,
    choices: [
      { id: 'A', label: 'A', text: '', rationale: null },
      { id: 'B', label: 'B', text: '', rationale: null },
    ],
    correctAnswerKey: ['A'],
    explanation: '',
    rationale: '',
    distractorRationale: null,
    learningObjectives: [],
    tags: [],
    sourceAuthority: 'Internal SME Board',
    sourceReferenceTitle: '',
    sourceReferenceUrl: null,
    sourceVersionDate: new Date().toISOString().slice(0, 10),
    jurisdictionNotes: null,
    points: 1,
    estimatedTimeSeconds: 75,
    active: true,
    workflowStatus: 'draft',
    reviewedBy: null,
    approvedBy: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    version: 1,
    remediationModuleIds: [],
    remediationLessonIds: [],
    remediationTags: [],
    exposureCount: 0,
    qualityScore: null,
    discriminationIndex: null,
    confidenceScore: null,
  };
}

export function buildDefaultCaseStudyBundle(organizationId: string, actor: string): CaseStudyBundle {
  const sourceReference: ContentSourceReference = {
    sourceAuthority: 'Internal SME Board',
    sourceReferenceTitle: 'Primary case source',
    sourceReferenceUrl: null,
    sourceVersionDate: new Date().toISOString().slice(0, 10),
    jurisdictionNotes: null,
  };

  return {
    id: generateExamPrepId('case'),
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: actor,
    updatedBy: actor,
    programId: EXAM_PREP_DEFAULT_PROGRAM.id,
    programTitle: EXAM_PREP_DEFAULT_PROGRAM.title,
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    courseGroupId: EXAM_PREP_DEFAULT_COURSE_GROUP.id,
    courseGroupTitle: EXAM_PREP_DEFAULT_COURSE_GROUP.title,
    moduleId: EXAM_PREP_DEFAULT_MODULE.id,
    moduleTitle: EXAM_PREP_DEFAULT_MODULE.title,
    title: '',
    slug: '',
    workflowStatus: 'draft',
    active: true,
    sharedContext: {
      vignette: '',
      demographics: '',
      history: '',
      allergies: [],
      currentMeds: [],
      labs: [],
      vitalSigns: [],
      nursingNotes: [],
      providerNotes: [],
      imagingSnippets: [],
      trendUpdates: [],
    },
    childItemIds: [],
    sequenceOrder: [],
    scoringNotes: null,
    partialCreditStrategy: 'future_supported',
    authorNotes: null,
    reviewerNotes: null,
    sourceReferences: [sourceReference],
    lastReviewedAt: null,
    nextReviewAt: null,
    reviewedBy: null,
    approvedBy: null,
    version: 1,
  };
}

export function buildDefaultBlueprint(organizationId: string, actor: string): ExamBlueprint {
  const courseDistribution: BlueprintDistributionRule = {
    key: EXAM_PREP_DEFAULT_COURSE_GROUP.id,
    label: EXAM_PREP_DEFAULT_COURSE_GROUP.title,
    targetCount: 10,
  };

  return {
    id: generateExamPrepId('bp'),
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: actor,
    updatedBy: actor,
    title: '',
    slug: '',
    description: '',
    assessmentFamily: 'comprehensive_assessment',
    programId: EXAM_PREP_DEFAULT_PROGRAM.id,
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    totalQuestionCount: 25,
    caseStudyBundleQuota: 2,
    clinicalJudgmentQuota: 5,
    timeBudgetMinutes: 45,
    noDuplicateRules: true,
    exposureBalancing: true,
    sequencingRules: ['Start medium, intensify by section, reserve NGN at midpoint'],
    courseGroupDistributions: [courseDistribution],
    moduleDistributions: [],
    tagDistributions: [],
    itemTypeDistributions: [],
    difficultyDistributions: [
      { key: 'easy', label: 'Easy', targetCount: 6 },
      { key: 'medium', label: 'Medium', targetCount: 13 },
      { key: 'hard', label: 'Hard', targetCount: 6 },
    ],
    progressiveSections: [],
    active: true,
  };
}

export function buildDefaultAssessment(organizationId: string, actor: string): AssessmentDefinition {
  const section: AssessmentSectionDefinition = {
    id: 'section-1',
    title: 'Clinical reasoning block',
    description: 'Mixed readiness block for blueprint-assembled delivery.',
    questionCount: 25,
    caseStudyCount: 2,
    allowedDifficulties: ['easy', 'medium', 'hard'],
    requiredTags: [],
    navigationLocked: false,
    reviewLocked: false,
  };

  return {
    id: generateExamPrepId('asm'),
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: actor,
    updatedBy: actor,
    assessmentFamily: 'comprehensive_assessment',
    assessmentMode: 'comprehensive_ngn_mock',
    title: '',
    slug: '',
    description: '',
    instructions: 'Read each item carefully and commit your best clinical judgment before moving on.',
    programId: EXAM_PREP_DEFAULT_PROGRAM.id,
    jurisdiction: EXAM_PREP_JURISDICTION_OPTIONS[0],
    examTrack: EXAM_PREP_TRACK_OPTIONS[0],
    courseGroupId: EXAM_PREP_DEFAULT_COURSE_GROUP.id,
    moduleId: EXAM_PREP_DEFAULT_MODULE.id,
    sourceMode: 'blueprint_assembled',
    blueprintMode: 'single_blueprint',
    fixedQuestionIds: [],
    blueprintId: null,
    randomizeQuestionOrder: true,
    randomizeChoiceOrder: false,
    drawCount: 25,
    caseStudyCount: 2,
    durationMinutes: 45,
    passingScorePercent: 70,
    maxAttempts: 3,
    allowRetake: true,
    requireAllQuestionsAnswered: true,
    autoSubmitOnTimeout: true,
    showScoreImmediately: true,
    showCorrectAnswersAfterSubmit: false,
    showRationalesAfterSubmit: false,
    showCategoryBreakdown: true,
    reviewMode: 'summary_only',
    active: true,
    publishStatus: 'draft',
    sections: [section],
    strictNavigation: false,
    allowQuestionFlagging: true,
    allowBackNavigation: true,
  };
}

export function buildDefaultProgressiveSection(): BlueprintDifficultySection {
  return {
    id: generateExamPrepId('section'),
    title: 'Section title',
    sequence: 1,
    questionCount: 10,
    caseStudyCount: 0,
    allowedDifficulties: ['easy', 'medium'],
    requiredTags: [],
    recommendedItemTypes: ['single_choice'],
  };
}