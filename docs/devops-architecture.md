# DevOps Architecture

## Overview

Innovacare Training uses GitHub Actions as the CI/CD control plane and Firebase as the runtime platform for the Angular 20 application and Cloud Functions Gen2 workloads.

Core runtime services:

- Angular 20 frontend served from Firebase Hosting
- Firebase Authentication for identity and session management
- Firestore for application data and security rules
- Firebase Storage for learner and platform file assets
- Cloud Functions Gen2 for backend APIs, automation, Stripe callbacks, and scheduled operations
- Stripe for checkout and webhook-driven payment flows

Repository scope:

- GitHub organization: `innovacare-Software`
- Repository: `innovacare-trainning`
- Delivery branch for this implementation: `devops/setup-ci-cd`

## Environments

The delivery model uses two target environments:

- `staging`
- `production`

GitHub repository variables provide non-sensitive deployment settings:

- `FIREBASE_PROJECT_ID_STAGING`
- `FIREBASE_PROJECT_ID_PRODUCTION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_PRODUCTION`
- `GCP_SERVICE_ACCOUNT_EMAIL_STAGING`
- `GCP_SERVICE_ACCOUNT_EMAIL_PRODUCTION`

GitHub secrets provide only sensitive CI/CD references for Stripe:

- `STRIPE_SECRET_KEY_STAGING`
- `STRIPE_WEBHOOK_SECRET_STAGING`
- `STRIPE_SECRET_KEY_PRODUCTION`
- `STRIPE_WEBHOOK_SECRET_PRODUCTION`

Runtime secrets remain in Firebase Functions v2 secrets or Google Secret Manager.

## Branch and Promotion Model

- `feature/*` branches merge into `develop`
- `develop` is the integration branch and automatically deploys to staging after CI success
- `main` is the release branch
- production deployment is manual and gated by the `production` GitHub Environment

## Pipeline Design

### Continuous Integration

Workflow: `.github/workflows/ci.yml`

Triggers:

- pull requests to `develop`
- pull requests to `main`
- pushes to `develop`
- pushes to `main`
- workflow reuse from deployment workflows

Quality gates:

- `npm ci` in root and both Functions codebases
- lint
- type check
- Angular unit tests
- Angular production build
- Functions builds
- Firestore rules smoke test
- dependency audit
- tracked secret pattern detection

### Security Scanning

Workflow: `.github/workflows/security-scan.yml`

Capabilities:

- GitHub dependency review on pull requests
- `npm audit` JSON reports for root and both Functions codebases
- tracked-file secret detection
- Trivy filesystem scan for vulnerabilities, secrets, and configuration risks
- SARIF upload into GitHub code scanning
- artifact upload for downloadable reports

### Staging Deployment

Workflow: `.github/workflows/deploy-staging.yml`

Behavior:

- runs on push to `develop`
- reuses CI as the quality gate
- authenticates through GitHub OIDC and Google Workload Identity Federation
- deploys Hosting and Functions to `vars.FIREBASE_PROJECT_ID_STAGING`
- deploys Firestore rules and indexes only when those files changed
- deploys Storage rules only when `storage.rules` changed

### Production Deployment

Workflow: `.github/workflows/deploy-production.yml`

Behavior:

- runs only with `workflow_dispatch`
- blocks execution unless the ref is `main`
- requires the `production` environment approval gate
- authenticates through GitHub OIDC and Google Workload Identity Federation
- deploys Hosting and Functions to `vars.FIREBASE_PROJECT_ID_PRODUCTION`
- conditionally deploys Firestore and Storage rules on changed files

## Security Controls

- no `FIREBASE_TOKEN`
- no long-lived service account JSON keys in workflows
- no hardcoded deploy credentials in repository files
- least-privilege workflow permissions
- environment-based approval for production
- GitHub code scanning integration through SARIF upload

## Monitoring

Operational visibility is built around:

- Cloud Logging for Hosting, Functions, and Firebase platform logs
- Cloud Monitoring for metrics, alerting, and dashboarding
- Error Reporting for server-side exceptions
- Firebase Analytics for release validation and business funnel monitoring

Recommended alerts:

- Functions 5xx spike
- Hosting error spike
- Stripe webhook failures
- auth error spike
- Firestore or Storage permission denial spike

## Rollback Strategy

- Hosting rollback uses Firebase Hosting history or redeployment of the last stable commit
- Functions rollback uses redeployment of the last known-good release from `main`
- rules rollback uses Git revert plus targeted `firebase deploy --only` commands

Operational procedures are documented in `docs/deployment-runbook.md`.
