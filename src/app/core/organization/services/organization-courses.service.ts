import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationCourseDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationCoursesService {
  private readonly afs = inject(Firestore);

  listAssigned(orgId: string): Observable<OrganizationCourseDoc[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.courses(orgId));
    return collectionData(ref, { idField: 'courseId' }) as Observable<OrganizationCourseDoc[]>;
  }

  async assignCourseToOrg(orgId: string, course: OrganizationCourseDoc): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.course(orgId, course.courseId));
    await setDoc(
      ref,
      {
        ...course,
        assignedAt: course.assignedAt ?? serverTimestamp(),
        active: course.active ?? true,
      },
      { merge: true }
    );
  }

  async setCourseActive(orgId: string, courseId: string, active: boolean): Promise<void> {
    const ref = doc(this.afs, OrgFirestorePaths.course(orgId, courseId));
    await updateDoc(ref, { active, updatedAt: serverTimestamp() });
  }
}
