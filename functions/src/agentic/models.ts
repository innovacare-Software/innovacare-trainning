export type AgentId =
  | "student_success"
  | "learning_coach"
  | "exam_readiness"
  | "instructor_assistant"
  | "content_optimization"
  | "sales_enrollment"
  | "certification"
  | "executive_insights";

export type AgentRunStatus = "queued" | "running" | "completed" | "failed";

export type RecommendationPriority = "low" | "medium" | "high" | "critical";

export type RecommendationStatus = "open" | "approved" | "dismissed" | "implemented";

export type ActionApprovalType =
  | "certificate_issue"
  | "outreach_message"
  | "content_change"
  | "campaign_launch"
  | "human_review";

export type ActionQueueStatus = "pending" | "approved" | "rejected" | "executed";

export type AgentDefinition = {
  id: AgentId;
  name: string;
  goal: string;
  responsibilities: string[];
  memoryCollections: string[];
  tools: string[];
  permissions: string[];
  escalationPaths: string[];
};

export type AgentRunScope = {
  organizationId?: string | null;
  learnerUid?: string | null;
  courseId?: string | null;
  programId?: string | null;
  source: "manual" | "scheduled" | "event";
  requestedBy: string;
};

export type AgentRunDoc = {
  agentId: AgentId;
  status: AgentRunStatus;
  scope: AgentRunScope;
  createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  startedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  completedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  summary?: string;
  confidenceScore?: number;
  outputs?: Record<string, unknown>;
  recommendationIds?: string[];
  actionIds?: string[];
  error?: string | null;
};

export type AgentRecommendationDoc = {
  agentId: AgentId;
  runId: string;
  title: string;
  summary: string;
  priority: RecommendationPriority;
  confidenceScore: number;
  status: RecommendationStatus;
  organizationId?: string | null;
  learnerUid?: string | null;
  actionType?: ActionApprovalType | null;
  requiresApproval: boolean;
  rationale: string[];
  createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type AgentActionQueueDoc = {
  recommendationId: string;
  runId: string;
  agentId: AgentId;
  title: string;
  approvalType: ActionApprovalType;
  status: ActionQueueStatus;
  organizationId?: string | null;
  learnerUid?: string | null;
  confidenceScore: number;
  note?: string | null;
  createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  reviewedBy?: string | null;
};

export type AgentAuditLogDoc = {
  eventType:
    | "agent_run_created"
    | "agent_run_completed"
    | "agent_run_failed"
    | "action_reviewed";
  actorUid: string;
  agentId?: AgentId;
  runId?: string;
  recommendationId?: string;
  actionQueueId?: string;
  organizationId?: string | null;
  learnerUid?: string | null;
  details?: Record<string, unknown>;
  createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type CommandCenterSnapshot = {
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
    status: AgentRunStatus;
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
    priority: RecommendationPriority;
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
    approvalType: ActionApprovalType;
    confidenceScore: number;
    organizationId?: string | null;
    learnerUid?: string | null;
    createdAt: string | null;
  }>;
};
