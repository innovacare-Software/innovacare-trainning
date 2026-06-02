# Deployment Runbook

## Scope

This runbook covers CI validation, staging deployment, production deployment, security operations, rollback, monitoring, and troubleshooting for Innovacare Training.

## Preconditions

Before the first deployment:

- GitHub Variables are configured for staging and production
- GitHub Environments `staging` and `production` exist
- the `production` environment requires approval
- Workload Identity Federation providers and service accounts exist in Google Cloud
- service accounts have the required IAM roles
- Stripe runtime secrets exist in Firebase Functions secrets or Secret Manager

## CI Procedure

Workflow: `.github/workflows/ci.yml`

Sequence:

1. install dependencies in root, `functions`, and `innovacare-training`
2. run lint
3. run type checks
4. run Angular unit tests
5. build the Angular production bundle
6. build both Functions codebases
7. run Firestore rules smoke test
8. run dependency audit
9. run tracked-file secret detection

Any failing step blocks merge or promotion.

## Staging Deployment

Workflow: `.github/workflows/deploy-staging.yml`

Trigger:

- push to `develop`

Execution flow:

1. run reusable CI as a gate
2. authenticate with GitHub OIDC and the staging Workload Identity Provider
3. rebuild frontend and Functions
4. deploy Hosting and Functions to `vars.FIREBASE_PROJECT_ID_STAGING`
5. if Firestore rules or indexes changed, run the smoke test and deploy them
6. if `storage.rules` changed, deploy Storage rules

Post-deploy checks:

- open the staging Hosting URL
- verify login and core learner navigation
- validate a business-critical flow
- inspect Cloud Logging for new deployment-time errors

## Production Deployment

Workflow: `.github/workflows/deploy-production.yml`

Trigger:

- manual `workflow_dispatch`

Protection gates:

- branch must be `main`
- GitHub `production` environment approval must pass

Execution flow:

1. validate branch guard
2. run reusable CI as a gate
3. authenticate with GitHub OIDC and the production Workload Identity Provider
4. rebuild frontend and Functions
5. deploy Hosting and Functions to `vars.FIREBASE_PROJECT_ID_PRODUCTION`
6. deploy Firestore rules, indexes, and Storage rules only when those files changed

Release verification:

- verify live site availability
- verify auth and a core learner journey
- verify payment webhook health
- inspect Cloud Logging and Error Reporting for new exceptions

## Security Operations

Workflow: `.github/workflows/security-scan.yml`

Provides:

- GitHub dependency review on pull requests
- `npm audit` reports for root and both Functions codebases
- tracked secret detection
- Trivy vulnerability, secret, and config scanning
- SARIF upload to GitHub Security
- downloadable artifacts for reports

## Rollback

### Hosting rollback

Preferred options:

1. redeploy the last stable commit from `main`
2. use Firebase Hosting version history if your release policy allows it

Validation after rollback:

- homepage loads
- assets resolve correctly
- no fresh Hosting error spike appears

### Functions rollback

Preferred option:

1. identify the last known-good commit on `main`
2. redeploy that commit through the production workflow

If one commit caused the failure, revert only that commit and redeploy.

Validation after rollback:

- callable and HTTP Functions respond
- Stripe webhooks are healthy
- no startup crash appears in Cloud Logging

## Monitoring

Observe after every release:

- Cloud Logging for exception bursts and permission errors
- Cloud Monitoring dashboards for Functions errors, latency, and saturation
- Error Reporting for new server-side exception groups
- Firebase Analytics for release regressions in user journeys

Recommended alerts:

- Functions error rate spike
- Hosting error or latency spike
- Stripe webhook failure spike
- Firestore permission denial spike
- Storage permission denial spike

## Troubleshooting

### OIDC authentication fails

- verify provider resource names in GitHub Variables
- verify branch conditions on the provider
- verify `roles/iam.workloadIdentityUser` binding on the target service account

### Functions deployment fails

- verify Cloud Build and Artifact Registry permissions
- verify required runtime secrets exist in the target project

### Rules were not deployed

- verify filenames are exactly `firestore.rules`, `firestore.indexes.json`, and `storage.rules`
- verify those files changed in the pushed commit range

### Security workflow fails

- read uploaded audit JSON files and SARIF findings
- remediate direct dependencies first, then reassess transitives