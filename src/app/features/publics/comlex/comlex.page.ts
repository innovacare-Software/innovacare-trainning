import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-comlex-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './comlex.page.html',
  styleUrls: ['./comlex.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComlexPage {
  readonly content = {
    hero: {
      kicker: { en: 'COMLEX-USA® Board Prep', fr: 'Préparation boards COMLEX-USA®' },
      title: { en: 'Pass COMLEX-USA® Levels 1, 2 & 3 — Including Full OMM Mastery', fr: 'Réussissez les COMLEX-USA® Levels 1, 2 et 3, avec une maîtrise complète de l’OMM' },
      lead: { en: 'The only DO-focused board prep platform with dedicated OMM modules, 3D technique diagrams and dual COMLEX + USMLE preparation mode for osteopathic medical students.', fr: 'La seule plateforme de préparation boards centrée DO avec modules OMM dédiés, schémas techniques 3D et mode de préparation dual COMLEX + USMLE pour les étudiants en médecine ostéopathique.' },
      stats: [
        { value: 'Levels 1–3', label: { en: 'All levels covered', fr: 'Tous les niveaux couverts' } },
        { value: 'OMM', label: { en: '3D technique library', fr: 'Bibliothèque technique 3D' } },
        { value: '7,000+', label: { en: 'COMLEX-style questions', fr: 'Questions style COMLEX' } },
        { value: 'Dual Mode', label: { en: 'COMLEX + USMLE prep', fr: 'Préparation COMLEX + USMLE' } },
      ],
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'View Pricing', fr: 'Voir les tarifs' },
      cardTitle: { en: 'Why Innovacare for COMLEX?', fr: 'Pourquoi Innovacare pour COMLEX ?' },
    },
    section: {
      title: { en: 'DO Board Prep Built Around You', fr: 'Une préparation boards DO construite autour de vous' },
      body: { en: 'OMM mastery, dual-board prep and NBOME blueprint-aligned content.', fr: 'Maîtrise de l’OMM, préparation dual-board et contenu aligné au blueprint NBOME.' },
    },
    plans: {
      title: { en: 'COMLEX-USA® Prep Plans', fr: 'Plans de préparation COMLEX-USA®' },
      body: { en: 'Choose a single level or bundle all three for the best value.', fr: 'Choisissez un niveau unique ou regroupez les trois pour la meilleure valeur.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    ctaBanner: {
      title: { en: 'The COMLEX Prep Platform Built for DO Students', fr: 'La plateforme de préparation COMLEX conçue pour les étudiants DO' },
      body: { en: 'Free 7-day trial — no credit card required.', fr: 'Essai gratuit de 7 jours, sans carte bancaire.' },
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'Talk to an Advisor', fr: 'Parler à un conseiller' },
    },
  } as const;
  features = [
    { icon: '🦴', title: { en: 'OMM Mastery', fr: 'Maîtrise de l’OMM' }, desc: { en: 'Dedicated osteopathic manipulative medicine modules with 3D diagrams, technique reviews and COMLEX-specific questions.', fr: 'Modules dédiés de médecine manipulative ostéopathique avec schémas 3D, revues techniques et questions spécifiques COMLEX.' } },
    { icon: '🧬', title: { en: 'Level 1 Basic Science', fr: 'Sciences fondamentales Level 1' }, desc: { en: 'High-yield biomedical sciences content fused with osteopathic principles for COMLEX-USA Level 1.', fr: 'Contenu à haut rendement en sciences biomédicales combiné aux principes ostéopathiques pour le COMLEX-USA Level 1.' } },
    { icon: '🩺', title: { en: 'Level 2-CE Clinical', fr: 'Clinique Level 2-CE' }, desc: { en: 'Clinical encounters, patient presentations and applied OMM for COMLEX-USA Level 2-CE.', fr: 'Rencontres cliniques, présentations patients et OMM appliquée pour le COMLEX-USA Level 2-CE.' } },
    { icon: '🏥', title: { en: 'Level 3 Review', fr: 'Révision Level 3' }, desc: { en: 'Comprehensive COMLEX-USA Level 3 review with biopsychosocial model, patient management and board-style cases.', fr: 'Révision complète du COMLEX-USA Level 3 avec modèle biopsychosocial, gestion patient et cas type boards.' } },
    { icon: '📊', title: { en: 'Blueprint Mapping', fr: 'Cartographie blueprint' }, desc: { en: 'All content mapped to the current NBOME COMLEX-USA blueprints so you never study off-target material.', fr: 'Tout le contenu est mappé sur les blueprints actuels NBOME COMLEX-USA afin de ne jamais étudier hors cible.' } },
    { icon: '🔁', title: { en: 'Dual-Board Prep', fr: 'Préparation dual-board' }, desc: { en: 'Simultaneous COMLEX + USMLE prep mode for DO students taking both board examinations.', fr: 'Mode de préparation simultanée COMLEX + USMLE pour les étudiants DO qui passent les deux examens boards.' } },
  ];

  packages = [
    { name: { en: 'Level 1', fr: 'Level 1' }, price: '$79', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'COMLEX Level 1 focused', fr: 'Ciblé COMLEX Level 1' }, features: [{ en: 'Basic science modules', fr: 'Modules de sciences fondamentales' }, { en: 'OMM technique review', fr: 'Revue technique OMM' }, { en: '3,000 practice questions', fr: '3 000 questions pratiques' }, { en: 'Blueprint-aligned plan', fr: 'Plan aligné blueprint' }] },
    { name: { en: 'Levels 1+2', fr: 'Levels 1+2' }, price: '$159', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Best value for DO students', fr: 'Meilleure valeur pour les étudiants DO' }, features: [{ en: 'Levels 1 & 2 CE content', fr: 'Contenu Levels 1 et 2 CE' }, { en: 'OMM mastery module', fr: 'Module de maîtrise OMM' }, { en: '7,000 practice questions', fr: '7 000 questions pratiques' }, { en: 'Clinical encounter cases', fr: 'Cas de rencontres cliniques' }, { en: 'Dual-board prep mode', fr: 'Mode de préparation dual-board' }, { en: 'Performance analytics', fr: 'Analytique de performance' }] },
    { name: { en: 'Full DO Bundle', fr: 'Bundle DO complet' }, price: '$249', period: { en: '/6 months', fr: '/6 mois' }, popular: false, desc: { en: 'Levels 1, 2 & 3 complete', fr: 'Levels 1, 2 et 3 complets' }, features: [{ en: 'All three levels', fr: 'Les trois niveaux' }, { en: 'Unlimited mock exams', fr: 'Examens blancs illimités' }, { en: 'OMM 3D library', fr: 'Bibliothèque OMM 3D' }, { en: '1-on-1 DO coach', fr: 'Coach DO individuel' }, { en: 'Live review webinars', fr: 'Webinaires live de révision' }, { en: 'Score guarantee', fr: 'Garantie de score' }] },
  ];

  checkList = [
    { en: 'NBOME-aligned COMLEX blueprints', fr: 'Blueprints COMLEX alignés NBOME' },
    { en: 'OMM 3D diagrams & technique library', fr: 'Schémas 3D OMM et bibliothèque technique' },
    { en: 'Dual COMLEX + USMLE prep mode', fr: 'Mode de préparation dual COMLEX + USMLE' },
    { en: 'Clinical encounter simulations', fr: 'Simulations de rencontres cliniques' },
    { en: 'Levels 1, 2 & 3 fully covered', fr: 'Levels 1, 2 et 3 entièrement couverts' },
  ];
}
