/* ─────────────────────────────────────────────────────────────────────────────
   AI Content Studio – shared models (frontend + backend mirror)
───────────────────────────────────────────────────────────────────────────── */

export type AiContentDomain =
  | 'devops'
  | 'nclex'
  | 'english'
  | 'woundCare'
  | 'compliance'
  | 'general';

export type AiContentDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type AiContentLocale = 'en' | 'fr' | 'es';

export type AiContentAction =
  | 'generateLesson'
  | 'improveHtml'
  | 'generateQuiz'
  | 'translate'
  | 'summarize'
  | 'createObjectives';

export interface GenerateLessonHtmlInput {
  orgId: string;
  programId: string;
  moduleId?: string;
  lessonId?: string;
  title?: string;
  description?: string;
  currentContentHtml?: string;
  prompt: string;
  domain: AiContentDomain;
  difficulty: AiContentDifficulty;
  locale: AiContentLocale;
  action: AiContentAction;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  rationale: string;
}

export interface GeneratedLessonHtml {
  title?: string;
  description?: string;
  html: string;
  objectives?: string[];
  quizQuestions?: QuizQuestion[];
  validationWarnings: string[];
}

export interface AiContentJob {
  id: string;
  orgId: string;
  programId: string;
  moduleId?: string;
  lessonId?: string;
  requestedBy: string;
  requestedByRole: 'superAdmin' | 'orgAdmin' | 'programAdmin' | 'instructor';
  action: AiContentAction;
  prompt: string;
  domain: AiContentDomain;
  difficulty: AiContentDifficulty;
  locale: AiContentLocale;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generatedHtml?: string;
  generatedTitle?: string;
  generatedDescription?: string;
  objectives?: string[];
  quizQuestions?: unknown[];
  validationWarnings?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completedAt?: any;
}

/** Labels displayed in the chip row */
export const AI_ACTION_META: Record<
  AiContentAction,
  { label: string; icon: string; description: string }
> = {
  generateLesson: {
    label: 'Generate with AI',
    icon: '✦',
    description: 'Write complete lesson HTML from your title & description',
  },
  improveHtml: {
    label: 'Improve HTML',
    icon: '✏️',
    description: 'Polish existing content for clarity and structure',
  },
  generateQuiz: {
    label: 'Generate Quiz',
    icon: '🧩',
    description: 'Create multiple-choice assessment questions',
  },
  translate: {
    label: 'Translate',
    icon: '🌐',
    description: 'Translate content into another language',
  },
  summarize: {
    label: 'Summarize',
    icon: '📋',
    description: 'Generate a concise summary of the lesson',
  },
  createObjectives: {
    label: 'Learning Objectives',
    icon: '🎯',
    description: 'Draft SMART learning objectives for this lesson',
  },
};
