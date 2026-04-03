import { Injectable, inject } from '@angular/core';
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

  profile$(): Observable<AppUserProfile | null> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) return of(null);
        return docData(doc(this.afs, `users/${user.uid}`)) as Observable<AppUserProfile>;
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

        primaryRole: 'guest',
        access: [
          {
            channel: 'guest',
            active: true,
          },
        ],

        isActive: true,
        emailVerified: !!params.emailVerified,

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
}