import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';
import { TESTIMONIALS } from '../../../shared/marketing/marketing-site.data';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-testimonials-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective, TranslocoModule, LocalizedFieldPipe],
  templateUrl: './testimonials.page.html',
  styleUrls: ['./testimonials.page.css'],
})
export class TestimonialsPage {
  readonly testimonials = TESTIMONIALS;
  readonly pageSize = 3;
  readonly currentPage = signal(1);
  readonly heroStats = [
    { value: '16K+', label: { en: 'Reviews', fr: 'Avis' } },
    { value: '300K+', label: { en: 'Learners reached', fr: 'Apprenants touchés' } },
    { value: '98%', label: { en: 'Pass-ready confidence', fr: 'Confiance avant réussite' } },
  ];

  readonly trustLogos = ['NCLEX', 'Medical Review', { en: 'Institutions', fr: 'Institutions' }, { en: 'Career Pathways', fr: 'Parcours de carrière' }, { en: 'Mobile Prep', fr: 'Préparation mobile' }];

  readonly highlightStory = {
    title: { en: 'Success Stories: From study pressure to exam confidence', fr: 'Histoires de réussite : de la pression des études à la confiance pour l’examen' },
    body: { en: 'Delve into real learner stories, institutional wins and premium product experiences that made Innovacare feel trustworthy before the first purchase and valuable after enrollment.', fr: 'Découvrez de vraies histoires d’apprenants, des réussites institutionnelles et des expériences premium qui rendent Innovacare crédible avant l’achat et précieuse après l’inscription.' },
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    imageAlt: { en: 'Learner success story illustration', fr: 'Illustration de réussite apprenante' },
  };

  readonly gallery = [
    {
      title: { en: 'Learner momentum', fr: 'Élan de l’apprenant' },
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
      imageAlt: { en: 'Learner support and study momentum visual', fr: 'Visuel de soutien et d’élan d’étude' },
    },
    {
      title: { en: 'Exam readiness', fr: 'Préparation à l’examen' },
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
      imageAlt: { en: 'Exam readiness and confidence visual', fr: 'Visuel de préparation et de confiance' },
    },
    {
      title: { en: 'Institutional trust', fr: 'Confiance institutionnelle' },
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
      imageAlt: { en: 'Institutional learning platform visual', fr: 'Visuel de plateforme d’apprentissage institutionnelle' },
    },
  ];

  readonly spotlight = [
    { en: 'High-trust public proof for direct buyers', fr: 'Preuves publiques rassurantes pour les acheteurs directs' },
    { en: 'Institutional credibility for cohort sales', fr: 'Crédibilité institutionnelle pour les ventes en cohorte' },
    { en: 'Clear conversion path from testimonial to action', fr: 'Parcours clair du témoignage vers l’action' },
  ];

  readonly shareStoryPoints = [
    { en: 'Share a written or video testimonial in minutes', fr: 'Partagez un témoignage écrit ou vidéo en quelques minutes' },
    { en: 'Highlight real results, confidence gains and product experience', fr: 'Mettez en avant des résultats réels, les gains de confiance et l’expérience produit' },
    { en: 'Use social proof to drive the next enrollment decision', fr: 'Utilisez la preuve sociale pour soutenir la prochaine décision d’inscription' },
  ];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.testimonials.length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  readonly visibleTestimonials = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return this.testimonials.slice(startIndex, startIndex + this.pageSize);
  });

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }
}