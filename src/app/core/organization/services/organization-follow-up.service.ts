import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationFollowUpAction } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationFollowUpService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationFollowUpAction[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.followUpActions(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationFollowUpAction[]>;
  }

  listOpen(orgId: string): Observable<OrganizationFollowUpAction[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.followUpActions(orgId));
    const q = query(ref, where('status', '==', 'open'));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationFollowUpAction[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationFollowUpAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.followUpActions(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async markDone(orgId: string, actionId: string, note?: string): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.followUpAction(orgId, actionId));
    await updateDoc(ref, {
      status: 'done',
      note: note || null,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
