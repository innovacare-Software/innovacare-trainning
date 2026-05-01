import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';

@Component({
  selector: 'app-pricing-modern-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective],
  templateUrl: './pricing-modern.page.html',
  styleUrls: ['./pricing-modern.page.css'],
})
export class PricingModernPage {
  readonly highlights = [
    'Immediate learner activation',
    'Progress reporting and coaching tools',
    'Volume pricing for schools and training teams',
  ];

  readonly tiers = [
    {
      name: 'Starter',
      price: '$79',
      tagline: 'For focused self-study learners',
      features: ['Qbank access', 'Progress dashboard', 'Mobile review', 'Community access'],
      cta: 'Choose Starter',
    },
    {
      name: 'Accelerator',
      price: '$149',
      tagline: 'Best for 4-8 week exam preparation',
      features: ['Adaptive study plan', 'Readiness analytics', 'Live coaching sessions', 'Priority support'],
      featured: true,
      cta: 'Start Accelerator',
    },
    {
      name: 'Institution',
      price: 'Custom',
      tagline: 'For schools and cohort operators',
      features: ['Bulk licensing', 'Cohort reporting', 'Org-based onboarding', 'Dedicated onboarding'],
      cta: 'Talk to Sales',
    },
  ];
}