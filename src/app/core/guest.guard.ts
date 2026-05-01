import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AuthService } from './auth';
import { resolveDefaultRoute } from './auth-redirect.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Important on hard refresh: wait until auth profile hydration is complete.
  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]) => {
      if (!profile) {
        return router.parseUrl('/login');
      }

      const isActive = profile.active ?? true;
      if (!isActive) {
        return router.parseUrl('/login');
      }

      if (profile.role !== 'guest') {
        return router.parseUrl(resolveDefaultRoute(profile));
      }

      return true;
    })
  );
};