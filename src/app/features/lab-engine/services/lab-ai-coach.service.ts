import { Injectable, inject, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  AiCoachRequest,
  AiCoachResponse,
  AI_COACH_ALLOWED_ACTIONS,
  AI_COACH_BLOCKED_ACTIONS,
} from '../models/validation-rule.model';

/**
 * AI Coach service abstraction.
 *
 * Security policy:
 *  - AI Coach NEVER reveals full solution before learner attempts.
 *  - All responses are marked isGuidance: true.
 *  - Blocked actions return a safe refusal message.
 *  - Rate-limit: max 10 requests per session (tracked in memory).
 *
 * MVP Implementation: Mock guided responses.
 * Production: Replace mock with Firebase Callable Function → Vertex AI.
 */
@Injectable({ providedIn: 'root' })
export class LabAiCoachService {
  private readonly functions = inject(Functions);

  readonly isLoading = signal(false);
  readonly lastResponse = signal<AiCoachResponse | null>(null);
  readonly requestCount = signal(0);

  private readonly MAX_REQUESTS_PER_SESSION = 10;

  // ── Public interface ───────────────────────────────────────────────────────

  /**
   * Send a request to the AI Coach.
   * Returns a guided response following the AI Coach Policy.
   */
  async ask(request: AiCoachRequest): Promise<AiCoachResponse> {
    // Enforce blocked actions
    if (AI_COACH_BLOCKED_ACTIONS.includes(request.action)) {
      return this.refusalResponse(request.action);
    }

    // Rate limiting
    if (this.requestCount() >= this.MAX_REQUESTS_PER_SESSION) {
      return {
        message:
          'You have reached the AI Coach session limit. Review your work and try to solve the remaining tasks on your own. You can always reset the session if needed.',
        isGuidance: true,
        riskLevel: 'safe',
      };
    }

    this.isLoading.set(true);
    this.requestCount.update((n) => n + 1);

    try {
      // Try Firebase callable function first (production path)
      const response = await this.callCloudFunction(request);
      this.lastResponse.set(response);
      return response;
    } catch {
      // Fall back to mock responses (development / emulator)
      const mock = this.getMockResponse(request);
      this.lastResponse.set(mock);
      return mock;
    } finally {
      this.isLoading.set(false);
    }
  }

  resetSession(): void {
    this.requestCount.set(0);
    this.lastResponse.set(null);
  }

  // ── Cloud function call (production) ───────────────────────────────────────

  private async callCloudFunction(request: AiCoachRequest): Promise<AiCoachResponse> {
    const fn = httpsCallable<AiCoachRequest, AiCoachResponse>(
      this.functions,
      'generateLabCoachFeedback',
    );
    const result = await fn(request);
    return result.data;
  }

  // ── Mock responses (development fallback) ─────────────────────────────────

  private getMockResponse(request: AiCoachRequest): AiCoachResponse {
    const hints: Record<string, AiCoachResponse> = {
      explain_error: {
        message: `I see you're running into an issue. Let's break it down:\n\n1. Check that your file "${request.filePath ?? 'the required file'}" exists and has the expected structure.\n2. Review the task instructions carefully — they describe exactly what fields are required.\n3. Look at the validation error message — it points to the specific missing element.\n\nTry fixing one issue at a time and re-validate.`,
        isGuidance: true,
        riskLevel: 'safe',
        suggestedHints: [
          'Check file structure against the task description',
          'Validate syntax using an online tool',
          'Re-read the mission brief',
        ],
      },
      give_hint: {
        message: `Here's a hint for your current task:\n\nThe task requires you to define specific fields in the configuration file. Review the task checklist — each item corresponds to a required element.\n\nFor this type of file, ensure:\n- Required top-level keys are present\n- Values are correctly formatted (string, array, or object)\n- Indentation is consistent (YAML uses spaces, not tabs)\n\nDon't give up — you're close!`,
        isGuidance: true,
        riskLevel: 'safe',
      },
      review_code: {
        message: `I've reviewed your file "${request.filePath ?? ''}". Here's my guidance:\n\n✓ Good structure overall\n⚠ Check that all required fields are present\n⚠ Validate the format matches the task specification\n\nRemember: I'm here to guide, not to write your solution. Make sure you understand each section you add.`,
        isGuidance: true,
        riskLevel: 'safe',
      },
      suggest_next_step: {
        message: `Based on where you are in the lab, here's what I'd suggest next:\n\n1. Complete the current task file before moving to the next\n2. Run "Validate Current Task" to check your progress\n3. If validation passes, move to the next task in the stepper\n4. Remember to save your work frequently\n\nYou've got this — enterprise skills are built step by step!`,
        isGuidance: true,
        riskLevel: 'safe',
      },
      explain_concept: {
        message: `Great question! Let me explain the concept:\n\nIn enterprise AI agent design, every agent needs a clear **mission**, defined **boundaries**, and explicit **approval gates**. This prevents runaway automation and ensures human oversight for high-risk actions.\n\nThe key principle: **Default Deny** — block everything not explicitly allowed, rather than allowing everything not explicitly blocked.\n\nThis is critical for production AI systems in regulated industries.`,
        isGuidance: true,
        riskLevel: 'safe',
      },
      provide_partial_example: {
        message: `Here's a partial example to guide you (not the complete solution):\n\n\`\`\`yaml\nagent_manifest:\n  mission: "[Your mission statement here]"\n  allowed_actions:\n    - "[Action 1]"\n    - "[Action 2]"\n  # Continue from here...\n\`\`\`\n\nFill in the brackets with your own content based on the task requirements. The full structure should match the task specification.`,
        isGuidance: true,
        riskLevel: 'safe',
      },
    };

    return hints[request.action] ?? {
      message: `I can help you with: explaining errors, giving hints, reviewing code, suggesting next steps, explaining concepts, and providing partial examples.\n\nWhat specific aspect of the task are you stuck on?`,
      isGuidance: true,
      riskLevel: 'safe',
    };
  }

  private refusalResponse(action: string): AiCoachResponse {
    return {
      message: `I can't help with that specific request. My role is to **guide** you, not to complete the lab for you.\n\nI can:\n- Explain what an error means\n- Give hints about the right approach\n- Review your code and provide feedback\n- Suggest your next step\n- Explain the underlying concept\n\nTry again with a more specific question about what you're struggling with!`,
      isGuidance: true,
      riskLevel: 'advisory',
    };
  }
}
