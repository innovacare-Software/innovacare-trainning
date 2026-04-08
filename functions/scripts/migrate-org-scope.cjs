/* eslint-disable no-console */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const APPLY = process.argv.includes('--apply');

async function upsert(ref, data) {
  if (!APPLY) {
    return;
  }
  await ref.set(data, { merge: true });
}

async function migrateOrgUsers() {
  const snap = await db.collection('users').get();
  let migrated = 0;

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const orgId = String(d.orgId || '').trim();
    if (!orgId) continue;

    const scopedRef = db.doc(`organizations/${orgId}/users/${doc.id}`);
    await upsert(scopedRef, {
      uid: doc.id,
      email: d.email || '',
      displayName: d.displayName || '',
      role: d.role === 'admin' ? 'org_admin' : d.role === 'manager' ? 'org_manager' : 'org_learner',
      active: d.active !== false,
      department: d.department || '',
      title: d.title || '',
      source: 'migration-v1',
      updatedAt: now,
      createdAt: d.createdAt || now,
    });
    migrated++;
  }

  return { migrated };
}

async function migrateCourseAssignments() {
  const snap = await db.collection('courseAssignments').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const userId = String(d.userId || '').trim();
    const courseId = String(d.courseId || '').trim();
    if (!userId || !courseId) {
      skipped++;
      continue;
    }

    let orgId = String(d.orgId || '').trim();
    if (!orgId) {
      const userSnap = await db.doc(`users/${userId}`).get();
      orgId = String(userSnap.get('orgId') || '').trim();
    }

    if (!orgId) {
      skipped++;
      continue;
    }

    const scopedRef = db.doc(`organizations/${orgId}/courseAssignments/${doc.id}`);
    await upsert(scopedRef, {
      orgId,
      userId,
      courseId,
      status: d.status || 'assigned',
      assignedBy: d.assignedBy || 'migration',
      assignedAt: d.assignedAt || now,
      dueDate: d.dueDate || null,
      source: 'migration-v1',
      updatedAt: now,
    });

    const orgCourseRef = db.doc(`organizations/${orgId}/courses/${courseId}`);
    await upsert(orgCourseRef, {
      courseId,
      title: d.courseTitle || d.title || courseId,
      active: true,
      assignedBy: d.assignedBy || 'migration',
      assignedAt: d.assignedAt || now,
      source: 'migration-v1',
      updatedAt: now,
    });

    migrated++;
  }

  return { migrated, skipped };
}

async function migrateEnrollmentsAndProgress() {
  const usersSnap = await db.collection('users').get();
  let enrollmentsMigrated = 0;
  let progressMigrated = 0;

  for (const userDoc of usersSnap.docs) {
    const orgId = String(userDoc.get('orgId') || '').trim();
    if (!orgId) continue;

    const enrSnap = await db.collection(`users/${userDoc.id}/enrollments`).get();
    for (const enrDoc of enrSnap.docs) {
      const d = enrDoc.data() || {};
      const enrollmentId = `${userDoc.id}_${enrDoc.id}`;

      await upsert(db.doc(`organizations/${orgId}/enrollments/${enrollmentId}`), {
        orgId,
        userId: userDoc.id,
        courseId: String(d.courseId || enrDoc.id),
        status: d.status || 'assigned',
        assignedBy: d.assignedBy || 'migration',
        assignedAt: d.assignedAt || now,
        startedAt: d.startedAt || null,
        completedAt: d.completedAt || null,
        dueDate: d.dueDate || null,
        source: 'migration-v1',
        updatedAt: now,
      });
      enrollmentsMigrated++;

      const progressId = `${userDoc.id}_${enrDoc.id}`;
      const pct = d.status === 'completed' ? 100 : d.status === 'started' ? 50 : 0;
      await upsert(db.doc(`organizations/${orgId}/progress/${progressId}`), {
        orgId,
        userId: userDoc.id,
        courseId: String(d.courseId || enrDoc.id),
        status: d.status === 'completed' ? 'completed' : d.status === 'started' ? 'in_progress' : 'not_started',
        progressPct: pct,
        score: typeof d.score === 'number' ? d.score : null,
        source: 'migration-v1',
        updatedAt: now,
      });
      progressMigrated++;
    }
  }

  return { enrollmentsMigrated, progressMigrated };
}

async function migratePoliciesAndWounds() {
  const usersSnap = await db.collection('users').get();
  const orgIds = new Set();
  for (const userDoc of usersSnap.docs) {
    const orgId = String(userDoc.get('orgId') || '').trim();
    if (orgId) orgIds.add(orgId);
  }

  const orgList = Array.from(orgIds);
  let policiesMigrated = 0;
  let woundsMigrated = 0;

  const policiesSnap = await db.collection('policies').get();
  for (const p of policiesSnap.docs) {
    const d = p.data() || {};
    const explicitOrgId = String(d.orgId || '').trim();
    const targets = explicitOrgId ? [explicitOrgId] : orgList;

    for (const orgId of targets) {
      await upsert(db.doc(`organizations/${orgId}/policies/${p.id}`), {
        title: d.title || '',
        content: d.content || '',
        version: String(d.version || '1.0'),
        active: d.active !== false,
        createdBy: d.createdBy || 'migration',
        source: 'migration-v1',
        createdAt: d.createdAt || now,
        updatedAt: now,
      });
      policiesMigrated++;
    }
  }

  const woundSnap = await db.collection('woundLibrary').get();
  for (const w of woundSnap.docs) {
    const d = w.data() || {};
    const explicitOrgId = String(d.orgId || '').trim();
    const targets = explicitOrgId ? [explicitOrgId] : orgList;

    for (const orgId of targets) {
      await upsert(db.doc(`organizations/${orgId}/woundLibrary/${w.id}`), {
        name: d.name || d.title || '',
        category: d.category || '',
        stage: d.stage || '',
        definition: d.definition || d.description || '',
        active: d.active !== false,
        createdBy: d.createdBy || 'migration',
        source: 'migration-v1',
        createdAt: d.createdAt || now,
        updatedAt: now,
      });
      woundsMigrated++;
    }
  }

  return { policiesMigrated, woundsMigrated, orgCount: orgList.length };
}

(async () => {
  console.log(`\n[org-migration] mode=${APPLY ? 'APPLY' : 'DRY_RUN'}\n`);

  const users = await migrateOrgUsers();
  const assignments = await migrateCourseAssignments();
  const progress = await migrateEnrollmentsAndProgress();
  const shared = await migratePoliciesAndWounds();

  console.log('[org-migration] summary', {
    users,
    assignments,
    progress,
    shared,
  });

  if (!APPLY) {
    console.log('\n[org-migration] DRY_RUN complete. Re-run with --apply to write data.');
  } else {
    console.log('\n[org-migration] APPLY complete.');
  }
})().catch((err) => {
  console.error('[org-migration] failed', err);
  process.exit(1);
});
