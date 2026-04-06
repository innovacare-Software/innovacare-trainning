import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { OrgContextService } from './org-context.service';

function redirect(path: string): UrlTree {
  return inject(Router).createUrlTree([path]);
}

export const isSignedInGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => (c.uid ? true : redirect('/login')))
  );
};

export const isSuperAdminGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => (c.isSuperAdmin ? true : redirect('/login')))
  );
};

export const isOrgAdminGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => ((c.isOrgAdmin || c.isSuperAdmin) && !!c.orgId ? true : redirect('/login')))
  );
};

export const isOrgManagerGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => ((c.isOrgManager || c.isOrgAdmin || c.isSuperAdmin) && !!c.orgId ? true : redirect('/login')))
  );
};

export const isOrgLearnerGuard: CanMatchFn = () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => ((c.isOrgLearner || c.isOrgManager || c.isOrgAdmin || c.isSuperAdmin) && !!c.orgId ? true : redirect('/login')))
  );
};

export const belongsToOrg = (orgIdResolver: () => string | null): CanMatchFn => () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      const orgId = orgIdResolver();
      if (!orgId) return redirect('/login');
      return c.isSuperAdmin || c.orgId === orgId ? true : redirect('/home');
    })
  );
};

export const canManageOrgGuard = (orgIdResolver: () => string | null): CanMatchFn => () => {
  const ctx = inject(OrgContextService);
  return ctx.context$.pipe(
    take(1),
    map((c) => {
      const orgId = orgIdResolver();
      if (!orgId) return redirect('/login');
      return c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId)
        ? true
        : redirect('/home');
    })
  );
};

export const canReadOrgDataGuard = isOrgLearnerGuard;
export const canWriteOrgDataGuard = isOrgManagerGuard;
