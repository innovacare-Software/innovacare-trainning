import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'en' | 'fr';

const STORAGE_KEY = 'innovacare_lang';
const DEFAULT_LANG: SupportedLanguage = 'en';
const SUPPORTED_LANGS: SupportedLanguage[] = ['en', 'fr'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLang = signal<SupportedLanguage>(this.resolveInitialLang());

  constructor(private translate: TranslateService) {
    this.translate.addLangs(SUPPORTED_LANGS);
    this.translate.setDefaultLang(DEFAULT_LANG);
    this.translate.use(this.currentLang());
  }

  setLanguage(lang: SupportedLanguage): void {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    this.currentLang.set(lang);
    this.translate.use(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }

  private resolveInitialLang(): SupportedLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    const browser = navigator.language?.split('-')[0] as SupportedLanguage;
    return SUPPORTED_LANGS.includes(browser) ? browser : DEFAULT_LANG;
  }
}
