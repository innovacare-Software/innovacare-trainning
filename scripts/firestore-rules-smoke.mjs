import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
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
      await setDoc(doc(db, 'users/mgrB'), {
        role: 'manager',
        orgId: 'orgB',
        active: true,
      });
      await setDoc(doc(db, 'notifications/n1'), {
        title: 'hello',
        body: 'world',
        audience: { type: 'all' },
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'programs/programA'), {
        title: 'Program A',
        slug: 'program-a',
        description: 'A',
        subtitle: 'A',
        category: 'nclex_prep',
        tags: [],
        imageUrl: '',
        durationText: '4 weeks',
        scheduleText: 'Flexible',
        price: 100,
        currency: 'USD',
        level: 'beginner',
        deliveryMode: 'online',
        isFeatured: false,
        active: true,
        status: 'PUBLISHED',
        requirements: [],
        outcomes: [],
        ownerId: 'mgrA',
        orgId: 'orgA',
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'programs/programB'), {
        title: 'Program B',
        slug: 'program-b',
        description: 'B',
        subtitle: 'B',
        category: 'nclex_prep',
        tags: [],
        imageUrl: '',
        durationText: '4 weeks',
        scheduleText: 'Flexible',
        price: 100,
        currency: 'USD',
        level: 'beginner',
        deliveryMode: 'online',
        isFeatured: false,
        active: false,
        status: 'DRAFT',
        ownerId: 'mgrB',
        requirements: [],
        outcomes: [],
        orgId: 'orgB',
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'programEnrollments/enrollA'), {
        programId: 'programA',
        userId: 'learnerA',
        programTitle: 'Program A',
        category: 'nclex_prep',
        learnerName: 'Learner A',
        learnerEmail: 'a@example.com',
        learnerPhone: '111',
        status: 'active',
        amount: 100,
        currency: 'USD',
        paymentStatus: 'paid',
        reviewStatus: 'approved',
        orgId: 'orgA',
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'programEnrollments/enrollB'), {
        programId: 'programB',
        userId: 'learnerB',
        programTitle: 'Program B',
        category: 'nclex_prep',
        learnerName: 'Learner B',
        learnerEmail: 'b@example.com',
        learnerPhone: '222',
        status: 'active',
        amount: 100,
        currency: 'USD',
        paymentStatus: 'paid',
        reviewStatus: 'approved',
        orgId: 'orgB',
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'users/learnerA/programProgress/programA'), {
        userId: 'learnerA',
        programId: 'programA',
        progressPct: 55,
        averageScore: 77,
        status: 'in_progress',
      });
      await setDoc(doc(db, 'users/learnerB/programProgress/programB'), {
        userId: 'learnerB',
        programId: 'programB',
        progressPct: 80,
        averageScore: 88,
        status: 'in_progress',
      });
      await setDoc(doc(db, 'users/learnerA/orders/orderA'), {
        orgId: 'orgA',
        total: 100,
      });
      await setDoc(doc(db, 'users/learnerB/orders/orderB'), {
        orgId: 'orgB',
        total: 100,
      });
      await setDoc(doc(db, 'policy_acknowledgements/p1_learnerA'), {
        policyId: 'p1',
        policyVersion: 'v1',
        userId: 'learnerA',
        acknowledgedAt: new Date(),
      });
      await setDoc(doc(db, 'policy_acknowledgements/p1_learnerB'), {
        policyId: 'p1',
        policyVersion: 'v1',
        userId: 'learnerB',
        acknowledgedAt: new Date(),
      });
      await setDoc(doc(db, 'adminNotifications/an-orgA'), {
        title: 'Org A notice',
        body: 'Scoped',
        audience: { type: 'all' },
        organizationId: 'orgA',
        recipientsCount: 1,
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'adminNotifications/an-orgB'), {
        title: 'Org B notice',
        body: 'Scoped',
        audience: { type: 'all' },
        organizationId: 'orgB',
        recipientsCount: 1,
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

    // 1) Learner cannot read consolidated admin notifications, but can mark read-state for self.
    await assertFails(getDoc(doc(learnerDb, 'notifications/n1')));
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
        createdAt: serverTimestamp(),
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

    // 7) Manager can access only same-org program admin surfaces.
    await assertSucceeds(getDoc(doc(managerDb, 'programs/programA')));
    await assertFails(getDoc(doc(managerDb, 'programs/programB')));
    await assertSucceeds(getDoc(doc(managerDb, 'programEnrollments/enrollA')));
    await assertFails(getDoc(doc(managerDb, 'programEnrollments/enrollB')));
    await assertSucceeds(getDoc(doc(managerDb, 'users/learnerA/programProgress/programA')));
    await assertFails(getDoc(doc(managerDb, 'users/learnerB/programProgress/programB')));

    // 8) Manager cannot read private user commerce data outside own org.
    await assertSucceeds(getDoc(doc(managerDb, 'users/learnerA/orders/orderA')));
    await assertFails(getDoc(doc(managerDb, 'users/learnerB/orders/orderB')));

    // 9) Policy acknowledgements are limited to manageable users.
    await assertSucceeds(getDoc(doc(managerDb, 'policy_acknowledgements/p1_learnerA')));
    await assertFails(getDoc(doc(managerDb, 'policy_acknowledgements/p1_learnerB')));

    // 10) Admin notifications are tenant-scoped for non-super-admin users.
    await assertSucceeds(
      getDocs(query(collection(managerDb, 'adminNotifications'), where('organizationId', '==', 'orgA')))
    );
    await assertFails(getDoc(doc(managerDb, 'adminNotifications/an-orgB')));
    await assertSucceeds(getDoc(doc(superDb, 'adminNotifications/an-orgB')));

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
