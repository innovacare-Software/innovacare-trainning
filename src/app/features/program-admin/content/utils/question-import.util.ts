import {
  AssessmentType,
  CaseStudyScoringMode,
  ContentStatus,
  SimulationDifficulty,
  SimulationQuestionMode,
  SimulationType,
} from '../models/content-builder.models';

type JsonRecord = Record<string, unknown>;

export interface ImportedChoiceItem {
  id?: string;
  text: string;
  correct: boolean;
}

export interface ImportedChoiceQuestion {
  prompt: string;
  mode: SimulationQuestionMode;
  correctAnswerKey?: string[];
  choices: ImportedChoiceItem[];
  explanation?: string;
  rationale?: string;
  distractorRationale?: Record<string, string>;
}

export interface ImportedCaseStudyQuestion {
  prompt: string;
  expectedKeywords: string[];
  maxScore: number;
  explanation?: string;
  modelAnswer?: string;
}

export interface AssessmentJsonImport {
  title?: string;
  description?: string;
  assessmentType?: AssessmentType;
  passingScore?: number;
  durationMin?: number;
  order?: number;
  active?: boolean;
  status?: ContentStatus;
  questions: ImportedChoiceQuestion[];
}

export interface SimulationJsonImport {
  title?: string;
  description?: string;
  simulationType?: SimulationType;
  durationMin?: number;
  passingScore?: number;
  difficulty?: SimulationDifficulty;
  order?: number;
  active?: boolean;
  status?: ContentStatus;
  questions: ImportedChoiceQuestion[];
}

export interface CaseStudyJsonImport {
  title?: string;
  description?: string;
  scenario?: string;
  scoringMode?: CaseStudyScoringMode;
  order?: number;
  active?: boolean;
  status?: ContentStatus;
  questions: ImportedCaseStudyQuestion[];
}

export const ASSESSMENT_JSON_TEMPLATE = JSON.stringify(
  {
    title: 'Medication Safety Quiz',
    description: 'Short medication administration assessment.',
    assessmentType: AssessmentType.QUIZ,
    passingScore: 80,
    durationMin: 20,
    status: ContentStatus.DRAFT,
    questions: [
      {
        prompt: 'Which action should the nurse take first before administering digoxin?',
        mode: SimulationQuestionMode.SINGLE,
        correctAnswerKey: ['A'],
        choices: [
          { id: 'A', text: 'Check the apical pulse for one full minute.', correct: true },
          { id: 'B', text: 'Ask the client to drink extra water.', correct: false },
          { id: 'C', text: 'Administer the dose with an antacid.', correct: false },
          { id: 'D', text: 'Hold all cardiac medications automatically.', correct: false },
        ],
        explanation:
          'Digoxin slows the heart rate via vagal stimulation. The nurse must assess the apical pulse for a full 60 seconds before administration and withhold if <60 bpm in adults.',
        rationale:
          'Digoxin has a narrow therapeutic index; bradycardia is both a side effect and a sign of toxicity. Pulse assessment before each dose is a fundamental nursing safety check.',
        distractorRationale: {
          B: 'Encouraging extra water does not address the pre-administration safety requirement for a cardiac glycoside.',
          C: 'Antacids are not routinely paired with digoxin and this is not a recognized pre-administration nursing action.',
          D: 'Only digoxin itself requires the pulse check; holding all cardiac medications automatically is not evidence-based practice.',
        },
      },
    ],
  },
  null,
  2
);

export const SIMULATION_JSON_TEMPLATE = JSON.stringify(
  {
    title: 'Respiratory Priorities Simulation',
    description: 'Timed simulation focused on early respiratory deterioration cues.',
    simulationType: SimulationType.TIMED_SIMULATION,
    durationMin: 45,
    passingScore: 75,
    difficulty: SimulationDifficulty.MEDIUM,
    status: ContentStatus.DRAFT,
    questions: [
      {
        prompt: 'Which findings require immediate follow-up? Select all that apply.',
        mode: SimulationQuestionMode.MULTI,
        correctAnswerKey: ['A', 'B', 'D'],
        choices: [
          { id: 'A', text: 'SpO2 88% on room air', correct: true },
          { id: 'B', text: 'Respiratory rate 30/min', correct: true },
          { id: 'C', text: 'Client states mild thirst', correct: false },
          { id: 'D', text: 'Crackles at both lung bases', correct: true },
        ],
        explanation:
          'SpO2 88% indicates hypoxemia, RR 30 reflects significant respiratory distress, and bilateral crackles suggest pulmonary edema or atelectasis — all require immediate follow-up. Mild thirst is a comfort need, not an acute clinical emergency.',
        rationale:
          'Rapid recognition of deteriorating respiratory status is a high-stakes nursing competency. The combination of low SpO2, tachypnea, and abnormal lung sounds forms a pattern requiring immediate assessment and provider notification.',
        distractorRationale: {
          C: 'Mild thirst is a routine comfort complaint that does not indicate acute clinical deterioration and is not an immediate follow-up priority.',
        },
      },
    ],
  },
  null,
  2
);

