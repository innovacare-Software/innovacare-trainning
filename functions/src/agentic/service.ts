import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {
  ActionApprovalType,
  AgentActionQueueDoc,
  AgentAuditLogDoc,
  AgentDefinition,
  AgentId,
  AgentRecommendationDoc,
  AgentRunDoc,
  AgentRunScope,
  CommandCenterSnapshot,
  RecommendationPriority,
  RecommendationStatus,
} from "./models";

type AccessContext = {
  uid: string;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
  allowedAgentIds: AgentId[];
};

type LearnerSignal = {
  uid: string;
  displayName: string;
  email: string;
  organizationId: string | null;
  onboardingSteps: number;
  onboardingCompleted: boolean;
  enrollmentCount: number;
  completedEnrollmentCount: number;
  averageScore: number | null;
  lowScoreCourses: string[];
  riskScore: number;
  readinessScore: number;
  completionRate: number;
  inactivityDays: number;
  engagementLabel: "active" | "watch" | "stale" | "critical";
  updatedAt: Date | null;
};

type AgentEvaluationResult = {
  summary: string;
  confidenceScore: number;
  outputs: Record<string, unknown>;
  recommendations: Array<{
    title: string;
    summary: string;
    priority: RecommendationPriority;
    confidenceScore: number;
    organizationId?: string | null;
    learnerUid?: string | null;
    requiresApproval: boolean;
    actionType?: ActionApprovalType;
    rationale: string[];
  }>;
};

const USERS_COLLECTION = "users";
const RUNS_COLLECTION = "aiAgentRuns";
const RECOMMENDATIONS_COLLECTION = "aiRecommendations";
const ACTION_QUEUE_COLLECTION = "aiActionQueue";
const AUDIT_COLLECTION = "aiAuditLogs";
const LEARNER_ROLES = ["learner", "org_learner", "guest", "programLearner"];
const ORG_ADMIN_ROLES = ["org_admin", "program_admin"];
const ORG_SCOPED_AGENT_IDS: AgentId[] = [
  "student_success",
  "learning_coach",
  "exam_readiness",
  "instructor_assistant",
  "content_optimization",
  "certification",
];

export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: "student_success",
    name: "Student Success Agent",
    goal: "Detect learner risk early and orchestrate retention interventions.",
    responsibilities: [
      "Monitor engagement and completion patterns",
      "Detect inactivity, abandonment risk and weak assessment signals",
      "Draft retention actions for learner support teams",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "users/{uid}/enrollments"],
    tools: ["Firestore learner profile reads", "Enrollment analytics", "Notification drafting"],
    permissions: ["super_admin"],
    escalationPaths: ["Instructor assistant", "Human learner support lead"],
  },
  {
    id: "learning_coach",
    name: "Learning Coach Agent",
    goal: "Personalize study plans from performance and progression data.",
    responsibilities: [
      "Recommend next lessons and remediation loops",
      "Adapt study cadence to learner performance",
      "Generate short-horizon study plans",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "users/{uid}/enrollments"],
    tools: ["Enrollment history", "Onboarding state", "Assessment score summaries"],
    permissions: ["super_admin"],
    escalationPaths: ["Student success", "Instructor assistant"],
  },
  {
    id: "exam_readiness",
    name: "Exam Readiness Agent",
    goal: "Estimate pass probability and identify readiness gaps.",
    responsibilities: [
      "Calculate readiness from scores and completion data",
      "Flag weak areas before certification attempts",
      "Propose remediation priorities",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "users/{uid}/enrollments"],
    tools: ["Exam score history", "Completion records", "Program progress"],
    permissions: ["super_admin"],
    escalationPaths: ["Learning coach", "Human instructor"],
  },
  {
    id: "instructor_assistant",
    name: "Instructor Assistant Agent",
    goal: "Reduce instructor workload with prioritized learner intervention briefs.",
    responsibilities: [
      "Summarize learners needing intervention",
      "Draft instructor daily briefings",
      "Recommend follow-up sequences",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "adminNotifications"],
    tools: ["At-risk learner signals", "Notification workflows", "Organization context"],
    permissions: ["super_admin"],
    escalationPaths: ["Student success", "Org admin"],
  },
  {
    id: "content_optimization",
    name: "Content Optimization Agent",
    goal: "Identify low-performing content and recommend redesign priorities.",
    responsibilities: [
      "Aggregate course completion and score signals",
      "Detect weak lessons, courses and assessments",
      "Recommend redesign and engagement improvements",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "courses", "users/{uid}/enrollments"],
    tools: ["Enrollment analytics", "Assessment outcomes", "Course metadata"],
    permissions: ["super_admin"],
    escalationPaths: ["Human content lead", "Program admin"],
  },
  {
    id: "sales_enrollment",
    name: "Sales and Enrollment Agent",
    goal: "Recover funnel drop-off and surface revenue opportunities.",
    responsibilities: [
      "Monitor registration pipeline quality",
      "Detect dormant leads and unconverted prospects",
      "Recommend recovery campaigns",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "register", "orders"],
    tools: ["Registration records", "Order history", "Organization context"],
    permissions: ["super_admin"],
    escalationPaths: ["Executive insights", "Human revenue ops"],
  },
  {
    id: "certification",
    name: "Certification Agent",
    goal: "Prepare certificate actions without issuing irreversible artifacts autonomously.",
    responsibilities: [
      "Verify completion and score criteria",
      "Detect completed learners missing certificates",
      "Queue approval-controlled certificate actions",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "aiActionQueue", "certificates"],
    tools: ["Enrollment completion checks", "Certificate registry", "Approval queue"],
    permissions: ["super_admin"],
    escalationPaths: ["Human certification reviewer", "Org admin"],
  },
  {
    id: "executive_insights",
    name: "Executive Insights Agent",
    goal: "Convert platform signals into portfolio-level operating intelligence.",
    responsibilities: [
      "Summarize organization, learner and recommendation trends",
      "Forecast operational pressure points",
      "Surface strategic priorities to leadership",
    ],
    memoryCollections: ["aiAgentRuns", "aiRecommendations", "aiActionQueue", "organizations"],
    tools: ["Cross-platform counts", "Recommendation trends", "Approval queue analytics"],
    permissions: ["super_admin"],
    escalationPaths: ["CEO / COO review", "Human strategy lead"],
  },
];

