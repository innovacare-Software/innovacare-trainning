import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { firstValueFrom, map, Observable } from 'rxjs';
import { Course } from '../../../data/models';
import { OrganizationAssignedCourse } from '../models/super-admin.models';

@Injectable({ providedIn: 'root' })
export class SuperAdminOrganizationCoursesService {
  private afs = inject(Firestore);

  getPlatformCourses(): Observable<Course[]> {
    const ref = collection(this.afs, 'courses');
    return collectionData(ref, { idField: 'id' }).pipe(
      map((rows: any[]) =>
        rows
          .map((row) => row as Course)
          .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      )
    ) as Observable<Course[]>;
  }

  getAssignedCoursesForOrganization(orgId: string): Observable<OrganizationAssignedCourse[]> {
    const ref = collection(this.afs, `organizations/${orgId}/courses`);
    return collectionData(ref, { idField: 'id' }).pipe(
      map((rows: any[]) =>
        rows.map((row) => ({
          ...(row as OrganizationAssignedCourse),
          orgId,
          courseId: row.courseId || row.id,
        }))
      )
    ) as Observable<OrganizationAssignedCourse[]>;
  }

  async assignCourseToOrganization(orgId: string, courseId: string): Promise<void> {
    const assignmentRef = doc(this.afs, `organizations/${orgId}/courses/${courseId}`);
    await setDoc(
      assignmentRef,
      {
        orgId,
        courseId,
        active: true,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Write to canonical assignedCourses path for org admin access
    const assignedRef = doc(this.afs, `organizations/${orgId}/assignedCourses/${courseId}`);
    await setDoc(
      assignedRef,
      {
        orgId,
        courseId,
        active: true,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Compatibility with legacy global mapping used in parts of the app.
    const legacyRef = doc(this.afs, `organizationCourseAssignments/${orgId}_${courseId}`);
    await setDoc(
      legacyRef,
      {
        orgId,
        courseId,
        active: true,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async removeCourseFromOrganization(orgId: string, courseId: string): Promise<void> {
    await deleteDoc(doc(this.afs, `organizations/${orgId}/courses/${courseId}`));
    await deleteDoc(doc(this.afs, `organizations/${orgId}/assignedCourses/${courseId}`));
    await deleteDoc(doc(this.afs, `organizationCourseAssignments/${orgId}_${courseId}`));
  }

  async syncOrganizationAssignedCourses(orgId: string, courseIds: string[]): Promise<void> {
    const unique = Array.from(new Set(courseIds.filter(Boolean)));

    const current = await firstValueFrom(this.getAssignedCoursesForOrganization(orgId));

    const currentSet = new Set(current.map((x) => x.courseId));
    const targetSet = new Set(unique);

    for (const courseId of unique) {
      if (!currentSet.has(courseId)) {
        await this.assignCourseToOrganization(orgId, courseId);
      }
    }

    for (const courseId of currentSet) {
      if (!targetSet.has(courseId)) {
        await this.removeCourseFromOrganization(orgId, courseId);
      }
    }
  }
}
