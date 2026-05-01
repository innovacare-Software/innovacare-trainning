import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { SuperAdminUser, UserRole } from '../models/super-admin.models';

interface NormalizeLegacyProgramAccessRolesPayload {
  uid?: string;
}

interface NormalizeLegacyProgramAccessRolesResult {
  ok: boolean;
  updated: number;
  uid?: string;
  role?: UserRole;
}


@Injectable({ providedIn: 'root' })
export class SuperAdminUsersService {
  private afs = inject(Firestore);
  private functions = inject(Functions);
  private colRef = collection(this.afs, 'users');
  private normalizeProgramAccessFn = httpsCallable<NormalizeLegacyProgramAccessRolesPayload, NormalizeLegacyProgramAccessRolesResult>(
    this.functions,
    'normalizeLegacyProgramAccessRoles'
  );

  private inferNormalizedRole(user: SuperAdminUser): UserRole {
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager') {
      return user.role;
    }

    if (user.isProgramAdmin === true) {
      return 'programAdmin';
    }

    if (user.isProgramStaff === true) {
      return 'programStaff';
    }

    if (user.isProgramLearner === true) {
      return 'programLearner';
    }

    return user.role === 'guest' ? 'guest' : 'learner';
  }

  private buildProgramRolePatch(user: SuperAdminUser, targetRole: UserRole): Partial<SuperAdminUser> {
    return {
      role: targetRole,
      isProgramAdmin: targetRole === 'programAdmin',
      isProgramStaff: targetRole === 'programStaff',
      isProgramLearner: targetRole === 'programLearner',
      updatedAt: serverTimestamp(),
    };
  }

  list(): Observable<SuperAdminUser[]> {
    const q = query(this.colRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'uid' }) as Observable<SuperAdminUser[]>;
  }

  listFiltered(search = '', role: UserRole | 'all' = 'all'): Observable<SuperAdminUser[]> {
    const term = search.trim().toLowerCase();

    return this.list().pipe(
      map((rows) =>
        rows.filter((u) => {
          const matchesRole = role === 'all' ? true : u.role === role;
          const blob = `${u.displayName ?? ''} ${u.email ?? ''} ${u.uid ?? ''}`.toLowerCase();
          const matchesSearch = !term || blob.includes(term);
          return matchesRole && matchesSearch;
        })
      )
    );
  }

  getByUid(uid: string): Observable<SuperAdminUser | null> {
    const ref = doc(this.afs, `users/${uid}`);
    return docData(ref, { idField: 'uid' }) as Observable<SuperAdminUser | null>;
  }

  async upsert(user: SuperAdminUser): Promise<void> {
    const ref = doc(this.afs, `users/${user.uid}`);
    await setDoc(
      ref,
      {
        ...user,
        active: user.active ?? true,
        updatedAt: serverTimestamp(),
        createdAt: user.createdAt ?? serverTimestamp(),
      },
      { merge: true }
    );
  }

  async setRole(uid: string, role: UserRole): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    const current = await getDoc(ref);
    const currentUser = (current.data() || { uid }) as SuperAdminUser;
    await updateDoc(ref, {
      ...this.buildProgramRolePatch(currentUser, role),
      role,
      updatedAt: serverTimestamp(),
    });
  }

  async setOrganization(uid: string, orgId: string | null, orgType?: SuperAdminUser['orgType']): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    await updateDoc(ref, {
      orgId,
      orgType: orgType ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  async setActive(uid: string, active: boolean): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    await updateDoc(ref, {
      active,
      updatedAt: serverTimestamp(),
    });
  }

  async setProgramAdmin(uid: string, isProgramAdmin: boolean): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    const snap = await getDoc(ref);
    const user = { ...(snap.data() as SuperAdminUser), uid };
    const nextRole: UserRole = isProgramAdmin
      ? 'programAdmin'
      : user.isProgramStaff
        ? 'programStaff'
        : user.isProgramLearner
          ? 'programLearner'
          : 'learner';
    await updateDoc(ref, {
      ...this.buildProgramRolePatch(user, nextRole),
      updatedAt: serverTimestamp(),
    });
  }

  async setProgramStaff(uid: string, isProgramStaff: boolean): Promise<void> {
    const ref = doc(this.afs, `users/${uid}`);
    const snap = await getDoc(ref);
    const user = { ...(snap.data() as SuperAdminUser), uid };
    const nextRole: UserRole = isProgramStaff
      ? 'programStaff'
      : user.isProgramAdmin
        ? 'programAdmin'
        : user.isProgramLearner
          ? 'programLearner'
          : 'learner';
    await updateDoc(ref, {
      ...this.buildProgramRolePatch(user, nextRole),
      updatedAt: serverTimestamp(),
    });
  }

  async normalizeProgramAccessRole(uid: string): Promise<UserRole> {
    const result = await this.normalizeProgramAccessFn({ uid });
    return result.data.role || 'learner';
  }

  async normalizeProgramAccessRoles(): Promise<{ updated: number }> {
    const result = await this.normalizeProgramAccessFn({});
    return { updated: result.data.updated || 0 };
  }
}