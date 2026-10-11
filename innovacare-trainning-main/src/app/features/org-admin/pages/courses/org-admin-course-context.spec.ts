import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { OrgContext, OrgContextService } from '../../../../core/organization/org-context.service';
import { OrganizationAssignmentsService } from '../../../../core/organization/services/organization-assignments.service';
import { OrganizationCoursesVisibilityService } from '../../../../core/organization/services/organization-courses-visibility.service';
import { OrganizationUsersService } from '../../../../core/organization/services/organization-users.service';
import { OrgAdminAssignmentsPage } from '../assignments/org-admin-assignments.page';
import { OrgAdminCoursesPage } from './org-admin-courses.page';

describe('Organization course pages with delayed authentication', () => {
  const emptyContext: OrgContext = {
    uid: '', orgId: null, role: '', orgRole: null,
    isSuperAdmin: false, isOrgAdmin: false, isOrgManager: false, isOrgLearner: false,
  };
  let context: BehaviorSubject<OrgContext>;
  let courses: jasmine.Spy;
  let learners: jasmine.Spy;
  let assignments: jasmine.Spy;

  beforeEach(() => {
    context = new BehaviorSubject(emptyContext);
    courses = jasmine.createSpy('listVisibleCourses').and.callFake((orgId: string) =>
      of(orgId ? [{ orgId, courseId: `course-${orgId}`, title: `Course ${orgId}`, active: true }] : [])
    );
    learners = jasmine.createSpy('listLearners').and.returnValue(of([]));
    assignments = jasmine.createSpy('list').and.returnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: OrgContextService, useValue: { context$: context } },
        { provide: OrganizationCoursesVisibilityService, useValue: { listVisibleCourses: courses } },
        { provide: OrganizationUsersService, useValue: { listLearners: learners } },
        { provide: OrganizationAssignmentsService, useValue: { list: assignments } },
      ],
    });
  });

  it('loads and displays courses once the organization context arrives', () => {
    const page = TestBed.runInInjectionContext(() => new OrgAdminCoursesPage());
    expect(page.rows()).toEqual([]);
    context.next({ ...emptyContext, orgId: 'org-a' });
    expect(page.rows()[0].title).toBe('Course org-a');
  });

  it('reloads all assignment selectors after login and clears courses on logout', () => {
    const page = TestBed.runInInjectionContext(() => new OrgAdminAssignmentsPage());
    context.next({ ...emptyContext, orgId: 'org-a' });
    expect(page.courses()[0].courseId).toBe('course-org-a');
    expect(learners).toHaveBeenCalledWith('org-a');
    expect(assignments).toHaveBeenCalledWith('org-a');
    context.next(emptyContext);
    expect(page.courses()).toEqual([]);
  });

  it('unsubscribes the previous organization when context changes', () => {
    const previous = new Subject<any[]>();
    courses.and.callFake((orgId: string) => orgId === 'org-a' ? previous : of([]));
    const page = TestBed.runInInjectionContext(() => new OrgAdminCoursesPage());
    context.next({ ...emptyContext, orgId: 'org-a' });
    previous.next([{ courseId: 'course-a', active: true }]);
    expect(page.rows().length).toBe(1);
    context.next({ ...emptyContext, orgId: 'org-b' });
    previous.next([{ courseId: 'stale-course', active: true }]);
    expect(page.rows()).toEqual([]);
  });
});
