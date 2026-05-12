/**
 * Canonical permission matrix for Innovacare Training / SYGEPEC.
 *
 * Source of truth for role → capability checks across all admin shells,
 * route guards, UI affordances, and assertion helpers. Firestore rules
 * enforce the same matrix server-side; this file is the client mirror.
 *
 * Roles
 * -----
 *   super_admin   global platform role (lives on the user profile)
 *   org_admin     organization-level admin (lives on a userOrgMembership)
 *   program_admin program-level admin     (lives on a userOrgMembership)
 *   instructor    assigned-content educator (lives on a userOrgMembership)
 *   learner       enrolled student          (lives on a userOrgMembership)
 *   guest         public catalog only       (no auth required)
 *
 * Capability tokens
 * -----------------
 * Each capability is a verb + scoped noun. They are intentionally fine
 * grained so org_admin/program_admin can have distinct surfaces.
 */

export type PlatformRole = 'super_admin';
export type OrgScopedRole = 'org_admin' | 'program_admin' | 'instructor' | 'learner' | 'guest';
export type AnyRole = PlatformRole | OrgScopedRole;

export type Capability =
  // Platform / Super Admin
  | 'platform.manage_orgs'
  | 'platform.manage_templates'
  | 'platform.audit_logs'
  | 'platform.security_center'

  // Organization
  | 'org.manage_settings'
  | 'org.manage_members'
  | 'org.invite_admins'

  // Programs (org-scoped catalog of training programs)
  | 'program.create'
  | 'program.edit'
  | 'program.delete'
  | 'program.publish'

  // Courses (org-scoped courses inside programs)
  | 'course.create'
  | 'course.edit'
  | 'course.delete'

  // Blueprints (org-scoped, exam_prep + general)
  | 'blueprint.create'
  | 'blueprint.edit'
  | 'blueprint.delete'

  // Question bank (org-scoped)
  | 'questionbank.read'
  | 'questionbank.create'
  | 'questionbank.edit'
  | 'questionbank.delete'

  // Assessments / tests (org-scoped)
  | 'assessment.create'
  | 'assessment.edit'
  | 'assessment.publish'
  | 'assessment.delete'
  | 'assessment.grade'

  // Learners (org-scoped)
  | 'learner.create'
  | 'learner.invite'
  | 'learner.suspend'
  | 'learner.view_progress'

  // Enrollments (org-scoped)
  | 'enrollment.create'
  | 'enrollment.update'
  | 'enrollment.revoke'

  // Certificates
  | 'certificate.issue'
  | 'certificate.view'

  // Analytics
  | 'analytics.view_org'
  | 'analytics.view_global';

/**
 * Role × capability matrix. Server rules MUST mirror this.
 * Anything not listed is denied by default.
 */
const MATRIX: Record<AnyRole, ReadonlyArray<Capability>> = {
  super_admin: [
    'platform.manage_orgs',
    'platform.manage_templates',
    'platform.audit_logs',
    'platform.security_center',
    'org.manage_settings',
    'org.manage_members',
    'org.invite_admins',
    'program.create', 'program.edit', 'program.delete', 'program.publish',
    'course.create', 'course.edit', 'course.delete',
    'blueprint.create', 'blueprint.edit', 'blueprint.delete',
    'questionbank.read', 'questionbank.create', 'questionbank.edit', 'questionbank.delete',
    'assessment.create', 'assessment.edit', 'assessment.publish', 'assessment.delete', 'assessment.grade',
    'learner.create', 'learner.invite', 'learner.suspend', 'learner.view_progress',
    'enrollment.create', 'enrollment.update', 'enrollment.revoke',
    'certificate.issue', 'certificate.view',
    'analytics.view_org', 'analytics.view_global',
  ],

  org_admin: [
    'org.manage_settings',
    'org.manage_members',
    'org.invite_admins',
    'program.create', 'program.edit', 'program.delete', 'program.publish',
    'course.create', 'course.edit', 'course.delete',
    'blueprint.create', 'blueprint.edit', 'blueprint.delete',
    'questionbank.read', 'questionbank.create', 'questionbank.edit', 'questionbank.delete',
    'assessment.create', 'assessment.edit', 'assessment.publish', 'assessment.delete', 'assessment.grade',
    'learner.create', 'learner.invite', 'learner.suspend', 'learner.view_progress',
    'enrollment.create', 'enrollment.update', 'enrollment.revoke',
    'certificate.issue', 'certificate.view',
    'analytics.view_org',
  ],

  program_admin: [
    'program.create', 'program.edit', 'program.publish',
    'course.create', 'course.edit',
    'blueprint.create', 'blueprint.edit',
    'questionbank.read', 'questionbank.create', 'questionbank.edit', 'questionbank.delete',
    'assessment.create', 'assessment.edit', 'assessment.publish', 'assessment.grade',
    'learner.create', 'learner.invite', 'learner.suspend', 'learner.view_progress',
    'enrollment.create', 'enrollment.update', 'enrollment.revoke',
    'certificate.view', 'certificate.issue',
    'analytics.view_org',
  ],

  instructor: [
    'course.edit',
    'questionbank.read', 'questionbank.create', 'questionbank.edit',
    'assessment.create', 'assessment.edit', 'assessment.grade',
    'learner.view_progress',
  ],

  learner: [
    'certificate.view',
  ],

  guest: [],
};

/**
 * Returns true if any of the supplied roles grants the capability.
 * Pass the user's platform role plus all active membership roles.
 */
export function hasCapability(roles: ReadonlyArray<AnyRole | undefined | null>, cap: Capability): boolean {
  for (const role of roles) {
    if (!role) continue;
    if (MATRIX[role]?.includes(cap)) return true;
  }
  return false;
}

/** Returns the full capability set for a single role. */
export function capabilitiesFor(role: AnyRole): ReadonlyArray<Capability> {
  return MATRIX[role] ?? [];
}

/** Convenience: program admins (or stronger) can author blueprints. */
export function canManageBlueprints(roles: ReadonlyArray<AnyRole | undefined | null>): boolean {
  return hasCapability(roles, 'blueprint.create') || hasCapability(roles, 'blueprint.edit');
}

/** Convenience: can the user enroll learners into org programs? */
export function canEnrollLearners(roles: ReadonlyArray<AnyRole | undefined | null>): boolean {
  return hasCapability(roles, 'enrollment.create');
}

/**
 * Hard guard against client-side role escalation: program_admin must NEVER
 * be allowed to assign org_admin/super_admin/program_admin to another user
 * unless explicitly granted `org.invite_admins`.
 */
export function canAssignRole(actorRoles: ReadonlyArray<AnyRole | undefined | null>, targetRole: AnyRole): boolean {
  if (targetRole === 'super_admin') {
    // Only an existing super_admin can mint another super_admin (and even
    // then it should be done via a Cloud Function, not the client).
    return actorRoles.includes('super_admin');
  }
  if (targetRole === 'org_admin' || targetRole === 'program_admin') {
    return hasCapability(actorRoles, 'org.invite_admins');
  }
  // learner / instructor / guest can be assigned by anyone with member mgmt.
  return hasCapability(actorRoles, 'org.manage_members');
}
