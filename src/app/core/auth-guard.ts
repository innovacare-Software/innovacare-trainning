import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Router,
  UrlTree,
} from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AuthService } from './auth';
import type { AppRole } from './auth';
import { resolveDefaultRoute } from './auth-redirect.util';
import { SecurityLoggerService } from './security/security-logger.service';

const ADMIN_ROLE_SET: ReadonlySet<AppRole> = new Set([
  'admin', 'manager', 'super_admin', 'programAdmin', 'programStaff',
]);

function checkRoleAccess(roles: AppRole[]) {
  const auth = inject(AuthService);
  const router = inject(Router);
  const securityLogger = inject(SecurityLoggerService);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]): boolean | UrlTree => {
      if (!profile) {
        return router.createUrlTree(['/login']);
      }

      const role = profile.role as AppRole;

      if (roles.includes(role)) {
        return true;
      }

      // SECURITY: emit ADMIN_ACCESS_DENIED whenever a non-admin role tried to
      // reach a route that gated for admin/super_admin/manager. We do not log
      // for benign cross-role redirects (e.g. learner → /admin redirected to
      // their own dashboard is still suspicious enough to record at "high").
      const requiredAdmin = roles.some((r) => ADMIN_ROLE_SET.has(r));
      if (requiredAdmin) {
        const path = (typeof window !== 'undefined' ? window.location.pathname : null);
        securityLogger.logAdminAccessDenied({
          role,
          route: path,
          attemptedArea: roles.join(','),
          repeated: false,
        });
      }

      return router.createUrlTree([resolveDefaultRoute(profile)]);
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

export const authenticatedGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]): boolean | UrlTree => {
      if (profile) return true;
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    })
  );
};