import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import {
  ProgramContentLesson,
  CreateLessonPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramLessonsAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/lessons`);
  }

  getLessons(programId: string): Observable<ProgramContentLesson[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentLesson[]>;
  }

  getLessonById(programId: string, lessonId: string): Observable<ProgramContentLesson | null> {
    return (
      docData(doc(this.db, `programs/${programId}/lessons/${lessonId}`), { idField: 'id' }) as Observable<ProgramContentLesson>
    ).pipe(map((l) => l ?? null));
  }

  async createLesson(programId: string, payload: CreateLessonPayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateLesson(
    programId: string,
    lessonId: string,
    payload: Partial<CreateLessonPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/lessons/${lessonId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteLesson(programId: string, lessonId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/lessons/${lessonId}`));
  }
}
