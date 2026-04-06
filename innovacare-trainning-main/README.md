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
