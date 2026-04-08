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
  ProgramContentModule,
  CreateModulePayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramModulesAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/modules`);
  }

  getModules(programId: string): Observable<ProgramContentModule[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentModule[]>;
  }

  getModuleById(programId: string, moduleId: string): Observable<ProgramContentModule | null> {
    return (
      docData(doc(this.db, `programs/${programId}/modules/${moduleId}`), { idField: 'id' }) as Observable<ProgramContentModule>
    ).pipe(map((m) => m ?? null));
  }

  async createModule(programId: string, payload: CreateModulePayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateModule(
    programId: string,
    moduleId: string,
    payload: Partial<CreateModulePayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/modules/${moduleId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteModule(programId: string, moduleId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/modules/${moduleId}`));
  }
}
