import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth';
import { map } from 'rxjs';
import { OrgRole } from './org.models';

export interface OrgContext {
  uid: string;
  orgId: string | null;
  role: string;
  orgRole: OrgRole | null;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isOrgManager: boolean;
  isOrgLearner: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly auth = inject(AuthService);

  readonly context$ = this.auth.profile$.pipe(
    map((profile): OrgContext => {
      const role = String(profile?.role || 'guest');
      const orgId = profile?.orgId ? String(profile.orgId) : null;
      const orgRole: OrgRole | null =
        role === 'org_admin' || role === 'admin'
          ? 'org_admin'
          : role === 'org_manager' || role === 'manager'
            ? 'org_manager'
            : role === 'org_learner' || role === 'learner'
              ? 'org_learner'
              : null;

      return {
        uid: String(profile?.uid || ''),
        orgId,
        role,
        orgRole,
        isSuperAdmin: role === 'super_admin',
        isOrgAdmin: role === 'admin' || role === 'org_admin',
        isOrgManager: role === 'manager' || role === 'org_manager',
        isOrgLearner: role === 'learner' || role === 'org_learner',
      };
    })
  );
}
