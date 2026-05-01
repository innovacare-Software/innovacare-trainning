import { Injectable } from '@angular/core';
import {
  GradingResult,
  ListeningAnswer,
  ListeningQuestion,
  ListeningQuestionMode,
} from '../models/listening-test.models';

@Injectable({ providedIn: 'root' })
export class ListeningGradingService {
  /**
   * Grade all answers against the assessment questions.
   * Correct answers are NOT revealed until this service is called post-submission.
   */
  grade(
    questions: ListeningQuestion[],
    answers: ListeningAnswer[],
    passingScore: number
  ): GradingResult {
    const answerMap = new Map<string, ListeningAnswer>(answers.map((a) => [a.questionId, a]));
    let score = 0;
    let maxScore = 0;

    const gradedAnswers: ListeningAnswer[] = questions.map((q) => {
      const pts = q.points ?? 1;
      maxScore += pts;
      const raw = answerMap.get(q.id);

      if (!raw) {
        return { questionId: q.id, mode: q.mode, isCorrect: false, pointsAwarded: 0 };
      }

      let isCorrect = false;

      switch (q.mode) {
        case ListeningQuestionMode.single:
        case ListeningQuestionMode.true_false:
        case ListeningQuestionMode.dropdown:
          isCorrect = this.gradeSingle(q.correctAnswerKey, raw.selectedAnswerKeys);
          break;

        case ListeningQuestionMode.multi:
          isCorrect = this.gradeMulti(q.correctAnswerKey, raw.selectedAnswerKeys);
          break;

        case ListeningQuestionMode.short_text:
        case ListeningQuestionMode.fill_blank:
          isCorrect = this.gradeText(q.acceptedAnswers, raw.textAnswer);
          break;

        case ListeningQuestionMode.matching:
          isCorrect = this.gradeMatching(q.matchingPairs, raw.matchingAnswers);
          break;
      }

      const pointsAwarded = isCorrect ? pts : 0;
      score += pointsAwarded;

      return { ...raw, isCorrect, pointsAwarded };
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= passingScore;
    const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
    const incorrectCount = gradedAnswers.filter((a) => !a.isCorrect).length;

    return { answers: gradedAnswers, score, maxScore, percentage, passed, correctCount, incorrectCount };
  }

  // ── Single / true-false / dropdown ──────────────────────────
  private gradeSingle(correct?: string[], given?: string[]): boolean {
    if (!correct?.length || !given?.length) return false;
    return correct[0].toLowerCase().trim() === given[0].toLowerCase().trim();
  }

  // ── Multi-select ─────────────────────────────────────────────
  private gradeMulti(correct?: string[], given?: string[]): boolean {
    if (!correct?.length || !given?.length) return false;
    const c = new Set(correct.map((s) => s.toLowerCase().trim()));
    const g = new Set(given.map((s) => s.toLowerCase().trim()));
    if (c.size !== g.size) return false;
    for (const v of c) if (!g.has(v)) return false;
    return true;
  }

  // ── Short text / fill-blank ──────────────────────────────────
  private gradeText(accepted?: string[], given?: string): boolean {
    if (!accepted?.length || !given?.trim()) return false;
    const norm = this.normalizeText(given);
    return accepted.some((a) => this.normalizeText(a) === norm);
  }

  private normalizeText(s: string): string {
    return s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:'"]/g, '');
  }

  // ── Matching ─────────────────────────────────────────────────
  private gradeMatching(
    pairs?: { left: string; right: string }[],
    given?: { left: string; selectedRight: string }[]
  ): boolean {
    if (!pairs?.length || !given?.length) return false;
    const expected = new Map(pairs.map((p) => [p.left, p.right]));
    for (const g of given) {
      const exp = expected.get(g.left);
      if (!exp) return false;
      if (exp.toLowerCase().trim() !== g.selectedRight.toLowerCase().trim()) return false;
    }
    return pairs.length === given.length;
  }
}
