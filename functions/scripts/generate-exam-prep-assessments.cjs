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
const ACTOR = String(readArgValue('--actor') || 'exam-prep-assessment-generator').trim();
const MODULE_TARGET_COUNT = Math.max(12, Number(readArgValue('--module-count') || 25));
const COMPREHENSIVE_TARGET_COUNT = Math.max(25, Number(readArgValue('--comprehensive-count') || 75));
const COMPREHENSIVE_CASE_COUNT = Math.max(0, Number(readArgValue('--comprehensive-case-count') || 8));

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
    console.error(`[exam-prep-assessment-generator] credentials file not found: ${absolutePath}`);
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

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function buildModuleAssessment(orgId, moduleId, items) {
  const firstItem = items[0];
  const limitedItems = items.slice(0, Math.min(MODULE_TARGET_COUNT, items.length));
  return {
    id: `autoasm-${firstItem.programId}-${slugify(moduleId)}-module-final`,
    organizationId: orgId,
    assessmentFamily: 'module_assessment',
    assessmentMode: 'module_final',
    title: `${firstItem.moduleTitle} Module Final`,
    slug: `${slugify(firstItem.programId)}-${slugify(moduleId)}-module-final`,
    description: `Fixed published assessment assembled from the generated ${firstItem.moduleTitle} question pool.`,
    instructions: 'Read each item carefully and submit your best clinical judgment before time expires.',
    programId: firstItem.programId,
    jurisdiction: firstItem.jurisdiction,
    examTrack: firstItem.examTrack,
    courseGroupId: firstItem.courseGroupId,
    moduleId: firstItem.moduleId,
    sourceMode: 'fixed_static',
    blueprintMode: 'manual',
    fixedQuestionIds: limitedItems.map((item) => item.id),
    blueprintId: null,
    randomizeQuestionOrder: true,
    randomizeChoiceOrder: false,
    drawCount: limitedItems.length,
    caseStudyCount: limitedItems.filter((item) => item.parentCaseId).length > 0 ? 1 : 0,
    durationMinutes: Math.max(20, Math.ceil(limitedItems.reduce((sum, item) => sum + Number(item.estimatedTimeSeconds || 75), 0) / 60)),
    passingScorePercent: 72,
    maxAttempts: 3,
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
    sections: [],
    strictNavigation: false,
    allowQuestionFlagging: true,
    allowBackNavigation: true,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

function buildCaseSimulationAssessment(orgId, moduleId, caseStudies, itemsById) {
  const bundles = caseStudies.slice(0, 2);
  if (!bundles.length) {
    return null;
  }

  const firstCase = bundles[0];
  const fixedQuestionIds = bundles
    .flatMap((bundle) => bundle.childItemIds || [])
    .filter((itemId) => itemsById.has(itemId));

  if (!fixedQuestionIds.length) {
    return null;
  }

  return {
    id: `autoasm-${firstCase.programId}-${slugify(moduleId)}-case-sim`,
    organizationId: orgId,
    assessmentFamily: 'module_assessment',
    assessmentMode: 'case_simulation',
    title: `${firstCase.moduleTitle} Case Simulation`,
    slug: `${slugify(firstCase.programId)}-${slugify(moduleId)}-case-simulation`,
    description: `Case-based simulation assembled from published ${firstCase.moduleTitle} case studies.`,
    instructions: 'Use the shared case context and answer each linked item in sequence.',
    programId: firstCase.programId,
    jurisdiction: firstCase.jurisdiction,
    examTrack: firstCase.examTrack,
    courseGroupId: firstCase.courseGroupId,
    moduleId: firstCase.moduleId,
    sourceMode: 'fixed_static',
    blueprintMode: 'manual',
    fixedQuestionIds,
    blueprintId: null,
    randomizeQuestionOrder: false,
    randomizeChoiceOrder: false,
    drawCount: fixedQuestionIds.length,
    caseStudyCount: bundles.length,
    durationMinutes: Math.max(20, Math.ceil((fixedQuestionIds.length * 95) / 60)),
    passingScorePercent: 70,
    maxAttempts: 3,
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
    sections: [],
    strictNavigation: true,
    allowQuestionFlagging: true,
    allowBackNavigation: true,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

function buildComprehensiveAssessment(orgId, programId, items, caseStudies) {
  const firstItem = items[0];
  const fixedQuestionIds = items.slice(0, Math.min(COMPREHENSIVE_TARGET_COUNT, items.length)).map((item) => item.id);
  const sectionCaseCount = Math.min(COMPREHENSIVE_CASE_COUNT, caseStudies.length);
  return {
    id: `autoasm-${programId}-readiness-mock`,
    organizationId: orgId,
    assessmentFamily: 'comprehensive_assessment',
    assessmentMode: 'comprehensive_ngn_mock',
    title: `${firstItem.programTitle} Readiness Mock`,
    slug: `${slugify(programId)}-readiness-mock`,
    description: `Published readiness mock built from the generated ${firstItem.programTitle} bank.`,
    instructions: 'Complete the full readiness mock in one sitting and monitor pacing across the full exam.',
    programId,
    jurisdiction: firstItem.jurisdiction,
    examTrack: firstItem.examTrack,
    courseGroupId: null,
    moduleId: null,
    sourceMode: 'fixed_static',
    blueprintMode: 'manual',
    fixedQuestionIds,
    blueprintId: null,
    randomizeQuestionOrder: true,
    randomizeChoiceOrder: false,
    drawCount: fixedQuestionIds.length,
    caseStudyCount: sectionCaseCount,
    durationMinutes: Math.max(60, Math.ceil((fixedQuestionIds.length * 80) / 60)),
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
        id: 'readiness-block-1',
        title: 'Readiness block',
        description: 'Mixed program-level readiness assessment.',
        questionCount: fixedQuestionIds.length,
        caseStudyCount: sectionCaseCount,
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

async function loadOrgContent(orgId) {
  const [itemsSnap, casesSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/questionBank`).where('active', '==', true).where('workflowStatus', '==', 'published').get(),
    db.collection(`organizations/${orgId}/caseStudies`).where('active', '==', true).where('workflowStatus', '==', 'published').get(),
  ]);

  return {
    items: itemsSnap.docs.map((docSnap) => docSnap.data()),
    caseStudies: casesSnap.docs.map((docSnap) => docSnap.data()),
  };
}

function buildAssessmentPayloads(orgId, content) {
  const itemsById = new Map(content.items.map((item) => [item.id, item]));
  const moduleGroups = new Map();
  const caseModuleGroups = new Map();
  const programGroups = new Map();

  for (const item of content.items) {
    const moduleKey = `${item.programId}::${item.moduleId}`;
    const programKey = item.programId;
    if (!moduleGroups.has(moduleKey)) {
      moduleGroups.set(moduleKey, []);
    }
    if (!programGroups.has(programKey)) {
      programGroups.set(programKey, []);
    }
    moduleGroups.get(moduleKey).push(item);
    programGroups.get(programKey).push(item);
  }

  for (const caseStudy of content.caseStudies) {
    const moduleKey = `${caseStudy.programId}::${caseStudy.moduleId}`;
    if (!caseModuleGroups.has(moduleKey)) {
      caseModuleGroups.set(moduleKey, []);
    }
    caseModuleGroups.get(moduleKey).push(caseStudy);
  }

  const assessments = [];
  for (const [moduleKey, items] of moduleGroups.entries()) {
    if (items.length < 12) {
      continue;
    }
    assessments.push(buildModuleAssessment(orgId, moduleKey.split('::')[1], items));
    const caseAssessment = buildCaseSimulationAssessment(orgId, moduleKey.split('::')[1], caseModuleGroups.get(moduleKey) || [], itemsById);
    if (caseAssessment) {
      assessments.push(caseAssessment);
    }
  }

  for (const [programId, items] of programGroups.entries()) {
    if (items.length < 25) {
      continue;
    }
    const caseStudies = content.caseStudies.filter((bundle) => bundle.programId === programId);
    assessments.push(buildComprehensiveAssessment(orgId, programId, items, caseStudies));
  }

  return assessments;
}

async function writeAssessments(orgId, assessments) {
  for (const group of chunk(assessments, 300)) {
    const batch = db.batch();
    for (const assessment of group) {
      const ref = db.doc(`organizations/${orgId}/assessmentDefinitions/${assessment.id}`);
      batch.set(ref, assessment, {merge: true});
    }
    await batch.commit();
  }
}

async function main() {
  const organizationIds = await listOrganizationIds();
  if (!organizationIds.length) {
    throw new Error('No target organizations found.');
  }

  console.log(`[exam-prep-assessment-generator] mode=${APPLY ? 'APPLY' : 'DRY_RUN'} org=${ORG_ID || 'ALL'} moduleCount=${MODULE_TARGET_COUNT} comprehensiveCount=${COMPREHENSIVE_TARGET_COUNT}`);

  for (const orgId of organizationIds) {
    const content = await loadOrgContent(orgId);
    const assessments = buildAssessmentPayloads(orgId, content);
    console.log(`[exam-prep-assessment-generator] org=${orgId} items=${content.items.length} caseStudies=${content.caseStudies.length} generatedAssessments=${assessments.length}`);

    if (!APPLY) {
      if (assessments[0]) {
        console.log(`[exam-prep-assessment-generator] sample assessment ${assessments[0].id} ${assessments[0].assessmentMode} ${assessments[0].drawCount} questions`);
      }
      continue;
    }

    await writeAssessments(orgId, assessments);
    console.log(`[exam-prep-assessment-generator] wrote ${assessments.length} assessments to organizations/${orgId}`);
  }
}

main().catch((error) => {
  console.error('[exam-prep-assessment-generator] failed', error.message || error);
  process.exit(1);
});