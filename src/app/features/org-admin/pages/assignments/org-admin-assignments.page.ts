import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationAssignmentsService } from '../../../../core/organization/services/organization-assignments.service';
import { OrganizationCoursesVisibilityService } from '../../../../core/organization/services/organization-courses-visibility.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h2>Assignments</h2>
        <p>{{ filteredAssignments().length }} assignments in view</p>
      </header>
      <div class="form">
        <select [(ngModel)]="selectedCourseId"><option value="">Select course</option><option *ngFor="let c of courses()" [value]="c.courseId">{{ c.title || c.courseId }}</option></select>
        <select [(ngModel)]="selectedUserId"><option value="">Select learner</option><option *ngFor="let u of learners()" [value]="u.uid">{{ u.displayName || u.email }}</option></select>
        <button (click)="assign()">Assign</button>
      </div>

      <section class="filters">
        <select [(ngModel)]="filterCourseId">
          <option value="all">All courses</option>
          <option *ngFor="let c of courses()" [value]="c.courseId">{{ c.title || c.courseId }}</option>
        </select>
        <select [(ngModel)]="filterUserId">
          <option value="all">All learners</option>
          <option *ngFor="let u of learners()" [value]="u.uid">{{ u.displayName || u.email }}</option>
        </select>
        <select [(ngModel)]="filterStatus">
          <option value="all">All status</option>
          <option value="assigned">Assigned</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </section>

      <table *ngIf="filteredAssignments().length; else emptyTpl">
        <thead><tr><th>Course</th><th>User</th><th>Status</th><th>Due</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of filteredAssignments()"><td>{{ a.courseId }}</td><td>{{ a.userId }}</td><td>{{ a.status }}</td><td>{{ a.dueDate?.toDate ? (a.dueDate.toDate() | date:'shortDate') : '—' }}</td></tr>
        </tbody>
      </table>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No assignment found</h3>
          <p>Assign approved courses to learners to activate training workflows.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.6rem}header h2{margin:0}header p{margin:0;color:#5c7894}.form{display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;margin:.7rem 0}.filters{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin:0 0 .6rem 0}select,button{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}button{background:#0f436e;color:#fff;border:0}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.5rem}.empty{border:1px dashed #c6d7e9;border-radius:10px;padding:1rem;text-align:center;color:#56708a}@media(max-width:900px){.form,.filters{grid-template-columns:1fr}}`],
})
export class OrgAdminAssignmentsPage {
  private readonly ctx = inject(OrgContextService);
  private readonly assignmentsService = inject(OrganizationAssignmentsService);
  private readonly coursesService = inject(OrganizationCoursesVisibilityService);
  private readonly usersService = inject(OrganizationUsersService);

  selectedCourseId = '';
  selectedUserId = '';
  filterCourseId = 'all';
  filterUserId = 'all';
  filterStatus = 'all';

  private readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });
  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);
  readonly courses = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.coursesService.listVisibleCourses(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly learners = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.usersService.listLearners(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly assignments = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.assignmentsService.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });

  readonly filteredAssignments = computed(() => {
    return this.assignments().filter((a) => {
      const matchesCourse = this.filterCourseId === 'all' || a.courseId === this.filterCourseId;
      const matchesUser = this.filterUserId === 'all' || a.userId === this.filterUserId;
      const matchesStatus = this.filterStatus === 'all' || a.status === this.filterStatus;
      return matchesCourse && matchesUser && matchesStatus;
    });
  });

  async assign() {
    if (!this.selectedCourseId || !this.selectedUserId || !this.context().uid) return;
    await this.assignmentsService.assignCourseToUser(this.orgId(), {
      orgId: this.orgId(),
      courseId: this.selectedCourseId,
      userId: this.selectedUserId,
      assignedBy: this.context().uid,
      status: 'assigned',
    });
    this.selectedCourseId = '';
    this.selectedUserId = '';
  }
}
