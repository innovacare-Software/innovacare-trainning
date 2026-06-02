# Rollback Plan

## Decision trigger

- Roll back when production errors are customer-visible, security-relevant, financially risky, or not recoverable within the agreed incident window.

## Firebase Hosting rollback

- Identify the last known good Hosting release in the Firebase Console or deployment history.
- Redeploy the last stable git commit if you need a reproducible infrastructure and application state.
- If a rapid rollback is required, use Firebase Hosting release history or clone the previous live version with the Firebase CLI.

Example:

```bash
firebase hosting:clone <production-project-id>:live <production-project-id>:rollback-YYYYMMDDHHMM
firebase deploy --project <production-project-id> --only hosting
```

## Cloud Functions rollback

- Revert the offending commit or checkout the last stable tag on `main`.
- Rebuild both Functions codebases locally or in CI.
- Redeploy only Functions to production after approval.

Example:

```bash
git revert <bad-commit>
npm run deploy:production
firebase deploy --project <production-project-id> --only functions
```

## Cloud Run rollback, if used

- Open Google Cloud Console -> Cloud Run -> service -> Revisions.
- Route traffic back to the previous healthy revision.
- Confirm request latency, error rate, and startup health before closing the incident.

## Source control rollback

- Prefer `git revert` for shared branches instead of history rewrites.
- If production was deployed from `main`, revert on `main`, let CI pass again, and then trigger the protected production workflow.

## Last stable redeploy

- Redeploy the last stable commit from `main` when rollback must restore both Hosting and Functions consistently.
- Re-run smoke tests for authentication, dashboard access, and payment entry points.

## Verification after rollback

- Confirm Firebase Hosting serves the expected frontend version.
- Confirm critical Cloud Functions endpoints respond successfully.
- Confirm Stripe webhook delivery is green for new events.
- Confirm error monitoring and uptime checks have returned to baseline.

Post-rollback verification checklist:

- Authentication works for a staging-style smoke account.
- Protected dashboards load for expected roles.
- Firestore reads and writes still respect tenant boundaries.
- Storage upload and read flows still behave as expected if the feature is enabled.
- Payment entry points load and no new Stripe webhook failures appear.