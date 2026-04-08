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
import { Observable } from 'rxjs';
import { ProgramLesson } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramLessonsAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/lessons`);
  }

  getLessons(programId: string): Observable<ProgramLesson[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramLesson[]>;
  }

  getLessonById(programId: string, lessonId: string): Observable<ProgramLesson | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/lessons/${lessonId}`), {
      idField: 'id',
    }) as Observable<ProgramLesson | undefined>;
  }

  async createLesson(
    programId: string,
    payload: Omit<ProgramLesson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
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
    payload: Partial<Omit<ProgramLesson, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/lessons/${lessonId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteLesson(programId: string, lessonId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/lessons/${lessonId}`));
  }
}
