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
  ProgramContentCaseStudy,
  CreateCaseStudyPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramCaseStudiesAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/caseStudies`);
  }

  getCaseStudies(programId: string): Observable<ProgramContentCaseStudy[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentCaseStudy[]>;
  }

  getCaseStudyById(programId: string, caseStudyId: string): Observable<ProgramContentCaseStudy | null> {
    return (
      docData(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`), { idField: 'id' }) as Observable<ProgramContentCaseStudy>
    ).pipe(map((c) => c ?? null));
  }

  async createCaseStudy(programId: string, payload: CreateCaseStudyPayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateCaseStudy(
    programId: string,
    caseStudyId: string,
    payload: Partial<CreateCaseStudyPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteCaseStudy(programId: string, caseStudyId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`));
  }
}
