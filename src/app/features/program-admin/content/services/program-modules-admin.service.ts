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
    return collection(this.db, `programs/${this.requireProgramId(programId)}/modules`);
  }

  getModules(programId: string): Observable<ProgramContentModule[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentModule[]>;
  }

  getModuleById(programId: string, moduleId: string): Observable<ProgramContentModule | null> {
    const requiredProgramId = this.requireProgramId(programId);
    return (
      docData(doc(this.db, `programs/${requiredProgramId}/modules/${moduleId}`), { idField: 'id' }) as Observable<ProgramContentModule>
    ).pipe(map((m) => m ?? null));
  }

  async createModule(programId: string, payload: CreateModulePayload): Promise<string> {
    const requiredProgramId = this.requireProgramId(programId);
    const ref = await addDoc(this.col(requiredProgramId), {
      ...payload,
      programId: requiredProgramId,
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
    const requiredProgramId = this.requireProgramId(programId);
    await updateDoc(doc(this.db, `programs/${requiredProgramId}/modules/${moduleId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteModule(programId: string, moduleId: string): Promise<void> {
    const requiredProgramId = this.requireProgramId(programId);
    await deleteDoc(doc(this.db, `programs/${requiredProgramId}/modules/${moduleId}`));
  }

  private requireProgramId(programId: string): string {
    const value = String(programId || '').trim();
    if (!value || value === 'undefined') {
      throw new Error('Missing programId. Navigate from a specific program before managing modules.');
    }
    return value;
  }
}
