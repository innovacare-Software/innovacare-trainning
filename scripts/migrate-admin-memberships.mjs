#!/usr/bin/env node
/**
 * One-shot migration: backfill `userOrgMemberships` from legacy admin profiles.
 *
 * SECURITY CONTEXT
 * ----------------
 * Historically, admin authority was granted via `users.role` + `users.orgId`.
 * That model leaks across organizations: a user with role=programAdmin and
 * orgId=Public Org could reach the Innovacare admin surface.
 *
 * The new authority model is `userOrgMemberships/{userId}__{orgId}` with
 * status=active and role in (org_admin|program_admin|instructor|learner|guest).
 *
 * This script reads every user document and creates the matching membership
 * (idempotent — does NOT overwrite existing memberships).
 *
 * USAGE
 * -----
 *   # Dry run (default — prints actions without writing)
 *   node scripts/migrate-admin-memberships.mjs
 *
 *   # Apply for real
 *   node scripts/migrate-admin-memberships.mjs --apply
 *
 * REQUIREMENTS
 * ------------
 *   GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   for the `innovacare-stripe` project (or run with firebase emulator).
 *
 * SAFETY
 * ------
 *   - Skips users whose orgId is the legacy public org (Waxxi8M4qpTSsoGJ8fJS)
 *     when role is admin-like — these are flagged for manual super-admin review.
 *   - Skips users with no orgId.
 *   - Never overwrites an existing membership.
 *   - Maps legacy roles:
 *       admin, manager      -> org_admin
 *       programAdmin        -> program_admin
 *       programStaff        -> instructor
 *       programLearner      -> learner
 *       learner             -> learner
 *     Other roles (guest, super_admin) are skipped.
 */

import process from 'node:process';
import admin from 'firebase-admin';

const LEGACY_PUBLIC_ORG_ID = 'Waxxi8M4qpTSsoGJ8fJS';
const APPLY = process.argv.includes('--apply');

const ROLE_MAP = {
  admin: 'org_admin',
  manager: 'org_admin',
  programAdmin: 'program_admin',
  programStaff: 'instructor',
  programLearner: 'learner',
  learner: 'learner',
};

const ADMIN_LIKE = new Set(['admin', 'manager', 'programAdmin']);

function membershipId(userId, orgId) {
  return `${userId}__${orgId}`;
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  const db = admin.firestore();

  console.log(`\nMigration mode: ${APPLY ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`);
  console.log('---------------------------------------------------------\n');

  const usersSnap = await db.collection('users').get();
  console.log(`Scanning ${usersSnap.size} user documents...\n`);

  const stats = {
    scanned: 0,
    created: 0,
    skippedExisting: 0,
    skippedNoOrgId: 0,
    skippedRole: 0,
    flaggedPublicOrgAdmin: [],
    errors: 0,
  };

  for (const userDoc of usersSnap.docs) {
    stats.scanned += 1;
    const uid = userDoc.id;
    const data = userDoc.data() || {};
    const role = String(data.role || '').trim();
    const orgId = String(data.orgId || '').trim();
    const targetRole = ROLE_MAP[role];

    if (!targetRole) {
      stats.skippedRole += 1;
      continue;
    }

    if (!orgId) {
      stats.skippedNoOrgId += 1;
      continue;
    }

    // SECURITY GATE: an admin-like role anchored to the public org is
    // suspicious — likely the cross-tenant leak we are fixing. Flag for
    // manual super-admin review instead of auto-creating a membership that
    // would grant Innovacare admin access.
    if (orgId === LEGACY_PUBLIC_ORG_ID && ADMIN_LIKE.has(role)) {
      stats.flaggedPublicOrgAdmin.push({ uid, email: data.email || '', role });
      continue;
    }

    const mid = membershipId(uid, orgId);
    const ref = db.collection('userOrgMemberships').doc(mid);
    const existing = await ref.get();

    if (existing.exists) {
      stats.skippedExisting += 1;
      continue;
    }

    const payload = {
      userId: uid,
      orgId,
      role: targetRole,
      status: 'active',
      assignedBy: 'system-migration',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (APPLY) {
      try {
        await ref.set(payload);
        stats.created += 1;
        console.log(`  [created] ${mid}  (${role} -> ${targetRole})`);
      } catch (err) {
        stats.errors += 1;
        console.error(`  [error]   ${mid}: ${err.message}`);
      }
    } else {
      stats.created += 1;
      console.log(`  [would-create] ${mid}  (${role} -> ${targetRole})`);
    }
  }

  console.log('\n---------------------------------------------------------');
  console.log('Summary:');
  console.log(`  Users scanned:                ${stats.scanned}`);
  console.log(`  Memberships ${APPLY ? 'created' : 'to create'}:       ${stats.created}`);
  console.log(`  Already had membership:       ${stats.skippedExisting}`);
  console.log(`  Skipped (no orgId):           ${stats.skippedNoOrgId}`);
  console.log(`  Skipped (non-mapped role):    ${stats.skippedRole}`);
  console.log(`  Errors:                       ${stats.errors}`);
  console.log(`  Flagged public-org admins:    ${stats.flaggedPublicOrgAdmin.length}`);

  if (stats.flaggedPublicOrgAdmin.length > 0) {
    console.log('\nSECURITY REVIEW REQUIRED — these users have an admin-like role anchored to');
    console.log('the public org and were NOT auto-migrated. Super-admin must reassign them:');
    for (const u of stats.flaggedPublicOrgAdmin) {
      console.log(`  - uid=${u.uid}  email=${u.email}  role=${u.role}`);
    }
  }

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to perform writes.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
