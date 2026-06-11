/**
 * Static Rules Verification — Innovacare Lab Engine
 * ==================================================
 * Verifies storage.rules and firestore.rules without requiring an emulator.
 * Uses direct text/line searches rather than fragile regex block extraction.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const storageRaw   = readFileSync(resolve(ROOT, 'storage.rules'), 'utf8');
const firestoreRaw = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');

// Normalise line endings for consistent processing
const storage   = storageRaw.replace(/\r\n/g, '\n');
const firestore = firestoreRaw.replace(/\r\n/g, '\n');

// Non-comment code lines for token-presence checks
const storageCodeLines  = storage.split('\n').filter(l => !l.trimStart().startsWith('//'));
const storageCode       = storageCodeLines.join('\n');

let passed = 0; let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch(e) {
    console.error('  FAIL  ' + name);
    console.error('         ' + e.message);
    failures.push({ name, error: e.message });
    failed++;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a function body using brace-depth counting. */
function extractFunctionBody(source, funcName) {
  const marker  = 'function ' + funcName + '(';
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) return null;
  const openBrace = source.indexOf('{', startIdx);
  if (openBrace === -1) return null;
  let depth = 0, i = openBrace;
  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(startIdx, i + 1); }
    i++;
  }
  return null;
}

/** Find the LAST occurrence of a line containing the given fragment and return its line index. */
function findLineContaining(lines, fragment) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(fragment)) return i;
  }
  return -1;
}

/** Find ALL line numbers (0-based) that contain fragment. */
function findAllLinesContaining(lines, fragment) {
  return lines.reduce((acc, l, i) => { if (l.includes(fragment)) acc.push(i); return acc; }, []);
}

/** Check that at least one line containing pathFragment has allowExpr nearby (within lineWindow). */
function blockContains(lines, pathFragment, allowExpr, lineWindow = 10) {
  const indices = findAllLinesContaining(lines, pathFragment);
  for (const idx of indices) {
    const window = lines.slice(idx, idx + lineWindow).join('\n');
    if (window.includes(allowExpr)) return true;
  }
  return false;
}

const storageLines   = storage.split('\n');
const firestoreLines = firestore.split('\n');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Innovacare Lab Engine — Static Rules Verification           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ════════════════════════════════════════════════════════════════
// STORAGE.RULES
// ════════════════════════════════════════════════════════════════
console.log('── storage.rules ───────────────────────────────────────────────\n');

check('[S-01] No request.auth.token in non-comment code', () => {
  const offending = storageCodeLines.find(l => l.includes('auth.token'));
  if (offending) throw new Error('Found in code: ' + offending.trim());
});

check('[S-02] labTokenRole() function removed', () => {
  if (storage.includes('function labTokenRole')) throw new Error('labTokenRole() still defined');
});

check('[S-03] No "true ||" short-circuit in non-comment code', () => {
  const offending = storageCodeLines.find(l => /\btrue\s*\|\|/.test(l));
  if (offending) throw new Error('Found: ' + offending.trim());
});

check('[S-04] isLabAdmin() calls userRole() (Firestore cross-read)', () => {
  const fn = extractFunctionBody(storage, 'isLabAdmin');
  if (!fn) throw new Error('isLabAdmin() not found');
  if (!fn.includes('userRole()')) throw new Error('isLabAdmin() does not call userRole()');
  if (fn.includes('labTokenRole') || fn.includes('auth.token')) throw new Error('isLabAdmin() references token claims');
});

check('[S-05] isLabInstructorOrAdmin() calls userRole() (Firestore cross-read)', () => {
  const fn = extractFunctionBody(storage, 'isLabInstructorOrAdmin');
  if (!fn) throw new Error('isLabInstructorOrAdmin() not found');
  if (!fn.includes('userRole()')) throw new Error('isLabInstructorOrAdmin() does not call userRole()');
  if (fn.includes('labTokenRole') || fn.includes('auth.token')) throw new Error('token claims in isLabInstructorOrAdmin()');
});

check('[S-06] firestore.get paths: (default) literal present, $(request.auth.uid) escaping correct', () => {
  // Directly verify the specific lines we know contain firestore.get/exists
  const getCalls = storageCodeLines.filter(l => l.includes('firestore.get') || l.includes('firestore.exists'));
  if (getCalls.length === 0) throw new Error('No firestore.get/exists calls found');
  for (const line of getCalls) {
    if (!line.includes('/databases/(default)/documents')) {
      throw new Error('Missing (default) in: ' + line.trim());
    }
    if (!line.includes('$(request.auth.uid)')) {
      throw new Error('Expected $(request.auth.uid) in: ' + line.trim());
    }
  }
});

check('[S-07] isLabInstructorOrAdmin() includes instructor, tutor, staff', () => {
  const fn = extractFunctionBody(storage, 'isLabInstructorOrAdmin');
  if (!fn) throw new Error('isLabInstructorOrAdmin() not found');
  for (const role of ['instructor', 'tutor', 'staff']) {
    if (!fn.includes("'" + role + "'")) throw new Error("Missing role '" + role + "'");
  }
});

