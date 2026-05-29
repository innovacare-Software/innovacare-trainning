# Monitoring Plan

## Core telemetry sources

- Firebase Functions logs for runtime exceptions, timeouts, cold starts, and security events.
- Google Cloud Logging for consolidated query and alert routing across Hosting, Functions, and optional Cloud Run.
- Firebase Hosting release history and Hosting monitoring signals for deploy verification and rollback correlation.
- Cloud Run metrics, if used, for revision health, request latency, CPU, memory, and error rates.
- Stripe webhook monitoring for failed deliveries, signature errors, and payment lifecycle anomalies.

## Recommended monitoring coverage

- Create log-based alerts for authentication failures, repeated 5xx responses, Stripe webhook signature failures, and deployment failures.
- Create availability alerts for the public frontend and critical callable or HTTP endpoints.
- Track frontend errors with a dedicated client-side error monitoring tool such as Sentry, Rollbar, or Firebase Crashlytics for web if it aligns with your stack.
- Track business-critical conversion signals such as checkout started, checkout completed, webhook processed, and entitlement granted.

## Google Cloud and Firebase checks

- Review Functions logs after every staging and production deployment.
- Monitor Firestore denied reads and writes if security rule changes are deployed.
- Monitor Storage rule denials if `storage.rules` changes are released.
- Monitor quota usage and billing anomalies in Google Cloud for Functions, Firestore, Hosting, and optional Cloud Run.

## Stripe-specific checks

- Alert on repeated webhook delivery failures.
- Alert on payment intent failures that exceed the expected baseline.
- Periodically reconcile successful payments against granted access in Firestore.

## Uptime and alerting

- Configure external uptime checks for the production frontend and at least one critical backend endpoint.
- Route Sev 1 and Sev 2 alerts to an on-call channel with escalation policy.
- Send lower-severity alerts to engineering backlog triage to avoid alert fatigue.

## Operational cadence

- Review logs daily during active release windows.
- Review vulnerability findings from CodeQL and `npm audit` at least weekly.
- Review alert noise monthly and tune thresholds after every significant incident.