import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-pance-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LocalizedFieldPipe],
  templateUrl: './pance.page.html',
  styleUrls: ['./pance.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PancePage {
  readonly content = {
    hero: {
      kicker: { en: 'PANCE / PANRE® Prep', fr: 'Préparation PANCE / PANRE®' },
      title: { en: 'Pass PANCE® First Time & Maintain Your PANRE® Certification', fr: 'Réussissez le PANCE® du premier coup et maintenez votre certification PANRE®' },
      lead: { en: 'NCCPA blueprint-aligned prep for the PANCE and PANRE with 5,000+ clinical questions, organ system analytics and 25 AAPA Category 1 CME credits included.', fr: 'Préparation alignée au blueprint NCCPA pour le PANCE et le PANRE avec plus de 5 000 questions cliniques, une analytique par système d’organes et 25 crédits CME AAPA Category 1 inclus.' },
      stats: [
        { value: '93%', label: { en: 'First-attempt pass rate', fr: 'Taux de réussite à la première tentative' } },
        { value: '5,000+', label: { en: 'PANCE/PANRE questions', fr: 'Questions PANCE/PANRE' } },
        { value: '25 CME', label: { en: 'AAPA Category 1 credits', fr: 'Crédits AAPA Category 1' } },
        { value: '12 Systems', label: { en: 'Organ system tracking', fr: 'Suivi par système d’organes' } },
      ],
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'View Pricing', fr: 'Voir les tarifs' },
      cardTitle: { en: 'Why Innovacare for PANCE/PANRE?', fr: 'Pourquoi Innovacare pour PANCE/PANRE ?' },
    },
    section: {
      title: { en: 'PA Board Prep Designed Around the NCCPA Blueprint', fr: 'Une préparation boards PA conçue autour du blueprint NCCPA' },
      body: { en: 'Study smarter with organ-system analytics and real-world PA clinical scenarios.', fr: 'Étudiez plus intelligemment avec une analytique par système d’organes et des scénarios cliniques PA du monde réel.' },
    },
    plans: {
      title: { en: 'PANCE / PANRE® Prep Plans', fr: 'Plans de préparation PANCE / PANRE®' },
      body: { en: 'Initial certification or recertification — we cover both.', fr: 'Certification initiale ou recertification: nous couvrons les deux.' },
      popularBadge: { en: 'Most Popular', fr: 'Le plus populaire' },
      cta: { en: 'Get Started', fr: 'Commencer' },
    },
    ctaBanner: {
      title: { en: 'Your PA Career Starts With a Passing Score', fr: 'Votre carrière de PA commence par un score réussi' },
      body: { en: 'Free 7-day trial — no credit card required.', fr: 'Essai gratuit de 7 jours, sans carte bancaire.' },
      primaryCta: { en: 'Start Free Trial', fr: 'Commencer l’essai gratuit' },
      secondaryCta: { en: 'Talk to an Advisor', fr: 'Parler à un conseiller' },
    },
  } as const;
  features = [
    { icon: '🫁', title: { en: 'PANCE Blueprint Aligned', fr: 'Aligné au blueprint PANCE' }, desc: { en: '5,000+ PANCE practice questions organized by organ system and task area per the current NCCPA blueprint.', fr: 'Plus de 5 000 questions pratiques PANCE organisées par système d’organes et domaine de tâches selon le blueprint NCCPA actuel.' } },
    { icon: '🔄', title: { en: 'PANRE Maintenance', fr: 'Maintien PANRE' }, desc: { en: 'Recertification prep with focused 10-year content updates, new clinical guidelines and maintenance-of-certification questions.', fr: 'Préparation à la recertification avec mises à jour ciblées sur 10 ans, nouvelles recommandations cliniques et questions de maintien de certification.' } },
    { icon: '🩺', title: { en: 'Clinical Scenarios', fr: 'Scénarios cliniques' }, desc: { en: 'Real-world PA clinical case simulations with diagnosis, management, follow-up and patient communication practice.', fr: 'Simulations de cas cliniques PA du monde réel avec diagnostic, prise en charge, suivi et pratique de communication patient.' } },
    { icon: '💊', title: { en: 'PA Pharmacology', fr: 'Pharmacologie PA' }, desc: { en: 'PA-scope pharmacology with prescribing pearls, drug comparison tables and first-line vs. alternative therapy reviews.', fr: 'Pharmacologie au périmètre PA avec pearls de prescription, tableaux comparatifs et revues des thérapies de première ligne versus alternatives.' } },
    { icon: '📊', title: { en: 'Organ System Tracker', fr: 'Suivi par système d’organes' }, desc: { en: 'Performance analytics broken down by all 12 organ systems so you can pinpoint your weakest PANCE content areas.', fr: 'Une analytique de performance détaillée sur les 12 systèmes d’organes pour repérer précisément vos zones de faiblesse PANCE.' } },
    { icon: '🎓', title: { en: 'CME Credit Hours', fr: 'Heures de crédits CME' }, desc: { en: 'Earn up to 25 AAPA Category 1 CME credits while preparing for your PANCE or PANRE certification exam.', fr: 'Obtenez jusqu’à 25 crédits CME AAPA Category 1 pendant votre préparation au PANCE ou au PANRE.' } },
  ];

  packages = [
    { name: { en: 'PANCE Prep', fr: 'Préparation PANCE' }, price: '$69', period: { en: '/month', fr: '/mois' }, popular: false, desc: { en: 'First-time PANCE takers', fr: 'Pour les primo-candidats PANCE' }, features: [{ en: '3,000 PANCE questions', fr: '3 000 questions PANCE' }, { en: 'Organ system modules', fr: 'Modules par système d’organes' }, { en: 'Blueprint tracking', fr: 'Suivi du blueprint' }, { en: 'Pharmacology deck', fr: 'Deck de pharmacologie' }] },
    { name: { en: 'PANCE Pro', fr: 'PANCE Pro' }, price: '$149', period: { en: '/3 months', fr: '/3 mois' }, popular: true, desc: { en: 'Complete PANCE preparation', fr: 'Préparation PANCE complète' }, features: [{ en: 'Full 5,000 Q-Bank', fr: 'Banque complète de 5 000 questions' }, { en: 'Clinical case scenarios', fr: 'Scénarios de cas cliniques' }, { en: 'AAPA CME credits', fr: 'Crédits CME AAPA' }, { en: 'Organ system tracker', fr: 'Suivi par système d’organes' }, { en: 'Mock full-length exams', fr: 'Examens blancs complets' }, { en: 'Pass guarantee', fr: 'Garantie de réussite' }] },
    { name: { en: 'PANCE + PANRE', fr: 'PANCE + PANRE' }, price: '$219', period: { en: '/6 months', fr: '/6 mois' }, popular: false, desc: { en: 'Both initial and recertification', fr: 'Initiale et recertification' }, features: [{ en: 'All PANCE Pro features', fr: 'Toutes les fonctionnalités PANCE Pro' }, { en: 'PANRE maintenance modules', fr: 'Modules de maintien PANRE' }, { en: 'Updated clinical guidelines', fr: 'Recommandations cliniques mises à jour' }, { en: '1-on-1 PA coach', fr: 'Coach PA individuel' }, { en: 'Live review webinars', fr: 'Webinaires live de révision' }, { en: 'Priority support', fr: 'Support prioritaire' }] },
  ];

  checkList = [
    { en: 'NCCPA PANCE + PANRE blueprints', fr: 'Blueprints NCCPA PANCE + PANRE' },
    { en: 'Earn 25 AAPA Category 1 CME credits', fr: 'Obtenez 25 crédits AAPA Category 1 CME' },
    { en: '5,000+ practice questions by organ system', fr: 'Plus de 5 000 questions pratiques par système d’organes' },
    { en: 'Clinical scenario simulations', fr: 'Simulations de scénarios cliniques' },
    { en: 'Recertification maintenance track', fr: 'Parcours de maintien de recertification' },
  ];
}
