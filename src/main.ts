// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// Compat AngularFire modules (WoundService uses @angular/fire/compat/*)
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

const CHUNK_RELOAD_KEY = 'innovacare:chunk-reload';
const SUPPORTED_LANGS = new Set(['en', 'fr']);

function syncDocumentLanguageFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (url.pathname === '/fr' || url.pathname.startsWith('/fr/')) {
    window.document.documentElement.lang = 'fr';
    return;
  }

  const lang = url.searchParams.get('lang')?.toLowerCase() ?? '';
  const resolvedLang = SUPPORTED_LANGS.has(lang)
    ? lang
    : window.localStorage.getItem('preferredLang')?.toLowerCase() ?? 'en';

  if (SUPPORTED_LANGS.has(resolvedLang)) {
    window.document.documentElement.lang = resolvedLang;
  }
}

function installDynamicImportRecovery(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const shouldRecover = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('failed to fetch dynamically imported module') ||
      normalized.includes('importing a module script failed') ||
      normalized.includes('chunkloaderror') ||
      normalized.includes('loading chunk')
    );
  };

  const recover = (message: string): void => {
    if (!shouldRecover(message)) {
      return;
    }

    const alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
    if (alreadyReloaded) {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      console.error('Dynamic import recovery failed after one reload attempt.', message);
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    const url = new URL(window.location.href);
    url.searchParams.set('_chunk_reload', String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener('error', (event) => {
    const message = event.error instanceof Error ? event.error.message : String(event.message || '');
    const filename = typeof event.filename === 'string' ? event.filename : '';
    const targetSrc = (event.target as HTMLScriptElement | null)?.src || '';
    recover([message, filename, targetSrc].filter(Boolean).join(' '));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || '');
    recover(message);
  });

}

installDynamicImportRecovery();
syncDocumentLanguageFromUrl();

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(
      // initialize firebase using the firebase object inside appConfig

      // compat Firestore/Auth/Storage modules
      AngularFirestoreModule,
      AngularFireAuthModule,
      AngularFireStorageModule
    ),

    // preserve any providers you might have put into appConfig (optional)
    ...(Array.isArray((appConfig as any).providers) ? (appConfig as any).providers : [])
  ]
})
  .then(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  })
  .catch(err => console.error(err));
