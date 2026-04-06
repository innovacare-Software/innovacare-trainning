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
import { OrganizationWoundLibraryItemDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationWoundLibraryService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationWoundLibraryItemDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.woundLibrary(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationWoundLibraryItemDoc[]>;
  }

  listActive(orgId: string): Observable<OrganizationWoundLibraryItemDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.woundLibrary(orgId));
    const q = query(ref, where('active', '==', true));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationWoundLibraryItemDoc[]>;
  }

  async create(
    orgId: string,
    payload: Omit<OrganizationWoundLibraryItemDoc, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.woundLibrary(orgId));
    await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async update(orgId: string, itemId: string, patch: Partial<OrganizationWoundLibraryItemDoc>): Promise<void> {
    const ref = doc(this.afs, `${OrgFirestorePaths.woundLibrary(orgId)}/${itemId}`);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }
}
