# Innovacare Platform — Blueprint

## Overview

Innovacare is a production-grade Learning Management System (LMS) built with Angular 20+, Firebase (Firestore + Storage), and Google AI. It serves multiple audiences:

- **Learners** — consume courses, take exams, complete interactive labs, earn XP/certificates
- **Instructors** — author content, review submissions, monitor learner progress
- **Admins** — manage platform, users, organizations, billing, and feature flags
- **Guests** — browse catalog and trial courses without sign-in

---

## Application Architecture

| Layer | Technology |
|---|---|
| Framework | Angular 20+ (standalone, signals, OnPush) |
| State | Angular Signals + `computed()` |
| Backend | Firebase: Auth, Firestore, Storage, Functions |
| AI | Gemini 2.0 via Google AI SDK |
| Routing | Lazy-loaded standalone route groups |
| Styling | Vanilla CSS (no utility framework) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions → Firebase Deploy |

---

## Design System

- **Dark mode first** — `#0a0d14` base, `#0d1117` card, `#21262d` borders
- **Accent** — Indigo/Violet gradient `#6366f1 → #8b5cf6`
- **Success** — `#4ade80` (green) | **Warning** — `#f59e0b` | **Error** — `#f87171`
- **Code font** — JetBrains Mono / Fira Code
- **UI font** — Inter, system-ui
- **Effects** — glassmorphism cards, gradient text, glow buttons, typed text
- **Micro-animations** — entrance fades, hover lifts, shimmer skeletons

---

## Features Implemented (All Versions)

### Core Platform
- Firebase Auth (email/password, Google OAuth)
- Role-based access control: `super_admin | admin | manager | instructor | tutor | staff | learner | guest | programAdmin | programStaff | programLearner`
- User profile management, force-password-change flow
- Organization-scoped multi-tenancy
- Stripe payment integration (checkout, subscriptions)
- Cart and enrollment system
- Live class scheduling
- Language switcher (i18n via Transloco)
- Security event logging (`SecurityLoggerService`)

### Exam Engine (ArcherExamEngine)
- Multiple choice, multi-select, true/false, short answer questions
- Timer, auto-submit, result scoring
- Analytics and performance tracking
- Adaptive question weighting

### Language Tests Feature
- Instructor-authored listening/reading tests
- Learner result tracking and review
- Instructor result overview table

---

## Interactive Lab Engine (NEW — Current Release)

### Mission
Transform passive LMS lessons into a hands-on enterprise lab environment where learners:
1. Read an enterprise mission brief
2. Edit code/configuration in a browser IDE (Monaco-ready textarea fallback)
3. Preview HTML/CSS/JS output in a sandboxed iframe
4. Validate work automatically against deterministic rules
5. Receive AI coach guidance (Gemini 2.0, guided not solving)
6. Save progress to Firebase Storage
7. Submit artifacts for instructor review
8. Earn XP, score, and instructor feedback
9. Export portfolio evidence

### Supported Lab Categories
| Category | Slug |
|---|---|
| DevOps & CI/CD | `devops` |
| Cloud & GCP | `cloud` |
| Linux & SysAdmin | `linux` |
| Angular / Web Dev | `web-development` |
| Agentic AI | `agentic-ai` |
| AI Agent Creation | `ai-agent-creation` |
| RAG & Prompt Stack | `rag-prompt-stack` |
| SysAdmin AI Ops | `sysadmin-aiops` |

### Lab Types
| Type | Description |
|---|---|
| `browser` | HTML/CSS/JS labs with live sandboxed iframe preview |
| `agent-config` | YAML/JSON agent manifest and config labs |
| `cloud-guided` | Step-by-step guided cloud operations (future) |
| `container-future` | Full container terminal (future) |

### Validation Rule Types
| Rule | Description |
|---|---|
| `required_file` | File must exist and be non-empty |
| `contains` | File must contain a literal string |
| `not_contains` | File must NOT contain a string (security) |
| `regex` | File matches a regular expression |
| `valid_json` | File parses as valid JSON |
| `valid_yaml` | File parses as valid YAML |
| `json_path_exists` | JSON path value present |
| `html_element_exists` | CSS selector found in HTML |
| `markdown_section_exists` | Heading exists in Markdown |
| `ai_rubric` | Advisory AI evaluation (never blocking) |

---

## File Structure — Lab Engine Feature

```
src/app/features/lab-engine/
├── models/
│   ├── lab-definition.model.ts     ← LabDefinition, LabTask, LabFileDefinition, all rules
│   ├── lab-session.model.ts        ← LabSession, LocalWorkspaceFile, ValidationResult, LabSubmission
│   └── validation-rule.model.ts   ← Re-exports + AiCoachRequest/Response types
│
├── services/
│   ├── lab-definition.service.ts  ← Firestore CRUD for lab defs
│   ├── lab-session.service.ts     ← Session create/update/submit
│   ├── lab-workspace.service.ts   ← In-memory file state, autosave, debounce
│   ├── lab-storage.service.ts     ← Firebase Storage upload/download
│   ├── lab-validator.service.ts   ← Deterministic client-side rule engine
│   ├── lab-ai-coach.service.ts    ← Gemini 2.0 guided coaching (policy-safe)
│   └── lab-admin.service.ts       ← Admin: publish, review submissions
│
├── components/
│   ├── lab-header/                ← Top bar: title, XP, save/validate/submit buttons
│   ├── lab-instructions-panel/   ← Mission brief, task stepper, hints accordion
│   ├── lab-code-editor/          ← File tabs, textarea (Monaco-ready), status bar
│   ├── lab-preview-panel/        ← Sandboxed iframe (browser) / Agent sim (agent-config)
│   ├── lab-validation-panel/     ← Rule results, score, pass/fail cards
│   └── lab-ai-coach-panel/       ← Chat, quick actions, typing indicator, rate limit
│
├── pages/
│   ├── lab-catalog-page/          ← Browse/filter labs, start/resume session
│   ├── lab-player-page/           ← 4-panel IDE shell (all components assembled)
│   ├── lab-admin-list-page/       ← Admin: filterable table, quick publish/unpublish
│   ├── lab-admin-editor-page/     ← Admin: create/edit lab metadata
│   └── lab-submission-review-page/← Instructor: review+feedback on submissions
│
├── seed/
│   └── lab-seed.data.ts           ← 3 starter labs with tasks, rules, starter files
│
└── routes.ts                      ← LAB_ENGINE_ROUTES, LAB_ADMIN_ROUTES, INSTRUCTOR_LAB_ROUTES
```

