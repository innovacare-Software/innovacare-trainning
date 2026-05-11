import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule } from '@jsverse/transloco';
import { Router, RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';
import {
  DOMAIN_PRESETS,
  HERO_STATS,
  PROGRAM_TRACKS,
  TESTIMONIALS,
  TRUST_BADGES,
  VALUE_PROPS,
  WHY_CHOOSE_US,
} from '../../../shared/marketing/marketing-site.data';
import { MarketingContentService } from '../../../shared/marketing/services/marketing-content.service';
import { MarketingLeadsService } from '../../../shared/marketing/services/marketing-leads.service';
import { LanguageService } from '../../../core/language.service';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

type QuizGoal = 'fast-pass' | 'confidence' | 'repeat' | 'institution';

@Component({
  selector: 'app-public-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatSnackBarModule, TranslocoModule, LocalizedFieldPipe, HeroParallaxDirective],
  templateUrl: './public-home.page.html',
  styleUrls: ['./public-home.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHomePage {
  private readonly marketingContent = inject(MarketingContentService);
  private readonly marketingLeads = inject(MarketingLeadsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);

  readonly site = DOMAIN_PRESETS['nclex'];
  readonly heroStats = HERO_STATS;
  readonly valueProps = VALUE_PROPS;
  readonly nursingTracks = PROGRAM_TRACKS.filter((item) => item.category === 'nursing');
  readonly medicalTracks = PROGRAM_TRACKS.filter((item) => item.category === 'medical');
  readonly whyChooseUs = WHY_CHOOSE_US;
  readonly trustBadges = TRUST_BADGES;
  readonly testimonials = TESTIMONIALS;
  readonly blogPosts = toSignal(this.marketingContent.getBlogPosts(), { initialValue: [] });

  readonly visuals = {
    heroBackdrop: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778122215/ChatGPT_Image_6_mai_2026_22_49_30_3_pr18gz.png',
    heroPrimary: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
    heroSecondary: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
    heroTertiary: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    nursingSpotlight: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    medicalSpotlight: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
    storiesSpotlight: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
  };

  readonly appPrograms = [
    { title: 'TEAS 7', subtitle: { en: 'Foundations + timed drills', fr: 'Fondations + exercices chronés' } },
    { title: 'NCLEX', subtitle: { en: 'Adaptive practice + analytics', fr: 'Pratique adaptative + analytique' } },
    { title: { en: 'Nursing School', fr: 'École d’infirmières' }, subtitle: { en: 'Lecture support + review', fr: 'Soutien de cours + révision' } },
    { title: 'FNP / PMHNP', subtitle: { en: 'Board-style readiness', fr: 'Préparation type board' } },
    { title: 'CCRN', subtitle: { en: 'Critical care prep paths', fr: 'Parcours de préparation soins intensifs' } },
    { title: { en: 'More Coming', fr: 'À venir' }, subtitle: { en: 'New cohorts & pathways', fr: 'Nouvelles cohortes et nouveaux parcours' } },
  ];

  examWindow = '8-weeks';
  targetTrack = 'nclex-rn';
  studyStyle: QuizGoal = 'fast-pass';
  quizLeadEmail = '';
  quizSubmitting = false;

  readonly quizRecommendation = computed(() => {
    this.lang.currentLang();

    if (this.studyStyle === 'institution' || this.targetTrack === 'institution') {
      return {
        title: this.lang.instant('HOME_MARKETING.quiz.recommendation_institution_title'),
        body: this.lang.instant('HOME_MARKETING.quiz.recommendation_institution_body'),
        route: '/contact',
        fragment: undefined,
      };
    }

    if (this.targetTrack === 'nclex-pn' || this.studyStyle === 'repeat') {
      return {
        title: this.lang.instant('HOME_MARKETING.quiz.recommendation_pn_title'),
        body: this.lang.instant('HOME_MARKETING.quiz.recommendation_pn_body'),
        route: '/courses',
        fragment: 'nursing',
      };
    }

    if (this.examWindow === '4-weeks') {
      return {
        title: this.lang.instant('HOME_MARKETING.quiz.recommendation_rn_title'),
        body: this.lang.instant('HOME_MARKETING.quiz.recommendation_rn_body'),
        route: '/courses',
        fragment: 'nursing',
      };
    }

    return {
      title: this.lang.instant('HOME_MARKETING.quiz.recommendation_clinical_title'),
      body: this.lang.instant('HOME_MARKETING.quiz.recommendation_clinical_body'),
      route: '/courses',
      fragment: 'medical',
    };
  });

  readonly quizPrimaryLabel = computed(() =>
    this.quizRecommendation().route === '/contact'
      ? this.lang.instant('HOME_MARKETING.quiz.primary_institution')
      : this.lang.instant('HOME_MARKETING.quiz.primary_default')
  );

  readonly canSaveQuizRecommendation = computed(() => !!this.quizLeadEmail.trim() && !this.quizSubmitting);

  readonly blogHighlights = computed(() => this.blogPosts().slice(0, 3));

  readonly featuredTestimonials = computed(() => this.testimonials.slice(0, 6));

  readonly primaryBadges = computed(() => this.trustBadges.slice(0, 4));

  async openQuizRecommendation(): Promise<void> {
    if (this.quizSubmitting) {
      return;
    }

    const email = this.quizLeadEmail.trim();
    if (email) {
      await this.submitQuizLead(true);
    }

    const recommendation = this.quizRecommendation();

    await this.router.navigate([recommendation.route], {
      fragment: recommendation.fragment,
      queryParams: {
        source: 'quiz',
        examWindow: this.examWindow,
        track: this.targetTrack,
        goal: this.studyStyle,
      },
    });
  }

  async submitQuizLead(silent = false): Promise<void> {
    const email = this.quizLeadEmail.trim();
    if (this.quizSubmitting) return;

    if (!email) {
      this.snackBar.open(this.lang.instant('HOME_MARKETING.quiz.email_required'), this.lang.instant('COMMON.close'), {
        duration: 4000,
      });
      return;
    }

    this.quizSubmitting = true;
    try {
      await this.marketingLeads.submitLead({
        name: 'Quiz Prospect',
        email,
        interest: `${this.targetTrack}:${this.examWindow}`,
        message: `Study goal: ${this.studyStyle}`,
        source: 'quiz',
      });

      if (!silent) {
        this.snackBar.open(
          this.lang.instant('HOME_MARKETING.quiz.saved'),
          this.lang.instant('COMMON.close'),
          { duration: 5000 }
        );
      }
    } finally {
      this.quizSubmitting = false;
    }
  }
}