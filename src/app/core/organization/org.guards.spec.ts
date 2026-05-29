import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { isOrgAdminGuard, isSuperAdminGuard, belongsToOrg } from './org.guards';
import { OrgContextService, OrgContext } from './org-context.service';
import { SecurityLoggerService } from '../security/security-logger.service';

const BURKINA_ORG = 'burkina-org';
const MAIN_ORG = 'Waxxi8M4qpTSsoGJ8fJS';

function ctx(partial: Partial<OrgContext>): OrgContext {
  return {
    uid: 'u',
    orgId: null,
    activeOrgId: null,
    role: 'guest',
    orgRole: null,
    activeMembership: null,
    memberships: [],
    availableOrgIds: [],
    isSuperAdmin: false,
    isOrgAdmin: false,
    isOrgManager: false,
    isOrgLearner: false,
    isProgramAdmin: false,
    ...partial,
  } as OrgContext;
}

function setup(initialCtx: OrgContext) {
  const subject = new BehaviorSubject<OrgContext>(initialCtx);
  const orgService = {
    context$: subject.asObservable(),
    setActiveOrg: (id: string | null) => {
      const cur = subject.value;
      subject.next({ ...cur, activeOrgId: id, orgId: id });
    },
  } as unknown as OrgContextService;

  const router = {
    parseUrl: (url: string) => ({ url } as unknown as UrlTree),
    createUrlTree: (segs: any[]) => ({ url: '/' + segs.join('/') } as unknown as UrlTree),
  } as unknown as Router;

  const securityLogger = {
    logCrossTenantDenied: async () => {},
    logAdminAccessDenied: async () => {},
  } as unknown as SecurityLoggerService;

  TestBed.configureTestingModule({
    providers: [
      { provide: OrgContextService, useValue: orgService },
      { provide: Router, useValue: router },
      { provide: SecurityLoggerService, useValue: securityLogger },
    ],
  });
  return { subject };
}

async function runGuard(guard: any, route: any = {}, state: any = { url: '/x' }) {
  return await TestBed.runInInjectionContext(() =>
    firstValueFrom(guard(route, state) as any)
  );
}

describe('org.guards (membership-driven)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('super_admin can always reach any org admin area', async () => {
    setup(
      ctx({
        role: 'super_admin',
        isSuperAdmin: true,
        availableOrgIds: [],
      })
    );
    const result = await runGuard(isSuperAdminGuard);
    expect(result).toBe(true);
  });

  it('Burkina partner with program_admin in Burkina cannot access Main org admin', async () => {
    setup(
      ctx({
        role: 'learner',
        activeOrgId: BURKINA_ORG,
        orgId: BURKINA_ORG,
        isOrgAdmin: true,
        isProgramAdmin: true,
        memberships: [
          {
            id: `u__${BURKINA_ORG}`,
            userId: 'u',
            orgId: BURKINA_ORG,
            role: 'program_admin',
            status: 'active',
            assignedBy: 'super-admin',
          },
        ],
        availableOrgIds: [BURKINA_ORG],
      })
    );
    const result = await runGuard(belongsToOrg(() => MAIN_ORG));
    // belongsToOrg should NOT return true for the main org — it should
    // emit a redirect (UrlTree) or false.
    expect(result === true).toBeFalse();
  });

  it('Burkina partner with program_admin in Burkina can access Burkina admin', async () => {
    setup(
      ctx({
        role: 'learner',
        activeOrgId: BURKINA_ORG,
        orgId: BURKINA_ORG,
        isOrgAdmin: true,
        isProgramAdmin: true,
        memberships: [
          {
            id: `u__${BURKINA_ORG}`,
            userId: 'u',
            orgId: BURKINA_ORG,
            role: 'program_admin',
            status: 'active',
            assignedBy: 'super-admin',
          },
        ],
        availableOrgIds: [BURKINA_ORG],
      })
    );
    const result = await runGuard(belongsToOrg(() => BURKINA_ORG));
    expect(result).toBe(true);
  });

  it('guest with no membership is denied admin areas', async () => {
    setup(ctx({ role: 'guest' }));
    const result = await runGuard(isOrgAdminGuard);
    expect(result === true).toBeFalse();
  });
});
