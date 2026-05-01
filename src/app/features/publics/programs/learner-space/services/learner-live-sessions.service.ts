import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import {
  Firestore,
  collection,
  collectionData,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import { httpsCallable } from 'firebase/functions';
import { Observable, of, switchMap } from 'rxjs';
import { ProgramLiveSession, ProgramLiveSessionBooking } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerLiveSessionsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly functions = inject(Functions);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getSessions(programId: string): Observable<ProgramLiveSession[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/liveSessions`);
    const q = query(ref, where('active', '==', true), orderBy('startAt', 'asc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramLiveSession[]>);
  }

  getUpcomingSessions(programId: string): Observable<ProgramLiveSession[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/liveSessions`);
    const q = query(ref, where('active', '==', true), where('startAt', '>=', new Date()), orderBy('startAt', 'asc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramLiveSession[]>);
  }

  getMyBookings(programId: string): Observable<ProgramLiveSessionBooking[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId?.trim()) {
          return of([]);
        }

        const ref = collection(this.firestore, `users/${user.uid}/programLiveSessionBookings`);
        const bookingsQuery = query(ref, where('programId', '==', programId));
        return this.inContext(() => collectionData(bookingsQuery, { idField: 'id' }) as Observable<ProgramLiveSessionBooking[]>);
      })
    );
  }

  async reserveSession(programId: string, sessionId: string): Promise<void> {
    const fn = httpsCallable<
      { programId: string; sessionId: string },
      { ok: boolean; status: string }
    >(this.functions, 'reserveProgramLiveSession');

    await fn({ programId, sessionId });
  }

  async startPaidCheckout(programId: string, sessionId: string): Promise<void> {
    const origin = window.location.origin;
    const fn = httpsCallable<
      { programId: string; sessionId: string; successUrl: string; cancelUrl: string },
      { url?: string | null }
    >(this.functions, 'createProgramLiveSessionCheckoutSession');

    const res = await fn({
      programId,
      sessionId,
      successUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancel`,
    });

    const url = String(res.data?.url || '').trim();
    if (!url) {
      throw new Error('Checkout URL manquante');
    }

    window.location.href = url;
  }

  async getJoinUrl(programId: string, sessionId: string): Promise<string> {
    const fn = httpsCallable<
      { programId: string; sessionId: string },
      { url?: string | null }
    >(this.functions, 'getProgramLiveSessionJoinUrl');

    const res = await fn({ programId, sessionId });
    const url = String(res.data?.url || '').trim();
    if (!url) {
      throw new Error('Join URL manquante');
    }

    return url;
  }
}
