import { Timestamp } from '@angular/fire/firestore';

// ── Lab category & difficulty ─────────────────────────────────────────────────

export type LabCategory =
  | 'devops'
  | 'cloud'
  | 'linux'
  | 'web-development'
  | 'agentic-ai'
  | 'ai-agent-creation'
  | 'rag-prompt-stack'
  | 'sysadmin-aiops';

export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'enterprise';

export type LabType = 'browser' | 'agent-config' | 'cloud-guided' | 'container-future';

export type LabStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ValidationMode = 'rules' | 'command-future' | 'ai-rubric' | 'hybrid';

// ── Lab Definition (Firestore: labDefinitions/{labId}) ────────────────────────

/**
 * Metadata-only Firestore document for a lab.
 * NEVER store large file content here — use Firebase Storage.
 */
export interface LabDefinition {
  id: string;
  /** Program this lab belongs to. Required for program-scoped labs (all new labs). */
  programId?: string;
  /** Module within the program this lab is attached to. Required for program-scoped labs. */
  moduleId?: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  category: LabCategory;
  difficulty: LabDifficulty;
  labType: LabType;
  status: LabStatus;
  estimatedMinutes: number;
  xp: number;
  /** Optional back-link to a specific lesson inside the module */
  lessonId?: string;
  order: number;
  tags: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  /** Storage path prefix for starter files, e.g. labs/definitions/{labId}/starter/ */
  starterFilesPath: string;
  /** Storage path prefix for solution files */
  solutionFilesPath?: string;
  /** Storage path to the Markdown instructions file */
  instructionsPath?: string;
  validationMode: ValidationMode;
  previewEnabled: boolean;
  terminalEnabled: boolean;
  aiCoachEnabled: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  createdBy: string;
}

// ── Lab Task (Firestore: labDefinitions/{labId}/tasks/{taskId}) ───────────────

export interface LabTask {
  id: string;
  order: number;
  title: string;
  mission: string;
  instructions: string;
  expectedFiles: string[];
  xp: number;
  validationRules: ValidationRule[];
  hints: string[];
  successCriteria: string[];
  redTeamChallenge?: string;
  approvalGateScenario?: string;
}

// ── Lab File Definition (Firestore: labDefinitions/{labId}/files/{fileId}) ────

export type LabFileLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'text'
  | 'shell';

export interface LabFileDefinition {
  id: string;
  /** Relative file path shown in the explorer, e.g. "src/index.html" */
  path: string;
  language: LabFileLanguage;
  readonly: boolean;
  required: boolean;
  /** Full Storage path to the starter file content */
  starterStoragePath: string;
  /** Full Storage path to the solution file content (optional) */
  solutionStoragePath?: string;
  /**
   * Inline starter file content stored in Firestore.
   * Preferred over Storage for small text files (< 900 KB).
   * If present, the workspace service uses this directly and
   * skips the Firebase Storage fetch, eliminating 404 / CORS issues.
   */
  starterContent?: string;
}

// ── Validation Rules ──────────────────────────────────────────────────────────

export type ValidationRule =
  | ContainsRule
  | NotContainsRule
  | ValidJsonRule
  | ValidYamlRule
  | JsonPathExistsRule
  | RegexRule
  | RequiredFileRule
  | HtmlElementExistsRule
  | MarkdownSectionExistsRule
  | AiRubricRule;

export interface ContainsRule {
  type: 'contains';
  file: string;
  value: string;
  caseSensitive?: boolean;
  points: number;
}

export interface NotContainsRule {
  type: 'not_contains';
  file: string;
  value: string;
  caseSensitive?: boolean;
  points: number;
}

export interface ValidJsonRule {
  type: 'valid_json';
  file: string;
  points: number;
}

export interface ValidYamlRule {
  type: 'valid_yaml';
  file: string;
  points: number;
}

export interface JsonPathExistsRule {
  type: 'json_path_exists';
  file: string;
  /** JSONPath expression, e.g. "$.required" */
  path: string;
  points: number;
}

export interface RegexRule {
  type: 'regex';
  file: string;
  pattern: string;
  flags?: string;
  points: number;
}

export interface RequiredFileRule {
  type: 'required_file';
  file: string;
  points: number;
}

export interface HtmlElementExistsRule {
  type: 'html_element_exists';
  file: string;
  /** CSS selector, e.g. "h1.hero-title" */
  selector: string;
  points: number;
}

export interface MarkdownSectionExistsRule {
  type: 'markdown_section_exists';
  file: string;
  /** Heading text to search for, e.g. "Deployment Steps" */
  heading: string;
  /** Alias for heading — used by JSON import model */
  section?: string;
  points: number;
}

export interface AiRubricRule {
  type: 'ai_rubric';
  file: string;
  rubric: string;
  points: number;
  /** AI rubric alone never gates passing — must combine with deterministic rules */
  advisory?: boolean;
}

// ── Future Runtime Adapter Interface ─────────────────────────────────────────

export type LabRuntimeType = 'browser' | 'agent-config' | 'container' | 'cloud-guided';
