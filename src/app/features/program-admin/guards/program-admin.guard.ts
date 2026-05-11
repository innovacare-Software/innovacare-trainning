import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { OrgContextService } from '../../../core/organization/org-context.service';

function requireProgramAdminAccess() {
  const ctx = inject(OrgContextService);
  const router = inject(Router);

  return ctx.context$.pipe(
    take(1),
    map((c): boolean | UrlTree => {
      if (!c.uid) {
        return router.createUrlTree(['/login']);
      }
      if (c.isSuperAdmin) return true;
      if (c.isProgramAdmin && c.activeOrgId) return true;
      return router.createUrlTree(['/home']);
    }),
  );
}

export const programAdminAreaCanMatch: CanMatchFn = () => requireProgramAdminAccess();
export const programAdminAreaCanActivate: CanActivateFn = () => requireProgramAdminAccess();
