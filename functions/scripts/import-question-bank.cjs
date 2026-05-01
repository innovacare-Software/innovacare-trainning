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

function reviveFirestoreValue(value) {
  if (Array.isArray(value)) {
    return value.map(reviveFirestoreValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (
    value.type === 'firestore/timestamp/1.0' &&
    Number.isInteger(value.seconds) &&
    Number.isInteger(value.nanoseconds)
  ) {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
  }

  const revived = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    revived[key] = reviveFirestoreValue(nestedValue);
  }
  return revived;
}

function stripUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => stripUndefinedDeep(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const normalized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue !== undefined) {
      normalized[key] = stripUndefinedDeep(nestedValue);
    }
  }
  return normalized;
}

function assertString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field ${fieldName} must be a non-empty string.`);
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Field ${fieldName} must be a non-empty array.`);
  }
}

function normalizeChoiceRationales(item) {
  const rationaleMap = item && item.choiceRationales && typeof item.choiceRationales === 'object'
    ? item.choiceRationales
    : {};

  if (!Array.isArray(item.choices)) {
    return item;
  }

  item.choices = item.choices.map((choice) => {
    const id = String(choice && choice.id || '').trim();
    const inlineRationale = typeof choice?.rationale === 'string' ? choice.rationale.trim() : '';
    const mappedRationale = typeof rationaleMap[id] === 'string' ? rationaleMap[id].trim() : '';
    return {
      ...choice,
      rationale: inlineRationale || mappedRationale || undefined,
    };
  });

  return item;
}

function validateBowTieInteraction(item, choiceIds) {
  const interactionConfig = item && item.interactionConfig && typeof item.interactionConfig === 'object' && !Array.isArray(item.interactionConfig)
    ? item.interactionConfig
    : null;

  if (!interactionConfig || interactionConfig.kind !== 'bow_tie') {
    throw new Error(`bow_tie item ${item.id} requires interactionConfig.kind="bow_tie".`);
  }

  const parts = Array.isArray(interactionConfig.parts) ? interactionConfig.parts : [];
  if (parts.length < 3) {
    throw new Error(`bow_tie item ${item.id} requires at least 3 interaction parts.`);
  }

  const referencedChoiceIds = new Set();
  for (const part of parts) {
    assertString(part.id, `interactionConfig.parts[].id for ${item.id}`);
    assertString(part.label, `interactionConfig.parts[].label for ${item.id}`);
    assertString(part.prompt, `interactionConfig.parts[].prompt for ${item.id}`);
    const selectionMode = String(part.selectionMode || '').trim();
    if (!['single', 'multiple'].includes(selectionMode)) {
      throw new Error(`interactionConfig.parts[].selectionMode must be single or multiple for ${item.id}.`);
    }
    if (!Number.isInteger(part.minSelections) || part.minSelections < 0) {
      throw new Error(`interactionConfig.parts[].minSelections must be an integer >= 0 for ${item.id}.`);
    }
    if (!Number.isInteger(part.maxSelections) || part.maxSelections < 1 || part.maxSelections < part.minSelections) {
      throw new Error(`interactionConfig.parts[].maxSelections must be an integer >= minSelections for ${item.id}.`);
    }
    assertArray(part.optionIds, `interactionConfig.parts[].optionIds for ${item.id}`);
    if (selectionMode === 'single' && part.maxSelections !== 1) {
      throw new Error(`single-select bow_tie parts must use maxSelections=1 for ${item.id}.`);
    }
    const correctCount = item.correctAnswerKey.filter((key) => part.optionIds.includes(key)).length;
    if (correctCount < part.minSelections || correctCount > part.maxSelections) {
      throw new Error(`bow_tie item ${item.id} has an invalid correctAnswerKey count for part ${part.id}.`);
    }
    for (const optionId of part.optionIds) {
      if (!choiceIds.has(optionId)) {
        throw new Error(`Unknown bow_tie option id ${optionId} for ${item.id}.`);
      }
      referencedChoiceIds.add(optionId);
    }
  }

  for (const answerKey of item.correctAnswerKey) {
    if (!referencedChoiceIds.has(answerKey)) {
      throw new Error(`Bow tie correctAnswerKey ${answerKey} is not assigned to any interaction part for ${item.id}.`);
    }
  }
}

