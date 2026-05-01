# Notification E2E Checklist

Validate manual and automatic in-app notifications on innovacare-stripe.

## Pre-conditions

- One manager/admin account that can send notifications.
- One learner account in the same organization.
- One guest account for checkout and certificate flows.
- Latest Functions deployment active.

## Manual Send

1. Sign in as manager.
2. Open the notification send page.
3. Select category Annonces and confirm the helper text matches a general broadcast.
4. Send a notification to a learner.
5. Verify the learner sees it in the bell.
6. Verify the manager recent log shows the send with the same category.
7. Repeat once with category Compte or Achats and verify the recent log updates accordingly.

## Category Preferences

1. Open the plain bell.
2. Expand Preferences.
3. Disable Achats.
4. Trigger a commerce notification.
5. Verify it is hidden from the bell but still present in the underlying inbox/log flow.
6. Re-enable Achats.
7. Disable Live sessions and repeat with a live session reservation.

## Live Session

1. Reserve a free program live session.
2. Verify a live_sessions notification appears.
3. Verify the link opens the learner live sessions page.

## Purchase Confirmation

1. Complete a checkout.
2. Wait for Stripe webhook completion.
3. Verify the notification category is commerce or live_sessions depending on the item.

## Manual Access Grant

1. Trigger manualGrantPurchasedAccess.
2. Verify the recipient gets an inbox notification.
3. Verify the category is Achats for course/program access and Live sessions for session booking access.
4. Verify the link targets the expected guest or live-session destination.

## Exam Prep

1. Submit an exam prep attempt.
2. Verify an exam_prep notification appears.
3. Verify score text only appears when score visibility is enabled.

## Certificate

1. Generate a certificate from a passed result.
2. Verify a certificates notification appears.

## Account Creation

1. Create a new org user.
2. Sign in with the new account.
3. Verify an account notification is already present.

## Content Publication

1. Publish a course to marketplace.
2. Verify the publisher receives a content notification.

## Admin UI Regression

1. Confirm the category selector still defaults to Annonces after a successful send.
2. Confirm the helper card updates when switching categories.
3. Confirm the send form still works for audience all, role and single user.