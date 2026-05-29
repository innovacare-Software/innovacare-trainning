# Incident Response

## Detection

- Start with the failing symptom: user report, uptime alert, payment failure, GitHub deployment failure, or elevated error rate.
- Confirm whether the issue affects staging only, production only, or both.
- Determine whether the issue is isolated to frontend, Firebase Hosting, Cloud Functions, Firestore rules, Stripe, or optional Cloud Run services.

## Where to investigate

- Firebase Hosting: Firebase Console -> Hosting -> release history and associated deployment.
- Cloud Functions: Firebase Console -> Functions -> Logs, or Google Cloud Console -> Logging -> Logs Explorer with resource type `cloud_function` or `cloud_run_revision` for 2nd gen functions.
- Firestore and security rules: Firebase Console -> Firestore -> Rules and usage dashboards.
- Cloud Run, if used: Google Cloud Console -> Cloud Run -> service -> Revisions, Logs, Metrics.
- Stripe webhook failures: Stripe Dashboard -> Developers -> Webhooks -> endpoint deliveries and failed events.
- GitHub Actions: repository Actions tab for CI, staging deploy, production deploy, and CodeQL results.

## Severity classification

- Sev 1: total production outage, payment breakage for all users, authentication outage, or broad data access/security incident.
- Sev 2: major production degradation affecting a core workflow or a large tenant segment.
- Sev 3: limited production defect with workaround, or staging-only issue blocking release.
- Sev 4: cosmetic defect, isolated admin issue, or non-blocking monitoring noise.

## Initial containment

- Freeze further deployments until the blast radius is understood.
- If the issue was introduced by the latest release, execute the rollback plan in [docs/rollback-plan.md](docs/rollback-plan.md).
- Revoke or rotate compromised credentials immediately if exposure is suspected.
- For Stripe issues, pause affected fulfillment logic if there is risk of duplicate access grants or inconsistent order state.

## Communication

- Open an incident channel with engineering, product, and support.
- Share current severity, impact, start time, probable scope, and next update time.
- If customers are affected, publish a clear user-facing update with impact, workaround if any, and next communication checkpoint.
- Do not expose secrets, raw tokens, or personally identifiable information in status updates.

Communication template:

```text
Status: Investigating
Severity: Sev <1-4>
Impact: <short user-facing summary>
Started: <UTC timestamp>
Current scope: <systems / tenants / workflows>
Workaround: <if available>
Next update: <UTC timestamp>
```

## Root cause analysis

- Record timeline, triggering change, detection point, impact scope, and remediation steps.
- Capture links to GitHub Actions runs, Firebase deploy history, logs, and Stripe event IDs.
- Identify whether the failure source was code, configuration, secret rotation, dependency vulnerability, deployment process, or external provider behavior.
- Document the prevention action: test coverage, alerting, secret handling, rule validation, release guard, or runbook update.

Root cause analysis template:

```text
Incident summary:
Customer impact:
Start time:
End time:
Detection source:
Triggering change:
Root cause:
Mitigation:
Rollback used:
Prevention actions:
Owners and due dates:
```