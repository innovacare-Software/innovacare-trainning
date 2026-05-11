# Stripe Production — Guide de mise en production

## Vue d'ensemble

InnovaCare utilise **deux intégrations Stripe** distinctes :

| Intégration | Rôle | Où |
|---|---|---|
| **Stripe standard** (clé secrète) | Checkout sessions pour achats d'apprenants | `handleStripeWebhookRequest` + `checkout.session.completed` |
| **Stripe Connect** (Express accounts) | Virements automatiques 70% vers formateurs | `connectStripeAccount` + `getConnectAccountStatus` |

---

## Variables d'environnement (Firebase Secrets)

Configurez les secrets via Firebase CLI :

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# → saisir : sk_live_xxxxxxxxxxxx

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# → saisir : whsec_xxxxxxxxxxxx
```

Vérifier les secrets configurés :
```bash
firebase functions:secrets:access STRIPE_SECRET_KEY
```

---

## Endpoints Firebase Functions

| Fonction | Déclencheur | Description |
|---|---|---|
| `connectStripeAccount` | `onCall` (authenticated) | Crée un compte Stripe Express + génère un lien d'onboarding |
| `getConnectAccountStatus` | `onCall` (public) | Vérifie le statut réel du compte Connect via Stripe API |
| `handleStripeWebhookRequest` | `onRequest` | Reçoit les webhooks Stripe (checkout + account.updated) |

**URL webhook à configurer dans Stripe Dashboard :**
```
https://us-central1-innovacare-stripe.cloudfunctions.net/handleStripeWebhookRequest
```

---

## Configuration Stripe Dashboard — Webhooks

### Étapes
1. Aller sur https://dashboard.stripe.com/webhooks
2. Cliquer **Ajouter un endpoint**
3. URL : `https://us-central1-innovacare-stripe.cloudfunctions.net/handleStripeWebhookRequest`
4. Sélectionner les événements :

| Événement | Obligatoire | Description |
|---|---|---|
| `checkout.session.completed` | ✅ | Confirme le paiement apprenant |
| `account.updated` | ✅ | Met à jour Firestore quand un compte Connect change |
| `payment_intent.succeeded` | Recommandé | Confirmation de paiement supplémentaire |
| `payment_intent.payment_failed` | Recommandé | Notification d'échec de paiement |

5. Copier le **Signing Secret** (commence par `whsec_`) → `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

---

## Statuts Stripe Connect (machine d'états)

| Statut | `chargesEnabled` | `payoutsEnabled` | `detailsSubmitted` | Description |
|---|---|---|---|---|
| `missing_account` | — | — | — | Aucun compte Connect créé |
| `onboarding_required` | false | false | false | Compte créé, onboarding non démarré |
| `pending_verification` | false | false | true | Profil soumis, en attente Stripe |
| `charges_enabled` | true | false | true | Paiements OK, virements en attente |
| `fully_active` | true | true | true | Entièrement opérationnel ✅ |
| `restricted` | false | — | — | Requirements manquants / compte bloqué |

### Flux Firestore (collection `organizations`)

Champs mis à jour par `getConnectAccountStatus` et le webhook `account.updated` :

```
stripeAccountId        : string
stripeChargesEnabled   : boolean
stripePayoutsEnabled   : boolean
stripeConnectStatus    : ConnectAccountStatus
stripeRequirements     : string[]          // currently_due
stripeRequirementsPastDue : string[]       // past_due
stripeDisabledReason   : string | null
stripeConnectCheckedAt : Timestamp
```

---

## URL de retour Stripe Connect (onboarding)

```
https://www.innovacarereview.com/program-admin/africa-mode?stripe=return&orgId=<orgId>
https://www.innovacarereview.com/program-admin/africa-mode?stripe=refresh&orgId=<orgId>
```

Le composant Angular `africa-quick-launch` surveille ces query params dans `ngOnInit` et recharge automatiquement le statut depuis le backend.

---

## Checklist Production

- [ ] `STRIPE_SECRET_KEY` configuré via Firebase Secrets (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` configuré (`whsec_...`)
- [ ] Webhook Stripe enregistré avec bonne URL Functions
- [ ] Événements `account.updated` et `checkout.session.completed` actifs
- [ ] Profil plateforme Stripe Connect complété (https://dashboard.stripe.com/connect/accounts/overview)
- [ ] `firebase deploy --only functions` déployé après les modifications
- [ ] Test `connectStripeAccount` depuis le dashboard Africa Mode (compte test)
- [ ] Test retour onboarding `?stripe=return` → statut mis à jour
- [ ] Test webhook `account.updated` (via Stripe CLI : `stripe trigger account.updated`)

---

## Test local avec Stripe CLI

```bash
# Installer Stripe CLI : https://stripe.com/docs/stripe-cli
stripe login

# Écouter les webhooks en local
stripe listen --forward-to http://127.0.0.1:5001/innovacare-stripe/us-central1/handleStripeWebhookRequest

# Déclencher account.updated
stripe trigger account.updated

# Déclencher checkout completed
stripe trigger checkout.session.completed
```

---

## Frais plateforme

`STRIPE_CONNECT_PLATFORM_FEE_RATE = 0.30` (30%)

Le formateur reçoit donc **70%** du montant HT. Les frais Stripe standard (~1.4% + 0.25€) sont prélevés en plus sur la transaction.

---

## Sécurité

- La clé secrète Stripe n'est **jamais** côté Angular — uniquement dans les Firebase Functions via `defineSecret`.
- Le signing secret du webhook est vérifié via `stripe.webhooks.constructEvent()` (protection contre les requêtes falsifiées).
- Le fichier `innovacare-stripe-*.json` (service account) est exclu de Git via `.gitignore`.
