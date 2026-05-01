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
const ITEM_COUNT = Math.max(100, Number(readArgValue('--count') || 1000));
const CASE_STUDY_COUNT = Math.max(25, Number(readArgValue('--case-count') || Math.floor(ITEM_COUNT / 8)));
const ID_PREFIX = slugify(readArgValue('--id-prefix') || '');
const COURSE_GROUP_FILTER = splitCommaSeparated(readArgValue('--course-groups'));
const PROGRAM_FILTER = splitCommaSeparated(readArgValue('--programs'));
const WAVE_LABEL = String(readArgValue('--wave') || '').trim();
const APPLY = process.argv.includes('--apply');
const ACTOR = String(readArgValue('--actor') || 'exam-prep-seed-script').trim();
const BATCH_LIMIT = 350;

if (CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
}

if (!admin.apps.length) {
  admin.initializeApp(PROJECT_ID ? {projectId: PROJECT_ID} : undefined);
}

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

const PROGRAMS = [
  {id: 'nclex-rn-prep', title: 'NCLEX-RN Prep', jurisdiction: 'US', examTrack: 'NCLEX-RN'},
  {id: 'nclex-pn-prep', title: 'NCLEX-PN Prep', jurisdiction: 'US', examTrack: 'NCLEX-PN'},
  {id: 'uae-nursing-licensure-prep', title: 'UAE Nursing Licensure Prep', jurisdiction: 'UAE-DHA', examTrack: 'DHA'},
];

