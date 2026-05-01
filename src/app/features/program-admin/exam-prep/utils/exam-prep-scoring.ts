import { AssessmentScoringBreakdown, AttemptAnswer, QuestionBankItem } from '../models/exam-prep.models';

export function scoreQuestionItem(item: QuestionBankItem, selectedAnswerKeys: string[]): AttemptAnswer {
  const normalizedSelection = [...selectedAnswerKeys];
  const normalizedKey = [...item.correctAnswerKey];
  const isCorrect = isExactMatch(normalizedSelection, normalizedKey);
  const pointsEarned = isCorrect ? item.points : 0;

  return {
    itemId: item.id,
    itemType: item.itemType,
    selectedAnswerKeys: normalizedSelection,
    pointsEarned,
    pointsPossible: item.points,
    isCorrect,
    markedForReview: false,
    timeSpentSeconds: 0,
  };
}

export function buildScoringBreakdown(items: QuestionBankItem[], answers: AttemptAnswer[]): AssessmentScoringBreakdown {
  const answerByItemId = new Map(answers.map((answer) => [answer.itemId, answer]));
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  const pointsEarned = items.reduce((sum, item) => sum + (answerByItemId.get(item.id)?.pointsEarned ?? 0), 0);

  return {
    rawScore: answers.filter((answer) => answer.isCorrect).length,
    percentScore: totalPoints ? Math.round((pointsEarned / totalPoints) * 1000) / 10 : 0,
    pointsEarned,
    totalPoints,
    domainScores: aggregateBy(items, answerByItemId, (item) => item.courseGroupId),
    moduleScores: aggregateBy(items, answerByItemId, (item) => item.moduleId),
    tagScores: aggregateTags(items, answerByItemId),
    clinicalJudgmentScores: aggregateBy(items, answerByItemId, (item) => item.cognitiveLevel),
    caseStudyScores: aggregateBy(items.filter((item) => !!item.parentCaseId), answerByItemId, (item) => item.parentCaseId || 'standalone'),
  };
}

function aggregateBy(items: QuestionBankItem[], answerByItemId: Map<string, AttemptAnswer>, groupKey: (item: QuestionBankItem) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = groupKey(item);
    if (!key) {
      return acc;
    }

    const answer = answerByItemId.get(item.id);
    const ratio = answer ? answer.pointsEarned / Math.max(answer.pointsPossible, 1) : 0;
    acc[key] = Math.round((((acc[key] ?? 0) + ratio) * 1000)) / 1000;
    return acc;
  }, {});
}

function aggregateTags(items: QuestionBankItem[], answerByItemId: Map<string, AttemptAnswer>): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const answer = answerByItemId.get(item.id);
    const ratio = answer ? answer.pointsEarned / Math.max(answer.pointsPossible, 1) : 0;
    for (const tag of item.tags) {
      acc[tag] = Math.round((((acc[tag] ?? 0) + ratio) * 1000)) / 1000;
    }
    return acc;
  }, {});
}

function isExactMatch(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}