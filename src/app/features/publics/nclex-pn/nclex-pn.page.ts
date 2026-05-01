import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-nclex-pn-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './nclex-pn.page.html',
  styleUrls: ['./nclex-pn.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NclexPnPage {
  readonly content = {
    hero: {
      kicker: { en: 'NCLEX-PN prep platform', fr: 'Plateforme de préparation NCLEX-PN' },
      title: { en: 'Pass NCLEX-PN with a Real Prep Platform for Learners, LMS Teams, and Nursing Organizations', fr: 'Réussissez le NCLEX-PN avec une vraie plateforme de préparation pour apprenants, équipes LMS et organisations infirmières' },
      lead: { en: 'Innovacare Review gives NCLEX-PN candidates a focused question bank, CAT-style readiness practice, and structured remediation, while schools and healthcare organizations get the reporting, rollout, and LMS support needed to move entire cohorts toward licensure success.', fr: 'Innovacare Review offre aux candidats NCLEX-PN une banque de questions ciblée, une pratique de préparation type CAT et une remédiation structurée, tandis que les écoles et organisations de santé bénéficient du reporting, du déploiement et du support LMS nécessaires pour faire progresser des cohortes entières vers la réussite à la licence.' },
      stats: [
        { value: 'PN', label: { en: 'Practical nursing scope aligned', fr: 'Aligné au champ de la pratique infirmière auxiliaire' } },
        { value: 'CAT', label: { en: 'Adaptive readiness sessions', fr: 'Sessions adaptatives de préparation' } },
        { value: 'LMS', label: { en: 'Built for cohorts and organizations', fr: 'Conçu pour les cohortes et les organisations' } },
        { value: 'Ops', label: { en: 'Faculty and program visibility', fr: 'Visibilité faculté et programme' } },
      ],
      primaryCta: { en: 'Start NCLEX-PN Access', fr: 'Démarrer l’accès NCLEX-PN' },
      secondaryCta: { en: 'Request LMS Demo', fr: 'Demander une démo LMS' },
      cardTitle: { en: 'Why teams choose Innovacare NCLEX-PN', fr: 'Pourquoi les équipes choisissent Innovacare NCLEX-PN' },
      opsBand: [
        { en: 'Learner readiness', fr: 'Préparation apprenant' },
        { en: 'Faculty visibility', fr: 'Visibilité faculté' },
        { en: 'Organization rollout', fr: 'Déploiement organisationnel' },
      ],
    },
    journeys: {
      title: { en: 'One NCLEX-PN Landing Page, Three Real Buyers', fr: 'Une landing page NCLEX-PN, trois vrais profils acheteurs' },
      body: { en: 'The product needs to convert individual learners, support nursing programs, and make sense for organizations that manage practical nurse pipelines.', fr: 'Le produit doit convertir les apprenants individuels, soutenir les programmes infirmiers et rester pertinent pour les organisations qui gèrent des parcours d’infirmiers auxiliaires.' },
    },
    tools: {
      title: { en: 'NCLEX-PN Tools That Go Beyond a Question Bank', fr: 'Des outils NCLEX-PN qui dépassent la simple banque de questions' },
      body: { en: 'From daily learner prep to faculty oversight, every layer is designed to improve NCLEX-PN readiness and make intervention easier.', fr: 'De la préparation quotidienne de l’apprenant au pilotage par la faculté, chaque couche est conçue pour améliorer la préparation NCLEX-PN et faciliter l’intervention.' },
    },
    plans: {
      title: { en: 'NCLEX-PN Plans for Individuals and Institutions', fr: 'Plans NCLEX-PN pour individus et institutions' },
      body: { en: 'Choose a learner plan for direct prep or a custom institutional setup for cohorts, nursing schools, and healthcare organizations.', fr: 'Choisissez un plan apprenant pour une préparation directe ou une configuration institutionnelle sur mesure pour les cohortes, les écoles infirmières et les organisations de santé.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    organizations: {
      title: { en: 'Built for LMS Teams and Organization-Level Deployment', fr: 'Conçu pour les équipes LMS et les déploiements à l’échelle organisationnelle' },
      body: { en: 'When NCLEX-PN is part of a program outcome, the platform needs more than learner access. It needs adoption support, reporting discipline, and simple rollout across teams.', fr: 'Quand le NCLEX-PN fait partie des résultats attendus d’un programme, la plateforme doit offrir plus qu’un simple accès apprenant. Elle doit soutenir l’adoption, la discipline de reporting et un déploiement simple entre équipes.' },
      eyebrow: { en: 'Institutional use case', fr: 'Cas d’usage institutionnel' },
      panelTitle: { en: 'NCLEX-PN readiness inside your existing learning ecosystem', fr: 'La préparation NCLEX-PN dans votre écosystème d’apprentissage existant' },
      panelBody: { en: 'Use Innovacare Review as a direct-to-learner prep engine or as a structured NCLEX support layer connected to faculty workflows, LMS operations, and remediation campaigns.', fr: 'Utilisez Innovacare Review comme moteur de préparation direct pour l’apprenant ou comme couche structurée de soutien NCLEX connectée aux workflows faculté, aux opérations LMS et aux campagnes de remédiation.' },
      primaryCta: { en: 'Schedule a Program Demo', fr: 'Planifier une démo programme' },
      secondaryCta: { en: 'Talk to Sales', fr: 'Parler aux ventes' },
    },
    ctaBanner: {
      title: { en: 'Launch NCLEX-PN Prep for a Learner or an Entire Cohort', fr: 'Lancez la préparation NCLEX-PN pour un apprenant ou une cohorte entière' },
      body: { en: 'Start direct learner access now or request an institutional walkthrough for your LMS, faculty team, or organization.', fr: 'Démarrez maintenant l’accès direct apprenant ou demandez une présentation institutionnelle pour votre LMS, votre équipe facultaire ou votre organisation.' },
      primaryCta: { en: 'Start Learner Access', fr: 'Démarrer l’accès apprenant' },
      secondaryCta: { en: 'Book Institutional Demo', fr: 'Réserver une démo institutionnelle' },
    },
  } as const;

  heroHighlights = [
    { en: 'NCLEX-PN question bank aligned to practical nursing scope', fr: 'Banque de questions NCLEX-PN alignée au champ de la pratique infirmière auxiliaire' },
    { en: 'Adaptive readiness views for individual learners and faculty teams', fr: 'Vues de préparation adaptative pour apprenants individuels et équipes facultaires' },
    { en: 'LMS-ready support for nursing schools, remediation cohorts, and partner organizations', fr: 'Support prêt pour le LMS pour écoles infirmières, cohortes de remédiation et organisations partenaires' },
  ];

  journeyCards = [
    {
      title: { en: 'For NCLEX-PN candidates', fr: 'Pour les candidats NCLEX-PN' },
      body: { en: 'Move from fundamentals review to CAT-readiness with daily targets, rationales, and focused remediation built for the PN exam blueprint.', fr: 'Passez de la révision des fondamentaux à la préparation CAT avec des objectifs quotidiens, des rationales et une remédiation ciblée construite pour le blueprint PN.' },
    },
    {
      title: { en: 'For nursing schools', fr: 'Pour les écoles infirmières' },
      body: { en: 'Give faculty a structured NCLEX-PN readiness layer with cohort visibility, benchmark reporting, and remediation workflows that support at-risk learners.', fr: 'Offrez à la faculté une couche structurée de préparation NCLEX-PN avec visibilité cohorte, reporting benchmark et workflows de remédiation pour soutenir les apprenants à risque.' },
    },
    {
      title: { en: 'For healthcare organizations', fr: 'Pour les organisations de santé' },
      body: { en: 'Standardize onboarding and exam-prep support for practical nurse pipelines with centralized tracking, organization-wide rollout, and accountable outcomes.', fr: 'Standardisez l’onboarding et le soutien à la préparation d’examen pour les parcours d’infirmiers auxiliaires avec un suivi centralisé, un déploiement organisationnel et des résultats responsabilisés.' },
    },
  ];

  features = [
    { icon: '🧠', title: { en: 'PN Question Bank', fr: 'Banque de questions PN' }, desc: { en: '4,500+ NCLEX-PN items mapped to client needs, safety priorities, and practical nurse decision-making.', fr: 'Plus de 4 500 items NCLEX-PN mappés sur les besoins du patient, les priorités de sécurité et la prise de décision en pratique infirmière auxiliaire.' } },
    { icon: '📈', title: { en: 'CAT Readiness Engine', fr: 'Moteur de préparation CAT' }, desc: { en: 'Adaptive practice exams mirror NCLEX-PN pacing and help learners see whether they are trending toward exam-day readiness.', fr: 'Les examens adaptatifs reproduisent le rythme NCLEX-PN et aident les apprenants à voir s’ils progressent vers une vraie préparation au jour J.' } },
    { icon: '💊', title: { en: 'Practical Nursing Pharmacology', fr: 'Pharmacologie en soins infirmiers auxiliaires' }, desc: { en: 'Reinforce medication knowledge with PN-level review, targeted drills, and rationale-backed answer explanations.', fr: 'Renforcez les connaissances médicamenteuses avec une révision niveau PN, des drills ciblés et des explications de réponses appuyées par des rationales.' } },
    { icon: '📋', title: { en: 'Clinical Judgment Practice', fr: 'Pratique du jugement clinique' }, desc: { en: 'Build confidence with NGN and NCJMM-style item types that train prioritization, cue recognition, and safe actions.', fr: 'Développez la confiance avec des types d’items NGN et style NCJMM qui entraînent priorisation, reconnaissance des indices et actions sécuritaires.' } },
    { icon: '🧩', title: { en: 'Remediation Workflows', fr: 'Workflows de remédiation' }, desc: { en: 'Surface weak domains quickly and route learners into focused study plans instead of generic repetition.', fr: 'Faites remonter rapidement les domaines faibles et orientez les apprenants vers des plans d’étude ciblés plutôt qu’une répétition générique.' } },
    { icon: '🏫', title: { en: 'Faculty and LMS Visibility', fr: 'Visibilité faculté et LMS' }, desc: { en: 'Support cohorts with reporting-friendly workflows and LMS-aligned deployment for schools and organization partners.', fr: 'Soutenez les cohortes avec des workflows compatibles reporting et un déploiement aligné LMS pour les écoles et les partenaires organisationnels.' } },
  ];

  packages = [
    { name: { en: 'Starter', fr: 'Départ' }, price: '$39', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'For learners starting NCLEX-PN prep', fr: 'Pour les apprenants qui démarrent la préparation NCLEX-PN' }, features: [{ en: '1,500 PN Q-Bank questions', fr: '1 500 questions PN' }, { en: 'CAT readiness baseline', fr: 'Base de préparation CAT' }, { en: 'Pharmacology review', fr: 'Révision pharmacologie' }, { en: 'Mobile-first study access', fr: 'Accès d’étude mobile-first' }] },
    { name: { en: 'Professional', fr: 'Professionnel' }, price: '$89', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Best fit for active NCLEX-PN test dates', fr: 'Idéal pour des dates NCLEX-PN actives' }, features: [{ en: 'Full 4,500 PN Q-Bank', fr: 'Banque complète de 4 500 questions PN' }, { en: 'Unlimited CAT exams', fr: 'Examens CAT illimités' }, { en: 'Clinical judgment item types', fr: 'Types d’items de jugement clinique' }, { en: 'Targeted remediation paths', fr: 'Parcours de remédiation ciblés' }, { en: 'Video rationales', fr: 'Rationales vidéo' }, { en: 'Performance dashboard', fr: 'Tableau de bord de performance' }] },
    { name: { en: 'Institution', fr: 'Institution' }, price: { en: 'Custom', fr: 'Sur mesure' }, period: '', popular: false, desc: { en: 'For schools, cohorts, and organizations', fr: 'Pour écoles, cohortes et organisations' }, features: [{ en: 'Faculty analytics dashboard', fr: 'Tableau de bord analytique faculté' }, { en: 'Cohort readiness reporting', fr: 'Reporting de préparation des cohortes' }, { en: 'LMS integration support', fr: 'Support intégration LMS' }, { en: 'Remediation assignment workflows', fr: 'Workflows d’assignation de remédiation' }, { en: 'Implementation guidance', fr: 'Accompagnement de mise en œuvre' }, { en: 'Dedicated success support', fr: 'Support succès dédié' }] },
  ];

  checkList = [
    { en: 'Aligned to the current NCLEX-PN test blueprint', fr: 'Aligné sur le blueprint actuel du NCLEX-PN' },
    { en: 'Clinical judgment and NCJMM-style practice included', fr: 'Pratique du jugement clinique et style NCJMM incluse' },
    { en: 'Adaptive readiness sessions for exam pacing', fr: 'Sessions adaptatives de préparation pour le rythme d’examen' },
    { en: 'Daily learner and cohort performance visibility', fr: 'Visibilité quotidienne de la performance apprenant et cohorte' },
    { en: 'Works across web and mobile study flows', fr: 'Fonctionne sur les parcours d’étude web et mobile' },
  ];

  organizationBenefits = [
    { en: 'Cohort-level NCLEX-PN readiness tracking for instructors and program leads', fr: 'Suivi de préparation NCLEX-PN au niveau cohorte pour les formateurs et responsables de programme' },
    { en: 'LMS-friendly rollout across Canvas, Blackboard, Moodle, and blended support models', fr: 'Déploiement compatible LMS sur Canvas, Blackboard, Moodle et modèles de soutien hybrides' },
    { en: 'Structured remediation for repeat testers, final-semester students, and onboarding cohorts', fr: 'Remédiation structurée pour repeat testers, étudiants de fin de semestre et cohortes d’onboarding' },
    { en: 'A single platform for learner prep, reporting, and program accountability', fr: 'Une plateforme unique pour préparation apprenante, reporting et responsabilité programme' },
  ];
}
