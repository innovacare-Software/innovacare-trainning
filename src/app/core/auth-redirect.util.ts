import type { AppProfile, AppRole } from './auth';
import { AccessCapabilitiesService, AdminSpaceKey } from './access-capabilities.service';

const ADMIN_SPACE_STORAGE_PREFIX = 'preferredAdminSpace';

function adminSpaceStorageKey(uid: string): string {
  return `${ADMIN_SPACE_STORAGE_PREFIX}:${uid}`;
}

export function getPreferredAdminSpace(profile: AppProfile | null): AdminSpaceKey | null {
  if (!profile?.uid || typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(adminSpaceStorageKey(profile.uid));
  if (raw === 'super-admin' || raw === 'org-admin' || raw === 'program-admin') {
    return raw;
  }

  return null;
}

export function rememberAdminSpace(profile: AppProfile | null, space: AdminSpaceKey): void {
  if (!profile?.uid || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(adminSpaceStorageKey(profile.uid), space);
}

export function clearPreferredAdminSpace(profile: AppProfile | null): void {
  if (!profile?.uid || typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(adminSpaceStorageKey(profile.uid));
}

export function defaultRouteForRole(role: AppRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'admin':
    case 'manager':
      return '/manager/dashboard';
    case 'learner':
      return '/learner';
    case 'guest':
      return '/guest/dashboard';
    default:
      return '/login';
  }
}

export function resolveDefaultRoute(profile: AppProfile | null): string {
  if (!profile || profile.active === false) {
    return '/login';
  }

  const role = profile.role ?? profile.primaryRole ?? 'guest';
  const capabilities = new AccessCapabilitiesService();
  const adminSpaces = capabilities.getAdminSpaces(profile);
  const preferredSpace = getPreferredAdminSpace(profile);

  if (adminSpaces.length > 1) {
    const preferredMatch = adminSpaces.find((space) => space.key === preferredSpace);
    if (preferredMatch) {
      return preferredMatch.route;
    }

    return '/admin-spaces';
  }

  if (adminSpaces.length === 1) {
    rememberAdminSpace(profile, adminSpaces[0].key);
    return adminSpaces[0].route;
  }

  clearPreferredAdminSpace(profile);

  if (role === 'admin' || role === 'manager' || role === 'instructor') {
    return '/manager/dashboard';
  }

  if (role === 'programLearner' || profile.isProgramLearner === true) {
    return '/my-programs';
  }

  return defaultRouteForRole(role);
}