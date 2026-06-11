import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Router,
  UrlTree,
} from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AccessCapabilitiesService } from './access-capabilities.service';
import { AuthService, AppRole } from './auth';
import { resolveDefaultRoute } from './auth-redirect.service';
import { OrgContextService } from './organization/org-context.service';

const ADMIN_PROFILE_ROLES: AppRole[] = ['admin', 'manager'];

function rolesRequireOrgAdminMembership(roles: AppRole[]): boolean {
  return roles.some((r) => ADMIN_PROFILE_ROLES.includes(r));
}

/**
 * Role-based route guard.
 *
 * Authorization rules (security-critical):
 *  - `super_admin` is the only global admin role recognized via the user
 *    document. Every other "admin" capability MUST come from an explicit
 *    membership in `userOrgMemberships`.
 *  - When the requested roles include `admin` or `manager`, access is
 *    granted only if the caller is `super_admin` OR has an active
 *    `org_admin` / `program_admin` membership in the active org.
 *  - For purely learner-style roles, the legacy `users.role` check is kept.
 */
function checkRoleAccess(roles: AppRole[]) {
  const auth = inject(AuthService);
  const capabilities = inject(AccessCapabilitiesService);
  const orgContext = inject(OrgContextService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$, orgContext.context$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile, ctx]): boolean | UrlTree => {
      if (!profile) {
        return router.createUrlTree(['/login']);
      }

      if (profile.requirePasswordChange === true) {
        return router.createUrlTree(['/force-password-change']);
      }

      // Super admin always passes if requested.
      if (profile.role === 'super_admin' && roles.includes('super_admin')) {
        return true;
      }

      // Admin / manager routes: require membership-based admin powers.
      if (rolesRequireOrgAdminMembership(roles)) {
        if (ctx.isSuperAdmin) return true;
        if (ctx.isOrgAdmin && !!ctx.activeOrgId) return true;
        return router.createUrlTree([resolveDefaultRoute(profile, ctx)]);
      }

      // Non-admin role list: keep legacy profile-based decision.
      if (capabilities.hasRole(profile, roles)) {
        return true;
      }

      return router.createUrlTree([resolveDefaultRoute(profile, ctx)]);
    })
  );
}

export function roleGuard(roles: AppRole[]): CanActivateFn {
  return () => checkRoleAccess(roles);
}

export function roleCanMatch(roles: AppRole[]): CanMatchFn {
  return () => checkRoleAccess(roles);
}

export const authCanMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]): boolean | UrlTree => {
      if (profile) return true;
      return router.createUrlTree(['/login']);
    })
  );
};
