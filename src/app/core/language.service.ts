import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export type AppLang = 'en' | 'fr';

const FALLBACK_LANG: AppLang = 'en';
const CRITICAL_I18N_KEYS = [
  'NAV.home',
  'MARKETING_NAV.contact_us',
  'MARKETING_POPUPS.exit.title',
  'MARKETING_POPUPS.engagement.title',
  'MARKETING_POPUPS.recommendation.title',
  'COMMON.close',
] as const;

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly document = inject(DOCUMENT);
  private initPromise: Promise<void> | null = null;
  private readonly loadedLangs = new Set<AppLang>();

  readonly currentLang = signal<AppLang>('en');
  readonly ready = signal(false);
  readonly isReady = computed(() => this.ready());
  readonly isRTL = computed(() => false);
  readonly supportedLangs: AppLang[] = ['en', 'fr'];

  constructor() {
    this.transloco.setAvailableLangs(this.supportedLangs);
    this.transloco.setDefaultLang('en');

    authState(this.auth)
      .pipe(distinctUntilChanged((previous, current) => previous?.uid === current?.uid))
      .subscribe((currentUser) => {
        if (!currentUser) {
          return;
        }

        void this.loadUserPreference(currentUser.uid);
      });
  }

  initApp(): Promise<void> {
    this.initPromise ??= this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    const preferred =
      this.readUrlLanguage() ??
      this.readLocalLanguage() ??
      this.normalizeLang(this.transloco.getActiveLang()) ??
      this.normalizeLang(this.transloco.getDefaultLang()) ??
      this.normalizeLang(typeof navigator !== 'undefined' ? navigator.language : 'en') ??
      'en';

    await Promise.all([
      this.ensureLangLoaded(FALLBACK_LANG),
      preferred === FALLBACK_LANG ? Promise.resolve() : this.ensureLangLoaded(preferred),
    ]);

    await this.applyLang(preferred);
    this.assertCriticalTranslations(preferred);
    this.ready.set(true);
  }

  private normalizeLang(lang: string | null | undefined): AppLang | null {
    if (!lang) {
      return null;
    }

    const normalized = lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
    return this.supportedLangs.includes(normalized) ? normalized : null;
  }

  private readLocalLanguage(): AppLang | null {
    try {
      return this.normalizeLang(window.localStorage.getItem('preferredLang') || window.localStorage.getItem('ir_lang'));
    } catch {
      return null;
    }
  }

  private readUrlLanguage(): AppLang | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/fr' || pathname.startsWith('/fr/')) {
      return 'fr';
    }

    const searchLang = new URLSearchParams(window.location.search).get('lang');
    return this.normalizeLang(searchLang);
  }

  private async loadUserPreference(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const snap = await getDoc(userRef);
      const saved = this.normalizeLang(snap.data()?.['preferredLanguage']);
      if (!saved || saved === this.currentLang()) {
        return;
      }

      await this.applyLang(saved);
      this.persistLocal(saved);
    } catch {
      // Ignore non-critical preference load issues.
    }
  }

  private persistLocal(lang: AppLang): void {
    try {
      window.localStorage.setItem('preferredLang', lang);
      window.localStorage.setItem('ir_lang', lang);
    } catch {
      // Ignore storage failures.
    }
  }

  private async ensureLangLoaded(lang: AppLang): Promise<void> {
    if (this.loadedLangs.has(lang)) {
      return;
    }

    await firstValueFrom(this.transloco.load(lang));
    this.loadedLangs.add(lang);
  }

  private assertCriticalTranslations(lang: AppLang): void {
    for (const key of CRITICAL_I18N_KEYS) {
      const translated = this.transloco.translate(key, {}, lang);
      if (translated === key) {
        throw new Error(`Missing critical translation key: ${key} for lang ${lang}`);
      }
    }
  }

  private async applyLang(lang: AppLang): Promise<void> {
    await this.ensureLangLoaded(lang);
    this.transloco.setActiveLang(lang);
    this.currentLang.set(lang);
    this.document.documentElement.lang = lang;
    this.persistLocal(lang);
  }

  async ensureReady(): Promise<void> {
    await this.initApp();
  }

  async setLanguage(lang: AppLang): Promise<void> {
    await this.initApp();
    await this.applyLang(lang);
    this.assertCriticalTranslations(lang);

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return;
    }

    try {
      await setDoc(
        doc(this.firestore, 'users', currentUser.uid),
        { preferredLanguage: lang },
        { merge: true }
      );
    } catch {
      // Ignore Firestore persistence failures.
    }
  }

  async toggle(): Promise<void> {
    await this.setLanguage(this.currentLang() === 'en' ? 'fr' : 'en');
  }

  instant(key: string, params?: Record<string, unknown>): string {
    const lang = this.currentLang();

    if (!this.ready()) {
      return '';
    }

    const translated = this.transloco.translate(key, params, lang);
    if (translated && translated !== key) {
      return translated;
    }

    if (lang !== FALLBACK_LANG) {
      const fallbackTranslated = this.transloco.translate(key, params, FALLBACK_LANG);
      if (fallbackTranslated && fallbackTranslated !== key) {
        return fallbackTranslated;
      }
    }

    return '';
  }
}