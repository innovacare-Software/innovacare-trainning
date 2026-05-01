import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

type LocalizedText = { en: string; fr: string };

@Component({
  selector: 'app-nclex-rn-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './nclex-rn.page.html',
  styleUrls: ['./nclex-rn.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NclexRnPage {
  readonly content = {
    hero: {
      kicker: {
        en: 'Enterprise-Grade NCLEX-RN Preparation Platform',
        fr: 'Plateforme de préparation NCLEX-RN de niveau institutionnel',
      },
      title: {
        en: 'Master NCLEX-RN with AI-Powered Prep, Clinical Judgment Training & Real-Time Analytics',
        fr: 'Maîtrisez le NCLEX-RN avec une préparation propulsée par l’IA, un entraînement au jugement clinique et une analytique en temps réel',
      },
      lead: {
        en: 'Innovacare Review delivers intelligent, adaptive NCLEX preparation for RN candidates with next-generation clinical judgment items, personalized learning paths, and real-time progress tracking. Nursing schools and organizations get institutional analytics, faculty intervention tools, and LMS integration for measurable outcomes.',
        fr: 'Innovacare Review offre une préparation NCLEX intelligente et adaptative pour les candidats RN avec des items de jugement clinique nouvelle génération, des parcours personnalisés et un suivi de progression en temps réel. Les écoles en soins infirmiers et les organisations bénéficient d’analytique institutionnelle, d’outils d’intervention professorale et d’intégrations LMS pour des résultats mesurables.',
      },
      imageAlt: {
        en: 'NCLEX-RN platform dashboard',
        fr: 'Tableau de bord de la plateforme NCLEX-RN',
      },
      primaryCta: { en: 'Start RN Prep Now', fr: 'Commencer la préparation RN' },
      secondaryCta: { en: 'Schedule Demo', fr: 'Planifier une démo' },
    },
    institutions: {
      title: {
        en: 'Why Institutions Trust Innovacare for NCLEX-RN Success',
        fr: 'Pourquoi les institutions font confiance à Innovacare pour la réussite au NCLEX-RN',
      },
      body: {
        en: 'Proven, research-backed preparation combined with institutional analytics and seamless LMS integration for measurable outcomes.',
        fr: 'Une préparation éprouvée et fondée sur la recherche, combinée à une analytique institutionnelle et à une intégration LMS fluide pour des résultats mesurables.',
      },
    },
    journeys: {
      title: {
        en: 'One NCLEX-RN Page, Three Real Use Cases',
        fr: 'Une seule page NCLEX-RN, trois cas d’usage concrets',
      },
      body: {
        en: 'The RN product has to work as learner prep, as a faculty support layer, and as an organization-ready program deployment surface.',
        fr: 'L’offre RN doit fonctionner comme outil de préparation apprenante, comme couche de soutien professoral et comme surface de déploiement prête pour les organisations.',
      },
    },
    tools: {
      title: {
        en: 'NCLEX-RN Tools That Support Real Readiness',
        fr: 'Des outils NCLEX-RN qui soutiennent une vraie préparation',
      },
      body: {
        en: 'Adaptive prep, judgment practice, and reporting-friendly workflows designed for both individual learners and managed cohorts.',
        fr: 'Une préparation adaptative, des exercices de jugement clinique et des workflows pensés pour le reporting, conçus pour les apprenants individuels comme pour les cohortes pilotées.',
      },
    },
    plans: {
      title: {
        en: 'NCLEX-RN Plans for Individuals and Institutions',
        fr: 'Plans NCLEX-RN pour individus et institutions',
      },
      body: {
        en: 'Select direct learner access or a custom setup for nursing programs, cohort operations, and organization-level implementation.',
        fr: 'Choisissez un accès direct pour l’apprenant ou une configuration sur mesure pour les programmes infirmiers, les opérations de cohorte et les déploiements à l’échelle organisationnelle.',
      },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    organizations: {
      title: {
        en: 'Built for LMS Teams and Program-Level Oversight',
        fr: 'Conçu pour les équipes LMS et le pilotage au niveau programme',
      },
      body: {
        en: 'RN prep is often tied to progression, remediation, and institutional outcomes. The platform should help learners study and help teams act earlier.',
        fr: 'La préparation RN est souvent liée à la progression, à la remédiation et aux résultats institutionnels. La plateforme doit aider les apprenants à étudier et les équipes à agir plus tôt.',
      },
      panelEyebrow: { en: 'Institutional use case', fr: 'Cas d’usage institutionnel' },
      panelTitle: {
        en: 'Use RN prep as a learner product or as a cohort operations layer',
        fr: 'Utilisez la préparation RN comme produit apprenant ou comme couche opérationnelle pour cohortes',
      },
      panelBody: {
        en: 'Innovacare Review can support direct learner conversion, program-level remediation, or broader healthcare workforce pathways that need measurable readiness and cleaner rollout.',
        fr: 'Innovacare Review peut soutenir la conversion directe des apprenants, la remédiation au niveau programme ou des parcours de main-d’œuvre en santé qui exigent une préparation mesurable et un déploiement plus propre.',
      },
      primaryCta: { en: 'Schedule a Program Demo', fr: 'Planifier une démo programme' },
      secondaryCta: { en: 'Talk to Sales', fr: 'Parler aux ventes' },
    },
    ctaBanner: {
      title: {
        en: 'Launch RN Prep for a Learner, a Cohort, or an Entire Program',
        fr: 'Lancez la préparation RN pour un apprenant, une cohorte ou un programme complet',
      },
      body: {
        en: 'Start learner access immediately or book an institutional walkthrough for your nursing program, LMS team, or organization.',
        fr: 'Démarrez immédiatement l’accès apprenant ou réservez une présentation institutionnelle pour votre programme infirmier, votre équipe LMS ou votre organisation.',
      },
      primaryCta: { en: 'Start RN Access', fr: 'Démarrer l’accès RN' },
      secondaryCta: { en: 'Book Institutional Demo', fr: 'Réserver une démo institutionnelle' },
    },
  } as const;

  heroHighlights = [
    {
      en: 'NGN-focused NCLEX-RN preparation with adaptive readiness practice',
      fr: 'Préparation NCLEX-RN axée NGN avec entraînement adaptatif à la préparation',
    },
    {
      en: 'Faculty and cohort visibility for nursing programs that need intervention data',
      fr: 'Visibilité professeurs et cohortes pour les programmes infirmiers qui ont besoin de données d’intervention',
    },
    {
      en: 'Deployment support for LMS-connected schools and healthcare organizations',
      fr: 'Accompagnement de déploiement pour les écoles connectées à un LMS et les organisations de santé',
    },
  ];

  journeyCards = [
    {
      title: { en: 'For RN candidates', fr: 'Pour les candidats RN' },
      body: {
        en: 'Build exam-day confidence with adaptive question practice, case-based clinical judgment, and structured remediation that mirrors the real NCLEX-RN workflow.',
        fr: 'Développez votre confiance pour le jour de l’examen avec une pratique adaptative, du jugement clinique basé sur des cas et une remédiation structurée qui reflète le vrai flux NCLEX-RN.',
      },
    },
    {
      title: { en: 'For nursing faculty', fr: 'Pour les facultés en soins infirmiers' },
      body: {
        en: 'Track learner progress, spot weak domains earlier, and support remediation before program outcomes become a reporting problem.',
        fr: 'Suivez la progression des apprenants, repérez plus tôt les domaines faibles et soutenez la remédiation avant que les résultats du programme ne deviennent un problème de reporting.',
      },
    },
    {
      title: { en: 'For organizations', fr: 'Pour les organisations' },
      body: {
        en: 'Roll out licensure support across cohorts, bridge programs, and workforce pipelines with clearer accountability and smoother implementation.',
        fr: 'Déployez le soutien à la licence sur des cohortes, des programmes passerelles et des parcours workforce avec une responsabilité plus claire et une mise en œuvre plus fluide.',
      },
    },
  ];

  features = [
    { icon: '🧠', title: { en: 'NGN Question Bank', fr: 'Banque de questions NGN' }, desc: { en: 'Large-scale NCLEX-RN practice built around client needs, clinical reasoning, and next generation item formats.', fr: 'Une pratique NCLEX-RN à grande échelle construite autour des besoins du patient, du raisonnement clinique et des formats nouvelle génération.' } },
    { icon: '📈', title: { en: 'CAT Readiness Mode', fr: 'Mode de préparation CAT' }, desc: { en: 'Use adaptive testing sessions to understand pacing, decision pressure, and whether readiness is improving over time.', fr: 'Utilisez des sessions adaptatives pour comprendre le rythme, la pression décisionnelle et si la préparation progresse dans le temps.' } },
    { icon: '🎯', title: { en: 'Priority and Delegation Training', fr: 'Entraînement priorisation et délégation' }, desc: { en: 'Strengthen high-risk RN decision areas with focused practice on prioritization, delegation, safety, and escalation.', fr: 'Renforcez les zones de décision RN à haut risque avec une pratique ciblée sur la priorisation, la délégation, la sécurité et l’escalade.' } },
    { icon: '💊', title: { en: 'Pharmacology Reinforcement', fr: 'Renforcement en pharmacologie' }, desc: { en: 'Review medication concepts in a format designed for retention, NCLEX-style application, and nursing implications.', fr: 'Révisez les concepts médicamenteux dans un format pensé pour la rétention, l’application type NCLEX et les implications infirmières.' } },
    { icon: '📹', title: { en: 'Rationales That Teach', fr: 'Des rationales qui enseignent' }, desc: { en: 'Give learners a stronger review loop with explanations that support understanding, not just answer-checking.', fr: 'Offrez aux apprenants une boucle de révision plus forte avec des explications qui soutiennent la compréhension, pas seulement la vérification de réponse.' } },
    { icon: '🏫', title: { en: 'Program and LMS Readiness', fr: 'Préparation programme et LMS' }, desc: { en: 'Support nursing schools and organization partners with workflows that fit cohort review, remediation, and LMS-aligned delivery.', fr: 'Soutenez les écoles infirmières et les partenaires organisationnels avec des workflows adaptés à la révision de cohorte, à la remédiation et à une diffusion alignée LMS.' } },
  ];

  institutionFeatures = [
    { icon: '📊', title: { en: 'Predictive Analytics', fr: 'Analytique prédictive' }, desc: { en: 'AI-powered assessments identify at-risk candidates early, enabling proactive intervention and reducing NCLEX failure rates by up to 40%.', fr: 'Des évaluations propulsées par l’IA identifient tôt les candidats à risque, permettent des interventions proactives et réduisent les taux d’échec NCLEX jusqu’à 40 %.' } },
    { icon: '🧠', title: { en: 'Clinical Judgment Mastery', fr: 'Maîtrise du jugement clinique' }, desc: { en: 'Adaptive NGN item practice with contextual clinical scenarios mirrors real-world decision-making and strengthens patient safety judgment.', fr: 'La pratique adaptative des items NGN avec scénarios cliniques contextualisés reproduit la prise de décision réelle et renforce le jugement de sécurité du patient.' } },
    { icon: '🎯', title: { en: 'Personalized Learning Paths', fr: 'Parcours d’apprentissage personnalisés' }, desc: { en: 'Machine learning algorithms tailor content difficulty and topic focus to each learner\'s unique strengths and remediation needs.', fr: 'Les algorithmes de machine learning ajustent la difficulté du contenu et les thèmes aux forces propres de chaque apprenant et à ses besoins de remédiation.' } },
    { icon: '👥', title: { en: 'Cohort Operations Dashboard', fr: 'Tableau de bord des opérations de cohorte' }, desc: { en: 'Faculty and program directors monitor real-time progress, identify struggling learners, and track institutional readiness benchmarks.', fr: 'Les enseignants et directions de programme suivent la progression en temps réel, identifient les apprenants en difficulté et pilotent les indicateurs de préparation institutionnelle.' } },
    { icon: '⚙️', title: { en: 'Seamless LMS Integration', fr: 'Intégration LMS fluide' }, desc: { en: 'Native Canvas, Blackboard, and D2L connectors ensure effortless deployment across institutional learning environments.', fr: 'Des connecteurs natifs Canvas, Blackboard et D2L assurent un déploiement sans friction dans les environnements d’apprentissage institutionnels.' } },
    { icon: '📈', title: { en: 'Enterprise Reporting', fr: 'Reporting enterprise' }, desc: { en: 'Institutional dashboards track pass rates, time-to-readiness, demographic performance trends, and ROI on licensing preparation.', fr: 'Les tableaux de bord institutionnels suivent les taux de réussite, le temps jusqu’à la préparation, les tendances de performance démographiques et le ROI de la préparation à la licence.' } },
  ];

  packages = [
    { name: { en: 'Essential', fr: 'Essentiel' }, price: '$59', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'For learners starting RN exam prep', fr: 'Pour les apprenants qui commencent la préparation RN' }, features: [{ en: 'RN Q-Bank access', fr: 'Accès à la banque de questions RN' }, { en: 'CAT readiness starter mode', fr: 'Mode de préparation CAT de départ' }, { en: 'Pharmacology review', fr: 'Révision en pharmacologie' }, { en: 'Mobile and web access', fr: 'Accès mobile et web' }] },
    { name: { en: 'Professional', fr: 'Professionnel' }, price: '$129', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Best fit for active NCLEX-RN timelines', fr: 'Idéal pour des échéances NCLEX-RN actives' }, features: [{ en: 'Full RN Q-Bank', fr: 'Banque RN complète' }, { en: 'Unlimited CAT exams', fr: 'Examens CAT illimités' }, { en: 'NGN case practice', fr: 'Pratique de cas NGN' }, { en: 'Video rationales', fr: 'Rationales vidéo' }, { en: 'Targeted remediation', fr: 'Remédiation ciblée' }, { en: 'Performance dashboard', fr: 'Tableau de bord de performance' }] },
    { name: { en: 'Institution', fr: 'Institution' }, price: { en: 'Custom', fr: 'Sur mesure' }, period: '', popular: false, desc: { en: 'For nursing schools and organizations', fr: 'Pour les écoles infirmières et les organisations' }, features: [{ en: 'Faculty analytics dashboard', fr: 'Tableau de bord analytique faculté' }, { en: 'Cohort readiness tracking', fr: 'Suivi de préparation des cohortes' }, { en: 'LMS integration support', fr: 'Support d’intégration LMS' }, { en: 'Remediation assignment workflows', fr: 'Workflows d’assignation de remédiation' }, { en: 'Implementation guidance', fr: 'Accompagnement de mise en œuvre' }, { en: 'Dedicated success support', fr: 'Support succès dédié' }] },
  ];

  organizationBenefits = [
    { en: 'Cohort-level NCLEX-RN readiness tracking for instructors and program leads', fr: 'Suivi de préparation NCLEX-RN au niveau cohorte pour les formateurs et responsables de programme' },
    { en: 'Support for LMS-connected delivery across Canvas, Blackboard, Moodle, and blended models', fr: 'Support pour une diffusion connectée LMS sur Canvas, Blackboard, Moodle et des modèles hybrides' },
    { en: 'Structured remediation for repeat testers, exit cohorts, and accelerated nursing tracks', fr: 'Remédiation structurée pour les repeat testers, les cohortes de sortie et les parcours infirmiers accélérés' },
    { en: 'A single operating layer for learner prep, reporting, and program accountability', fr: 'Une seule couche opérationnelle pour la préparation apprenante, le reporting et la responsabilité programme' },
  ];
}
