import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  query,
  where,
  doc,
  docData,
  collectionData,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Tutor, TutorBooking } from './tutor.model';

@Injectable({ providedIn: 'root' })
export class TutorsService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);

  getAllTutors(): Observable<Tutor[]> {
    try {
      const ref = collection(this.firestore, 'tutors');
      const q = query(ref, where('isActive', '==', true));
      return (collectionData(q, { idField: 'id' }) as Observable<Tutor[]>).pipe(
        catchError(() => of([]))
      );
    } catch {
      return of([]);
    }
  }

  getTutorById(id: string): Observable<Tutor | undefined> {
    try {
      const ref = doc(this.firestore, 'tutors', id);
      return (docData(ref, { idField: 'id' }) as Observable<Tutor>).pipe(
        catchError(() => of(undefined))
      );
    } catch {
      return of(undefined);
    }
  }

  getAvailableSlots(tutorId: string, date: string): Observable<string[]> {
    try {
      const ref = collection(this.firestore, `tutors/${tutorId}/availability`);
      const q = query(ref, where('date', '==', date));
      return (collectionData(q) as Observable<{ slots: string[] }[]>).pipe(
        map((docs) => docs?.[0]?.slots ?? []),
        catchError(() => of(['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM', '5:00 PM']))
      );
    } catch {
      return of(['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM', '5:00 PM']);
    }
  }

  listCurrentUserBookings$(): Observable<TutorBooking[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of([] as TutorBooking[]);
        }

        const ref = collection(this.firestore, 'tutor_bookings');
        const byStudent = collectionData(
          query(ref, where('studentId', '==', user.uid)),
          { idField: 'id' }
        ) as Observable<TutorBooking[]>;

        const byTutorOwner = collectionData(
          query(ref, where('tutorOwnerUid', '==', user.uid)),
          { idField: 'id' }
        ) as Observable<TutorBooking[]>;

        return combineLatest([byStudent, byTutorOwner]).pipe(
          map(([studentBookings, tutorBookings]) => {
            const mapById = new Map<string, TutorBooking>();
            [...studentBookings, ...tutorBookings].forEach((booking) => {
              if (booking.id) {
                mapById.set(booking.id, booking);
              }
            });

            return Array.from(mapById.values()).sort((left, right) => {
              const leftMs = this.toMillis(left.createdAt);
              const rightMs = this.toMillis(right.createdAt);
              return rightMs - leftMs;
            });
          }),
          catchError(() => of([] as TutorBooking[]))
        );
      })
    );
  }

  listAllBookings$(): Observable<TutorBooking[]> {
    try {
      return (collectionData(collection(this.firestore, 'tutor_bookings'), {
        idField: 'id',
      }) as Observable<TutorBooking[]>).pipe(
        map((bookings) =>
          [...bookings].sort((left, right) => this.toMillis(right.createdAt) - this.toMillis(left.createdAt))
        ),
        catchError(() => of([] as TutorBooking[]))
      );
    } catch {
      return of([] as TutorBooking[]);
    }
  }

  async updateBookingStatus(
    bookingId: string,
    status: 'cancelled' | 'completed',
    meetingUrl?: string
  ): Promise<void> {
    const fn = httpsCallable<
      { bookingId: string; status: 'cancelled' | 'completed'; meetingUrl?: string },
      { ok: boolean }
    >(this.functions, 'updateTutorBookingStatus');

    await fn({ bookingId, status, meetingUrl });
  }

  private toMillis(value: unknown): number {
    const ts = value as { toDate?: () => Date; seconds?: number } | null;
    if (typeof ts?.toDate === 'function') {
      return ts.toDate().getTime();
    }
    if (typeof ts?.seconds === 'number') {
      return ts.seconds * 1000;
    }
    const date = value instanceof Date ? value : new Date(String(value || ''));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
