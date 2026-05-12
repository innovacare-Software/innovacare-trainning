#!/usr/bin/env node
/**
 * One-shot migration: backfill `blueprintType` on existing org-scoped
 * exam-prep blueprints.
 *
 * CONTEXT
 * -------
 * Until L1 of the multi-tenant program-admin refactor, every blueprint was
 * implicitly NCLEX/exam-prep. The new model adds a `blueprintType`
 * discriminator so partner organizations can author general training
 * blueprints (course_training, certificate_program, compliance_training,
 * professional_development, language_training, ai_training,
 * accounting_training, public_procurement, decentralization,
 * healthcare_training, custom).
 *
 * To preserve existing UX 1:1, every legacy blueprint must carry
 * `blueprintType: 'exam_prep'`. This script walks every organization's
 * `examBlueprints` subcollection and writes the field where missing.
 *
 * USAGE
 * -----
 *   # Dry run (default — prints actions without writing)
 *   node scripts/migrate-blueprint-type.mjs
 *
 *   # Apply for real
 *   node scripts/migrate-blueprint-type.mjs --apply
 *
 * REQUIREMENTS
 * ------------
 *   GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   for the `innovacare-stripe` project (or run with firebase emulator).
 *
 * SAFETY
 * ------
 *   - Idempotent: skips blueprints that already have a `blueprintType`.
 *   - Never overwrites an explicit value.
 *   - Touches only `organizations/{orgId}/examBlueprints/{id}` documents.
 */

import process from 'node:process';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');
const DEFAULT_BLUEPRINT_TYPE = 'exam_prep';

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  const db = admin.firestore();

  console.log(`\nBlueprint type migration: ${APPLY ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`);
  console.log('---------------------------------------------------------\n');

  const orgsSnap = await db.collection('organizations').get();
  console.log(`Scanning ${orgsSnap.size} organizations...\n`);

  const stats = {
    orgsScanned: 0,
    blueprintsScanned: 0,
    backfilled: 0,
    skippedAlreadySet: 0,
    errors: 0,
  };

  for (const orgDoc of orgsSnap.docs) {
    stats.orgsScanned++;
    const orgId = orgDoc.id;
    const blueprintsRef = orgDoc.ref.collection('examBlueprints');
    let blueprintsSnap;
    try {
      blueprintsSnap = await blueprintsRef.get();
    } catch (err) {
      console.error(`  [${orgId}] failed to list blueprints:`, err.message);
      stats.errors++;
      continue;
    }

    if (blueprintsSnap.empty) continue;

    console.log(`Org ${orgId}: ${blueprintsSnap.size} blueprint(s)`);

    for (const bp of blueprintsSnap.docs) {
      stats.blueprintsScanned++;
      const data = bp.data();
      if (data.blueprintType) {
        stats.skippedAlreadySet++;
        continue;
      }
      console.log(`  - ${bp.id} -> blueprintType=${DEFAULT_BLUEPRINT_TYPE}`);
      if (APPLY) {
        try {
          await bp.ref.update({ blueprintType: DEFAULT_BLUEPRINT_TYPE });
          stats.backfilled++;
        } catch (err) {
          console.error(`    write failed:`, err.message);
          stats.errors++;
        }
      } else {
        stats.backfilled++; // counted as "would backfill" in dry-run
      }
    }
  }

  console.log('\n---------------------------------------------------------');
  console.log('Summary:');
  console.log(`  Organizations scanned : ${stats.orgsScanned}`);
  console.log(`  Blueprints scanned    : ${stats.blueprintsScanned}`);
  console.log(`  Backfilled            : ${stats.backfilled}${APPLY ? '' : ' (dry-run)'}`);
  console.log(`  Skipped (already set) : ${stats.skippedAlreadySet}`);
  console.log(`  Errors                : ${stats.errors}`);
  console.log('---------------------------------------------------------\n');

  if (!APPLY) {
    console.log('Re-run with --apply to commit these changes.\n');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
