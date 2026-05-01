import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AppUserProfile } from '../data/app-user.model';


@Injectable({ providedIn: 'root' })
export class ProfileService {
  private auth = inject(Auth);
  private afs = inject(Firestore);
  private injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  profile$(): Observable<AppUserProfile | null> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid) return of(null);
        return this.inContext(
          () => docData(doc(this.afs, `users/${user.uid}`)) as Observable<AppUserProfile>
        );
      })
    );
  }

  async ensureGuestProfile(params: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
  }): Promise<void> {
    const ref = doc(this.afs, `users/${params.uid}`);

    await setDoc(
      ref,
      {
        uid: params.uid,
        email: params.email,
        displayName: params.displayName ?? '',
        photoURL: params.photoURL ?? null,

        role: 'guest',
        primaryRole: 'guest',
        access: [
          {
            channel: 'guest',
            active: true,
          },
        ],

        isActive: true,
        emailVerified: !!params.emailVerified,

        onboarding: {
          version: 'v1',
          completedStepIds: [],
          minimized: false,
          dismissedAt: null,
          completedAt: null,
          updatedAt: serverTimestamp(),
        },

        guestMeta: {
          onboardingCompleted: false,
          lastDashboardAt: null,
        },

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async updateGuestDashboardVisit(uid: string): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    await setDoc(
      ref,
      {
        guestMeta: {
          lastDashboardAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  getProfileData(uid: string): Observable<AppUserProfile | null> {
    return this.inContext(
      () => docData(doc(this.afs, `users/${uid}`)) as Observable<AppUserProfile>
    );
  }

  async updateProfileData(uid: string, data: Partial<AppUserProfile>): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    await setDoc(
      ref,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async updateOnboardingData(uid: string, onboarding: AppUserProfile['onboarding']): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    await setDoc(
      ref,
      {
        onboarding: {
          ...(onboarding ?? {}),
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}