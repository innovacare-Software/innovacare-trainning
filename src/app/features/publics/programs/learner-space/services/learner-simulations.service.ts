import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { ProgramSimulation, UserSimulationAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerSimulationsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  getSimulations(programId: string): Observable<ProgramSimulation[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/simulations`);
    const q = query(ref, where('active', '==', true), orderBy('title', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramSimulation[]>;
  }

  getSimulation(programId: string, simulationId: string): Observable<ProgramSimulation | undefined> {
    if (!programId || !simulationId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/simulations/${simulationId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramSimulation | undefined>;
  }

  getMyAttempts(programId: string): Observable<UserSimulationAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/simulationAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserSimulationAttempt[]>;
      })
    );
  }

  async submitAttempt(attempt: Omit<UserSimulationAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/simulationAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }
}
