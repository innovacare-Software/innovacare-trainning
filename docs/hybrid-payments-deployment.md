# Hybrid Payments Deployment

This project now supports a unified payment layer for:

- Stripe card checkout
- Mobile Money through a provider adapter layer
- Automatic enrollment or wallet activation after server-side confirmation

## Supported backend entry points

- createPaymentIntent
- paymentWebhook
- stripeWebhook

## Required Firebase secrets and params

Set these before deployment:

```powershell
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set MOBILE_MONEY_API_KEY
firebase functions:secrets:set MOBILE_MONEY_API_SECRET
firebase functions:secrets:set MOBILE_MONEY_WEBHOOK_SECRET
```

Set the provider parameters used by the Functions param API:

```powershell
firebase functions:config:set MOBILE_MONEY_GATEWAY="cinetpay"
firebase functions:config:set MOBILE_MONEY_API_BASE_URL="https://api-checkout.cinetpay.com"
```

If your deploy flow injects params directly, provide equivalents for:

- MOBILE_MONEY_GATEWAY
- MOBILE_MONEY_API_BASE_URL

## Recommended provider choice

For Cameroon and francophone Africa:

1. CinetPay as primary Mobile Money provider
2. Flutterwave as fallback or pan-African expansion
3. Stripe remains active for international cards

## CinetPay notes

- Configure the webhook URL to the paymentWebhook HTTP function
- If CinetPay sends a token header instead of an HMAC signature, set MOBILE_MONEY_WEBHOOK_SECRET to that token value
- Verify transaction status from webhook payload before granting access

## Webhook endpoints

- Unified: https://us-central1-<project-id>.cloudfunctions.net/paymentWebhook
- Stripe legacy-compatible: https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook

## Deployment sequence

1. Deploy Firestore rules
2. Deploy Functions
3. Deploy Hosting if frontend changed

```powershell
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --project innovacare-stripe --only hosting
```

## Production smoke test

1. Create a paid program enrollment with Stripe card and confirm program access activates
2. Create a paid program enrollment with Mobile Money and confirm payment document moves from pending to success
3. Create a wallet top-up with Stripe and confirm walletBalance increments once
4. Create a wallet top-up with Mobile Money and confirm walletBalance increments once
5. Replay the same webhook payload and confirm no duplicate enrollment or duplicate wallet credit occurs

## Automatic routing strategy

Recommended default routing:

1. Preselect Mobile Money when user phone starts with African country codes such as +237, +225, +221, +229, +223, +242
2. Preselect Stripe for users outside the region or without a local wallet signal
3. Always allow manual override in the UI

## Firestore collections involved

- payments
- users/{uid}/orders
- programEnrollments
- stripeWebhookEvents
- paymentWebhookEvents

## Server-side guarantees

- Amount and currency are revalidated on the server
- Frontend never grants access
- Webhooks are idempotent
- Wallet and enrollment activation occur only after successful server confirmation