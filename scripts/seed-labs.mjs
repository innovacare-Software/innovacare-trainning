// ============================================================
// Innovacare Lab Engine — Seed Script  (C-4 / C-5 FIX)
// ============================================================
// Usage (emulator):
//   FIRESTORE_EMULATOR_HOST=localhost:8080 \
//   FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199 \
//   node scripts/seed-labs.mjs
//
// Usage (production — service account required):
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
//   node scripts/seed-labs.mjs --prod
//
// What this script does:
//   1. Uploads starter files to Firebase Storage
//      → labs/definitions/{labId}/starter/{filePath}
//   2. Writes the lab definition doc to Firestore
//      → labDefinitions/{labId}
//   3. Writes each task as a sub-collection document  ← C-4 FIX
//      → labDefinitions/{labId}/tasks/{taskId}
//   4. Writes each fileDef as a sub-collection document ← C-4 FIX
//      → labDefinitions/{labId}/fileDefs/{fileDefId}
// ============================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ── Config ────────────────────────────────────────────────────────────────────

const isProd = process.argv.includes('--prod');
const isForce = process.argv.includes('--force');

const FIRESTORE_EMULATOR = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const STORAGE_EMULATOR   = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const PROJECT_ID         = process.env.FIREBASE_PROJECT_ID || 'innovacare-stripe';
const STORAGE_BUCKET     = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;

if (!isProd) {
  // Point to emulators
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_EMULATOR;
  initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
} else {
  // Production — requires GOOGLE_APPLICATION_CREDENTIALS
  initializeApp({ storageBucket: STORAGE_BUCKET });
}

const db      = getFirestore();
const storage = getStorage().bucket();

// ── Full seed data (mirrors lab-seed.data.ts) ─────────────────────────────────

