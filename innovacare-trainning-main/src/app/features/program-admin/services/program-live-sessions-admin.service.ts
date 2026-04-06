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
import { ProgramLiveSession } from '../shared/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramLiveSessionsAdminService {
  private readonly firestore = inject(Firestore);

  private col(programId: string) {
    return collection(this.firestore, `programs/${programId}/liveSessions`);
  }

  getLiveSessions(programId: string): Observable<ProgramLiveSession[]> {
    return collectionData(query(this.col(programId), orderBy('startAt', 'asc')), {
      idField: 'id',
    }) as Observable<ProgramLiveSession[]>;
  }

  getLiveSessionById(
    programId: string,
    sessionId: string
  ): Observable<ProgramLiveSession | undefined> {
    return docData(doc(this.firestore, `programs/${programId}/liveSessions/${sessionId}`), {
      idField: 'id',
    }) as Observable<ProgramLiveSession | undefined>;
  }

  async createLiveSession(
    programId: string,
    payload: Omit<ProgramLiveSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
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
    payload: Partial<Omit<ProgramLiveSession, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `programs/${programId}/liveSessions/${sessionId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteLiveSession(programId: string, sessionId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `programs/${programId}/liveSessions/${sessionId}`));
  }
}
