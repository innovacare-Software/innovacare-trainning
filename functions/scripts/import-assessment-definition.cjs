/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const args = process.argv.slice(2);

function getArg(name, fallback = '') {
  const flag = `--${name}`;
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return String(args[index + 1] || '').trim();
}

const inputFile = getArg('file');
const orgId = getArg('org');
const projectId = getArg('project', 'innovacare-stripe');
const apply = args.includes('--apply');
const actor = getArg('actor', 'seed-script');

if (!inputFile) {
  console.error('Missing required --file argument.');
  process.exit(1);
}

if (!orgId) {
  console.error('Missing required --org argument.');
  process.exit(1);
}

const resolvedFile = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(resolvedFile)) {
  console.error(`File not found: ${resolvedFile}`);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const timestamp = admin.firestore.FieldValue.serverTimestamp();

function assertString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field ${fieldName} must be a non-empty string.`);
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`Field ${fieldName} must be an array.`);
  }
}

function validateAssessment(item) {
  const requiredStringFields = [
    'id',
    'assessmentFamily',
    'assessmentMode',
    'title',
    'slug',
    'description',
    'instructions',
    'programId',
    'jurisdiction',
    'examTrack',
    'sourceMode',
    'blueprintMode',
    'reviewMode',
    'publishStatus',
  ];

  for (const fieldName of requiredStringFields) {
    assertString(item[fieldName], fieldName);
  }

  assertArray(item.fixedQuestionIds, 'fixedQuestionIds');
  assertArray(item.sections, 'sections');

  if (item.sourceMode === 'fixed_static' && item.fixedQuestionIds.length === 0) {
    throw new Error('fixed_static assessments require at least one fixedQuestionId.');
  }

  if (typeof item.drawCount !== 'number' || item.drawCount < 0) {
    throw new Error('drawCount must be a number >= 0.');
  }

  if (typeof item.durationMinutes !== 'number' || item.durationMinutes < 1) {
    throw new Error('durationMinutes must be a number >= 1.');
  }

  if (typeof item.passingScorePercent !== 'number' || item.passingScorePercent < 1 || item.passingScorePercent > 100) {
    throw new Error('passingScorePercent must be between 1 and 100.');
  }
}

async function main() {
  const item = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
  validateAssessment(item);

  console.log(`[assessment-import] mode=${apply ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[assessment-import] project=${projectId} org=${orgId} assessment=${item.id}`);

  if (!apply) {
    console.log(`DRY_RUN ${item.id} sourceMode=${item.sourceMode} questions=${item.fixedQuestionIds.length}`);
    console.log('[assessment-import] Re-run with --apply to write data.');
    return;
  }

  const ref = db.doc(`organizations/${orgId}/assessmentDefinitions/${item.id}`);
  await ref.set({
    ...item,
    organizationId: orgId,
    updatedBy: actor,
    updatedAt: timestamp,
    createdBy: item.createdBy || actor,
    createdAt: item.createdAt || timestamp,
  }, { merge: true });

  console.log(`[assessment-import] Imported ${item.id} into organizations/${orgId}/assessmentDefinitions.`);
}

main().catch((error) => {
  console.error('[assessment-import] failed', error.message || error);
  process.exit(1);
});