import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-for-educators-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, TranslocoModule],
  templateUrl: './for-educators.page.html',
  styleUrls: ['./for-educators.page.css'],
})
export class ForEducatorsPage {
  readonly features = [
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.qbank',
      desc: 'Standalone, readiness assessments, and full CAT exams aligned to the latest NCLEX blueprint.',
    },
    {
      icon: '✅',
      title: 'Readiness Indicators & Pass Prediction',
      desc: 'Know when each student is ready to sit for boards with an AI-powered readiness score.',
    },
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.videos',
      desc: 'High-yield content covering every nursing school subject, available 24/7.',
    },
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.cheatsheets',
      desc: 'Downloadable reference materials designed to reinforce content and reduce cognitive load.',
    },
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.live',
      desc: 'Instructor-led intensive sessions scheduled before exam season to maximize pass rates.',
    },
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.case_studies',
      desc: 'NGN-format unfolding cases that develop clinical reasoning skills progressively.',
    },
    {
      icon: '✅',
      titleKey: 'FOR_EDUCATORS.features.dashboard',
      desc: 'Full program management, cohort analytics and assignment creation at no additional cost.',
    },
  ];

  readonly dashboardFeatures = [
    { icon: '🔍', titleKey: 'FOR_EDUCATORS.dashboard_features.monitor', descKey: 'FOR_EDUCATORS.dashboard_features.monitor_desc' },
    { icon: '📝', titleKey: 'FOR_EDUCATORS.dashboard_features.assign', descKey: 'FOR_EDUCATORS.dashboard_features.assign_desc' },
    { icon: '📐', titleKey: 'FOR_EDUCATORS.dashboard_features.standardize', descKey: 'FOR_EDUCATORS.dashboard_features.standardize_desc' },
    { icon: '📊', titleKey: 'FOR_EDUCATORS.dashboard_features.assessments', descKey: 'FOR_EDUCATORS.dashboard_features.assessments_desc' },
    { icon: '🌐', titleKey: 'FOR_EDUCATORS.dashboard_features.benchmark', descKey: 'FOR_EDUCATORS.dashboard_features.benchmark_desc' },
    { icon: '✅', titleKey: 'FOR_EDUCATORS.dashboard_features.readiness', descKey: 'FOR_EDUCATORS.dashboard_features.readiness_desc' },
  ];

  readonly pricingTiers = [
    {
      nameKey: 'FOR_EDUCATORS.pricing.starter',
      subtitleKey: 'FOR_EDUCATORS.pricing.starter_period',
      price: 'Contact for pricing',
      popular: false,
      features: ['Q-Bank with 3,000+ NGN questions', 'CAT exam simulations', 'Educator dashboard', 'Cohort analytics', 'Email support'],
      ctaKey: 'FOR_EDUCATORS.pricing.get_started',
      ctaLink: '/for-educators/request-demo',
    },
    {
      nameKey: 'FOR_EDUCATORS.pricing.professional',
      subtitleKey: 'FOR_EDUCATORS.pricing.professional_period',
      price: 'Contact for pricing',
      popular: true,
      features: ['Everything in Starter', 'OnDemand video library (190+ hrs)', '3-Day live rapid review', 'Live case studies', 'Priority support'],
      ctaKey: 'FOR_EDUCATORS.pricing.request_pricing',
      ctaLink: '/for-educators/request-demo',
    },
    {
      nameKey: 'FOR_EDUCATORS.pricing.enterprise',
      subtitleKey: 'FOR_EDUCATORS.pricing.enterprise_period',
      priceKey: 'FOR_EDUCATORS.pricing.enterprise_price',
      popular: false,
      features: ['Everything in Professional', 'Custom LMS integrations', 'Dedicated success manager', 'SLA guarantee', 'White-label option'],
      ctaKey: 'FOR_EDUCATORS.pricing.contact_sales',
      ctaLink: '/contact',
    },
  ];
}
