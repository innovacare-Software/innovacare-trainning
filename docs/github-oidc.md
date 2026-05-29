# GitHub OIDC

## Purpose

This repository uses GitHub OIDC with Google Workload Identity Federation to deploy Firebase Hosting and Cloud Functions Gen2 without service account JSON keys.

Repository identity:

- GitHub organization: `innovacare-Software`
- Repository: `innovacare-trainning`

## Required GitHub Variables

- `FIREBASE_PROJECT_ID_STAGING`
- `FIREBASE_PROJECT_ID_PRODUCTION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_PRODUCTION`
- `GCP_SERVICE_ACCOUNT_EMAIL_STAGING`
- `GCP_SERVICE_ACCOUNT_EMAIL_PRODUCTION`

## Required GitHub Environments

- `staging`
- `production`

The `production` environment must require approval.

## Required GitHub Secrets

- `STRIPE_SECRET_KEY_STAGING`
- `STRIPE_WEBHOOK_SECRET_STAGING`
- `STRIPE_SECRET_KEY_PRODUCTION`
- `STRIPE_WEBHOOK_SECRET_PRODUCTION`

These are runtime-sensitive values. They do not replace Google authentication.

## Workflow Permission Model

Deployment workflows require:

- `contents: read`
- `id-token: write`

Authentication is performed with `google-github-actions/auth@v2` and the repository variables already configured for staging and production.

## GCP Setup Sequence

### 1. Create a Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-actions \
  --project=<project-id> \
  --location=global \
  --display-name="GitHub Actions"
```

### 2. Create staging and production OIDC providers

```bash
gcloud iam workload-identity-pools providers create-oidc github-oidc-staging \
  --project=<staging-project-id> \
  --location=global \
  --workload-identity-pool=github-actions \
  --display-name="GitHub OIDC Staging" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='innovacare-Software/innovacare-trainning' && assertion.ref=='refs/heads/develop'"

gcloud iam workload-identity-pools providers create-oidc github-oidc-production \
  --project=<production-project-id> \
  --location=global \
  --workload-identity-pool=github-actions \
  --display-name="GitHub OIDC Production" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='innovacare-Software/innovacare-trainning' && assertion.ref=='refs/heads/main'"
```

### 3. Create service accounts

```bash
gcloud iam service-accounts create github-deploy-staging \
  --project=<staging-project-id> \
  --display-name="GitHub staging deployer"

gcloud iam service-accounts create github-deploy-production \
  --project=<production-project-id> \
  --display-name="GitHub production deployer"
```

### 4. Grant Workload Identity User access

```bash
gcloud iam service-accounts add-iam-policy-binding github-deploy-staging@<staging-project-id>.iam.gserviceaccount.com \
  --project=<staging-project-id> \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<staging-project-number>/locations/global/workloadIdentityPools/github-actions/attribute.repository/innovacare-Software/innovacare-trainning"

gcloud iam service-accounts add-iam-policy-binding github-deploy-production@<production-project-id>.iam.gserviceaccount.com \
  --project=<production-project-id> \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<production-project-number>/locations/global/workloadIdentityPools/github-actions/attribute.repository/innovacare-Software/innovacare-trainning"
```

### 5. Grant baseline IAM roles

- `roles/firebasehosting.admin`
- `roles/cloudfunctions.developer`
- `roles/run.developer`
- `roles/iam.serviceAccountUser`
- `roles/firebaserules.admin`
- `roles/logging.viewer`

Additional Cloud Build or Artifact Registry permissions may be needed depending on the target project policy model.

## Workflow Behavior

- `.github/workflows/deploy-staging.yml` authenticates with the staging provider and service account
- `.github/workflows/deploy-production.yml` authenticates with the production provider and service account
- neither workflow uses JSON keys or `FIREBASE_TOKEN`

## Troubleshooting

- `unauthorized_client`: provider conditions do not match repository or branch claims
- `permission denied`: target service account lacks Firebase, Cloud Run, rules, or build-path IAM roles
- missing OIDC token: workflow permissions do not include `id-token: write`
- wrong target project: GitHub Variables contain the wrong project ID or provider resource path