export const CASE_STUDY_JSON_TEMPLATE = JSON.stringify(
  {
    title: 'Heart Failure Case Study',
    description: 'Clinical reasoning case for fluid overload management.',
    scenario: 'A client with worsening dyspnea arrives with bilateral edema and orthopnea.',
    scoringMode: CaseStudyScoringMode.MANUAL,
    status: ContentStatus.DRAFT,
    questions: [
      {
        prompt: 'What assessment findings suggest fluid volume excess?',
        expectedKeywords: ['edema', 'crackles', 'orthopnea'],
        maxScore: 3,
        explanation:
          'Fluid volume excess in heart failure produces bilateral edema from elevated venous pressure, pulmonary crackles from interstitial fluid, and orthopnea from fluid redistribution in the supine position.',
        modelAnswer:
          'Assessment findings supporting fluid volume excess include bilateral pitting edema, pulmonary crackles on auscultation, and orthopnea requiring elevated head-of-bed positioning. Rapid weight gain (>2 lb/day) and elevated JVP are additional hallmarks.',
      },
      {
        prompt: 'What nursing action should be prioritized first?',
        expectedKeywords: ['oxygen', 'positioning', 'assessment'],
        maxScore: 2,
        explanation:
          'Positioning in high Fowler\'s reduces preload and work of breathing; oxygen addresses hypoxemia. These nurse-initiated actions do not require a provider order and should occur before or concurrent with notification.',
        modelAnswer:
          'Position the client in high Fowler\'s (60–90°) to reduce venous return and alleviate orthopnea, then apply supplemental oxygen per protocol to maintain SpO2 ≥90%. Notify the provider using SBAR with current findings.',
      },
    ],
  },
  null,
  2
);


export async function readJsonFileText(file: File): Promise<string> {
  if (!file) {
    throw new Error('Select a JSON file to import.');
  }

  return file.text();
}

export function downloadJsonTemplateFile(fileName: string, jsonText: string): void {
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
export function parseAssessmentJsonImport(rawJson: string): AssessmentJsonImport {
  const record = parseTopLevelRecord(rawJson, 'assessment import');
  return {
    title: readOptionalString(record['title']),
    description: readOptionalString(record['description']),
    assessmentType: readOptionalEnum(record['assessmentType'], AssessmentType),
    passingScore: readOptionalNumber(record['passingScore']),
    durationMin: readOptionalNumber(record['durationMin']),
    order: readOptionalNumber(record['order']),
    active: readOptionalBoolean(record['active']),
    status: readOptionalEnum(record['status'], ContentStatus),
    questions: parseChoiceQuestions(record['questions'] ?? record),
  };
}

export function parseSimulationJsonImport(rawJson: string): SimulationJsonImport {
  const record = parseTopLevelRecord(rawJson, 'simulation import');
  return {
    title: readOptionalString(record['title']),
    description: readOptionalString(record['description']),
    simulationType: readOptionalEnum(record['simulationType'], SimulationType),
    durationMin: readOptionalNumber(record['durationMin']),
    passingScore: readOptionalNumber(record['passingScore']),
    difficulty: readOptionalEnum(record['difficulty'], SimulationDifficulty),
    order: readOptionalNumber(record['order']),
    active: readOptionalBoolean(record['active']),
    status: readOptionalEnum(record['status'], ContentStatus),
    questions: parseChoiceQuestions(record['questions'] ?? record),
  };
}

export function parseCaseStudyJsonImport(rawJson: string): CaseStudyJsonImport {
  const record = parseTopLevelRecord(rawJson, 'case study import');
  return {
    title: readOptionalString(record['title']),
    description: readOptionalString(record['description']),
    scenario: readOptionalString(record['scenario']),
    scoringMode: readOptionalEnum(record['scoringMode'], CaseStudyScoringMode),
    order: readOptionalNumber(record['order']),
    active: readOptionalBoolean(record['active']),
    status: readOptionalEnum(record['status'], ContentStatus),
    questions: parseCaseStudyQuestions(record['questions'] ?? record),
  };
}

function parseTopLevelRecord(rawJson: string, label: string): JsonRecord {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    throw new Error(`Paste ${label} JSON before importing.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid ${label} JSON.`);
  }

  if (Array.isArray(parsed)) {
    return { questions: parsed };
  }

  if (!isRecord(parsed)) {
    throw new Error(`The ${label} must be a JSON object or an array of questions.`);
  }

  return parsed;
}

