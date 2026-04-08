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
  ProgramContentDocument,
  CreateDocumentPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramDocumentsAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/documents`);
  }

  getDocuments(programId: string): Observable<ProgramContentDocument[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentDocument[]>;
  }

  getDocumentById(programId: string, documentId: string): Observable<ProgramContentDocument | null> {
    return (
      docData(doc(this.db, `programs/${programId}/documents/${documentId}`), { idField: 'id' }) as Observable<ProgramContentDocument>
    ).pipe(map((d) => d ?? null));
  }

  async createDocument(programId: string, payload: CreateDocumentPayload): Promise<string> {
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
    payload: Partial<CreateDocumentPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/documents/${documentId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteDocument(programId: string, documentId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/documents/${documentId}`));
  }
}
