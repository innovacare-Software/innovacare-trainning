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
import { ProgramAssessment } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramAssessmentsAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/assessments`);
  }

  getAssessments(programId: string): Observable<ProgramAssessment[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramAssessment[]>;
  }

  getAssessmentById(
    programId: string,
    assessmentId: string
  ): Observable<ProgramAssessment | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/assessments/${assessmentId}`), {
      idField: 'id',
    }) as Observable<ProgramAssessment | undefined>;
  }

  async createAssessment(
    programId: string,
    payload: Omit<ProgramAssessment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateAssessment(
    programId: string,
    assessmentId: string,
    payload: Partial<Omit<ProgramAssessment, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/assessments/${assessmentId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteAssessment(programId: string, assessmentId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/assessments/${assessmentId}`));
  }
}
