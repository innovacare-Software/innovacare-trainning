import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AccessCapabilitiesService } from './access-capabilities.service';
import { AuthService } from './auth';

function requireProgramAdminAccess() {
  const auth = inject(AuthService);
  const capabilities = inject(AccessCapabilitiesService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]): boolean | UrlTree => {
      if (!profile) {
        return router.createUrlTree(['/login']);
      }

      if (!capabilities.canAccessProgramAdmin(profile)) {
        return router.createUrlTree(['/home']);
      }

      return true;
    })
  );
}

export const programAdminCanMatch: CanMatchFn = () => requireProgramAdminAccess();

export const programAdminGuard: CanActivateFn = () => requireProgramAdminAccess();
