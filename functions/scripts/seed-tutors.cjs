/* eslint-disable no-console */
/**
 * seed-tutors.cjs
 * Seeds the `tutors` Firestore collection with the MOCK_TUTORS dataset.
 *
 * Usage (from repo root):
 *   node functions/scripts/seed-tutors.cjs [--apply] [--project=YOUR_PROJECT_ID]
 *
 * Without --apply  → dry-run (prints what would be written, no writes).
 * With    --apply  → performs the actual Firestore writes.
 */

const admin = require('firebase-admin');

const APPLY       = process.argv.includes('--apply');
const PROJECT_ARG = readArgValue('--project')
  || process.env.FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT;

function readArgValue(flag) {
  const exact = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (exact) return exact.slice(flag.length + 1).trim();
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ARG ? { projectId: PROJECT_ARG } : undefined);
}

const db  = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

/* ──────────────────────────────────────────────────────────────
   MOCK_TUTORS — mirrors the TypeScript MOCK_TUTORS in tutor.model.ts
   ────────────────────────────────────────────────────────────── */
const MOCK_TUTORS = [
  {
    id: 'tutor-jennifer-hayes',
    name: 'Jennifer Hayes',
    credentials: 'BSN, RN, CCRN',
    bio: `10+ years in critical care. Specializes in helping nursing students master
          NCLEX-RN and complex pathophysiology. Known for breaking down difficult
          ICU concepts into clear, testable frameworks.`,
    specialties: ['NCLEX-RN', 'Critical Care', 'Pathophysiology', 'CCRN Prep'],
    profileImageUrl: '',
    rating: 4.9,
    reviewCount: 218,
    hourlyRate: 75,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-marcus-williams',
    name: 'Marcus Williams',
    credentials: 'MSN, RN, CMSRN',
    bio: `Medical-surgical nursing expert with 8 years of clinical and teaching
          experience. Helps students tackle the hardest NCLEX med-surg questions
          and build lasting test-taking strategies.`,
    specialties: ['Med-Surg', 'NCLEX-RN', 'Pharmacology', 'ATI/HESI Prep'],
    profileImageUrl: '',
    rating: 4.8,
    reviewCount: 147,
    hourlyRate: 65,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-sofia-reyes',
    name: 'Sofia Reyes',
    credentials: 'BSN, RN, RNC-OB',
    bio: `Certified in obstetric nursing with 6 years of L&D experience. Guides
          students through maternal-newborn concepts, OB pharmacology and high-acuity
          NCLEX scenarios with patience and precision.`,
    specialties: ['Maternal-Newborn', 'Pediatrics', 'OB Pharmacology', 'NCLEX-RN'],
    profileImageUrl: '',
    rating: 4.95,
    reviewCount: 93,
    hourlyRate: 70,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-david-chen',
    name: 'David Chen',
    credentials: 'MSN, APRN, PMHN-BC',
    bio: `Psychiatric-mental health nurse practitioner with dual expertise in clinical
          practice and graduate-level education. Helps students demystify mental health
          NCLEX questions and build therapeutic communication skills.`,
    specialties: ['Mental Health', 'NCLEX-RN', 'NCLEX-PN', 'Nurse Practitioner Prep'],
    profileImageUrl: '',
    rating: 4.85,
    reviewCount: 76,
    hourlyRate: 80,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
];

/* ──────────────────────────────────────────────────────────────
   Seed logic
   ────────────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n── Seed Tutors ────────────────────────────────────────`);
  console.log(`   Mode    : ${APPLY ? '✅  APPLY (writing to Firestore)' : '🔍  DRY-RUN (no writes)'}`);
  console.log(`   Project : ${PROJECT_ARG || '(default from ADC / emulator)'}`);
  console.log(`   Tutors  : ${MOCK_TUTORS.length}`);
  console.log(`───────────────────────────────────────────────────────\n`);

  const batch = db.batch();
  let written = 0;

  for (const tutor of MOCK_TUTORS) {
    const ref = db.collection('tutors').doc(tutor.id);

    // Check if doc already exists (dry-run or apply)
    const snap = await ref.get();
    const exists = snap.exists;
    const action = exists ? 'UPDATE' : 'CREATE';

    console.log(`  ${action} tutors/${tutor.id}  — ${tutor.name} (${tutor.credentials})`);

    if (APPLY) {
      const payload = {
        ...tutor,
        updatedAt: now,
        ...(exists ? {} : { createdAt: now }),
      };
      // Remove the `id` field — it's stored as the document key, not a field
      delete payload.id;
      batch.set(ref, payload, { merge: true });
      written++;
    }
  }

  if (APPLY) {
    await batch.commit();
    console.log(`\n✅  ${written} tutor(s) written to Firestore.\n`);
  } else {
    console.log(`\n💡  Dry-run complete. Re-run with --apply to commit.\n`);
  }
}

main().catch((err) => {
  console.error('seed-tutors error:', err);
  process.exit(1);
});
