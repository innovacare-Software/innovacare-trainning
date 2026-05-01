import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-usmle-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './usmle.page.html',
  styleUrls: ['./usmle.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsmlePage {
  readonly content = {
    hero: {
      kicker: { en: 'USMLE® Board Prep', fr: 'Préparation boards USMLE®' },
      title: { en: 'Crush USMLE® Steps 1, 2 CK & 3 — Score in the 99th Percentile', fr: 'Dominez les USMLE® Steps 1, 2 CK et 3, et visez le 99e percentile' },
      lead: { en: 'Comprehensive USMLE prep with adaptive Q-banks, spaced repetition, CCS case simulations and weekly percentile tracking — for medical students and residents at every stage.', fr: 'Une préparation USMLE complète avec banques de questions adaptatives, répétition espacée, simulations de cas CCS et suivi hebdomadaire du percentile, pour les étudiants en médecine et les résidents à chaque étape.' },
      stats: [
        { value: 'Steps 1–3', label: { en: 'All steps covered', fr: 'Toutes les étapes couvertes' } },
        { value: '8,000+', label: { en: 'Board-style questions', fr: 'Questions type boards' } },
        { value: '99th %ile', label: { en: 'Achievable score strategies', fr: 'Stratégies de score atteignables' } },
        { value: 'CCS', label: { en: 'Live case simulator', fr: 'Simulateur de cas live' } },
      ],
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'View Pricing', fr: 'Voir les tarifs' },
      cardTitle: { en: 'Why Innovacare USMLE?', fr: 'Pourquoi Innovacare USMLE ?' },
    },
    section: {
      title: { en: 'Everything You Need for USMLE Board Success', fr: 'Tout ce qu’il vous faut pour réussir les boards USMLE' },
      body: { en: 'From Step 1 basic sciences to Step 3 patient management — all three steps in one platform.', fr: 'Des sciences fondamentales du Step 1 à la gestion patient du Step 3: les trois étapes sur une seule plateforme.' },
    },
    plans: {
      title: { en: 'USMLE® Prep Plans', fr: 'Plans de préparation USMLE®' },
      body: { en: 'Pick one step or bundle all three for the best value.', fr: 'Choisissez une étape ou regroupez les trois pour la meilleure valeur.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    ctaBanner: {
      title: { en: 'Start Your USMLE Journey With Innovacare', fr: 'Commencez votre parcours USMLE avec Innovacare' },
      body: { en: 'Free 7-day trial — no credit card required.', fr: 'Essai gratuit de 7 jours, sans carte bancaire.' },
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'Talk to an Advisor', fr: 'Parler à un conseiller' },
    },
  } as const;
  features = [
    { icon: '🧬', title: { en: 'Step 1 Prep', fr: 'Préparation Step 1' }, desc: { en: 'High-yield basic science content — biochemistry, pathology, pharmacology and microbiology for USMLE Step 1.', fr: 'Contenu à haut rendement en sciences fondamentales: biochimie, pathologie, pharmacologie et microbiologie pour l’USMLE Step 1.' } },
    { icon: '🩺', title: { en: 'Step 2 CK', fr: 'Step 2 CK' }, desc: { en: 'Clinical knowledge shelf exams, case presentations and clinical reasoning for all major medical specialties.', fr: 'Connaissances cliniques, shelf exams, présentations de cas et raisonnement clinique pour toutes les grandes spécialités médicales.' } },
    { icon: '🏥', title: { en: 'Step 3 Review', fr: 'Révision Step 3' }, desc: { en: 'Ambulatory care, biostatistics, CCS case simulations and patient management for USMLE Step 3.', fr: 'Soins ambulatoires, biostatistiques, simulations de cas CCS et gestion du patient pour l’USMLE Step 3.' } },
    { icon: '🔁', title: { en: 'Spaced Repetition', fr: 'Répétition espacée' }, desc: { en: 'Anki-style flashcard system with adaptive scheduling to maximize long-term retention of high-yield facts.', fr: 'Système de flashcards type Anki avec planification adaptative pour maximiser la rétention à long terme des notions à haut rendement.' } },
    { icon: '📊', title: { en: 'Percentile Tracker', fr: 'Suivi du percentile' }, desc: { en: 'Compare your performance against thousands of students with weekly percentile rankings and weak-area heat maps.', fr: 'Comparez votre performance à celle de milliers d’étudiants avec des classements hebdomadaires par percentile et des heat maps des points faibles.' } },
    { icon: '📋', title: { en: 'CCS Simulator', fr: 'Simulateur CCS' }, desc: { en: 'Interactive CCS case simulator with real-time feedback on order entry, diagnosis and patient management decisions.', fr: 'Simulateur interactif de cas CCS avec feedback en temps réel sur les ordres, le diagnostic et les décisions de gestion patient.' } },
  ];

  packages = [
    { name: { en: 'Step 1', fr: 'Step 1' }, price: '$89', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'Focused Step 1 preparation', fr: 'Préparation ciblée Step 1' }, features: [{ en: 'High-yield basic science', fr: 'Sciences fondamentales à haut rendement' }, { en: '3,500 practice questions', fr: '3 500 questions pratiques' }, { en: 'Spaced repetition cards', fr: 'Cartes de répétition espacée' }, { en: 'Step 1 blueprint map', fr: 'Cartographie blueprint Step 1' }] },
    { name: { en: 'Steps 1+2', fr: 'Steps 1+2' }, price: '$179', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Most popular for med students', fr: 'Le plus populaire pour les étudiants en médecine' }, features: [{ en: 'All Steps 1 & 2 content', fr: 'Tout le contenu des Steps 1 et 2' }, { en: '8,000 practice questions', fr: '8 000 questions pratiques' }, { en: 'CK shelf exam prep', fr: 'Préparation CK shelf exams' }, { en: 'CCS case simulations', fr: 'Simulations de cas CCS' }, { en: 'Percentile tracker', fr: 'Suivi percentile' }, { en: '99-score strategies', fr: 'Stratégies pour viser 99' }] },
    { name: { en: 'Full USMLE Bundle', fr: 'Bundle USMLE complet' }, price: '$269', period: { en: '/6 months', fr: '/6 mois' }, popular: false, desc: { en: 'All three steps covered', fr: 'Les trois étapes couvertes' }, features: [{ en: 'Steps 1, 2 & 3 prep', fr: 'Préparation Steps 1, 2 et 3' }, { en: 'Unlimited practice questions', fr: 'Questions pratiques illimitées' }, { en: 'CCS simulator', fr: 'Simulateur CCS' }, { en: '1-on-1 tutoring', fr: 'Tutorat individuel' }, { en: 'Live review sessions', fr: 'Sessions live de révision' }, { en: 'Score guarantee', fr: 'Garantie de score' }] },
  ];

  checkList = [
    { en: 'Covers USMLE Steps 1, 2 CK & 3', fr: 'Couvre les USMLE Steps 1, 2 CK et 3' },
    { en: 'Anki-compatible spaced repetition', fr: 'Répétition espacée compatible Anki' },
    { en: 'Live CCS case simulator', fr: 'Simulateur live de cas CCS' },
    { en: 'Weekly percentile benchmarking', fr: 'Benchmark hebdomadaire par percentile' },
    { en: 'High-yield first-aid integration', fr: 'Intégration first-aid à haut rendement' },
  ];
}
