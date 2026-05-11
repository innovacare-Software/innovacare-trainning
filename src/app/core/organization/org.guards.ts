import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { OrgContext, OrgContextService } from './org-context.service';
import { ADMIN_USER_ORG_ROLES, UserOrgRole } from './user-org-memberships';
import { SecurityLoggerService } from '../security/security-logger.service';

function redirect(path: string): UrlTree {
  return inject(Router).createUrlTree([path]);
}

/**
 * Resolves the orgId for a guard call. Defaults to the active org id from
 * context when no resolver is supplied.
 */
function resolveOrgId(
  ctx: OrgContext,
  resolver?: () => string | null,
): string | null {
  if (resolver) {
    const value = resolver();
    return value || null;
  }
  return ctx.activeOrgId;
}

function membershipMatchesRole(
  ctx: OrgContext,
  orgId: string,
  roles: UserOrgRole[],
): boolean {
  return ctx.memberships.some(
    (m) => m.orgId === orgId && m.status === 'active' && roles.includes(m.role),
  );
}

export const isSignedInGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => (c.uid ? true : redirect('/login'))),
  );
};

export const isSuperAdminGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => (c.isSuperAdmin ? true : redirect('/login'))),
  );
};

/**
 * Org admin / program admin guard.
 *
 * Access is granted only when:
 *  - the user is `super_admin`, OR
 *  - the user has an ACTIVE membership in the requested org with role
 *    `org_admin` or `program_admin`.
 *
 * The requested org id is taken from the active org context unless a
 * resolver is supplied (e.g. for routes carrying an `orgId` param).
 */
export function orgAdminGuardWithResolver(
  orgIdResolver?: () => string | null,
): CanMatchFn {
  return () => {
    const ctx = inject(OrgContextService);
    const securityLogger = inject(SecurityLoggerService);
    return ctx.context$.pipe(
      take(1),
      map((c) => {
        if (c.isSuperAdmin) return true;
        const orgId = resolveOrgId(c, orgIdResolver);
        if (!orgId) return redirect('/login');
        if (membershipMatchesRole(c, orgId, ADMIN_USER_ORG_ROLES)) {
          return true;
        }
        // SECURITY: caller does not have an active admin membership in the
        // requested org. If they DO have a different active org, treat it as
        // a cross-tenant attempt; otherwise fall back to admin-denied.
        const hasOtherOrg = (c.memberships || []).some(
          (m) => m.status === 'active' && m.orgId && m.orgId !== orgId,
        );
        if (hasOtherOrg) {
          securityLogger.logCrossTenantDenied({
            activeOrgId: c.activeOrgId,
            requestedOrgId: orgId,
            resourceType: 'org_admin_route',
            route: typeof window !== 'undefined' ? window.location.pathname : null,
          });
        } else {
          securityLogger.logAdminAccessDenied({
            role: c.role,
            attemptedArea: `org_admin:${orgId}`,
            route: typeof window !== 'undefined' ? window.location.pathname : null,
          });
        }
        return redirect('/home');
      }),
    );
  };
}

export const isOrgAdminGuard: CanMatchFn = orgAdminGuardWithResolver();

export const isOrgManagerGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      if (c.isSuperAdmin) return true;
      const orgId = c.activeOrgId;
      if (!orgId) return redirect('/login');
      return membershipMatchesRole(c, orgId, [...ADMIN_USER_ORG_ROLES, 'instructor'])
        ? true
        : redirect('/home');
    }),
  );
};

export const isOrgLearnerGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      if (c.isSuperAdmin) return true;
      const orgId = c.activeOrgId;
      if (!orgId) return redirect('/login');
      return membershipMatchesRole(c, orgId, [
        ...ADMIN_USER_ORG_ROLES,
        'instructor',
        'learner',
      ])
        ? true
        : redirect('/home');
    }),
  );
};

export const belongsToOrg = (orgIdResolver: () => string | null): CanMatchFn => () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      const orgId = orgIdResolver();
      if (!orgId) return redirect('/login');
      if (c.isSuperAdmin) return true;
      return c.memberships.some((m) => m.orgId === orgId && m.status === 'active')
        ? true
        : redirect('/home');
    }),
  );
};

export const canManageOrgGuard = (
  orgIdResolver: () => string | null,
): CanMatchFn => () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      const orgId = orgIdResolver();
      if (!orgId) return redirect('/login');
      if (c.isSuperAdmin) return true;
      return membershipMatchesRole(c, orgId, [...ADMIN_USER_ORG_ROLES, 'instructor'])
        ? true
        : redirect('/home');
    }),
  );
};

export const canReadOrgDataGuard = isOrgLearnerGuard;
export const canWriteOrgDataGuard = isOrgManagerGuard;

/** Helper to build a resolver from a route param. */
export function orgIdFromRouteParam(paramName = 'orgId') {
  return (route?: ActivatedRouteSnapshot | null) =>
    (route?.paramMap.get(paramName) as string | null) ?? null;
}
