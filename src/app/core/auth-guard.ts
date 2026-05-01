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

function checkRoleAccess(roles: AppRole[]) {
  const auth = inject(AuthService);
  const router = inject(Router);

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