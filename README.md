
<div align="center">
  <img alt="Innovacare Training Logo" src="static/logo.png" width="180px">
  <h1>Innovacare Training</h1>
  <p><strong>Integrated Healthcare Training, Compliance & Global Nurse Licensing Platform</strong></p>
  <p><em>Professional learning infrastructure for nurses, healthcare organizations, tutors, and global licensing candidates</em></p>
</div>

---

## 📌 Project Overview: The Vision

**Innovacare Training** is not just an online course platform. It is a professional healthcare education ecosystem designed to support nurses, healthcare organizations, tutors, and internationally trained professionals through structured learning, compliance training, exam preparation, and workforce development.

The platform is built around a dual-purpose model:

1. **Individual Learner Layer:**  
   Supports nurses and healthcare professionals preparing for exams such as NCLEX, DHA, DOH, HAAD, Prometric, and other international licensing pathways. Learners can access structured courses, videos, quizzes, simulations, certificates, and progress tracking.

2. **Organization Training Layer:**  
   Enables healthcare agencies, clinics, home care providers, SNFs, hospitals, and training institutions to assign courses, monitor employee progress, manage compliance education, issue certificates, and maintain training records.

Innovacare Training is designed to become a premium, scalable, and enterprise-ready platform for healthcare education, continuing medical education, clinical competency development, and global nurse licensing preparation.

---

## 🛠 Detailed Technical Stack

The architecture is built for scalability, security, performance, and a modern SaaS learning experience.

### 🎨 Frontend & UI Framework

* **Framework:** Angular with standalone components for a modular, scalable, and enterprise-grade frontend architecture.
* **Design System:** Bootstrap 5.3, Angular Material, and custom premium UI components for a clean, modern, healthcare-focused learning interface.
* **Responsive Experience:** Fully optimized for desktop, tablet, and mobile learners.
* **Brand Identity:** Professional blue, white, and healthcare-inspired accent colors with a modern SaaS visual style.
* **User Experience:** Course cards, progress bars, dashboards, certification flows, organization portals, tutor pages, and marketplace-style course presentation.

---

### 🔐 Authentication & User Management

* **Identity Provider:** Firebase Authentication.
* **Role-Based Access Control:** Supports multiple user roles including:

  * `STUDENT`
  * `TUTOR`
  * `ORG_ADMIN`
  * `INSTRUCTOR`
  * `SUPER_ADMIN`
  * `HEALTHCARE_STAFF`

* **Multi-Tenant Logic:** Organization-based access control allowing each company or healthcare agency to manage its own users, courses, assignments, and reports.
* **Secure Access:** Protected routes, authenticated learning areas, and admin-only management screens.

---

### 🗂 Data & Backend Infrastructure

* **Database:** Firebase Firestore for real-time data management.
* **Storage:** Firebase Storage and Cloudinary for course images, certificates, documents, thumbnails, and media assets.
* **Backend:** Firebase Cloud Functions and Cloud Run for scalable server-side operations.
* **Payments:** Stripe integration for paid courses, training packages, subscriptions, and marketplace offers.
* **PDF Generation:** Server-side certificate and report generation for professional downloadable documents.

---

## 🚀 Core Module Specifications

| Module | Purpose | Real-World Application |
| :--- | :--- | :--- |
| **Course Management** | Create, edit, publish, and organize courses | Build structured training programs for nurses, organizations, and licensing candidates. |
| **Learner Dashboard** | Track progress, courses, quizzes, and certificates | Gives each learner a clear view of their training journey. |
| **Organization Portal** | Manage employees and assign training | Allows healthcare agencies to train and monitor their staff. |
| **Tutor Marketplace** | Allow tutors to join and teach | Creates a professional space for nurse educators and instructors. |
| **Global Nurse Licensing Pack** | Licensing preparation for USA, Canada, UAE, Qatar, and other destinations | Helps internationally trained nurses understand pathways, exam preparation, and documentation steps. |
| **Quiz & Simulation Engine** | Practice questions, NGN-style cases, timed exams, and remediation | Supports NCLEX-style preparation and competency validation. |
| **Certificate Engine** | Generate certificates after course completion | Provides proof of training for learners and organizations. |
| **Compliance Training Library** | Policies, procedures, and mandatory training | Supports healthcare organizations with staff education and audit readiness. |
| **Analytics & Reports** | Track performance, completion rates, and training outcomes | Helps admins measure learner engagement and compliance. |
| **Marketplace Offers** | Sell public courses and training bundles | Enables scalable revenue through individual and organizational purchases. |

