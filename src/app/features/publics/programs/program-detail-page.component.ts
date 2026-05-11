import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  Program,
  ProgramCategory,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_LEVEL_LABELS,
} from './program.models';
import { ProgramsService } from './programs.service';
import { ShareButtonsComponent } from '../../../shared/share/share-buttons.component';

@Component({
  selector: 'app-program-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ShareButtonsComponent],
  templateUrl: './program-detail-page.component.html',
  styleUrls: ['./program-detail-page.component.css'],
})
export class ProgramDetailPageComponent {

    readonly content = {
    nav: {
      brand: { en: 'InnovaCare Global Nurse Pack', fr: 'InnovaCare Global Nurse Pack' },
      cta: { en: 'Talk to an advisor', fr: 'Parler à un conseiller' },
    },
    hero: {
      badge: { en: 'Premium Nurse Mobility Pack', fr: 'Pack premium de mobilité infirmière' },
      trusted: { en: 'Built for nurses targeting the USA, Canada and UAE', fr: 'Conçu pour les infirmiers visant les USA, le Canada et les Émirats arabes unis' },
      title: { en: 'Global Nurse Licensing Starter Pack', fr: 'Starter Pack de licence infirmière internationale' },
      accent: { en: 'Buy the roadmap before you waste more time or money', fr: 'Achetez la feuille de route avant de perdre plus de temps ou d’argent' },
      lead: { en: 'A conversion-first licensing roadmap for internationally trained nurses who need a clear next-step plan for NCLEX, CGFNS, NNAS, DHA, DOH and document verification.', fr: 'Une feuille de route orientée conversion pour les infirmiers formés à l’international qui ont besoin d’un plan clair pour la suite concernant NCLEX, CGFNS, NNAS, DHA, DOH et la vérification documentaire.' },
      highlights: [
        { en: 'NCLEX / CGFNS', fr: 'NCLEX / CGFNS' },
        { en: 'Canada / NNAS', fr: 'Canada / NNAS' },
        { en: 'DHA / DOH / MOH', fr: 'DHA / DOH / MOH' },
        { en: 'Document roadmap', fr: 'Feuille de route documentaire' },
      ],
      primaryCta: { en: 'Buy the starter pack now', fr: 'Acheter le starter pack maintenant' },
      secondaryCta: { en: 'See pricing and access', fr: 'Voir le prix et l’accès' },
      errorLabel: { en: 'Notice:', fr: 'Information :' },
      stats: [
        {
          value: '300+',
          label: { en: 'Nurses Guided', fr: 'Infirmiers accompagnés' },
          body: { en: 'Across licensing and credential verification.', fr: 'Sur la licence et la vérification des dossiers.' },
        },
        {
          value: '3',
          label: { en: 'Global Markets', fr: 'Marchés couverts' },
          body: { en: 'USA, Canada, and UAE coverage.', fr: 'Couverture USA, Canada et Émirats arabes unis.' },
        },
        {
          value: '99.8%',
          label: { en: 'Execution Confidence', fr: 'Confiance d’exécution' },
          body: { en: 'A pack designed to reduce costly wrong moves.', fr: 'Un pack conçu pour réduire les erreurs coûteuses.' },
        },
      ],
    },
    problem: {
      badge: { en: 'The problem', fr: 'Le problème' },
      title: { en: 'Too many nurses stay stuck because the pathway is unclear', fr: 'Trop d’infirmiers restent bloqués parce que le parcours manque de clarté' },
      body: { en: 'This is not a motivation problem. It is a clarity problem. When the process feels fragmented, people waste time, delay applications, and lose momentum.', fr: 'Ce n’est pas un problème de motivation. C’est un problème de clarté. Quand le processus paraît fragmenté, les gens perdent du temps, retardent leurs démarches et perdent leur élan.' },
      itemLabel: { en: 'Pain point', fr: 'Point de blocage' },
    },
    solution: {
      badge: { en: 'The solution', fr: 'La solution' },
      title: { en: 'A premium roadmap that turns confusion into action', fr: 'Une feuille de route premium qui transforme la confusion en action' },
      body: { en: 'The Starter Pack gives you a realistic path from uncertainty to execution, so you know what to prepare, what to prioritize, and what to avoid.', fr: 'Le Starter Pack vous donne un chemin réaliste, de l’incertitude à l’exécution, pour savoir quoi préparer, quoi prioriser et quoi éviter.' },
      yes: { en: 'Yes', fr: 'Oui' },
    },
    included: {
      badge: { en: 'What you get', fr: 'Ce que vous obtenez' },
      title: { en: 'Everything needed to move with clarity', fr: 'Tout ce qu’il faut pour avancer avec clarté' },
      body: { en: 'Built to feel like expert guidance, not a generic download.', fr: 'Conçu pour ressembler à un accompagnement expert, pas à un simple téléchargement générique.' },
      meta: { en: 'One-time payment. Instant access.', fr: 'Paiement unique. Accès immédiat.' },
      includedBadge: { en: 'Included', fr: 'Inclus' },
    },
    proof: {
      badge: { en: 'Social proof', fr: 'Preuve sociale' },
      title: { en: 'Trust built around real-world guidance', fr: 'Une confiance construite sur des conseils concrets' },
      body: { en: 'This pack is positioned to feel premium, credible, and immediately useful for nurses making high-stakes relocation decisions.', fr: 'Ce pack est positionné pour paraître premium, crédible et immédiatement utile pour des infirmiers qui prennent des décisions de mobilité à fort enjeu.' },
      nursesGuided: { en: 'Nurses guided', fr: 'Infirmiers accompagnés' },
      marketsCovered: { en: 'Markets covered', fr: 'Marchés couverts' },
    },
    pricing: {
      badge: { en: 'Pricing', fr: 'Tarification' },
      offerLabel: { en: 'Best-selling offer', fr: 'Offre la plus vendue' },
      title: { en: 'Starter Pack', fr: 'Starter Pack' },
      body: { en: 'Buy the licensing roadmap before paying more for the wrong next move. One payment, instant access, immediate clarity.', fr: 'Achetez la feuille de route de licence avant de payer davantage pour la mauvaise prochaine étape. Un seul paiement, accès immédiat, clarté immédiate.' },
      bullets: [
        { en: 'One-time payment', fr: 'Paiement unique' },
        { en: 'Instant access after purchase', fr: 'Accès immédiat après achat' },
        { en: '7-day satisfaction guarantee', fr: 'Garantie satisfaction 7 jours' },
      ],
      primaryCta: { en: 'Get instant access', fr: 'Obtenir un accès immédiat' },
      primaryLoading: { en: 'Redirecting to checkout...', fr: 'Redirection vers le paiement...' },
      secondaryCta: { en: 'Create account first', fr: 'Créer un compte d’abord' },
    },
    guarantee: {
      badge: { en: 'Guarantee', fr: 'Garantie' },
      title: { en: 'A 7-day satisfaction guarantee removes hesitation', fr: 'Une garantie satisfaction de 7 jours enlève toute hésitation' },
      body: { en: 'Buy with confidence. If the pack does not give you more clarity and direction within the first 7 days, you can request a refund under the product policy.', fr: 'Achetez avec confiance. Si le pack ne vous apporte pas plus de clarté et de direction dans les 7 premiers jours, vous pouvez demander un remboursement selon la politique du produit.' },
    },
    finalCta: {
      badge: { en: 'Final CTA', fr: 'CTA final' },
      title: { en: 'Start your international nursing plan today', fr: 'Démarrez votre plan infirmier international dès aujourd’hui' },
      body: { en: 'Do not leave your move to random advice. Buy the roadmap, access it instantly, and move with clear next steps for the USA, Canada, and UAE.', fr: 'Ne laissez pas votre projet dépendre de conseils aléatoires. Achetez la feuille de route, accédez-y immédiatement et avancez avec des prochaines étapes claires pour les USA, le Canada et les Émirats arabes unis.' },
      cardEyebrow: { en: 'Ready to buy', fr: 'Prêt à acheter' },
      cardTitle: { en: 'Start today', fr: 'Commencez aujourd’hui' },
      cardBody: { en: 'Premium roadmap. Instant access. Clear next steps for USA, Canada, and UAE.', fr: 'Feuille de route premium. Accès immédiat. Prochaines étapes claires pour les USA, le Canada et les Émirats arabes unis.' },
      primaryCta: { en: 'Buy the global nurse pack', fr: 'Acheter le global nurse pack' },
      secondaryCta: { en: 'Need team or institutional access?', fr: 'Besoin d’un accès équipe ou institution ?' },
    },
    imageAlt: {
      hero: { en: 'International nurse licensing hero', fr: 'Visuel principal de licence infirmière internationale' },
      documents: { en: 'Nurse planning documents', fr: 'Documents de planification infirmière' },
      roadmap: { en: 'Digital roadmap concept', fr: 'Concept de feuille de route numérique' },
      premium: { en: 'Premium nurse licensing pack visual', fr: 'Visuel du pack premium de licence infirmière' },
      pricing: { en: 'Pricing visual for nurse licensing pack', fr: 'Visuel de tarification du pack de licence infirmière' },
      customer: { en: 'Satisfied nurse customer visual', fr: 'Visuel d’une cliente infirmière satisfaite' },
      relocation: { en: 'Global relocation visual', fr: 'Visuel de mobilité internationale' },
      finalCta: { en: 'Nurse with laptop and international opportunity visual', fr: 'Visuel d’une infirmière avec ordinateur et opportunité internationale' },
    },
  } as const;

