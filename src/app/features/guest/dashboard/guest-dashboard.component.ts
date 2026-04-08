import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-guest-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-dashboard.component.html',
  styleUrls: ['./guest-dashboard.component.css']
})
export class GuestDashboardComponent {
  private afs = inject(Firestore);
  private router = inject(Router);
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

  navigateToCourses(): void {
    // Navigate to courses
    this.router.navigate(['/guest/session/courses']);
  }

  navigateToPrograms(): void {
    // Navigate to programs
    this.router.navigate(['/guest/programs']);

  }

  navigateToBookings(): void {
    // Navigate to bookings
    this.router.navigate(['/guest/bookings']);
  }
}