const COURSE_GROUPS = [
  {
    id: 'exam-strategy-ngn',
    title: 'Exam Strategy and NGN',
    modules: [
      {id: 'all-about-ngn', title: 'All About NGN'},
      {id: 'test-strategies', title: 'Test Strategies'},
      {id: 'prioritization', title: 'Prioritization'},
      {id: 'delegation', title: 'Delegation'},
    ],
    scenarios: [
      {condition: 'worsening respiratory distress', setting: 'step-down unit', concern: 'increased work of breathing', action: 'prioritize airway and oxygen support', monitor: 'oxygen saturation trend'},
      {condition: 'unexpected neurologic change', setting: 'medical unit', concern: 'new confusion and headache', action: 'escalate assessment findings promptly', monitor: 'mental status trend'},
      {condition: 'postoperative instability', setting: 'surgical floor', concern: 'tachycardia with pallor', action: 'assess perfusion and call for support', monitor: 'blood pressure response'},
    ],
  },
  {
    id: 'leadership-communication-ethics',
    title: 'Leadership, Communication, Ethics',
    modules: [
      {id: 'therapeutic-communication', title: 'Therapeutic Communication'},
      {id: 'legal-and-ethical-concepts', title: 'Legal and Ethical Concepts'},
      {id: 'management-of-care', title: 'Management of Care'},
      {id: 'medical-terminology', title: 'Medical Terminology'},
    ],
    scenarios: [
      {condition: 'family conflict during discharge', setting: 'medical-surgical unit', concern: 'misaligned goals of care', action: 'use therapeutic communication and clarify priorities', monitor: 'shared understanding of plan'},
      {condition: 'delegation conflict at shift change', setting: 'busy inpatient unit', concern: 'unclear task ownership', action: 'delegate stable tasks appropriately', monitor: 'timely task completion'},
      {condition: 'ethical concern about informed consent', setting: 'preoperative area', concern: 'client questions the procedure', action: 'pause workflow and notify the provider', monitor: 'client understanding'},
    ],
  },
  {
    id: 'fundamentals-safety-basic-nursing',
    title: 'Fundamentals, Safety and Basic Nursing',
    modules: [
      {id: 'safety-and-infection', title: 'Safety and Infection'},
      {id: 'basic-care-and-comfort', title: 'Basic Care and Comfort'},
      {id: 'health-promotion', title: 'Health Promotion'},
      {id: 'lab-values', title: 'Lab Values'},
    ],
    scenarios: [
      {condition: 'fall-risk reassessment need', setting: 'rehabilitation unit', concern: 'unsteady gait after medication', action: 'apply immediate fall precautions', monitor: 'safe ambulation'},
      {condition: 'suspected infection spread risk', setting: 'long-term care room', concern: 'new fever and drainage', action: 'implement isolation and specimen steps', monitor: 'temperature and culture results'},
      {condition: 'fluid deficit concern', setting: 'observation unit', concern: 'dry mucous membranes and dizziness', action: 'prioritize hydration assessment', monitor: 'orthostatic symptoms'},
    ],
  },
  {
    id: 'pharmacology',
    title: 'Pharmacology',
    modules: [
      {id: 'general-pharmacology', title: 'General Pharmacology'},
    ],
    scenarios: [
      {condition: 'high-risk anticoagulant therapy', setting: 'postoperative room', concern: 'new bleeding signs', action: 'hold the medication and escalate', monitor: 'active bleeding status'},
      {condition: 'insulin administration timing issue', setting: 'medical floor', concern: 'meal tray delay', action: 'synchronize insulin with carbohydrate intake', monitor: 'glucose response'},
      {condition: 'opioid oversedation risk', setting: 'post-anesthesia recovery', concern: 'decreased respiratory rate', action: 'assess sedation and airway immediately', monitor: 'respiratory status'},
    ],
  },
  {
    id: 'adult-health-med-surg',
    title: 'Adult Health / Med-Surg',
    modules: [
      {id: 'cardiovascular', title: 'Cardiovascular'},
      {id: 'respiratory', title: 'Respiratory'},
      {id: 'gastrointestinal', title: 'Gastrointestinal'},
      {id: 'renal', title: 'Renal'},
      {id: 'neurologic', title: 'Neurologic'},
      {id: 'shock-and-critical-care', title: 'Shock and Critical Care'},
    ],
    scenarios: [
      {condition: 'acute heart failure exacerbation', setting: 'telemetry unit', concern: 'crackles with edema', action: 'reduce cardiopulmonary workload promptly', monitor: 'breath sounds and urine output'},
      {condition: 'COPD deterioration', setting: 'respiratory ward', concern: 'restlessness and hypoxemia', action: 'optimize oxygen delivery safely', monitor: 'work of breathing'},
      {condition: 'upper GI bleeding concern', setting: 'emergency observation', concern: 'coffee-ground emesis and dizziness', action: 'stabilize perfusion and notify provider', monitor: 'hemodynamic trend'},
      {condition: 'acute kidney injury progression', setting: 'medical unit', concern: 'reduced urine output', action: 'review nephrotoxic exposures and fluids', monitor: 'urine output'},
    ],
  },
  {
    id: 'maternal-newborn-reproductive',
    title: 'Maternal-Newborn / Reproductive',
    modules: [
      {id: 'maternity', title: 'Maternity'},
      {id: 'labor-and-delivery', title: 'Labor and Delivery'},
      {id: 'fetal-heart-rate', title: 'Fetal Heart Rate'},
      {id: 'reproductive-system', title: 'Reproductive System'},
    ],
    scenarios: [
      {condition: 'severe preeclampsia assessment', setting: 'antepartum unit', concern: 'headache with epigastric pain', action: 'escalate severe-feature findings', monitor: 'maternal oxygenation and reflexes'},
      {condition: 'postpartum hemorrhage risk', setting: 'postpartum room', concern: 'boggy fundus and tachycardia', action: 'perform immediate hemorrhage response', monitor: 'bleeding amount'},
      {condition: 'nonreassuring fetal status', setting: 'labor room', concern: 'late decelerations', action: 'improve uteroplacental perfusion', monitor: 'fetal heart rate pattern'},
    ],
  },
  {
    id: 'pediatrics',
    title: 'Pediatrics',
    modules: [
      {id: 'pediatric', title: 'Pediatric'},
      {id: 'growth-and-development', title: 'Growth and Development'},
    ],
    scenarios: [
      {condition: 'dehydration in a child', setting: 'pediatric unit', concern: 'dry mucosa and lethargy', action: 'prioritize rehydration assessment', monitor: 'capillary refill'},
      {condition: 'respiratory distress in an infant', setting: 'urgent care', concern: 'nasal flaring and retractions', action: 'support oxygenation immediately', monitor: 'respiratory effort'},
      {condition: 'parent teaching before discharge', setting: 'pediatric clinic', concern: 'medication misunderstanding', action: 'verify teach-back', monitor: 'caregiver accuracy'},
    ],
  },
  {
    id: 'mental-health-wellness',
    title: 'Mental Health and Wellness',
    modules: [
      {id: 'mental-health', title: 'Mental Health'},
      {id: 'nutrition-and-diet', title: 'Nutrition and Diet'},
    ],
    scenarios: [
      {condition: 'escalating anxiety with hyperventilation', setting: 'behavioral health unit', concern: 'panic symptoms', action: 'use calm, structured communication', monitor: 'ability to follow directions'},
      {condition: 'suicide safety concern', setting: 'emergency intake', concern: 'expressed hopelessness with plan', action: 'initiate one-to-one safety measures', monitor: 'immediate risk behaviors'},
      {condition: 'malnutrition risk in recovery', setting: 'outpatient follow-up', concern: 'poor intake and fatigue', action: 'prioritize nutrition assessment', monitor: 'weight trend'},
    ],
  },
];

