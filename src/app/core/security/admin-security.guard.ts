import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { take, map, combineLatest, filter } from 'rxjs';
import { OrgContextService } from '../organization/org-context.service';
import { AuthService } from '../auth';
import { SecurityLoggerService } from './security-logger.service';

/**
 * Guard for /admin/security and any future Admin Security Center route.
 *
 * Allow:
 *  - super_admin
 *  - users with at least one ACTIVE org_admin / program_admin membership
 *
 * Deny everyone else and emit an ADMIN_ACCESS_DENIED security event.
 */
export const adminSecurityCanMatch: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  const auth = inject(AuthService);
  const logger = inject(SecurityLoggerService);
  const router = inject(Router);

  return combineLatest([auth.ready$, ctx.context$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, c]): boolean | UrlTree => {
      if (c.isSuperAdmin) {
        return true;
      }
      const hasAdminMembership = (c.memberships || []).some(
        (m) => m.status === 'active' && (m.role === 'org_admin' || m.role === 'program_admin'),
      );
      if (hasAdminMembership) {
        return true;
      }

      // Fire-and-forget: do NOT await, do not block the redirect.
      logger.logAdminAccessDenied({
        role: c.role ?? null,
        route: '/admin/security',
        attemptedArea: 'admin_security_center',
      });
      return router.createUrlTree(['/home']);
    }),
  );
};
