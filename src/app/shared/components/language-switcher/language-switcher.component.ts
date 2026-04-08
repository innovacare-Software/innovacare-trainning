import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

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
  private readonly transloco = inject(TranslocoService);

  readonly availableLangs = ['en', 'fr'] as const;
  readonly langLabels: Record<string, string> = { en: 'English', fr: 'Français' };

  activeLang = this.transloco.langChanges$
    ? () => this.transloco.getActiveLang()
    : () => 'en';

  switchLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('preferredLang', lang);
    document.documentElement.lang = lang;
  }
}
