import { Injectable, inject } from '@angular/core';
import { OrgContextService } from './org-context.service';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrgAccessService {
  private readonly ctx = inject(OrgContextService);

  readonly signedIn$ = this.ctx.context$.pipe(map((c) => !!c.uid));

  readonly belongsToOrg$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => !!c.orgId && c.orgId === orgId)
  );

  readonly canReadOrgData$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || (!!c.orgId && c.orgId === orgId))
  );

  readonly canWriteOrgData$ = this.ctx.context$.pipe(
    map(
      (c) =>
        (orgId: string) =>
          c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId)
    )
  );

  readonly canManageOrg$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId))
  );

  readonly canAssignOrgCourses$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId))
  );

  readonly isSuperAdmin$ = this.ctx.context$.pipe(map((c) => c.isSuperAdmin));
  readonly isOrgAdmin$ = this.ctx.context$.pipe(map((c) => c.isOrgAdmin));
  readonly isOrgManager$ = this.ctx.context$.pipe(map((c) => c.isOrgManager));
  readonly isOrgLearner$ = this.ctx.context$.pipe(map((c) => c.isOrgLearner));
}
