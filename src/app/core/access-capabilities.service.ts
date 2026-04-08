import { Injectable } from '@angular/core';
import { AppProfile, AppRole } from './auth';

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
    return this.hasRole(profile, ['super_admin', 'admin', 'manager']);
  }

  canAccessProgramAdmin(profile: AppProfile | null): boolean {
    if (!profile) {
      return false;
    }

    return (
      profile.role === 'super_admin' ||
      profile.isProgramAdmin === true ||
      profile.isProgramStaff === true
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
}