import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GuestProgramAccess } from '../data/guest-commerce.model';

@Injectable({ providedIn: 'root' })
export class GuestProgramsService {
  private auth = inject(Auth);
  private afs = inject(Firestore);

  listMyPrograms$(): Observable<GuestProgramAccess[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) return of([]);
        return collectionData(
          collection(this.afs, `users/${user.uid}/guestPrograms`),
          { idField: 'id' }
        ) as Observable<GuestProgramAccess[]>;
      })
    );
  }

  myProgramById$(programAccessId: string): Observable<GuestProgramAccess | null> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programAccessId) return of(null);
        return docData(
          doc(this.afs, `users/${user.uid}/guestPrograms/${programAccessId}`),
          { idField: 'id' }
        ) as Observable<GuestProgramAccess>;
      })
    );
  }
}