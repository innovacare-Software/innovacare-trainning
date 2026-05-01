import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, collection, collectionData, doc, docData, orderBy, query, setDoc, where,
} from '@angular/fire/firestore';
import { Observable, map, of, switchMap } from 'rxjs';
import { ProgramLesson, ProgramLessonType, UserLessonProgress } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerLessonsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getLessons(programId: string, moduleId?: string): Observable<ProgramLesson[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/lessons`);
    const constraints = moduleId
      ? [where('active', '==', true), where('moduleId', '==', moduleId), orderBy('order', 'asc')]
      : [where('active', '==', true), orderBy('order', 'asc')];
    return this.inContext(
      () => collectionData(query(ref, ...constraints), { idField: 'id' }) as Observable<ProgramLesson[]>
    ).pipe(
      map((lessons) => lessons.map((lesson) => normalizeLesson(lesson)))
    );
  }

  getLesson(programId: string, lessonId: string): Observable<ProgramLesson | undefined> {
    if (!programId || !lessonId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/lessons/${lessonId}`);
    return this.inContext(() => docData(ref, { idField: 'id' }) as Observable<ProgramLesson | undefined>).pipe(
      map((lesson) => lesson ? normalizeLesson(lesson) : undefined)
    );
  }

  getMyLessonProgress(programId: string): Observable<UserLessonProgress[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/lessonProgress`);
        const q = query(ref, where('programId', '==', programId));
        return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<UserLessonProgress[]>);
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

  async updateLessonNotes(programId: string, moduleId: string, lessonId: string, notes: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = doc(this.firestore, `users/${user.uid}/lessonProgress/${lessonId}`);
    await setDoc(ref, {
      userId: user.uid,
      programId,
      moduleId,
      lessonId,
      notes,
      notesUpdatedAt: new Date(),
      lastOpenedAt: new Date(),
    }, { merge: true });
  }
}

function normalizeLesson(lesson: ProgramLesson & { lessonType?: string }): ProgramLesson {
  const normalizedType = String(lesson.type || '').trim().toLowerCase();
  if (normalizedType) {
    return lesson;
  }

  return {
    ...lesson,
    type: toProgramLessonType(lesson.lessonType),
  };
}

function toProgramLessonType(lessonType?: string): ProgramLesson['type'] {
  switch (String(lessonType || '').trim().toUpperCase()) {
    case 'VIDEO':
      return ProgramLessonType.VIDEO;
    case 'DOCUMENT':
      return ProgramLessonType.DOCUMENT;
    case 'MIXED':
      return ProgramLessonType.MIXED;
    case 'WEB':
      return ProgramLessonType.WEB;
    default:
      return ProgramLessonType.READING;
  }
}
