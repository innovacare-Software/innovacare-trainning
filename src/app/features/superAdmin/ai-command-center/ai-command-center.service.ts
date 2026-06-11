import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export type AgentId =
  | 'student_success'
  | 'learning_coach'
  | 'exam_readiness'
  | 'instructor_assistant'
  | 'content_optimization'
  | 'sales_enrollment'
  | 'certification'
  | 'executive_insights';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  goal: string;
  responsibilities: string[];
  memoryCollections: string[];
  tools: string[];
  permissions: string[];
  escalationPaths: string[];
}

export interface CommandCenterSnapshot {
  generatedAt: string;
  metrics: {
    organizations: number;
    learners: number;
    openRecommendations: number;
    pendingApprovals: number;
    completedRuns7d: number;
  };
  agents: AgentDefinition[];
  recentRuns: Array<{
    id: string;
    agentId: AgentId;
    status: 'queued' | 'running' | 'completed' | 'failed';
    summary: string;
    confidenceScore: number;
    createdAt: string | null;
    completedAt: string | null;
  }>;
  recommendations: Array<{
    id: string;
    agentId: AgentId;
    title: string;
    summary: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;
    organizationId?: string | null;
    learnerUid?: string | null;
    requiresApproval: boolean;
    createdAt: string | null;
  }>;
  pendingApprovals: Array<{
    id: string;
    agentId: AgentId;
    title: string;
    approvalType: 'certificate_issue' | 'outreach_message' | 'content_change' | 'campaign_launch' | 'human_review';
    confidenceScore: number;
    organizationId?: string | null;
    learnerUid?: string | null;
    createdAt: string | null;
  }>;
}

export interface CommandCenterScopeInput {
  organizationId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiCommandCenterService {
  private readonly functions = inject(Functions);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  async getSnapshot(input: CommandCenterScopeInput = {}): Promise<CommandCenterSnapshot> {
    const fn = this.inContext(() =>
      httpsCallable<CommandCenterScopeInput, CommandCenterSnapshot>(this.functions, 'getAiCommandCenterSnapshot')
    );
    const result = await fn(input);
    return result.data;
  }

  async runAgent(input: {
    agentId: AgentId;
    organizationId?: string | null;
    learnerUid?: string | null;
    courseId?: string | null;
    programId?: string | null;
  }): Promise<{ ok: boolean; runId: string }> {
    const fn = this.inContext(() =>
      httpsCallable<typeof input & { executeNow?: boolean }, { ok: boolean; runId: string }>(
        this.functions,
        'queueAiAgentRun'
      )
    );
    const result = await fn({ ...input, executeNow: true });
    return result.data;
  }

  async reviewApproval(input: {
    itemId: string;
    status: 'approved' | 'rejected';
    note?: string | null;
  }): Promise<{ ok: boolean }> {
    const fn = this.inContext(() =>
      httpsCallable<typeof input, { ok: boolean }>(this.functions, 'reviewAiActionQueueItem')
    );
    const result = await fn(input);
    return result.data;
  }
}
