import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, orderBy, query, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { ProgramLiveSession } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerLiveSessionsService {
  private readonly firestore = inject(Firestore);

  getSessions(programId: string): Observable<ProgramLiveSession[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/liveSessions`);
    const q = query(ref, where('active', '==', true), orderBy('startAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramLiveSession[]>;
  }

  getUpcomingSessions(programId: string): Observable<ProgramLiveSession[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/liveSessions`);
    const q = query(ref, where('active', '==', true), where('startAt', '>=', new Date()), orderBy('startAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramLiveSession[]>;
  }
}
