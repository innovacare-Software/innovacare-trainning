import { Injectable } from '@angular/core';
import { AppProfile, AppRole } from './auth';

export type AdminSpaceKey = 'super-admin' | 'org-admin' | 'program-admin';

export interface AdminSpaceOption {
  key: AdminSpaceKey;
  label: string;
  description: string;
  route: string;
  tone: 'platform' | 'organization' | 'program';
}

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

  canAccessOrganizationAdmin(profile: AppProfile | null): boolean {
    if (!profile) {
      return false;
    }

    return !!String(profile.orgId || '').trim() && this.hasRole(profile, ['super_admin', 'admin', 'manager']);
  }

  hasExplicitProgramAdminRole(profile: AppProfile | null): boolean {
    if (!profile) {
      return false;
    }

    return this.hasRole(profile, ['programAdmin', 'programStaff']);
  }

  canAccessProgramAdmin(profile: AppProfile | null): boolean {
    if (!profile) {
      return false;
    }

    return (
      this.canAccessOrganizationAdmin(profile) ||
      this.hasExplicitProgramAdminRole(profile)
    );
  }

  canAccessProgramLearner(profile: AppProfile | null): boolean {
    if (!profile) {
      return false;
    }

    return (
      this.canAccessProgramAdmin(profile) ||
      profile.isProgramLearner === true ||
      profile.role === 'guest' ||
      profile.role === 'learner'
    );
  }

  canAccessSuperAdmin(profile: AppProfile | null): boolean {
    return this.hasRole(profile, ['super_admin']);
  }

  getAdminSpaces(profile: AppProfile | null): AdminSpaceOption[] {
    if (!profile) {
      return [];
    }

    const spaces: AdminSpaceOption[] = [];

    if (this.canAccessSuperAdmin(profile)) {
      spaces.push({
        key: 'super-admin',
        label: 'Super Admin',
        description: 'Cross-tenant governance, user control, platform setup and global reporting.',
        route: '/super-admin/dashboard',
        tone: 'platform',
      });
    }

    if (this.canAccessOrganizationAdmin(profile)) {
      spaces.push({
        key: 'org-admin',
        label: 'Organization Admin',
        description: 'Tenant-scoped users, assignments, compliance, progress and audit operations.',
        route: '/org-admin/dashboard',
        tone: 'organization',
      });
    }

    if (this.canAccessProgramAdmin(profile)) {
      spaces.push({
        key: 'program-admin',
        label: 'Program Admin',
        description: 'Independent public-program governance, enrollments, templates and analytics.',
        route: '/program-admin/dashboard',
        tone: 'program',
      });
    }

    return spaces;
  }
}