function ensureAdminApp(): FirebaseFirestore.Firestore {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function nowTimestamp(): FirebaseFirestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

function timestampToDate(value: unknown): Date | null {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isoOrNull(value: unknown): string | null {
  const date = timestampToDate(value);
  return date ? date.toISOString() : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, current) => sum + current, 0);
  return Math.round((total / values.length) * 100) / 100;
}

function daysSince(date: Date | null): number | null {
  if (!date) {
    return null;
  }
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function certificateDocId(uid: string, courseId: string): string {
  return `${uid}_${courseId}`.replace(/[^\w-]/g, "_");
}

async function getAccessContext(uid: string): Promise<AccessContext> {
  const db = ensureAdminApp();
  const userSnap = await db.doc(`${USERS_COLLECTION}/${uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const role = String(userSnap.get("role") || userSnap.get("primaryRole") || "");
  if (role === "super_admin") {
    return {
      uid,
      role,
      isSuperAdmin: true,
      organizationId: null,
      allowedAgentIds: AGENT_CATALOG.map((agent) => agent.id),
    };
  }

  const profileOrgId = userSnap.get("orgId") ? String(userSnap.get("orgId")) : null;
  const membershipSnap = await db
    .collection("userOrgMemberships")
    .where("userId", "==", uid)
    .where("status", "==", "active")
    .limit(20)
    .get();
  const orgAdminMembership = membershipSnap.docs
    .map((docSnap) => ({
      orgId: String(docSnap.get("orgId") || ""),
      role: String(docSnap.get("role") || "").toLowerCase(),
    }))
    .find((membership) => membership.orgId && ORG_ADMIN_ROLES.includes(membership.role));

  return {
    uid,
    role,
    isSuperAdmin: false,
    organizationId: orgAdminMembership?.orgId || profileOrgId || null,
    allowedAgentIds: ORG_SCOPED_AGENT_IDS,
  };
}

export async function assertGlobalAgentAccess(uid: string): Promise<AccessContext> {
  const access = await getAccessContext(uid);
  if (!access.isSuperAdmin) {
    throw new HttpsError("permission-denied", "Super admin access required.");
  }
  return access;
}

export async function resolveAgentAccess(uid: string, requestedOrganizationId?: string | null): Promise<AccessContext> {
  const access = await getAccessContext(uid);
  if (access.isSuperAdmin) {
    return {
      ...access,
      organizationId: requestedOrganizationId || null,
    };
  }

  const effectiveOrgId = requestedOrganizationId || access.organizationId;
  if (!effectiveOrgId) {
    throw new HttpsError("permission-denied", "An active organization scope is required.");
  }

  const membershipId = `${uid}__${effectiveOrgId}`;
  const membershipSnap = await ensureAdminApp().collection("userOrgMemberships").doc(membershipId).get();
  const membership = membershipSnap.data() || {};
  const membershipRole = String(membership["role"] || "").toLowerCase();
  const membershipStatus = String(membership["status"] || "").toLowerCase();

  if (membershipStatus !== "active" || !ORG_ADMIN_ROLES.includes(membershipRole)) {
    throw new HttpsError("permission-denied", "Org admin scope is required for this AI workspace.");
  }

  return {
    ...access,
    organizationId: effectiveOrgId,
  };
}

export function listAccessibleAgents(access: AccessContext): AgentDefinition[] {
  const allowed = new Set(access.allowedAgentIds);
  return AGENT_CATALOG.filter((agent) => allowed.has(agent.id));
}

async function writeAuditLog(entry: AgentAuditLogDoc): Promise<void> {
  await ensureAdminApp().collection(AUDIT_COLLECTION).add({
    ...entry,
    createdAt: nowTimestamp(),
  });
}

async function countCollection(path: string): Promise<number> {
  const snap = await ensureAdminApp().collection(path).count().get();
  return Number(snap.data().count || 0);
}

async function queryLearnerDocs(limitCount: number, organizationId?: string | null): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snap = await ensureAdminApp().collection(USERS_COLLECTION).limit(limitCount * 2).get();
  const filtered = snap.docs.filter((docSnap) => {
    const role = String(docSnap.get("role") || "");
    const orgId = String(docSnap.get("orgId") || "");
    return LEARNER_ROLES.includes(role) && (!organizationId || orgId === organizationId);
  });
  return filtered.slice(0, limitCount);
}

async function loadLearnerSignal(userDoc: FirebaseFirestore.DocumentSnapshot): Promise<LearnerSignal> {
  const db = ensureAdminApp();
  const data = userDoc.data() || {};
  const uid = userDoc.id;
  const enrollmentsSnap = await db.collection(`users/${uid}/enrollments`).limit(25).get();
  const scores: number[] = [];
  const lowScoreCourses: string[] = [];
  let completedEnrollmentCount = 0;

  for (const enrollment of enrollmentsSnap.docs) {
    const score = Number(enrollment.get("score"));
    const courseId = String(enrollment.get("courseId") || enrollment.get("courseTitle") || enrollment.id);
    const completed = enrollment.get("completed") === true || !!enrollment.get("completedAt");
    if (completed) {
      completedEnrollmentCount += 1;
    }
    if (Number.isFinite(score)) {
      scores.push(score);
      if (score < 75) {
        lowScoreCourses.push(courseId);
      }
    }
  }

  const onboarding = (data["onboarding"] || {}) as Record<string, unknown>;
  const completedStepIds = Array.isArray(onboarding["completedStepIds"])
    ? (onboarding["completedStepIds"] as unknown[])
    : [];
  const onboardingCompleted = Boolean(onboarding["completedAt"]);
  const updatedAt = timestampToDate(data["updatedAt"]);
  const inactivityDays = daysSince(updatedAt) || 0;
  const averageScoreValue = average(scores);
  const completionRate = enrollmentsSnap.size ? completedEnrollmentCount / enrollmentsSnap.size : 0;
  const engagementLabel = inactivityDays > 30 ? "critical" : inactivityDays > 14 ? "stale" : inactivityDays > 7 ? "watch" : "active";

  let riskScore = 0;
  if (!onboardingCompleted && completedStepIds.length < 2) {
    riskScore += 15;
  }
  if (!enrollmentsSnap.size) {
    riskScore += 25;
  }
  if (enrollmentsSnap.size > 0 && completedEnrollmentCount === 0) {
    riskScore += 10;
  }
  if (completionRate > 0 && completionRate < 0.35) {
    riskScore += 12;
  } else if (completionRate >= 0.35 && completionRate < 0.6) {
    riskScore += 6;
  }
  if (averageScoreValue !== null && averageScoreValue < 70) {
    riskScore += 25;
  } else if (averageScoreValue !== null && averageScoreValue < 80) {
    riskScore += 12;
  }
  if (inactivityDays > 30) {
    riskScore += 30;
  } else if (inactivityDays > 14) {
    riskScore += 20;
  } else if (inactivityDays > 7) {
    riskScore += 10;
  }

  const readinessSeed = averageScoreValue === null ? 55 : averageScoreValue;
  const readinessScore = clamp(
    Math.round(readinessSeed + completedEnrollmentCount * 4 - Math.max(riskScore - 40, 0) / 3),
    5,
    99,
  );

  return {
    uid,
    displayName: String(data["displayName"] || data["fullName"] || data["email"] || uid),
    email: String(data["email"] || ""),
    organizationId: data["orgId"] ? String(data["orgId"]) : null,
    onboardingSteps: completedStepIds.length,
    onboardingCompleted,
    enrollmentCount: enrollmentsSnap.size,
    completedEnrollmentCount,
    averageScore: averageScoreValue,
    lowScoreCourses: lowScoreCourses.slice(0, 3),
    riskScore: clamp(riskScore, 0, 100),
    readinessScore,
    completionRate: Math.round(completionRate * 100) / 100,
    inactivityDays,
    engagementLabel,
    updatedAt,
  };
}

async function loadLearnerSignals(scope: AgentRunScope, limitCount: number): Promise<LearnerSignal[]> {
  const db = ensureAdminApp();
  if (scope.learnerUid) {
    const learnerDoc = await db.doc(`${USERS_COLLECTION}/${scope.learnerUid}`).get();
    if (!learnerDoc.exists) {
      return [];
    }
    return [await loadLearnerSignal(learnerDoc)];
  }

  const learnerDocs = await queryLearnerDocs(limitCount, scope.organizationId || null);
  return Promise.all(learnerDocs.map((docSnap) => loadLearnerSignal(docSnap)));
}

async function evaluateStudentSuccess(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const signals = await loadLearnerSignals(scope, 18);
  const atRisk = signals.filter((signal) => signal.riskScore >= 45).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return {
    summary: atRisk.length
      ? `${atRisk.length} learners need intervention; top risk is ${atRisk[0].displayName} with a risk score of ${atRisk[0].riskScore}.`
      : "No immediate learner abandonment cluster was detected in the current scope.",
    confidenceScore: atRisk.length ? 0.81 : 0.62,
    outputs: {
      learnersAnalyzed: signals.length,
      highRiskLearners: atRisk.map((signal) => ({
        learnerUid: signal.uid,
        displayName: signal.displayName,
        riskScore: signal.riskScore,
        readinessScore: signal.readinessScore,
        inactivityDays: signal.inactivityDays,
        engagementLabel: signal.engagementLabel,
      })),
    },
    recommendations: atRisk.map((signal) => ({
      title: `Intervene with ${signal.displayName}`,
      summary: `Risk ${signal.riskScore}. Recommend a 7-day recovery sequence focused on ${signal.lowScoreCourses[0] || "core study habits"} and onboarding completion.`,
      priority: signal.riskScore >= 70 ? "critical" : "high",
      confidenceScore: clamp(signal.riskScore / 100, 0.55, 0.94),
      organizationId: signal.organizationId,
      learnerUid: signal.uid,
      requiresApproval: true,
      actionType: "outreach_message",
      rationale: [
        `Onboarding steps completed: ${signal.onboardingSteps}`,
        `Enrollments: ${signal.enrollmentCount}, completed: ${signal.completedEnrollmentCount}`,
        `Average score: ${signal.averageScore ?? "n/a"}`,
        `Engagement: ${signal.engagementLabel} (${signal.inactivityDays} inactivity days)`,
      ],
    })),
  };
}

async function evaluateLearningCoach(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const signals = await loadLearnerSignals(scope, 8);
  const target = signals.sort((a, b) => a.readinessScore - b.readinessScore)[0] || null;

  if (!target) {
    return {
      summary: "No learner signal was available to generate a coaching plan.",
      confidenceScore: 0.4,
      outputs: {studyPlan: []},
      recommendations: [],
    };
  }

  const studyPlan = [
    "Complete one unfinished onboarding checkpoint",
    `Review weak area: ${target.lowScoreCourses[0] || "latest low-scoring course"}`,
    "Run one timed exam-prep session within 48 hours",
    "Escalate to an instructor if score trend does not improve",
  ];

  return {
    summary: `A four-step adaptive study plan was generated for ${target.displayName}.`,
    confidenceScore: 0.76,
    outputs: {
      learnerUid: target.uid,
      learner: target.displayName,
      readinessScore: target.readinessScore,
      engagementLabel: target.engagementLabel,
      studyPlan,
    },
    recommendations: [
      {
        title: `Publish adaptive study plan for ${target.displayName}`,
        summary: `Prioritize remediation around ${target.lowScoreCourses[0] || "foundational modules"} and timed practice this week.`,
        priority: target.readinessScore < 70 ? "high" : "medium",
        confidenceScore: 0.76,
        organizationId: target.organizationId,
        learnerUid: target.uid,
        requiresApproval: false,
        rationale: studyPlan,
      },
    ],
  };
}

async function evaluateExamReadiness(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const signals = await loadLearnerSignals(scope, 10);
  const flagged = signals.filter((signal) => signal.readinessScore < 78).sort((a, b) => a.readinessScore - b.readinessScore).slice(0, 5);

  return {
    summary: flagged.length
      ? `Exam readiness review completed; ${flagged.length} learners are below the recommended readiness threshold.`
      : "No learner readiness issues were detected in the current scope.",
    confidenceScore: flagged.length ? 0.79 : 0.5,
    outputs: {
      readiness: flagged.map((signal) => ({
        learnerUid: signal.uid,
        learner: signal.displayName,
        readinessScore: signal.readinessScore,
        passProbability: clamp(Math.round(signal.readinessScore * 0.9 + 8), 10, 98),
      })),
    },
    recommendations: flagged.map((signal) => ({
      title: `Raise exam readiness for ${signal.displayName}`,
      summary: `Current readiness ${signal.readinessScore}. Route the learner through a focused remediation loop before the next high-stakes assessment.`,
      priority: signal.readinessScore < 65 ? "critical" : "high",
      confidenceScore: clamp(signal.readinessScore / 100 + 0.1, 0.6, 0.93),
      organizationId: signal.organizationId,
      learnerUid: signal.uid,
      requiresApproval: false,
      rationale: [
        `Average score: ${signal.averageScore ?? "n/a"}`,
        `Weak courses: ${signal.lowScoreCourses.join(", ") || "none identified"}`,
        `Completion rate: ${Math.round(signal.completionRate * 100)}%`,
      ],
    })),
  };
}

async function evaluateInstructorAssistant(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const signals = await loadLearnerSignals(scope, 15);
  const atRisk = signals.filter((signal) => signal.riskScore >= 45).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return {
    summary: atRisk.length
      ? `Instructor briefing prepared with ${atRisk.length} prioritized learner interventions.`
      : "No learners currently exceed the instructor escalation threshold.",
    confidenceScore: atRisk.length ? 0.78 : 0.58,
    outputs: {
      dailyBriefing: atRisk.map((signal, index) => `${index + 1}. ${signal.displayName}: risk ${signal.riskScore}, readiness ${signal.readinessScore}`),
    },
    recommendations: atRisk.map((signal) => ({
      title: `Instructor follow-up for ${signal.displayName}`,
      summary: "Provide a short coaching touchpoint and confirm a concrete study commitment in the next 72 hours.",
      priority: signal.riskScore >= 70 ? "critical" : "high",
      confidenceScore: clamp(signal.riskScore / 100, 0.58, 0.94),
      organizationId: signal.organizationId,
      learnerUid: signal.uid,
      requiresApproval: true,
      actionType: "human_review",
      rationale: [
        `Risk score ${signal.riskScore}`,
        `Readiness score ${signal.readinessScore}`,
      ],
    })),
  };
}

async function evaluateContentOptimization(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const signals = await loadLearnerSignals(scope, 30);
  const byCourse = new Map<string, {attempts: number; completed: number; scores: number[]; organizations: Set<string>}>();

  for (const signal of signals) {
    for (const courseId of signal.lowScoreCourses) {
      const existing = byCourse.get(courseId) || {attempts: 0, completed: 0, scores: [], organizations: new Set<string>()};
      existing.attempts += 1;
      existing.completed += signal.completedEnrollmentCount > 0 ? 1 : 0;
      if (signal.averageScore !== null) {
        existing.scores.push(signal.averageScore);
      }
      if (signal.organizationId) {
        existing.organizations.add(signal.organizationId);
      }
      byCourse.set(courseId, existing);
    }
  }

  const weakCourses = [...byCourse.entries()]
    .map(([courseId, stats]) => ({
      courseId,
      avgScore: average(stats.scores) ?? 0,
      completionRate: stats.attempts ? stats.completed / stats.attempts : 0,
      attempts: stats.attempts,
      organizations: [...stats.organizations],
    }))
    .filter((item) => item.attempts >= 2 && (item.avgScore < 72 || item.completionRate < 0.45))
    .sort((a, b) => (a.avgScore + a.completionRate * 100) - (b.avgScore + b.completionRate * 100))
    .slice(0, 5);

  return {
    summary: weakCourses.length
      ? `${weakCourses.length} courses need redesign attention based on completion and score signals.`
      : "No content risk cluster crossed the redesign threshold in the sampled enrollment set.",
    confidenceScore: weakCourses.length ? 0.72 : 0.5,
    outputs: {weakCourses},
    recommendations: weakCourses.map((course) => ({
      title: `Redesign course ${course.courseId}`,
      summary: `Completion rate ${(course.completionRate * 100).toFixed(0)}% and average score ${course.avgScore}. Audit lesson sequencing, assessment clarity and remediation coverage.`,
      priority: course.avgScore < 65 ? "critical" : "high",
      confidenceScore: 0.72,
      organizationId: course.organizations[0] || scope.organizationId || null,
      requiresApproval: true,
      actionType: "content_change",
      rationale: [
        `Attempts sampled: ${course.attempts}`,
        `Completion rate: ${(course.completionRate * 100).toFixed(0)}%`,
      ],
    })),
  };
}

async function evaluateSalesEnrollment(): Promise<AgentEvaluationResult> {
  const leadsSnap = await ensureAdminApp().collection("register").limit(40).get();
  const dormantLeads = leadsSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      fullName: String(docSnap.get("fullName") || docSnap.get("email") || docSnap.id),
      email: String(docSnap.get("email") || ""),
      status: String(docSnap.get("status") || "new"),
      createdAt: timestampToDate(docSnap.get("createdAt")),
    }))
    .filter((lead) => lead.status === "new")
    .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
    .slice(0, 5);

  return {
    summary: dormantLeads.length
      ? `${dormantLeads.length} dormant registrations are candidates for recovery campaigns.`
      : "No dormant lead cluster was found in recent registration records.",
    confidenceScore: dormantLeads.length ? 0.69 : 0.46,
    outputs: {dormantLeads},
    recommendations: dormantLeads.map((lead) => ({
      title: `Recover lead ${lead.fullName}`,
      summary: `Launch a short enrollment recovery sequence for ${lead.email || lead.fullName}.`,
      priority: "medium",
      confidenceScore: 0.69,
      requiresApproval: true,
      actionType: "campaign_launch",
      rationale: [
        `Lead status: ${lead.status}`,
        `Created at: ${lead.createdAt?.toISOString() || "unknown"}`,
      ],
    })),
  };
}

async function evaluateCertification(scope: AgentRunScope): Promise<AgentEvaluationResult> {
  const db = ensureAdminApp();
  const signals = await loadLearnerSignals(scope, 20);
  const missingCertificates: Array<{uid: string; courseId: string; organizationId: string | null}> = [];

  for (const signal of signals) {
    const completedSnap = await db.collection(`users/${signal.uid}/enrollments`).where("completed", "==", true).limit(10).get();
    for (const docSnap of completedSnap.docs) {
      const courseId = String(docSnap.get("courseId") || docSnap.id);
      const certificateSnap = await db.doc(`certificates/${certificateDocId(signal.uid, courseId)}`).get();
      if (courseId && !certificateSnap.exists) {
        missingCertificates.push({uid: signal.uid, courseId, organizationId: signal.organizationId || null});
      }
    }
  }

  return {
    summary: missingCertificates.length
      ? `${missingCertificates.length} completed enrollments are ready for certificate review.`
      : "No certificate approval candidates were found in the sampled completions.",
    confidenceScore: missingCertificates.length ? 0.83 : 0.58,
    outputs: {missingCertificates},
    recommendations: missingCertificates.slice(0, 5).map((item) => ({
      title: `Review certificate issuance for ${item.uid}`,
      summary: `Completed course ${item.courseId}. Queue human approval before certificate generation.`,
      priority: "high",
      confidenceScore: 0.83,
      organizationId: item.organizationId,
      learnerUid: item.uid,
      requiresApproval: true,
      actionType: "certificate_issue",
      rationale: [
        `Course ${item.courseId} is completed`,
        "Certificate record is missing",
      ],
    })),
  };
}

async function evaluateExecutiveInsights(): Promise<AgentEvaluationResult> {
  const db = ensureAdminApp();
  const [organizationCount, learnerCountSnap, openRecommendationCountSnap, pendingApprovalCountSnap] = await Promise.all([
    countCollection("organizations"),
    db.collection(USERS_COLLECTION).where("role", "in", LEARNER_ROLES).count().get(),
    db.collection(RECOMMENDATIONS_COLLECTION).where("status", "==", "open").count().get(),
    db.collection(ACTION_QUEUE_COLLECTION).where("status", "==", "pending").count().get(),
  ]);

  const learners = Number(learnerCountSnap.data().count || 0);
  const openRecommendations = Number(openRecommendationCountSnap.data().count || 0);
  const pendingApprovals = Number(pendingApprovalCountSnap.data().count || 0);

  return {
    summary: `Portfolio snapshot: ${organizationCount} organizations, ${learners} learners, ${openRecommendations} open AI recommendations and ${pendingApprovals} pending approvals.`,
    confidenceScore: 0.88,
    outputs: {
      organizations: organizationCount,
      learners,
      openRecommendations,
      pendingApprovals,
    },
    recommendations: [
      {
        title: "Clear the AI approval queue",
        summary: `There are ${pendingApprovals} pending approval items. Reduce turnaround time to keep the digital workforce from stalling.`,
        priority: pendingApprovals >= 10 ? "critical" : "medium",
        confidenceScore: 0.88,
        requiresApproval: false,
        rationale: [
          `${pendingApprovals} approval items remain unresolved`,
          `${openRecommendations} recommendations are still open`,
        ],
      },
    ],
  };
}

async function evaluateAgent(agentId: AgentId, scope: AgentRunScope): Promise<AgentEvaluationResult> {
  switch (agentId) {
  case "student_success":
    return evaluateStudentSuccess(scope);
  case "learning_coach":
    return evaluateLearningCoach(scope);
  case "exam_readiness":
    return evaluateExamReadiness(scope);
  case "instructor_assistant":
    return evaluateInstructorAssistant(scope);
  case "content_optimization":
    return evaluateContentOptimization(scope);
  case "sales_enrollment":
    return evaluateSalesEnrollment();
  case "certification":
    return evaluateCertification(scope);
  case "executive_insights":
    return evaluateExecutiveInsights();
  default:
    throw new HttpsError("invalid-argument", `Unsupported agent ${agentId}.`);
  }
}

export async function createAgentRun(args: {agentId: AgentId; scope: AgentRunScope}): Promise<string> {
  const run: AgentRunDoc = {
    agentId: args.agentId,
    status: "queued",
    scope: args.scope,
    createdAt: nowTimestamp(),
    startedAt: null,
    completedAt: null,
    summary: "Queued for evaluation.",
    confidenceScore: 0,
    recommendationIds: [],
    actionIds: [],
    error: null,
  };

  const runRef = await ensureAdminApp().collection(RUNS_COLLECTION).add(run);
  await writeAuditLog({
    eventType: "agent_run_created",
    actorUid: args.scope.requestedBy,
    agentId: args.agentId,
    runId: runRef.id,
    organizationId: args.scope.organizationId || null,
    learnerUid: args.scope.learnerUid || null,
  });
  return runRef.id;
}

export async function processAgentRun(runId: string, actorUid: string): Promise<void> {
  const db = ensureAdminApp();
  const runRef = db.collection(RUNS_COLLECTION).doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    throw new HttpsError("not-found", "Agent run not found.");
  }

  const run = runSnap.data() as AgentRunDoc;
  await runRef.set({status: "running", startedAt: nowTimestamp()}, {merge: true});

  try {
    const evaluation = await evaluateAgent(run.agentId, run.scope);
    const batch = db.batch();
    const recommendationIds: string[] = [];
    const actionIds: string[] = [];

    for (const recommendation of evaluation.recommendations) {
      const recommendationRef = db.collection(RECOMMENDATIONS_COLLECTION).doc();
      const recommendationDoc: AgentRecommendationDoc = {
        agentId: run.agentId,
        runId,
        title: recommendation.title,
        summary: recommendation.summary,
        priority: recommendation.priority,
        confidenceScore: recommendation.confidenceScore,
        status: "open" as RecommendationStatus,
        organizationId: recommendation.organizationId || null,
        learnerUid: recommendation.learnerUid || null,
        actionType: recommendation.actionType || null,
        requiresApproval: recommendation.requiresApproval,
        rationale: recommendation.rationale,
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      };
      batch.set(recommendationRef, recommendationDoc);
      recommendationIds.push(recommendationRef.id);

      if (recommendation.requiresApproval && recommendation.actionType) {
        const actionRef = db.collection(ACTION_QUEUE_COLLECTION).doc();
        const actionDoc: AgentActionQueueDoc = {
          recommendationId: recommendationRef.id,
          runId,
          agentId: run.agentId,
          title: recommendation.title,
          approvalType: recommendation.actionType,
          status: "pending",
          organizationId: recommendation.organizationId || null,
          learnerUid: recommendation.learnerUid || null,
          confidenceScore: recommendation.confidenceScore,
          note: recommendation.summary,
          createdAt: nowTimestamp(),
          reviewedAt: null,
          reviewedBy: null,
        };
        batch.set(actionRef, actionDoc);
        actionIds.push(actionRef.id);
      }
    }

    batch.set(runRef, {
      status: "completed",
      completedAt: nowTimestamp(),
      summary: evaluation.summary,
      confidenceScore: evaluation.confidenceScore,
      outputs: evaluation.outputs,
      recommendationIds,
      actionIds,
      error: null,
    }, {merge: true});
    await batch.commit();

    await writeAuditLog({
      eventType: "agent_run_completed",
      actorUid,
      agentId: run.agentId,
      runId,
      organizationId: run.scope.organizationId || null,
      learnerUid: run.scope.learnerUid || null,
      details: {
        confidenceScore: evaluation.confidenceScore,
        recommendationCount: recommendationIds.length,
        actionCount: actionIds.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown agent error");
    await runRef.set({status: "failed", completedAt: nowTimestamp(), error: message}, {merge: true});
    await writeAuditLog({
      eventType: "agent_run_failed",
      actorUid,
      agentId: run.agentId,
      runId,
      organizationId: run.scope.organizationId || null,
      learnerUid: run.scope.learnerUid || null,
      details: {error: message},
    });
    throw error;
  }
}

export async function reviewActionQueueItem(args: {
  itemId: string;
  reviewerUid: string;
  status: "approved" | "rejected";
  note?: string | null;
}): Promise<void> {
  const db = ensureAdminApp();
  const actionRef = db.collection(ACTION_QUEUE_COLLECTION).doc(args.itemId);
  const actionSnap = await actionRef.get();
  if (!actionSnap.exists) {
    throw new HttpsError("not-found", "Approval item not found.");
  }

  const action = actionSnap.data() as AgentActionQueueDoc;
  const recommendationRef = db.collection(RECOMMENDATIONS_COLLECTION).doc(action.recommendationId);
  const batch = db.batch();
  batch.set(actionRef, {
    status: args.status,
    note: args.note || null,
    reviewedAt: nowTimestamp(),
    reviewedBy: args.reviewerUid,
  }, {merge: true});
  batch.set(recommendationRef, {
    status: args.status === "approved" ? "approved" : "dismissed",
    updatedAt: nowTimestamp(),
  }, {merge: true});
  await batch.commit();

  await writeAuditLog({
    eventType: "action_reviewed",
    actorUid: args.reviewerUid,
    agentId: action.agentId,
    runId: action.runId,
    recommendationId: action.recommendationId,
    actionQueueId: args.itemId,
    organizationId: action.organizationId || null,
    learnerUid: action.learnerUid || null,
    details: {status: args.status, note: args.note || null},
  });
}

export async function buildCommandCenterSnapshot(access: AccessContext): Promise<CommandCenterSnapshot> {
  const db = ensureAdminApp();
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const scopedOrganizationId = access.organizationId || null;
  const allowedAgentIds = new Set(access.allowedAgentIds);

  const [learnerDocs, openRecommendationsSnap, pendingApprovalsSnap, recentRunsSnap] = await Promise.all([
    queryLearnerDocs(200, scopedOrganizationId),
    (scopedOrganizationId ?
      db.collection(RECOMMENDATIONS_COLLECTION).where("organizationId", "==", scopedOrganizationId).where("status", "==", "open").orderBy("createdAt", "desc").limit(50) :
      db.collection(RECOMMENDATIONS_COLLECTION).where("status", "==", "open").orderBy("createdAt", "desc").limit(50)
    ).get(),
    (scopedOrganizationId ?
      db.collection(ACTION_QUEUE_COLLECTION).where("organizationId", "==", scopedOrganizationId).where("status", "==", "pending").orderBy("createdAt", "desc").limit(50) :
      db.collection(ACTION_QUEUE_COLLECTION).where("status", "==", "pending").orderBy("createdAt", "desc").limit(50)
    ).get(),
    (scopedOrganizationId ?
      db.collection(RUNS_COLLECTION).where("scope.organizationId", "==", scopedOrganizationId).orderBy("createdAt", "desc").limit(25) :
      db.collection(RUNS_COLLECTION).orderBy("createdAt", "desc").limit(25)
    ).get(),
  ]);

  const recentRuns = recentRunsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    agentId: docSnap.get("agentId") as AgentId,
    status: docSnap.get("status") as AgentRunDoc["status"],
    summary: String(docSnap.get("summary") || "No summary yet."),
    confidenceScore: Number(docSnap.get("confidenceScore") || 0),
    createdAt: isoOrNull(docSnap.get("createdAt")),
    completedAt: isoOrNull(docSnap.get("completedAt")),
  })).filter((run) => allowedAgentIds.has(run.agentId));

  const completedRuns7d = recentRuns.filter((run) => {
    if (run.status !== "completed" || !run.createdAt) {
      return false;
    }
    return new Date(run.createdAt).getTime() >= sevenDaysAgo;
  }).length;

  const recommendations = openRecommendationsSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      agentId: docSnap.get("agentId") as AgentId,
      title: String(docSnap.get("title") || "Recommendation"),
      summary: String(docSnap.get("summary") || ""),
      priority: docSnap.get("priority") as RecommendationPriority,
      confidenceScore: Number(docSnap.get("confidenceScore") || 0),
      organizationId: docSnap.get("organizationId") ? String(docSnap.get("organizationId")) : null,
      learnerUid: docSnap.get("learnerUid") ? String(docSnap.get("learnerUid")) : null,
      requiresApproval: docSnap.get("requiresApproval") === true,
      createdAt: isoOrNull(docSnap.get("createdAt")),
    }))
    .filter((item) => allowedAgentIds.has(item.agentId))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 12);

  const pendingApprovals = pendingApprovalsSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      agentId: docSnap.get("agentId") as AgentId,
      title: String(docSnap.get("title") || "Approval item"),
      approvalType: docSnap.get("approvalType") as ActionApprovalType,
      confidenceScore: Number(docSnap.get("confidenceScore") || 0),
      organizationId: docSnap.get("organizationId") ? String(docSnap.get("organizationId")) : null,
      learnerUid: docSnap.get("learnerUid") ? String(docSnap.get("learnerUid")) : null,
      createdAt: isoOrNull(docSnap.get("createdAt")),
    }))
    .filter((item) => allowedAgentIds.has(item.agentId))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      organizations: scopedOrganizationId ? 1 : await countCollection("organizations"),
      learners: learnerDocs.length,
      openRecommendations: recommendations.length,
      pendingApprovals: pendingApprovals.length,
      completedRuns7d,
    },
    agents: listAccessibleAgents(access),
    recentRuns,
    recommendations,
    pendingApprovals,
  };
}

export async function processQueuedRuns(limitCount: number, actorUid: string): Promise<number> {
  const queuedSnap = await ensureAdminApp().collection(RUNS_COLLECTION).where("status", "==", "queued").limit(limitCount).get();
  let processed = 0;
  for (const docSnap of queuedSnap.docs) {
    await processAgentRun(docSnap.id, actorUid);
    processed += 1;
  }
  return processed;
}

export async function createScheduledExecutiveRun(): Promise<string> {
  return createAgentRun({
    agentId: "executive_insights",
    scope: {
      source: "scheduled",
      requestedBy: "system_scheduler",
      organizationId: null,
      learnerUid: null,
      courseId: null,
      programId: null,
    },
  });
}
