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
const ACTOR = String(readArgValue('--actor') || 'exam-prep-blueprint-generator').trim();
const DRAW_COUNT = Math.max(25, Number(readArgValue('--draw-count') || 150));
const CASE_STUDY_QUOTA = Math.max(0, Number(readArgValue('--case-count') || 12));

if (CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
}

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ID ? {projectId: PROJECT_ID} : undefined);
}

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

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
    console.error(`[exam-prep-blueprint-generator] credentials file not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function listOrganizationIds() {
  if (ORG_ID) {
    return [ORG_ID];
  }

  const organizationsSnap = await db.collection('organizations').get();
  return organizationsSnap.docs.map((docSnap) => docSnap.id).filter(Boolean);
}

async function loadOrgContent(orgId) {
  const [itemsSnap, caseSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/questionBank`).where('active', '==', true).where('workflowStatus', '==', 'published').get(),
    db.collection(`organizations/${orgId}/caseStudies`).where('active', '==', true).where('workflowStatus', '==', 'published').get(),
  ]);

  return {
    items: itemsSnap.docs.map((docSnap) => docSnap.data()),
    caseStudies: caseSnap.docs.map((docSnap) => docSnap.data()),
  };
}

function buildCourseGroupDistributions(items) {
  const counts = new Map();
  for (const item of items) {
    const key = String(item.courseGroupId || '').trim();
    const label = String(item.courseGroupTitle || key).trim();
    if (!key) {
      continue;
    }
    if (!counts.has(key)) {
      counts.set(key, {key, label, count: 0});
    }
    counts.get(key).count += 1;
  }

  const entries = [...counts.values()].sort((left, right) => right.count - left.count);
  if (!entries.length) {
    return [];
  }

  const baseTarget = Math.max(1, Math.floor(DRAW_COUNT / entries.length));
  return entries.map((entry, index) => ({
    key: entry.key,
    label: entry.label,
    targetCount: index === entries.length - 1
      ? Math.max(baseTarget, DRAW_COUNT - baseTarget * (entries.length - 1))
      : baseTarget,
  }));
}

function buildDifficultyDistribution() {
  return [
    {key: 'easy', label: 'Easy', targetCount: Math.max(1, Math.floor(DRAW_COUNT * 0.2))},
    {key: 'medium', label: 'Medium', targetCount: Math.max(1, Math.floor(DRAW_COUNT * 0.55))},
    {key: 'hard', label: 'Hard', targetCount: Math.max(1, DRAW_COUNT - Math.floor(DRAW_COUNT * 0.2) - Math.floor(DRAW_COUNT * 0.55))},
  ];
}

function buildItemTypeDistribution() {
  return [
    {key: 'single_choice', label: 'Single Choice', targetCount: Math.max(1, Math.floor(DRAW_COUNT * 0.45))},
    {key: 'multiple_response', label: 'Multiple Response', targetCount: Math.max(1, Math.floor(DRAW_COUNT * 0.2))},
    {key: 'select_all_that_apply', label: 'Select All That Apply', targetCount: Math.max(1, Math.floor(DRAW_COUNT * 0.2))},
    {key: 'true_false', label: 'True False', targetCount: Math.max(1, DRAW_COUNT - Math.floor(DRAW_COUNT * 0.45) - Math.floor(DRAW_COUNT * 0.2) - Math.floor(DRAW_COUNT * 0.2))},
  ];
}

