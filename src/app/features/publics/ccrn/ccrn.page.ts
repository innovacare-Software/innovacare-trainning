import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-ccrn-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './ccrn.page.html',
  styleUrls: ['./ccrn.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CcrnPage {
  readonly content = {
    hero: {
      kicker: { en: 'CCRN® Critical Care Certification', fr: 'Certification CCRN® en soins critiques' },
      title: { en: 'Pass Your CCRN® & Advance Your Critical Care Career', fr: 'Réussissez votre CCRN® et faites progresser votre carrière en soins critiques' },
      lead: { en: 'AACN blueprint-aligned CCRN® prep with 2,500+ questions covering cardiovascular, pulmonary, neuro and multisystem critical care — plus 20+ CE credit hours included.', fr: 'Préparation CCRN® alignée au blueprint AACN avec plus de 2 500 questions couvrant soins critiques cardiovasculaires, pulmonaires, neuro et multisystémiques, avec plus de 20 heures de crédits CE incluses.' },
      stats: [
        { value: '2,500+', label: { en: 'CCRN-format questions', fr: 'Questions format CCRN' } },
        { value: 'AACN', label: { en: 'Blueprint-aligned', fr: 'Aligné blueprint' } },
        { value: '20+ CE', label: { en: 'Credit hours included', fr: 'Heures crédit incluses' } },
        { value: 'All ICU', label: { en: 'Specialties covered', fr: 'Spécialités couvertes' } },
      ],
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'View Pricing', fr: 'Voir les tarifs' },
      cardTitle: { en: 'What\'s included in CCRN Prep?', fr: 'Que contient la préparation CCRN ?' },
    },
    featuresSection: {
      title: { en: 'Mastery-Level Critical Care Certification Prep', fr: 'Une préparation à la certification en soins critiques de niveau maîtrise' },
      body: { en: 'Complete coverage of all AACN CCRN exam categories with clinical depth.', fr: 'Couverture complète de toutes les catégories de l’examen AACN CCRN avec une vraie profondeur clinique.' },
    },
    plans: {
      title: { en: 'CCRN® Prep Plans', fr: 'Plans de préparation CCRN®' },
      body: { en: 'Earn your CCRN® and CE credits at the same time.', fr: 'Obtenez votre CCRN® et vos crédits CE en même temps.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    ctaBanner: {
      title: { en: 'Advance Your Critical Care Career Today', fr: 'Faites progresser votre carrière en soins critiques dès aujourd’hui' },
      body: { en: 'Free 7-day trial — no credit card required.', fr: 'Essai gratuit de 7 jours, sans carte bancaire.' },
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'Talk to an Advisor', fr: 'Parler à un conseiller' },
    },
  } as const;
  features = [
    { icon: '🫀', title: { en: 'Cardiovascular Systems', fr: 'Systèmes cardiovasculaires' }, desc: { en: 'Hemodynamic monitoring, dysrhythmia interpretation, cardiac emergencies and advanced cardiovascular care.', fr: 'Monitoring hémodynamique, interprétation des dysrythmies, urgences cardiaques et prise en charge cardiovasculaire avancée.' } },
    { icon: '🫁', title: { en: 'Pulmonary Module', fr: 'Module pulmonaire' }, desc: { en: 'Mechanical ventilation management, respiratory failure, ABG interpretation and pulmonary critical care.', fr: 'Gestion de la ventilation mécanique, insuffisance respiratoire, interprétation des GDS et soins critiques pulmonaires.' } },
    { icon: '🧠', title: { en: 'Neurocritical Care', fr: 'Neurosoins critiques' }, desc: { en: 'ICP monitoring, neurological assessment, stroke management and neuro ICU protocols.', fr: 'Surveillance de la PIC, évaluation neurologique, prise en charge AVC et protocoles de neuro-réanimation.' } },
    { icon: '🩺', title: { en: 'Multisystem Review', fr: 'Revue multisystémique' }, desc: { en: '2,500+ CCRN-format questions spanning all AACN blueprint categories with detailed rationale.', fr: 'Plus de 2 500 questions format CCRN couvrant toutes les catégories du blueprint AACN avec rationales détaillées.' } },
    { icon: '📊', title: { en: 'AACN Blueprint Aligned', fr: 'Aligné au blueprint AACN' }, desc: { en: 'Content mapped to the current CCRN exam blueprint — study only what counts on test day.', fr: 'Contenu mappé sur le blueprint actuel de l’examen CCRN: étudiez uniquement ce qui compte le jour J.' } },
    { icon: '🎓', title: { en: 'CE Credit Eligible', fr: 'Éligible crédits CE' }, desc: { en: 'Earn 20+ AACN continuing education credits while preparing for your CCRN certification exam.', fr: 'Obtenez plus de 20 crédits de formation continue AACN pendant votre préparation à la certification CCRN.' } },
  ];

  packages = [
    { name: { en: 'Standard', fr: 'Standard' }, price: '$69', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'CCRN fundamentals', fr: 'Fondamentaux CCRN' }, features: [{ en: '1,000 CCRN questions', fr: '1 000 questions CCRN' }, { en: 'Cardiovascular module', fr: 'Module cardiovasculaire' }, { en: 'Pulmonary module', fr: 'Module pulmonaire' }, { en: 'Blueprint-aligned plan', fr: 'Plan aligné au blueprint' }] },
    { name: { en: 'Professional', fr: 'Professionnel' }, price: '$149', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Complete CCRN prep', fr: 'Préparation CCRN complète' }, features: [{ en: 'Full 2,500 Q-Bank', fr: 'Banque complète de 2 500 questions' }, { en: 'All ICU modules', fr: 'Tous les modules ICU' }, { en: 'AACN blueprint coverage', fr: 'Couverture blueprint AACN' }, { en: 'Mock exams × 6', fr: 'Examens blancs × 6' }, { en: 'CE credit hours', fr: 'Heures de crédit CE' }, { en: 'Pass guarantee', fr: 'Garantie de réussite' }] },
    { name: { en: 'Elite Bundle', fr: 'Bundle Elite' }, price: '$229', period: { en: '/6 months', fr: '/6 mois' }, popular: false, desc: { en: 'Expert critical care mastery', fr: 'Maîtrise experte des soins critiques' }, features: [{ en: 'Everything in Professional', fr: 'Tout le contenu Professionnel' }, { en: 'Live critical care webinars', fr: 'Webinaires live en soins critiques' }, { en: '1-on-1 CCRN coach', fr: 'Coach CCRN en individuel' }, { en: 'Case study library', fr: 'Bibliothèque d’études de cas' }, { en: 'Priority support', fr: 'Support prioritaire' }] },
  ];

  checkList = [
    { en: 'AACN blueprint-aligned content', fr: 'Contenu aligné au blueprint AACN' },
    { en: 'Earn 20+ CE credit hours', fr: 'Obtenez plus de 20 heures de crédits CE' },
    { en: '2,500+ CCRN-format questions', fr: 'Plus de 2 500 questions format CCRN' },
    { en: 'All critical care specialties covered', fr: 'Toutes les spécialités de soins critiques couvertes' },
    { en: 'Instant CCRN study certificate', fr: 'Certificat d’étude CCRN immédiat' },
  ];
}
