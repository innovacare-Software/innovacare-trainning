/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ORG_ID = readArgValue('--org');
const PROJECT_ID =
  readArgValue('--project') ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  undefined;
const CREDENTIALS_PATH = resolveCredentialsPath(
  readArgValue('--credentials') ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH ||
  ''
);
const APPLY = process.argv.includes('--apply');
const RETIRE_CROSS_PROGRAM_DUPLICATES = process.argv.includes('--retire-cross-program-duplicates');
const REWRITE_STEMS = process.argv.includes('--rewrite-stems');
const PREFERRED_PROGRAM_ORDER = ['nclex-rn-prep', 'nclex-pn-prep', 'uae-nursing-licensure-prep'];

if (CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
}

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ID ? {projectId: PROJECT_ID} : undefined);
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

function readArgValue(flag) {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (exact) {
    return exact.slice(flag.length + 1).trim();
  }

  const index = process.argv.indexOf(flag);
  if (index >= 0) {
    return String(process.argv[index + 1] || '').trim();
  }

  return '';
}

function resolveCredentialsPath(rawPath) {
  const normalizedPath = String(rawPath || '').trim();
  if (!normalizedPath) {
    return '';
  }

  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(process.cwd(), normalizedPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[audit-generated-exam-prep-content] credentials file not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

async function listOrganizationIds() {
  if (ORG_ID) {
    return [ORG_ID];
  }

  const organizationsSnap = await db.collection('organizations').get();
  return organizationsSnap.docs.map((docSnap) => docSnap.id).filter(Boolean);
}

function isGeneratedItem(item) {
  const authority = String(item.sourceAuthority || '').trim();
  const reference = String(item.sourceReferenceTitle || '').trim();
  return authority === 'Innovacare Generated Content' || reference.startsWith('Generated ');
}

function simplifyGeneratedStem(stem) {
  return String(stem || '')
    .replace(/^The item belongs to the case study ".*?"\.\s*/i, '')
    .replace(/ is being prepared for .*?\./i, '')
    .replace(/This item targets .*?\./i, '')
    .replace(/The nurse identifies /i, 'The nurse notes ')
    .replace(/, with concern for /i, '. The nurse is concerned about ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeChoiceText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildFingerprint(item) {
  const normalizedStem = simplifyGeneratedStem(item.stem).toLowerCase();
  const leadIn = String(item.leadInQuestion || '').trim().toLowerCase();
  const choices = Array.isArray(item.choices)
    ? item.choices.map((choice) => normalizeChoiceText(choice.text)).sort()
    : [];
  return JSON.stringify([normalizedStem, leadIn, choices]);
}

function compareProgramPriority(left, right) {
  const leftIndex = PREFERRED_PROGRAM_ORDER.indexOf(String(left.programId || ''));
  const rightIndex = PREFERRED_PROGRAM_ORDER.indexOf(String(right.programId || ''));
  const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
  return safeLeft - safeRight;
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function auditOrganization(orgId) {
  const questionSnap = await db.collection(`organizations/${orgId}/questionBank`).get();
  const generatedItems = questionSnap.docs
    .map((docSnap) => ({id: docSnap.id, ref: docSnap.ref, ...docSnap.data()}))
    .filter(isGeneratedItem);

  const stemRewrites = generatedItems
    .map((item) => ({item, rewrittenStem: simplifyGeneratedStem(item.stem)}))
    .filter(({item, rewrittenStem}) => rewrittenStem && rewrittenStem !== String(item.stem || '').trim());

  const duplicateGroups = new Map();
  for (const item of generatedItems) {
    const fingerprint = buildFingerprint(item);
    if (!duplicateGroups.has(fingerprint)) {
      duplicateGroups.set(fingerprint, []);
    }
    duplicateGroups.get(fingerprint).push(item);
  }

  const duplicateSets = [...duplicateGroups.values()]
    .filter((items) => items.length > 1)
    .map((items) => [...items].sort(compareProgramPriority));

  const duplicatesToRetire = duplicateSets.flatMap((items) => items.slice(1));

  console.log('[audit-generated-exam-prep-content] summary', JSON.stringify({
    orgId,
    generatedItems: generatedItems.length,
    stemRewrites: stemRewrites.length,
    duplicateSets: duplicateSets.length,
    duplicatesToRetire: duplicatesToRetire.length,
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
  }));

  if (!APPLY) {
    return;
  }

  const writes = [];
  if (REWRITE_STEMS) {
    for (const {item, rewrittenStem} of stemRewrites) {
      writes.push({
        ref: item.ref,
        data: {
          stem: rewrittenStem,
          updatedAt: now,
          updatedBy: 'audit-generated-exam-prep-content',
        },
      });
    }
  }

  if (RETIRE_CROSS_PROGRAM_DUPLICATES) {
    for (const item of duplicatesToRetire) {
      writes.push({
        ref: item.ref,
        data: {
          active: false,
          workflowStatus: 'retired',
          updatedAt: now,
          updatedBy: 'audit-generated-exam-prep-content',
        },
      });
    }
  }

  for (const batchItems of chunk(writes, 300)) {
    const batch = db.batch();
    for (const write of batchItems) {
      batch.set(write.ref, write.data, {merge: true});
    }
    await batch.commit();
  }
}

(async () => {
  const organizationIds = await listOrganizationIds();
  for (const orgId of organizationIds) {
    await auditOrganization(orgId);
  }
})().catch((error) => {
  console.error('[audit-generated-exam-prep-content] failed', error.message || error);
  process.exit(1);
});