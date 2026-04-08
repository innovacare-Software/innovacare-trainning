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
import { ProgramCaseStudy } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramCaseStudiesAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/caseStudies`);
  }

  getCaseStudies(programId: string): Observable<ProgramCaseStudy[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramCaseStudy[]>;
  }

  getCaseStudyById(
    programId: string,
    caseStudyId: string
  ): Observable<ProgramCaseStudy | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/caseStudies/${caseStudyId}`), {
      idField: 'id',
    }) as Observable<ProgramCaseStudy | undefined>;
  }

  async createCaseStudy(
    programId: string,
    payload: Omit<ProgramCaseStudy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
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
    payload: Partial<Omit<ProgramCaseStudy, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/caseStudies/${caseStudyId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteCaseStudy(programId: string, caseStudyId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/caseStudies/${caseStudyId}`));
  }
}
