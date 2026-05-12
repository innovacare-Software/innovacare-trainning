import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OrgTimestamp } from './org.models';

/**
 * Roles that can be assigned to a user inside a specific organization.
 * Note: `super_admin` is intentionally NOT in this list — it is a global
 * platform role that lives on the user profile, never on a membership.
 */
export type UserOrgRole = 'guest' | 'learner' | 'instructor' | 'tutor' | 'staff' | 'program_admin' | 'org_admin';

export const ASSIGNABLE_USER_ORG_ROLES: UserOrgRole[] = [
  'guest',
  'learner',
  'instructor',
  'tutor',
  'staff',
  'program_admin',
  'org_admin',
];

export const ADMIN_USER_ORG_ROLES: UserOrgRole[] = ['program_admin', 'org_admin'];

export type UserOrgMembershipStatus = 'active' | 'inactive';

export interface UserOrgMembership {
  id?: string;
  userId: string;
  orgId: string;
  role: UserOrgRole;
  status: UserOrgMembershipStatus;
  assignedBy: string;
  createdAt?: OrgTimestamp;
  updatedAt?: OrgTimestamp;
}

export interface AssignMembershipInput {
  userId: string;
  orgId: string;
  role: UserOrgRole;
  assignedBy: string;
  status?: UserOrgMembershipStatus;
}

const COLLECTION = 'userOrgMemberships';

/** Deterministic membership id so a (user, org) pair is unique. */
export function membershipId(userId: string, orgId: string): string {
  if (!userId || !orgId) {
    throw new Error('membershipId requires both userId and orgId');
  }
  return `${userId}__${orgId}`;
}

@Injectable({ providedIn: 'root' })
export class UserOrgMembershipsService {
  private readonly afs = inject(Firestore);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  /** Live list of memberships for a single user. */
  listForUser(userId: string): Observable<UserOrgMembership[]> {
    if (!userId) {
      return of([]);
    }
    const q = this.inContext(() =>
      query(collection(this.afs, COLLECTION), where('userId', '==', userId))
    );
    return this.inContext(() =>
      collectionData(q, { idField: 'id' }) as Observable<UserOrgMembership[]>
    ).pipe(catchError(() => of([])));
  }

  /** Live list of memberships for a single organization. */
  listForOrg(orgId: string): Observable<UserOrgMembership[]> {
    if (!orgId) {
      return of([]);
    }
    const q = this.inContext(() =>
      query(collection(this.afs, COLLECTION), where('orgId', '==', orgId))
    );
    return this.inContext(() =>
      collectionData(q, { idField: 'id' }) as Observable<UserOrgMembership[]>
    ).pipe(catchError(() => of([])));
  }

  get(id: string): Observable<UserOrgMembership | null> {
    if (!id) {
      return of(null);
    }
    const ref = doc(this.afs, `${COLLECTION}/${id}`);
    return this.inContext(() =>
      docData(ref, { idField: 'id' }) as Observable<UserOrgMembership | null>
    ).pipe(catchError(() => of(null)));
  }

  /** Returns active memberships only, fetched once. */
  async getActiveForUser(userId: string): Promise<UserOrgMembership[]> {
    if (!userId) return [];
    const q = this.inContext(() =>
      query(
        collection(this.afs, COLLECTION),
        where('userId', '==', userId),
        where('status', '==', 'active'),
      )
    );
    const snap = await this.inContext(() => getDocs(q));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserOrgMembership, 'id'>) }));
  }

  /**
   * Assign or update a membership. Always idempotent thanks to the
   * deterministic id. The role is enforced to be org-scoped (never super_admin).
   */
  async assign(input: AssignMembershipInput): Promise<UserOrgMembership> {
    const { userId, orgId, role, assignedBy } = input;
    if (!ASSIGNABLE_USER_ORG_ROLES.includes(role)) {
      throw new Error(`Role "${role}" is not assignable as an organization membership.`);
    }
    if (!userId || !orgId) {
      throw new Error('userId and orgId are required to assign a membership.');
    }
    const id = membershipId(userId, orgId);
    const ref = doc(this.afs, `${COLLECTION}/${id}`);
    const data: Record<string, unknown> = {
      userId,
      orgId,
      role,
      status: input.status ?? 'active',
      assignedBy: assignedBy || 'system',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, data, { merge: true });
    return {
      id,
      userId,
      orgId,
      role,
      status: input.status ?? 'active',
      assignedBy: assignedBy || 'system',
    };
  }

  async setStatus(id: string, status: UserOrgMembershipStatus): Promise<void> {
    if (!id) throw new Error('membership id is required');
    const ref = doc(this.afs, `${COLLECTION}/${id}`);
    await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  }

  async setRole(id: string, role: UserOrgRole): Promise<void> {
    if (!ASSIGNABLE_USER_ORG_ROLES.includes(role)) {
      throw new Error(`Role "${role}" is not assignable.`);
    }
    const ref = doc(this.afs, `${COLLECTION}/${id}`);
    await updateDoc(ref, { role, updatedAt: serverTimestamp() });
  }

  async remove(id: string): Promise<void> {
    if (!id) return;
    const ref = doc(this.afs, `${COLLECTION}/${id}`);
    await deleteDoc(ref);
  }

  /** Convenience: stream of org ids the user is an active member of. */
  activeOrgIds$(userId: string): Observable<string[]> {
    return this.listForUser(userId).pipe(
      map((rows) =>
        rows.filter((m) => m.status === 'active').map((m) => m.orgId).filter(Boolean),
      ),
    );
  }
}
