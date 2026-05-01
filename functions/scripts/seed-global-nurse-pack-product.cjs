/* eslint-disable no-console */
/**
 * Seed or update products/global-nurse-pack from the canonical JSON payload.
 *
 * Usage:
 *   node functions/scripts/seed-global-nurse-pack-product.cjs [--apply] [--project=innovacare-stripe]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');
const PROJECT_ARG = readArgValue('--project')
  || process.env.FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT;
const SERVICE_ACCOUNT_ARG = readArgValue('--serviceAccount')
  || process.env.GOOGLE_APPLICATION_CREDENTIALS;

function readArgValue(flag) {
  const exact = process.argv.find((value) => value.startsWith(`${flag}=`));
  if (exact) return exact.slice(flag.length + 1).trim();
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

function resolveServiceAccountPath() {
  const candidates = [
    SERVICE_ACCOUNT_ARG,
    path.resolve(__dirname, '../../innovacare-stripe-5be91e550a75.json'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

if (!admin.apps.length) {
  const serviceAccountPath = resolveServiceAccountPath();
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(PROJECT_ARG ? {projectId: PROJECT_ARG} : {}),
    });
  } else {
    admin.initializeApp(PROJECT_ARG ? {projectId: PROJECT_ARG} : undefined);
  }
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

function loadPayload() {
  const filePath = path.resolve(__dirname, '../../docs/commerce/global-nurse-pack.firestore.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    ...raw,
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const payload = loadPayload();
  const ref = db.collection('products').doc(String(payload.id || 'global-nurse-pack'));
  const snap = await ref.get();

  console.log('\n── Seed Global Nurse Pack Product ─────────────────────');
  console.log(`   Mode    : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`   Project : ${PROJECT_ARG || '(default from ADC / emulator)'}`);
  console.log(`   Target  : products/${payload.id}`);
  console.log(`   Exists  : ${snap.exists}`);
  console.log(`   Active  : ${payload.active}`);
  console.log(`   Price   : ${payload.stripePriceId}`);
  console.log('───────────────────────────────────────────────────────\n');

  if (!APPLY) {
    console.log(JSON.stringify(payload, null, 2));
    console.log('\nDry-run complete. Re-run with --apply to write Firestore.\n');
    return;
  }

  await ref.set(payload, {merge: true});
  const written = await ref.get();
  const data = written.data() || {};
  console.log('Wrote products/global-nurse-pack with:');
  console.log(JSON.stringify({
    id: data.id,
    active: data.active,
    stripeProductId: data.stripeProductId,
    stripePriceId: data.stripePriceId,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
  }, null, 2));
  console.log('\nSeed complete.\n');
}

main().catch((error) => {
  console.error('seed-global-nurse-pack-product error:', error);
  process.exit(1);
});