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
import { OrganizationAlert, OrganizationAlertStatus } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationAlertsService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationAlert[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.alerts(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationAlert[]>;
  }

  listActive(orgId: string): Observable<OrganizationAlert[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.alerts(orgId));
    const q = query(ref, where('status', 'in', ['open', 'acknowledged', 'in_progress']));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationAlert[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.alerts(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async updateStatus(orgId: string, alertId: string, status: OrganizationAlertStatus): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.alert(orgId, alertId));
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
      resolvedAt: status === 'resolved' ? serverTimestamp() : null,
    });
  }

  async assignTo(orgId: string, alertId: string, uid: string): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.alert(orgId, alertId));
    await updateDoc(ref, {
      assignedTo: uid,
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    });
  }
}
