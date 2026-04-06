// app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';

import { environment } from '../enviroments/enviroment';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';
import { AuthTokenInterceptor } from './core/auth-token.interceptor';

// 🔥 INITIALISATION DES 2 APPS
const stripeApp = initializeApp(environment.firebaseStripe, 'stripeApp');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthTokenInterceptor,
      multi: true,
    },

    // 🔹 APP PRINCIPALE (Firestore / Auth / Storage)
    provideFirebaseApp(() => stripeApp),

    provideAuth(() => {
      const auth = getAuth(stripeApp); // 🔥 IMPORTANT
      setPersistence(auth, browserLocalPersistence).catch(() => {});
      return auth;
    }),

    provideFirestore(() => {
      const db = getFirestore(stripeApp);
      enableIndexedDbPersistence(db).catch(() => {});
      return db;
    }),

    provideStorage(() => getStorage(stripeApp)),

    // 🔹 FUNCTIONS (onCall) sur le projet principal
    provideFunctions(() => {
      const fns = getFunctions(stripeApp, 'us-central1');

      if (environment.useFunctionsEmulator) {
        connectFunctionsEmulator(fns, 'localhost', 5001);
      }

      return fns;
    }),
  ],
};