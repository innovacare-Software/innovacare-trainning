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
  ProgramContentAssessment,
  CreateAssessmentPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramAssessmentsAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/assessments`);
  }

  getAssessments(programId: string): Observable<ProgramContentAssessment[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentAssessment[]>;
  }

  getAssessmentById(programId: string, assessmentId: string): Observable<ProgramContentAssessment | null> {
    return (
      docData(doc(this.db, `programs/${programId}/assessments/${assessmentId}`), { idField: 'id' }) as Observable<ProgramContentAssessment>
    ).pipe(map((a) => a ?? null));
  }

  async createAssessment(programId: string, payload: CreateAssessmentPayload): Promise<string> {
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
    payload: Partial<CreateAssessmentPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/assessments/${assessmentId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteAssessment(programId: string, assessmentId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/assessments/${assessmentId}`));
  }
}
