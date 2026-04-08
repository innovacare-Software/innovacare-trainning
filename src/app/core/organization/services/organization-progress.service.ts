import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationProgressDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationProgressService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationProgressDoc[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.progress(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationProgressDoc[]>;
  }

  listByUser(orgId: string, userId: string): Observable<OrganizationProgressDoc[]> {
    if (!orgId?.trim() || !userId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.progress(orgId));
    const q = query(ref, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationProgressDoc[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationProgressDoc, 'id' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.progress(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      updatedAt: serverTimestamp(),
    });
  }

  async updateProgress(orgId: string, progressId: string, patch: Partial<OrganizationProgressDoc>): Promise<void> {
    const ref = doc(this.afs, `${OrgFirestorePaths.progress(orgId)}/${progressId}`);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  }
}
