import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export type ProgramAdminUserRole =
  | 'admin'
  | 'manager'
  | 'instructor'
  | 'tutor'
  | 'staff'
  | 'learner'
  | 'guest';

export interface CreateOrgUserPayload {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  department?: string;
  title?: string;
  role: ProgramAdminUserRole;
  status?: 'active' | 'inactive';
}

export interface CreateOrgUserResult {
  ok: boolean;
  uid: string;
  email: string;
}

export interface InviteLearnerPayload {
  programId: string;
  email: string;
  displayName?: string;
  password?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  enrollmentStatus?: 'PENDING_REVIEW' | 'ACTIVE';
  paymentStatus?: 'UNPAID' | 'PAID' | 'WAIVED';
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface InviteLearnerResult {
  ok: boolean;
  uid: string;
  email: string;
  enrollmentId: string;
  created: boolean;
}

export interface OrgUserRow {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  status?: string;
  active?: boolean;
  orgId?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class ProgramAdminUsersService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);

  createUser(payload: CreateOrgUserPayload): Promise<CreateOrgUserResult> {
    const callable = httpsCallable<CreateOrgUserPayload, CreateOrgUserResult>(
      this.functions,
      'createOrgUser'
    );
    return callable(payload).then((r) => r.data);
  }

  inviteLearner(payload: InviteLearnerPayload): Promise<InviteLearnerResult> {
    const callable = httpsCallable<InviteLearnerPayload, InviteLearnerResult>(
      this.functions,
      'programAdminInviteLearner'
    );
    return callable(payload).then((r) => r.data);
  }

  /** List users from organizations/{orgId}/users (or all users for super_admin). */
  listUsers(orgId: string | null, isSuperAdmin: boolean): Observable<OrgUserRow[]> {
    if (isSuperAdmin) {
      const ref = collection(this.firestore, 'users');
      const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
      return collectionData(q, { idField: 'uid' }) as Observable<OrgUserRow[]>;
    }
    if (!orgId) return of([]);
    const ref = collection(this.firestore, `organizations/${orgId}/users`);
    const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'uid' }) as Observable<OrgUserRow[]>;
  }

  /** Quickly filter users by role list. */
  listUsersByRole(orgId: string | null, roles: string[]): Observable<OrgUserRow[]> {
    if (!orgId || !roles.length) return of([]);
    const ref = collection(this.firestore, `organizations/${orgId}/users`);
    const q = query(ref, where('role', 'in', roles.slice(0, 10)));
    return collectionData(q, { idField: 'uid' }) as Observable<OrgUserRow[]>;
  }
}
