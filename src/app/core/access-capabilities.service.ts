import { Injectable } from '@angular/core';
import { AppProfile, AppRole } from './auth';
import type { OrgContext } from './organization/org-context.service';

export type AdminSpaceKey = 'super-admin' | 'org-admin' | 'program-admin';

export interface AdminSpaceOption {
  key: AdminSpaceKey;
  label: string;
  description: string;
  route: string;
  tone: 'platform' | 'organization' | 'program';
}

/**
 * Capability decisions.
 *
 * Important security rule: only `super_admin` is a global role. Org-admin /
 * program-admin capabilities MUST come from an explicit organization
 * membership (see `UserOrgMembershipsService`) and are therefore checked via
 * the `OrgContext` passed in by the caller. When no context is provided the
 * methods default to the safer strict behavior (super_admin only).
 */
@Injectable({ providedIn: 'root' })
export class AccessCapabilitiesService {
  getRole(profile: AppProfile | null): AppRole | null {
    if (!profile?.role) {
      return null;
    }
    return profile.role;
  }

  hasRole(profile: AppProfile | null, roles: AppRole[]): boolean {
    const role = this.getRole(profile);
    return !!role && roles.includes(role);
  }

  canAccessSuperAdmin(profile: AppProfile | null): boolean {
    return this.hasRole(profile, ['super_admin']);
  }

  /**
   * Org-admin access is granted only when the caller is super_admin OR has
   * an active org_admin / program_admin membership in the active org.
   */
  canAccessOrganizationAdmin(
    profile: AppProfile | null,
    ctx?: OrgContext | null,
  ): boolean {
    if (this.canAccessSuperAdmin(profile)) return true;
    if (!ctx) return false;
    return ctx.isOrgAdmin && !!ctx.activeOrgId;
  }

  /**
   * Program-admin access is granted only when the caller is super_admin OR
   * has an active program_admin / org_admin membership in the active org.
   */
  canAccessProgramAdmin(
    profile: AppProfile | null,
    ctx?: OrgContext | null,
  ): boolean {
    if (this.canAccessSuperAdmin(profile)) return true;
    if (!ctx) return false;
    return ctx.isProgramAdmin && !!ctx.activeOrgId;
  }

  /**
   * Legacy helper used by some diagnostic UIs to inspect the user document
   * itself. NEVER use this for authorization decisions — use a membership
   * lookup instead.
   */
  hasExplicitProgramAdminRole(profile: AppProfile | null): boolean {
    if (!profile) return false;
    return this.hasRole(profile, ['programAdmin', 'programStaff']);
  }

  canAccessProgramLearner(
    profile: AppProfile | null,
    ctx?: OrgContext | null,
  ): boolean {
    if (!profile) return false;
    if (this.canAccessProgramAdmin(profile, ctx)) return true;
    return (
      profile.isProgramLearner === true ||
      profile.role === 'guest' ||
      profile.role === 'learner'
    );
  }

  getAdminSpaces(profile: AppProfile | null, ctx?: OrgContext | null): AdminSpaceOption[] {
    if (!profile) return [];

    const spaces: AdminSpaceOption[] = [];

    if (this.canAccessSuperAdmin(profile)) {
      spaces.push({
        key: 'super-admin',
        label: 'Super Admin',
        description:
          'Cross-tenant governance, user control, platform setup and global reporting.',
        route: '/super-admin/dashboard',
        tone: 'platform',
      });
    }

    if (this.canAccessOrganizationAdmin(profile, ctx)) {
      spaces.push({
        key: 'org-admin',
        label: 'Organization Admin',
        description:
          'Tenant-scoped users, assignments, compliance, progress and audit operations.',
        route: '/org-admin/dashboard',
        tone: 'organization',
      });
    }

    if (this.canAccessProgramAdmin(profile, ctx)) {
      spaces.push({
        key: 'program-admin',
        label: 'Program Admin',
        description:
          'Independent public-program governance, enrollments, templates and analytics.',
        route: '/program-admin/dashboard',
        tone: 'program',
      });
    }

    return spaces;
  }
}
