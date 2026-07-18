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
import { ProgramSimulation } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramSimulationsAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/simulations`);
  }

  getSimulations(programId: string): Observable<ProgramSimulation[]> {
    return collectionData(query(this.col(programId), orderBy('order', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramSimulation[]>;
  }

  getSimulationById(
    programId: string,
    simulationId: string
  ): Observable<ProgramSimulation | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/simulations/${simulationId}`), {
      idField: 'id',
    }) as Observable<ProgramSimulation | undefined>;
  }

  async createSimulation(
    programId: string,
    payload: Omit<ProgramSimulation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateSimulation(
    programId: string,
    simulationId: string,
    payload: Partial<Omit<ProgramSimulation, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/simulations/${simulationId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteSimulation(programId: string, simulationId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/simulations/${simulationId}`));
  }
}
