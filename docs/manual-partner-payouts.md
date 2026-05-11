# Manual Partner Payouts (Phase 1)

## Pourquoi Stripe Connect est optionnel en phase 1

Pour accélérer le lancement, Innovacare encaisse tous les paiements apprenants sur le compte Stripe principal.
Le reversement partenaire est calculé automatiquement, puis exécuté manuellement.
Stripe Connect reste disponible plus tard pour automatiser les virements.

## Flux paiement apprenant

1. L’apprenant paie via Stripe Checkout (compte principal Innovacare).
2. Le webhook Stripe `checkout.session.completed` valide le paiement.
3. Le backend met à jour la commande/achat.
4. Le backend accorde l’accès au contenu uniquement via webhook validé.

## Flux reversement partenaire

1. Le webhook crée un `partnerPayoutRecord` si `ownerType=partner` et `payoutMode=manual`.
2. Le record est créé avec `payoutStatus=pending`.
3. L’admin exécute le reversement (MTN/Orange/Wise/virement).
4. L’admin marque le payout en `paid` avec référence.

## Calcul 70/30

- `platformFeePercent` par défaut: `30`
- `partnerSharePercent` par défaut: `70`
- `grossAmount = montant payé`
- `platformFeeAmount = grossAmount * 30%`
- `partnerNetAmount = grossAmount * 70%`

## Méthodes manuelles supportées

- MTN Mobile Money
- Orange Money
- Wise
- Virement bancaire
- Autre méthode manuelle

## Responsabilités admin

- Vérifier les payouts `pending`.
- Effectuer le reversement réel.
- Renseigner `payoutReference` et `notes`.
- Marquer en `paid` (admin seulement).

## Limites du payout manuel

- Pas d’exécution instantanée.
- Dépend d’une opération humaine.
- Risque opérationnel si suivi non rigoureux.

## Migration future vers Stripe Connect

1. Basculer `payoutMode` vers `stripe_connect` pour partenaires éligibles.
2. Configurer `stripeAccountId` partenaire.
3. Activer `transfer_data.destination` + `application_fee_amount`.
4. Conserver le mode manuel comme fallback.

## Sécurité

- Ne jamais accorder d’accès via `success_url`.
- Accès uniquement via webhook Stripe validé.
- Ne jamais exposer `STRIPE_SECRET_KEY` ni `STRIPE_WEBHOOK_SECRET`.
- Ne jamais stocker/afficher des identifiants de compte complets côté UI.
