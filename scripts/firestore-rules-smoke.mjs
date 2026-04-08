import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

async function run() {
  const cwd = process.cwd();
  const rulesPath = path.join(cwd, 'firestore.rules');
  const rules = await fs.readFile(rulesPath, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: 'innovacare-rules-smoke',
    firestore: { rules },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'users/mgrA'), {
        role: 'manager',
        orgId: 'orgA',
        active: true,
      });
      await setDoc(doc(db, 'users/learnerA'), {
        role: 'learner',
        orgId: 'orgA',
        active: true,
      });
      await setDoc(doc(db, 'users/learnerB'), {
        role: 'learner',
        orgId: 'orgB',
        active: true,
      });
      await setDoc(doc(db, 'users/superA'), {
        role: 'super_admin',
        orgId: 'orgZ',
        active: true,
      });
      await setDoc(doc(db, 'notifications/n1'), {
        title: 'hello',
        body: 'world',
        audience: { type: 'all' },
        createdAt: new Date(),
      });
    });

    const learnerCtx = testEnv.authenticatedContext('learnerA');
    const managerCtx = testEnv.authenticatedContext('mgrA');
    const superCtx = testEnv.authenticatedContext('superA');
    const anonCtx = testEnv.unauthenticatedContext();

    const learnerDb = learnerCtx.firestore();
    const managerDb = managerCtx.firestore();
    const superDb = superCtx.firestore();
    const anonDb = anonCtx.firestore();

    // 1) Learner can read notifications and mark one as read for self.
    await assertSucceeds(getDoc(doc(learnerDb, 'notifications/n1')));
    await assertSucceeds(
      setDoc(doc(learnerDb, 'users/learnerA/notificationReads/n1'), {
        readAt: serverTimestamp(),
      })
    );

    // 2) Learner cannot write read-state for another user.
    await assertFails(
      setDoc(doc(learnerDb, 'users/learnerB/notificationReads/n1'), {
        readAt: serverTimestamp(),
      })
    );

    // 3) Manager can manage enrollments for same-org user.
    await assertSucceeds(
      setDoc(doc(managerDb, 'users/learnerA/enrollments/course1'), {
        uid: 'learnerA',
        courseId: 'course1',
        status: 'assigned',
        assignedBy: 'mgrA',
      })
    );

    // 4) Manager cannot manage enrollments for different-org user.
    await assertFails(
      setDoc(doc(managerDb, 'users/learnerB/enrollments/course1'), {
        uid: 'learnerB',
        courseId: 'course1',
        status: 'assigned',
        assignedBy: 'mgrA',
      })
    );

    // 5) Public demo request create allowed.
    await assertSucceeds(
      setDoc(doc(anonDb, 'demoRequests/r1'), {
        fullName: 'Visitor Name',
        workEmail: 'visitor@example.com',
        phone: '555-0100',
        organizationName: 'Org',
        organizationType: 'Clinic',
        selectedPlan: 'starter',
        message: 'Need a demo',
        source: 'landing-page',
        status: 'new',
      })
    );

    // 6) billingRecords locked to super_admin.
    await assertFails(
      setDoc(doc(managerDb, 'billingRecords/b1'), {
        orgId: 'orgA',
        plan: 'pro',
      })
    );
    await assertSucceeds(
      setDoc(doc(superDb, 'billingRecords/b2'), {
        orgId: 'orgA',
        plan: 'enterprise',
      })
    );
    await assertSucceeds(
      updateDoc(doc(superDb, 'billingRecords/b2'), {
        updatedAt: serverTimestamp(),
      })
    );

    console.log('Firestore rules smoke test: PASS');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((err) => {
  console.error('Firestore rules smoke test: FAIL');
  console.error(err);
  process.exitCode = 1;
});
