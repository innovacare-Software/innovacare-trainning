import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';

@Component({
  selector: 'app-features-modern-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective],
  templateUrl: './features-modern.page.html',
  styleUrls: ['./features-modern.page.css'],
})
export class FeaturesModernPage {
  readonly heroStats = ['Adaptive diagnostics', 'Institutional analytics', 'Conversion-ready UX'];

  readonly features = [
    { title: 'Adaptive learning engine', body: 'Diagnostics, remediation, and personalized pacing for exam readiness.' },
    { title: 'Social learning loops', body: 'Group accountability, peer progress, and engagement mechanics that improve retention.' },
    { title: 'Institutional analytics', body: 'Track cohort health, onboarding progress, and conversion into learner activation.' },
    { title: 'Mobile-first product entry', body: 'Public site, LMS handoff, and app engagement all aligned in one funnel.' },
    { title: 'Multi-tenant architecture', body: 'Support multiple brands, industries, and org-specific experiences from a shared foundation.' },
    { title: 'Growth-ready content system', body: 'SEO pages, trust sections, blogs, and CTA blocks designed for conversion velocity.' },
  ];
}