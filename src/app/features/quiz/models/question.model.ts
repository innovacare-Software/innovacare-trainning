export interface QuizQuestion {
  id: number;
  qnum: string;
  stem: string;
  options: string[];
  correct: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  lesson: string;
  needArea: string;
  needTopic: string;
  qType: string;
  rationale: string;
  distractors: string;
  additional: string;
}
