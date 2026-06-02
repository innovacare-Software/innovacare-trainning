# Release Checklist

## Branch and approval

- Confirm the release branch strategy is respected: `feature/*` -> `develop`, `hotfix/*` -> `main` or `develop` as appropriate.
- Confirm the release candidate commit is already deployed to staging from `develop`.
- Confirm the GitHub `production` environment approval is ready before triggering production deployment.

## Authentication

- Verify user signup works in staging.
- Verify user login works in staging.
- Verify password reset works in staging.
- Verify role-based access behaves correctly for learner, admin, and super-admin accounts.

## App workflows

- Verify the client dashboard loads and key actions complete successfully.
- Verify the admin dashboard loads and management actions complete successfully.
- Verify the super-admin dashboard loads and privileged actions complete successfully.
- Verify at least one core admin workflow completes end to end in staging.
- Verify protected routes redirect unauthorized users and allow authorized users.
- Verify Firestore reads and writes are correctly restricted for tenant boundaries and privileged roles.
- Validate Firestore rules after any rules or index deployment.
- Validate Storage rules after any `storage.rules` change.
- Verify file upload works if the feature is enabled in the release scope.
- Verify email or notification workflows work if the feature is enabled in the release scope.

## Payments

- Verify Stripe Checkout works in staging using test credentials.
- Verify the Stripe webhook receives the payment event successfully.
- Verify the Stripe webhook staging endpoint shows successful event delivery in the Stripe dashboard.
- Verify the purchased user, service, course, or access entitlement is activated after payment.
- Verify failed payment scenarios are handled cleanly without partial activation.

## Deployment

- Confirm staging deployment completed successfully from GitHub Actions.
- Run and record a smoke test against the staging URL.
- Confirm production approval was completed in the GitHub `production` environment.
- Verify production deployment completed successfully and the public site is healthy.
- Record the post-deployment smoke test result before closing the release.

## Post-release evidence

- Capture the GitHub Actions run URL for staging and production.
- Capture Firebase Hosting release ID or deployment timestamp.
- Capture any manual validation notes and unresolved follow-ups.