import { membershipId, ASSIGNABLE_USER_ORG_ROLES, ADMIN_USER_ORG_ROLES } from './user-org-memberships';

describe('user-org-memberships model', () => {
  it('builds deterministic membership ids', () => {
    expect(membershipId('user-1', 'org-A')).toBe('user-1__org-A');
    // Idempotent for the same pair.
    expect(membershipId('user-1', 'org-A')).toBe(membershipId('user-1', 'org-A'));
  });

  it('exposes the assignable role list (no super_admin)', () => {
    expect(ASSIGNABLE_USER_ORG_ROLES).toEqual(
      jasmine.arrayContaining(['guest', 'learner', 'instructor', 'program_admin', 'org_admin'])
    );
    expect(ASSIGNABLE_USER_ORG_ROLES as readonly string[]).not.toContain('super_admin');
  });

  it('marks program_admin and org_admin as admin-tier roles', () => {
    expect(ADMIN_USER_ORG_ROLES).toEqual(
      jasmine.arrayContaining(['program_admin', 'org_admin'])
    );
  });
});
