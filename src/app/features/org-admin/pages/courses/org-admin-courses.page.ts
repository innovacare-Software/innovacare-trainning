import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationCoursesVisibilityService } from '../../../../core/organization/services/organization-courses-visibility.service';
import { OrganizationAssignmentsService } from '../../../../core/organization/services/organization-assignments.service';
import { of, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header>
        <div>
          <h2>Organization Courses</h2>
          <p>Visible catalog and operational readiness for this organization.</p>
        </div>
        <a routerLink="/org-admin/assignments" class="header-link">Open assignments</a>
      </header>

      <section class="summary">
        <article><h3>{{ rows().length }}</h3><p>Visible courses</p></article>
        <article><h3>{{ activeCount() }}</h3><p>Active courses</p></article>
        <article><h3>{{ inactiveCount() }}</h3><p>Inactive courses</p></article>
        <article><h3>{{ assignedLinksCount() }}</h3><p>Assignment links</p></article>
      </section>

      <section class="filters">
        <input [(ngModel)]="search" placeholder="Search by course title or id" />
        <select [(ngModel)]="statusFilter">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      <table *ngIf="filteredRows().length; else emptyTpl">
        <thead><tr><th>Course</th><th>CourseId</th><th>Status</th><th>Assignments</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of filteredRows()">
            <td>
              <strong>{{ c.title || 'Untitled course' }}</strong>
              <small>{{ courseNarrative(c.courseId) }}</small>
            </td>
            <td>{{ c.courseId }}</td>
            <td><span class="status-pill" [class.off]="c.active === false">{{ c.active === false ? 'inactive' : 'active' }}</span></td>
            <td>{{ assignmentCountFor(c.courseId) }}</td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyTpl>
        <article class="empty">
          <h3>No visible course assigned to this organization</h3>
          <p>Assign organization courses first, then distribute them to learners from the assignments workspace.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`.page{background:#fff;border:1px solid #d8e4f0;border-radius:12px;padding:1rem}header{display:flex;justify-content:space-between;align-items:end;gap:.75rem}.header-link{text-decoration:none;border-radius:10px;border:1px solid #c9d9ea;background:#f7fbff;color:#1f486c;padding:.5rem .75rem;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;margin:.8rem 0}.summary article{border:1px solid #dce7f2;border-radius:10px;padding:.7rem;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)}.summary h3{margin:0;color:#12395b}.summary p{margin:.2rem 0 0;color:#5f7994}.filters{display:grid;grid-template-columns:1.8fr 1fr;gap:.5rem;margin-bottom:.7rem}.filters input,.filters select{border:1px solid #c7d8e9;border-radius:8px;padding:.45rem .55rem}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e6edf4;text-align:left;padding:.6rem .5rem;vertical-align:top}td strong{display:block;color:#163d61}td small{display:block;margin-top:.18rem;color:#6a829a}.status-pill{display:inline-flex;align-items:center;border-radius:999px;padding:.25rem .55rem;font-size:.78rem;font-weight:700;background:#eef5fc;color:#1d4b73}.status-pill.off{background:#f4ecec;color:#8c3333}.empty{border:1px dashed #c6d7e9;border-radius:10px;padding:1rem;text-align:center;color:#56708a}@media(max-width:900px){header,.summary,.filters{grid-template-columns:1fr;display:grid}}`],
})
export class OrgAdminCoursesPage {
  private readonly ctx = inject(OrgContextService);
  private readonly service = inject(OrganizationCoursesVisibilityService);
  private readonly assignments = inject(OrganizationAssignmentsService);
  search = '';
  statusFilter = 'all';
  private readonly context = toSignal(this.ctx.context$, { initialValue: { uid: '', orgId: null, role: '', orgRole: null, isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false } });
  readonly orgId = computed(() => this.context().orgId || '');
  private readonly orgId$ = toObservable(this.orgId);
  readonly rows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.service.listVisibleCourses(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly assignmentRows = toSignal(this.orgId$.pipe(switchMap((orgId) => (orgId ? this.assignments.list(orgId) : of([] as any[])))), { initialValue: [] as any[] });
  readonly activeCount = computed(() => this.rows().filter((row) => row.active !== false).length);
  readonly inactiveCount = computed(() => this.rows().filter((row) => row.active === false).length);
  readonly assignedLinksCount = computed(() => this.assignmentRows().length);
  readonly filteredRows = computed(() => {
    const term = this.search.trim().toLowerCase();
    return this.rows().filter((row) => {
      const status = row.active === false ? 'inactive' : 'active';
      const matchesStatus = this.statusFilter === 'all' || status === this.statusFilter;
      const matchesSearch = !term || `${row.courseId || ''} ${row.title || ''}`.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  });

  assignmentCountFor(courseId: string): number {
    return this.assignmentRows().filter((row) => row.courseId === courseId).length;
  }

  courseNarrative(courseId: string): string {
    const count = this.assignmentCountFor(courseId);
    if (count === 0) {
      return 'Ready in catalog but not yet assigned to learners';
    }
    if (count === 1) {
      return 'Currently linked to 1 learner assignment';
    }
    return `Currently linked to ${count} learner assignments`;
  }
}
