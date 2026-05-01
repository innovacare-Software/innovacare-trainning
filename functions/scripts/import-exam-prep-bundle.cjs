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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

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

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field ${fieldName} must be a non-empty string.`);
  }
}

function assertNonEmptyArray(value, fieldName) {
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
    assertNonEmptyString(part.id, `interactionConfig.parts[].id for ${item.id}`);
    assertNonEmptyString(part.label, `interactionConfig.parts[].label for ${item.id}`);
    assertNonEmptyString(part.prompt, `interactionConfig.parts[].prompt for ${item.id}`);
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
    assertNonEmptyArray(part.optionIds, `interactionConfig.parts[].optionIds for ${item.id}`);
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
    assertNonEmptyString(segment.id, `interactionConfig.segments[].id for ${item.id}`);
    assertNonEmptyString(segment.label, `interactionConfig.segments[].label for ${item.id}`);
    assertNonEmptyString(segment.placeholder, `interactionConfig.segments[].placeholder for ${item.id}`);
    assertNonEmptyArray(segment.optionIds, `interactionConfig.segments[].optionIds for ${item.id}`);
    assertNonEmptyString(segment.correctOptionId, `interactionConfig.segments[].correctOptionId for ${item.id}`);
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
    'organizationId',
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
  ];

  for (const fieldName of requiredStringFields) {
    assertNonEmptyString(item[fieldName], fieldName);
  }

  assertNonEmptyArray(item.choices, 'choices');
  assertNonEmptyArray(item.correctAnswerKey, 'correctAnswerKey');
  assertNonEmptyArray(item.learningObjectives, 'learningObjectives');
  assertNonEmptyArray(item.tags, 'tags');

  if (typeof item.points !== 'number' || item.points < 1) {
    throw new Error(`Field points must be a number >= 1 for ${item.id}.`);
  }

  if (typeof item.estimatedTimeSeconds !== 'number' || item.estimatedTimeSeconds < 15) {
    throw new Error(`Field estimatedTimeSeconds must be a number >= 15 for ${item.id}.`);
  }
  for (const choice of item.choices) {
    assertNonEmptyString(choice.id, `choices[].id for ${item.id}`);
    assertNonEmptyString(choice.label, `choices[].label for ${item.id}`);
    assertNonEmptyString(choice.text, `choices[].text for ${item.id}`);
    if (choice.rationale !== undefined && typeof choice.rationale !== 'string') {
      throw new Error(`choices[].rationale must be a string when provided for ${item.id}.`);
    }
  }
  if (item.choiceRationales !== undefined && (typeof item.choiceRationales !== 'object' || Array.isArray(item.choiceRationales))) {
    throw new Error(`Field choiceRationales must be an object when provided for ${item.id}.`);
  }

  const choiceIds = new Set(item.choices.map((choice) => choice.id));
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

function normalizeCaseStudy(caseStudy, itemsById, orgId, actor, timestamp) {
  assertNonEmptyString(caseStudy.id, 'caseStudies[].id');
  assertNonEmptyString(caseStudy.title, `caseStudies[${caseStudy.id}].title`);
  assertNonEmptyArray(caseStudy.linkedItemIds, `caseStudies[${caseStudy.id}].linkedItemIds`);

  const linkedItems = caseStudy.linkedItemIds
    .map((itemId) => itemsById.get(String(itemId).trim()))
    .filter(Boolean);

  if (!linkedItems.length) {
    throw new Error(`Case study ${caseStudy.id} does not reference any known question-bank item.`);
  }

  const primaryItem = linkedItems[0];
  const scenarioText = String(caseStudy.scenarioText || caseStudy.description || caseStudy.title).trim();
  const sharedHistory = String(caseStudy.description || caseStudy.scenarioText || caseStudy.title).trim();
  const sourceAuthority = String(caseStudy.sourceAuthority || primaryItem.sourceAuthority || 'Imported bundle').trim();
  const sourceVersionDate = String(caseStudy.sourceVersionDate || primaryItem.sourceVersionDate || new Date().toISOString().slice(0, 10)).trim();

  return {
    id: caseStudy.id,
    organizationId: orgId,
    title: caseStudy.title,
    slug: slugify(caseStudy.title) || caseStudy.id,
    programId: caseStudy.programId || primaryItem.programId,
    programTitle: caseStudy.programTitle || primaryItem.programTitle,
    jurisdiction: primaryItem.jurisdiction || 'US',
    examTrack: primaryItem.examTrack || 'NCLEX-RN',
    courseGroupId: caseStudy.courseGroupId || primaryItem.courseGroupId,
    courseGroupTitle: primaryItem.courseGroupTitle || caseStudy.sectionId || 'Case Studies',
    moduleId: primaryItem.moduleId || 'case-study',
    moduleTitle: primaryItem.moduleTitle || 'Case Study',
    workflowStatus: caseStudy.workflowStatus || primaryItem.workflowStatus || 'draft',
    active: caseStudy.active !== false,
    sharedContext: {
      vignette: scenarioText,
      demographics: 'Adult client',
      history: sharedHistory,
      allergies: [],
      currentMeds: [],
      labs: [],
      vitalSigns: [],
      nursingNotes: [],
      providerNotes: [],
      imagingSnippets: [],
      trendUpdates: [],
    },
    childItemIds: caseStudy.linkedItemIds.map((itemId) => String(itemId).trim()),
    sequenceOrder: caseStudy.linkedItemIds.map((_, index) => index + 1),
    sourceReferences: [
      {
        sourceAuthority,
        sourceReferenceTitle: caseStudy.title,
        sourceReferenceUrl: null,
        sourceVersionDate,
        jurisdictionNotes: primaryItem.jurisdictionNotes || null,
      },
    ],
    version: Number(caseStudy.version || 1),
    createdAt: reviveFirestoreValue(caseStudy.createdAt) || timestamp,
    updatedAt: reviveFirestoreValue(caseStudy.updatedAt) || timestamp,
    createdBy: caseStudy.createdBy || actor,
    updatedBy: caseStudy.updatedBy || actor,
  };
}

async function main() {
  const inputFile = getArg('file');
  const orgId = getArg('org');
  const projectId = getArg('project', 'innovacare-stripe');
  const actor = getArg('actor', 'seed-script');
  const apply = args.includes('--apply');

  if (!inputFile) {
    throw new Error('Missing required --file argument.');
  }

  if (!orgId) {
    throw new Error('Missing required --org argument.');
  }

  const resolvedFile = path.resolve(process.cwd(), inputFile);
  if (!fs.existsSync(resolvedFile)) {
    throw new Error(`File not found: ${resolvedFile}`);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  const db = admin.firestore();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const payload = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
  const items = Array.isArray(payload.items) ? payload.items.map(reviveFirestoreValue) : [];
  const caseStudies = Array.isArray(payload.caseStudies) ? payload.caseStudies.map(reviveFirestoreValue) : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];

  if (!items.length) {
    throw new Error('No items found in payload.');
  }

  const itemsById = new Map();
  for (const item of items) {
    normalizeChoiceRationales(item);
    validateItem(item);
    itemsById.set(item.id, item);
  }

  const normalizedBundles = caseStudies.map((caseStudy) =>
    normalizeCaseStudy(caseStudy, itemsById, orgId, actor, timestamp)
  );

  console.log(`[exam-prep-bundle-import] mode=${apply ? 'APPLY' : 'DRY_RUN'}`);
  console.log(
    `[exam-prep-bundle-import] project=${projectId} org=${orgId} items=${items.length} caseStudies=${normalizedBundles.length} sections=${sections.length}`
  );

  if (!apply) {
    for (const bundle of normalizedBundles) {
      console.log(`DRY_RUN_CASE ${bundle.id} ${bundle.courseGroupId} ${bundle.childItemIds.length}`);
    }
    console.log('[exam-prep-bundle-import] Re-run with --apply to write data.');
    return;
  }

  const writes = [];
  for (const item of items) {
    const itemRef = db.doc(`organizations/${orgId}/questionBank/${item.id}`);
    const normalizedItem = stripUndefinedDeep(reviveFirestoreValue(item));
    writes.push(
      itemRef.set(
        {
          ...normalizedItem,
          organizationId: orgId,
          createdBy: normalizedItem.createdBy || actor,
          updatedBy: normalizedItem.updatedBy || actor,
          createdAt: normalizedItem.createdAt || timestamp,
          updatedAt: normalizedItem.updatedAt || timestamp,
        },
        { merge: true }
      )
    );
  }

  for (const bundle of normalizedBundles) {
    const caseStudyRef = db.doc(`organizations/${orgId}/caseStudies/${bundle.id}`);
    writes.push(caseStudyRef.set(bundle, { merge: true }));
  }

  await Promise.all(writes);
  console.log(`[exam-prep-bundle-import] Imported ${items.length} items into organizations/${orgId}/questionBank.`);
  console.log(`[exam-prep-bundle-import] Imported ${normalizedBundles.length} case studies into organizations/${orgId}/caseStudies.`);
}

main().catch((error) => {
  console.error('[exam-prep-bundle-import] failed', error.message || error);
  process.exit(1);
});