import {Injectable, inject} from '@angular/core';
import {Auth} from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import {Observable, of, switchMap} from 'rxjs';
import {ProfileService} from '../../core/profile.service';

export type NotificationPreferenceDoc = {
  id: string;
  userId: string;
  emailEnabled: boolean;
  categories: {
    purchases: boolean;
    courseProgress: boolean;
    assessments: boolean;
    instructorReview: boolean;
    liveSessions: boolean;
    marketing: boolean;
    adminAlerts?: boolean;
  };
  unsubscribedFromMarketing?: boolean;
  updatedAt?: unknown;
};

export type NotificationLogDoc = {
  id: string;
  eventId: string;
  type: string;
  status: string;
  channel: string;
  provider?: string;
  recipientEmail: string;
  subject: string;
  errorMessage?: string;
  orgId?: string | null;
  createdAt?: unknown;
};

const DEFAULT_PREFERENCES: NotificationPreferenceDoc = {
  id: '',
  userId: '',
  emailEnabled: true,
  categories: {
    purchases: true,
    courseProgress: true,
    assessments: true,
    instructorReview: true,
    liveSessions: true,
    marketing: true,
    adminAlerts: false,
  },
  unsubscribedFromMarketing: false,
};

@Injectable({providedIn: 'root'})
export class NotificationCenterService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly profileService = inject(ProfileService);

  preferences$(): Observable<NotificationPreferenceDoc> {
    return this.profileService.profile$().pipe(
      switchMap((profile) => {
        const uid = String(profile?.uid || '').trim();
        if (!uid) {
          return of(DEFAULT_PREFERENCES);
        }

        const ref = doc(this.firestore, `notificationPreferences/${uid}`);
        return (docData(ref, {idField: 'id'}) as Observable<NotificationPreferenceDoc>).pipe(
          switchMap((pref) => {
            const safe = pref || DEFAULT_PREFERENCES;
            return of({
              ...DEFAULT_PREFERENCES,
              ...safe,
              id: uid,
              userId: uid,
              categories: {
                ...DEFAULT_PREFERENCES.categories,
                ...(safe.categories || {}),
              },
            });
          })
        );
      })
    );
  }

  async savePreferences(preferences: NotificationPreferenceDoc): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    await setDoc(doc(this.firestore, `notificationPreferences/${uid}`), {
      id: uid,
      userId: uid,
      emailEnabled: preferences.emailEnabled,
      categories: preferences.categories,
      unsubscribedFromMarketing: preferences.unsubscribedFromMarketing || false,
      updatedAt: serverTimestamp(),
    }, {merge: true});
  }

  logs$(maxRows = 100): Observable<NotificationLogDoc[]> {
    return this.profileService.profile$().pipe(
      switchMap((profile) => {
        if (!profile) {
          return of([]);
        }

        const role = String(profile.primaryRole || '');
        if (!['super_admin', 'admin', 'manager'].includes(role)) {
          return of([]);
        }

        const baseCollection = collection(this.firestore, 'notificationLogs');
        const q = role === 'super_admin'
          ? query(baseCollection, orderBy('createdAt', 'desc'), limit(maxRows))
          : query(baseCollection, orderBy('createdAt', 'desc'), limit(maxRows));

        return collectionData(q, {idField: 'id'}) as Observable<NotificationLogDoc[]>;
      })
    );
  }

  async retryEvent(eventId: string): Promise<void> {
    const callable = (window as any).firebase?.functions?.httpsCallable;
    if (!callable) {
      throw new Error('Cloud Functions callable bridge is not available in this runtime.');
    }
    const retryFn = callable('retryNotificationEvent');
    await retryFn({eventId});
  }
}
