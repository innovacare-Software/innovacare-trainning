/**
 * Innovacare Lab Engine — Emulator-Based Rules Tests v3
 * ======================================================
 * Key fixes from v2:
 *
 * 1. FIRESTORE CROSS-READS IN STORAGE RULES:
 *    The Storage emulator supports firestore.get() cross-reads, BUT only when
 *    both emulators run in the same Firebase project context. We use
 *    withSecurityRulesDisabled to seed Firestore, and the Storage rules engine
 *    will read from the SAME Firestore emulator at FIRESTORE_EMULATOR_HOST.
 *
 * 2. OBJECT-NOT-FOUND VS PERMISSION-DENIED:
 *    For READ tests, we first WRITE the file (bypassing rules using admin),
 *    then run the read test. This ensures read failures are truly permission
 *    denials, not missing-object errors.
 *
 * 3. AUTHENTICATION TOKEN:
 *    @firebase/rules-unit-testing v4 uses 'sub' (not 'uid') for the user ID.
 *    We pass { sub: uid } in authenticatedContext.
 *
 * Run:
 *   $env:FIRESTORE_EMULATOR_HOST='localhost:8080'
 *   $env:FIREBASE_STORAGE_EMULATOR_HOST='localhost:9199'
 *   node scripts/test-lab-rules.mjs
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setLogLevel } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

setLogLevel('error');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Identifiers ───────────────────────────────────────────────────────────────
const PROJECT_ID     = 'innovacare-stripe';
const LEARNER_UID    = 'uid-learner-001';
const LEARNER2_UID   = 'uid-learner-002';
const INSTRUCTOR_UID = 'uid-instructor-001';
const TUTOR_UID      = 'uid-tutor-001';
const STAFF_UID      = 'uid-staff-001';
const ADMIN_UID      = 'uid-admin-001';
const SUPER_UID      = 'uid-super-001';

const LAB_ID         = 'lab-git-101';
const SESSION_ID     = 'session-abc-123';
const SESSION2_ID    = 'session-xyz-456';
const SUBMISSION_ID  = 'sub-001';

const SMALL_FILE = new TextEncoder().encode('// test file\n');

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0; let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log('  ✅  ' + name);
    passed++;
  } catch(e) {
    const msg = e.message ?? String(e);
    console.error('  ❌  ' + name);
    console.error('       ' + msg.split('\n')[0]);
    failures.push({ name, error: msg });
    failed++;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────
const tryRead  = (storage, path) => getBytes(ref(storage, path));
const tryWrite = (storage, path, bytes = SMALL_FILE) => uploadBytes(ref(storage, path), bytes);

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Innovacare Lab Engine — Emulator Rules Tests         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const firestoreRules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');
  const storageRules   = readFileSync(resolve(ROOT, 'storage.rules'), 'utf8');

  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      // Hub wires Storage→Firestore cross-read so firestore.get() in storage.rules works
      hub: { host: 'localhost', port: 4400 },
      storage: {
        rules: storageRules,
        host: 'localhost',
        port: 9199,
      },
      firestore: {
        rules: firestoreRules,
        host: 'localhost',
        port: 8080,
      },
    });
  } catch (err) {
    console.error('\n⚠️  Emulator connection failed: ' + err.message);
    process.exit(2);
  }

  // ── Seed Firestore + Storage (bypass rules) ──────────────────────────────
  console.log('Seeding test data...\n');
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const st = ctx.storage();

    // User role documents (storage rules will firestore.get these)
    await db.doc(`users/${LEARNER_UID}`   ).set({ role: 'learner',     active: true });
    await db.doc(`users/${LEARNER2_UID}`  ).set({ role: 'learner',     active: true });
    await db.doc(`users/${INSTRUCTOR_UID}`).set({ role: 'instructor',  active: true });
    await db.doc(`users/${TUTOR_UID}`     ).set({ role: 'tutor',       active: true });
    await db.doc(`users/${STAFF_UID}`     ).set({ role: 'staff',       active: true });
    await db.doc(`users/${ADMIN_UID}`     ).set({ role: 'admin',       active: true });
    await db.doc(`users/${SUPER_UID}`     ).set({ role: 'super_admin', active: true });

    // Lab sessions
    await db.doc(`labSessions/${SESSION_ID}` ).set({ userId: LEARNER_UID,  labId: LAB_ID, status: 'IN_PROGRESS' });
    await db.doc(`labSessions/${SESSION2_ID}`).set({ userId: LEARNER2_UID, labId: LAB_ID, status: 'IN_PROGRESS' });
    await db.doc(`labDefinitions/${LAB_ID}`  ).set({ status: 'PUBLISHED', title: 'Git 101' });
    await db.doc(`labSubmissions/${SUBMISSION_ID}`).set({
      userId: LEARNER_UID, labId: LAB_ID, sessionId: SESSION_ID,
      instructorReviewStatus: 'PENDING',
    });
    // Workspace file metadata
    await db.doc(`labSessions/${SESSION_ID}/workspaceFiles/index_html`).set({
      filename: 'index.html', contentPreview: 'hello', userId: LEARNER_UID,
    });

    // Pre-seed Storage files so READ tests don't get object-not-found
    await uploadBytes(ref(st, `labs/definitions/${LAB_ID}/starter/index.html`), SMALL_FILE);
    await uploadBytes(ref(st, `labs/definitions/${LAB_ID}/solution/solution.md`), SMALL_FILE);
    await uploadBytes(ref(st, `labs/sessions/${SESSION_ID}/workspace/index.html`), SMALL_FILE);
    await uploadBytes(ref(st, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`), SMALL_FILE);
    await uploadBytes(ref(st, `labs/exports/${SESSION_ID}/export.zip`), SMALL_FILE);
  });

  // ── Storage contexts ─────────────────────────────────────────────────────
  const mkS = (uid) => testEnv.authenticatedContext(uid, { sub: uid }).storage();
  const learnerStorage    = mkS(LEARNER_UID);
  const learner2Storage   = mkS(LEARNER2_UID);
  const instructorStorage = mkS(INSTRUCTOR_UID);
  const tutorStorage      = mkS(TUTOR_UID);
  const staffStorage      = mkS(STAFF_UID);
  const adminStorage      = mkS(ADMIN_UID);
  const superStorage      = mkS(SUPER_UID);
  const anonStorage       = testEnv.unauthenticatedContext().storage();

  // ════════════════════════════════════════════════════════════════════════════
  // 1. STARTER FILES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('── 1. Starter files (read=signedIn, write=admin only) ───\n');

  await test('[E-01] Learner     → READ  starter: ALLOW', () =>
    assertSucceeds(tryRead(learnerStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-02] Instructor  → READ  starter: ALLOW', () =>
    assertSucceeds(tryRead(instructorStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-03] Anon        → READ  starter: DENY', () =>
    assertFails(tryRead(anonStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-04] Admin       → WRITE starter: ALLOW', () =>
    assertSucceeds(tryWrite(adminStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-05] Super admin → WRITE starter: ALLOW', () =>
    assertSucceeds(tryWrite(superStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-06] Learner     → WRITE starter: DENY', () =>
    assertFails(tryWrite(learnerStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));
  await test('[E-07] Instructor  → WRITE starter: DENY', () =>
    assertFails(tryWrite(instructorStorage, `labs/definitions/${LAB_ID}/starter/index.html`)));

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SOLUTION FILES  — CRITICAL ISOLATION
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 2. Solution files (read=instructor+admin, write=admin) ─\n');

  await test('[E-08] Instructor  → READ  solution: ALLOW', () =>
    assertSucceeds(tryRead(instructorStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-09] Tutor       → READ  solution: ALLOW', () =>
    assertSucceeds(tryRead(tutorStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-10] Staff       → READ  solution: ALLOW', () =>
    assertSucceeds(tryRead(staffStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-11] Admin       → READ  solution: ALLOW', () =>
    assertSucceeds(tryRead(adminStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-12] Super admin → READ  solution: ALLOW', () =>
    assertSucceeds(tryRead(superStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));

  await test('[E-13] *** LEARNER → READ  solution: DENY  ← CRITICAL ***', () =>
    assertFails(tryRead(learnerStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-14] Anon        → READ  solution: DENY', () =>
    assertFails(tryRead(anonStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));

  await test('[E-15] Admin       → WRITE solution: ALLOW', () =>
    assertSucceeds(tryWrite(adminStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-16] Instructor  → WRITE solution: DENY', () =>
    assertFails(tryWrite(instructorStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));
  await test('[E-17] Learner     → WRITE solution: DENY', () =>
    assertFails(tryWrite(learnerStorage, `labs/definitions/${LAB_ID}/solution/solution.md`)));

  // ════════════════════════════════════════════════════════════════════════════
  // 3. WORKSPACE FILES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3. Workspace files (read=signedIn, write=signedIn+5MB) ─\n');

  await test('[E-18] Learner     → READ  own workspace: ALLOW', () =>
    assertSucceeds(tryRead(learnerStorage, `labs/sessions/${SESSION_ID}/workspace/index.html`)));
  await test('[E-19] Learner     → WRITE workspace (small): ALLOW', () =>
    assertSucceeds(tryWrite(learnerStorage, `labs/sessions/${SESSION_ID}/workspace/newfile.html`)));
  await test('[E-20] Instructor  → READ  workspace: ALLOW', () =>
    assertSucceeds(tryRead(instructorStorage, `labs/sessions/${SESSION_ID}/workspace/index.html`)));
  await test('[E-21] Admin       → READ  workspace: ALLOW', () =>
    assertSucceeds(tryRead(adminStorage, `labs/sessions/${SESSION_ID}/workspace/index.html`)));
  await test('[E-22] Learner2    → READ  Learner1 workspace: ALLOW (UUID barrier)', () =>
    assertSucceeds(tryRead(learner2Storage, `labs/sessions/${SESSION_ID}/workspace/index.html`)));
  await test('[E-23] Anon        → READ  workspace: DENY', () =>
    assertFails(tryRead(anonStorage, `labs/sessions/${SESSION_ID}/workspace/index.html`)));
  await test('[E-24] Learner     → WRITE workspace >5MB: DENY', () =>
    assertFails(uploadBytes(
      ref(learnerStorage, `labs/sessions/${SESSION_ID}/workspace/bigfile.bin`),
      new Uint8Array(5 * 1024 * 1024 + 1)
    )));

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SUBMISSION ARTIFACTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Submission artifacts (read=signedIn, write=admin) ────\n');

  await test('[E-25] Learner     → READ  artifact: ALLOW', () =>
    assertSucceeds(tryRead(learnerStorage, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`)));
  await test('[E-26] Instructor  → READ  artifact: ALLOW', () =>
    assertSucceeds(tryRead(instructorStorage, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`)));
  await test('[E-27] Admin       → WRITE artifact: ALLOW', () =>
    assertSucceeds(tryWrite(adminStorage, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`)));
  await test('[E-28] Learner     → WRITE artifact: DENY', () =>
    assertFails(tryWrite(learnerStorage, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`)));
  await test('[E-29] Instructor  → WRITE artifact: DENY', () =>
    assertFails(tryWrite(instructorStorage, `labs/submissions/${SUBMISSION_ID}/artifact/bundle.zip`)));

  // ════════════════════════════════════════════════════════════════════════════
  // 5. EXPORT BUNDLES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 5. Export bundles ────────────────────────────────────────\n');

  await test('[E-30] Learner     → WRITE export (small): ALLOW', () =>
    assertSucceeds(tryWrite(learnerStorage, `labs/exports/${SESSION_ID}/export2.zip`)));
  await test('[E-31] Learner     → READ  export: ALLOW', () =>
    assertSucceeds(tryRead(learnerStorage, `labs/exports/${SESSION_ID}/export.zip`)));
  await test('[E-32] Instructor  → READ  export: ALLOW', () =>
    assertSucceeds(tryRead(instructorStorage, `labs/exports/${SESSION_ID}/export.zip`)));
  await test('[E-33] Anon        → READ  export: DENY', () =>
    assertFails(tryRead(anonStorage, `labs/exports/${SESSION_ID}/export.zip`)));

  // ════════════════════════════════════════════════════════════════════════════
  // 6. DEFAULT DENY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 6. Default deny ──────────────────────────────────────────\n');

  await test('[E-34] Admin   → READ unknown path: DENY', () =>
    assertFails(tryRead(adminStorage, 'unknown-collection/some-file.txt')));
  await test('[E-35] Learner → READ unknown path: DENY', () =>
    assertFails(tryRead(learnerStorage, 'unknown-collection/some-file.txt')));

  // ════════════════════════════════════════════════════════════════════════════
  // 7. FIRESTORE workspaceFiles isolation
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 7. Firestore workspaceFiles isolation ────────────────────\n');

  const mkF = (uid) => testEnv.authenticatedContext(uid, { sub: uid }).firestore();
  const learnerDb    = mkF(LEARNER_UID);
  const learner2Db   = mkF(LEARNER2_UID);
  const instructorDb = mkF(INSTRUCTOR_UID);
  const adminDb      = mkF(ADMIN_UID);
  const { doc, setDoc, getDoc } = await import('firebase/firestore');

  await test('[F-01] Learner    → CREATE own workspaceFile: ALLOW', () =>
    assertSucceeds(setDoc(
      doc(learnerDb, `labSessions/${SESSION_ID}/workspaceFiles/test_f01`),
      { filename: 'test.html', contentPreview: 'hello', userId: LEARNER_UID }
    )));

  await test('[F-02] Learner    → CREATE workspaceFile in other session: DENY ← CRITICAL', () =>
    assertFails(setDoc(
      doc(learnerDb, `labSessions/${SESSION2_ID}/workspaceFiles/test_f02`),
      { filename: 'test.html', contentPreview: 'hello', userId: LEARNER_UID }
    )));

  await test('[F-03] Learner    → CREATE workspaceFile contentPreview > 500 chars: DENY', () =>
    assertFails(setDoc(
      doc(learnerDb, `labSessions/${SESSION_ID}/workspaceFiles/test_f03`),
      { filename: 'big.html', contentPreview: 'x'.repeat(501) }
    )));

  await test('[F-04] Instructor → READ workspaceFile (any session): ALLOW', () =>
    assertSucceeds(getDoc(doc(instructorDb, `labSessions/${SESSION_ID}/workspaceFiles/index_html`))));

  await test('[F-05] Admin      → READ workspaceFile: ALLOW', () =>
    assertSucceeds(getDoc(doc(adminDb, `labSessions/${SESSION_ID}/workspaceFiles/index_html`))));

  await test('[F-06] Learner2   → READ Learner1 workspaceFile: DENY ← CRITICAL ISOLATION', () =>
    assertFails(getDoc(doc(learner2Db, `labSessions/${SESSION_ID}/workspaceFiles/index_html`))));

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  await testEnv.cleanup();
  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  EMULATOR TEST SUMMARY                                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total: ${String(total).padEnd(3)}  │  Passed: ${String(passed).padEnd(3)}  │  Failed: ${String(failed).padEnd(3)}      ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (failures.length > 0) {
    console.log('FAILED:');
    failures.forEach(f => {
      console.log('  ❌  ' + f.name);
      console.log('       ' + f.error.split('\n')[0]);
    });
    console.log('');
    process.exit(1);
  }
  console.log('All emulator rules tests PASSED. ✅\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\nFatal error:', err.message ?? err);
  process.exit(1);
});
