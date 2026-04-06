import { Injectable, inject } from '@angular/core';
import { OrgContextService } from './org-context.service';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrgAccessService {
  private readonly ctx = inject(OrgContextService);

  readonly canReadOrgData$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || (!!c.orgId && c.orgId === orgId))
  );

  readonly canManageOrg$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId))
  );

  readonly canAssignOrgCourses$ = this.ctx.context$.pipe(
    map((c) => (orgId: string) => c.isSuperAdmin || ((c.isOrgAdmin || c.isOrgManager) && c.orgId === orgId))
  );
}
