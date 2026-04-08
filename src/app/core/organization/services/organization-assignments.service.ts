import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationCourseAssignmentDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationAssignmentsService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationCourseAssignmentDoc[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.courseAssignments(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationCourseAssignmentDoc[]>;
  }

  listByUser(orgId: string, userId: string): Observable<OrganizationCourseAssignmentDoc[]> {
    if (!orgId?.trim() || !userId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.courseAssignments(orgId));
    const q = query(ref, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationCourseAssignmentDoc[]>;
  }

  async assignCourseToUser(
    orgId: string,
    payload: Omit<OrganizationCourseAssignmentDoc, 'id' | 'assignedAt'>
  ): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.courseAssignments(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      assignedAt: serverTimestamp(),
    });
  }
}
