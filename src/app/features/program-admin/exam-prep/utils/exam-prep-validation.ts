import { z } from 'zod';
import {
  COGNITIVE_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  EXAM_TRACK_OPTIONS,
  JURISDICTION_OPTIONS,
  QUESTION_ITEM_TYPE_OPTIONS,
  WORKFLOW_STATUS_OPTIONS,
} from '../models/exam-prep.models';

const workflowStatusValues = WORKFLOW_STATUS_OPTIONS as [string, ...string[]];
const itemTypeValues = QUESTION_ITEM_TYPE_OPTIONS as [string, ...string[]];
const difficultyValues = DIFFICULTY_OPTIONS as [string, ...string[]];
const cognitiveLevelValues = COGNITIVE_LEVEL_OPTIONS as [string, ...string[]];
const jurisdictionValues = JURISDICTION_OPTIONS as [string, ...string[]];
const examTrackValues = EXAM_TRACK_OPTIONS as [string, ...string[]];

const workflowStatusSchema = z.enum(workflowStatusValues);
const itemTypeSchema = z.enum(itemTypeValues);
const difficultySchema = z.enum(difficultyValues);
const cognitiveLevelSchema = z.enum(cognitiveLevelValues);
const jurisdictionSchema = z.enum(jurisdictionValues);
const examTrackSchema = z.enum(examTrackValues);

const answerChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  text: z.string().min(1),
  rationale: z.string().optional().nullable(),
});

const interactionPartSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  selectionMode: z.enum(['single', 'multiple']),
  minSelections: z.number().int().min(0),
  maxSelections: z.number().int().min(1),
  optionIds: z.array(z.string().min(1)).min(1),
});

const bowTieInteractionSchema = z.object({
  kind: z.literal('bow_tie'),
  instructions: z.string().optional().nullable(),
  parts: z.array(interactionPartSchema).min(3),
});

const clozeInteractionSchema = z.object({
  kind: z.literal('cloze_drop_down'),
  instructions: z.string().optional().nullable(),
  segments: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    placeholder: z.string().min(1),
    optionIds: z.array(z.string().min(1)).min(1),
    correctOptionId: z.string().min(1),
  })).min(1),
});

const matrixInteractionSchema = z.object({
  kind: z.enum(['matrix_multiple_choice', 'matrix_multiple_response']),
  instructions: z.string().optional().nullable(),
  rows: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    prompt: z.string().optional().nullable(),
  })).min(1),
  columns: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    text: z.string().min(1),
  })).min(2),
  correctResponse: z.record(z.array(z.string().min(1))),
});

const trendInteractionSchema = z.object({
  kind: z.literal('trend_analysis'),
  instructions: z.string().optional().nullable(),
  metrics: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    values: z.array(z.string().min(1)).min(2),
  })).min(1),
  correctInterpretations: z.array(z.string().min(1)).min(1),
});

const interactionConfigSchema = z
  .union([bowTieInteractionSchema, clozeInteractionSchema, matrixInteractionSchema, trendInteractionSchema])
  .optional()
  .nullable();