const SEED_LABS = [
  // ── Lab 1: AI Agent Manifest ──────────────────────────────────────────────
  {
    labId: 'lab-agent-manifest-v1',
    lab: {
      title: 'Design Your First AI Agent Manifest',
      slug: 'ai-agent-manifest-design',
      subtitle: 'Define boundaries, mission, and approval gates for a production AI agent',
      description:
        'You are an AI Systems Architect at InnovaOps Inc. The CTO has tasked you with designing a compliant AI agent manifest for the Patient Intake Triage Agent. The agent must follow the Minimum Footprint Principle, enforce Default Deny for unknown requests, and require human approval for high-risk clinical decisions.',
      category: 'ai-agent-creation',
      difficulty: 'intermediate',
      labType: 'agent-config',
      status: 'PUBLISHED',
      estimatedMinutes: 45,
      xp: 250,
      order: 1,
      tags: ['AI Agents', 'YAML', 'Enterprise Security', 'Approval Gates', 'Agentic AI'],
      prerequisites: ['Basic YAML syntax', 'Understanding of AI agent principles'],
      learningOutcomes: [
        'Define a compliant agent_manifest.yaml with mission, scope, and boundaries',
        'Implement Default Deny policy with explicit allowed actions',
        'Configure multi-level approval gates for high-risk operations',
        'Write an audit log policy for regulatory compliance',
      ],
      starterFilesPath: 'labs/definitions/lab-agent-manifest-v1/starter/',
      solutionFilesPath: 'labs/definitions/lab-agent-manifest-v1/solution/',
      validationMode: 'rules',
      previewEnabled: false,
      terminalEnabled: false,
      aiCoachEnabled: true,
      createdBy: 'seed-script',
    },
    tasks: [
      {
        id: 'task-agent-1',
        order: 1,
        title: 'Define Agent Identity & Mission',
        mission: 'Every production AI agent must have a clear identity and bounded mission statement.',
        instructions:
          'In agent_manifest.yaml, define the agent_id, agent_name, version, and a mission field. The mission must clearly state what the agent is authorized to do. Add a scope field limited to "patient_intake_triage".',
        expectedFiles: ['agent_manifest.yaml'],
        xp: 50,
        validationRules: [
          { type: 'required_file', file: 'agent_manifest.yaml', points: 10 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'agent_id:', points: 10 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'mission:', points: 15 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'patient_intake_triage', points: 15 },
        ],
        hints: [
          'Use snake_case for all YAML keys',
          'The mission field should be a quoted string describing what the agent does',
          'The scope limits what systems the agent can touch',
        ],
        successCriteria: [
          'agent_manifest.yaml exists',
          'Has agent_id, mission, and scope fields',
          'Scope references patient_intake_triage',
        ],
      },
      {
        id: 'task-agent-2',
        order: 2,
        title: 'Implement Default Deny Policy',
        mission: 'Security-first: deny everything not explicitly permitted.',
        instructions:
          'Add an allowed_actions list with only the permitted operations: classify_intake, query_patient_records, escalate_to_clinician. Then add a default_policy field set to "DENY". Add a blocked_actions list with: access_billing, modify_records, send_external_api.',
        expectedFiles: ['agent_manifest.yaml'],
        xp: 75,
        validationRules: [
          { type: 'contains', file: 'agent_manifest.yaml', value: 'allowed_actions:', points: 15 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'classify_intake', points: 10 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'blocked_actions:', points: 15 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'DENY', points: 10 },
          { type: 'not_contains', file: 'agent_manifest.yaml', value: 'allow_all', points: 10 },
          { type: 'valid_yaml', file: 'agent_manifest.yaml', points: 15 },
        ],
        hints: [
          'In YAML, lists use "- item" syntax under a parent key',
          'default_policy: DENY means reject anything not in allowed_actions',
          'Never use allow_all in a security policy — that defeats the purpose',
        ],
        successCriteria: [
          'allowed_actions list has 3+ entries',
          'blocked_actions list exists',
          'default_policy is DENY',
          'YAML is valid',
        ],
      },
      {
        id: 'task-agent-3',
        order: 3,
        title: 'Configure Approval Gates & Audit Log',
        mission: 'High-risk actions require human approval before execution.',
        instructions:
          'Add an approval_gates section. For escalate_to_clinician, set requires_human_approval: true and reviewer_role: "senior_clinician". Add an audit_log section with enabled: true, retention_days: 2555, and pii_fields: ["patient_id", "condition"].',
        expectedFiles: ['agent_manifest.yaml', 'REFLECTION.md'],
        xp: 125,
        validationRules: [
          { type: 'contains', file: 'agent_manifest.yaml', value: 'approval_gates:', points: 15 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'requires_human_approval: true', points: 20 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'audit_log:', points: 15 },
          { type: 'contains', file: 'agent_manifest.yaml', value: 'retention_days:', points: 10 },
          { type: 'required_file', file: 'REFLECTION.md', points: 10 },
          { type: 'markdown_section_exists', file: 'REFLECTION.md', heading: 'Why Approval Gates Matter', points: 20 },
          { type: 'valid_yaml', file: 'agent_manifest.yaml', points: 10 },
          { type: 'ai_rubric', file: 'REFLECTION.md', rubric: 'Student explains the business and regulatory reasons for human approval gates in AI systems for healthcare', points: 25, advisory: true },
        ],
        hints: [
          'approval_gates is an object with action names as keys',
          'HIPAA requires 7 years audit retention — 2555 days is ~7 years',
          'The REFLECTION.md must include a heading with the exact text "Why Approval Gates Matter"',
        ],
        successCriteria: [
          'approval_gates section exists',
          'escalate_to_clinician has requires_human_approval: true',
          'audit_log enabled with retention_days',
          'REFLECTION.md exists with correct heading',
        ],
      },
    ],
    fileDefs: [
      {
        id: 'filedef-agent-manifest',
        path: 'agent_manifest.yaml',
        language: 'yaml',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-agent-manifest-v1/starter/agent_manifest.yaml',
      },
      {
        id: 'filedef-agent-reflection',
        path: 'REFLECTION.md',
        language: 'markdown',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-agent-manifest-v1/starter/REFLECTION.md',
      },
      {
        id: 'filedef-agent-reference',
        path: 'REFERENCE.md',
        language: 'markdown',
        readonly: true,
        required: false,
        starterStoragePath: 'labs/definitions/lab-agent-manifest-v1/starter/REFERENCE.md',
      },
    ],
    starterFiles: [
      {
        path: 'agent_manifest.yaml',
        content: `# ============================================================
# Agent Manifest — Innovacare Lab Engine
# Task: Design a compliant AI Agent Manifest
# ============================================================
# TODO: Fill in the required fields as described in each task.
# Do NOT use allow_all or skip approval gates.

# ── Task 1: Agent Identity ───────────────────────────────────
# agent_id: ...
# agent_name: ...
# version: ...
# mission: ...
# scope: ...

# ── Task 2: Access Control ───────────────────────────────────
# default_policy: ...
# allowed_actions:
#   - ...

# blocked_actions:
#   - ...

# ── Task 3: Approval Gates & Audit ──────────────────────────
# approval_gates: ...

# audit_log: ...
`,
      },
      {
        path: 'REFLECTION.md',
        content: `# Agent Manifest Reflection

Write your reflection on the design decisions you made in this lab.

## Why Approval Gates Matter

<!-- TODO: Explain in your own words why approval gates are required for AI agents in clinical environments -->

## Default Deny Policy

<!-- TODO: Explain what Default Deny means and why it's preferred over Default Allow -->

## Key Takeaways

<!-- TODO: What will you take away from this lab? -->
`,
      },
      {
        path: 'REFERENCE.md',
        content: `# Agent Manifest Reference Guide (Read-Only)

This file is provided as reference only. Do not modify it.

## Agent Manifest YAML Structure

\`\`\`yaml
agent_manifest:
  agent_id: "<unique-agent-id>"
  agent_name: "<Human readable name>"
  version: "1.0.0"
  mission: "<One-sentence bounded mission>"
  scope: "<system or domain>"
  
  default_policy: DENY
  
  allowed_actions:
    - action_name_1
    - action_name_2
  
  blocked_actions:
    - forbidden_action_1
  
  approval_gates:
    action_name_2:
      requires_human_approval: true
      reviewer_role: "role_name"
      timeout_minutes: 30
  
  audit_log:
    enabled: true
    retention_days: 2555
    pii_fields:
      - field_1
\`\`\`

## HIPAA Compliance Notes

- Audit logs: minimum 7 years (2555 days)
- All PII fields must be identified and protected
- Human approval required for any clinical decision escalation

## Minimum Footprint Principle

Agents should:
1. Request only permissions needed for their specific task
2. Default to DENY for unknown actions
3. Require explicit approval for high-risk operations
`,
      },
    ],
  },

  // ── Lab 2: DevOps CI/CD ───────────────────────────────────────────────────
  {
    labId: 'lab-devops-cicd-v1',
    lab: {
      title: 'Build a CI/CD Pipeline Configuration',
      slug: 'devops-cicd-pipeline-config',
      subtitle: 'Write a GitHub Actions workflow for automated deployment',
      description:
        'You are a DevOps Engineer at InnovaCloud. Your team has requested a CI/CD pipeline using GitHub Actions that runs tests, builds the application, and deploys to staging on main branch pushes. The pipeline must include secrets handling, environment variables, and deployment gates.',
      category: 'devops',
      difficulty: 'intermediate',
      labType: 'agent-config',
      status: 'PUBLISHED',
      estimatedMinutes: 50,
      xp: 200,
      order: 2,
      tags: ['DevOps', 'CI/CD', 'GitHub Actions', 'YAML', 'Automation'],
      prerequisites: ['Basic YAML syntax', 'Understanding of Git workflows'],
      learningOutcomes: [
        'Write a complete GitHub Actions workflow YAML',
        'Configure triggers, jobs, and steps',
        'Handle secrets and environment variables correctly',
        'Implement deployment gates with environment protection',
      ],
      starterFilesPath: 'labs/definitions/lab-devops-cicd-v1/starter/',
      validationMode: 'rules',
      previewEnabled: false,
      terminalEnabled: false,
      aiCoachEnabled: true,
      createdBy: 'seed-script',
    },
    tasks: [
      {
        id: 'task-cicd-1',
        order: 1,
        title: 'Define Workflow Triggers',
        mission: 'Configure the CI/CD pipeline to trigger on the right events.',
        instructions:
          'Create .github/workflows/deploy.yml. Add the "on" triggers for push to main and pull_request to main. Add a workflow name field. Include a permissions block with contents: read.',
        expectedFiles: ['.github/workflows/deploy.yml'],
        xp: 60,
        validationRules: [
          { type: 'required_file', file: '.github/workflows/deploy.yml', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'on:', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'push:', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'branches:', points: 15 },
          { type: 'valid_yaml', file: '.github/workflows/deploy.yml', points: 15 },
        ],
        hints: [
          'The "on" key defines when the workflow runs',
          'Use branches: [main] to scope to the main branch',
          'Permissions block helps principle of least privilege',
        ],
        successCriteria: ['Workflow file exists', 'Has "on" trigger with push and pull_request', 'YAML is valid'],
      },
      {
        id: 'task-cicd-2',
        order: 2,
        title: 'Add Build & Test Jobs',
        mission: 'Every pipeline needs a verified build before deployment.',
        instructions:
          'Add a "build" job that runs on ubuntu-latest. Include steps: checkout code with actions/checkout@v4, setup Node.js with actions/setup-node@v4, run npm install, and npm test. Add a "needs: build" dependency on the deploy job.',
        expectedFiles: ['.github/workflows/deploy.yml'],
        xp: 80,
        validationRules: [
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'jobs:', points: 10 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'ubuntu-latest', points: 10 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'actions/checkout@v4', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'npm install', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'npm test', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'needs:', points: 15 },
        ],
        hints: [
          'Each job has a "runs-on" field and a "steps" array',
          'Actions are referenced as "uses: action/name@version"',
          '"needs: build" creates a sequential dependency',
        ],
        successCriteria: ['Jobs section defined', 'Has build and deploy jobs', 'deploy needs build'],
      },
      {
        id: 'task-cicd-3',
        order: 3,
        title: 'Secure Secrets & Deployment Gate',
        mission: 'Never hardcode credentials — always use secrets and environment protection.',
        instructions:
          'Add environment variables using ${{ secrets.DEPLOY_KEY }} and ${{ secrets.STAGING_URL }}. Add "environment: staging" to the deploy job. Update the README.md with a section "Deployment Architecture" explaining your pipeline.',
        expectedFiles: ['.github/workflows/deploy.yml', 'README.md'],
        xp: 60,
        validationRules: [
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'secrets.', points: 15 },
          { type: 'contains', file: '.github/workflows/deploy.yml', value: 'environment:', points: 15 },
          { type: 'not_contains', file: '.github/workflows/deploy.yml', value: 'password:', points: 15 },
          { type: 'required_file', file: 'README.md', points: 10 },
          { type: 'markdown_section_exists', file: 'README.md', heading: 'Deployment Architecture', points: 20 },
        ],
        hints: [
          'Use ${{ secrets.SECRET_NAME }} — never hardcode passwords',
          '"environment: staging" adds GitHub Environment protection rules',
          'The README heading must exactly match "Deployment Architecture"',
        ],
        successCriteria: ['Secrets referenced (not hardcoded)', 'Environment gate configured', 'README has deployment section'],
      },
    ],
    fileDefs: [
      {
        id: 'filedef-cicd-workflow',
        path: '.github/workflows/deploy.yml',
        language: 'yaml',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-devops-cicd-v1/starter/.github/workflows/deploy.yml',
      },
      {
        id: 'filedef-cicd-readme',
        path: 'README.md',
        language: 'markdown',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-devops-cicd-v1/starter/README.md',
      },
    ],
    starterFiles: [
      {
        path: '.github/workflows/deploy.yml',
        content: `# TODO: Build your CI/CD pipeline workflow here
# Replace this with a valid GitHub Actions workflow YAML

name: # TODO: Add workflow name

on:
  # TODO: Add push and pull_request triggers for main branch

permissions:
  # TODO: Add permissions

jobs:
  # TODO: Add build and deploy jobs
`,
      },
      {
        path: 'README.md',
        content: `# InnovaCloud Deployment Pipeline

## Overview

TODO: Describe your CI/CD pipeline here.

## How to Run Locally

TODO: Add local development instructions.

## Deployment Architecture

TODO: Explain your deployment architecture, stages, and gates.
`,
      },
    ],
  },

  // ── Lab 3: Web Dev Landing Page ───────────────────────────────────────────
  // C-5 FIX: Lab 3 now fully seeded (previously missing from seed script)
  {
    labId: 'lab-webdev-landing-v1',
    lab: {
      title: 'Build an Enterprise Landing Page',
      slug: 'webdev-enterprise-landing',
      subtitle: 'Create a responsive, accessible hero section with HTML and CSS',
      description:
        'You are a Frontend Developer at InnovaWeb. Your task is to build a responsive enterprise-grade landing page hero section. The design must be accessible (ARIA landmarks, alt text), use CSS custom properties, and work on mobile and desktop.',
      category: 'web-development',
      difficulty: 'beginner',
      labType: 'browser',
      status: 'PUBLISHED',
      estimatedMinutes: 35,
      xp: 150,
      order: 3,
      tags: ['HTML', 'CSS', 'Responsive Design', 'Accessibility', 'Web Dev'],
      prerequisites: ['Basic HTML structure', 'Introduction to CSS'],
      learningOutcomes: [
        'Build a semantic HTML5 hero section with ARIA landmarks',
        'Use CSS custom properties (variables) for a consistent design system',
        'Implement responsive design with media queries',
        'Apply accessibility best practices (alt text, roles, headings)',
      ],
      starterFilesPath: 'labs/definitions/lab-webdev-landing-v1/starter/',
      validationMode: 'rules',
      previewEnabled: true,
      terminalEnabled: false,
      aiCoachEnabled: true,
      createdBy: 'seed-script',
    },
    tasks: [
      {
        id: 'task-webdev-1',
        order: 1,
        title: 'Create Semantic HTML Structure',
        mission: 'Enterprise UIs start with solid, accessible HTML foundations.',
        instructions:
          'In index.html, create a proper HTML5 document structure. Add a <header> element with role="banner" containing a <nav>. Add a <main> with a <section> that has a class of "hero". Inside the hero, add a <h1> with class "hero__title" and a <p> with class "hero__subtitle". Add an <img> with alt text.',
        expectedFiles: ['index.html'],
        xp: 50,
        validationRules: [
          { type: 'required_file', file: 'index.html', points: 10 },
          { type: 'html_element_exists', file: 'index.html', selector: 'header[role="banner"]', points: 15 },
          { type: 'html_element_exists', file: 'index.html', selector: 'main', points: 10 },
          { type: 'html_element_exists', file: 'index.html', selector: '.hero', points: 15 },
          { type: 'html_element_exists', file: 'index.html', selector: 'h1.hero__title', points: 15 },
          { type: 'html_element_exists', file: 'index.html', selector: 'img[alt]', points: 15 },
        ],
        hints: [
          'Use <header role="banner"> for the page header landmark',
          'The hero section must use BEM class naming: hero, hero__title, hero__subtitle',
          'Every image must have a non-empty alt attribute for accessibility',
        ],
        successCriteria: ['Valid HTML5 structure', 'Semantic landmarks', 'Hero section with BEM classes', 'Accessible images'],
      },
      {
        id: 'task-webdev-2',
        order: 2,
        title: 'Style with CSS Custom Properties',
        mission: 'Consistent design systems use CSS variables for color, spacing, and typography.',
        instructions:
          'In styles.css, define CSS custom properties in :root for --color-primary, --color-bg, --color-text, and --font-heading. Style the .hero class with a gradient background using var(--color-primary). Add a media query for screens max-width 768px that changes the hero layout.',
        expectedFiles: ['styles.css'],
        xp: 50,
        validationRules: [
          { type: 'required_file', file: 'styles.css', points: 10 },
          { type: 'contains', file: 'styles.css', value: ':root', points: 15 },
          { type: 'contains', file: 'styles.css', value: '--color-primary', points: 15 },
          { type: 'contains', file: 'styles.css', value: 'var(--', points: 15 },
          { type: 'contains', file: 'styles.css', value: '@media', points: 15 },
          { type: 'regex', file: 'styles.css', pattern: 'max-width:\\s*768px', points: 15 },
        ],
        hints: [
          ':root is where you define CSS custom properties',
          'Use var(--custom-property-name) to reference them',
          '@media (max-width: 768px) scopes styles to mobile screens',
        ],
        successCriteria: ['CSS variables defined in :root', 'Variables used throughout', 'Media query for mobile'],
      },
      {
        id: 'task-webdev-3',
        order: 3,
        title: 'Add Interactivity with JavaScript',
        mission: 'Progressive enhancement: add behavior without breaking the base HTML experience.',
        instructions:
          'In app.js, add a DOMContentLoaded event listener. Inside it, add a smooth scroll behavior for anchor links. Add a class "js-loaded" to document.body when JavaScript runs. Add a click counter on the CTA button that shows a toast message.',
        expectedFiles: ['app.js'],
        xp: 50,
        validationRules: [
          { type: 'required_file', file: 'app.js', points: 10 },
          { type: 'contains', file: 'app.js', value: 'DOMContentLoaded', points: 15 },
          { type: 'contains', file: 'app.js', value: 'js-loaded', points: 15 },
          { type: 'contains', file: 'app.js', value: 'addEventListener', points: 15 },
          { type: 'not_contains', file: 'app.js', value: 'document.write', points: 15 },
        ],
        hints: [
          'document.addEventListener("DOMContentLoaded", () => { ... }) is the standard entry point',
          'document.body.classList.add("js-loaded") sets the class on body',
          'Never use document.write — it is deprecated and blocks rendering',
        ],
        successCriteria: ['DOMContentLoaded used', 'js-loaded class added', 'No document.write'],
      },
    ],
    fileDefs: [
      {
        id: 'filedef-webdev-html',
        path: 'index.html',
        language: 'html',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-webdev-landing-v1/starter/index.html',
      },
      {
        id: 'filedef-webdev-css',
        path: 'styles.css',
        language: 'css',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-webdev-landing-v1/starter/styles.css',
      },
      {
        id: 'filedef-webdev-js',
        path: 'app.js',
        language: 'javascript',
        readonly: false,
        required: true,
        starterStoragePath: 'labs/definitions/lab-webdev-landing-v1/starter/app.js',
      },
    ],
    starterFiles: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InnovaWeb — Enterprise Landing</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- TODO: Task 1 — Build your semantic HTML structure here -->
  <!-- Add: <header>, <nav>, <main>, <section class="hero">, <h1>, <p>, <img> -->

  <script src="app.js"></script>
</body>
</html>
`,
      },
      {
        path: 'styles.css',
        content: `/* ============================================================
   InnovaWeb — Enterprise Landing Page Styles
   Task 2: Add CSS Custom Properties and responsive design
   ============================================================ */

/* TODO: Add :root with CSS custom properties */
/* :root {
  --color-primary: ...;
  --color-bg: ...;
  --color-text: ...;
  --font-heading: ...;
} */

/* TODO: Style the .hero section using var() references */

/* TODO: Add a media query for max-width: 768px */
`,
      },
      {
        path: 'app.js',
        content: `// ============================================================
// InnovaWeb — Enterprise Landing Page JavaScript
// Task 3: Add DOMContentLoaded handler and interactivity
// ============================================================

// TODO: Add your DOMContentLoaded event listener here
// document.addEventListener('DOMContentLoaded', () => {
//   document.body.classList.add('js-loaded');
//   // Add smooth scroll and click counter
// });
`,
      },
    ],
  },
];

// ── Main seeding function ──────────────────────────────────────────────────────

async function seedLabs() {
  console.log('\n🔬 Innovacare Lab Engine Seeder');
  console.log(`Mode: ${isProd ? '🔴 PRODUCTION' : '🟢 Emulator'}`);
  console.log(`Project: ${PROJECT_ID}`);
  if (!isProd) {
    console.log(`Firestore: ${FIRESTORE_EMULATOR}`);
    console.log(`Storage:   ${STORAGE_EMULATOR}`);
  }
  console.log('');

  for (const seedEntry of SEED_LABS) {
    const { labId, lab, tasks, fileDefs, starterFiles } = seedEntry;
    console.log(`📦 Seeding lab: ${labId} (${lab.status})`);

    // ── Step 1: Upload starter files to Firebase Storage ─────────────────────
    for (const starterFile of starterFiles) {
      const storagePath = `${lab.starterFilesPath}${starterFile.path}`;
      const storageRef = storage.file(storagePath);

      // Check if file exists (skip unless --force)
      if (!isForce) {
        const [exists] = await storageRef.exists();
        if (exists) {
          console.log(`  ⏭  Skip (exists): ${storagePath}`);
          continue;
        }
      }

      await storageRef.save(starterFile.content, {
        contentType: 'text/plain; charset=utf-8',
        metadata: { labId, seedVersion: '2' },
      });
      console.log(`  ✓ Storage: ${storagePath}`);
    }

    // ── Step 2: Write labDefinitions/{labId} document ─────────────────────────
    const labRef = db.doc(`labDefinitions/${labId}`);
    await labRef.set(
      {
        ...lab,
        id: labId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  ✓ Firestore: labDefinitions/${labId}`);

    // ── Step 3: Write tasks sub-collection  ← C-4 FIX ─────────────────────────
    for (const task of tasks) {
      const taskRef = labRef.collection('tasks').doc(task.id);
      await taskRef.set(
        {
          ...task,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      console.log(`  ✓ Firestore: labDefinitions/${labId}/tasks/${task.id}`);
    }

    // ── Step 4: Write fileDefs sub-collection  ← C-4 FIX ──────────────────────
    for (const fileDef of fileDefs) {
      const fileDefRef = labRef.collection('fileDefs').doc(fileDef.id);
      await fileDefRef.set(
        {
          ...fileDef,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      console.log(`  ✓ Firestore: labDefinitions/${labId}/fileDefs/${fileDef.id}`);
    }

    console.log(`  ✅ ${lab.title}`);
    console.log('');
  }

  console.log('✅ All 3 labs seeded successfully!');
  console.log('');
  console.log('Verification:');
  console.log('  firestore: labDefinitions/ → 3 docs');
  console.log('  firestore: labDefinitions/*/tasks/ → 3+3+3 task docs');
  console.log('  firestore: labDefinitions/*/fileDefs/ → 3+2+3 fileDef docs');
  console.log('  storage:   labs/definitions/*/starter/ → all starter files');
  console.log('');
}

seedLabs().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
