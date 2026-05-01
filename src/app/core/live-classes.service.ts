import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LiveClass } from '../data/app-user.model';
import { LiveClassBooking } from '../data/guest-commerce.model';

@Injectable({ providedIn: 'root' })
export class LiveClassesService {
  private auth = inject(Auth);
  private afs = inject(Firestore);
  private injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  listActiveLiveClasses$(): Observable<LiveClass[]> {
    const q = query(
      collection(this.afs, 'liveClasses'),
      where('isActive', '==', true)
    );

    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<LiveClass[]>);
  }

  listMyBookings$(): Observable<LiveClassBooking[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid) return of([]);
        return this.inContext(
          () => collectionData(
            collection(this.afs, `users/${user.uid}/bookings`),
            { idField: 'id' }
          ) as Observable<LiveClassBooking[]>
        );
      })
    );
  }

  async bookLiveClass(liveClassId: string): Promise<string> {
    const user = await firstValueFrom(this.inContext(() => authState(this.auth)));
    if (!user?.uid) {
      throw new Error('User not authenticated.');
    }

    const liveClassRef = doc(this.afs, `liveClasses/${liveClassId}`);
    const liveClassSnap = await getDoc(liveClassRef);

    if (!liveClassSnap.exists()) {
      throw new Error('Live class not found.');
    }

    const liveClass = liveClassSnap.data() as LiveClass;
    if (!liveClass.isActive) {
      throw new Error('This live class is not active.');
    }

    if ((liveClass.seatsRemaining ?? 0) <= 0 && liveClass.capacity != null) {
      throw new Error('No seats remaining.');
    }

    const bookingRef = doc(collection(this.afs, `users/${user.uid}/bookings`));
    const booking: LiveClassBooking = {
      id: bookingRef.id,
      uid: user.uid,
      liveClassId,
      status: 'booked',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(bookingRef, booking);

    if (typeof liveClass.seatsRemaining === 'number') {
      await updateDoc(liveClassRef, {
        seatsRemaining: Math.max(0, liveClass.seatsRemaining - 1),
        updatedAt: serverTimestamp(),
      });
    }

    return bookingRef.id;
  }
}