export const questionBankItemSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    programId: z.string().min(1),
    programTitle: z.string().min(1),
    jurisdiction: jurisdictionSchema,
    examTrack: examTrackSchema,
    courseGroupId: z.string().min(1),
    courseGroupTitle: z.string().min(1),
    moduleId: z.string().min(1),
    moduleTitle: z.string().min(1),
    parentCaseId: z.string().optional().nullable(),
    itemType: itemTypeSchema,
    cognitiveLevel: cognitiveLevelSchema,
    difficulty: difficultySchema,
    stem: z.string().min(5),
    scenarioText: z.string().optional().nullable(),
    leadInQuestion: z.string().min(5),
    interactionConfig: interactionConfigSchema,
    choices: z.array(answerChoiceSchema).min(2),
    correctAnswerKey: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(5),
    rationale: z.string().min(5),
    distractorRationale: z.record(z.string()).optional().nullable(),
    learningObjectives: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).min(1),
    sourceAuthority: z.string().min(1),
    sourceReferenceTitle: z.string().min(1),
    sourceReferenceUrl: z.string().url().optional().nullable().or(z.literal('')).transform((value) => value || null),
    sourceVersionDate: z.string().min(1),
    jurisdictionNotes: z.string().optional().nullable(),
    points: z.number().min(1),
    estimatedTimeSeconds: z.number().min(15),
    active: z.boolean(),
    workflowStatus: workflowStatusSchema,
    version: z.number().int().min(1),
    remediationModuleIds: z.array(z.string()),
    remediationLessonIds: z.array(z.string()),
    remediationTags: z.array(z.string()),
  })
  .superRefine((value, ctx) => {
    const choiceIds = new Set(value.choices.map((choice) => choice.id));
    const correctKeySet = new Set(value.correctAnswerKey);
    const knownChoiceKeys = value.correctAnswerKey.every((key) => choiceIds.has(key));

    if (!knownChoiceKeys) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'Every correct answer key must match an existing choice id.' });
    }

    if (value.itemType === 'single_choice' && correctKeySet.size !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'single_choice requires exactly one correct choice.' });
    }

    if (value.itemType === 'true_false') {
      if (value.choices.length !== 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['choices'], message: 'true_false requires exactly two choices.' });
      }
      if (correctKeySet.size !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'true_false requires exactly one correct answer key.' });
      }
    }

    if ((value.itemType === 'multiple_response' || value.itemType === 'select_all_that_apply') && correctKeySet.size < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'multiple_response requires at least one correct answer.' });
    }

    if (value.itemType === 'ordered_response' && value.correctAnswerKey.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'ordered_response requires an ordered list with at least two elements.' });
    }

    if (value.itemType === 'bow_tie') {
      if (!value.interactionConfig || value.interactionConfig.kind !== 'bow_tie') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig'], message: 'bow_tie items require a bow_tie interactionConfig.' });
        return;
      }

      if (value.choices.length < 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['choices'], message: 'bow_tie needs enough structured choices to represent all response parts.' });
      }

      const partIds = new Set<string>();
      const referencedChoiceIds = new Set<string>();
      for (const [index, part] of value.interactionConfig.parts.entries()) {
        if (partIds.has(part.id)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'parts', index, 'id'], message: 'Each bow_tie part id must be unique.' });
        }
        partIds.add(part.id);

        if (part.selectionMode === 'single' && part.maxSelections !== 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'parts', index, 'maxSelections'], message: 'Single-select bow_tie parts must set maxSelections to 1.' });
        }
        if (part.minSelections > part.maxSelections) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'parts', index], message: 'minSelections cannot exceed maxSelections.' });
        }

        const localOptionIds = new Set<string>();
        for (const optionId of part.optionIds) {
          if (!choiceIds.has(optionId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'parts', index, 'optionIds'], message: `Unknown bow_tie option id ${optionId}.` });
          }
          if (localOptionIds.has(optionId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'parts', index, 'optionIds'], message: 'Duplicate option ids are not allowed within a bow_tie part.' });
          }
          localOptionIds.add(optionId);
          referencedChoiceIds.add(optionId);
        }
      }

      for (const key of value.correctAnswerKey) {
        if (!referencedChoiceIds.has(key)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: `Bow tie correct answer ${key} is not assigned to any interaction part.` });
        }
      }

      for (const [index, part] of value.interactionConfig.parts.entries()) {
        const partCorrectCount = value.correctAnswerKey.filter((key) => part.optionIds.includes(key)).length;
        if (partCorrectCount < part.minSelections || partCorrectCount > part.maxSelections) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: `Bow tie part ${part.label || index + 1} must contribute between ${part.minSelections} and ${part.maxSelections} correct selections.` });
        }
      }
    }

    if (value.itemType === 'cloze_drop_down') {
      if (!value.interactionConfig || value.interactionConfig.kind !== 'cloze_drop_down') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig'], message: 'cloze_drop_down items require a cloze_drop_down interactionConfig.' });
        return;
      }

      const segmentIds = new Set<string>();
      const referencedChoiceIds = new Set<string>();

      for (const [index, segment] of value.interactionConfig.segments.entries()) {
        if (segmentIds.has(segment.id)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'segments', index, 'id'], message: 'Each cloze segment id must be unique.' });
        }
        segmentIds.add(segment.id);

        if (!segment.optionIds.includes(segment.correctOptionId)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'segments', index, 'correctOptionId'], message: 'Each cloze segment correctOptionId must exist in that segment optionIds.' });
        }

        const localOptionIds = new Set<string>();
        for (const optionId of segment.optionIds) {
          if (!choiceIds.has(optionId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'segments', index, 'optionIds'], message: `Unknown cloze option id ${optionId}.` });
          }
          if (localOptionIds.has(optionId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interactionConfig', 'segments', index, 'optionIds'], message: 'Duplicate option ids are not allowed within a cloze segment.' });
          }
          localOptionIds.add(optionId);
          referencedChoiceIds.add(optionId);
        }
      }

      if (value.correctAnswerKey.length !== value.interactionConfig.segments.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'cloze_drop_down correctAnswerKey must contain exactly one choice id per segment.' });
      }

      for (const key of value.correctAnswerKey) {
        if (!referencedChoiceIds.has(key)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: `Cloze correct answer ${key} is not assigned to any segment.` });
        }
      }

      const expectedKeys = new Set(value.interactionConfig.segments.map((segment) => segment.correctOptionId));
      if (expectedKeys.size !== correctKeySet.size || [...expectedKeys].some((key) => !correctKeySet.has(key))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswerKey'], message: 'cloze_drop_down correctAnswerKey must exactly match the segment correctOptionId values.' });
      }
    }
  });

