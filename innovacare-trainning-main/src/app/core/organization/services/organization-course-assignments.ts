import { OrganizationCourseDoc } from '../org.models';

export function mergeOrganizationCourseAssignments(
  orgId: string,
  legacy: OrganizationCourseDoc[],
  canonical: OrganizationCourseDoc[]
): OrganizationCourseDoc[] {
  const byCourse = new Map<string, OrganizationCourseDoc>();
  // Canonical records take precedence, including explicit deactivation.
  for (const row of [...legacy, ...canonical]) {
    const courseId = row.courseId || row.id;
    if (!courseId) continue;
    byCourse.set(courseId, {
      ...byCourse.get(courseId),
      ...row,
      orgId,
      courseId,
      active: row.active !== false,
    });
  }
  return Array.from(byCourse.values());
}
