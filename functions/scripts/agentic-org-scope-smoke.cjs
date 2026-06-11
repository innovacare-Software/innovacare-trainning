const assert = require('node:assert/strict');
const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || 'innovacare-agentic-smoke';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required for the agentic org scope smoke test.');
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const now = admin.firestore.Timestamp.now();

const {
  listAiAgents,
  getAiCommandCenterSnapshot,
  queueAiAgentRun,
} = require('../lib/agentic/functions.js');

async function seed() {
  const orgId = 'org-alpha';
  const otherOrgId = 'org-beta';
  const orgAdminUid = 'org-admin-alpha';
  const superAdminUid = 'super-admin-global';
  const learnerUid = 'learner-alpha-1';

  const batch = db.batch();

  batch.set(db.doc(`users/${orgAdminUid}`), {
    uid: orgAdminUid,
    email: 'org-admin-alpha@example.com',
    role: 'staff',
    orgId,
    updatedAt: now,
  });

  batch.set(db.doc(`userOrgMemberships/${orgAdminUid}__${orgId}`), {
    userId: orgAdminUid,
    orgId,
    role: 'org_admin',
    status: 'active',
    assignedBy: 'seed',
    updatedAt: now,
  });

  batch.set(db.doc(`users/${superAdminUid}`), {
    uid: superAdminUid,
    email: 'super-admin@example.com',
    role: 'super_admin',
    updatedAt: now,
  });

  batch.set(db.doc(`users/${learnerUid}`), {
    uid: learnerUid,
    email: 'learner-alpha@example.com',
    role: 'learner',
    orgId,
    displayName: 'Learner Alpha',
    onboarding: {
      completedStepIds: ['welcome'],
      completedAt: null,
    },
    updatedAt: now,
  });

  batch.set(db.doc(`users/${learnerUid}/enrollments/course-risk`), {
    courseId: 'course-risk',
    score: 62,
    completed: false,
    updatedAt: now,
  });

  batch.set(db.doc('organizations/org-alpha'), { name: 'Org Alpha', updatedAt: now });
  batch.set(db.doc('organizations/org-beta'), { name: 'Org Beta', updatedAt: now });

  batch.set(db.doc('aiRecommendations/rec-org-alpha-student'), {
    agentId: 'student_success',
    runId: 'seed-run-1',
    title: 'Support Learner Alpha',
    summary: 'Needs intervention',
    priority: 'high',
    confidenceScore: 0.82,
    status: 'open',
    organizationId: orgId,
    learnerUid,
    requiresApproval: true,
    actionType: 'outreach_message',
    rationale: ['seed'],
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.doc('aiRecommendations/rec-org-alpha-exec'), {
    agentId: 'executive_insights',
    runId: 'seed-run-2',
    title: 'Executive only signal',
    summary: 'Should be hidden from org admins',
    priority: 'medium',
    confidenceScore: 0.64,
    status: 'open',
    organizationId: orgId,
    requiresApproval: false,
    rationale: ['seed'],
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.doc('aiRecommendations/rec-org-beta-student'), {
    agentId: 'student_success',
    runId: 'seed-run-3',
    title: 'Other org signal',
    summary: 'Should be filtered by org',
    priority: 'high',
    confidenceScore: 0.75,
    status: 'open',
    organizationId: otherOrgId,
    requiresApproval: false,
    rationale: ['seed'],
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.doc('aiActionQueue/action-org-alpha'), {
    recommendationId: 'rec-org-alpha-student',
    runId: 'seed-run-1',
    agentId: 'student_success',
    title: 'Approve outreach for Learner Alpha',
    approvalType: 'outreach_message',
    status: 'pending',
    organizationId: orgId,
    learnerUid,
    confidenceScore: 0.82,
    note: 'seed',
    createdAt: now,
    reviewedAt: null,
    reviewedBy: null,
  });

  batch.set(db.doc('aiAgentRuns/run-org-alpha-student'), {
    agentId: 'student_success',
    status: 'completed',
    scope: {
      organizationId: orgId,
      learnerUid,
      courseId: null,
      programId: null,
      source: 'manual',
      requestedBy: orgAdminUid,
    },
    summary: 'Scoped student success run',
    confidenceScore: 0.83,
    createdAt: now,
    completedAt: now,
  });

  batch.set(db.doc('aiAgentRuns/run-org-alpha-exec'), {
    agentId: 'executive_insights',
    status: 'completed',
    scope: {
      organizationId: orgId,
      learnerUid: null,
      courseId: null,
      programId: null,
      source: 'manual',
      requestedBy: superAdminUid,
    },
    summary: 'Executive run hidden from org admin',
    confidenceScore: 0.7,
    createdAt: now,
    completedAt: now,
  });

  await batch.commit();

  return { orgId, orgAdminUid, superAdminUid };
}

async function main() {
  const { orgId, orgAdminUid, superAdminUid } = await seed();

  const agents = await listAiAgents.run({
    auth: { uid: orgAdminUid },
    data: { organizationId: orgId },
  });

  assert(agents.agents.some((agent) => agent.id === 'student_success'));
  assert(!agents.agents.some((agent) => agent.id === 'executive_insights'));
  assert(!agents.agents.some((agent) => agent.id === 'sales_enrollment'));

  const snapshot = await getAiCommandCenterSnapshot.run({
    auth: { uid: orgAdminUid },
    data: { organizationId: orgId },
  });

  assert.equal(snapshot.metrics.organizations, 1);
  assert.equal(snapshot.metrics.learners, 1);
  assert(snapshot.agents.every((agent) => agent.id !== 'executive_insights'));
  assert(snapshot.recommendations.some((rec) => rec.id === 'rec-org-alpha-student'));
  assert(!snapshot.recommendations.some((rec) => rec.id === 'rec-org-alpha-exec'));
  assert(!snapshot.recommendations.some((rec) => rec.id === 'rec-org-beta-student'));
  assert(snapshot.pendingApprovals.some((item) => item.id === 'action-org-alpha'));
  assert(!snapshot.recentRuns.some((run) => run.agentId === 'executive_insights'));

  const queued = await queueAiAgentRun.run({
    auth: { uid: orgAdminUid },
    data: { agentId: 'student_success', organizationId: orgId, executeNow: false },
  });

  assert.equal(queued.ok, true);
  const queuedRun = await db.doc(`aiAgentRuns/${queued.runId}`).get();
  assert.equal(queuedRun.get('scope.organizationId'), orgId);
  assert.equal(queuedRun.get('scope.requestedBy'), orgAdminUid);

  let denied = false;
  try {
    await queueAiAgentRun.run({
      auth: { uid: orgAdminUid },
      data: { agentId: 'executive_insights', organizationId: orgId, executeNow: false },
    });
  } catch (error) {
    denied = true;
    const errorText = [error?.code, error?.message, error?.details]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    assert(
      errorText.includes('permission') ||
      errorText.includes('denied') ||
      errorText.includes('not available in the current scope')
    );
  }
  assert.equal(denied, true);

  const superSnapshot = await getAiCommandCenterSnapshot.run({
    auth: { uid: superAdminUid },
    data: {},
  });
  assert(superSnapshot.agents.some((agent) => agent.id === 'executive_insights'));

  console.log('agentic org scope smoke passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});