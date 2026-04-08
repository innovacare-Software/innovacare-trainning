import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrganizationCoursesService } from '../../services/super-admin-organization-courses.service';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';

@Component({
  selector: 'app-course-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './course-assign.html',
  styleUrl: './course-assign.css',
})
export class CourseAssign {
  private route = inject(ActivatedRoute);
  private organizations = inject(SuperAdminOrganizationsService);
  private courses = inject(SuperAdminOrganizationCoursesService);

  search = signal('');
  onlyActive = signal(true);
  saving = signal(false);
  notice = signal('');

  orgId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('orgId') || params.get('id') || '')),
    { initialValue: '' }
  );

  organization = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('orgId') || params.get('id') || ''),
      switchMap((orgId) => this.organizations.getOrganizationById(orgId))
    ),
    { initialValue: null }
  );

  platformCourses = toSignal(this.courses.getPlatformCourses(), { initialValue: [] });

  assignedCourses = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('orgId') || params.get('id') || ''),
      switchMap((orgId) => this.courses.getAssignedCoursesForOrganization(orgId))
    ),
    { initialValue: [] }
  );

  selected = signal<Record<string, boolean>>({});
  private selectionTouched = signal(false);

  filteredPlatform = computed(() => {
    const term = this.search().trim().toLowerCase();
    const onlyActive = this.onlyActive();
    return this.platformCourses().filter((course) => {
      const matchesTerm = !term
        || `${course.title || ''} ${course.description || ''} ${course.id || ''}`.toLowerCase().includes(term);
      const matchesActive = !onlyActive || course.active !== false;
      return matchesTerm && matchesActive;
    });
  });

  assignedCourseIds = computed(() => new Set(this.assignedCourses().map((x) => x.courseId)));

  constructor() {
    effect(() => {
      const assigned = this.assignedCourses();
      if (this.selectionTouched() || !assigned.length) return;
      this.syncSelectionFromAssigned();
    });
  }

  syncSelectionFromAssigned() {
    const selected: Record<string, boolean> = {};
    for (const item of this.assignedCourses()) {
      selected[item.courseId] = true;
    }
    this.selected.set(selected);
  }

  isChecked(courseId: string | undefined): boolean {
    if (!courseId) return false;
    return !!this.selected()[courseId];
  }

  toggle(courseId: string | undefined, checked: boolean) {
    if (!courseId) return;
    this.selectionTouched.set(true);
    this.selected.update((current) => ({ ...current, [courseId]: checked }));
  }

  async saveSelection() {
    const orgId = this.orgId();
    if (!orgId) return;

    const selectedCourseIds = Object.entries(this.selected())
      .filter(([, checked]) => checked)
      .map(([courseId]) => courseId);

    this.saving.set(true);
    this.notice.set('');
    try {
      await this.courses.syncOrganizationAssignedCourses(orgId, selectedCourseIds);
      this.selectionTouched.set(false);
      this.notice.set('Assigned courses updated successfully.');
    } catch (error: any) {
      this.notice.set(error?.message || 'Failed to update assigned courses.');
    } finally {
      this.saving.set(false);
    }
  }

  async assignSingle(courseId: string | undefined) {
    const orgId = this.orgId();
    if (!orgId || !courseId) return;
    await this.courses.assignCourseToOrganization(orgId, courseId);
    this.selected.update((current) => ({ ...current, [courseId]: true }));
  }

  async removeSingle(courseId: string | undefined) {
    const orgId = this.orgId();
    if (!orgId || !courseId) return;
    await this.courses.removeCourseFromOrganization(orgId, courseId);
    this.selected.update((current) => ({ ...current, [courseId]: false }));
  }

}