check('[S-08] Solution file allow read uses isLabInstructorOrAdmin() (line-based check)', () => {
  // Find the solution match block by locating the match line, then checking the next 5 lines
  const solutionMatchIdx = storageLines.findIndex(l => l.includes('/labs/definitions/{labId}/solution/'));
  if (solutionMatchIdx === -1) throw new Error('Solution match line not found');
  const nextLines = storageLines.slice(solutionMatchIdx, solutionMatchIdx + 8).join('\n');
  if (!nextLines.includes('isLabInstructorOrAdmin()')) {
    throw new Error('Solution read rule does not use isLabInstructorOrAdmin()');
  }
  // Confirm the allow read line specifically
  const readLine = storageLines.slice(solutionMatchIdx, solutionMatchIdx + 8)
    .find(l => /allow\s+read/.test(l));
  if (!readLine) throw new Error('No allow read line found in solution block');
  if (!readLine.includes('isLabInstructorOrAdmin()')) {
    throw new Error('allow read does not call isLabInstructorOrAdmin(): ' + readLine.trim());
  }
});

check('[S-09] Workspace block: signedIn() present, no true|| short-circuit', () => {
  const wsMatchIdx = storageLines.findIndex(l => l.includes('/labs/sessions/{sessionId}/workspace/'));
  if (wsMatchIdx === -1) throw new Error('Workspace match line not found');
  const nextLines = storageLines.slice(wsMatchIdx, wsMatchIdx + 10).join('\n');
  if (!nextLines.includes('signedIn()')) throw new Error('signedIn() missing from workspace block');
  if (/\btrue\s*\|\|/.test(nextLines)) throw new Error('"true ||" short-circuit in workspace block');
});

// ════════════════════════════════════════════════════════════════
// FIRESTORE.RULES
// ════════════════════════════════════════════════════════════════
console.log('\n── firestore.rules ─────────────────────────────────────────────\n');

check('[S-10] Firestore isLabInstructorOrAdmin() covers instructor/tutor/staff', () => {
  const fn = extractFunctionBody(firestore, 'isLabInstructorOrAdmin');
  if (!fn) throw new Error('isLabInstructorOrAdmin() not found');
  for (const role of ['instructor', 'tutor', 'staff']) {
    if (!fn.includes("'" + role + "'")) throw new Error("Missing role '" + role + "'");
  }
});

check('[S-11] Firestore workspaceFiles write enforces session userId == auth.uid', () => {
  if (!firestore.includes('data.userId == request.auth.uid')) {
    throw new Error('Session owner check missing');
  }
});

check('[S-12] Firestore labDefinitions write requires isAdmin()', () => {
  if (!firestore.includes('allow create, update, delete: if isAdmin();')) {
    throw new Error('labDefinitions write rule does not call isAdmin()');
  }
});

check('[S-13] Firestore workspaceFiles contentPreview capped at ≤ 500 chars', () => {
  if (!firestore.includes('contentPreview.size() <= 500')) {
    throw new Error('contentPreview size cap missing');
  }
});

check('[S-14] Firestore labSubmissions update: sessionId is immutable', () => {
  if (!firestore.includes('request.resource.data.sessionId == resource.data.sessionId')) {
    throw new Error('sessionId immutability check missing');
  }
});

check('[S-15] Firestore labSessions update: userId and labId immutable', () => {
  if (!firestore.includes('request.resource.data.userId == resource.data.userId')) {
    throw new Error('userId immutability check missing from labSessions');
  }
  if (!firestore.includes('request.resource.data.labId  == resource.data.labId')) {
    throw new Error('labId immutability check missing from labSessions (check spacing)');
  }
});

check('[S-16] Firestore labCoachLogs create enforces userId == auth.uid', () => {
  // labCoachLogs create check — lines after the match
  const coachIdx = firestoreLines.findIndex(l => l.includes('/labCoachLogs/{logId}'));
  if (coachIdx === -1) throw new Error('labCoachLogs match line not found');
  const blockText = firestoreLines.slice(coachIdx, coachIdx + 10).join('\n');
  if (!blockText.includes('request.resource.data.userId == request.auth.uid')) {
    throw new Error('labCoachLogs create does not enforce userId == auth.uid');
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n───────────────────────────────────────────────────────────────');
console.log('Results: ' + passed + ' passed / ' + failed + ' failed out of ' + (passed + failed) + ' checks');
if (failures.length > 0) {
  console.log('\nFailed checks:');
  failures.forEach(f => {
    console.log('  ✗ ' + f.name);
    console.log('    ' + f.error);
  });
} else {
  console.log('\n  All static checks passed. ✅');
}
console.log('───────────────────────────────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);
