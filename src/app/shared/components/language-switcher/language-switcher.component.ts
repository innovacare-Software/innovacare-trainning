import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang-switcher">
      <button
        *ngFor="let lang of availableLangs"
        [class.active]="lang === activeLang()"
        (click)="switchLang(lang)"
        [attr.aria-label]="'Switch to ' + langLabels[lang]"
        type="button"
      >
        {{ lang | uppercase }}
      </button>
    </div>
  `,
  styles: [`
    .lang-switcher {
      display: inline-flex;
      gap: 2px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 2px;
    }
    button {
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    button:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.15);
    }
    button.active {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
    }
  `],
})
export class LanguageSwitcherComponent {
  private readonly langService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly availableLangs = ['en', 'fr'] as const;
  readonly langLabels: Record<string, string> = { en: 'English', fr: 'Français' };

  activeLang = () => this.langService.currentLang();

  switchLang(lang: string): void {
    void this.langService.setLanguage(lang as 'en' | 'fr');

    const currentPath = window.location.pathname;
    if (this.isMarketingPath(currentPath)) {
      const localizedPath = lang === 'fr' ? this.toFrenchPath(currentPath) : this.toEnglishPath(currentPath);
      void this.router.navigateByUrl(`${localizedPath}${window.location.search}${window.location.hash}`);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url.toString());
  }

  private isMarketingPath(path: string): boolean {
    const normalized = this.toEnglishPath(path);
    return (
      normalized === '/home' ||
      normalized === '/courses' ||
      normalized === '/catalogue' ||
      normalized === '/blog' ||
      normalized.startsWith('/blog/') ||
      normalized === '/testimonials' ||
      normalized === '/medical-program' ||
      normalized === '/it-courses' ||
      normalized === '/global-nurse-pack' ||
      normalized === '/contact' ||
      normalized === '/pricing' ||
      normalized === '/fonctionnalites'
    );
  }

  private toFrenchPath(path: string): string {
    const normalized = this.toEnglishPath(path);
    return normalized === '/' ? '/fr/home' : `/fr${normalized}`;
  }

  private toEnglishPath(path: string): string {
    if (path === '/fr') {
      return '/home';
    }

    return path.startsWith('/fr/') ? path.slice(3) || '/home' : path;
  }
}
