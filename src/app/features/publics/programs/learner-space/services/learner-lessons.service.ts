import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, collection, collectionData, doc, docData, orderBy, query, setDoc, where,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { ProgramLesson, UserLessonProgress } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerLessonsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  getLessons(programId: string, moduleId?: string): Observable<ProgramLesson[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/lessons`);
    const constraints = moduleId
      ? [where('active', '==', true), where('moduleId', '==', moduleId), orderBy('order', 'asc')]
      : [where('active', '==', true), orderBy('order', 'asc')];
    return collectionData(query(ref, ...constraints), { idField: 'id' }) as Observable<ProgramLesson[]>;
  }

  getLesson(programId: string, lessonId: string): Observable<ProgramLesson | undefined> {
    if (!programId || !lessonId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/lessons/${lessonId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramLesson | undefined>;
  }

  getMyLessonProgress(programId: string): Observable<UserLessonProgress[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/lessonProgress`);
        const q = query(ref, where('programId', '==', programId));
        return collectionData(q, { idField: 'id' }) as Observable<UserLessonProgress[]>;
      })
    );
  }

  async markComplete(programId: string, moduleId: string, lessonId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = doc(this.firestore, `users/${user.uid}/lessonProgress/${lessonId}`);
    await setDoc(ref, {
      userId: user.uid,
      programId,
      moduleId,
      lessonId,
      completed: true,
      watchedPct: 100,
      completedAt: new Date(),
    }, { merge: true });
  }

  async updateWatchProgress(programId: string, moduleId: string, lessonId: string, pct: number): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = doc(this.firestore, `users/${user.uid}/lessonProgress/${lessonId}`);
    await setDoc(ref, {
      userId: user.uid,
      programId,
      moduleId,
      lessonId,
      completed: pct >= 95,
      watchedPct: Math.round(pct),
      lastOpenedAt: new Date(),
      ...(pct >= 95 ? { completedAt: new Date() } : {}),
    }, { merge: true });
  }
}
