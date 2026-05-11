// app.config.ts

import { APP_INITIALIZER, ApplicationConfig, inject, isDevMode } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth, Auth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { FirebaseApp, initializeApp } from 'firebase/app';

import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './core/transloco-loader';
import { LanguageService } from './core/language.service';

import { environment } from '../enviroments/enviroment';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';
import { AuthTokenInterceptor } from './core/auth-token.interceptor';

let stripeApp: FirebaseApp | null = null;
const SUPPORTED_LANGS = new Set(['en', 'fr']);

registerLocaleData(localeFr);

function getStripeApp(): FirebaseApp {
  stripeApp ??= initializeApp(environment.firebaseStripe, 'stripeApp');
  return stripeApp;
}

function resolvePreferredLanguage(): string {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/fr' || pathname.startsWith('/fr/')) {
      try {
        window.localStorage.setItem('preferredLang', 'fr');
      } catch {}
      window.document.documentElement.lang = 'fr';
      return 'fr';
    }

    const searchLang = new URLSearchParams(window.location.search).get('lang')?.toLowerCase() ?? '';
    if (SUPPORTED_LANGS.has(searchLang)) {
      try {
        window.localStorage.setItem('preferredLang', searchLang);
      } catch {}
      window.document.documentElement.lang = searchLang;
      return searchLang;
    }

    try {
      const storedLang = window.localStorage.getItem('preferredLang')?.toLowerCase() ?? '';
      if (SUPPORTED_LANGS.has(storedLang)) {
        window.document.documentElement.lang = storedLang;
        return storedLang;
      }
    } catch {}

    window.document.documentElement.lang = 'en';
  }

  return 'en';
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      })
    ),
    provideAnimations(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthTokenInterceptor,
      multi: true,
    },

    // 🔹 APP PRINCIPALE (Firestore / Auth / Storage)
    provideFirebaseApp(() => getStripeApp()),

    provideAuth(() => getAuth(getStripeApp())),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: Auth) => () => setPersistence(auth, browserLocalPersistence).catch(() => {}),
      deps: [Auth],
      multi: true,
    },

    provideFirestore(() => {
      return initializeFirestore(getStripeApp(), {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager({ forceOwnership: true }),
        }),
      });
    }),

    provideStorage(() => getStorage(getStripeApp())),

    // 🔹 FUNCTIONS (onCall) sur le projet principal
    provideFunctions(() => {
      const fns = getFunctions(getStripeApp(), 'us-central1');

      if (environment.useFunctionsEmulator) {
        connectFunctionsEmulator(fns, 'localhost', 5001);
      }

      return fns;
    }),

    // 🌐 TRANSLOCO i18n
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr'],
        defaultLang: resolvePreferredLanguage(),
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        fallbackLang: 'en',
        missingHandler: { useFallbackTranslation: true },
      },
      
      
      loader: TranslocoHttpLoader,
    }),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => () => inject(LanguageService).initApp(),
    },
  ],
};