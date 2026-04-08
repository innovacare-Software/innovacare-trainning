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
  ProgramLiveSession,
  CreateLiveSessionPayload,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramLiveSessionsAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/liveSessions`);
  }

  getLiveSessions(programId: string): Observable<ProgramLiveSession[]> {
    return collectionData(
      query(this.col(programId), orderBy('startAt', 'asc')),
      { idField: 'id' }
    ) as Observable<ProgramLiveSession[]>;
  }

  getLiveSessionById(programId: string, sessionId: string): Observable<ProgramLiveSession | null> {
    return (
      docData(doc(this.db, `programs/${programId}/liveSessions/${sessionId}`), { idField: 'id' }) as Observable<ProgramLiveSession>
    ).pipe(map((s) => s ?? null));
  }

  async createLiveSession(programId: string, payload: CreateLiveSessionPayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateLiveSession(
    programId: string,
    sessionId: string,
    payload: Partial<CreateLiveSessionPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/liveSessions/${sessionId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteLiveSession(programId: string, sessionId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/liveSessions/${sessionId}`));
  }
}
