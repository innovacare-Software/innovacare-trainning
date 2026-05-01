import { CaseStudyBundle, ExamBlueprint, QuestionBankItem, QuestionItemType } from '../models/exam-prep.models';

export interface BlueprintAssemblyPreview {
  generatedQuestionIds: string[];
  generatedCaseStudyIds: string[];
  shortageMessages: string[];
  poolStats: {
    eligibleItems: number;
    eligibleCaseStudies: number;
    clinicalJudgmentItems: number;
  };
}

export function assembleBlueprintPreview(input: {
  blueprint: ExamBlueprint;
  questionBank: QuestionBankItem[];
  caseStudies: CaseStudyBundle[];
}): BlueprintAssemblyPreview {
  const { blueprint } = input;
  const questionBank = input.questionBank.filter((item) =>
    item.active &&
    item.workflowStatus === 'published' &&
    item.programId === blueprint.programId &&
    item.jurisdiction === blueprint.jurisdiction &&
    item.examTrack === blueprint.examTrack
  );
  const caseStudies = input.caseStudies.filter((bundle) =>
    bundle.active &&
    bundle.workflowStatus === 'published' &&
    bundle.programId === blueprint.programId &&
    bundle.jurisdiction === blueprint.jurisdiction &&
    bundle.examTrack === blueprint.examTrack
  );

  const shortageMessages: string[] = [];
  const selectedItems: QuestionBankItem[] = [];

  for (const rule of blueprint.courseGroupDistributions) {
    const eligible = questionBank.filter((item) => item.courseGroupId === rule.key && !selectedItems.some((selected) => selected.id === item.id));
    const targetCount = resolveTargetCount(rule, blueprint.totalQuestionCount);
    if (eligible.length < targetCount) {
      shortageMessages.push(`${rule.label}: required ${targetCount}, found ${eligible.length}`);
    }
    selectedItems.push(...eligible.slice(0, targetCount));
  }

  for (const rule of blueprint.itemTypeDistributions) {
    const targetCount = resolveTargetCount(rule, blueprint.totalQuestionCount);
    const typeMatches = selectedItems.filter((item) => item.itemType === rule.key as QuestionItemType).length;
    if (typeMatches < targetCount) {
      shortageMessages.push(`${rule.label}: required ${targetCount}, selected ${typeMatches}`);
    }
  }

  for (const rule of blueprint.difficultyDistributions) {
    const targetCount = resolveTargetCount(rule, blueprint.totalQuestionCount);
    const difficultyMatches = selectedItems.filter((item) => item.difficulty === rule.key).length;
    if (difficultyMatches < targetCount) {
      shortageMessages.push(`${rule.label}: required ${targetCount}, selected ${difficultyMatches}`);
    }
  }

  const clinicalJudgmentItems = questionBank.filter((item) => item.cognitiveLevel === 'clinical_judgment');
  if (clinicalJudgmentItems.length < blueprint.clinicalJudgmentQuota) {
    shortageMessages.push(`Clinical judgment quota: required ${blueprint.clinicalJudgmentQuota}, found ${clinicalJudgmentItems.length}`);
  }

  if (caseStudies.length < blueprint.caseStudyBundleQuota) {
    shortageMessages.push(`Case study bundles: required ${blueprint.caseStudyBundleQuota}, found ${caseStudies.length}`);
  }

  if (selectedItems.length < blueprint.totalQuestionCount) {
    const remainder = questionBank.filter((item) => !selectedItems.some((selected) => selected.id === item.id));
    selectedItems.push(...remainder.slice(0, blueprint.totalQuestionCount - selectedItems.length));
  }

  return {
    generatedQuestionIds: selectedItems.slice(0, blueprint.totalQuestionCount).map((item) => item.id),
    generatedCaseStudyIds: caseStudies.slice(0, blueprint.caseStudyBundleQuota).map((bundle) => bundle.id),
    shortageMessages,
    poolStats: {
      eligibleItems: questionBank.length,
      eligibleCaseStudies: caseStudies.length,
      clinicalJudgmentItems: clinicalJudgmentItems.length,
    },
  };
}

function resolveTargetCount(rule: { minCount?: number; targetCount?: number; targetPercent?: number }, total: number): number {
  if (typeof rule.targetCount === 'number') {
    return rule.targetCount;
  }
  if (typeof rule.minCount === 'number') {
    return rule.minCount;
  }
  if (typeof rule.targetPercent === 'number') {
    return Math.round(total * (rule.targetPercent / 100));
  }
  return 0;
}