export const caseStudyBundleSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    title: z.string().min(3),
    slug: z.string().min(3),
    programId: z.string().min(1),
    programTitle: z.string().min(1),
    jurisdiction: jurisdictionSchema,
    examTrack: examTrackSchema,
    courseGroupId: z.string().min(1),
    courseGroupTitle: z.string().min(1),
    moduleId: z.string().min(1),
    moduleTitle: z.string().min(1),
    workflowStatus: workflowStatusSchema,
    active: z.boolean(),
    sharedContext: z.object({
      vignette: z.string().min(10),
      demographics: z.string().min(3),
      history: z.string().min(3),
      allergies: z.array(z.string()),
      currentMeds: z.array(z.string()),
      labs: z.array(z.string()),
      vitalSigns: z.array(z.string()),
      nursingNotes: z.array(z.string()),
      providerNotes: z.array(z.string()),
      imagingSnippets: z.array(z.string()),
      trendUpdates: z.array(z.string()),
    }),
    childItemIds: z.array(z.string().min(1)).min(1),
    sequenceOrder: z.array(z.number().int().min(1)).min(1),
    sourceReferences: z.array(z.object({
      sourceAuthority: z.string().min(1),
      sourceReferenceTitle: z.string().min(1),
      sourceReferenceUrl: z.string().url().optional().nullable(),
      sourceVersionDate: z.string().min(1),
      jurisdictionNotes: z.string().optional().nullable(),
    })).min(1),
    version: z.number().int().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.childItemIds.length !== value.sequenceOrder.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sequenceOrder'], message: 'Case study bundles must provide one sequence number per child item.' });
    }
  });

export const blueprintSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    title: z.string().min(3),
    slug: z.string().min(3),
    description: z.string().min(5),
    assessmentFamily: z.enum(['module_assessment', 'comprehensive_assessment']),
    programId: z.string().min(1),
    jurisdiction: jurisdictionSchema,
    examTrack: examTrackSchema,
    totalQuestionCount: z.number().int().min(1),
    caseStudyBundleQuota: z.number().int().min(0),
    clinicalJudgmentQuota: z.number().int().min(0),
    timeBudgetMinutes: z.number().int().min(1),
    noDuplicateRules: z.boolean(),
    exposureBalancing: z.boolean(),
    sequencingRules: z.array(z.string()),
    courseGroupDistributions: z.array(z.object({ key: z.string(), label: z.string(), minCount: z.number().int().optional(), targetCount: z.number().int().optional(), maxCount: z.number().int().optional(), targetPercent: z.number().optional() })),
    moduleDistributions: z.array(z.object({ key: z.string(), label: z.string(), minCount: z.number().int().optional(), targetCount: z.number().int().optional(), maxCount: z.number().int().optional(), targetPercent: z.number().optional() })),
    tagDistributions: z.array(z.object({ key: z.string(), label: z.string(), minCount: z.number().int().optional(), targetCount: z.number().int().optional(), maxCount: z.number().int().optional(), targetPercent: z.number().optional() })),
    itemTypeDistributions: z.array(z.object({ key: z.string(), label: z.string(), minCount: z.number().int().optional(), targetCount: z.number().int().optional(), maxCount: z.number().int().optional(), targetPercent: z.number().optional() })),
    difficultyDistributions: z.array(z.object({ key: z.string(), label: z.string(), minCount: z.number().int().optional(), targetCount: z.number().int().optional(), maxCount: z.number().int().optional(), targetPercent: z.number().optional() })),
    progressiveSections: z.array(z.object({ id: z.string(), title: z.string(), sequence: z.number().int().min(1), questionCount: z.number().int().min(0), caseStudyCount: z.number().int().min(0), allowedDifficulties: z.array(difficultySchema), requiredTags: z.array(z.string()), recommendedItemTypes: z.array(itemTypeSchema) })),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const totalFromSections = value.progressiveSections.reduce((sum, section) => sum + section.questionCount, 0);
    if (value.progressiveSections.length > 0 && totalFromSections !== value.totalQuestionCount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['progressiveSections'], message: 'Progressive sections must sum exactly to totalQuestionCount.' });
    }
  });

