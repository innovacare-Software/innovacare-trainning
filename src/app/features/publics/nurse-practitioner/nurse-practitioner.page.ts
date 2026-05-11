import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-nurse-practitioner-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './nurse-practitioner.page.html',
  styleUrls: ['./nurse-practitioner.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NursePractitionerPage {
  readonly content = {
    hero: {
      kicker: { en: '🎯 ANCC & AANP Certified', fr: '🎯 Certifié ANCC et AANP' },
      title: { en: 'Master Your NP Board Certification in 12 Weeks', fr: 'Maîtrisez votre certification NP en 12 semaines' },
      lead: { en: 'The #1 platform trusted by 50,000+ nurse practitioners. Blueprint-aligned content, 500+ clinical cases, and AI-powered study plans.', fr: 'La plateforme numéro 1 choisie par plus de 50 000 infirmiers praticiens. Contenu aligné au blueprint, plus de 500 cas cliniques et plans d’étude propulsés par l’IA.' },
      highlights: [
        { en: '✓ 94% Pass Rate', fr: '✓ 94 % de réussite' },
        { en: '✓ ANCC Accredited', fr: '✓ Accrédité ANCC' },
        { en: '✓ Mobile-First Learning', fr: '✓ Apprentissage mobile-first' },
      ],
      stats: [
        { value: '50K+', label: { en: 'Active NPs', fr: 'NP actifs' } },
        { value: '500+', label: { en: 'Clinical Cases', fr: 'Cas cliniques' } },
        { value: '6', label: { en: 'Specialty Tracks', fr: 'Parcours spécialisés' } },
        { value: '12 Weeks', label: { en: 'Avg Prep Time', fr: 'Temps moyen de préparation' } },
      ],
      primaryCta: { en: '🚀 Start Free 7-Day Trial', fr: '🚀 Commencer l’essai gratuit de 7 jours' },
      primarySubcopy: { en: 'No credit card required', fr: 'Aucune carte bancaire requise' },
      secondaryCta: { en: 'View All Plans', fr: 'Voir tous les plans' },
      trust: { en: 'Trusted by NPs from Mayo Clinic, Cleveland Clinic, and Johns Hopkins', fr: 'Choisie par des NP de Mayo Clinic, Cleveland Clinic et Johns Hopkins' },
      cardBadge: { en: '⭐ MOST EFFECTIVE', fr: '⭐ LE PLUS EFFICACE' },
      cardTitle: { en: 'Why 50K+ NPs Choose Innovacare', fr: 'Pourquoi plus de 50K NP choisissent Innovacare' },
      cardFooter: { en: 'Join thousands passing their boards this month', fr: 'Rejoignez des milliers de professionnels qui réussissent leurs boards ce mois-ci' },
    },
    tools: {
      title: { en: 'Advanced Tools for Nurse Practitioner Certification', fr: 'Outils avancés pour la certification infirmier praticien' },
      body: { en: 'Specialty-specific tracks, clinical case libraries and advanced pharmacology — all in one place.', fr: 'Des parcours par spécialité, des bibliothèques de cas cliniques et une pharmacologie avancée, réunis au même endroit.' },
    },
    plans: {
      title: { en: 'NP Certification Prep Plans', fr: 'Plans de préparation à la certification NP' },
      body: { en: 'Choose your certification track and study at your own pace.', fr: 'Choisissez votre parcours de certification et étudiez à votre rythme.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    stories: {
      title: { en: 'Success Stories From Our Community', fr: 'Histoires de réussite de notre communauté' },
      body: { en: 'See how Innovacare helped nurse practitioners achieve their certification goals.', fr: 'Découvrez comment Innovacare a aidé des infirmiers praticiens à atteindre leurs objectifs de certification.' },
    },
    comparison: {
      title: { en: 'What Makes Innovacare Different', fr: 'Ce qui différencie Innovacare' },
      body: { en: 'Comprehensive resources designed specifically for NP certification success.', fr: 'Des ressources complètes conçues spécifiquement pour la réussite à la certification NP.' },
    },
    ctaBanner: {
      title: { en: 'Get Board-Certified With Innovacare', fr: 'Obtenez votre certification board avec Innovacare' },
      body: { en: 'Join 50,000+ nurse practitioners who passed their boards with Innovacare. Free 7-day trial — no credit card required.', fr: 'Rejoignez plus de 50 000 infirmiers praticiens qui ont réussi leurs boards avec Innovacare. Essai gratuit de 7 jours, sans carte bancaire.' },
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'Talk to an Advisor', fr: 'Parler à un conseiller' },
    },
  } as const;

  features = [
    { icon: '📋', title: { en: 'ANCC Board Prep', fr: 'Préparation board ANCC' }, desc: { en: 'Comprehensive prep for ANCC FNP, AGPCNP, PMHNP and other specialty certification exams.', fr: 'Préparation complète pour les examens ANCC FNP, AGPCNP, PMHNP et d’autres certifications spécialisées.' } },
    { icon: '🩺', title: { en: 'AANP Exam Prep', fr: 'Préparation examen AANP' }, desc: { en: 'Full content coverage aligned to the AANP FNP and ENP certification exam blueprints.', fr: 'Couverture complète du contenu alignée aux blueprints de certification AANP FNP et ENP.' } },
    { icon: '🔬', title: { en: 'Clinical Case Library', fr: 'Bibliothèque de cas cliniques' }, desc: { en: '500+ real-world patient scenarios with differential diagnosis decision trees and management plans.', fr: 'Plus de 500 scénarios patients réels avec arbres de décision de diagnostic différentiel et plans de prise en charge.' } },
    { icon: '💊', title: { en: 'NP Pharmacology', fr: 'Pharmacologie NP' }, desc: { en: 'Advanced prescribing modules covering pharmacokinetics, drug-drug interactions and evidence-based protocols.', fr: 'Modules avancés de prescription couvrant pharmacocinétique, interactions médicamenteuses et protocoles fondés sur les preuves.' } },
    { icon: '📊', title: { en: 'Diagnostic Reasoning', fr: 'Raisonnement diagnostique' }, desc: { en: 'Clinical lab interpretation, imaging review and evidence-based clinical practice guideline integration.', fr: 'Interprétation des bilans, revue d’imagerie et intégration des recommandations cliniques fondées sur les preuves.' } },
    { icon: '🎓', title: { en: 'Specialty Tracks', fr: 'Parcours spécialisés' }, desc: { en: 'Focused tracks for FNP, AGNP, PMHNP, PNP, and WHNP — study your specialty, not the whole board.', fr: 'Parcours ciblés FNP, AGNP, PMHNP, PNP et WHNP: étudiez votre spécialité, pas tout le board.' } },
  ];

  packages = [
    { name: { en: 'Standard', fr: 'Standard' }, price: '$79', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'Single-certification prep', fr: 'Préparation à une seule certification' }, features: [{ en: '3,000 practice questions', fr: '3 000 questions pratiques' }, { en: 'ANCC or AANP focus', fr: 'Focus ANCC ou AANP' }, { en: 'Clinical case library', fr: 'Bibliothèque de cas cliniques' }, { en: 'Pharmacology modules', fr: 'Modules de pharmacologie' }] },
    { name: { en: 'Premium', fr: 'Premium' }, price: '$179', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Most popular for NP candidates', fr: 'Le plus populaire chez les candidats NP' }, features: [{ en: 'Full question bank', fr: 'Banque complète de questions' }, { en: 'ANCC + AANP dual prep', fr: 'Double préparation ANCC + AANP' }, { en: 'All specialty tracks', fr: 'Tous les parcours spécialisés' }, { en: 'Clinical decision trees', fr: 'Arbres de décision clinique' }, { en: 'Video rationales', fr: 'Rationales vidéo' }, { en: 'Pass guarantee', fr: 'Garantie de réussite' }] },
    { name: { en: 'Elite', fr: 'Elite' }, price: '$279', period: { en: '/6 months', fr: '/6 mois' }, popular: false, desc: { en: 'Deep clinical mastery', fr: 'Maîtrise clinique approfondie' }, features: [{ en: 'Everything in Premium', fr: 'Tout le contenu Premium' }, { en: '1-on-1 NP coach', fr: 'Coach NP en individuel' }, { en: 'Live case review webinars', fr: 'Webinaires live de revue de cas' }, { en: 'OSCE practice scenarios', fr: 'Scénarios pratiques type OSCE' }, { en: 'Priority 24/7 support', fr: 'Support prioritaire 24/7' }] },
  ];

  checkList = [
    { en: 'ANCC & AANP accredited content', fr: 'Contenu accrédité ANCC et AANP' },
    { en: '500+ clinical case scenarios', fr: 'Plus de 500 scénarios cliniques' },
    { en: 'Specialty-specific study tracks', fr: 'Parcours d’étude par spécialité' },
    { en: 'Advanced pharmacology modules', fr: 'Modules avancés de pharmacologie' },
    { en: 'Performance benchmarking vs peers', fr: 'Benchmark de performance versus pairs' },
  ];

  readonly testimonials = [
    {
      image: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
      alt: 'Sarah Mitchell',
      name: 'Sarah Mitchell, RN, MSN',
      title: { en: 'Acute Care NP | Mayo Clinic', fr: 'NP en soins aigus | Mayo Clinic' },
      text: { en: '"I passed my ANCC certification on my first attempt with an 89%. The clinical cases were incredibly realistic and the AI study plans adapted perfectly to my learning style. Highly recommend!"', fr: '« J’ai réussi ma certification ANCC dès la première tentative avec 89 %. Les cas cliniques étaient incroyablement réalistes et les plans d’étude IA se sont parfaitement adaptés à mon style d’apprentissage. Je recommande fortement. »' },
    },
    {
      image: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121779/ChatGPT_Image_6_mai_2026_22_40_15_5_d95dt1.png',
      alt: 'Michael Chen',
      name: 'Michael Chen, RN, BSN',
      title: { en: 'Family Practice NP | Cleveland Clinic', fr: 'NP en médecine familiale | Cleveland Clinic' },
      text: { en: '"The mobile app made studying so convenient. I could review cases during my breaks and the personalized feedback helped me focus on my weak areas. Got my AANP certification in 10 weeks!"', fr: '« L’application mobile a rendu l’étude très pratique. Je pouvais revoir des cas pendant mes pauses et le feedback personnalisé m’a aidé à me concentrer sur mes points faibles. J’ai obtenu ma certification AANP en 10 semaines. »' },
    },
    {
      image: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1767048753/4XzAMdv8EeTPhg82_ER3Fdj6u1HZ3_BKz_g5kwdp.jpg',
      alt: 'Jessica Rodriguez',
      name: 'Jessica Rodriguez, RN, MS',
      title: { en: 'Emergency NP | Johns Hopkins', fr: 'NP aux urgences | Johns Hopkins' },
      text: { en: '"Innovacare\'s specialty tracks saved me so much time. The pharmacology module alone was worth the investment. I felt completely prepared and confident on exam day!"', fr: '« Les parcours spécialisés d’Innovacare m’ont fait gagner énormément de temps. Le module de pharmacologie à lui seul valait l’investissement. Je me suis sentie totalement prête et confiante le jour de l’examen. »' },
    },
  ];

  readonly comparisonCards = [
    { icon: '📚', title: { en: 'Comprehensive Content', fr: 'Contenu complet' }, desc: { en: '500+ peer-reviewed clinical cases, pharmacology essentials, and specialty-specific modules covering all ANCC and AANP exam domains.', fr: 'Plus de 500 cas cliniques relus par des pairs, des fondamentaux de pharmacologie et des modules par spécialité couvrant tous les domaines d’examen ANCC et AANP.' } },
    { icon: '🤖', title: { en: 'AI-Powered Learning', fr: 'Apprentissage propulsé par l’IA' }, desc: { en: 'Personalized study paths that adapt to your strengths and weaknesses. Advanced analytics show your progress in real-time.', fr: 'Des parcours d’étude personnalisés qui s’adaptent à vos forces et faiblesses. Une analytique avancée montre votre progression en temps réel.' } },
    { icon: '📱', title: { en: 'Learn Anywhere', fr: 'Étudiez partout' }, desc: { en: 'Study on your schedule with our fully optimized mobile app. Offline mode ensures you can prep anywhere, anytime.', fr: 'Étudiez selon votre horaire avec notre application mobile entièrement optimisée. Le mode hors ligne vous permet de préparer partout, à tout moment.' } },
    { icon: '👥', title: { en: 'Expert Support', fr: 'Support expert' }, desc: { en: 'Direct access to NP instructors, peer study groups, and 24/7 community support. Never study alone again.', fr: 'Accès direct à des formateurs NP, à des groupes d’étude entre pairs et à un support communautaire 24/7. Ne révisez plus jamais seul.' } },
  ];
}
