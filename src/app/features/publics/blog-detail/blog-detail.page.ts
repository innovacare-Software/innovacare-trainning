import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule } from '@jsverse/transloco';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { LanguageService } from '../../../core/language.service';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';
import { MarketingContentService } from '../../../shared/marketing/services/marketing-content.service';
import { MarketingSeoService } from '../../../shared/marketing/services/marketing-seo.service';

@Component({
  selector: 'app-blog-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective, TranslocoModule],
  templateUrl: './blog-detail.page.html',
  styleUrls: ['./blog-detail.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly marketingContent = inject(MarketingContentService);
  private readonly seo = inject(MarketingSeoService);
  readonly lang = inject(LanguageService);

  readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')), {
    initialValue: '',
  });

  readonly post = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      switchMap((slug) => this.marketingContent.getBlogPostBySlug(slug))
    ),
    { initialValue: null }
  );

  readonly relatedPosts = toSignal(this.marketingContent.getBlogPosts(), { initialValue: [] });

  readonly recommendations = computed(() => {
    const currentSlug = this.slug();
    return this.relatedPosts().filter((post) => post.slug !== currentSlug).slice(0, 3);
  });

  readonly articleSignals = computed(() => {
    const article = this.post();
    this.lang.currentLang();

    if (!article) {
      return [] as Array<{ value: string; label: string }>;
    }

    return [
      { value: `${article.sections.length}`, label: this.lang.instant('BLOG_DETAIL.stats.sections') },
      { value: `${article.tags.length}`, label: this.lang.instant('BLOG_DETAIL.stats.tags') },
      { value: article.readTime, label: this.lang.instant('BLOG_DETAIL.stats.read_time') },
    ];
  });

  constructor() {
    effect(() => {
      const article = this.post();
      if (!article) {
        return;
      }

      const isFrench = this.router.url.startsWith('/fr/');
      const title = article.title;
      const description = article.excerpt || article.intro;
      const category = article.category;
      const path = isFrench ? `/fr/blog/${article.slug}` : `/blog/${article.slug}`;

      this.seo.setPageSeo({
        title,
        description,
        path,
        image: article.heroImageUrl || article.imageUrl,
        type: 'article',
        keywords: [...article.tags, category, 'Innovacare Training', isFrench ? 'préparation NCLEX' : 'NCLEX prep'],
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          image: article.heroImageUrl || article.imageUrl,
          author: {
            '@type': 'Person',
            name: article.author,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Innovacare Training',
            url: 'https://www.innovacarereview.com',
          },
          inLanguage: isFrench ? 'fr' : 'en',
          mainEntityOfPage: `https://www.innovacarereview.com${path}`,
          datePublished: article.publishedAt,
        },
      });
    });
  }

  localizedPath(path: string): string {
    return this.lang.currentLang() === 'fr' ? `/fr${path}` : path;
  }
}