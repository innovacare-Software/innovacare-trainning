/* eslint-disable no-console */
const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');
const USER_ARG = readArgValue('--user');
const PROGRAM_ARG = readArgValue('--program');
const PROJECT_ARG = readArgValue('--project') || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
const LIMIT_ARG = Number(readArgValue('--limit') || 0);

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ARG ? {projectId: PROJECT_ARG} : undefined);
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

const contentTotalsCache = new Map();

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

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function countDistinct(values) {
  return new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)).size;
}

function toEpoch(value) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    if ('seconds' in value) {
      const seconds = Number(value.seconds);
      return Number.isFinite(seconds) ? seconds * 1000 : 0;
    }
  }

  return 0;
}

function toDayNumber(value) {
  const epoch = toEpoch(value);
  if (!epoch) {
    return 0;
  }

  const date = new Date(epoch);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
}

function computeCurrentStreakDays(values) {
  const days = [...new Set(values.map((value) => toDayNumber(value)).filter((value) => value > 0))]
    .sort((a, b) => b - a);

  if (!days.length) {
    return 0;
  }

  const today = toDayNumber(new Date());
  if (today - days[0] > 1) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function computeReadinessScore(averageScore, progressPct, simulationScores, streakDays) {
  const simulationAvg = simulationScores.length
    ? simulationScores.reduce((sum, score) => sum + Number(score || 0), 0) / simulationScores.length
    : 0;

  const weighted = averageScore * 0.4 + progressPct * 0.3 + simulationAvg * 0.2 + streakDays * 2;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function sanitizeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickProgramId(row, fallbackId = '') {
  return String(row.programId || fallbackId || '').trim();
}

function samePayload(existing, next) {
  const comparableKeys = [
    'userId',
    'programId',
    'enrollmentId',
    'progressPct',
    'completedLessons',
    'totalLessons',
    'completedModules',
    'totalModules',
    'completedSimulations',
    'totalSimulations',
    'completedCaseStudies',
    'totalCaseStudies',
    'completedAssessments',
    'totalAssessments',
    'averageScore',
    'readinessScore',
    'streakDays',
    'totalStudyMinutes',
    'status',
  ];

  return comparableKeys.every((key) => {
    const left = existing ? existing[key] : undefined;
    const right = next[key];
    return JSON.stringify(left) === JSON.stringify(right);
  });
}

async function getProgramContentTotals(programId) {
  if (contentTotalsCache.has(programId)) {
    return contentTotalsCache.get(programId);
  }

  const [lessonsSnap, modulesSnap, simulationsSnap, assessmentsSnap, caseStudiesSnap] = await Promise.all([
    db.collection(`programs/${programId}/lessons`).where('active', '==', true).get(),
    db.collection(`programs/${programId}/modules`).where('active', '==', true).get(),
    db.collection(`programs/${programId}/simulations`).where('active', '==', true).get(),
    db.collection(`programs/${programId}/assessments`).where('active', '==', true).get(),
    db.collection(`programs/${programId}/caseStudies`).where('active', '==', true).get(),
  ]);

  const totals = {
    totalLessons: lessonsSnap.size,
    totalModules: modulesSnap.size,
    totalSimulations: simulationsSnap.size,
    totalAssessments: assessmentsSnap.size,
    totalCaseStudies: caseStudiesSnap.size,
  };

  contentTotalsCache.set(programId, totals);
  return totals;
}

async function getUserDocs(uid, subcollection) {
  const snap = await db.collection(`users/${uid}/${subcollection}`).get();
  return snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
}

async function listTargetUsers() {
  if (USER_ARG) {
    const snap = await db.doc(`users/${USER_ARG}`).get();
    return snap.exists ? [{id: snap.id, ...snap.data()}] : [];
  }

  let query = db.collection('users');
  if (LIMIT_ARG > 0) {
    query = query.limit(LIMIT_ARG);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
}

function buildPayload(uid, programId, existing, inputs) {
  const completedLessons = inputs.lessonProgress.filter((row) => row.completed).length;
  const totalLessons = Math.max(sanitizeNumber(existing?.totalLessons), inputs.contentTotals.totalLessons);
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const completedModules = inputs.moduleProgress.filter((row) => {
    const pct = sanitizeNumber(row.progressPct);
    return pct >= 100 || row.status === STATUS.COMPLETED;
  }).length;

  const completedSimulations = countDistinct(inputs.simulationAttempts.map((row) => String(row.simulationId || '').trim()));
  const completedCaseStudies = countDistinct(inputs.caseStudyAttempts.map((row) => String(row.caseStudyId || '').trim()));
  const completedAssessments = countDistinct(inputs.assessmentAttempts.map((row) => String(row.assessmentId || '').trim()));

  const averageScore = inputs.assessmentAttempts.length
    ? Math.round(
      inputs.assessmentAttempts.reduce((sum, row) => sum + sanitizeNumber(row.score), 0) /
      inputs.assessmentAttempts.length
    )
    : 0;

  const totalStudyMinutes =
    inputs.simulationAttempts.reduce((sum, row) => sum + sanitizeNumber(row.timeSpentMin), 0) +
    inputs.assessmentAttempts.reduce((sum, row) => sum + sanitizeNumber(row.timeSpentMin), 0);

  const streakDays = computeCurrentStreakDays([
    ...inputs.lessonProgress.map((row) => row.completedAt || row.lastOpenedAt),
    ...inputs.simulationAttempts.map((row) => row.completedAt),
    ...inputs.assessmentAttempts.map((row) => row.completedAt),
    ...inputs.caseStudyAttempts.map((row) => row.completedAt),
  ]);

  const readinessScore = computeReadinessScore(
    averageScore,
    progressPct,
    inputs.simulationAttempts.map((row) => sanitizeNumber(row.score)),
    streakDays
  );

  const latestActivityEpoch = Math.max(
    0,
    ...inputs.lessonProgress.map((row) => toEpoch(row.completedAt || row.lastOpenedAt)),
    ...inputs.simulationAttempts.map((row) => toEpoch(row.completedAt)),
    ...inputs.assessmentAttempts.map((row) => toEpoch(row.completedAt)),
    ...inputs.caseStudyAttempts.map((row) => toEpoch(row.completedAt))
  );

  const status = progressPct >= 100
    ? STATUS.COMPLETED
    : completedLessons > 0
      ? STATUS.IN_PROGRESS
      : STATUS.NOT_STARTED;

  return {
    userId: uid,
    programId,
    enrollmentId: String(existing?.enrollmentId || ''),
    progressPct,
    completedLessons,
    totalLessons,
    completedModules,
    totalModules: inputs.contentTotals.totalModules,
    completedSimulations,
    totalSimulations: inputs.contentTotals.totalSimulations,
    completedCaseStudies,
    totalCaseStudies: inputs.contentTotals.totalCaseStudies,
    completedAssessments,
    totalAssessments: inputs.contentTotals.totalAssessments,
    averageScore,
    readinessScore,
    streakDays,
    totalStudyMinutes,
    status,
    lastActivityAt: latestActivityEpoch ? admin.firestore.Timestamp.fromMillis(latestActivityEpoch) : existing?.lastActivityAt || null,
    updatedAt: now,
  };
}

async function processUser(user) {
  const uid = user.id;
  const [programProgressDocs, lessonProgress, moduleProgress, simulationAttempts, assessmentAttempts, caseStudyAttempts] = await Promise.all([
    getUserDocs(uid, 'programProgress'),
    getUserDocs(uid, 'lessonProgress'),
    getUserDocs(uid, 'moduleProgress'),
    getUserDocs(uid, 'simulationAttempts'),
    getUserDocs(uid, 'assessmentAttempts'),
    getUserDocs(uid, 'caseStudyAttempts'),
  ]);

  const programIds = new Set();
  for (const row of programProgressDocs) programIds.add(pickProgramId(row, row.id));
  for (const row of lessonProgress) programIds.add(pickProgramId(row));
  for (const row of moduleProgress) programIds.add(pickProgramId(row));
  for (const row of simulationAttempts) programIds.add(pickProgramId(row));
  for (const row of assessmentAttempts) programIds.add(pickProgramId(row));
  for (const row of caseStudyAttempts) programIds.add(pickProgramId(row));

  const targetProgramIds = [...programIds]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => !PROGRAM_ARG || value === PROGRAM_ARG);

  let scanned = 0;
  let changed = 0;

  for (const programId of targetProgramIds) {
    scanned += 1;
    const existing = programProgressDocs.find((row) => pickProgramId(row, row.id) === programId);
    const contentTotals = await getProgramContentTotals(programId);

    const payload = buildPayload(uid, programId, existing, {
      lessonProgress: lessonProgress.filter((row) => pickProgramId(row) === programId),
      moduleProgress: moduleProgress.filter((row) => pickProgramId(row) === programId),
      simulationAttempts: simulationAttempts.filter((row) => pickProgramId(row) === programId),
      assessmentAttempts: assessmentAttempts.filter((row) => pickProgramId(row) === programId),
      caseStudyAttempts: caseStudyAttempts.filter((row) => pickProgramId(row) === programId),
      contentTotals,
    });

    if (!samePayload(existing, payload)) {
      changed += 1;
      console.log('[program-progress-backfill] diff', {
        userId: uid,
        programId,
        progressPct: payload.progressPct,
        readinessScore: payload.readinessScore,
        averageScore: payload.averageScore,
        completedLessons: payload.completedLessons,
        completedModules: payload.completedModules,
        completedSimulations: payload.completedSimulations,
        completedCaseStudies: payload.completedCaseStudies,
        totalStudyMinutes: payload.totalStudyMinutes,
        streakDays: payload.streakDays,
      });

      if (APPLY) {
        await db.doc(`users/${uid}/programProgress/${programId}`).set(payload, {merge: true});
      }
    }
  }

  return {scanned, changed};
}

(async () => {
  console.log(`\n[program-progress-backfill] mode=${APPLY ? 'APPLY' : 'DRY_RUN'} project=${PROJECT_ARG || 'unknown'}\n`);

  const users = await listTargetUsers();
  if (!users.length) {
    console.log('[program-progress-backfill] no matching users found');
    return;
  }

  let scannedUsers = 0;
  let scannedPrograms = 0;
  let changedPrograms = 0;

  for (const batch of chunk(users, 10)) {
    const results = await Promise.all(batch.map((user) => processUser(user)));
    scannedUsers += batch.length;
    scannedPrograms += results.reduce((sum, row) => sum + row.scanned, 0);
    changedPrograms += results.reduce((sum, row) => sum + row.changed, 0);
  }

  console.log('\n[program-progress-backfill] summary', {
    scannedUsers,
    scannedPrograms,
    changedPrograms,
    filteredUser: USER_ARG || null,
    filteredProgram: PROGRAM_ARG || null,
    limit: LIMIT_ARG || null,
  });

  if (!APPLY) {
    console.log('\n[program-progress-backfill] DRY_RUN complete. Re-run with --apply to write data.');
  } else {
    console.log('\n[program-progress-backfill] APPLY complete.');
  }
})().catch((err) => {
  console.error('[program-progress-backfill] failed', err);
  process.exit(1);
});