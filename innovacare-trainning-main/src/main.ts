// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, isDevMode } from '@angular/core';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// Compat AngularFire modules (WoundService uses @angular/fire/compat/*)
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { provideServiceWorker } from '@angular/service-worker';

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
    ...(Array.isArray((appConfig as any).providers) ? (appConfig as any).providers : []),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
}).catch(err => console.error(err));