---

## 🎓 Learning Experience

Innovacare Training is designed to feel like a premium healthcare education platform, not a generic LMS.

Learners can:

* Enroll in professional courses.
* Watch structured video lessons.
* Complete quizzes and case studies.
* Track their progress.
* Unlock final exams.
* Receive certificates after successful completion.
* Access global licensing guidance.
* Prepare for NCLEX, DHA, DOH, HAAD, Prometric, and other exams.
* Learn from qualified nurse tutors and healthcare educators.

---

## 🏥 Organization Training Experience

Healthcare organizations can use Innovacare Training to train and monitor staff in a structured way.

Organizations can:

* Create employee accounts.
* Assign mandatory training.
* Monitor completion status.
* View compliance reports.
* Issue certificates.
* Upload internal policies and procedures.
* Train new hires during onboarding.
* Maintain documentation for audits and quality assurance.

This makes Innovacare Training suitable for:

* Home care agencies
* Private home care providers
* Skilled nursing facilities
* Hospice agencies
* Clinics
* Hospitals
* Nursing schools
* International nurse recruitment programs
* Continuing education providers

---

## 🌍 Global Nurse Licensing Focus

Innovacare Training includes a dedicated pathway for internationally trained nurses who want to prepare for global opportunities.

The platform supports educational content around:

* NCLEX preparation
* USA nursing licensure roadmap
* Canada nursing pathway
* UAE DHA / DOH / HAAD preparation
* Qatar and Gulf licensing guidance
* Credential evaluation education
* Exam strategy
* English and professional readiness
* Documentation planning
* Career transition support

The goal is not to replace licensing boards, but to help nurses understand the process, prepare better, avoid confusion, and follow a structured roadmap.

---

## 📊 Analytics & Reporting

Innovacare Training includes an analytics layer for both learners and organizations.

### Learner Analytics

* Course progress
* Quiz scores
* Exam attempts
* Completion percentage
* Certificates earned
* Weak areas and remediation needs

### Organization Analytics

* Employee training completion
* Course assignment status
* Compliance readiness
* Department-level progress
* Certificate records
* Training performance trends

---

## 💳 Payments & Marketplace

Innovacare Training supports a monetization model through Stripe.

Possible revenue streams include:

* Individual course purchases
* Licensing preparation packs
* Monthly subscriptions
* Organization training plans
* Tutor-led programs
* Premium certification bundles
* Continuing education packages
* Global nurse licensing starter packs

The marketplace model allows selected courses and programs to be published publicly, purchased securely, and accessed immediately by enrolled learners.

---

## ⚙️ Development & Deployment

### Prerequisites

* **Runtime:** Node.js LTS version
* **Frontend:** Angular CLI
* **Backend:** Firebase project configured
* **Database:** Firestore enabled
* **Storage:** Firebase Storage or Cloudinary configured
* **Payments:** Stripe account and API keys
* **Hosting:** Firebase Hosting or Cloud Run deployment

---

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Build production version
ng build

# Deploy to Firebase Hosting
firebase deploy


# Innovacare Training

Plateforme Angular + Firebase orientee formation clinique, avec isolation stricte multi-tenant par organisation et experiences dediees pour Super Admin, Org Admin, Manager, Learner et Guest.

## Architecture Intent

- Tous les donnees organisationnelles vivent sous organizations/{orgId}/...
- Les ecrans administratifs consomment des services de domaine (assignments, progress, overdue, policies, alerts, audit, troubleshooting, reports)
- Les routes et regles Firestore appliquent les frontieres de role et de tenant

