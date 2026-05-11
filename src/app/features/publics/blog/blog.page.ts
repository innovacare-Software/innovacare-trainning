import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule } from '@jsverse/transloco';
import { RouterModule } from '@angular/router';
import { LanguageService } from '../../../core/language.service';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';
import { MarketingContentService } from '../../../shared/marketing/services/marketing-content.service';

type BlogCategory = 'All' | 'NCLEX' | 'Study Skills' | 'Career' | 'Educators';

@Component({
  selector: 'app-blog-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective, TranslocoModule],
  templateUrl: './blog.page.html',
  styleUrls: ['./blog.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPage {
  private readonly marketingContent = inject(MarketingContentService);
  readonly lang = inject(LanguageService);

  readonly categories: BlogCategory[] = ['All', 'NCLEX', 'Study Skills', 'Career', 'Educators'];
  readonly activeCategory = signal<BlogCategory>('All');

  readonly visuals = {
    nclex:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    educators:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
    study:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
  };

  readonly posts = toSignal(this.marketingContent.getBlogPosts(), { initialValue: [] });

  readonly filteredPosts = computed(() => {
    if (this.activeCategory() === 'All') return this.posts();
    return this.posts().filter((post) => post.category === this.activeCategory());
  });

  readonly featuredPost = computed(() => this.filteredPosts()[0] ?? null);

  readonly displayPosts = computed(() => {
    const featured = this.featuredPost();
    if (!featured) return [];
    return this.filteredPosts().filter((post) => post.slug !== featured.slug);
  });

  selectCategory(category: BlogCategory): void {
    this.activeCategory.set(category);
  }

  categoryLabel(category: BlogCategory | string): string {
    this.lang.currentLang();

    const keyMap: Record<string, string> = {
      All: 'BLOG_PAGE.filters.all',
      NCLEX: 'BLOG_PAGE.categories.nclex',
      'Study Skills': 'BLOG_PAGE.categories.study_skills',
      Career: 'BLOG_PAGE.categories.career',
      Educators: 'BLOG_PAGE.categories.educators',
    };

    return this.lang.instant(keyMap[category] ?? 'BLOG_PAGE.filters.all');
  }

  localizedBlogLink(slug?: string): string {
    const prefix = this.lang.currentLang() === 'fr' ? '/fr/blog' : '/blog';
    return slug ? `${prefix}/${slug}` : prefix;
  }

  getPostImage(post: { imageUrl?: string | null; category?: string | null }): string {
    const directImage = (post.imageUrl || '').trim();
    if (directImage) return directImage;

    switch (post.category) {
      case 'NCLEX':
        return this.visuals.nclex;
      case 'Educators':
        return this.visuals.educators;
      case 'Study Skills':
      case 'Career':
      default:
        return this.visuals.study;
    }
  }
}