import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { ProgramCaseStudy, UserCaseStudyAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerCaseStudiesService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  getCaseStudies(programId: string): Observable<ProgramCaseStudy[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/caseStudies`);
    const q = query(ref, where('active', '==', true), orderBy('title', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramCaseStudy[]>;
  }

  getCaseStudy(programId: string, caseStudyId: string): Observable<ProgramCaseStudy | undefined> {
    if (!programId || !caseStudyId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/caseStudies/${caseStudyId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramCaseStudy | undefined>;
  }

  getMyAttempts(programId: string): Observable<UserCaseStudyAttempt[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/caseStudyAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserCaseStudyAttempt[]>;
      })
    );
  }

  async submitAttempt(attempt: Omit<UserCaseStudyAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/caseStudyAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }
}
