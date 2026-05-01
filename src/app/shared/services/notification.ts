import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Auth, user as authUser$ } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "@angular/fire/firestore";
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

export type NotificationCategory =
  | 'announcements'
  | 'account'
  | 'commerce'
  | 'live_sessions'
  | 'exam_prep'
  | 'certificates'
  | 'content';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'announcements',
  'account',
  'commerce',
  'live_sessions',
  'exam_prep',
  'certificates',
  'content',
];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  announcements: 'Annonces',
  account: 'Compte',
  commerce: 'Achats',
  live_sessions: 'Live sessions',
  exam_prep: 'Exam prep',
  certificates: 'Certificats',
  content: 'Contenu',
};

export type NotificationPreferenceMap = Record<NotificationCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMap = {
  announcements: true,
  account: true,
  commerce: true,
  live_sessions: true,
  exam_prep: true,
  certificates: true,
  content: true,
};

type NotificationPreferenceDoc = {
  enabledCategories?: Partial<NotificationPreferenceMap>;
};

export type Audience =
  | {type: "all"}
  | {type: "user"; uid: string}
  | {type: "role"; role: UserRole};

export type UserRole = 'learner' | 'nurse' | 'staff' | 'admin' | 'manager';

export type AppNotification = {
  [x: string]: any;
  id: string;
  title: string;
  body: string;
  link?: string;
  severity?: "info" | "warning" | "critical";
  createdAt?: any;
  createdBy?: {uid: string; name?: string};
  audience?: Audience;
  organizationId?: string | null;
  targetUid?: string;
  targetRole?: string;
  category?: NotificationCategory;
  readAt?: any | null;
  archivedAt?: any | null;
};

@Injectable({providedIn: "root"})
export class NotificationService {
  private afs = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);

  private inContext<T>(factory: () => Observable<T>): Observable<T> {
    return runInInjectionContext(this.injector, factory);
  }

  preferences$(): Observable<NotificationPreferenceMap> {
    return authUser$(this.auth).pipe(
      switchMap((u) => {
        if (!u) return of(DEFAULT_NOTIFICATION_PREFERENCES);
        const ref = doc(this.afs, `users/${u.uid}/preferences/notifications`);
        return this.inContext(() => docData(ref) as Observable<NotificationPreferenceDoc | undefined>).pipe(
          map((pref) => ({
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(pref?.enabledCategories || {}),
          }))
        );
      }),
    );
  }

  /** Notifications inbox du user courant */
  notifications$(max = 50): Observable<AppNotification[]> {
    return authUser$(this.auth).pipe(
      switchMap((u) => {
        if (!u) return of([]);
        const q = query(
          collection(this.afs, `users/${u.uid}/notifications`),
          orderBy('createdAt', 'desc'),
          limit(max),
        );
        return this.inContext(
          () => collectionData(q, {idField: 'id'}) as Observable<AppNotification[]>
        );
      }),
    );
  }

  /** Visible = inbox déjà fan-out côté serveur */
  visibleNotifications$(max = 50): Observable<AppNotification[]> {
    return combineLatest([this.notifications$(max), this.preferences$()]).pipe(
      map(([list, preferences]) =>
        list.filter((notification) => {
          if (notification.archivedAt) return false;
          const category = notification.category ?? 'announcements';
          return preferences[category] !== false;
        })
      )
    );
  }

  /** Unread optimisé: calc client-side sur une fenêtre (max N) */
  unreadCount$(max = 50): Observable<number> {
    return this.visibleNotifications$(max).pipe(map((notifs) => notifs.filter((n) => !n.readAt).length));
  }

  /** Mark read (idempotent) */
  async markAsRead(notificationId: string): Promise<void> {
    const u = this.auth.currentUser;
    if (!u) return;
    const ref = doc(this.afs, `users/${u.uid}/notifications/${notificationId}`);
    await updateDoc(ref, {readAt: serverTimestamp()});
  }

  /** Mark all visible as read (fenêtre max) */
  async markAllVisibleAsRead(visible: AppNotification[]): Promise<void> {
    const u = this.auth.currentUser;
    if (!u) return;
    await Promise.all(
      visible.map((n) =>
        updateDoc(doc(this.afs, `users/${u.uid}/notifications/${n.id}`), {readAt: serverTimestamp()}),
      ),
    );
  }

  async updateCategoryPreference(category: NotificationCategory, enabled: boolean): Promise<void> {
    const u = this.auth.currentUser;
    if (!u) return;
    const ref = doc(this.afs, `users/${u.uid}/preferences/notifications`);
    await setDoc(ref, {
      enabledCategories: {[category]: enabled},
      updatedAt: serverTimestamp(),
    }, {merge: true});
  }

  unread$ = this.visibleNotifications$().pipe(map((notifs) => notifs.filter((n) => !n.readAt)));
}
