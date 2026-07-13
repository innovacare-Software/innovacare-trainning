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

## Mobile App

Innovacare Training ships as a mobile app two ways, both built from this same
Angular codebase.

### Progressive Web App (PWA)

A production build (`ng build --configuration production`) registers a service
worker (`@angular/service-worker`) and installable web manifest
(`public/manifest.webmanifest`). Users can install the app from the browser
("Add to Home Screen" on Android/iOS, the install icon on desktop Chrome/Edge)
with offline app-shell caching. Configuration lives in `ngsw-config.json`.

The service worker is disabled in dev mode (`isDevMode()`), so `ng serve`
behaves as before.

### Native apps via Capacitor

[Capacitor](https://capacitorjs.com) wraps the built web app into native
Android and iOS projects under `android/` and `ios/`. `capacitor.config.ts`
points Capacitor at the compiled output (`dist/myapp/browser`).

```bash
# Build the web app, copy it into the native projects, and open Android Studio
npm run cap:open:android

# Build the web app, copy it into the native projects, and open Xcode
npm run cap:open:ios

# Build + sync only (CI, or before running from the IDE)
npm run cap:sync
```

Requirements: Android Studio + JDK for Android, Xcode (macOS only) for iOS.

**Known follow-ups for native builds:**
- Google sign-in currently uses `signInWithPopup` (`src/app/core/auth.ts`),
  which does not work reliably inside a native WebView. Native Google auth
  should move to a Capacitor-aware flow (e.g. `@capacitor-firebase/authentication`
  or an in-app browser + redirect) before shipping to app stores.
- The generated app icons/splash screens (`public/icons/`) are Angular CLI
  placeholders and should be replaced with Innovacare branding before release.
