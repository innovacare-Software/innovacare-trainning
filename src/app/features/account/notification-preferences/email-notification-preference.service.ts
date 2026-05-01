import {inject, Injectable} from '@angular/core';
import {Auth, user as authUser$} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import {Observable, of, switchMap} from 'rxjs';

export type EmailNotificationCategories = {
  purchases: boolean;
  courseProgress: boolean;
  assessments: boolean;
  instructorReview: boolean;
  liveSessions: boolean;
  marketing: boolean;
};

export type EmailNotificationPreference = {
  userId: string;
  emailEnabled: boolean;
  unsubscribedFromMarketing: boolean;
  categories: EmailNotificationCategories;
};

export const DEFAULT_EMAIL_PREFERENCES: EmailNotificationPreference = {
  userId: '',
  emailEnabled: true,
  unsubscribedFromMarketing: false,
  categories: {
    purchases: true,
    courseProgress: true,
    assessments: true,
    instructorReview: true,
    liveSessions: true,
    marketing: false,
  },
};

@Injectable({providedIn: 'root'})
export class EmailNotificationPreferenceService {
  private readonly afs = inject(Firestore);
  private readonly auth = inject(Auth);

  preferences$(): Observable<EmailNotificationPreference | null> {
    return authUser$(this.auth).pipe(
      switchMap((u) => {
        if (!u) return of(null);
        const ref = doc(this.afs, `notificationPreferences/${u.uid}`);
        return docData(ref) as Observable<EmailNotificationPreference | null>;
      }),
    );
  }

  async savePreferences(uid: string, prefs: Partial<EmailNotificationPreference>): Promise<void> {
    const ref = doc(this.afs, `notificationPreferences/${uid}`);
    await setDoc(ref, {
      ...prefs,
      userId: uid,
      updatedAt: serverTimestamp(),
    }, {merge: true});
  }
}