function buildBlueprint(orgId, programId, items, caseStudies) {
  const firstItem = items[0];
  return {
    id: `autobp-${programId}-runtime-balanced`,
    organizationId: orgId,
    title: `${firstItem.programTitle} Runtime Balanced Blueprint`,
    slug: `${slugify(programId)}-runtime-balanced-blueprint`,
    description: `Program-level balanced blueprint for a large published runtime-compatible bank.`,
    assessmentFamily: 'comprehensive_assessment',
    programId,
    jurisdiction: firstItem.jurisdiction,
    examTrack: firstItem.examTrack,
    totalQuestionCount: DRAW_COUNT,
    caseStudyBundleQuota: Math.min(CASE_STUDY_QUOTA, caseStudies.length),
    clinicalJudgmentQuota: Math.max(5, Math.floor(DRAW_COUNT * 0.18)),
    timeBudgetMinutes: Math.max(90, Math.ceil((DRAW_COUNT * 80) / 60)),
    noDuplicateRules: true,
    exposureBalancing: true,
    sequencingRules: ['Distribute coverage across course groups', 'Blend core and advanced difficulty', 'Preserve NGN exposure in the middle third'],
    courseGroupDistributions: buildCourseGroupDistributions(items),
    moduleDistributions: [],
    tagDistributions: [],
    itemTypeDistributions: buildItemTypeDistribution(),
    difficultyDistributions: buildDifficultyDistribution(),
    progressiveSections: [],
    active: true,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

function buildBlueprintAssessment(orgId, blueprint) {
  return {
    id: `autoasm-${blueprint.programId}-runtime-blueprint-mock`,
    organizationId: orgId,
    assessmentFamily: 'comprehensive_assessment',
    assessmentMode: 'comprehensive_ngn_mock',
    title: `${blueprint.title.replace('Blueprint', 'Mock')}`,
    slug: `${slugify(blueprint.programId)}-runtime-blueprint-mock`,
    description: `Blueprint-assembled readiness mock for large-scale runtime delivery.`,
    instructions: 'This exam is assembled at runtime from the published bank according to blueprint coverage rules.',
    programId: blueprint.programId,
    jurisdiction: blueprint.jurisdiction,
    examTrack: blueprint.examTrack,
    courseGroupId: null,
    moduleId: null,
    sourceMode: 'blueprint_assembled',
    blueprintMode: 'single_blueprint',
    fixedQuestionIds: [],
    blueprintId: blueprint.id,
    randomizeQuestionOrder: true,
    randomizeChoiceOrder: false,
    drawCount: blueprint.totalQuestionCount,
    caseStudyCount: blueprint.caseStudyBundleQuota,
    durationMinutes: blueprint.timeBudgetMinutes,
    passingScorePercent: 74,
    maxAttempts: 2,
    allowRetake: true,
    requireAllQuestionsAnswered: true,
    autoSubmitOnTimeout: true,
    showScoreImmediately: true,
    showCorrectAnswersAfterSubmit: false,
    showRationalesAfterSubmit: false,
    showCategoryBreakdown: true,
    reviewMode: 'summary_only',
    active: true,
    publishStatus: 'published',
    sections: [
      {
        id: 'blueprint-runtime-block',
        title: 'Blueprint runtime block',
        description: 'Runtime-assembled block driven by course-group blueprint distributions.',
        questionCount: blueprint.totalQuestionCount,
        caseStudyCount: blueprint.caseStudyBundleQuota,
        allowedDifficulties: ['easy', 'medium', 'hard'],
        requiredTags: [],
        navigationLocked: false,
        reviewLocked: false,
      },
    ],
    strictNavigation: false,
    allowQuestionFlagging: true,
    allowBackNavigation: true,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

async function writeDocs(orgId, blueprints, assessments) {
  const batch = db.batch();
  for (const blueprint of blueprints) {
    batch.set(db.doc(`organizations/${orgId}/examBlueprints/${blueprint.id}`), blueprint, {merge: true});
  }
  for (const assessment of assessments) {
    batch.set(db.doc(`organizations/${orgId}/assessmentDefinitions/${assessment.id}`), assessment, {merge: true});
  }
  await batch.commit();
}

async function main() {
  const organizationIds = await listOrganizationIds();
  if (!organizationIds.length) {
    throw new Error('No target organizations found.');
  }

  console.log(`[exam-prep-blueprint-generator] mode=${APPLY ? 'APPLY' : 'DRY_RUN'} org=${ORG_ID || 'ALL'} drawCount=${DRAW_COUNT}`);

  for (const orgId of organizationIds) {
    const content = await loadOrgContent(orgId);
    const programs = new Map();
    for (const item of content.items) {
      const programId = String(item.programId || '').trim();
      if (!programId) {
        continue;
      }
      if (!programs.has(programId)) {
        programs.set(programId, []);
      }
      programs.get(programId).push(item);
    }

    const blueprints = [];
    const assessments = [];
    for (const [programId, items] of programs.entries()) {
      if (items.length < DRAW_COUNT) {
        continue;
      }
      const caseStudies = content.caseStudies.filter((bundle) => String(bundle.programId || '') === programId);
      const blueprint = buildBlueprint(orgId, programId, items, caseStudies);
      blueprints.push(blueprint);
      assessments.push(buildBlueprintAssessment(orgId, blueprint));
    }

    console.log(`[exam-prep-blueprint-generator] org=${orgId} blueprints=${blueprints.length} assessments=${assessments.length}`);
    if (!APPLY) {
      if (blueprints[0]) {
        console.log(`[exam-prep-blueprint-generator] sample blueprint ${blueprints[0].id} target=${blueprints[0].totalQuestionCount}`);
      }
      continue;
    }

    await writeDocs(orgId, blueprints, assessments);
    console.log(`[exam-prep-blueprint-generator] wrote ${blueprints.length} blueprints and ${assessments.length} assessments to organizations/${orgId}`);
  }
}

main().catch((error) => {
  console.error('[exam-prep-blueprint-generator] failed', error.message || error);
  process.exit(1);
});