### Supporting Files
```
firestore.rules.lab-engine.rules   ← Firestore security rules (merge into firestore.rules)
storage.rules.lab-engine.rules     ← Storage security rules (merge into storage.rules)
scripts/seed-labs.mjs              ← Node.js emulator seeder
```

---

## Routing

| Route | Component | Guard |
|---|---|---|
| `/labs` | `LabCatalogPageComponent` | `authenticatedGuard` |
| `/labs/:labId/session/:sessionId` | `LabPlayerPageComponent` | `authenticatedGuard` |
| `/admin/labs` | `LabAdminListPageComponent` | `roleCanMatch(['super_admin','admin','manager'])` |
| `/admin/labs/:labId` | `LabAdminEditorPageComponent` | `roleCanMatch(['super_admin','admin','manager'])` |
| `/instructor/submissions` | `LabSubmissionReviewPageComponent` | `roleCanMatch(['instructor','tutor','staff',…])` |

---

## Firestore Data Model

| Collection | Document | Size Policy |
|---|---|---|
| `labDefinitions/{labId}` | Lab metadata | Small — no file content |
| `labDefinitions/{labId}/tasks/{taskId}` | Task + validation rules | Small |
| `labDefinitions/{labId}/fileDefs/{fileDefId}` | File path, language, storage path | Small |
| `labSessions/{sessionId}` | Session state, score, progress | Small |
| `labSessions/{sessionId}/validationRuns/{runId}` | Validation snapshot | Medium |
| `labSubmissions/{submissionId}` | Submission record, feedback | Small |
| `labWorkspaces/{workspaceId}/files/{fileId}` | File metadata + ≤500 char preview | Small |

**File content stored in Firebase Storage only** — never in Firestore documents.

---

## AI Coach Policy

| Allowed Actions | Blocked Actions |
|---|---|
| `give_hint` | `reveal_full_solution_before_attempt` |
| `explain_error` | `generate_complete_final_submission` |
| `review_code` | `execute_cloud_action` |
| `suggest_next_step` | `expose_secrets` |
| `explain_concept` | `bypass_approval_gates` |
| `provide_partial_example` | |

Rate limit: 10 requests/session. System prompt enforces guidance-only mode.

---

## Seed Labs

| Lab ID | Title | Category | Difficulty | XP | Type |
|---|---|---|---|---|---|
| `lab-agent-manifest-v1` | Design Your First AI Agent Manifest | ai-agent-creation | intermediate | 250 | agent-config |
| `lab-devops-cicd-v1` | Build a CI/CD Pipeline Configuration | devops | intermediate | 200 | agent-config |
| `lab-webdev-landing-v1` | Build an Enterprise Landing Page | web-development | beginner | 150 | browser |

---

## Next Steps / Roadmap

- [ ] `npm install monaco-editor` and wire Monaco into `LabCodeEditorComponent`
- [ ] Merge `firestore.rules.lab-engine.rules` into `firestore.rules`
- [ ] Merge `storage.rules.lab-engine.rules` into `storage.rules`
- [ ] Run `node scripts/seed-labs.mjs` against Firebase Emulator
- [ ] Add XP award Cloud Function triggered on `labSubmissions` create
- [ ] Add Firestore index: `labSessions` — `userId ASC, labId ASC, startedAt DESC`
- [ ] Add Firestore index: `labSubmissions` — `instructorReviewStatus ASC, submittedAt DESC`
- [ ] Add container terminal support (Cloud Run sandboxed exec)
- [ ] Wire Monaco syntax highlighting for TypeScript/Angular templates
- [ ] Add lab search/full-text index via Algolia or Firestore array-contains

---

## Sprint Completed: Cart, Guest Access, Newsletter Editor, & Org Courses Visibility

- **Cart Item Removal**: Integrated `removeOffer` backend synchronization and styled "Remove" action buttons in the cart view, refactoring the page to native control flow.
- **Guest Course Access**: Fixed the route guard check in `openCourse` to prevent player entry blockages. Modified `firestore.rules` to allow guest progress updates, and adjusted `grantPurchasedAccessInternal` to write to both guest and standard enrollments.
- **Organization Courses Visibility**: Solved the collection mismatch where the super-admin writes assignments to `courses` and the organization admin reads from `assignedCourses`. The super-admin now writes to both collections, and the organization admin service merges them for backward compatibility.
- **Newsletter Authoring Studio**: Upgraded the mock view to a fully functional creation/editing workspace. Enabled template and audience segment linkages, approval state changes, and live email/SMS test dispatches.