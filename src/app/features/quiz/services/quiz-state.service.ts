import { Injectable, computed, inject, signal } from '@angular/core';
import { QuizQuestion } from '../models/question.model';
import { QuizState } from '../models/quiz-state.model';
import { QuizTimerService } from './quiz-timer.service';

type CompletionStats = {
  correct: number;
  incorrect: number;
  total: number;
  percent: number;
};

@Injectable({ providedIn: 'root' })
export class QuizStateService {
  private readonly timer = inject(QuizTimerService);

  private readonly moduleIdState = signal('shock');
  readonly state = signal<QuizState>(this.buildInitialState([]));

  readonly moduleId = computed(() => this.moduleIdState());
  readonly currentIdx = computed(() => this.state().currentIdx);
  readonly currentQuestion = computed(() => this.state().questions[this.state().currentIdx] ?? null);
  readonly currentAnswer = computed(() => this.state().answers[this.state().currentIdx] ?? null);
  readonly currentSubmitted = computed(() => this.state().submitted[this.state().currentIdx] ?? false);
  readonly progress = computed(() => {
    const total = this.state().questions.length;
    return total ? Math.round(((this.state().currentIdx + 1) / total) * 100) : 0;
  });
  readonly score = computed(() => this.buildCompletionStats().correct);
  readonly scorePercent = computed(() => this.buildCompletionStats().percent);
  readonly canGoPrev = computed(() => this.state().status === 'in-progress' && this.state().currentIdx > 0 && !this.state().paused);
  readonly canGoNext = computed(() => {
    if (this.state().status !== 'in-progress' || this.state().paused) {
      return false;
    }
    const isLastQuestion = this.state().currentIdx === this.state().questions.length - 1;
    return isLastQuestion ? this.currentSubmitted() : true;
  });
  readonly canSubmit = computed(() =>
    this.state().status === 'in-progress' &&
    !this.state().paused &&
    !this.currentSubmitted() &&
    this.currentAnswer() !== null
  );

  initialize(moduleId: string, questions: QuizQuestion[]): void {
    this.moduleIdState.set(moduleId);
    this.timer.reset();
    this.state.set(this.buildInitialState(questions));
  }

  startQuiz(): void {
    const snapshot = this.state();
    if (!snapshot.questions.length) {
      return;
    }
    this.state.update((state) => ({ ...state, status: 'in-progress', paused: false, totalElapsed: 0 }));
    this.timer.start(0, snapshot.questionTimes[0] ?? 0, !(snapshot.submitted[0] ?? false));
    if (snapshot.submitted[0]) {
      this.timer.freezeQuestion(snapshot.questionTimes[0] ?? 0);
    } else {
      this.timer.beginQuestion(snapshot.questionTimes[0] ?? 0);
    }
  }

  restart(): void {
    this.initialize(this.moduleId(), this.state().questions);
  }

  selectAnswer(index: number): void {
    if (this.currentSubmitted() || this.state().paused || this.state().status !== 'in-progress') {
      return;
    }
    this.state.update((state) => ({
      ...state,
      answers: state.answers.map((answer, answerIndex) => (answerIndex === state.currentIdx ? index : answer)),
    }));
  }

  submitAnswer(): void {
    const question = this.currentQuestion();
    const answer = this.currentAnswer();
    if (!question || answer === null || this.currentSubmitted() || this.state().paused) {
      return;
    }

    const elapsed = this.persistCurrentQuestionTime();
    this.timer.freezeQuestion(elapsed);
    this.syncTotalElapsed();
    this.state.update((state) => ({
      ...state,
      submitted: state.submitted.map((value, index) => (index === state.currentIdx ? true : value)),
    }));
  }

  next(): void {
    const target = this.state().currentIdx + 1;
    if (target >= this.state().questions.length) {
      this.finishQuiz();
      return;
    }
    this.navigateTo(target);
  }

  prev(): void {
    this.navigateTo(this.state().currentIdx - 1);
  }

  toggleMark(): void {
    if (this.state().status !== 'in-progress') {
      return;
    }
    this.state.update((state) => ({
      ...state,
      marked: state.marked.map((value, index) => (index === state.currentIdx ? !value : value)),
    }));
  }

  pause(): void {
    if (this.state().status !== 'in-progress' || this.state().paused) {
      return;
    }
    this.persistCurrentQuestionTime();
    this.syncTotalElapsed();
    this.timer.pause();
    this.state.update((state) => ({ ...state, paused: true }));
  }

  resume(): void {
    if (this.state().status !== 'in-progress' || !this.state().paused) {
      return;
    }
    this.timer.resume();
    const idx = this.state().currentIdx;
    const elapsed = this.state().questionTimes[idx] ?? 0;
    if (this.state().submitted[idx]) {
      this.timer.freezeQuestion(elapsed);
    } else {
      this.timer.beginQuestion(elapsed);
    }
    this.state.update((state) => ({ ...state, paused: false }));
  }