function validateClozeInteraction(item, choiceIds) {
  const interactionConfig = item && item.interactionConfig && typeof item.interactionConfig === 'object' && !Array.isArray(item.interactionConfig)
    ? item.interactionConfig
    : null;

  if (!interactionConfig || interactionConfig.kind !== 'cloze_drop_down') {
    throw new Error(`cloze_drop_down item ${item.id} requires interactionConfig.kind="cloze_drop_down".`);
  }

  const segments = Array.isArray(interactionConfig.segments) ? interactionConfig.segments : [];
  if (!segments.length) {
    throw new Error(`cloze_drop_down item ${item.id} requires at least one segment.`);
  }

  if (item.correctAnswerKey.length !== segments.length) {
    throw new Error(`cloze_drop_down item ${item.id} must have exactly one correctAnswerKey per segment.`);
  }

  const expectedKeys = new Set();
  for (const segment of segments) {
    assertString(segment.id, `interactionConfig.segments[].id for ${item.id}`);
    assertString(segment.label, `interactionConfig.segments[].label for ${item.id}`);
    assertString(segment.placeholder, `interactionConfig.segments[].placeholder for ${item.id}`);
    assertArray(segment.optionIds, `interactionConfig.segments[].optionIds for ${item.id}`);
    assertString(segment.correctOptionId, `interactionConfig.segments[].correctOptionId for ${item.id}`);
    if (!segment.optionIds.includes(segment.correctOptionId)) {
      throw new Error(`cloze segment ${segment.id} must include correctOptionId in optionIds for ${item.id}.`);
    }
    for (const optionId of segment.optionIds) {
      if (!choiceIds.has(optionId)) {
        throw new Error(`Unknown cloze option id ${optionId} for ${item.id}.`);
      }
    }
    expectedKeys.add(segment.correctOptionId);
  }

  if (expectedKeys.size !== item.correctAnswerKey.length || item.correctAnswerKey.some((key) => !expectedKeys.has(key))) {
    throw new Error(`cloze_drop_down item ${item.id} has correctAnswerKey values that do not match segment correctOptionId values.`);
  }
}

function validateItem(item) {
  normalizeChoiceRationales(item);

  const requiredStringFields = [
    'id',
    'programId',
    'programTitle',
    'jurisdiction',
    'examTrack',
    'courseGroupId',
    'courseGroupTitle',
    'moduleId',
    'moduleTitle',
    'itemType',
    'cognitiveLevel',
    'difficulty',
    'stem',
    'leadInQuestion',
    'explanation',
    'rationale',
    'sourceAuthority',
    'sourceReferenceTitle',
    'sourceVersionDate',
    'workflowStatus',
    'createdBy',
    'updatedBy',
  ];

  for (const fieldName of requiredStringFields) {
    assertString(item[fieldName], fieldName);
  }

  assertArray(item.choices, 'choices');
  assertArray(item.correctAnswerKey, 'correctAnswerKey');
  assertArray(item.learningObjectives, 'learningObjectives');
  assertArray(item.tags, 'tags');

  if (typeof item.points !== 'number' || item.points < 1) {
    throw new Error(`Field points must be a number >= 1 for ${item.id}.`);
  }

  if (typeof item.estimatedTimeSeconds !== 'number' || item.estimatedTimeSeconds < 15) {
    throw new Error(`Field estimatedTimeSeconds must be a number >= 15 for ${item.id}.`);
  }

  const choiceIds = new Set(item.choices.map((choice) => choice.id));
  for (const choice of item.choices) {
    assertString(choice.id, `choices[].id for ${item.id}`);
    assertString(choice.label, `choices[].label for ${item.id}`);
    assertString(choice.text, `choices[].text for ${item.id}`);
    if (choice.rationale !== undefined && typeof choice.rationale !== 'string') {
      throw new Error(`choices[].rationale must be a string when provided for ${item.id}.`);
    }
  }
  if (item.choiceRationales !== undefined && (typeof item.choiceRationales !== 'object' || Array.isArray(item.choiceRationales))) {
    throw new Error(`Field choiceRationales must be an object when provided for ${item.id}.`);
  }
  for (const answerKey of item.correctAnswerKey) {
    if (!choiceIds.has(answerKey)) {
      throw new Error(`Unknown correctAnswerKey ${answerKey} for ${item.id}.`);
    }
  }

  if (item.itemType === 'bow_tie') {
    validateBowTieInteraction(item, choiceIds);
  }

  if (item.itemType === 'cloze_drop_down') {
    validateClozeInteraction(item, choiceIds);
  }
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!items.length) {
    throw new Error('No items found in payload.');
  }

  for (const item of items) {
    normalizeChoiceRationales(item);
    validateItem(item);
  }

  console.log(`[question-bank-import] mode=${apply ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[question-bank-import] project=${projectId} org=${orgId} items=${items.length}`);

  if (!apply) {
    for (const item of items) {
      console.log(`DRY_RUN ${item.id} ${item.moduleId} ${item.tags.join(',')}`);
    }
    console.log('[question-bank-import] Re-run with --apply to write data.');
    return;
  }

  const batch = db.batch();
  for (const item of items) {
    const normalizedItem = stripUndefinedDeep(reviveFirestoreValue(item));
    const ref = db.doc(`organizations/${orgId}/questionBank/${item.id}`);
    batch.set(ref, {
      ...normalizedItem,
      organizationId: orgId,
      createdBy: normalizedItem.createdBy || actor,
      updatedBy: normalizedItem.updatedBy || actor,
      createdAt: normalizedItem.createdAt || timestamp,
      updatedAt: normalizedItem.updatedAt || timestamp,
    }, { merge: true });
  }

  await batch.commit();
  console.log(`[question-bank-import] Imported ${items.length} items into organizations/${orgId}/questionBank.`);
}

main().catch((error) => {
  console.error('[question-bank-import] failed', error.message || error);
  process.exit(1);
});