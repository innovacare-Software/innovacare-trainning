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
import { Observable, of, combineLatest, map } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationCourseDoc } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationCoursesService {
  private readonly afs = inject(Firestore);

  listAssigned(orgId: string): Observable<OrganizationCourseDoc[]> {
    if (!orgId?.trim()) return of([]);
    
    const assignedRef = collection(this.afs, `organizations/${orgId}/assignedCourses`);
    const legacyRef = collection(this.afs, `organizations/${orgId}/courses`);

    const assigned$ = collectionData(assignedRef, { idField: 'courseId' }) as Observable<any[]>;
    const legacy$ = collectionData(legacyRef, { idField: 'courseId' }) as Observable<any[]>;

    return combineLatest([assigned$, legacy$]).pipe(
      map(([assignedRows, legacyRows]) => {
        const merged = new Map<string, any>();

        for (const row of legacyRows) {
          const cid = row.courseId || row.id;
          if (cid) {
            merged.set(cid, { ...row, courseId: cid });
          }
        }

        for (const row of assignedRows) {
          const cid = row.courseId || row.id;
          if (cid) {
            merged.set(cid, { ...merged.get(cid), ...row, courseId: cid });
          }
        }

        return Array.from(merged.values()) as OrganizationCourseDoc[];
      })
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
