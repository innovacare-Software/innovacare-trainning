import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';
import { firstValueFrom, map, Observable } from 'rxjs';
import { Course } from '../../../data/models';
import { OrganizationAssignedCourse } from '../models/super-admin.models';
import { OrgFirestorePaths } from '../../../core/organization/org-firestore-paths';
import { OrganizationCoursesService } from '../../../core/organization/services/organization-courses.service';

@Injectable({ providedIn: 'root' })
export class SuperAdminOrganizationCoursesService {
  private afs = inject(Firestore);
  private orgCourses = inject(OrganizationCoursesService);

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
    return this.orgCourses.listAssigned(orgId);
  }

  async assignCourseToOrganization(
    orgId: string, courseId: string, actor?: { uid?: string; email?: string }
  ): Promise<void> {
    const [course, canonical, legacy] = await Promise.all([
      getDoc(doc(this.afs, 'courses', courseId)),
      getDoc(doc(this.afs, OrgFirestorePaths.course(orgId, courseId))),
      getDoc(doc(this.afs, `organizations/${orgId}/courses/${courseId}`)),
    ]);
    if (!course.exists()) throw new Error('Course not found.');
    const assignment = {
      orgId,
      courseId,
      title: course.data()['title'] || courseId,
      active: true,
      ...(actor ? { assignedByUid: actor.uid ?? null, assignedByEmail: actor.email ?? null } : {}),
      assignedAt: canonical.data()?.['assignedAt'] ?? legacy.data()?.['assignedAt'] ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(this.afs);
    // Commit all supported paths together so a successful assignment is visible everywhere.
    for (const path of this.assignmentPaths(orgId, courseId)) {
      batch.set(doc(this.afs, path), assignment, { merge: true });
    }
    await batch.commit();
  }

  async removeCourseFromOrganization(orgId: string, courseId: string): Promise<void> {
    const oldAssignments = await getDocs(query(
      collection(this.afs, 'organizationCourseAssignments'),
      where('orgId', '==', orgId), where('courseId', '==', courseId)
    ));
    const batch = writeBatch(this.afs);
    for (const path of this.assignmentPaths(orgId, courseId)) {
      batch.delete(doc(this.afs, path));
    }
    for (const assignment of oldAssignments.docs) {
      if (assignment.id !== `${orgId}_${courseId}`) batch.delete(assignment.ref);
    }
    await batch.commit();
  }

  private assignmentPaths(orgId: string, courseId: string): string[] {
    return [
      OrgFirestorePaths.course(orgId, courseId),
      `organizations/${orgId}/courses/${courseId}`,
      `organizationCourseAssignments/${orgId}_${courseId}`,
    ];
  }

  async syncOrganizationAssignedCourses(orgId: string, courseIds: string[]): Promise<void> {
    const unique = Array.from(new Set(courseIds.filter(Boolean)));

    const current = await firstValueFrom(this.getAssignedCoursesForOrganization(orgId));

    const currentSet = new Set(current.map((x) => x.courseId));
    const targetSet = new Set(unique);

    for (const courseId of unique) {
      await this.assignCourseToOrganization(orgId, courseId);
    }

    for (const courseId of currentSet) {
      if (!targetSet.has(courseId)) {
        await this.removeCourseFromOrganization(orgId, courseId);
      }
    }
  }
}
