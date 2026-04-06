import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { ProgramAssessment, UserAssessmentAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerAssessmentsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  getAssessments(programId: string): Observable<ProgramAssessment[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/assessments`);
    const q = query(ref, where('active', '==', true), orderBy('moduleId', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramAssessment[]>;
  }

  getAssessment(programId: string, assessmentId: string): Observable<ProgramAssessment | undefined> {
    if (!programId || !assessmentId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/assessments/${assessmentId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramAssessment | undefined>;
  }

  getMyAttempts(programId: string): Observable<UserAssessmentAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/assessmentAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserAssessmentAttempt[]>;
      })
    );
  }

  async submitAttempt(attempt: Omit<UserAssessmentAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/assessmentAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }
}
