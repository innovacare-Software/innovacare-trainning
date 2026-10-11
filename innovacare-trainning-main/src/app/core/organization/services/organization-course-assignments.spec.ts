import { OrganizationCourseDoc } from '../org.models';
import { mergeOrganizationCourseAssignments } from './organization-course-assignments';

describe('Organization course assignment compatibility', () => {
  const assignment = (courseId: string, active = true): OrganizationCourseDoc => ({
    orgId: 'org-a', courseId, active,
  });

  it('keeps assignments previously written only to the legacy tenant path', () => {
    const rows = mergeOrganizationCourseAssignments('org-a', [assignment('legacy-course')], []);
    expect(rows.map((row) => row.courseId)).toEqual(['legacy-course']);
  });

  it('includes canonical-only assignments without duplicating mirrored courses', () => {
    const rows = mergeOrganizationCourseAssignments('org-a', [assignment('shared')], [
      assignment('shared'), assignment('new-course'),
    ]);
    expect(rows.map((row) => row.courseId)).toEqual(['shared', 'new-course']);
  });

  it('honors canonical deactivation even if a stale legacy copy is active', () => {
    const rows = mergeOrganizationCourseAssignments('org-a', [assignment('shared')], [assignment('shared', false)]);
    expect(rows[0].active).toBeFalse();
  });

  it('takes identity from the scoped path and supports old records identified by document ID', () => {
    const rows = mergeOrganizationCourseAssignments('org-a', [
      { id: 'old-course', orgId: 'stale-org', title: 'Existing course' } as OrganizationCourseDoc,
    ], []);
    expect(rows[0]).toEqual({
      id: 'old-course', orgId: 'org-a', courseId: 'old-course', title: 'Existing course', active: true,
    });
  });
});