  endQuiz(): void {
    this.finishQuiz();
  }

  getCurrentQuestionTime(): number {
    const idx = this.state().currentIdx;
    const persisted = this.state().questionTimes[idx] ?? 0;
    return this.currentSubmitted() ? persisted : Math.max(persisted, this.timer.currentQuestionElapsed());
  }

  getOptionPercentages(question: QuizQuestion): number[] {
    const correctPct = this.pseudoPctRight(question.id, question.difficulty);
    const remaining = 100 - correctPct;
    const distractors = Array.from({ length: 4 }, (_, index) => index).filter((index) => index !== question.correct);
    const weights = distractors.map((index, order) => ((question.id * (index + 3) * 17 + (order + 1) * 11) % 19) + 10);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);

    const distribution = [0, 0, 0, 0];
    distribution[question.correct] = correctPct;

    let assigned = 0;
    distractors.forEach((index, order) => {
      if (order === distractors.length - 1) {
        distribution[index] = remaining - assigned;
        return;
      }
      const raw = Math.round((remaining * weights[order]) / weightTotal);
      const bounded = Math.max(2, Math.min(remaining - assigned - (distractors.length - order - 1) * 2, raw));
      distribution[index] = bounded;
      assigned += bounded;
    });

    return distribution;
  }

  pseudoPctRight(qid: number, difficulty: QuizQuestion['difficulty']): number {
    const base = difficulty === 'Easy' ? 78 : difficulty === 'Medium' ? 58 : 42;
    const variance = ((qid * 17) % 21) - 10;
    return Math.max(15, Math.min(92, base + variance));
  }

  makeQid(question: QuizQuestion | null): string {
    if (!question) {
      return 'SHK-0000';
    }
    return `SHK-${(6900 + question.id).toString().padStart(4, '0')}`;
  }

  getGradeMessage(): string {
    const percent = this.scorePercent();
    if (percent >= 90) {
      return 'Outstanding! You have mastered the shock content.';
    }
    if (percent >= 75) {
      return 'Strong performance. Review the items you missed and you are exam-ready.';
    }
    if (percent >= 60) {
      return 'Solid foundation. Focus on the topics tied to your missed items.';
    }
    return 'More review is needed. Re-read the lesson and revisit each rationale carefully.';
  }

  getCompletionStats(): CompletionStats {
    return this.buildCompletionStats();
  }

  private navigateTo(targetIdx: number): void {
    if (this.state().status !== 'in-progress' || this.state().paused) {
      return;
    }
    if (targetIdx < 0 || targetIdx >= this.state().questions.length) {
      return;
    }

    this.persistCurrentQuestionTime();
    this.syncTotalElapsed();
    this.state.update((state) => ({ ...state, currentIdx: targetIdx }));

    const storedElapsed = this.state().questionTimes[targetIdx] ?? 0;
    if (this.state().submitted[targetIdx]) {
      this.timer.freezeQuestion(storedElapsed);
    } else {
      this.timer.beginQuestion(storedElapsed);
    }
  }

  private finishQuiz(): void {
    this.persistCurrentQuestionTime();
    this.syncTotalElapsed();
    this.timer.freezeQuestion(this.getCurrentQuestionTime());
    this.timer.reset();
    this.state.update((state) => ({ ...state, paused: false, status: 'complete' }));
  }

  private persistCurrentQuestionTime(): number {
    const idx = this.state().currentIdx;
    const currentElapsed = Math.max(this.state().questionTimes[idx] ?? 0, this.timer.currentQuestionElapsed());
    this.state.update((state) => ({
      ...state,
      questionTimes: state.questionTimes.map((value, timeIndex) => (timeIndex === idx ? currentElapsed : value)),
    }));
    return currentElapsed;
  }

  private syncTotalElapsed(): void {
    this.timer.syncNow();
    this.state.update((state) => ({ ...state, totalElapsed: this.timer.totalElapsed() }));
  }

  private buildCompletionStats(): CompletionStats {
    const questions = this.state().questions;
    const correct = questions.reduce((count, question, index) => count + (this.state().answers[index] === question.correct ? 1 : 0), 0);
    const total = questions.length;
    return {
      correct,
      incorrect: Math.max(total - correct, 0),
      total,
      percent: total ? Math.round((correct / total) * 100) : 0,
    };
  }

  private buildInitialState(questions: QuizQuestion[]): QuizState {
    return {
      questions,
      currentIdx: 0,
      answers: questions.map(() => null),
      submitted: questions.map(() => false),
      marked: questions.map(() => false),
      questionTimes: questions.map(() => 0),
      totalElapsed: 0,
      paused: false,
      status: 'start',
    };
  }
}