function parseChoiceQuestions(source: unknown): ImportedChoiceQuestion[] {
  if (!Array.isArray(source)) {
    throw new Error('Questions must be provided as an array.');
  }

  const questions = source.map((entry, index) => parseChoiceQuestion(entry, index));
  if (questions.length === 0) {
    throw new Error('At least one question is required for import.');
  }
  return questions;
}

function parseChoiceQuestion(source: unknown, index: number): ImportedChoiceQuestion {
  if (!isRecord(source)) {
    throw new Error(`Question ${index + 1} must be an object.`);
  }

  const prompt = readRequiredString(source['prompt'], `Question ${index + 1} prompt`);
  const choices = parseChoices(source['choices'], index);
  const correctCount = choices.filter((choice) => choice.correct).length;
  if (correctCount === 0) {
    throw new Error(`Question ${index + 1} must have at least one correct choice.`);
  }

  const requestedMode = normalizeQuestionMode(source['mode']);
  if (requestedMode === SimulationQuestionMode.SINGLE && correctCount > 1) {
    throw new Error(`Question ${index + 1} is marked as single choice but has multiple correct answers.`);
  }

  return {
    prompt,
    mode: requestedMode ?? (correctCount > 1 ? SimulationQuestionMode.MULTI : SimulationQuestionMode.SINGLE),
    correctAnswerKey: readStringArray(source['correctAnswerKey']).length
      ? readStringArray(source['correctAnswerKey'])
      : undefined,
    choices,
    explanation: readOptionalString(source['explanation']),
    rationale: readOptionalString(source['rationale']),
    distractorRationale: readOptionalRecord(source['distractorRationale']),
  };
}

function parseChoices(source: unknown, questionIndex: number): ImportedChoiceItem[] {
  if (!Array.isArray(source) || source.length < 2) {
    throw new Error(`Question ${questionIndex + 1} must contain at least two choices.`);
  }

  return source.map((entry, choiceIndex) => {
    if (typeof entry === 'string') {
      const text = entry.trim();
      if (!text) {
        throw new Error(`Question ${questionIndex + 1}, choice ${choiceIndex + 1} cannot be empty.`);
      }
      return { text, correct: false };
    }

    if (!isRecord(entry)) {
      throw new Error(`Question ${questionIndex + 1}, choice ${choiceIndex + 1} must be an object or string.`);
    }

    return {
      id: readOptionalString(entry['id']),
      text: readRequiredString(entry['text'], `Question ${questionIndex + 1}, choice ${choiceIndex + 1} text`),
      correct: entry['correct'] === true,
    };
  });
}

function parseCaseStudyQuestions(source: unknown): ImportedCaseStudyQuestion[] {
  if (!Array.isArray(source)) {
    throw new Error('Questions must be provided as an array.');
  }

  const questions = source.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Question ${index + 1} must be an object.`);
    }

    return {
      prompt: readRequiredString(entry['prompt'], `Question ${index + 1} prompt`),
      expectedKeywords: readStringArray(entry['expectedKeywords']),
      maxScore: Math.max(readOptionalNumber(entry['maxScore']) ?? 1, 1),
      explanation: readOptionalString(entry['explanation']),
      modelAnswer: readOptionalString(entry['modelAnswer']),
    };
  });

  if (questions.length === 0) {
    throw new Error('At least one question is required for import.');
  }

  return questions;
}

function normalizeQuestionMode(value: unknown): SimulationQuestionMode | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === SimulationQuestionMode.SINGLE) {
    return SimulationQuestionMode.SINGLE;
  }
  if (normalized === SimulationQuestionMode.MULTI || normalized === 'multiple') {
    return SimulationQuestionMode.MULTI;
  }
  return undefined;
}

function readRequiredString(value: unknown, label: string): string {
  const normalized = readOptionalString(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readOptionalEnum<T extends Record<string, string>>(value: unknown, enumType: T): T[keyof T] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return (Object.values(enumType) as string[]).includes(normalized) ? (normalized as T[keyof T]) : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => !!entry);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && v.trim()) {
      result[k] = v.trim();
    }
  }
  return Object.keys(result).length ? result : undefined;
}