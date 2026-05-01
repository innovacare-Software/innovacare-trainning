# Innovacare Review Blueprint

## Overview

Innovacare Review is an Angular standalone SaaS application backed by Firebase and Stripe. The platform mixes public marketing funnels, authenticated learner experiences, organizational tooling, and checkout flows for digital products, programs, tutoring, and wallet top-ups.

## Current Product and UX Baseline

- Angular app uses standalone components, OnPush, native control flow, and Transloco-based EN/FR runtime localization.
- Public marketing routes, product landing pages, popups, and shell rendering are gated against translation readiness to prevent key leakage in UI.
- Stripe payments are initiated from the frontend only through Firebase callable functions or server-side HTTP rewrites, never through direct client-side Stripe secret usage.
- Stripe webhooks already finalize paid orders and grant access for digital products, courses, programs, tutor sessions, and wallet top-ups.

## Current Change

### Goal

Harden the global-nurse-pack payment path so Firestore is the single source of truth for the product catalog, Stripe checkout sessions use validated Firestore product data, and production debugging can confirm catalog integrity without direct database access.

### Implemented Steps

1. Switched the global-nurse-pack landing page to use the existing callable CheckoutService flow instead of the HTTP bridge checkout path.
2. Added strict Firestore product resolution in functions/src/index.ts with structured error reasons:
   - PRODUCT_NOT_FOUND
   - PRODUCT_INACTIVE
   - MISSING_PRICE_ID
   - CHECKOUT_FAILED
3. Added backend logging for productId, Firestore product fields, and stripePriceId before Stripe session creation.
4. Added a public debugProduct HTTP function and Hosting rewrite for /debug/product/**.
5. Upgraded the Angular checkout service to surface structured checkout error codes.

### Next Step Prepared

- Use checkout.session.completed webhook metadata and existing grantPurchasedAccessInternal flow to extend digital product purchases into richer post-payment enrollment activation and content unlocking.