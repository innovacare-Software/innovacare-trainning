import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { OrgRole } from './org.models';
import {
  ADMIN_USER_ORG_ROLES,
  UserOrgMembership,
  UserOrgMembershipsService,
  UserOrgRole,
} from './user-org-memberships';

const ACTIVE_ORG_STORAGE_KEY = 'innovacare:activeOrgId';

export interface OrgContext {
  uid: string;
  /** Active org id (resolved from membership / switcher / super-admin override). */
  orgId: string | null;
  /** Active org id (alias). */
  activeOrgId: string | null;
  /** Raw user role on the user document. */
  role: string;
  /** Org-scoped role for the active membership, if any. */
  orgRole: OrgRole | null;
  /** Active membership in the active org, if any. */
  activeMembership: UserOrgMembership | null;
  /** All active memberships of the user. */
  memberships: UserOrgMembership[];
  /** Distinct active org ids the user belongs to. */
  availableOrgIds: string[];
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isOrgManager: boolean;
  isOrgLearner: boolean;
  isProgramAdmin: boolean;
}

/**
 * Safe default for `toSignal({ initialValue })` callsites that need a fully
 * populated `OrgContext` before the real one resolves from Firestore.
 */
export const EMPTY_ORG_CONTEXT: OrgContext = {
  uid: '',
  orgId: null,
  activeOrgId: null,
  role: '',
  orgRole: null,
  activeMembership: null,
  memberships: [],
  availableOrgIds: [],
  isSuperAdmin: false,
  isOrgAdmin: false,
  isOrgManager: false,
  isOrgLearner: false,
  isProgramAdmin: false,
};

function readStoredActiveOrg(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveOrg(orgId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (orgId) {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function mapOrgRoleToLegacy(role: UserOrgRole | null | undefined): OrgRole | null {
  switch (role) {
    case 'org_admin':
      return 'org_admin';
    case 'program_admin':
      // Program admins have admin-like capabilities scoped to their org.
      return 'org_admin';
    case 'instructor':
      return 'org_manager';
    case 'learner':
      return 'org_learner';
    default:
      return null;
  }
}

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly auth = inject(AuthService);
  private readonly memberships = inject(UserOrgMembershipsService);

  private readonly activeOrgIdSubject = new BehaviorSubject<string | null>(readStoredActiveOrg());
  readonly activeOrgId$ = this.activeOrgIdSubject.asObservable();

  /** Live active memberships of the current user. */
  readonly memberships$: Observable<UserOrgMembership[]> = this.auth.profile$.pipe(
    map((p) => (p?.uid ? String(p.uid) : '')),
    distinctUntilChanged(),
    switchMap((uid) => (uid ? this.memberships.listForUser(uid) : of([] as UserOrgMembership[]))),
    map((rows) => rows.filter((m) => m.status === 'active')),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly context$: Observable<OrgContext> = combineLatest([
    this.auth.profile$,
    this.memberships$,
    this.activeOrgId$,
  ]).pipe(
    map(([profile, memberships, storedActiveOrg]): OrgContext => {
      const role = String(profile?.role || 'guest');
      const isSuperAdmin = role === 'super_admin';
      const uid = String(profile?.uid || '');
      const availableOrgIds = Array.from(
        new Set(memberships.map((m) => m.orgId).filter(Boolean)),
      );

      // Resolve active org id with strict precedence:
      // 1. Stored switcher selection (only if user has membership there OR is super_admin).
      // 2. Single membership auto-pick.
      // 3. Super admin fallback to profile.orgId (legacy).
      let activeOrgId: string | null = null;
      if (storedActiveOrg && (isSuperAdmin || availableOrgIds.includes(storedActiveOrg))) {
        activeOrgId = storedActiveOrg;
      } else if (availableOrgIds.length === 1) {
        activeOrgId = availableOrgIds[0];
      } else if (isSuperAdmin && profile?.orgId) {
        activeOrgId = String(profile.orgId);
      }

      const activeMembership = activeOrgId
        ? memberships.find((m) => m.orgId === activeOrgId && m.status === 'active') ?? null
        : null;
      const orgRole = mapOrgRoleToLegacy(activeMembership?.role);

      const isProgramAdmin =
        isSuperAdmin ||
        activeMembership?.role === 'program_admin' ||
        activeMembership?.role === 'org_admin';

      return {
        uid,
        orgId: activeOrgId,
        activeOrgId,
        role,
        orgRole,
        activeMembership,
        memberships,
        availableOrgIds,
        isSuperAdmin,
        isOrgAdmin:
          isSuperAdmin ||
          activeMembership?.role === 'org_admin' ||
          activeMembership?.role === 'program_admin',
        isOrgManager:
          isSuperAdmin ||
          activeMembership?.role === 'org_admin' ||
          activeMembership?.role === 'program_admin' ||
          activeMembership?.role === 'instructor',
        isOrgLearner:
          isSuperAdmin ||
          activeMembership?.role === 'org_admin' ||
          activeMembership?.role === 'program_admin' ||
          activeMembership?.role === 'instructor' ||
          activeMembership?.role === 'learner',
        isProgramAdmin,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Programmatically switch the active organization. */
  setActiveOrg(orgId: string | null): void {
    writeStoredActiveOrg(orgId);
    this.activeOrgIdSubject.next(orgId);
  }

  /** True when the user has an active admin membership for the given org. */
  hasActiveAdminMembership(orgId: string, memberships: UserOrgMembership[]): boolean {
    if (!orgId) return false;
    return memberships.some(
      (m) => m.orgId === orgId && m.status === 'active' && ADMIN_USER_ORG_ROLES.includes(m.role),
    );
  }

  /** True when the user has any active membership for the given org. */
  hasActiveMembership(orgId: string, memberships: UserOrgMembership[]): boolean {
    if (!orgId) return false;
    return memberships.some((m) => m.orgId === orgId && m.status === 'active');
  }
}
