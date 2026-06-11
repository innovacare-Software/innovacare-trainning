import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {AgentId, CommandCenterSnapshot} from "./models";
import {
  AGENT_CATALOG,
  assertGlobalAgentAccess,
  buildCommandCenterSnapshot,
  createAgentRun,
  createScheduledExecutiveRun,
  listAccessibleAgents,
  processAgentRun,
  processQueuedRuns,
  resolveAgentAccess,
  reviewActionQueueItem,
} from "./service";

type ScopedPayload = {
  organizationId?: string | null;
};

type QueueAgentRunPayload = {
  agentId: AgentId;
  organizationId?: string | null;
  learnerUid?: string | null;
  courseId?: string | null;
  programId?: string | null;
  executeNow?: boolean;
};

type ReviewActionPayload = {
  itemId: string;
  status: "approved" | "rejected";
  note?: string | null;
};

function requireUid<T>(request: CallableRequest<T>): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return uid;
}

export const listAiAgents = onCall(
  {cors: true, timeoutSeconds: 30, memory: "256MiB"},
  async (request: CallableRequest<ScopedPayload>) => {
    const uid = requireUid(request);
    const access = await resolveAgentAccess(uid, request.data?.organizationId || null);
    return {agents: listAccessibleAgents(access)};
  },
);

export const getAiCommandCenterSnapshot = onCall(
  {cors: true, timeoutSeconds: 60, memory: "512MiB"},
  async (request: CallableRequest<ScopedPayload>): Promise<CommandCenterSnapshot> => {
    const uid = requireUid(request);
    const access = await resolveAgentAccess(uid, request.data?.organizationId || null);
    return buildCommandCenterSnapshot(access);
  },
);

export const queueAiAgentRun = onCall(
  {cors: true, timeoutSeconds: 120, memory: "512MiB"},
  async (request: CallableRequest<QueueAgentRunPayload>) => {
    const uid = requireUid(request);

    const payload = request.data || ({} as QueueAgentRunPayload);
    if (!payload.agentId || !AGENT_CATALOG.some((agent) => agent.id === payload.agentId)) {
      throw new HttpsError("invalid-argument", "A valid agentId is required.");
    }
    const access = await resolveAgentAccess(uid, payload.organizationId || null);
    if (!access.allowedAgentIds.includes(payload.agentId)) {
      throw new HttpsError("permission-denied", "This agent is not available in the current scope.");
    }

    const runId = await createAgentRun({
      agentId: payload.agentId,
      scope: {
        organizationId: access.organizationId || payload.organizationId || null,
        learnerUid: payload.learnerUid || null,
        courseId: payload.courseId || null,
        programId: payload.programId || null,
        source: "manual",
        requestedBy: uid,
      },
    });

    if (payload.executeNow !== false) {
      await processAgentRun(runId, uid);
    }

    return {ok: true, runId};
  },
);

export const reviewAiActionQueueItem = onCall(
  {cors: true, timeoutSeconds: 60, memory: "256MiB"},
  async (request: CallableRequest<ReviewActionPayload>) => {
    const uid = requireUid(request);
    await assertGlobalAgentAccess(uid);

    const payload = request.data || ({} as ReviewActionPayload);
    if (!payload.itemId) {
      throw new HttpsError("invalid-argument", "itemId is required.");
    }
    if (payload.status !== "approved" && payload.status !== "rejected") {
      throw new HttpsError("invalid-argument", "status must be approved or rejected.");
    }

    await reviewActionQueueItem({
      itemId: payload.itemId,
      reviewerUid: uid,
      status: payload.status,
      note: payload.note || null,
    });

    return {ok: true};
  },
);

export const processQueuedAiAgentRuns = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    await processQueuedRuns(10, "system_scheduler");
  },
);

export const scheduleExecutiveInsightSweep = onSchedule(
  {
    schedule: "every day 05:00",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 180,
  },
  async () => {
    const runId = await createScheduledExecutiveRun();
    await processAgentRun(runId, "system_scheduler");
  },
);
