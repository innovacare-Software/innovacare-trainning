import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router, RouterModule } from '@angular/router';
import { CheckoutService } from '../../../core/checkout.service';
import { LanguageService } from '../../../core/language.service';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

type LocalizedText = { en: string; fr: string };

interface PackModule {
  title: LocalizedText;
  points: LocalizedText[];
}

interface PackTestimonial {
  quote: LocalizedText;
  author: string;
  role: LocalizedText;
}

@Component({
  selector: 'app-global-nurse-pack',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './global-nurse-pack.component.html',
  styleUrls: ['./global-nurse-pack.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalNursePackComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutService);
  private readonly lang = inject(LanguageService);

  readonly productId = 'global-nurse-pack';
  readonly checkoutPending = signal(false);
  readonly errorMessage = signal('');

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

  readonly heroImages = [
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922255/ChatGPT_Image_Apr_22_2026_08_49_40_PM_mymund.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922229/ChatGPT_Image_Apr_22_2026_08_50_15_PM_bfy4pn.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922228/ChatGPT_Image_Apr_22_2026_08_50_04_PM_kwbvm7.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922229/ChatGPT_Image_Apr_22_2026_08_49_55_PM_ic5qq7.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922226/ChatGPT_Image_Apr_22_2026_08_50_38_PM_wnpd0b.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922226/ChatGPT_Image_Apr_22_2026_08_51_00_PM_nhvwcc.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922226/ChatGPT_Image_Apr_22_2026_08_51_17_PM_ejqvtq.png',
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1776922221/ChatGPT_Image_Apr_22_2026_08_51_57_PM_ci5rkh.png',
  ];

  readonly painPoints: LocalizedText[] = [
    { en: 'You do not know where to start between NCLEX, CGFNS, NNAS, DHA, DOH, and document verification.', fr: 'Vous ne savez pas par où commencer entre NCLEX, CGFNS, NNAS, DHA, DOH et la vérification des documents.' },
    { en: 'Every country asks for a different sequence, and wrong steps cost real money.', fr: 'Chaque pays impose une séquence différente, et les mauvaises étapes coûtent vraiment cher.' },
    { en: 'Most nurses lose months repeating research instead of moving toward licensure.', fr: 'La plupart des infirmiers perdent des mois à refaire des recherches au lieu d’avancer vers la licence.' },
    { en: 'You need a clear roadmap, not scattered advice from random groups online.', fr: 'Vous avez besoin d’une feuille de route claire, pas de conseils dispersés trouvés au hasard en ligne.' },
  ];

  readonly solutionPillars: LocalizedText[] = [
    { en: 'Step-by-step roadmap by destination country', fr: 'Feuille de route pas à pas selon le pays visé' },
    { en: 'Country-specific strategy based on realistic licensing pathways', fr: 'Stratégie spécifique par pays fondée sur des parcours de licence réalistes' },
    { en: 'Real-world guidance on documents, exams, and relocation readiness', fr: 'Conseils concrets sur les documents, les examens et la préparation à la mobilité' },
  ];

  readonly modules: PackModule[] = [
    {
      title: { en: 'USA Licensing Pathway', fr: 'Parcours de licence USA' },
      points: [
        { en: 'NCLEX + CGFNS + Board of Nursing sequence', fr: 'Séquence NCLEX + CGFNS + Board of Nursing' },
        { en: 'Credential evaluation and transcript flow', fr: 'Évaluation des titres et circuit des relevés' },
        { en: 'Application timing without wasted fees', fr: 'Bon timing de candidature sans frais gaspillés' },
      ],
    },
    {
      title: { en: 'Canada Planning Pathway', fr: 'Parcours de planification Canada' },
      points: [
        { en: 'NNAS + NCAS overview in plain language', fr: 'Vue d’ensemble NNAS + NCAS en langage simple' },
        { en: 'Region and timing strategy before payment decisions', fr: 'Stratégie régionale et de calendrier avant de payer' },
        { en: 'How to avoid common document bottlenecks', fr: 'Comment éviter les blocages documentaires fréquents' },
      ],
    },
    {
      title: { en: 'UAE Readiness Pathway', fr: 'Parcours de préparation Émirats arabes unis' },
      points: [
        { en: 'DHA / DOH / MOH route comparison', fr: 'Comparatif des parcours DHA / DOH / MOH' },
        { en: 'Exam and licensing preparation order', fr: 'Ordre de préparation examen et licence' },
        { en: 'What to prepare before job search begins', fr: 'Ce qu’il faut préparer avant de lancer sa recherche d’emploi' },
      ],
    },
    {
      title: { en: 'Execution Toolkit', fr: 'Boîte à outils d’exécution' },
      points: [
        { en: 'Documents checklist', fr: 'Checklist des documents' },
        { en: 'Timeline planner', fr: 'Planificateur de calendrier' },
        { en: 'Exam strategy notes', fr: 'Notes de stratégie d’examen' },
        { en: 'Resume template and interview prep', fr: 'Modèle de CV et préparation entretien' },
        { en: 'Migration mindset guide', fr: 'Guide d’état d’esprit pour la mobilité' },
      ],
    },
  ];

  readonly testimonials: PackTestimonial[] = [
    {
      quote: { en: 'I stopped guessing and finally understood what to do first for the USA pathway. The pack saved me weeks of confusion.', fr: 'J’ai arrêté de deviner et j’ai enfin compris quoi faire d’abord pour le parcours USA. Le pack m’a évité des semaines de confusion.' },
      author: 'Esther A.',
      role: { en: 'RN candidate relocating from Ghana', fr: 'Candidate RN en mobilité depuis le Ghana' },
    },
    {
      quote: { en: 'What I liked most was the structure. It felt like a real plan, not internet noise.', fr: 'Ce que j’ai le plus aimé, c’est la structure. On avait l’impression d’un vrai plan, pas de bruit trouvé sur internet.' },
      author: 'Mariam O.',
      role: { en: 'Internationally trained nurse planning UAE licensing', fr: 'Infirmière formée à l’international préparant une licence UAE' },
    },
    {
      quote: { en: 'The document checklist alone helped me avoid a costly delay in my application process.', fr: 'La checklist documentaire à elle seule m’a aidée à éviter un retard coûteux dans ma candidature.' },
      author: 'Grace N.',
      role: { en: 'Nurse preparing for Canada route', fr: 'Infirmière préparant la voie Canada' },
    },
  ];

  readonly ctaVariations: LocalizedText[] = [
    { en: 'Start your global nursing journey', fr: 'Démarrez votre parcours infirmier international' },
    { en: 'Get the licensing roadmap now', fr: 'Obtenez la feuille de route maintenant' },
    { en: 'Unlock my international nurse plan', fr: 'Débloquer mon plan infirmier international' },
  ];

  localizedPath(path: string): string {
    return this.lang.currentLang() === 'fr' ? `/fr${path}` : path;
  }

  async startCheckout(): Promise<void> {
    if (this.checkoutPending()) {
      return;
    }

    if (!this.auth.currentUser) {
      await this.router.navigate([this.localizedPath('/register')], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.checkoutPending.set(true);
    this.errorMessage.set('');

    try {
      const origin = window.location.origin;
      const session = await this.checkout.createCheckoutSession({
        productId: this.productId,
        successUrl: `${origin}/checkout/success?purchase=${this.productId}&type=digital_product`,
        cancelUrl: `${origin}${this.router.url}`,
      });

      const checkoutUrl = String(session.url || '').trim();
      if (!checkoutUrl) {
        throw new Error('Unable to create checkout session.');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.lang.currentLang() === 'fr'
            ? 'Impossible de démarrer le paiement pour le moment.'
            : 'Unable to start checkout right now.'
      );
      this.checkoutPending.set(false);
    }
  }
}