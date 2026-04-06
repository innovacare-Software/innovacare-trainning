import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationUserDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationUsersService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationUserDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.users(orgId));
    return collectionData(ref, { idField: 'uid' }) as Observable<OrganizationUserDoc[]>;
  }

  listLearners(orgId: string): Observable<OrganizationUserDoc[]> {
    const ref = collection(this.afs, OrgFirestorePaths.users(orgId));
    const q = query(ref, where('role', '==', 'org_learner'));
    return collectionData(q, { idField: 'uid' }) as Observable<OrganizationUserDoc[]>;
  }

  getByUid(orgId: string, uid: string): Observable<OrganizationUserDoc | null> {
    const ref = doc(this.afs, OrgFirestorePaths.user(orgId, uid));
    return docData(ref, { idField: 'uid' }) as Observable<OrganizationUserDoc | null>;
  }

  async upsert(orgId: string, user: OrganizationUserDoc): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.user(orgId, user.uid));
    await setDoc(
      ref,
      {
        ...user,
        updatedAt: serverTimestamp(),
        createdAt: user.createdAt ?? serverTimestamp(),
      },
      { merge: true }
    );
  }

  async setActive(orgId: string, uid: string, active: boolean): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.user(orgId, uid));
    await updateDoc(ref, { active, updatedAt: serverTimestamp() });
  }
}
