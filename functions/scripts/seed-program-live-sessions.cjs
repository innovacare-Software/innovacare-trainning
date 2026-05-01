/* eslint-disable no-console */
const admin = require('firebase-admin');

const PROGRAM_ID = readArgValue('--program');
const MODULE_ID = readArgValue('--module');
const PROJECT_ID =
  readArgValue('--project') ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  undefined;

if (!PROGRAM_ID) {
  console.error('Missing required --program=<programId> argument.');
  process.exit(1);
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

function futureTimestamp(daysAhead, hourUtc, minuteUtc = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return admin.firestore.Timestamp.fromDate(date);
}

function buildSessionFixtures(programId, moduleId) {
  const base = {
    programId,
    moduleId: moduleId || '',
    timezone: 'America/New_York',
    required: false,
    capacity: 25,
    active: true,
    status: 'PUBLISHED',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return [
    {
      id: 'seed-included-live-session',
      payload: {
        ...base,
        title: 'Included Educator Review Session',
        description: 'Included live educator session for enrolled learners with guided review and Q&A.',
        sessionType: 'LIVE_CLASS',
        startAt: futureTimestamp(3, 18),
        endAt: futureTimestamp(3, 19, 30),
        meetingUrl: 'https://example.com/live/included-review',
        instructorName: 'Dr. Amanda Lewis',
        accessMode: 'included',
        bookingRequired: true,
        price: 0,
        currency: 'USD',
      },
    },
    {
      id: 'seed-free-live-session',
      payload: {
        ...base,
        title: 'Free 0$ Community Coaching Session',
        description: 'Free live coaching touchpoint integrated into the app for active learners.',
        sessionType: 'GROUP_QA',
        startAt: futureTimestamp(5, 17),
        endAt: futureTimestamp(5, 18),
        meetingUrl: 'https://example.com/live/free-coaching',
        instructorName: 'Coach Brianna Hall',
        accessMode: 'free',
        bookingRequired: true,
        price: 0,
        currency: 'USD',
      },
    },
    {
      id: 'seed-paid-live-session',
      payload: {
        ...base,
        title: 'Premium Paid Intensive Live Session',
        description: 'Paid premium educator-led intensive session with deep exam strategy and live case breakdowns.',
        sessionType: 'COACHING',
        startAt: futureTimestamp(7, 20),
        endAt: futureTimestamp(7, 21, 30),
        meetingUrl: 'https://example.com/live/premium-intensive',
        instructorName: 'Prof. Michael Stone',
        accessMode: 'paid',
        bookingRequired: true,
        price: 49,
        currency: 'USD',
      },
    },
  ];
}

async function main() {
  const fixtures = buildSessionFixtures(PROGRAM_ID, MODULE_ID);
  const batch = db.batch();

  for (const fixture of fixtures) {
    const ref = db.doc(`programs/${PROGRAM_ID}/liveSessions/${fixture.id}`);
    batch.set(ref, fixture.payload, { merge: true });
  }

  await batch.commit();

  console.log('Seeded program live sessions successfully.', {
    projectId: PROJECT_ID || 'default',
    programId: PROGRAM_ID,
    moduleId: MODULE_ID || null,
    sessionIds: fixtures.map((fixture) => fixture.id),
  });
}

main().catch((error) => {
  console.error('Failed to seed program live sessions.', error);
  process.exit(1);
});