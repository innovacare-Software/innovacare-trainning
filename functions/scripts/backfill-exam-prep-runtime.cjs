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
const ATTEMPT_ID = readArgValue('--attempt');
const LIMIT = Number(readArgValue('--limit') || 0);
const APPLY = process.argv.includes('--apply');

if (CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
}

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ID ? { projectId: PROJECT_ID } : undefined);
}

const db = admin.firestore();

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
    console.error(`[exam-prep-runtime-backfill] credentials file not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

function printCredentialsHelp() {
  console.error('[exam-prep-runtime-backfill] Google credentials are required to access Firestore.');
  console.error('[exam-prep-runtime-backfill] Provide one of the following:');
  console.error('  1. --credentials="C:/path/to/service-account.json"');
  console.error('  2. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path');
  console.error('  3. Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH to a service-account JSON path');
  console.error('[exam-prep-runtime-backfill] Example: npm run backfill:exam-prep-runtime -- --project=innovacare-stripe --credentials="C:/keys/innovacare-stripe-admin.json" --limit=10');
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function normalizeBooleanMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), entry === true])
  );
}

function normalizeNumberMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [String(key), Number(entry || 0)])
      .filter(([, entry]) => Number.isFinite(entry))
  );
}

function toQuestionChoice(choice, index) {
  const record = (choice || {});
  const id = String(record.id || String.fromCharCode(65 + index)).trim();
  const rationale = String(record.rationale || '').trim();
  return {
    id,
    label: String(record.label || id),
    text: String(record.text || ''),
    rationale: rationale || null,
  };
}

function mergeChoiceRationalesIntoChoices(item) {
  const rationaleMap = item && item.choiceRationales && typeof item.choiceRationales === 'object'
    ? item.choiceRationales
    : {};

  return Array.isArray(item.choices)
    ? item.choices.map((choice, index) => {
      const normalized = toQuestionChoice(choice, index);
      const fallbackRationale = String(rationaleMap[normalized.id] || '').trim();
      return {
        ...normalized,
        rationale: normalized.rationale || fallbackRationale || null,
      };
    })
    : [];
}

function sanitizeQuestion(item) {
  return {
    id: String(item.id || ''),
    stem: String(item.stem || ''),
    scenarioText: item.scenarioText ? String(item.scenarioText) : null,
    leadInQuestion: String(item.leadInQuestion || ''),
    itemType: String(item.itemType || 'single_choice'),
    moduleTitle: String(item.moduleTitle || ''),
    courseGroupTitle: String(item.courseGroupTitle || ''),
    parentCaseId: item.parentCaseId ? String(item.parentCaseId) : null,
    points: Number(item.points || 1),
    choices: mergeChoiceRationalesIntoChoices(item),
  };
}

function applyChoiceOrder(questions, rawChoiceOrderMap) {
  const choiceOrderMap = rawChoiceOrderMap && typeof rawChoiceOrderMap === 'object' ? rawChoiceOrderMap : {};

  return questions.map((question) => {
    const questionId = String(question.id || '').trim();
    const storedChoiceOrder = Array.isArray(choiceOrderMap[questionId])
      ? choiceOrderMap[questionId].map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];

    if (!storedChoiceOrder.length || !Array.isArray(question.choices)) {
      return question;
    }

    const currentChoices = question.choices.filter((choice) => String(choice.id || '').trim());
    const currentChoiceMap = new Map(currentChoices.map((choice) => [String(choice.id || '').trim(), choice]));
    const orderedChoices = storedChoiceOrder.map((choiceId) => currentChoiceMap.get(choiceId)).filter(Boolean);
    const remainder = currentChoices.filter((choice) => !storedChoiceOrder.includes(String(choice.id || '').trim()));
    return {
      ...question,
      choices: [...orderedChoices, ...remainder],
    };
  });
}

function buildAssemblyItemSnapshot(item, deliveredQuestion, sequenceIndex) {
  const deliveredChoices = Array.isArray(deliveredQuestion && deliveredQuestion.choices)
    ? deliveredQuestion.choices
    : mergeChoiceRationalesIntoChoices(item);

  return {
    id: String(item.id || ''),
    itemId: String(item.id || ''),
    sequenceIndex,
    stem: String(item.stem || ''),
    scenarioText: item.scenarioText ? String(item.scenarioText) : null,
    leadInQuestion: String(item.leadInQuestion || ''),
    itemType: String(item.itemType || 'single_choice'),
    moduleId: String(item.moduleId || ''),
    moduleTitle: String(item.moduleTitle || ''),
    courseGroupId: String(item.courseGroupId || ''),
    courseGroupTitle: String(item.courseGroupTitle || ''),
    parentCaseId: item.parentCaseId ? String(item.parentCaseId) : null,
    points: Number(item.points || 1),
    choices: deliveredChoices,
    correctAnswerKey: normalizeStringArray(item.correctAnswerKey),
    explanation: String(item.explanation || '') || null,
    rationale: String(item.rationale || '') || null,
    tags: normalizeStringArray(item.tags),
    remediationModuleIds: normalizeStringArray(item.remediationModuleIds),
    remediationLessonIds: normalizeStringArray(item.remediationLessonIds),
    remediationTags: normalizeStringArray(item.remediationTags),
    cognitiveLevel: String(item.cognitiveLevel || 'general'),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function loadQuestionDocs(orgId, questionIds, attempt) {
  const docs = await Promise.all(questionIds.map(async (questionId) => {
    const snap = await db.doc(`organizations/${orgId}/questionBank/${questionId}`).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }));
  const found = docs.filter(Boolean);
  if (found.length) {
    return found;
  }

  const legacyQuestions = Array.isArray(attempt.deliveredQuestions)
    ? attempt.deliveredQuestions.map((question) => ({
      id: String(question.id || ''),
      stem: String(question.stem || ''),
      scenarioText: question.scenarioText ? String(question.scenarioText) : null,
      leadInQuestion: String(question.leadInQuestion || ''),
      itemType: String(question.itemType || 'single_choice'),
      moduleTitle: String(question.moduleTitle || ''),
      courseGroupTitle: String(question.courseGroupTitle || ''),
      parentCaseId: question.parentCaseId ? String(question.parentCaseId) : null,
      points: Number(question.points || 1),
      choices: Array.isArray(question.choices) ? question.choices : [],
      correctAnswerKey: normalizeStringArray(question.correctAnswerKey),
      explanation: String(question.explanation || '') || null,
      rationale: String(question.rationale || '') || null,
      tags: normalizeStringArray(question.tags),
      remediationModuleIds: normalizeStringArray(question.remediationModuleIds),
      remediationLessonIds: normalizeStringArray(question.remediationLessonIds),
      remediationTags: normalizeStringArray(question.remediationTags),
      cognitiveLevel: String(question.cognitiveLevel || 'general'),
      moduleId: String(question.moduleId || ''),
      courseGroupId: String(question.courseGroupId || ''),
    }))
    : [];
  return legacyQuestions;
}

function deriveQuestionStatuses(questionIds, answers, flags, visitedQuestionIds, lockedQuestionIds) {
  const visited = new Set(visitedQuestionIds);
  const locked = new Set(lockedQuestionIds);
  const statuses = {};

  for (const questionId of questionIds) {
    const hasAnswer = Array.isArray(answers[questionId]) && answers[questionId].length > 0;
    if (locked.has(questionId)) {
      statuses[questionId] = 'confirmed';
    } else if (flags[questionId] === true) {
      statuses[questionId] = hasAnswer ? 'flagged' : 'flagged_unanswered';
    } else if (hasAnswer) {
      statuses[questionId] = 'answered';
    } else if (visited.has(questionId)) {
      statuses[questionId] = 'visited';
    } else {
      statuses[questionId] = 'unanswered';
    }
  }

  return statuses;
}

async function backfillAttempt(attemptSnap) {
  const orgId = attemptSnap.ref.parent.parent ? attemptSnap.ref.parent.parent.id : ORG_ID;
  if (!orgId) {
    return { attemptId: attemptSnap.id, updated: false, reason: 'missing_org' };
  }

  const attempt = { id: attemptSnap.id, ...attemptSnap.data() };
  const attemptId = attempt.id;
  const assemblyId = String(attempt.assemblyId || '').trim() || attemptId;
  const questionIds = normalizeStringArray(attempt.deliveredQuestionIds);
  if (!questionIds.length) {
    return { attemptId, updated: false, reason: 'no_questions' };
  }

  const responsesSnap = await db.collection(`organizations/${orgId}/attemptSessions/${attemptId}/responses`).get();
  const assemblyRef = db.doc(`organizations/${orgId}/assessmentAssemblies/${assemblyId}`);
  const assemblySnap = await assemblyRef.get();
  const needsAssembly = !assemblySnap.exists || String(attempt.assemblyId || '').trim() !== assemblyId;
  const needsResponses = responsesSnap.empty || responsesSnap.size < questionIds.length;
  if (!needsAssembly && !needsResponses) {
    return { attemptId, updated: false, reason: 'already_backfilled' };
  }

  const assessmentId = String(attempt.assessmentId || '').trim();
  const assessmentSnap = assessmentId
    ? await db.doc(`organizations/${orgId}/assessmentDefinitions/${assessmentId}`).get()
    : null;
  const assessment = assessmentSnap && assessmentSnap.exists ? assessmentSnap.data() || {} : {};
  const questionDocs = await loadQuestionDocs(orgId, questionIds, attempt);
  const deliveredQuestions = Array.isArray(attempt.deliveredQuestions)
    ? attempt.deliveredQuestions
    : applyChoiceOrder(questionDocs.map((item) => sanitizeQuestion(item)), attempt.deliveredChoiceOrderMap || {});

  const answers = (attempt.answerMap && typeof attempt.answerMap === 'object' && !Array.isArray(attempt.answerMap))
    ? Object.fromEntries(Object.entries(attempt.answerMap).map(([key, value]) => [key, normalizeStringArray(value)]))
    : {};
  const flags = normalizeBooleanMap(attempt.flagMap);
  const questionDurations = normalizeNumberMap(attempt.questionDurations);
  const visitedQuestionIds = normalizeStringArray(attempt.visitedQuestionIds);
  const lockedQuestionIds = normalizeStringArray(attempt.lockedQuestionIds);
  const questionStatuses = deriveQuestionStatuses(questionIds, answers, flags, visitedQuestionIds, lockedQuestionIds);
  const batch = db.batch();

  if (needsAssembly) {
    batch.set(assemblyRef, {
      id: assemblyId,
      organizationId: orgId,
      learnerId: String(attempt.learnerId || ''),
      assessmentId,
      assessmentTitle: String(attempt.assessmentTitle || assessment.title || 'Exam Prep Assessment'),
      assessmentMode: String(attempt.assessmentMode || assessment.assessmentMode || 'exam'),
      publicProgramId: String(attempt.publicProgramId || '').trim() || null,
      programId: String(attempt.programId || assessment.programId || ''),
      jurisdiction: String(attempt.jurisdiction || assessment.jurisdiction || ''),
      examTrack: String(attempt.examTrack || assessment.examTrack || ''),
      itemOrder: questionIds,
      itemCount: questionIds.length,
      reviewMode: String(assessment.reviewMode || 'summary_only'),
      sourceMode: String(assessment.sourceMode || 'fixed_static'),
      blueprintId: String(assessment.blueprintId || '').trim() || null,
      createdAt: attempt.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: String(attempt.createdBy || attempt.learnerId || 'backfill-script'),
      updatedBy: 'backfill-script',
    }, { merge: true });

    questionDocs.forEach((item, index) => {
      const deliveredQuestion = deliveredQuestions.find((entry) => String(entry.id || '') === String(item.id || '')) || null;
      batch.set(
        db.doc(`organizations/${orgId}/assessmentAssemblies/${assemblyId}/items/${item.id}`),
        buildAssemblyItemSnapshot(item, deliveredQuestion, index),
        { merge: true }
      );
    });

    batch.set(attemptSnap.ref, {
      assemblyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'backfill-script',
    }, { merge: true });
  }

  if (needsResponses) {
    for (const questionId of questionIds) {
      batch.set(
        db.doc(`organizations/${orgId}/attemptSessions/${attemptId}/responses/${questionId}`),
        {
          id: questionId,
          attemptId,
          assessmentId,
          assemblyId,
          learnerId: String(attempt.learnerId || ''),
          itemId: questionId,
          selectedAnswerKeys: normalizeStringArray(answers[questionId]),
          flagged: flags[questionId] === true,
          visited: visitedQuestionIds.includes(questionId),
          locked: lockedQuestionIds.includes(questionId),
          questionStatus: String(questionStatuses[questionId] || 'unanswered'),
          responseTimeSeconds: Math.max(0, Number(questionDurations[questionId] || 0)),
          createdAt: attempt.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: String(attempt.createdBy || attempt.learnerId || 'backfill-script'),
          updatedBy: 'backfill-script',
        },
        { merge: true }
      );
    }
  }

  if (APPLY) {
    await batch.commit();
  }

  return {
    orgId,
    attemptId,
    updated: true,
    reason: `${needsAssembly ? 'assembly' : ''}${needsAssembly && needsResponses ? '+' : ''}${needsResponses ? 'responses' : ''}`,
  };
}

async function listAttempts(orgId) {
  if (ATTEMPT_ID) {
    const snap = await db.doc(`organizations/${orgId}/attemptSessions/${ATTEMPT_ID}`).get();
    return snap.exists ? [snap] : [];
  }

  let ref = db.collection(`organizations/${orgId}/attemptSessions`);
  if (LIMIT > 0) {
    ref = ref.limit(LIMIT);
  }
  const snap = await ref.get();
  return snap.docs;
}

async function listOrganizationIds() {
  if (ORG_ID) {
    return [ORG_ID];
  }

  const organizationsSnap = await db.collection('organizations').get();
  return organizationsSnap.docs.map((docSnap) => docSnap.id).filter(Boolean);
}

(async () => {
  console.log(`[exam-prep-runtime-backfill] mode=${APPLY ? 'APPLY' : 'DRY_RUN'} org=${ORG_ID || 'ALL'} project=${PROJECT_ID || 'default'}`);
  const organizationIds = await listOrganizationIds();
  if (!organizationIds.length) {
    console.log('[exam-prep-runtime-backfill] no organizations found');
    return;
  }

  let scanned = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const orgId of organizationIds) {
    const attemptSnaps = await listAttempts(orgId);
    if (!attemptSnaps.length) {
      console.log('[exam-prep-runtime-backfill] no matching attempts found', { orgId });
      continue;
    }

    for (const attemptSnap of attemptSnaps) {
      scanned += 1;
      const result = await backfillAttempt(attemptSnap);
      if (result.updated) {
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
      console.log('[exam-prep-runtime-backfill]', result);
    }
  }

  console.log('[exam-prep-runtime-backfill] summary', {
    scanned,
    updatedCount,
    skippedCount,
    organizations: organizationIds.length,
    filteredAttempt: ATTEMPT_ID || null,
    limit: LIMIT || null,
  });
})().catch((error) => {
  const message = String(error && error.message ? error.message : error || '').toLowerCase();
  if (
    message.includes('default credentials') ||
    message.includes('application default') ||
    message.includes('project id')
  ) {
    printCredentialsHelp();
  }

  throw error;
});