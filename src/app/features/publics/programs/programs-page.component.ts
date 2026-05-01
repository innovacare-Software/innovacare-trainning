import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import {
  Program,
  ProgramCategory,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_LEVEL_LABELS,
  ProgramCategoryOption,
} from './program.models';
import { ProgramsService } from './programs.service';

@Component({
  selector: 'app-programs-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './programs-page.component.html',
  styleUrls: ['./programs-page.component.css'],
})
export class ProgramsPageComponent {
  private readonly programsService = inject(ProgramsService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', {
    nonNullable: true,
  });

  readonly categoryOptions: ProgramCategoryOption[] = [
    { label: 'DevOps', value: ProgramCategory.DEVOPS },
    { label: 'NCLEX', value: ProgramCategory.NCLEX },
    { label: 'DHA', value: ProgramCategory.DHA },
    { label: 'DOH', value: ProgramCategory.DOH },
    { label: 'Canada NCLEX', value: ProgramCategory.CANADA_NCLEX },
    { label: 'Nursing Prep', value: ProgramCategory.NURSING_PREP },
    { label: 'Other', value: ProgramCategory.OTHER },
  ];
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
  }

  readonly visuals = {
    nursing:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
    medical:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/3AB0EC16-DEE3-4198-AD16-3F74FF0DCEAB_j85tzf.png',
    study:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/71EA67DD-9BAC-401A-A907-855E2E2297F7_ozf7vw.png',
  };

  readonly allPrograms = toSignal(this.programsService.getPublishedPrograms(), {
    initialValue: [] as Program[],
  });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(120),
      map((value) => value.trim().toLowerCase()),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(
    this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)),
    { initialValue: 'ALL' as ProgramCategory | 'ALL' }
  );

  readonly filteredPrograms = computed(() => {
    const programs = this.allPrograms();
    const term = this.searchTerm();
    const selectedCategory = this.selectedCategory();

    return programs.filter((program) => {
      const categoryMatches =
        selectedCategory === 'ALL' || program.category === selectedCategory;

      const searchableText = [
        program.title,
        program.subtitle,
        program.description,
        program.category,
        ...(program.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      const searchMatches = !term || searchableText.includes(term);
      return categoryMatches && searchMatches;
    });
  });

  readonly featuredPrograms = computed(() =>
    this.filteredPrograms().filter((program) => program.isFeatured)
  );

  readonly hasActiveFilters = computed(() => {
    return this.selectedCategory() !== 'ALL' || !!this.searchTerm();
  });

  readonly totalSeatsOpen = computed(() => {
    return this.filteredPrograms().reduce((acc, program) => {
      const seatsLeft = Number(program.seatsRemaining ?? 0);
      return acc + (Number.isFinite(seatsLeft) ? seatsLeft : 0);
    }, 0);
  });

  readonly lowestPrice = computed(() => {
    const prices = this.filteredPrograms().map((program) =>
      Number(program.discountPrice ?? program.price)
    );
    if (!prices.length) return 0;
    return Math.min(...prices);
  });

  resetFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('ALL');
  }

  trackByProgram(_: number, program: Program): string {
    return program.id;
  }

  categoryLabel(category: ProgramCategory): string {
    return PROGRAM_CATEGORY_LABELS[category] ?? category;
  }

  levelLabel(level: Program['level']): string {
    return PROGRAM_LEVEL_LABELS[level] ?? level;
  }

  modeLabel(mode: Program['deliveryMode']): string {
    return PROGRAM_DELIVERY_MODE_LABELS[mode] ?? mode;
  }

  priceLabel(program: Program): string {
    const hasDiscount =
      typeof program.discountPrice === 'number' && program.discountPrice > 0;

    const amount = hasDiscount
      ? (program.discountPrice as number)
      : Number(program.price ?? 0);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: program.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  hasDiscount(program: Program): boolean {
    return !!(
      program.discountPrice &&
      program.discountPrice > 0 &&
      program.discountPrice < program.price
    );
  }

  getProgramImage(program: Program): string {
    const directImage = (program.imageUrl || '').trim();
    if (directImage) return directImage;

    switch (program.category) {
      case ProgramCategory.NCLEX:
      case ProgramCategory.CANADA_NCLEX:
      case ProgramCategory.NURSING_PREP:
        return this.visuals.nursing;

      case ProgramCategory.DHA:
      case ProgramCategory.DOH:
        return this.visuals.medical;

      case ProgramCategory.DEVOPS:
      case ProgramCategory.OTHER:
      default:
        return this.visuals.study;
    }
  }
}