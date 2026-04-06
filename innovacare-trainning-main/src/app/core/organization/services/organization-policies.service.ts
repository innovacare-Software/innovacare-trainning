import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationPolicyDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationPoliciesService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationPolicyDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.policies(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationPolicyDoc[]>;
  }

  listActive(orgId: string): Observable<OrganizationPolicyDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.policies(orgId));
    const q = query(ref, where('active', '==', true));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationPolicyDoc[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationPolicyDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.policies(orgId));
    await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async update(orgId: string, policyId: string, patch: Partial<OrganizationPolicyDoc>): Promise<void> {
    const ref = doc(this.afs, `${OrgFirestorePaths.policies(orgId)}/${policyId}`);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }
}
