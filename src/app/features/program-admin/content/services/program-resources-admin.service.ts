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
  ProgramContentResource,
  CreateResourcePayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramResourcesAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/resources`);
  }

  getResources(programId: string): Observable<ProgramContentResource[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentResource[]>;
  }

  getResourceById(programId: string, resourceId: string): Observable<ProgramContentResource | null> {
    return (
      docData(doc(this.db, `programs/${programId}/resources/${resourceId}`), { idField: 'id' }) as Observable<ProgramContentResource>
    ).pipe(map((r) => r ?? null));
  }

  async createResource(programId: string, payload: CreateResourcePayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateResource(
    programId: string,
    resourceId: string,
    payload: Partial<CreateResourcePayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/resources/${resourceId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteResource(programId: string, resourceId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/resources/${resourceId}`));
  }
}
