# Google Credential Rotation

## Immediate action

- Remove any tracked service account JSON from Git history going forward.
- Rotate the service account key if the file was ever shared outside a trusted local machine.
- Prefer GitHub OIDC and Workload Identity Federation for deployments instead of long-lived JSON keys.

## Identify the impacted service account

- Open the JSON locally and note the `client_email` value.
- In Google Cloud Console, go to IAM & Admin -> Service Accounts.
- Locate the matching service account.

## Revoke existing keys

- Open the service account.
- Go to the `Keys` tab.
- Delete the compromised or repository-backed key.
- If you are unsure whether the key is still in use, create a replacement only for the shortest possible migration window.

## Replace deployment authentication

- Use the OIDC setup documented in [docs/github-oidc-wif.md](docs/github-oidc-wif.md).
- Remove any GitHub secret that contains Google service account JSON.
- Verify staging deploys successfully before touching production.

## Validate after rotation

- Run the staging deployment workflow.
- Confirm Firebase Hosting deployment succeeds.
- Confirm Cloud Functions deployment succeeds.
- Confirm Firestore rules deployment still works when rule files change.
- Confirm no workflow references legacy JSON credentials anymore.

## Recommended follow-up

- Review repository history and release artifacts for accidental credential exposure.
- If the JSON was ever pushed to a shared remote, treat it as compromised.
- Rotate any adjacent credentials stored in the same local bundle if present.