export const assessmentDefinitionSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    assessmentFamily: z.enum(['module_assessment', 'comprehensive_assessment']),
    assessmentMode: z.enum(['module_quiz', 'module_final', 'competency_check', 'case_simulation', 'comprehensive_mock_fixed', 'comprehensive_mock_progressive', 'comprehensive_ngn_mock', 'jurisdiction_readiness_exam', 'preboard_final_exam', 'cat_like_mock', 'adaptive_remediation_exam']),
    title: z.string().min(3),
    slug: z.string().min(3),
    description: z.string().min(5),
    instructions: z.string().min(5),
    programId: z.string().min(1),
    jurisdiction: jurisdictionSchema,
    examTrack: examTrackSchema,
    courseGroupId: z.string().optional().nullable(),
    moduleId: z.string().optional().nullable(),
    sourceMode: z.enum(['fixed_static', 'filtered_bank_draw', 'blueprint_assembled']),
    blueprintMode: z.enum(['single_blueprint', 'sectioned_blueprint', 'manual']),
    fixedQuestionIds: z.array(z.string()).optional(),
    blueprintId: z.string().optional().nullable(),
    randomizeQuestionOrder: z.boolean(),
    randomizeChoiceOrder: z.boolean(),
    drawCount: z.number().int().min(0),
    caseStudyCount: z.number().int().min(0),
    durationMinutes: z.number().int().min(1),
    passingScorePercent: z.number().min(1).max(100),
    maxAttempts: z.number().int().min(1),
    allowRetake: z.boolean(),
    requireAllQuestionsAnswered: z.boolean(),
    autoSubmitOnTimeout: z.boolean(),
    showScoreImmediately: z.boolean(),
    showCorrectAnswersAfterSubmit: z.boolean(),
    showRationalesAfterSubmit: z.boolean(),
    showCategoryBreakdown: z.boolean(),
    reviewMode: z.enum(['no_review', 'summary_only', 'show_answers', 'show_rationales', 'full_review']),
    active: z.boolean(),
    publishStatus: workflowStatusSchema,
    sections: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), questionCount: z.number().int().min(0), caseStudyCount: z.number().int().min(0), allowedDifficulties: z.array(difficultySchema), requiredTags: z.array(z.string()), navigationLocked: z.boolean(), reviewLocked: z.boolean() })),
    strictNavigation: z.boolean(),
    allowQuestionFlagging: z.boolean(),
    allowBackNavigation: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceMode === 'fixed_static' && (!value.fixedQuestionIds || value.fixedQuestionIds.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedQuestionIds'], message: 'fixed_static assessments require fixedQuestionIds.' });
    }

    if (value.sourceMode === 'blueprint_assembled' && !value.blueprintId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['blueprintId'], message: 'blueprint_assembled assessments require blueprintId.' });
    }

    if (value.assessmentFamily === 'comprehensive_assessment' && value.sections.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections'], message: 'Comprehensive assessments should define at least one section.' });
    }
  });

export function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join('.') || 'form'}: ${issue.message}`).join(' | ');
  }

  return 'Validation failed.';
}