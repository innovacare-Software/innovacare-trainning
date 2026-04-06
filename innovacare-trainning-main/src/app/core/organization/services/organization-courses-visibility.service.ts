import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { OrganizationAssignedCourse } from '../org.models';
import { OrganizationCoursesService } from './organization-courses.service';

@Injectable({ providedIn: 'root' })
export class OrganizationCoursesVisibilityService {
  private readonly courses = inject(OrganizationCoursesService);

  listVisibleCourses(orgId: string): Observable<OrganizationAssignedCourse[]> {
    return this.courses.listAssigned(orgId).pipe(
      map((rows) => rows.filter((x) => x.active !== false))
    );
  }
}
