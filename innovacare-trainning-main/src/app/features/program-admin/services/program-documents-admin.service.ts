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
import { ProgramDocument } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramDocumentsAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/documents`);
  }

  getDocuments(programId: string): Observable<ProgramDocument[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramDocument[]>;
  }

  getDocumentById(programId: string, documentId: string): Observable<ProgramDocument | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/documents/${documentId}`), {
      idField: 'id',
    }) as Observable<ProgramDocument | undefined>;
  }

  async createDocument(
    programId: string,
    payload: Omit<ProgramDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateDocument(
    programId: string,
    documentId: string,
    payload: Partial<Omit<ProgramDocument, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/documents/${documentId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteDocument(programId: string, documentId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/documents/${documentId}`));
  }
}
