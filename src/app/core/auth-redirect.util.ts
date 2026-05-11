import type { AppProfile, AppRole } from './auth';
import { AccessCapabilitiesService, AdminSpaceKey } from './access-capabilities.service';
import type { OrgContext } from './organization/org-context.service';

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

/**
 * Resolve the post-login route. The optional `ctx` argument carries the
 * membership-derived org context — when present, admin spaces are computed
 * from real memberships (not from `users.role`). Without `ctx` we fall back
 * to the safest behavior: only `super_admin` profile-role grants admin
 * landing pages.
 */
export function resolveDefaultRoute(
  profile: AppProfile | null,
  ctx?: OrgContext | null,
): string {
  if (!profile || profile.active === false) {
    return '/login';
  }

  const role = profile.role ?? profile.primaryRole ?? 'guest';
  const capabilities = new AccessCapabilitiesService();
  const adminSpaces = capabilities.getAdminSpaces(profile, ctx);
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

  // No global admin powers and no admin memberships. Honor learner-style
  // shortcuts but never default into a manager dashboard solely on the
  // user document role — that is what caused the cross-tenant leak.
  if (role === 'programLearner' || profile.isProgramLearner === true) {
    return '/my-programs';
  }

  return defaultRouteForRole(role);
}
