import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AccessCapabilitiesService } from './access-capabilities.service';
import { AuthService } from './auth';

export const programLearnerGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const capabilities = inject(AccessCapabilitiesService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([_, profile]): boolean | UrlTree => {
      if (!profile) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }

      if (!capabilities.canAccessProgramLearner(profile)) {
        return router.createUrlTree(['/home']);
      }

      return true;
    })
  );
};