  private readonly route = inject(ActivatedRoute);
  private readonly programsService = inject(ProgramsService);

  readonly program = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((programId) => this.programsService.getProgramById(programId))
    ),
    { initialValue: undefined as Program | undefined }
  );

  readonly hasProgram = computed(() => !!this.program());

  readonly data = computed(() => this.content);

  readonly bookLink = computed(() => {
    const currentProgram = this.program();
    if (!currentProgram) {
      return ['/programs'];
    }
    return ['/programs', currentProgram.id, 'enroll'];
  });

  categoryLabel(category: ProgramCategory): string {
    return PROGRAM_CATEGORY_LABELS[category] ?? category;
  }

  levelLabel(program: Program): string {
    return PROGRAM_LEVEL_LABELS[program.level] ?? program.level;
  }

  modeLabel(program: Program): string {
    return PROGRAM_DELIVERY_MODE_LABELS[program.deliveryMode] ?? program.deliveryMode;
  }

  priceLabel(program: Program): string {
    const amount =
      typeof program.discountPrice === 'number' && program.discountPrice > 0
        ? program.discountPrice
        : program.price;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: program.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  seatsLabel(program: Program): string {
    if (program.seatsRemaining == null) {
      return 'Flexible cohort';
    }
    if (program.seatsRemaining <= 0) {
      return 'Waitlist only';
    }
    return `${program.seatsRemaining} seats remaining`;
  }
}
