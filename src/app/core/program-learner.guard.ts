import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { combineLatest, filter, map, switchMap, take } from 'rxjs';
import { AccessCapabilitiesService } from './access-capabilities.service';
import { AuthService } from './auth';
import { ProgramEnrollmentsService } from '../features/publics/programs/program-enrollments.service';

export const programLearnerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const capabilities = inject(AccessCapabilitiesService);
  const router = inject(Router);
  const enrollments = inject(ProgramEnrollmentsService);
  const programId = route.paramMap.get('programId') || route.paramMap.get('id') || '';

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    switchMap(([_, profile]) => {
      if (!profile) {
        return [router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })];
      }

      if (!capabilities.canAccessProgramLearner(profile)) {
        return [router.createUrlTree(['/home'])];
      }

      if (!programId) {
        return [true];
      }

      return enrollments.getMyEnrollmentForProgram(programId).pipe(
        take(1),
        map((enrollment): boolean | UrlTree => {
          if (enrollments.canAccessLearnerSpace(enrollment)) {
            return true;
          }

          if (enrollments.canResumeCheckout(enrollment)) {
            return router.createUrlTree(['/programs', programId, 'enroll'], {
              queryParams: { paymentRequired: '1' },
            });
          }

          return router.createUrlTree(['/my-programs'], {
            queryParams: { blockedProgramId: programId },
          });
        })
      );
    })
  );
};