## Data Flow (diagramme texte)

```text
[UI Feature Pages]
	|
	v
[Org Domain Services]
	|
	v
[Org Context + Access Guards]
	|
	v
[Firestore Paths: organizations/{orgId}/subcollections]
	|
	v
[Firestore Rules: role + org boundary enforcement]
```

Interpretation:
- La page ne lit jamais directement en dehors du contexte orgId actif
- Le service definit le contrat metier, le guard protege le trajet, la regle Firestore valide en dernier recours

## Learning Analytics Model (diagramme texte)

```text
[Course Assignments] + [Enrollments] + [Policy Acknowledgments]
				 |
				 v
		[Progress Aggregation Layer]
				 |
		 +-------+--------+
		 |                |
		 v                v
[Learner Progress KPIs] [Overdue Detection]
		 |                |
		 +-------+--------+
				 v
	   [Org Dashboard Learning Health]
```

KPI cibles:
- completion rate
- overdue rate
- policy acknowledgment rate
- learner risk segmentation

## Program Intelligence Model (diagramme texte)

```text
[Program Catalog] --> [Assigned Courses by Org] --> [Adoption Signals]
								  |                     |
								  v                     v
						 [Program Performance] --> [Intelligence Insights]
													  |
													  v
									[Recommendations: keep / optimize / retire]
```

Decision outputs:
- programmes a forte adherence
- programmes sous-performants par population
- ecarts entre assignation et completion effective

## Admin BI Model (diagramme texte)

```text
[Operational Streams]
 - alerts
 - follow-up actions
 - audit logs
 - troubleshooting issues
 - reports snapshots
			|
			v
[Admin BI Lens]
 - severity distribution
 - open vs resolved workload
 - compliance posture
 - incident recurrence
			|
			v
[Admin Actions]
 - prioritize
 - assign
 - remediate
 - communicate
```

Valeur metier:
- passer d une interface de consultation a un cockpit de pilotage

## Enrollment -> Dashboard Lifecycle (diagramme texte)

```text
1) Enrollment created
2) Assignment linked to learner and org context
3) Learning events update progress
4) Rules compute overdue and compliance signals
5) Alerts/follow-up raised when thresholds are crossed
6) Dashboard refreshes KPIs and recommendations
7) Admin closes the loop with remediation actions
```

Ce lifecycle formalise la boucle:
- planifier
- executer
- mesurer
- corriger

## Runbook

### Development

```bash
ng serve
```

### Build

```bash
ng build
```

### Tests

```bash
ng test
```

Environment Configuration

The application requires environment configuration for Firebase, Stripe, and media services.

Example environment variables:

firebaseConfig: {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
}

stripePublicKey: ""
checkoutBridgeUrl: ""
cloudinaryCloudName: ""

🔐 Security & Compliance

Innovacare Training is built with security and role separation in mind.

The platform should enforce:

Authenticated access for learners and staff.
Organization-level data separation.
Admin-only course publishing.
Secure payment workflows.
Protected certificate generation.
Controlled access to private training content.
Firestore security rules for multi-tenant protection.
Audit-friendly training records.

For healthcare organizations, Innovacare Training supports compliance education and documentation readiness, but each organization remains responsible for validating content against its own state, federal, payer, and accreditation requirements.

🧠 Strategic Purpose

Innovacare Training is designed to become a complete healthcare education and workforce development platform.

Its long-term purpose is to support:

African and international nurses preparing for global licensing.
Nurse tutors who want to teach professionally.
Healthcare organizations that need structured staff training.
Private home care and wound care agencies needing compliance education.
Students who need guided exam preparation.
Employers who need proof of competency and training completion.

Innovacare Training combines education, technology, compliance, and professional development into one scalable platform.

⚖️ License & Ownership

This software is developed under the InnovacareReview / Innovacare Training brand.

Copyright © 2026 Innovacare Training / InnovacareReview.
All Rights Reserved.