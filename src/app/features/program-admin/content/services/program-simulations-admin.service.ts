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
  ProgramContentSimulation,
  CreateSimulationPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramSimulationsAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/simulations`);
  }

  getSimulations(programId: string): Observable<ProgramContentSimulation[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramContentSimulation[]>;
  }

  getSimulationById(programId: string, simulationId: string): Observable<ProgramContentSimulation | null> {
    return (
      docData(doc(this.db, `programs/${programId}/simulations/${simulationId}`), { idField: 'id' }) as Observable<ProgramContentSimulation>
    ).pipe(map((s) => s ?? null));
  }

  async createSimulation(programId: string, payload: CreateSimulationPayload): Promise<string> {
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
    payload: Partial<CreateSimulationPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/simulations/${simulationId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteSimulation(programId: string, simulationId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/simulations/${simulationId}`));
  }
}
