# GitHub OIDC and Google Workload Identity Federation

This repository deploys to Firebase and Google Cloud with GitHub OIDC and Workload Identity Federation. Do not use `FIREBASE_TOKEN` and do not store service account JSON keys in GitHub unless you have no alternative.

## GitHub Variables required

- `FIREBASE_PROJECT_ID_STAGING`
- `FIREBASE_PROJECT_ID_PRODUCTION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_PRODUCTION`
- `GCP_SERVICE_ACCOUNT_EMAIL_STAGING`
- `GCP_SERVICE_ACCOUNT_EMAIL_PRODUCTION`

## GitHub Environments required

- `staging`
- `production`

The `production` environment must enforce manual approval before deployment.

## 1. Create a Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-actions \
  --project=<gcp-project-id> \
  --location=global \
  --display-name="GitHub Actions"
```

## 2. Create an OIDC provider for GitHub Actions

```bash
gcloud iam workload-identity-pools providers create-oidc github-oidc \
  --project=<gcp-project-id> \
  --location=global \
  --workload-identity-pool=github-actions \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.repository_owner=assertion.repository_owner"
```

Provider resource format:

```text
projects/<project-number>/locations/global/workloadIdentityPools/github-actions/providers/github-oidc
```

## 3. Restrict access to the correct GitHub repository

Use principal conditions based on `attribute.repository` and, if desired, branch-specific restrictions based on `attribute.ref`.

Recommended repository scope:

```text
attribute.repository/<github-owner>/<github-repo>
```

Optional branch scope examples:

- staging branch: `attribute.ref/refs/heads/develop`
- production branch: `attribute.ref/refs/heads/main`

## 4. Create or use a staging deployer service account

Example:

```bash
gcloud iam service-accounts create github-deploy-staging \
  --project=<staging-project-id> \
  --display-name="GitHub staging deployer"
```

## 5. Create or use a production deployer service account

Example:

```bash
gcloud iam service-accounts create github-deploy-production \
  --project=<production-project-id> \
  --display-name="GitHub production deployer"
```

## 6. Grant minimum IAM roles required

Start with least privilege and expand only if the deployment shows a concrete missing permission.

Typical baseline for this repository:

- `roles/firebasehosting.admin`
- `roles/cloudfunctions.developer`
- `roles/run.developer` if Cloud Run is deployed directly or used by 2nd gen Functions troubleshooting workflows
- `roles/iam.serviceAccountUser`
- `roles/firebaserules.admin` or the equivalent role used in your organization to deploy Firestore and Storage rules
- `roles/logging.viewer`

You may also need additional build-path roles depending on how your Firebase project is configured, especially for Cloud Build or Artifact Registry during Functions deployments.

## 7. Bind GitHub OIDC principals to the correct service accounts

Repository-wide example:

```bash
gcloud iam service-accounts add-iam-policy-binding github-deploy-staging@<project-id>.iam.gserviceaccount.com \
  --project=<staging-project-id> \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<project-number>/locations/global/workloadIdentityPools/github-actions/attribute.repository/<github-owner>/<github-repo>"
```

Branch-restricted example for production:

```bash
gcloud iam service-accounts add-iam-policy-binding github-deploy-production@<project-id>.iam.gserviceaccount.com \
  --project=<production-project-id> \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<project-number>/locations/global/workloadIdentityPools/github-actions/attribute.repository/<github-owner>/<github-repo>"
```

If you need stronger separation, create separate providers or IAM conditions per branch and environment.

## 8. GitHub Variables to configure

- `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING`
- `GCP_WORKLOAD_IDENTITY_PROVIDER_PRODUCTION`
- `GCP_SERVICE_ACCOUNT_EMAIL_STAGING`
- `GCP_SERVICE_ACCOUNT_EMAIL_PRODUCTION`
- `FIREBASE_PROJECT_ID_STAGING`
- `FIREBASE_PROJECT_ID_PRODUCTION`

## 9. Stripe and other runtime secrets

Google deployment authentication is separate from runtime application secrets.

Keep runtime secrets out of the repository and out of frontend bundles:

- `STRIPE_SECRET_KEY_STAGING`
- `STRIPE_SECRET_KEY_PRODUCTION`
- `STRIPE_WEBHOOK_SECRET_STAGING`
- `STRIPE_WEBHOOK_SECRET_PRODUCTION`

For this repository, the safest runtime model is Firebase Functions v2 secrets or Google Secret Manager backing the Functions runtime. GitHub Secrets should be used for CI/CD-only operations, not as a frontend delivery mechanism and not as a substitute for runtime secret storage inside Firebase Functions.

## 10. Warning against service account JSON keys

- Do not commit service account JSON files.
- Do not store long-lived service account JSON in GitHub Secrets when OIDC can be used.
- If a JSON key was ever committed, rotate it and remove it from version control.