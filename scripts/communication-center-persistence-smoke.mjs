import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { seedCommunicationCenterMockData } from './communication-center-mock-data.mjs';

const safety = {
  mode: 'draft_only',
  mockOnly: true,
  approvalRequired: true,
  provider: 'none',
  canAutoSend: false,
};

function buildStamp(uid) {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    createdByUid: uid,
    updatedByUid: uid,
    createdBy: uid,
    updatedBy: uid,
  };
}

async function run() {
  const rules = await fs.readFile(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: 'innovacare-communication-persistence',
    firestore: { rules },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedCommunicationCenterMockData(context.firestore());
    });

    const orgAdminDb = testEnv.authenticatedContext('orgAdminAlpha').firestore();
    const learnerDb = testEnv.authenticatedContext('learnerAlpha').firestore();
    const guestDb = testEnv.authenticatedContext('guestAlpha').firestore();

    const newsletterRef = await assertSucceeds(addDoc(collection(orgAdminDb, 'newsletters'), {
      id: 'temp-newsletter',
      orgId: 'org-alpha',
      title: 'Persistence draft newsletter',
      summary: 'Draft-only persistence validation',
      tags: ['persistence'],
      status: 'draft',
      createdByRole: 'org_admin',
      subject: 'Persistence subject',
      previewText: 'Persistence preview',
      html: '<p>Preview only</p>',
      templateId: null,
      audienceSegmentIds: ['segment-alpha'],
      mergeFields: ['firstName'],
      personalizationTokens: ['{{firstName}}'],
      scheduledAt: null,
      scheduledFor: null,
      approvedAt: null,
      approvedByUid: null,
      safety,
      ...buildStamp('orgAdminAlpha'),
    }));

    await assertSucceeds(getDocs(query(collection(orgAdminDb, 'newsletters'), where('orgId', '==', 'org-alpha'))));
    await assertFails(getDoc(doc(orgAdminDb, 'newsletters/newsletter-beta')));
    await assertFails(getDoc(doc(learnerDb, 'newsletters/newsletter-alpha')));
    await assertFails(getDoc(doc(guestDb, 'communication_audits/audit-alpha')));
    await assertFails(updateDoc(doc(orgAdminDb, 'newsletters/newsletter-alpha'), { status: 'sent' }));

    const campaignRef = await assertSucceeds(addDoc(collection(orgAdminDb, 'newsletter_campaigns'), {
      id: 'temp-campaign',
      orgId: 'org-alpha',
      title: 'Draft campaign for persistence checks',
      summary: 'Must not schedule without approval',
      tags: ['persistence'],
      status: 'draft',
      createdByRole: 'org_admin',
      newsletterId: newsletterRef.id,
      audienceSegmentIds: ['segment-alpha'],
      estimatedRecipients: 40,
      scheduledAt: null,
      scheduledFor: null,
      launchedAt: null,
      completedAt: null,
      conversionGoal: 'retention',
      safety,
      ...buildStamp('orgAdminAlpha'),
    }));

    await assertFails(updateDoc(doc(orgAdminDb, 'newsletter_campaigns', campaignRef.id), {
      status: 'scheduled',
      scheduledAt: '2026-07-01T09:00:00.000Z',
      scheduledFor: '2026-07-01T09:00:00.000Z',
    }));

    await assertFails(addDoc(collection(orgAdminDb, 'newsletters'), {
      title: 'Missing org scope',
      summary: 'Should fail',
      tags: [],
      status: 'draft',
      createdByRole: 'org_admin',
      subject: 'Missing org',
      previewText: 'Missing org',
      html: '<p>Missing org</p>',
      templateId: null,
      audienceSegmentIds: [],
      mergeFields: [],
      personalizationTokens: [],
      scheduledAt: null,
      scheduledFor: null,
      approvedAt: null,
      approvedByUid: null,
      safety,
      ...buildStamp('orgAdminAlpha'),
    }));

    const batchNewsletterRef = doc(collection(orgAdminDb, 'newsletters'));
    const batchAuditRef = doc(collection(orgAdminDb, 'communication_audits'));
    const batch = writeBatch(orgAdminDb);
    const stamp = buildStamp('orgAdminAlpha');
    batch.set(batchNewsletterRef, {
      id: batchNewsletterRef.id,
      orgId: 'org-alpha',
      title: 'Batch newsletter draft',
      summary: 'Repository-style paired write',
      tags: ['audit-pair'],
      status: 'draft',
      createdByRole: 'org_admin',
      subject: 'Batch subject',
      previewText: 'Batch preview',
      html: '<p>Batch preview</p>',
      templateId: null,
      audienceSegmentIds: ['segment-alpha'],
      mergeFields: [],
      personalizationTokens: [],
      scheduledAt: null,
      scheduledFor: null,
      approvedAt: null,
      approvedByUid: null,
      safety,
      ...stamp,
    });
    batch.set(batchAuditRef, {
      id: batchAuditRef.id,
      orgId: 'org-alpha',
      title: 'newsletter draft created',
      summary: 'Paired audit write for draft creation',
      tags: ['communication-center', 'draft-only', 'newsletter'],
      safety,
      entityType: 'newsletter',
      entityCollection: 'newsletters',
      entityId: batchNewsletterRef.id,
      actionType: 'draft_created',
      action: 'draft_created',
      actorId: 'orgAdminAlpha',
      actorUid: 'orgAdminAlpha',
      actorRole: 'org_admin',
      beforeState: null,
      afterState: { id: batchNewsletterRef.id, title: 'Batch newsletter draft' },
      promptVersion: null,
      modelVersion: null,
      rollbackReference: null,
      ...stamp,
    });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(batchAuditRef));

    console.log('communication center persistence smoke passed');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
