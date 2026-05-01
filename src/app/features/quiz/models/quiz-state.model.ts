import { QuizQuestion } from './question.model';

export interface QuizState {
  questions: QuizQuestion[];
  currentIdx: number;
  answers: Array<number | null>;
  submitted: boolean[];
  marked: boolean[];
  questionTimes: number[];
  totalElapsed: number;
  paused: boolean;
  status: 'start' | 'in-progress' | 'complete';
}
