import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { combineLatest, filter, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { OrganizationHierarchyService } from '../../../core/organization/services/organization-hierarchy.service';

/**
 * UX-only gate (the real security boundary is firestore.rules'
 * isCouncilAdmin) hiding /manager/council from an org_admin whose org isn't
 * flagged canCreateSubOrgs, so a non-council org_admin doesn't land on a
 * page that would just show empty data.
 */
export const isCouncilAdminCanMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  const hierarchy = inject(OrganizationHierarchyService);
  const router = inject(Router);

  return combineLatest([auth.ready$, auth.profile$]).pipe(
    filter(([ready]) => ready),
    take(1),
    switchMap(([, profile]) => {
      const orgId = String(profile?.orgId || '').trim();
      if (!orgId) return of(false);
      return hierarchy.getOrg(orgId).pipe(map((org) => org?.canCreateSubOrgs === true));
    }),
    map((isCouncil): boolean | UrlTree => (isCouncil ? true : router.createUrlTree(['/manager/dashboard'])))
  );
};
