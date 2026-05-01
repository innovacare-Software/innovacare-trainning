import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Auth, user as authUser$ } from '@angular/fire/auth';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, of, switchMap } from 'rxjs';
import { NotificationCategory } from './notification';
import { AuthService } from '../../core/auth';

type Role = "learner" | "nurse" | "staff" | "admin" | "manager";
type AudienceType = "all" | "role" | "user";
type Severity = "info" | "warning" | "critical";

export type CreateNotificationInput = {
  title: string;
  body: string;
  link?: string | null;
  severity?: Severity;
  category?: NotificationCategory;
  audience:
    | {type: "all"}
    | {type: "role"; role: Role}
    | {type: "user"; uid: string};
};

export type AdminNotificationLog = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  severity: Severity;
  category?: NotificationCategory;
  audience: CreateNotificationInput['audience'];
  organizationId?: string | null;
  recipientsCount: number;
  createdAt?: unknown;
  createdBy?: {uid: string; name?: string | null};
};

@Injectable({providedIn: "root"})
export class AdminNotificationService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);
  private readonly injector = inject(Injector);
  private readonly authService = inject(AuthService);
  private readonly sendNotificationFn = httpsCallable<CreateNotificationInput, {ok: boolean; notificationId: string; recipientsCount: number}>(
    this.functions,
    'sendNotification'
  );

  private inContext<T>(factory: () => Observable<T>): Observable<T> {
    return runInInjectionContext(this.injector, factory);
  }

  recentNotifications$(max = 20): Observable<AdminNotificationLog[]> {
    return this.authService.profile$.pipe(
      switchMap((profile) => {
        if (!profile?.uid) {
          return of([] as AdminNotificationLog[]);
        }

        const scopedOrgId = String(profile.orgId || '').trim();
        if (profile.role !== 'super_admin' && !scopedOrgId) {
          return of([] as AdminNotificationLog[]);
        }

        const notificationsQuery = profile.role === 'super_admin'
          ? query(
              collection(this.firestore, 'adminNotifications'),
              orderBy('createdAt', 'desc'),
              limit(max),
            )
          : query(
              collection(this.firestore, 'adminNotifications'),
              where('organizationId', '==', scopedOrgId),
              orderBy('createdAt', 'desc'),
              limit(max),
            );

        return this.inContext(
          () => collectionData(notificationsQuery, {idField: 'id'}) as Observable<AdminNotificationLog[]>
        );
      })
    );
  }

  async createNotification(input: CreateNotificationInput) {
    const title = (input.title || "").trim();
    const body = (input.body || "").trim();
    if (!title || !body) throw new Error("title/body required.");

    const response = await this.sendNotificationFn({
      title,
      body,
      link: (input.link || "").trim() || null,
      severity: input.severity ?? "info",
      category: input.category ?? 'announcements',
      audience: input.audience,
    });

    return response.data;
  }
}
