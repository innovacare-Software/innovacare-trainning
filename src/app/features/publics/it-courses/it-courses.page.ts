import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';

@Component({
  selector: 'app-it-courses-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective],
  templateUrl: './it-courses.page.html',
  styleUrls: ['./it-courses.page.css'],
})
export class ItCoursesPage {
  readonly metrics = [
    { value: '1,200+', label: 'Learners upskilled' },
    { value: '86%', label: 'Completion rate in cohorts' },
    { value: '42%', label: 'Faster onboarding for teams' },
    { value: '4.8/5', label: 'Satisfaction score' },
  ];

  readonly heroMedia = [
    {
      title: 'Platform Engineering',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1763480251/Microsoft.VisualStudio.Services.Icons_v34mjv.png',
      imageAlt: 'Docker and container workflow illustration',
    },
    {
      title: 'Cloud Operations',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1722757577/cloud_computing_jiskn1.png',
      imageAlt: 'Cloud computing illustration',
    },
    {
      title: 'Secure Delivery',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1722757577/Website-Development_syzev9.webp',
      imageAlt: 'Frontend development illustration',
    },
  ];

  readonly tracks: Array<{ title: string; body: string; imageUrl: string; imageAlt: string; badge: string; skills: string[] }> = [
    {
      title: 'Cloud & DevOps',
      body: 'Build production-grade pipelines with Azure, GitHub, release governance and incident-ready operations.',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1722757353/Devops1_pg6wx0.jpg',
      imageAlt: 'DevOps workspace and automation illustration',
      badge: 'Delivery pipeline',
      skills: ['Azure landing zones', 'CI/CD quality gates', 'Observability runbooks'],
    },
    {
      title: 'Cybersecurity',
      body: 'Strengthen team readiness with practical security controls, attack simulations and response playbooks.',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1722757578/cyber_secu_iuzal5.jpg',
      imageAlt: 'Cybersecurity monitoring illustration',
      badge: 'Security operations',
      skills: ['SOC workflows', 'Identity hardening', 'Compliance-by-design'],
    },
    {
      title: 'Data & AI Foundations',
      body: 'Upskill technical teams on data architecture, AI integration patterns and responsible automation.',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1722757577/cloud_computing_jiskn1.png',
      imageAlt: 'Cloud platform architecture illustration',
      badge: 'Transformation track',
      skills: ['Data pipelines', 'AI operations baseline', 'Governance guardrails'],
    },
  ];

  readonly deliveryModel = [
    {
      title: 'Diagnostic Sprint',
      desc: 'Evaluate current maturity, role gaps and learning priorities in 10 business days.',
    },
    {
      title: 'Role-Based Cohorts',
      desc: 'Separate paths for engineers, team leads and operations managers with measurable outcomes.',
    },
    {
      title: 'Executive Reporting',
      desc: 'Monthly progress dashboards for HR, L&D and leadership stakeholders.',
    },
  ];

  readonly plans = [
    {
      name: 'Team Launch',
      price: '$99',
      subtitle: 'per learner / month',
      features: ['Core LMS access', 'Weekly assignments', 'Progress tracking'],
      cta: 'Start Team Launch',
    },
    {
      name: 'Enterprise Cohort',
      price: '$199',
      subtitle: 'per learner / month',
      features: ['Live mentor sessions', 'Cohort analytics', 'Certification prep roadmap'],
      cta: 'Choose Enterprise Cohort',
      featured: true,
    },
    {
      name: 'Executive Premium',
      price: '$299',
      subtitle: 'per learner / month',
      features: ['Custom curriculum', 'Leadership enablement', 'Quarterly impact reviews'],
      cta: 'Request Executive Plan',
    },
  ];

  readonly faq = [
    {
      id: 'faq-1',
      question: 'Can we run private cohorts for a single company?',
      answer: 'Yes. We can deliver fully private cohorts with custom schedule, branding and reporting for one organization.',
    },
    {
      id: 'faq-2',
      question: 'Do you support bilingual teams?',
      answer: 'Yes. Content and facilitation can be delivered in English and French for mixed teams across regions.',
    },
    {
      id: 'faq-3',
      question: 'How quickly can we launch?',
      answer: 'Most teams can start in less than 14 days after the initial alignment call and skills diagnostic.',
    },
  ];

  readonly openFaq = signal<string | null>(this.faq[0]?.id ?? null);

  readonly outcomes = [
    'Enterprise curriculum built for delivery teams',
    'Measured progression with skills-based checkpoints',
    'Clear ROI narrative for leadership and HR',
  ];

  isFaqOpen(id: string): boolean {
    return this.openFaq() === id;
  }

  toggleFaq(id: string): void {
    this.openFaq.set(this.openFaq() === id ? null : id);
  }
}