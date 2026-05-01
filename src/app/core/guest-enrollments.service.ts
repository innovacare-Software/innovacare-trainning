import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GuestEnrollment } from '../data/guest-commerce.model';


@Injectable({ providedIn: 'root' })
export class GuestEnrollmentsService {
  private auth = inject(Auth);
  private afs = inject(Firestore);
  private injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  listMyEnrollments$(): Observable<GuestEnrollment[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid) return of([]);
        return this.inContext(
          () => collectionData(
            collection(this.afs, `users/${user.uid}/guestEnrollments`),
            { idField: 'id' }
          ) as Observable<GuestEnrollment[]>
        );
      })
    );
  }

  myEnrollmentById$(enrollmentId: string): Observable<GuestEnrollment | null> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !enrollmentId) return of(null);
        return this.inContext(
          () => docData(
            doc(this.afs, `users/${user.uid}/guestEnrollments/${enrollmentId}`),
            { idField: 'id' }
          ) as Observable<GuestEnrollment>
        );
      })
    );
  }

  async markLessonComplete(params: {
    uid: string;
    enrollmentId: string;
    lessonId: string;
    totalLessons: number;
  }): Promise<void> {
    const ref = doc(this.afs, `users/${params.uid}/guestEnrollments/${params.enrollmentId}`);
    const snap = await import('@angular/fire/firestore').then(({ getDoc }) => getDoc(ref));

    if (!snap.exists()) return;

    const data = snap.data() as GuestEnrollment;
    const completed = new Set<string>(data.completedLessonIds ?? []);
    completed.add(params.lessonId);

    const done = completed.size;
    const progressPct =
      params.totalLessons > 0 ? Math.min(100, Math.round((done / params.totalLessons) * 100)) : 0;

    await updateDoc(ref, {
      completedLessonIds: [...completed],
      currentLessonId: params.lessonId,
      progressPct,
      status: progressPct >= 100 ? 'completed' : 'active',
      completedAt: progressPct >= 100 ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
  }

  async setCurrentLesson(params: {
    uid: string;
    enrollmentId: string;
    lessonId: string;
  }): Promise<void> {
    const ref = doc(this.afs, `users/${params.uid}/guestEnrollments/${params.enrollmentId}`);
    await updateDoc(ref, {
      currentLessonId: params.lessonId,
      updatedAt: serverTimestamp(),
    });
  }

  async createManualEnrollment(params: {
    uid: string;
    courseId: string;
  }): Promise<string> {
    const ref = doc(collection(this.afs, `users/${params.uid}/guestEnrollments`));

    const payload: GuestEnrollment = {
      id: ref.id,
      uid: params.uid,
      courseId: params.courseId,
      source: 'manual',
      status: 'active',
      progressPct: 0,
      currentLessonId: null,
      completedLessonIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload);
    return ref.id;
  }
}