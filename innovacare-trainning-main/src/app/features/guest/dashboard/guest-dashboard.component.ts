import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-guest-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-dashboard.component.html',
})
export class GuestDashboardComponent {
  private afs = inject(Firestore);
  private auth = inject(Auth);

  user = toSignal(
    new Observable<any>((subscriber) => {
      return this.auth.onAuthStateChanged((u) => subscriber.next(u));
    }),
    { initialValue: null }
  );

  myCourses = toSignal(
    new Observable<any>((subscriber) => {
      return this.auth.onAuthStateChanged((u) => subscriber.next(u));
    }).pipe(
      switchMap((u: any) => {
        if (!u?.uid) return of([]);
        return collectionData(collection(this.afs, `users/${u.uid}/guestEnrollments`), {
          idField: 'id',
        }) as Observable<any[]>;
      })
    ),
    { initialValue: [] }
  );

  myPrograms = toSignal(
    new Observable<any>((subscriber) => {
      return this.auth.onAuthStateChanged((u) => subscriber.next(u));
    }).pipe(
      switchMap((u: any) => {
        if (!u?.uid) return of([]);
        return collectionData(collection(this.afs, `users/${u.uid}/guestPrograms`), {
          idField: 'id',
        }) as Observable<any[]>;
      })
    ),
    { initialValue: [] }
  );

  myBookings = toSignal(
    new Observable<any>((subscriber) => {
      return this.auth.onAuthStateChanged((u) => subscriber.next(u));
    }).pipe(
      switchMap((u: any) => {
        if (!u?.uid) return of([]);
        return collectionData(collection(this.afs, `users/${u.uid}/bookings`), {
          idField: 'id',
        }) as Observable<any[]>;
      })
    ),
    { initialValue: [] }
  );
}