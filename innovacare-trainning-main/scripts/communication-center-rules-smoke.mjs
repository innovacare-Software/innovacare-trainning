import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { seedCommunicationCenterMockData } from './communication-center-mock-data.mjs';

async function run() {
  const rules = await fs.readFile(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: 'innovacare-communication-rules',
    firestore: { rules },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedCommunicationCenterMockData(context.firestore());
    });

    const orgAdminDb = testEnv.authenticatedContext('orgAdminAlpha').firestore();
    const learnerDb = testEnv.authenticatedContext('learnerAlpha').firestore();
    const guestDb = testEnv.authenticatedContext('guestAlpha').firestore();
    const superDb = testEnv.authenticatedContext('superAdminGlobal').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(orgAdminDb, 'newsletters/newsletter-alpha')));
    await assertSucceeds(getDoc(doc(orgAdminDb, 'newsletter_campaigns/campaign-alpha')));
    await assertSucceeds(
      setDoc(doc(orgAdminDb, 'communication_segments/segment-alpha-new'), {
        id: 'segment-alpha-new',
        orgId: 'org-alpha',
        title: 'New learner cohort',
        summary: 'Mock segment',
        status: 'draft',
        description: 'New learners in first 7 days',
        tags: ['new'],
        family: 'learners',
        estimatedAudienceSize: 12,
        filterMode: 'dynamic_mock',
        filters: [{ field: 'daysSinceRegistration', operator: '<=', value: 7 }],
        sourceCollections: ['users'],
        safety: { mode: 'draft_only', mockOnly: true, approvalRequired: true, provider: 'none', canAutoSend: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUid: 'orgAdminAlpha',
        updatedByUid: 'orgAdminAlpha',
      })
    );

    await assertFails(getDoc(doc(orgAdminDb, 'newsletters/newsletter-beta')));
    await assertFails(getDoc(doc(learnerDb, 'newsletters/newsletter-alpha')));
    await assertFails(getDoc(doc(guestDb, 'newsletters/newsletter-alpha')));
    await assertFails(getDoc(doc(anonDb, 'newsletters/newsletter-alpha')));
    await assertSucceeds(getDoc(doc(superDb, 'newsletters/newsletter-beta')));
    await assertSucceeds(
      addDoc(collection(superDb, 'communication_audits'), {
        id: 'audit-global-preview',
        orgId: 'org-alpha',
        title: 'Super admin preview audit',
        summary: 'Mock-only audit insert',
        tags: ['audit'],
        entityCollection: 'newsletters',
        entityId: 'newsletter-alpha',
        actionType: 'preview_generated',
        action: 'preview_generated',
        actorId: 'superAdminGlobal',
        actorRole: 'super_admin',
        actorUid: 'superAdminGlobal',
        beforeState: null,
        afterState: { entityId: 'newsletter-alpha', preview: true },
        promptVersion: 'v1',
        modelVersion: 'mock-model',
        rollbackReference: null,
        safety: { mode: 'draft_only', mockOnly: true, approvalRequired: true, provider: 'none', canAutoSend: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUid: 'superAdminGlobal',
        updatedByUid: 'superAdminGlobal',
      })
    );

    console.log('communication center org-admin smoke passed');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});