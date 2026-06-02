import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { seedCommunicationCenterMockData } from './communication-center-mock-data.mjs';

const projectId = process.env.GCLOUD_PROJECT || 'innovacare-communication-mocks';
const host = process.env.FIRESTORE_EMULATOR_HOST;

if (!host) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required to seed communication mocks.');
}

const [hostname, portText] = host.split(':');
const app = initializeApp({ projectId });
const db = getFirestore(app);
connectFirestoreEmulator(db, hostname, Number(portText));

await seedCommunicationCenterMockData(db);
console.log('communication center emulator mocks seeded');