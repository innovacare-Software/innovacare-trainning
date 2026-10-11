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
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationCourseDoc } from '../org.models';
import { mergeOrganizationCourseAssignments } from './organization-course-assignments';

@Injectable({ providedIn: 'root' })
export class OrganizationCoursesService {
  private readonly afs = inject(Firestore);

  listAssigned(orgId: string): Observable<OrganizationCourseDoc[]> {
    if (!orgId?.trim()) return of([]);
    const canonical = collectionData(
      collection(this.afs, OrgFirestorePaths.courses(orgId)), { idField: 'courseId' }
    ) as Observable<OrganizationCourseDoc[]>;
    const legacy = collectionData(
      collection(this.afs, `organizations/${orgId}/courses`), { idField: 'courseId' }
    ) as Observable<OrganizationCourseDoc[]>;
    const globalLegacy = collectionData(
      query(collection(this.afs, 'organizationCourseAssignments'), where('orgId', '==', orgId)),
      { idField: 'id' }
    ) as Observable<OrganizationCourseDoc[]>;

    return combineLatest([globalLegacy, legacy, canonical]).pipe(
      map(([globalRows, oldRows, rows]) => mergeOrganizationCourseAssignments(orgId, [...globalRows, ...oldRows], rows)),
      switchMap((rows) => rows.length ? combineLatest(rows.map((assignment) =>
        docData(doc(this.afs, 'courses', assignment.courseId)).pipe(
          map((course) => ({
            ...assignment,
            title: course?.['title'] || assignment.title || assignment.courseId,
          }))
        )
      )) : of([]))
    );
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
