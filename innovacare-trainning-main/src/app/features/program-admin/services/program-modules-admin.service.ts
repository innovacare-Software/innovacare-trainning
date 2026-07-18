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
import { ProgramModule } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramModulesAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/modules`);
  }

  getModules(programId: string): Observable<ProgramModule[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramModule[]>;
  }

  getModuleById(programId: string, moduleId: string): Observable<ProgramModule | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/modules/${moduleId}`), {
      idField: 'id',
    }) as Observable<ProgramModule | undefined>;
  }

  async createModule(
    programId: string,
    payload: Omit<ProgramModule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
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
    payload: Partial<Omit<ProgramModule, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/modules/${moduleId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteModule(programId: string, moduleId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/modules/${moduleId}`));
  }
}