const ITEM_PATTERNS = [
  {id: 'priority-action', type: 'single_choice'},
  {id: 'urgent-follow-up', type: 'multiple_response'},
  {id: 'teaching-evaluation', type: 'single_choice'},
  {id: 'safety-screen', type: 'select_all_that_apply'},
  {id: 'expected-outcome', type: 'single_choice'},
  {id: 'true-false-check', type: 'true_false'},
];

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
    console.error(`[exam-prep-seed] credentials file not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function splitCommaSeparated(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function listOrganizationIds() {
  if (ORG_ID) {
    return [ORG_ID];
  }

  const organizationsSnap = await db.collection('organizations').get();
  return organizationsSnap.docs.map((docSnap) => docSnap.id).filter(Boolean);
}

function pickProgram(index) {
  const pool = PROGRAM_FILTER.length
    ? PROGRAMS.filter((program) => PROGRAM_FILTER.includes(program.id))
    : PROGRAMS;
  return pool[index % pool.length];
}

function pickCourseGroup(index) {
  const pool = COURSE_GROUP_FILTER.length
    ? COURSE_GROUPS.filter((courseGroup) => COURSE_GROUP_FILTER.includes(courseGroup.id))
    : COURSE_GROUPS;
  return pool[index % pool.length];
}

function pickModule(courseGroup, index) {
  return courseGroup.modules[index % courseGroup.modules.length];
}

function pickScenario(courseGroup, index) {
  return courseGroup.scenarios[index % courseGroup.scenarios.length];
}

function buildChoiceSet(pattern, scenario, module, itemIndex) {
  const actions = [
    `Implement ${scenario.action}.`,
    `Delay action until the next routine reassessment.`,
    `Focus first on a low-priority comfort request unrelated to ${scenario.concern}.`,
    `Document the finding without escalating the change in status.`,
  ];
  const urgentFindings = [
    `${scenario.concern.charAt(0).toUpperCase() + scenario.concern.slice(1)}`,
    `A change in status linked to ${scenario.condition}`,
    `Objective data showing deterioration in ${scenario.monitor}`,
    `A stable finding that does not change the current plan of care`,
    `A routine preference unrelated to the presenting risk`,
  ];
  const outcomes = [
    `Improvement in ${scenario.monitor}`,
    `Worsening of the original instability without escalation`,
    `New delay in the intervention plan`,
    `Reduced monitoring despite ongoing concern`,
  ];
  const teaching = [
    `The client explains when to report worsening ${scenario.concern}.`,
    `The client states that follow-up is unnecessary if symptoms return.`,
    `The client plans to stop monitoring ${scenario.monitor}.`,
    `The client delays the prescribed plan until the next week.`,
  ];

  if (pattern.id === 'priority-action') {
    return {
      choices: actions,
      correctAnswerKey: ['A'],
    };
  }

  if (pattern.id === 'urgent-follow-up' || pattern.id === 'safety-screen') {
    return {
      choices: urgentFindings,
      correctAnswerKey: ['A', 'B', 'C'],
    };
  }

  if (pattern.id === 'expected-outcome') {
    return {
      choices: outcomes,
      correctAnswerKey: ['A'],
    };
  }

  if (pattern.id === 'true-false-check') {
    const trueStatement = `Immediate follow-up is indicated when ${scenario.concern} is present during ${scenario.condition}.`;
    const falseStatement = `Delaying reassessment is the safest response to ${scenario.condition}.`;
    return {
      choices: [trueStatement, falseStatement],
      correctAnswerKey: [itemIndex % 2 === 0 ? 'A' : 'B'],
    };
  }

  return {
    choices: teaching,
    correctAnswerKey: ['A'],
  };
}

function buildLeadIn(pattern, scenario, module) {
  if (pattern.id === 'priority-action') {
    return `Which action should the nurse take first in response to ${scenario.concern}?`;
  }
  if (pattern.id === 'urgent-follow-up') {
    return `Which findings require immediate nursing follow-up? Select all that apply.`;
  }
  if (pattern.id === 'teaching-evaluation') {
    return `Which client statement shows correct understanding of the care priorities?`;
  }
  if (pattern.id === 'safety-screen') {
    return `Which findings increase the immediate safety risk in this situation? Select all that apply.`;
  }
  if (pattern.id === 'expected-outcome') {
    return `Which outcome best indicates that interventions for ${scenario.condition} are working?`;
  }
  return `Which statement about ${scenario.condition} is accurate?`;
}

function buildStem(program, courseGroup, module, scenario, itemIndex, caseStudyTitle) {
  const ageBands = ['young adult', 'middle-aged adult', 'older adult'];
  const shiftLabels = ['during the day shift', 'during evening handoff', 'during the night shift'];
  const ageBand = ageBands[itemIndex % ageBands.length];
  const shiftLabel = shiftLabels[itemIndex % shiftLabels.length];
  return `A ${ageBand} client in ${scenario.setting} develops ${scenario.condition} ${shiftLabel}. The nurse notes ${scenario.concern}.`;
}

function buildQuestionItem(args) {
  const {orgId, itemIndex, parentCaseId, caseStudyTitle} = args;
  const program = pickProgram(itemIndex);
  const courseGroup = pickCourseGroup(itemIndex);
  const module = pickModule(courseGroup, itemIndex);
  const scenario = pickScenario(courseGroup, itemIndex);
  const pattern = ITEM_PATTERNS[itemIndex % ITEM_PATTERNS.length];
  const choiceSet = buildChoiceSet(pattern, scenario, module, itemIndex);
  const stem = buildStem(program, courseGroup, module, scenario, itemIndex, caseStudyTitle);
  const leadInQuestion = buildLeadIn(pattern, scenario, module);
  const difficulty = ['easy', 'medium', 'hard'][itemIndex % 3];
  const cognitiveLevel = ['apply', 'analyze', 'clinical_judgment'][itemIndex % 3];
  const choices = choiceSet.choices.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    label: String.fromCharCode(65 + index),
    text,
    rationale: choiceSet.correctAnswerKey.includes(String.fromCharCode(65 + index))
      ? `This response aligns with the priority focus on ${scenario.action} and supports safer management of ${scenario.condition}.`
      : `This option is lower priority because it does not address ${scenario.concern} as directly as the best response.`,
  }));

  const idBase = ID_PREFIX
    ? `seed-${ID_PREFIX}-${orgId}-${slugify(program.id)}-${slugify(module.id)}-${String(itemIndex + 1).padStart(4, '0')}`
    : `seed-${orgId}-${slugify(program.id)}-${slugify(module.id)}-${String(itemIndex + 1).padStart(4, '0')}`;

  return {
    id: idBase,
    organizationId: orgId,
    programId: program.id,
    programTitle: program.title,
    jurisdiction: program.jurisdiction,
    examTrack: program.examTrack,
    courseGroupId: courseGroup.id,
    courseGroupTitle: courseGroup.title,
    moduleId: module.id,
    moduleTitle: module.title,
    parentCaseId: parentCaseId || null,
    itemType: pattern.type,
    cognitiveLevel,
    difficulty,
    stem,
    scenarioText: `${scenario.condition} with focus on ${scenario.monitor}.`,
    leadInQuestion,
    choices,
    correctAnswerKey: pattern.type === 'true_false'
      ? choiceSet.correctAnswerKey
      : normalizeStringArray(choiceSet.correctAnswerKey),
    explanation: `This item tests recognition of ${scenario.condition} and the safest immediate nursing response.`,
    rationale: `The best response is the one that addresses ${scenario.concern} promptly and improves ${scenario.monitor}.`,
    distractorRationale: null,
    learningObjectives: [
      `Recognize priority cues associated with ${scenario.condition}.`,
      `Apply safe nursing judgment in a clinical setting.`,
    ],
    tags: [
      slugify(courseGroup.id),
      slugify(module.id),
      slugify(scenario.condition),
      slugify(scenario.concern),
      ...(WAVE_LABEL ? [slugify(WAVE_LABEL)] : []),
    ],
    sourceAuthority: 'Innovacare Generated Content',
    sourceReferenceTitle: WAVE_LABEL
      ? `Generated ${courseGroup.title} Seed Library - ${WAVE_LABEL}`
      : `Generated ${courseGroup.title} Seed Library`,
    sourceReferenceUrl: null,
    sourceVersionDate: new Date().toISOString().slice(0, 10),
    jurisdictionNotes: null,
    points: 1,
    estimatedTimeSeconds: pattern.type === 'multiple_response' || pattern.type === 'select_all_that_apply' ? 95 : 75,
    active: true,
    workflowStatus: 'published',
    version: 1,
    remediationModuleIds: [module.id],
    remediationLessonIds: [],
    remediationTags: [slugify(scenario.concern), slugify(module.id)],
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

function buildCaseStudyBundle(args) {
  const {orgId, caseIndex, linkedItems} = args;
  const primaryItem = linkedItems[0];
  const title = `Generated Case Study ${String(caseIndex + 1).padStart(3, '0')} - ${primaryItem.moduleTitle}`;
  const idBase = ID_PREFIX
    ? `seed-case-${ID_PREFIX}-${orgId}-${String(caseIndex + 1).padStart(3, '0')}`
    : `seed-case-${orgId}-${String(caseIndex + 1).padStart(3, '0')}`;
  return {
    id: idBase,
    organizationId: orgId,
    programId: primaryItem.programId,
    programTitle: primaryItem.programTitle,
    jurisdiction: primaryItem.jurisdiction,
    examTrack: primaryItem.examTrack,
    courseGroupId: primaryItem.courseGroupId,
    courseGroupTitle: primaryItem.courseGroupTitle,
    moduleId: primaryItem.moduleId,
    moduleTitle: primaryItem.moduleTitle,
    title,
    slug: slugify(title),
    workflowStatus: 'published',
    active: true,
    sharedContext: {
      vignette: `An adult client presents with an evolving clinical change that requires prioritization, reassessment, and timely escalation.`,
      demographics: 'Adult client in a monitored setting',
      history: 'The client is being followed for a change in status that requires focused nursing judgment.',
      allergies: [],
      currentMeds: [],
      labs: [],
      vitalSigns: [],
      nursingNotes: [],
      providerNotes: [],
      imagingSnippets: [],
      trendUpdates: [],
    },
    childItemIds: linkedItems.map((item) => item.id),
    sequenceOrder: linkedItems.map((_, index) => index + 1),
    sourceReferences: [
      {
        sourceAuthority: 'Innovacare Generated Content',
        sourceReferenceTitle: WAVE_LABEL ? `${title} - ${WAVE_LABEL}` : title,
        sourceReferenceUrl: null,
        sourceVersionDate: new Date().toISOString().slice(0, 10),
        jurisdictionNotes: null,
      },
    ],
    version: 1,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

function buildSeedPayload(orgId) {
  const eligiblePrograms = PROGRAM_FILTER.length
    ? PROGRAMS.filter((program) => PROGRAM_FILTER.includes(program.id))
    : PROGRAMS;
  const eligibleCourseGroups = COURSE_GROUP_FILTER.length
    ? COURSE_GROUPS.filter((courseGroup) => COURSE_GROUP_FILTER.includes(courseGroup.id))
    : COURSE_GROUPS;

  if (!eligiblePrograms.length) {
    throw new Error('No matching programs found for the provided --programs filter.');
  }

  if (!eligibleCourseGroups.length) {
    throw new Error('No matching course groups found for the provided --course-groups filter.');
  }

  const caseStudyGroups = [];
  const linkedItemTarget = Math.min(ITEM_COUNT, CASE_STUDY_COUNT * 4);

  for (let caseIndex = 0; caseIndex < CASE_STUDY_COUNT; caseIndex += 1) {
    caseStudyGroups.push({
      id: ID_PREFIX
        ? `seed-case-${ID_PREFIX}-${orgId}-${String(caseIndex + 1).padStart(3, '0')}`
        : `seed-case-${orgId}-${String(caseIndex + 1).padStart(3, '0')}`,
      title: `Generated Case Study ${String(caseIndex + 1).padStart(3, '0')}`,
      itemIds: [],
    });
  }

  const items = [];
  for (let itemIndex = 0; itemIndex < ITEM_COUNT; itemIndex += 1) {
    const caseStudyGroup = itemIndex < linkedItemTarget
      ? caseStudyGroups[Math.floor(itemIndex / 4)]
      : null;
    const item = buildQuestionItem({
      orgId,
      itemIndex,
      parentCaseId: caseStudyGroup ? caseStudyGroup.id : null,
      caseStudyTitle: caseStudyGroup ? caseStudyGroup.title : null,
    });
    if (caseStudyGroup) {
      caseStudyGroup.itemIds.push(item.id);
    }
    items.push(item);
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const caseStudies = caseStudyGroups
    .filter((group) => group.itemIds.length > 0)
    .map((group, caseIndex) => buildCaseStudyBundle({
      orgId,
      caseIndex,
      linkedItems: group.itemIds.map((itemId) => itemsById.get(itemId)).filter(Boolean),
    }));

  return {items, caseStudies};
}

async function writeSeedPayload(orgId, payload) {
  const itemWrites = payload.items.map((item) => ({
    ref: db.doc(`organizations/${orgId}/questionBank/${item.id}`),
    data: item,
  }));
  const caseWrites = payload.caseStudies.map((caseStudy) => ({
    ref: db.doc(`organizations/${orgId}/caseStudies/${caseStudy.id}`),
    data: caseStudy,
  }));
  const writeGroups = chunk([...itemWrites, ...caseWrites], BATCH_LIMIT);

  for (const writeGroup of writeGroups) {
    const batch = db.batch();
    for (const write of writeGroup) {
      batch.set(write.ref, write.data, {merge: true});
    }
    await batch.commit();
  }
}

async function main() {
  const organizationIds = await listOrganizationIds();
  if (!organizationIds.length) {
    throw new Error('No target organizations found.');
  }

  console.log(`[exam-prep-seed] mode=${APPLY ? 'APPLY' : 'DRY_RUN'} project=${PROJECT_ID || 'default'} org=${ORG_ID || 'ALL'} count=${ITEM_COUNT} caseStudies=${CASE_STUDY_COUNT} idPrefix=${ID_PREFIX || 'default'} wave=${WAVE_LABEL || 'core'} courseGroups=${COURSE_GROUP_FILTER.join('|') || 'all'} programs=${PROGRAM_FILTER.join('|') || 'all'}`);

  for (const orgId of organizationIds) {
    const payload = buildSeedPayload(orgId);
    console.log(`[exam-prep-seed] org=${orgId} generated items=${payload.items.length} caseStudies=${payload.caseStudies.length}`);

    if (!APPLY) {
      console.log(`[exam-prep-seed] sample item ${payload.items[0].id} ${payload.items[0].itemType} ${payload.items[0].moduleId}`);
      console.log(`[exam-prep-seed] sample case ${payload.caseStudies[0]?.id || 'none'}`);
      continue;
    }

    await writeSeedPayload(orgId, payload);
    console.log(`[exam-prep-seed] imported items=${payload.items.length} caseStudies=${payload.caseStudies.length} into organizations/${orgId}`);
  }
}

main().catch((error) => {
  console.error('[exam-prep-seed] failed', error.message || error);
  process.exit(1);
});