import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { OrgContextService } from './organization/org-context.service';

function requireProgramAdminAccess() {
  const ctx = inject(OrgContextService);
  const router = inject(Router);

  return ctx.context$.pipe(
    take(1),
    map((c): boolean | UrlTree => {
      if (!c.uid) {
        return router.createUrlTree(['/login']);
      }
      // Super admin has unrestricted access. Otherwise an active membership
      // with role program_admin or org_admin in the active org is required.
      if (c.isSuperAdmin) return true;
      if (c.isProgramAdmin && c.activeOrgId) return true;
      return router.createUrlTree(['/home']);
    }),
  );
}

export const programAdminCanMatch: CanMatchFn = () => requireProgramAdminAccess();
export const programAdminGuard: CanActivateFn = () => requireProgramAdminAccess();
