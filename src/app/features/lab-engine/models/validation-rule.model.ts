/**
 * Re-exports all validation rule types from lab-definition.model.ts
 * and adds runtime adapter interfaces for future extension.
 */
export type {
  ValidationRule,
  ContainsRule,
  NotContainsRule,
  ValidJsonRule,
  ValidYamlRule,
  JsonPathExistsRule,
  RegexRule,
  RequiredFileRule,
  HtmlElementExistsRule,
  MarkdownSectionExistsRule,
  AiRubricRule,
} from './lab-definition.model';

export type { ValidationResult, ValidationRun } from './lab-session.model';


import type { LabDefinition } from './lab-definition.model';
import type { LabSession, WorkspaceFile } from './lab-session.model';
import type { ValidationRun } from './lab-session.model';

// ── Future Runtime Adapter Contract ──────────────────────────────────────────

/**
 * All future lab runtimes MUST implement this interface.
 *
 * Implemented now:
 *   - BrowserLabRuntimeAdapter  (MVP)
 *   - AgentConfigLabRuntimeAdapter (MVP)
 *
 * Planned (TODO):
 *   - ContainerLabRuntimeAdapter   (Phase 3)
 *   - CloudGuidedLabRuntimeAdapter (Phase 4)
 */
export interface LabRuntimeAdapter {
  initializeSession(lab: LabDefinition, userId: string): Promise<LabSession>;
  loadWorkspace(sessionId: string): Promise<WorkspaceFile[]>;
  saveFile(sessionId: string, filePath: string, content: string): Promise<void>;
  validate(sessionId: string): Promise<ValidationRun>;
  cleanup(sessionId: string): Promise<void>;
}

// ── AI Coach Policy ───────────────────────────────────────────────────────────

export type AiCoachAction =
  | 'explain_error'
  | 'give_hint'
  | 'review_code'
  | 'suggest_next_step'
  | 'explain_concept'
  | 'provide_partial_example'
  | 'reveal_full_solution_before_attempt'
  | 'generate_complete_final_submission'
  | 'execute_cloud_action'
  | 'expose_secrets'
  | 'bypass_approval_gates';

export const AI_COACH_ALLOWED_ACTIONS: AiCoachAction[] = [
  'explain_error',
  'give_hint',
  'review_code',
  'suggest_next_step',
  'explain_concept',
  'provide_partial_example',
];

export const AI_COACH_BLOCKED_ACTIONS: AiCoachAction[] = [
  'reveal_full_solution_before_attempt',
  'generate_complete_final_submission',
  'execute_cloud_action',
  'expose_secrets',
  'bypass_approval_gates',
];

export interface AiCoachRequest {
  action: AiCoachAction;
  sessionId: string;
  labId: string;
  filePath?: string;
  question: string;
  fileContent?: string;
}

export interface AiCoachResponse {
  message: string;
  isGuidance: boolean; // always true — coach never provides authoritative grading
  suggestedHints?: string[];
  riskLevel?: 'safe' | 'advisory';
}
